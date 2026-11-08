import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { spring } from '../skills/reference-measure/scripts/fit-motion.mjs';
import { loadSchema, readResult, run, tempDir, validate } from './helpers.mjs';

const schema = loadSchema('fit-motion');
const fit = (rows, extra = []) => {
  const dir = tempDir();
  const file = join(dir, 'samples.csv');
  writeFileSync(file, `${Object.keys(rows[0]).join(',')}\n${rows.map((r) => Object.values(r).join(',')).join('\n')}\n`);
  const r = run('fit-motion.mjs', ['--csv', file, ...extra], dir);
  assert.equal(r.status, 0, r.stderr);
  const out = readResult(r.stdout);
  assert.deepEqual(validate(schema, out), []);
  return out.result;
};

test('an ease-out cubic at 60 fps is recovered with its true duration', () => {
  // Starts at frame 10 and lasts 24 frames (400 ms).
  const rows = Array.from({ length: 60 }, (_, i) => ({ t: i / 60, progress: 1 - (1 - Math.min(1, Math.max(0, (i - 10) / 24))) ** 3 }));
  const r = fit(rows);
  assert.equal(r.best_fit.name, 'ease-out-cubic');
  assert.ok(Math.abs(r.best_fit.duration_ms - 400) <= r.frame_ms, String(r.best_fit.duration_ms));
  assert.ok(r.duration_ms < 400, '2% settling cuts the slow tail');
  assert.equal(r.duration_error_ms, r.frame_ms);
  assert.equal(r.overshoot_pct, 0);
  assert.equal(r.fit_tag, 'estimate');
  assert.equal(r.timing_tag, 'measured');
});

test('a damped spring is recovered with its overshoot', () => {
  const rows = Array.from({ length: 70 }, (_, i) => ({ frame: i, progress: i < 10 ? 0 : spring((i - 10) / 60, 300, 0.4) }));
  const r = fit(rows, ['--fps', '60']);
  assert.equal(r.best_fit.name, 'spring');
  assert.ok(Math.abs(r.best_fit.stiffness - 300) < 15, String(r.best_fit.stiffness));
  assert.ok(Math.abs(r.best_fit.damping_ratio - 0.4) < 0.03, String(r.best_fit.damping_ratio));
  assert.ok(Math.abs(r.overshoot_pct - 25.4) < 1.5, String(r.overshoot_pct));
});

test('diff-only samples give threshold timing and say it is a lower bound', () => {
  const rows = Array.from({ length: 40 }, (_, i) => ({ t: i / 30, diff: i > 10 && i <= 19 ? 20 : 0.2 }));
  const r = fit(rows);
  assert.equal(r.onset_s, Math.round((10 / 30) * 1e4) / 1e4);
  assert.equal(r.settle_s, Math.round((19 / 30) * 1e4) / 1e4);
  assert.equal(r.duration_ms, 300);
  assert.equal(r.fits, undefined);
  assert.match(r.warnings.join(' '), /lower bound/);
});

test('a motion of few samples is fitted but flagged as a guess', () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({ t: i / 30, progress: Math.min(1, Math.max(0, (i - 3) / 5)) }));
  assert.match(fit(rows).warnings.join(' '), /cannot be told apart/);
});
