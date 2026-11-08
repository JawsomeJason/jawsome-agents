#!/usr/bin/env node
// Converts boxes and lengths measured in capture pixels into % of the frame and points at a
// stated design width. Captures from different devices or zoom levels have different px-per-pt
// scales, so each box names its capture and the result lists every capture's scale.
import { UsageError, cli, parse, readJson, runCached } from './cache.mjs';

export const VERSION = 1;
const USAGE = `usage: layout.mjs --spec <layout.json> [--design-width <pt>] [--grid <pt>] [--out <root>] [--force]
  layout.json: {design_width?, grid_pt?, captures:[{name, width, height}], boxes:[{name, capture, x, y, w, h, unit?: "px"|"frac"}], lengths:[{name, capture, px}]}`;

const r1 = (x) => Math.round(x * 10) / 10;
const snap = (pt, grid) => (grid ? Math.round(pt / grid) * grid : null);

export function convert(spec, { designWidth, grid } = {}) {
  const dw = designWidth ?? spec.design_width;
  const g = grid ?? spec.grid_pt ?? 4;
  if (!(dw > 0)) throw new UsageError('a design width in points is required (--design-width or design_width)');
  if (!Array.isArray(spec.captures) || !spec.captures.length) throw new UsageError('spec.captures must list at least one {name, width, height}');
  const caps = new Map();
  for (const c of spec.captures) {
    if (!c.name || !(c.width > 0) || !(c.height > 0)) throw new UsageError(`capture ${JSON.stringify(c)} needs name, width and height`);
    caps.set(c.name, { ...c, pt_per_px: dw / c.width, aspect: c.height / c.width });
  }
  const first = spec.captures[0].name;
  const captures = [...caps.values()].map((c) => ({
    name: c.name,
    width: c.width,
    height: c.height,
    pt_per_px: Math.round(c.pt_per_px * 10000) / 10000,
    scale_vs_first: Math.round((caps.get(first).width / c.width) * 1000) / 1000,
    aspect: Math.round(c.aspect * 1000) / 1000,
    height_pt: r1(c.height * c.pt_per_px),
  }));
  const warnings = [];
  const scales = new Set(captures.map((c) => c.pt_per_px));
  if (scales.size > 1) warnings.push('captures differ in scale; compare their values in pt, never in px');
  const aspects = new Set(captures.map((c) => c.aspect));
  if (aspects.size > 1) warnings.push('captures differ in aspect ratio, so they come from different screen classes; vertical positions in % do not transfer between them');
  const capOf = (item) => {
    const c = caps.get(item.capture ?? first);
    if (!c) throw new UsageError(`${item.name} names unknown capture ${item.capture}`);
    return c;
  };
  const boxes = (spec.boxes ?? []).map((b) => {
    const c = capOf(b);
    const k = b.unit === 'frac' ? [c.width, c.height] : [1, 1];
    const [x, y, w, h] = [b.x * k[0], b.y * k[1], b.w * k[0], b.h * k[1]];
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) throw new UsageError(`box ${b.name} needs numeric x, y, w, h`);
    const pt = (v) => r1(v * c.pt_per_px);
    return {
      name: b.name,
      capture: c.name,
      x_pct: r1((100 * x) / c.width),
      y_pct: r1((100 * y) / c.height),
      w_pct: r1((100 * w) / c.width),
      h_pct: r1((100 * h) / c.height),
      x_pt: pt(x),
      y_pt: pt(y),
      w_pt: pt(w),
      h_pt: pt(h),
      w_pt_snapped: snap(w * c.pt_per_px, g),
      h_pt_snapped: snap(h * c.pt_per_px, g),
      error_pt: r1(c.pt_per_px),
      tag: 'measured',
      method: `px box on ${c.width}x${c.height} capture scaled to ${dw} pt wide; snapped values are estimates`,
    };
  });
  const lengths = (spec.lengths ?? []).map((l) => {
    const c = capOf(l);
    if (!Number.isFinite(l.px)) throw new UsageError(`length ${l.name} needs numeric px`);
    return {
      name: l.name,
      capture: c.name,
      px: l.px,
      pt: r1(l.px * c.pt_per_px),
      pt_snapped: snap(l.px * c.pt_per_px, g),
      error_pt: r1(c.pt_per_px),
      tag: 'measured',
      method: `px length scaled to ${dw} pt wide`,
    };
  });
  return { design_width_pt: dw, grid_pt: g, captures, boxes, lengths, warnings };
}

function main(argv) {
  const { values } = parse(argv, { spec: { type: 'string' }, 'design-width': { type: 'string' }, grid: { type: 'string' } }, USAGE);
  if (values.help) return console.log(USAGE);
  if (!values.spec) throw new UsageError(`--spec is required\n${USAGE}`);
  const opts = { designWidth: values['design-width'] ? Number(values['design-width']) : undefined, grid: values.grid ? Number(values.grid) : undefined };
  runCached(
    { inputs: [values.spec], step: 'layout', version: VERSION, params: opts, root: values.out, force: values.force },
    () => convert(readJson(values.spec, 'spec'), opts),
    (r) => [
      `${r.boxes.length} boxes, ${r.lengths.length} lengths at ${r.design_width_pt} pt wide`,
      ...r.captures.map((c) => `- capture ${c.name} ${c.width}x${c.height}: ${c.pt_per_px} pt/px`),
      ...r.boxes.slice(0, 10).map((b) => `- ${b.name}: ${b.w_pt}x${b.h_pt} pt at (${b.x_pt}, ${b.y_pt})`),
      ...r.warnings.map((w) => `! ${w}`),
    ],
  );
}

cli(import.meta.url, 'layout', main);
