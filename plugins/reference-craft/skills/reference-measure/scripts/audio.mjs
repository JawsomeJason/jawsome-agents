#!/usr/bin/env node
// Loudness, ducking and onsets from a PCM WAV file. Loudness follows the ITU-R BS.1770 recipe:
// K-weighting, 400 ms blocks, an absolute gate at -70 LUFS and a relative gate 10 LU down.
// Ducking is the loudness of a window minus a baseline window, in dB. Onsets are rises in a
// 10 ms level envelope, optionally high-passed so a music bed with its energy low in the
// spectrum triggers fewer of them; true music and effects separation needs a separation tool.
import { readFileSync } from 'node:fs';
import { UsageError, cli, parse, runCached } from './cache.mjs';

export const VERSION = 1;
const USAGE = `usage: audio.mjs --wav <file.wav> [--window name:start,end ...] [--baseline <name>] [--onsets] [--highpass <hz>]
  [--rise <dB>] [--floor <dBFS>] [--out <root>] [--force]
  Extract a PCM WAV from a recording with any media CLI first. Window times are seconds.`;

export function decodeWav(buf) {
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WAVE') throw new UsageError('not a RIFF WAVE file');
  let off = 12;
  let fmt;
  let data;
  while (off + 8 <= buf.length) {
    const id = buf.toString('latin1', off, off + 4);
    const len = buf.readUInt32LE(off + 4);
    const body = buf.subarray(off + 8, Math.min(buf.length, off + 8 + len));
    if (id === 'fmt ') {
      let format = body.readUInt16LE(0);
      if (format === 0xfffe) format = body.readUInt16LE(24);
      fmt = { format, channels: body.readUInt16LE(2), rate: body.readUInt32LE(4), bits: body.readUInt16LE(14) };
    } else if (id === 'data') data = body;
    off += 8 + len + (len % 2);
  }
  if (!fmt || !data) throw new UsageError('WAV is missing its fmt or data chunk');
  const { format, channels, rate, bits } = fmt;
  const bytes = bits / 8;
  const read = {
    '1-16': (o) => data.readInt16LE(o) / 32768,
    '1-24': (o) => data.readIntLE(o, 3) / 8388608,
    '1-32': (o) => data.readInt32LE(o) / 2147483648,
    '3-32': (o) => data.readFloatLE(o),
    '3-64': (o) => data.readDoubleLE(o),
  }[`${format}-${bits}`];
  if (!read) throw new UsageError(`unsupported WAV encoding (format ${format}, ${bits} bits); convert to 16-bit PCM`);
  const frames = Math.floor(data.length / (bytes * channels));
  const ch = Array.from({ length: channels }, () => new Float64Array(frames));
  for (let i = 0; i < frames; i++) for (let c = 0; c < channels; c++) ch[c][i] = read((i * channels + c) * bytes);
  return { rate, channels: ch };
}

function biquad(x, [b0, b1, b2, a1, a2]) {
  const y = new Float64Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = v;
    y[i] = v;
  }
  return y;
}

// K-weighting coefficients for any sample rate (the BS.1770 pre-filter and RLB high-pass).
function kWeight(rate) {
  let K = Math.tan((Math.PI * 1681.974450955533) / rate);
  const Vh = 10 ** (3.999843853973347 / 20);
  const Vb = Vh ** 0.4996667741545416;
  let Q = 0.7071752369554196;
  let a0 = 1 + K / Q + K * K;
  const shelf = [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0];
  K = Math.tan((Math.PI * 38.13547087602444) / rate);
  Q = 0.5003270373238773;
  a0 = 1 + K / Q + K * K;
  const hp = [1, -2, 1, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0];
  return (x) => biquad(biquad(x, shelf), hp);
}

function highpass(x, rate, hz) {
  const w = (2 * Math.PI * hz) / rate;
  const alpha = Math.sin(w) / (2 * Math.SQRT1_2);
  const a0 = 1 + alpha;
  const c = Math.cos(w);
  return biquad(x, [(1 + c) / 2 / a0, -(1 + c) / a0, (1 + c) / 2 / a0, (-2 * c) / a0, (1 - alpha) / a0]);
}

const lufs = (power) => (power > 0 ? -0.691 + 10 * Math.log10(power) : -Infinity);
const r1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null);
// Channel weights: 1 for front channels, 1.41 for surrounds, 0 for the low-frequency channel.
const weights = (n) => (n === 6 ? [1, 1, 1, 0, 1.41, 1.41] : Array(n).fill(1));

export function loudness({ rate, channels }) {
  const hop = Math.round(rate * 0.1);
  const kw = channels.map(kWeight(rate));
  const w = weights(channels.length);
  const subs = Math.floor(kw[0].length / hop);
  // Weighted mean-square power per 100 ms sub-block, summed over channels.
  const sub = new Float64Array(subs);
  kw.forEach((y, c) => {
    for (let s = 0; s < subs; s++) {
      let acc = 0;
      for (let i = s * hop; i < (s + 1) * hop; i++) acc += y[i] * y[i];
      sub[s] += (w[c] * acc) / hop;
    }
  });
  const blocks = [];
  for (let s = 0; s + 4 <= subs; s++) blocks.push({ t: s * 0.1, p: (sub[s] + sub[s + 1] + sub[s + 2] + sub[s + 3]) / 4 });
  const gated = blocks.filter((b) => lufs(b.p) > -70);
  const mean = (bs) => bs.reduce((a, b) => a + b.p, 0) / bs.length;
  let integrated = null;
  if (gated.length) {
    const rel = lufs(mean(gated)) - 10;
    const kept = gated.filter((b) => lufs(b.p) > rel);
    integrated = r1(lufs(mean(kept)));
  }
  const loudest = blocks.reduce((a, b) => (b.p > (a?.p ?? -1) ? b : a), null);
  const windowLufs = (start, end) => {
    const a = Math.max(0, Math.floor(start / 0.1));
    const b = Math.min(subs, Math.ceil(end / 0.1));
    if (b <= a) return null;
    let p = 0;
    for (let s = a; s < b; s++) p += sub[s];
    return r1(lufs(p / (b - a)));
  };
  return { integrated, momentaryMax: loudest ? { lufs: r1(lufs(loudest.p)), t: Math.round(loudest.t * 10) / 10 } : null, windowLufs };
}

export function detectOnsets({ rate, channels }, { highpassHz, rise = 9, floor = -50 }) {
  let mono = new Float64Array(channels[0].length);
  for (const ch of channels) for (let i = 0; i < mono.length; i++) mono[i] += ch[i] / channels.length;
  const raw = mono;
  if (highpassHz) mono = highpass(mono, rate, highpassHz);
  const hop = Math.round(rate * 0.01);
  const n = Math.floor(mono.length / hop);
  const db = new Float64Array(n);
  for (let f = 0; f < n; f++) {
    let acc = 0;
    for (let i = f * hop; i < (f + 1) * hop; i++) acc += mono[i] * mono[i];
    db[f] = 10 * Math.log10(Math.max(acc / hop, 1e-12));
  }
  const fires = (f) => {
    if (f < 1 || db[f] < floor) return false;
    const past = Array.from(db.subarray(Math.max(0, f - 30), f)).sort((a, b) => a - b);
    return db[f] - past[past.length >> 1] >= rise;
  };
  const onsets = [];
  let last = -Infinity;
  for (let f = 1; f < n; f++) {
    if (!fires(f) || fires(f - 1) || (f - last) * 10 < 80) continue;
    last = f;
    let peak = 0;
    for (let i = f * hop; i < Math.min(raw.length, (f + 20) * hop); i++) peak = Math.max(peak, Math.abs(raw[i]));
    onsets.push({ index: onsets.length, t: Math.round(f * 10) / 1000, peak_dbfs: r1(20 * Math.log10(Math.max(peak, 1e-10))) });
  }
  return onsets;
}

export function analyse(wav, { windows = [], baseline, onsets, highpassHz, rise, floor }) {
  const L = loudness(wav);
  const durationS = wav.channels[0].length / wav.rate;
  const ws = windows.map((w) => ({ name: w.name, start: w.start, end: w.end, lufs: L.windowLufs(w.start, w.end) }));
  const base = baseline ? ws.find((w) => w.name === baseline) : null;
  if (baseline && !base) throw new UsageError(`--baseline ${baseline} names no --window`);
  for (const w of ws) w.ducking_db = base && w.lufs !== null && base.lufs !== null ? r1(w.lufs - base.lufs) : null;
  const out = {
    sample_rate: wav.rate,
    channels: wav.channels.length,
    duration_s: Math.round(durationS * 1000) / 1000,
    integrated_lufs: L.integrated,
    momentary_max: L.momentaryMax,
    windows: ws,
    loudness_tag: 'measured',
    loudness_method: 'BS.1770 K-weighted, gated integrated loudness; windows are ungated mean loudness over 100 ms sub-blocks',
  };
  if (onsets) {
    out.onsets = detectOnsets(wav, { highpassHz, rise, floor });
    out.onset_error_ms = 10;
    out.onset_tag = 'measured';
    out.onset_method = `level rise of ${rise ?? 9} dB over the 300 ms median in a 10 ms envelope${highpassHz ? `, high-passed at ${highpassHz} Hz` : ''}`;
  }
  return out;
}

function main(argv) {
  const { values } = parse(
    argv,
    {
      wav: { type: 'string' },
      window: { type: 'string', multiple: true },
      baseline: { type: 'string' },
      onsets: { type: 'boolean' },
      highpass: { type: 'string' },
      rise: { type: 'string' },
      floor: { type: 'string' },
    },
    USAGE,
  );
  if (values.help) return console.log(USAGE);
  if (!values.wav) throw new UsageError(`--wav is required\n${USAGE}`);
  const windows = (values.window ?? []).map((s) => {
    const m = /^([^:]+):([\d.]+),([\d.]+)$/.exec(s);
    if (!m || Number(m[3]) <= Number(m[2])) throw new UsageError(`--window must be name:start,end in seconds, got ${s}`);
    return { name: m[1], start: Number(m[2]), end: Number(m[3]) };
  });
  const num = (k) => (values[k] === undefined ? undefined : Number(values[k]));
  const params = { windows, baseline: values.baseline, onsets: Boolean(values.onsets), highpassHz: num('highpass'), rise: num('rise'), floor: num('floor') };
  runCached(
    { inputs: [values.wav], step: 'audio', version: VERSION, params, root: values.out, force: values.force },
    () => {
      let buf;
      try {
        buf = readFileSync(values.wav);
      } catch (e) {
        throw new UsageError(`cannot read ${values.wav}: ${e.message}`);
      }
      return analyse(decodeWav(buf), params);
    },
    (r) => [
      `${r.duration_s}s, ${r.channels} ch at ${r.sample_rate} Hz: integrated ${r.integrated_lufs} LUFS, momentary max ${r.momentary_max?.lufs} at ${r.momentary_max?.t}s`,
      ...r.windows.map((w) => `- ${w.name} ${w.start}-${w.end}s: ${w.lufs} LUFS${w.ducking_db === null ? '' : `, ${w.ducking_db} dB vs baseline`}`),
      ...(r.onsets ? [`- ${r.onsets.length} onsets: ${r.onsets.slice(0, 6).map((o) => `${o.t}s`).join(', ')}`] : []),
    ],
  );
}

cli(import.meta.url, 'audio', main);
