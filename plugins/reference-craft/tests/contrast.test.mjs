import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { validate } from '../../standards/tests/schema.mjs';
import { check, parseHex, ratio } from '../skills/reference-design-system/scripts/contrast.mjs';

const skill = new URL('../skills/reference-design-system/', import.meta.url);
const script = fileURLToPath(new URL('scripts/contrast.mjs', skill));
const schema = (name) => JSON.parse(readFileSync(new URL(`references/schemas/${name}.schema.json`, skill), 'utf8'));

const dir = mkdtempSync(join(tmpdir(), 'reference-craft-test-'));
process.once('exit', () => rmSync(dir, { recursive: true, force: true }));

const token = (name, value, extra = {}) => ({ name, value, usage: 'u', provenance: 'measured', confidence: 'measured', evidence: 'e', ...extra });
const base = () => ({
  name: 'Demo',
  themes: ['light', 'dark'],
  color: [
    token('surface', { light: '#f0f4f8', dark: '#16202a' }),
    token('ink', { light: '#343c4c', dark: '#eef3f7' }),
    token('brand', '#58d4f4'),
    token('on-brand', '#0f2a33', { provenance: 'original', departure: { reference: '#ffffff', reason: 'White on brand is about 1.7:1.' } }),
    token('scrim', '#0c162080', { confidence: 'estimate' }),
  ],
  contrast: [
    { fg: 'on-brand', bg: 'brand', min: 4.5 },
    { fg: 'ink', bg: 'surface', min: 4.5 },
  ],
});

function run(tokens, args = []) {
  const file = join(dir, `t${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(file, JSON.stringify(tokens));
  const out = join(dir, 'out', `${Math.random().toString(36).slice(2)}.json`);
  const r = spawnSync(process.execPath, [script, '--tokens', file, '--out', out, ...args], { encoding: 'utf8' });
  return { ...r, out };
}

test('--help prints usage and exits 0', () => {
  const r = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^usage: contrast\.mjs /);
  assert.equal(r.stderr, '');
});

test('ratios match WCAG reference values', () => {
  assert.equal(ratio(parseHex('#000'), parseHex('#fff')), 21);
  assert.equal(Math.floor(ratio(parseHex('#777777'), parseHex('#ffffff')) * 100) / 100, 4.47);
});

test('the example tokens file follows the tokens schema', () => {
  assert.deepEqual(validate(schema('tokens'), base()), []);
  assert.notDeepEqual(validate(schema('tokens'), { ...base(), color: [token('x', 'blue')] }), []);
});

test('a passing file exits 0 and writes a report that follows the schema, with the reference ratio beside each departure', () => {
  const r = run(base());
  assert.equal(r.status, 0, r.stderr);
  const report = JSON.parse(readFileSync(r.out, 'utf8'));
  assert.deepEqual(validate(schema('contrast'), report), []);
  assert.equal(report.checked, 4);
  const pair = report.pairs.find((p) => p.fg === 'on-brand' && p.theme === 'light');
  assert.equal(pair.reference_ratio, 1.73);
  assert.ok(pair.ratio >= 4.5);
  assert.equal(report.pairs.find((p) => p.fg === 'ink').reference_ratio, undefined);
  assert.deepEqual(report.departures.map((d) => [d.token, d.theme, d.reference]), [['on-brand', 'light', '#ffffff'], ['on-brand', 'dark', '#ffffff']]);
  assert.match(r.stdout, /departure light: on-brand #ffffff -> #0f2a33 \(on-brand on brand 1\.73 -> /);
});

test('a pair under its floor in one theme fails the run and names the theme', () => {
  const t = base();
  t.contrast.push({ fg: 'ink', bg: 'brand', min: 4.5 });
  const r = run(t);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^FAIL dark: ink on brand = \d/m);
  assert.doesNotMatch(r.stdout, /FAIL light: ink on brand/);
  assert.equal(JSON.parse(readFileSync(r.out, 'utf8')).failed, 1);
});

test('alpha is composited: a translucent background needs the surface beneath it', () => {
  const t = base();
  t.contrast.push({ fg: 'surface', bg: 'scrim', min: 1 });
  const r = run(t);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /scrim has alpha in light; name the surface beneath it with "over"/);
  t.contrast[2].over = 'surface';
  const report = check(t);
  const row = report.pairs.find((p) => p.bg === 'scrim' && p.theme === 'light');
  assert.equal(row.over, 'surface');
  assert.ok(row.ratio > 1 && row.ratio < 21);
});

test('bad input exits 2 with the reason', () => {
  for (const [mutate, message] of [
    [(t) => t.contrast.push({ fg: 'nope', bg: 'surface', min: 3 }), /unknown colour token nope/],
    [(t) => (t.color[0].value = { light: '#fff' }), /surface has no value for theme dark/],
    [(t) => (t.color[2].value = 'rgb(0 0 0)'), /is not a hex colour/],
    [(t) => t.color.push(token('ink', '#000')), /ink is declared twice/],
  ]) {
    const t = base();
    mutate(t);
    const r = run(t);
    assert.equal(r.status, 2, r.stdout);
    assert.match(r.stderr, message);
  }
});
