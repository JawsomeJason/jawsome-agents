#!/usr/bin/env node
// Median colour of small boxes in a PNG (or of pixel samples another tool read), matched to the
// nearest design token by CIEDE2000. A single pixel is never trusted: compression, dithering and
// anti-aliasing move it, and the median of a box is stable under all three.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { UsageError, cli, parse, parseBox, readJson, runCached } from './cache.mjs';

export const VERSION = 1;
const USAGE = `usage: colors.mjs --tokens <tokens.json> (--image <file.png> (--box name:x,y,w,h ... | --grid CxR) | --samples <samples.json>)
  [--theme <name>] [--match <deltaE>] [--out <root>] [--force]
  Box values are fractions (0-1) of the image width and height. samples.json is [{name, rgb:[r,g,b]} | {name, hex} | {name, pixels:[[r,g,b],...]}].`;

// ---- PNG: non-interlaced, 8 or 16 bits per channel, grey, RGB, palette, grey+alpha or RGBA.
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new UsageError('not a PNG; convert the frame to PNG with any image tool, or pass --samples');
  let off = 8;
  let ihdr;
  let palette;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') ihdr = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), depth: data[8], color: data[9], interlace: data[12] };
    else if (type === 'PLTE') palette = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (!ihdr) throw new UsageError('PNG has no header');
  const { width, height, depth, color, interlace } = ihdr;
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[color];
  if (interlace || !channels || ![8, 16].includes(depth) || (color === 3 && depth !== 8)) {
    throw new UsageError('unsupported PNG layout (interlaced or under 8 bits); re-save it as a plain 8-bit PNG or pass --samples');
  }
  const bpp = (channels * depth) / 8;
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = px.subarray(y * stride, (y + 1) * stride);
    const prev = y ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? row[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = src[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      row[i] = v & 0xff;
    }
  }
  const step = depth / 8;
  const rgbAt = (x, y) => {
    const o = y * stride + x * bpp;
    const ch = (k) => px[o + k * step];
    if (color === 3) return [palette[ch(0) * 3], palette[ch(0) * 3 + 1], palette[ch(0) * 3 + 2]];
    if (channels <= 2) return [ch(0), ch(0), ch(0)];
    return [ch(0), ch(1), ch(2)];
  };
  return { width, height, rgbAt };
}

export function readPng(path) {
  try {
    return decodePng(readFileSync(path));
  } catch (e) {
    if (e instanceof UsageError) throw e;
    throw new UsageError(`cannot decode ${path}: ${e.message}`);
  }
}

// ---- colour science (sRGB D65 -> CIE Lab -> CIEDE2000, Sharma, Wu and Dalal formulation)
export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export const rgbToHex = (rgb) => `#${rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`;

export function rgbToLab([r, g, b]) {
  const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
  const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

export function ciede2000([L1, a1, b1], [L2, a2, b2]) {
  const Cb = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const hue = (b, a) => (b === 0 && a === 0 ? 0 : (deg(Math.atan2(b, a)) + 360) % 360);
  const h1p = hue(b1, a1p);
  const h2p = hue(b2, a2p);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2));
  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hbp = (h1p + h2p) / 2;
    else hbp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
  }
  const T = 1 - 0.17 * Math.cos(rad(hbp - 30)) + 0.24 * Math.cos(rad(2 * hbp)) + 0.32 * Math.cos(rad(3 * hbp + 6)) - 0.2 * Math.cos(rad(4 * hbp - 63));
  const dth = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbp;
  const Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(rad(2 * dth)) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}

// ---- tokens: a flat {name: "#hex"} map, an array of {name, value}, or nested groups whose leaves
// are hex strings or {value | $value}. A value that is an object of themes picks --theme.
function parseColorValue(v, theme) {
  if (v && typeof v === 'object' && !Array.isArray(v)) v = v[theme] ?? Object.values(v)[0];
  if (typeof v !== 'string') return null;
  const rgbFn = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(v.trim());
  return rgbFn ? rgbFn.slice(1, 4).map(Number) : hexToRgb(v);
}

export function loadTokens(data, theme = 'light') {
  const out = [];
  const add = (name, value) => {
    const rgb = parseColorValue(value, theme);
    if (rgb) out.push({ name, hex: rgbToHex(rgb), lab: rgbToLab(rgb) });
  };
  const walk = (node, path) => {
    if (Array.isArray(node)) {
      for (const t of node) if (t && typeof t === 'object' && 'name' in t) add(t.name, t.value ?? t.$value);
      return;
    }
    if (typeof node === 'string') return add(path.join('.'), node);
    if (!node || typeof node !== 'object') return;
    if ('$value' in node || 'value' in node) return add(path.join('.'), node.$value ?? node.value);
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(v, [...path, k]);
  };
  walk(data, []);
  return out;
}

export function nearest(rgb, tokens, match) {
  const lab = rgbToLab(rgb);
  const ranked = tokens.map((t) => ({ token: t.name, token_hex: t.hex, delta_e: ciede2000(lab, t.lab) })).sort((a, b) => a.delta_e - b.delta_e);
  const [best, next] = ranked;
  if (!best) return { token: null, token_hex: null, delta_e: null, runner_up: null, verdict: 'no-tokens' };
  const r2 = (x) => Math.round(x * 100) / 100;
  const verdict = best.delta_e <= 1 ? 'exact' : best.delta_e <= match ? 'match' : best.delta_e <= 2 * match ? 'near' : 'none';
  return {
    token: best.token,
    token_hex: best.token_hex,
    delta_e: r2(best.delta_e),
    runner_up: next ? { token: next.token, delta_e: r2(next.delta_e) } : null,
    verdict,
  };
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const quantile = (s, q) => s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))];

// Median per channel, plus the widest channel's interquartile range: a high spread means the box
// caught an edge, text or a gradient, and should shrink before its median means anything.
export function summarize(pixels) {
  const rgb = [0, 1, 2].map((k) => median(pixels.map((p) => p[k])));
  const spread = Math.max(
    ...[0, 1, 2].map((k) => {
      const s = pixels.map((p) => p[k]).sort((a, b) => a - b);
      return quantile(s, 0.75) - quantile(s, 0.25);
    }),
  );
  return { rgb: rgb.map(Math.round), spread };
}

export function boxPixels(img, { x, y, w, h }) {
  const x0 = Math.floor(x * img.width);
  const y0 = Math.floor(y * img.height);
  const x1 = Math.min(img.width, Math.max(x0 + 1, Math.floor((x + w) * img.width)));
  const y1 = Math.min(img.height, Math.max(y0 + 1, Math.floor((y + h) * img.height)));
  const pixels = [];
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) pixels.push(img.rgbAt(i, j));
  return { pixels, rect: [x0, y0, x1 - x0, y1 - y0] };
}

export function measure({ img, boxes, samples, tokens, match }) {
  const items = [];
  const describe = (name, rgb, extra, method) => {
    items.push({ name, hex: rgbToHex(rgb), rgb, ...extra, ...nearest(rgb, tokens, match), tag: 'measured', method });
  };
  for (const b of boxes) {
    if (b.x < 0 || b.y < 0 || b.w <= 0 || b.h <= 0 || b.x + b.w > 1.0001 || b.y + b.h > 1.0001) throw new UsageError(`box ${b.name} must be fractions inside 0-1`);
    const { pixels, rect } = boxPixels(img, b);
    const { rgb, spread } = summarize(pixels);
    const warnings = [];
    if (rect[2] < 4 || rect[3] < 4) warnings.push('box under 4 px on a side: enlarge it inside the flat area');
    if (spread > 12) warnings.push('channel spread over 12: the box crosses an edge, text or gradient');
    describe(b.name, rgb, { rect_px: rect, pixel_count: pixels.length, spread, warnings }, `median of ${rect[2]}x${rect[3]} px box`);
  }
  for (const s of samples) {
    if (Array.isArray(s.pixels) && s.pixels.length) {
      const { rgb, spread } = summarize(s.pixels);
      describe(s.name, rgb, { pixel_count: s.pixels.length, spread, warnings: spread > 12 ? ['channel spread over 12'] : [] }, `median of ${s.pixels.length} supplied pixels`);
    } else {
      const rgb = Array.isArray(s.rgb) ? s.rgb.map(Math.round) : s.hex ? hexToRgb(s.hex) : null;
      if (!rgb) throw new UsageError(`sample ${s.name} needs rgb, hex or pixels`);
      describe(s.name, rgb, { pixel_count: null, spread: null, warnings: [] }, s.method ?? 'supplied colour');
    }
  }
  return items;
}

function main(argv) {
  const { values } = parse(
    argv,
    {
      tokens: { type: 'string' },
      image: { type: 'string' },
      box: { type: 'string', multiple: true },
      grid: { type: 'string' },
      samples: { type: 'string' },
      theme: { type: 'string' },
      match: { type: 'string' },
    },
    USAGE,
  );
  if (values.help) return console.log(USAGE);
  if (!values.tokens) throw new UsageError(`--tokens is required\n${USAGE}`);
  if (!values.image === !values.samples) throw new UsageError(`pass exactly one of --image or --samples\n${USAGE}`);
  const boxes = (values.box ?? []).map((b) => parseBox(b));
  if (values.grid) {
    const m = /^(\d+)x(\d+)$/i.exec(values.grid);
    if (!m) throw new UsageError('--grid must be CxR, such as 4x8');
    const [c, r] = [Number(m[1]), Number(m[2])];
    for (let j = 0; j < r; j++) for (let i = 0; i < c; i++) boxes.push({ name: `r${j}c${i}`, x: i / c, y: j / r, w: 1 / c, h: 1 / r });
  }
  if (values.image && !boxes.length) throw new UsageError(`--image needs --box or --grid\n${USAGE}`);
  const theme = values.theme ?? 'light';
  const match = values.match ? Number(values.match) : 3;
  const input = values.image ?? values.samples;
  const params = { boxes, theme, match };
  runCached(
    { inputs: [input, values.tokens], step: 'colors', version: VERSION, params, root: values.out, force: values.force },
    () => {
      const tokens = loadTokens(readJson(values.tokens, 'tokens'), theme);
      const img = values.image ? readPng(values.image) : null;
      const samples = values.samples ? readJson(values.samples, 'samples') : [];
      if (!Array.isArray(samples)) throw new UsageError('samples must be a JSON array');
      return { image: img ? { width: img.width, height: img.height } : null, token_count: tokens.length, colors: measure({ img, boxes, samples, tokens, match }) };
    },
    (r) => [
      `${r.colors.length} colours against ${r.token_count} tokens`,
      ...r.colors.slice(0, 12).map((c) => `- ${c.name}: ${c.hex} -> ${c.token ?? 'none'} dE ${c.delta_e} (${c.verdict})${c.warnings.length ? ' !' : ''}`),
      ...(r.colors.length > 12 ? [`- ${r.colors.length - 12} more in result.json`] : []),
    ],
  );
}

cli(import.meta.url, 'colors', main);
