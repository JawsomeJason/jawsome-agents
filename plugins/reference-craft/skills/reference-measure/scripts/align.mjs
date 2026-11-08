#!/usr/bin/env node
// Maps audio onsets to the nearest video keyframe. The median signed offset across all matches is
// the capture's audio/video skew: subtract it before reading any single sound-to-picture delay.
import { readFileSync } from 'node:fs';
import { UsageError, cli, parse, readJson, runCached } from './cache.mjs';

export const VERSION = 1;
const USAGE = `usage: align.mjs --onsets <onsets.json|csv> --keyframes <keyframes.json> --fps <n> [--tolerance-frames <n>] [--out <root>] [--force]
  onsets: [seconds...], [{t_seconds|t}], {onsets:[...]} or an audio.mjs result.json, or a CSV with a t column.
  keyframes: [{t_seconds|t, index?}], {keyframes:[...]} or a cached keyframes result.json.`;

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null;
};

export function readTimes(path, key) {
  if (/\.csv$/i.test(path)) {
    const lines = readFileSync(path, 'utf8').split(/\r?\n/).filter((l) => l.trim());
    const head = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const col = head.indexOf('t') >= 0 ? head.indexOf('t') : head.indexOf('t_seconds');
    if (col < 0) throw new UsageError(`${path} needs a t column`);
    return lines.slice(1).map((l, i) => ({ index: i, t: Number(l.split(',')[col]) }));
  }
  const data = readJson(path, key);
  // A cache envelope from another step holds its list under result.
  const list = Array.isArray(data) ? data : (data[key] ?? data.result?.[key]);
  if (!Array.isArray(list)) throw new UsageError(`${path} must be an array or {${key}:[...]}`);
  return list.map((x, i) => (typeof x === 'number' ? { index: i, t: x } : { index: x.index ?? i, t: x.t_seconds ?? x.t }));
}

export function align(onsets, keyframes, { fps, toleranceFrames = 1 }) {
  if (!keyframes.length) throw new UsageError('no keyframes to align to');
  for (const x of [...onsets, ...keyframes]) if (!Number.isFinite(x.t)) throw new UsageError('every onset and keyframe needs a numeric time');
  const frameMs = 1000 / fps;
  const tolMs = toleranceFrames * frameMs;
  const matches = onsets.map((o) => {
    let best = keyframes[0];
    for (const k of keyframes) if (Math.abs(k.t - o.t) < Math.abs(best.t - o.t)) best = k;
    const dt = Math.round((best.t - o.t) * 1e5) / 100;
    return { onset_index: o.index, t: o.t, keyframe_index: best.index, keyframe_t: best.t, dt_ms: dt, within_tolerance: Math.abs(dt) <= tolMs + 1e-9 };
  });
  const offset = median(matches.filter((m) => Math.abs(m.dt_ms) <= 10 * tolMs).map((m) => m.dt_ms));
  return {
    fps,
    frame_ms: Math.round(frameMs * 100) / 100,
    tolerance_ms: Math.round(tolMs * 100) / 100,
    matched: matches.filter((m) => m.within_tolerance).length,
    onsets: matches.length,
    median_offset_ms: offset,
    tag: 'measured',
    method: 'nearest keyframe per onset; offset is the median signed delay among onsets within ten frames of a keyframe',
    matches,
  };
}

function main(argv) {
  const { values } = parse(argv, { onsets: { type: 'string' }, keyframes: { type: 'string' }, fps: { type: 'string' }, 'tolerance-frames': { type: 'string' } }, USAGE);
  if (values.help) return console.log(USAGE);
  for (const n of ['onsets', 'keyframes', 'fps']) if (!values[n]) throw new UsageError(`--${n} is required\n${USAGE}`);
  const fps = Number(values.fps);
  if (!(fps > 0)) throw new UsageError('--fps must be a positive number');
  const params = { fps, toleranceFrames: values['tolerance-frames'] ? Number(values['tolerance-frames']) : 1 };
  runCached(
    { inputs: [values.onsets, values.keyframes], step: 'align', version: VERSION, params, root: values.out, force: values.force },
    () => align(readTimes(values.onsets, 'onsets'), readTimes(values.keyframes, 'keyframes'), params),
    (r) => [`${r.matched}/${r.onsets} onsets within ${r.tolerance_ms} ms of a keyframe; median offset ${r.median_offset_ms} ms`],
  );
}

cli(import.meta.url, 'align', main);
