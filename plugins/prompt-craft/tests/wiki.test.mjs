import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../skills/wiki/scripts/wiki.mjs', import.meta.url));
const dirs = [];
process.once('exit', () => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

function vault(files) {
  const root = mkdtempSync(join(tmpdir(), 'wiki-'));
  dirs.push(root);
  writeFileSync(join(root, '.wiki.json'), JSON.stringify({ raw: 'Raw Stuff', wiki: 'Machine/Wiki' }));
  for (const [p, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), text);
  }
  return root;
}
const run = (cmd, root) => spawnSync('node', [script, cmd, root, '--json'], { encoding: 'utf8' });
const page = (type, body, extra = '') => `---\ntype: ${type}\nsummary: About it.\n${extra}---\n${body}\n`;

test('lint finds broken links, orphans, one-way links, unsummarized sources and concept candidates', () => {
  const root = vault({
    'Raw Stuff/Talk A.md': 'raw text',
    'Raw Stuff/Talk B.md': 'raw text',
    'Machine/Wiki/Talk A (summary).md': page('source', 'Cites [[Verifier]] and [[Missing Page]] and [[Gap]].', 'sources: ["[[Talk A]]"]\n'),
    'Machine/Wiki/Verifier.md': page('concept', 'Plain text, no links back.'),
    'Machine/Wiki/Lonely.md': page('concept', 'Mentions [[Gap]] too.'),
  });
  const r = run('lint', root);
  const out = JSON.parse(r.stdout);
  assert.equal(r.status, 1);
  assert.deepEqual(out.broken.map((b) => b.link).sort(), ['Gap', 'Gap', 'Missing Page']);
  assert.deepEqual(out.orphans.sort(), ['Machine/Wiki/Lonely.md', 'Machine/Wiki/Talk A (summary).md']);
  assert.deepEqual(out.oneWay, [{ from: 'Machine/Wiki/Talk A (summary).md', to: 'Machine/Wiki/Verifier.md' }]);
  assert.deepEqual(out.unsummarized, ['Raw Stuff/Talk B.md']);
  assert.deepEqual(out.candidates, [{ name: 'Gap', pages: 2 }]);
});

test('a page older than its source is stale', () => {
  const root = vault({
    'Raw Stuff/Talk A.md': 'raw text',
    'Machine/Wiki/Talk A (summary).md': page('source', 'Body.', 'sources: ["[[Talk A]]"]\n'),
  });
  const old = new Date(Date.now() - 86400e3);
  utimesSync(join(root, 'Machine/Wiki/Talk A (summary).md'), old, old);
  const out = JSON.parse(run('lint', root).stdout);
  assert.deepEqual(out.stale, [{ page: 'Machine/Wiki/Talk A (summary).md', source: 'Raw Stuff/Talk A.md' }]);
});

test('a clean wiki exits 0', () => {
  const root = vault({
    'Machine/Wiki/A.md': page('concept', 'See [[B|bee]].'),
    'Machine/Wiki/B.md': page('concept', 'See [[A#Part]].'),
  });
  const r = run('lint', root);
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).orphans.length, 0);
});

test('index lists pages by type with summaries and skips itself', () => {
  const root = vault({
    'Machine/Wiki/A.md': page('concept', 'x'),
    'Machine/Wiki/B.md': page('source', 'x'),
  });
  run('index', root);
  const again = run('index', root);
  assert.equal(JSON.parse(again.stdout).pages, 2);
  const index = readFileSync(join(root, 'Machine/Wiki/index.md'), 'utf8');
  assert.match(index, /## concept\n\n- \[\[A\]\]: About it\./);
  assert.match(index, /## source\n\n- \[\[B\]\]: About it\./);
});

test('a missing config is a usage error', () => {
  const root = mkdtempSync(join(tmpdir(), 'wiki-'));
  dirs.push(root);
  assert.equal(run('lint', root).status, 2);
});
