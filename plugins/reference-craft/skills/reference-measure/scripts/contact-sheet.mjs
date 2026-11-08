#!/usr/bin/env node
// Plans what an agent looks at: one low-resolution contact sheet for a whole batch of frames, and
// small crops for the details numbers cannot settle. It writes no image; any image tool or media
// CLI composes the sheet from the plan, so the plan is the same whatever tool draws it.
import { UsageError, cli, parse, parseBox, readJson, runCached } from './cache.mjs';

export const VERSION = 1;
const USAGE = `usage: contact-sheet.mjs --source WxH (--frames <keyframes.json> | --times t1,t2,... | --count N --duration S)
  [--sheet-long <px>] [--min-tile <px>] [--crop name:x,y,w,h ...] [--crop-long <px>] [--out <root>] [--force]
  keyframes.json is [{t_seconds|t, index?}] or {keyframes:[...]}. Crop values are fractions of the source frame.`;

const LABEL_PX = 14;
const PAD = 4;

export function frameList({ frames, times, count, duration }) {
  if (frames) {
    const list = Array.isArray(frames) ? frames : frames.keyframes;
    if (!Array.isArray(list)) throw new UsageError('frames JSON must be an array or {keyframes:[...]}');
    return list.map((f, i) => ({ index: f.index ?? i, t: f.t_seconds ?? f.t }));
  }
  if (times) return times.map((t, i) => ({ index: i, t }));
  if (!(count > 0) || !(duration > 0)) throw new UsageError('pass --frames, --times, or --count with --duration');
  return Array.from({ length: count }, (_, i) => ({ index: i, t: Math.round(((i + 0.5) * duration * 1000) / count) / 1000 }));
}

// Picks the column count that gives the largest tiles on one sheet whose long side stays within
// sheetLong. When even the best layout would shrink tiles under minTile, the batch splits into
// as few sheets as keep every tile at least minTile wide on its long side.
export function planSheets(list, { width, height, sheetLong = 1200, minTile = 120 }) {
  const aspect = height / width;
  const layout = (n) => {
    let best = null;
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      // tile width w; sheet width = cols*(w+PAD)+PAD, height = rows*(w*aspect+LABEL_PX+PAD)+PAD
      const byW = (sheetLong - PAD * (cols + 1)) / cols;
      const byH = (sheetLong - PAD * (rows + 1) - rows * LABEL_PX) / (rows * aspect);
      const w = Math.floor(Math.min(byW, byH));
      if (w > 0 && (!best || w > best.tileW)) best = { cols, rows, tileW: w };
    }
    return best;
  };
  const tileLong = (l) => Math.max(l.tileW, Math.floor(l.tileW * aspect));
  let perSheet = list.length;
  while (perSheet > 1 && tileLong(layout(perSheet)) < minTile) perSheet--;
  // Spread the frames evenly, so the last sheet is not a near-empty remainder.
  perSheet = Math.ceil(list.length / Math.ceil(list.length / perSheet));
  const sheets = [];
  for (let s = 0; s * perSheet < list.length; s++) {
    const chunk = list.slice(s * perSheet, (s + 1) * perSheet);
    const { cols, rows, tileW } = layout(chunk.length);
    const tileH = Math.floor(tileW * aspect);
    sheets.push({
      index: s,
      cols,
      rows,
      tile_w: tileW,
      tile_h: tileH,
      width: cols * (tileW + PAD) + PAD,
      height: rows * (tileH + LABEL_PX + PAD) + PAD,
      tiles: chunk.map((f, i) => ({
        frame_index: f.index,
        t: f.t,
        x: PAD + (i % cols) * (tileW + PAD),
        y: PAD + Math.floor(i / cols) * (tileH + LABEL_PX + PAD),
        label: `#${f.index} ${Number(f.t).toFixed(2)}s`,
      })),
    });
  }
  return sheets;
}

export function planCrops(crops, { width, height, cropLong = 400 }) {
  return crops.map((c) => {
    if (c.x < 0 || c.y < 0 || c.w <= 0 || c.h <= 0 || c.x + c.w > 1.0001 || c.y + c.h > 1.0001) throw new UsageError(`crop ${c.name} must be fractions inside 0-1`);
    const sx = Math.round(c.x * width);
    const sy = Math.round(c.y * height);
    const sw = Math.max(1, Math.round(c.w * width));
    const sh = Math.max(1, Math.round(c.h * height));
    // Never upscale: a crop already under the cap is shown at capture size.
    const k = Math.min(1, cropLong / Math.max(sw, sh));
    return { name: c.name, source_rect: [sx, sy, sw, sh], out_w: Math.max(1, Math.round(sw * k)), out_h: Math.max(1, Math.round(sh * k)), scale: Math.round(k * 1000) / 1000 };
  });
}

export function plan(input) {
  const list = frameList(input);
  const sheets = list.length ? planSheets(list, input) : [];
  const crops = planCrops(input.crops ?? [], input);
  const full = list.length * input.width * input.height;
  const viewed = sheets.reduce((s, x) => s + x.width * x.height, 0) + crops.reduce((s, c) => s + c.out_w * c.out_h, 0);
  return {
    source: { width: input.width, height: input.height },
    frame_count: list.length,
    sheets,
    crops,
    pixels_full_frames: full,
    pixels_viewed: viewed,
    viewed_fraction: full ? Math.round((viewed / full) * 10000) / 10000 : null,
  };
}

function main(argv) {
  const { values } = parse(
    argv,
    {
      source: { type: 'string' },
      frames: { type: 'string' },
      times: { type: 'string' },
      count: { type: 'string' },
      duration: { type: 'string' },
      'sheet-long': { type: 'string' },
      'min-tile': { type: 'string' },
      crop: { type: 'string', multiple: true },
      'crop-long': { type: 'string' },
    },
    USAGE,
  );
  if (values.help) return console.log(USAGE);
  const m = /^(\d+)x(\d+)$/i.exec(values.source ?? '');
  if (!m) throw new UsageError(`--source WxH is required, such as 1080x1920\n${USAGE}`);
  const num = (k, d) => (values[k] === undefined ? d : Number(values[k]));
  const params = {
    width: Number(m[1]),
    height: Number(m[2]),
    times: values.times?.split(',').map(Number),
    count: num('count'),
    duration: num('duration'),
    sheetLong: num('sheet-long', 1200),
    minTile: num('min-tile', 120),
    cropLong: num('crop-long', 400),
    crops: (values.crop ?? []).map((c) => parseBox(c, 'crop')),
  };
  if (params.times?.some((t) => !Number.isFinite(t))) throw new UsageError('--times must be comma-separated seconds');
  // With no frames file the parameters are the whole input, and the plan caches under params/.
  const inputs = values.frames ? [values.frames] : [];
  const compute = () => plan({ ...params, frames: values.frames ? readJson(values.frames, 'frames') : undefined });
  const summarize = (r) => [
    `${r.frame_count} frames -> ${r.sheets.length} sheet(s), ${r.crops.length} crop(s); viewing ${(100 * (r.viewed_fraction ?? 0)).toFixed(2)}% of full-frame pixels`,
    ...r.sheets.map((s) => `- sheet ${s.index}: ${s.width}x${s.height}, ${s.cols}x${s.rows} tiles of ${s.tile_w}x${s.tile_h}`),
    ...r.crops.map((c) => `- crop ${c.name}: source ${c.source_rect.join(',')} -> ${c.out_w}x${c.out_h}`),
  ];
  runCached({ inputs, step: 'contact-sheet', version: VERSION, params, root: values.out, force: values.force }, compute, summarize);
}

cli(import.meta.url, 'contact-sheet', main);
