import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { loadSchema, readResult, run, tempDir, validate, writeWav } from './helpers.mjs';

const schema = loadSchema('audio');
const measure = (args, wav) => {
  const dir = tempDir();
  const file = join(dir, 'clip.wav');
  writeWav(file, wav);
  const r = run('audio.mjs', ['--wav', file, ...args], dir);
  assert.equal(r.status, 0, r.stderr);
  const out = readResult(r.stdout);
  assert.deepEqual(validate(schema, out), []);
  return out.result;
};

test('a full-scale 997 Hz sine reads -3 LUFS, and a quarter amplitude ducks 12 dB', () => {
  const r = measure(['--window', 'full:0,2', '--window', 'duck:2,4', '--baseline', 'full'], {
    seconds: 4,
    sample: (t) => (t < 2 ? 1 : 0.25) * 0.999 * Math.sin(2 * Math.PI * 997 * t),
  });
  assert.ok(Math.abs(r.windows[0].lufs - -3) <= 0.15, String(r.windows[0].lufs));
  assert.ok(Math.abs(r.windows[1].ducking_db - -12) <= 0.2, String(r.windows[1].ducking_db));
  assert.equal(r.loudness_tag, 'measured');
});

test('onsets are found to within 10 ms, and a high-pass keeps a low bed from hiding a click', () => {
  const beep = (t, at) => (t >= at && t < at + 0.1 ? 0.5 * Math.sin(2 * Math.PI * 3000 * t) : 0);
  const quiet = measure(['--onsets'], { seconds: 3, sample: (t) => beep(t, 1) + beep(t, 2.5) });
  assert.deepEqual(
    quiet.onsets.map((o) => Math.abs(o.t - [1, 2.5][o.index]) <= 0.01),
    [true, true],
  );
  const bed = (t) => 0.6 * Math.sin(2 * Math.PI * 80 * t);
  const masked = measure(['--onsets', '--highpass', '1500'], { seconds: 3, sample: (t) => bed(t) + 0.2 * (beep(t, 1) + beep(t, 2.5)) });
  assert.deepEqual(
    masked.onsets.map((o) => o.t),
    [1, 2.5],
  );
});
