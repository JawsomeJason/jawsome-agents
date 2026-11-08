#!/usr/bin/env node
// Motion timing from a CSV of per-frame samples. A diff column (frame-to-frame change inside a
// region) gives onset, settle and duration; a progress column (any quantity that moves from its
// start to its end value: position, scale, opacity, a projection of the pixels) is fitted to
// candidate easings and a damped spring. Frame rate bounds every time: the error bar is one frame.
import { readFileSync } from 'node:fs';
import { UsageError, cli, parse, runCached } from './cache.mjs';

export const VERSION = 1;
const USAGE = `usage: fit-motion.mjs --csv <samples.csv> [--fps <n>] [--out <root>] [--force]
  samples.csv has a header with t (seconds) or frame (needs --fps), and progress or diff. With progress, the
  window must start and end at rest; timing uses 2% bands and every easing gets a fitted duration. diff alone
  gives threshold timing only.`;

export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  if (lines.length < 2) throw new UsageError('CSV needs a header and at least one row');
  const head = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((l, i) => {
    const cells = l.split(',').map((c) => Number(c.trim()));
    if (cells.length !== head.length || cells.some((c) => !Number.isFinite(c))) throw new UsageError(`CSV row ${i + 2} is not ${head.length} numbers`);
    return Object.fromEntries(head.map((h, k) => [h, cells[k]]));
  });
  return { head, rows };
}

// ---- easings on normalized time 0..1
function cubicBezier(x1, y1, x2, y2) {
  const bez = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (bez(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return bez(y1, y2, (lo + hi) / 2);
  };
}

export const EASINGS = {
  linear: (t) => t,
  'ease-in-cubic': (t) => t ** 3,
  'ease-out-cubic': (t) => 1 - (1 - t) ** 3,
  'ease-in-out-cubic': (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  'ease-out-quint': (t) => 1 - (1 - t) ** 5,
  'ease-out-expo': (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  'css-ease': cubicBezier(0.25, 0.1, 0.25, 1),
  'css-ease-in': cubicBezier(0.42, 0, 1, 1),
  'css-ease-out': cubicBezier(0, 0, 0.58, 1),
  'css-ease-in-out': cubicBezier(0.42, 0, 0.58, 1),
};

// Unit step response of a mass-1 spring with stiffness k and damping ratio z, t in seconds.
export function spring(t, k, z) {
  const w = Math.sqrt(k);
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  }
  if (z === 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const s = w * Math.sqrt(z * z - 1);
  const r1 = -z * w + s;
  const r2 = -z * w - s;
  return 1 + (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r1 - r2);
}

const rmse = (f, xs, ys) => Math.sqrt(xs.reduce((s, x, i) => s + (f(x) - ys[i]) ** 2, 0) / xs.length);

export function fitSpring(ts, ps) {
  let best = { e: Infinity, k: 0, z: 0 };
  for (let i = 0; i < 40; i++) {
    const k = 20 * 1000 ** (i / 39);
    for (let j = 0; j < 30; j++) {
      const z = 0.15 + (1.45 * j) / 29;
      const e = rmse((t) => spring(t, k, z), ts, ps);
      if (e < best.e) best = { e, k, z };
    }
  }
  let { k, z } = best;
  let dk = k * 0.1;
  let dz = 0.05;
  for (let it = 0; it < 60; it++) {
    for (const [ak, az] of [[dk, 0], [-dk, 0], [0, dz], [0, -dz]]) {
      const k2 = Math.max(1, k + ak);
      const z2 = Math.max(0.05, z + az);
      const e = rmse((t) => spring(t, k2, z2), ts, ps);
      if (e < best.e) {
        best = { e, k: k2, z: z2 };
        k = k2;
        z = z2;
      }
    }
    dk *= 0.9;
    dz *= 0.9;
  }
  const w = Math.sqrt(k);
  return {
    name: 'spring',
    rmse: best.e,
    stiffness: Math.round(k * 10) / 10,
    damping: Math.round(2 * z * w * 100) / 100,
    damping_ratio: Math.round(z * 1000) / 1000,
    response_s: Math.round(((2 * Math.PI) / w) * 1000) / 1000,
  };
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const r4 = (x) => Math.round(x * 1e4) / 1e4;

// Each easing gets its own fitted duration and a sub-frame start, because the frame that shows
// motion first was captured somewhere inside the frame interval after the motion began.
function fitEasing(f, ts, p, t0, frameS, guess) {
  let best = { e: Infinity, d: guess, s: 0 };
  for (let k = 0; k <= 120; k++) {
    const d = guess * (0.3 + (1.7 * k) / 120);
    for (let j = 0; j < 5; j++) {
      const s = (frameS * j) / 5;
      const e = rmse((t) => f(Math.min(1, Math.max(0, (t - t0 - s) / d))), ts, p);
      if (e < best.e) best = { e, d, s };
    }
  }
  return best;
}

export function analyse(rows, fps) {
  const ts = rows.map((r) => ('t' in r ? r.t : r.frame / fps));
  if (ts.some((t, i) => i && t <= ts[i - 1])) throw new UsageError('times must increase row by row');
  const frameS = fps ? 1 / fps : median(ts.slice(1).map((t, i) => t - ts[i]));
  const out = { samples: rows.length, fps: Math.round((1 / frameS) * 1000) / 1000, frame_ms: Math.round(frameS * 1e5) / 100, warnings: [] };
  const setTiming = (i0, i1, method) => {
    out.onset_s = r4(ts[i0]);
    out.settle_s = r4(ts[i1]);
    out.duration_ms = Math.round((ts[i1] - ts[i0]) * 1e4) / 10;
    out.duration_error_ms = out.frame_ms;
    out.timing_tag = 'measured';
    out.timing_method = method;
  };
  if ('progress' in rows[0]) {
    // The window must start and end at rest, so the first and last samples are the two rest values.
    const v0 = rows[0].progress;
    const v1 = rows.at(-1).progress;
    if (v1 === v0) {
      out.warnings.push('progress starts and ends at the same value; widen the window so it starts and ends at rest');
      return out;
    }
    const p = rows.map((r) => (r.progress - v0) / (v1 - v0));
    let i0 = 0;
    while (i0 + 1 < p.length && Math.abs(p[i0 + 1]) <= 0.02) i0++;
    let i1 = p.length - 1;
    while (i1 - 1 > i0 && Math.abs(p[i1 - 1] - 1) <= 0.02) i1--;
    setTiming(i0, i1, 'progress leaves the 2% band around its start value, and settles into the 2% band around its end value; one-frame error bar');
    if (i1 - i0 < 3) {
      out.warnings.push('fewer than 4 samples in the motion; no easing fit');
      return out;
    }
    // Fit from the onset to half a duration past settle, so a slow tail and any overshoot count.
    const stop = Math.min(p.length - 1, i1 + Math.ceil((i1 - i0) / 2));
    const fts = ts.slice(i0, stop + 1);
    const fp = p.slice(i0, stop + 1);
    const t0 = ts[i0];
    const guess = ts[i1] - t0;
    const fits = Object.entries(EASINGS).map(([name, f]) => {
      const b = fitEasing(f, fts, fp, t0, frameS, guess);
      return { name, rmse: b.e, duration_ms: Math.round(b.d * 1e4) / 10, start_s: r4(t0 + b.s) };
    });
    fits.push(
      fitSpring(
        fts.map((t) => t - t0),
        fp,
      ),
    );
    fits.sort((a, b) => a.rmse - b.rmse);
    for (const f of fits) f.rmse = r4(f.rmse);
    out.fits = fits;
    out.best_fit = fits[0];
    out.overshoot_pct = Math.round(Math.max(0, Math.max(...p) - 1) * 1000) / 10;
    out.fit_samples = fp.length;
    out.fit_tag = 'estimate';
    out.fit_method = 'least-squares fit of normalized progress with a fitted duration per easing; easing names are candidates, not the source curve';
    const moving = i1 - i0 + 1;
    if (moving < 8) out.warnings.push(`only ${moving} samples in the motion: easings this close cannot be told apart, so treat the curve as a guess`);
    if (fits[1].rmse - fits[0].rmse < 0.01) out.warnings.push(`best fits ${fits[0].name} and ${fits[1].name} differ by under 0.01 rmse: ambiguous`);
    return out;
  }
  const d = rows.map((r) => r.diff);
  const rest = d.slice(1).sort((a, b) => a - b);
  const noise = median(rest.slice(0, Math.max(1, rest.length >> 2)));
  const peak = Math.max(...d);
  const threshold = Math.max(4 * noise, 0.1 * peak, 1e-6);
  const active = d.map((v, i) => (v > threshold ? i : -1)).filter((i) => i >= 0);
  Object.assign(out, { noise: r4(noise), peak: r4(peak), threshold: r4(threshold) });
  if (!active.length) {
    out.warnings.push('no motion above threshold');
    return out;
  }
  // A diff sample compares a frame to the one before, so motion began at the frame before the first active one.
  setTiming(Math.max(0, active[0] - 1), active.at(-1), 'frame differencing above max(4 x noise floor, 10% of peak); one-frame error bar');
  out.warnings.push('diff-only timing cuts a slow tail short (an ease-out ends under the threshold), so the duration is a lower bound; add a progress column to fit it');
  return out;
}

function main(argv) {
  const { values } = parse(argv, { csv: { type: 'string' }, fps: { type: 'string' } }, USAGE);
  if (values.help) return console.log(USAGE);
  if (!values.csv) throw new UsageError(`--csv is required\n${USAGE}`);
  const fps = values.fps ? Number(values.fps) : undefined;
  if (values.fps && !(fps > 0)) throw new UsageError('--fps must be a positive number');
  runCached(
    { inputs: [values.csv], step: 'fit-motion', version: VERSION, params: { fps }, root: values.out, force: values.force },
    () => {
      let text;
      try {
        text = readFileSync(values.csv, 'utf8');
      } catch (e) {
        throw new UsageError(`cannot read ${values.csv}: ${e.message}`);
      }
      const { head, rows } = parseCsv(text);
      if (!head.includes('t') && !(head.includes('frame') && fps)) throw new UsageError('CSV needs a t column, or a frame column with --fps');
      if (!head.includes('diff') && !head.includes('progress')) throw new UsageError('CSV needs a diff or progress column');
      return analyse(rows, fps);
    },
    (r) => [
      `${r.samples} samples at ${r.fps} fps (one frame = ${r.frame_ms} ms)`,
      ...('duration_ms' in r ? [`- onset ${r.onset_s}s, settle ${r.settle_s}s, duration ${r.duration_ms} +- ${r.duration_error_ms} ms`] : []),
      ...(r.best_fit
        ? [
            `- best ${r.best_fit.name} rmse ${r.best_fit.rmse}${r.best_fit.duration_ms ? `, fitted duration ${r.best_fit.duration_ms} ms` : `, k ${r.best_fit.stiffness} zeta ${r.best_fit.damping_ratio}`}, overshoot ${r.overshoot_pct}%; next ${r.fits[1].name} ${r.fits[1].rmse}`,
          ]
        : []),
      ...r.warnings.map((w) => `! ${w}`),
    ],
  );
}

cli(import.meta.url, 'fit-motion', main);
