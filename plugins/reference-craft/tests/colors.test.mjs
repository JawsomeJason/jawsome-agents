import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ciede2000, loadTokens, rgbToLab } from '../skills/reference-measure/scripts/colors.mjs';
import { loadSchema, readResult, run, tempDir, validate, writePng } from './helpers.mjs';

const schema = loadSchema('colors');

test('CIEDE2000 matches the published reference pairs', () => {
  assert.ok(Math.abs(ciede2000([50, 2.6772, -79.7751], [50, 0, -82.7485]) - 2.0425) < 1e-3);
  assert.ok(Math.abs(ciede2000([50, 2.5, 0], [50, 0, -2.5]) - 4.3065) < 1e-3);
  assert.ok(Math.abs(ciede2000([60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387]) - 1.2644) < 1e-3);
  assert.ok(Math.abs(rgbToLab([255, 255, 255])[0] - 100) < 1e-3);
});

test('tokens load from flat maps, arrays, nested groups and theme objects', () => {
  const names = (data, theme) => loadTokens(data, theme).map((t) => `${t.name}=${t.hex}`);
  assert.deepEqual(names({ ground: '#E4EAF4', shadow: 'rgba(0,0,0,0.2)', font: 'Inter' }), ['ground=#e4eaf4', 'shadow=#000000']);
  assert.deepEqual(names([{ name: 'a', value: '#fff' }]), ['a=#ffffff']);
  assert.deepEqual(names({ color: { brand: { $value: '#ff0000' }, $type: 'color' } }), ['color.brand=#ff0000']);
  assert.deepEqual(names({ surface: { value: { light: '#ffffff', dark: '#101010' } } }, 'dark'), ['surface=#101010']);
});

test('box medians ignore stray pixels and match the nearest token', () => {
  const dir = tempDir();
  const png = join(dir, 'shot.png');
  // Top half #e4eaf4 with one black speck, bottom half pure red, a hard edge at y=50.
  writePng(png, 40, 100, (x, y) => (x === 10 && y === 20 ? [0, 0, 0] : y < 50 ? [228, 234, 244] : [255, 0, 0]));
  const tokens = join(dir, 'tokens.json');
  writeFileSync(tokens, JSON.stringify({ ground: '#e4eaf4', accent: '#f01010', ink: '#111111' }));
  const r = run('colors.mjs', ['--tokens', tokens, '--image', png, '--box', 'bg:0.1,0.1,0.5,0.3', '--box', 'cta:0.1,0.6,0.8,0.3', '--box', 'edge:0,0.4,1,0.2'], dir);
  assert.equal(r.status, 0, r.stderr);
  const out = readResult(r.stdout);
  assert.deepEqual(validate(schema, out), []);
  const [bg, cta, edge] = out.result.colors;
  assert.equal(bg.hex, '#e4eaf4');
  assert.equal(bg.token, 'ground');
  assert.equal(bg.verdict, 'exact');
  assert.equal(cta.token, 'accent');
  assert.ok(cta.delta_e > 1 && cta.delta_e < 6, String(cta.delta_e));
  assert.equal(cta.runner_up.token, 'ground');
  assert.match(edge.warnings.join(' '), /edge, text or gradient/);
  assert.equal(bg.tag, 'measured');
});

test('samples from another tool go through the same matching', () => {
  const dir = tempDir();
  const samples = join(dir, 'samples.json');
  writeFileSync(samples, JSON.stringify([{ name: 'a', hex: '#e5ebf5' }, { name: 'b', pixels: [[10, 10, 10], [12, 12, 12], [250, 250, 250]] }, { name: 'c', rgb: [0, 200, 0] }]));
  const tokens = join(dir, 'tokens.json');
  writeFileSync(tokens, JSON.stringify({ ground: '#e4eaf4', ink: '#0c0c0c' }));
  const r = run('colors.mjs', ['--tokens', tokens, '--samples', samples], dir);
  assert.equal(r.status, 0, r.stderr);
  const out = readResult(r.stdout);
  assert.deepEqual(validate(schema, out), []);
  const [a, b, c] = out.result.colors;
  assert.equal(a.verdict, 'exact');
  assert.equal(b.hex, '#0c0c0c');
  assert.equal(c.verdict, 'none');
});

test('a file that is not a PNG fails with exit 2 and a fallback', () => {
  const dir = tempDir();
  const bad = join(dir, 'frame.png');
  writeFileSync(bad, 'not an image');
  const tokens = join(dir, 'tokens.json');
  writeFileSync(tokens, '{}');
  const r = run('colors.mjs', ['--tokens', tokens, '--image', bad, '--grid', '2x2'], dir);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--samples/);
});
