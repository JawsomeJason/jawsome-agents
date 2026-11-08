import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { loadSchema, readResult, run, tempDir, validate } from './helpers.mjs';

const schema = loadSchema('contact-sheet');

test('a whole batch fits one sheet within the long-side cap', () => {
  const dir = tempDir();
  const frames = join(dir, 'keyframes.json');
  writeFileSync(frames, JSON.stringify({ keyframes: Array.from({ length: 24 }, (_, i) => ({ index: i, t_seconds: i * 1.5 })) }));
  const r = run('contact-sheet.mjs', ['--source', '1080x1920', '--frames', frames, '--crop', 'cta:0.1,0.8,0.8,0.08', '--crop', 'icon:0.5,0.5,0.05,0.03'], dir);
  assert.equal(r.status, 0, r.stderr);
  const out = readResult(r.stdout);
  assert.deepEqual(validate(schema, out), []);
  const { sheets, crops } = out.result;
  assert.equal(sheets.length, 1);
  const s = sheets[0];
  assert.ok(Math.max(s.width, s.height) <= 1200);
  assert.equal(s.tiles.length, 24);
  for (const t of s.tiles) assert.ok(t.x + s.tile_w <= s.width && t.y + s.tile_h <= s.height);
  assert.equal(Math.max(crops[0].out_w, crops[0].out_h), 400);
  assert.equal(crops[1].scale, 1, 'a small crop is never upscaled');
  assert.ok(out.result.viewed_fraction < 0.05);
});

test('a batch too large for one readable sheet splits into the fewest sheets', () => {
  const dir = tempDir();
  const r = run('contact-sheet.mjs', ['--source', '1920x1080', '--count', '200', '--duration', '600', '--min-tile', '160'], dir);
  assert.equal(r.status, 0, r.stderr);
  const { sheets } = readResult(r.stdout).result;
  assert.ok(sheets.length > 1);
  for (const s of sheets) assert.ok(Math.max(s.tile_w, s.tile_h) >= 160 && Math.max(s.width, s.height) <= 1200);
  assert.equal(
    sheets.reduce((n, s) => n + s.tiles.length, 0),
    200,
  );
});
