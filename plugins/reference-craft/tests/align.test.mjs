import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { loadSchema, readResult, run, tempDir, validate } from './helpers.mjs';

test('onsets map to keyframes and the capture skew is the median offset', () => {
  const dir = tempDir();
  const keyframes = join(dir, 'keyframes.json');
  writeFileSync(keyframes, JSON.stringify([1, 2, 3, 4].map((t, i) => ({ index: i, t_seconds: t }))));
  const onsets = join(dir, 'onsets.csv');
  // Sound leads picture by 20 ms, except one onset with no matching cut.
  writeFileSync(onsets, 't,peak\n0.98,-6\n1.98,-6\n2.98,-6\n3.5,-20\n');
  const r = run('align.mjs', ['--onsets', onsets, '--keyframes', keyframes, '--fps', '30'], dir);
  assert.equal(r.status, 0, r.stderr);
  const out = readResult(r.stdout);
  assert.deepEqual(validate(loadSchema('align'), out), []);
  assert.equal(out.result.matched, 3);
  assert.equal(out.result.median_offset_ms, 20);
  assert.deepEqual(
    out.result.matches.map((m) => m.keyframe_index),
    [0, 1, 2, 2],
  );
});
