import assert from 'node:assert/strict';
import { copyFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { canonical, cacheKey } from '../skills/reference-measure/scripts/cache.mjs';
import { loadSchema, readResult, resultPath, run, tempDir, validate } from './helpers.mjs';

const csv = (dir) => {
  const file = join(dir, 'motion.csv');
  writeFileSync(file, `t,progress\n${Array.from({ length: 30 }, (_, i) => `${i / 30},${Math.min(1, Math.max(0, (i - 5) / 15))}`).join('\n')}\n`);
  return file;
};

test('a rerun with the same bytes, version and params is a no-op', () => {
  const dir = tempDir();
  const file = csv(dir);
  const first = run('fit-motion.mjs', ['--csv', file], dir);
  assert.equal(first.status, 0, first.stderr);
  const path = resultPath(first.stdout);
  const mtime = statSync(path).mtimeMs;
  const second = run('fit-motion.mjs', ['--csv', file], dir);
  assert.match(second.stdout, /^\[cached\]/);
  assert.equal(resultPath(second.stdout), path);
  assert.equal(statSync(path).mtimeMs, mtime);
  assert.deepEqual(validate(loadSchema('cache.result'), readResult(first.stdout)), []);
});

test('--force recomputes into the same slot, and new params get their own slot', () => {
  const dir = tempDir();
  const file = csv(dir);
  const a = resultPath(run('fit-motion.mjs', ['--csv', file], dir).stdout);
  const forced = run('fit-motion.mjs', ['--csv', file, '--force'], dir);
  assert.doesNotMatch(forced.stdout, /\[cached\]/);
  assert.equal(resultPath(forced.stdout), a);
  const b = resultPath(run('fit-motion.mjs', ['--csv', file, '--fps', '30'], dir).stdout);
  assert.notEqual(a, b);
  assert.deepEqual(readdirSync(join(a, '..')).filter((f) => f.includes('.tmp-')), []);
});

test('the key follows the bytes, not the file name or key order', () => {
  const dir = tempDir();
  const file = csv(dir);
  const copy = join(dir, 'renamed.csv');
  copyFileSync(file, copy);
  const k1 = cacheKey({ inputs: [file], step: 's', version: 1, params: { a: 1, b: 2 } });
  const k2 = cacheKey({ inputs: [copy], step: 's', version: 1, params: { b: 2, a: 1 } });
  assert.equal(k1.inputs_sha12, k2.inputs_sha12);
  assert.equal(k1.params_sha8, k2.params_sha8);
  assert.equal(canonical({ b: [1, { d: 1, c: 2 }], a: null }), '{"a":null,"b":[1,{"c":2,"d":1}]}');
});

test('lookup and commit let a hand-run step use the same cache', () => {
  const dir = tempDir();
  const file = csv(dir);
  const args = ['--input', file, '--step', 'keyframes', '--version', '2', '--params', '{"threshold":0.2}'];
  const miss = JSON.parse(run('cache.mjs', ['lookup', ...args], dir).stdout);
  assert.equal(miss.status, 'miss');
  assert.deepEqual(validate(loadSchema('cache.lookup'), miss), []);
  assert.match(miss.key.folder, /^motion-[0-9a-f]{12}\/keyframes-v2-[0-9a-f]{8}$/);
  const result = join(dir, 'r.json');
  writeFileSync(result, JSON.stringify({ count: 3 }));
  const c = run('cache.mjs', ['commit', ...args, '--result', result], dir);
  assert.equal(c.status, 0, c.stderr);
  const hit = JSON.parse(run('cache.mjs', ['lookup', ...args], dir).stdout);
  assert.equal(hit.status, 'hit');
  assert.equal(JSON.parse(run('cache.mjs', ['lookup', ...args, '--force'], dir).stdout).status, 'miss');
});

test('cache.mjs rejects a missing input and a bad command with exit 2', () => {
  const dir = tempDir();
  assert.equal(run('cache.mjs', ['lookup', '--input', join(dir, 'nope'), '--step', 's', '--version', '1'], dir).status, 2);
  assert.equal(run('cache.mjs', ['purge'], dir).status, 2);
});
