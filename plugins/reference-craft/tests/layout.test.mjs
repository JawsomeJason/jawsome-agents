import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { loadSchema, readResult, run, tempDir, validate } from './helpers.mjs';

test('boxes convert to % and points, and mixed capture scales are flagged', () => {
  const dir = tempDir();
  const spec = join(dir, 'layout.json');
  writeFileSync(
    spec,
    JSON.stringify({
      design_width: 390,
      captures: [{ name: 'tall', width: 1170, height: 2532 }, { name: 'small', width: 750, height: 1334 }],
      boxes: [{ name: 'cta', capture: 'tall', x: 117, y: 2100, w: 936, h: 150 }, { name: 'card', capture: 'small', x: 0.1, y: 0.2, w: 0.8, h: 0.5, unit: 'frac' }],
      lengths: [{ name: 'radius', capture: 'small', px: 25 }],
    }),
  );
  const r = run('layout.mjs', ['--spec', spec], dir);
  assert.equal(r.status, 0, r.stderr);
  const out = readResult(r.stdout);
  assert.deepEqual(validate(loadSchema('layout'), out), []);
  const [cta, card] = out.result.boxes;
  assert.deepEqual([cta.x_pct, cta.w_pct, cta.x_pt, cta.w_pt, cta.h_pt, cta.h_pt_snapped], [10, 80, 39, 312, 50, 52]);
  assert.deepEqual([card.x_pt, card.w_pt, card.h_pct], [39, 312, 50]);
  assert.equal(out.result.lengths[0].pt, 13);
  assert.equal(out.result.captures[1].scale_vs_first, 1.56);
  assert.equal(out.result.warnings.length, 2);
});

test('a spec without a design width fails with exit 2', () => {
  const dir = tempDir();
  const spec = join(dir, 'layout.json');
  writeFileSync(spec, JSON.stringify({ captures: [{ name: 'a', width: 100, height: 200 }] }));
  assert.equal(run('layout.mjs', ['--spec', spec], dir).status, 2);
  assert.equal(run('layout.mjs', ['--spec', spec, '--design-width', '390'], dir).status, 0);
});
