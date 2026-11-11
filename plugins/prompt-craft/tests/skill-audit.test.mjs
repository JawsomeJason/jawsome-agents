import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../skills/skill-audit/scripts/audit.mjs', import.meta.url));
const dirs = [];
const skill = (name, fm, body = '# Body\n\nLessons go in FINDINGS.\n') => {
  const root = mkdtempSync(join(tmpdir(), 'audit-'));
  dirs.push(root);
  mkdirSync(join(root, name));
  writeFileSync(join(root, name, 'SKILL.md'), `---\n${fm}\n---\n${body}`);
  return root;
};
const run = (root) => {
  const r = spawnSync('node', [script, root, '--json'], { encoding: 'utf8' });
  return { status: r.status, out: JSON.parse(r.stdout) };
};
process.once('exit', () => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

const good = `name: good\ndescription: ${'Does one thing well for the user. '.repeat(3)}Use when the user asks for it. Triggers include "do it" and "run it".`;

test('a well-formed skill has no findings', () => {
  const { status, out } = run(skill('good', good));
  assert.equal(status, 0);
  assert.deepEqual(out.skills[0].findings, []);
});

test('a short description with no triggers warns; a name mismatch fails', () => {
  const { status, out } = run(skill('bad', 'name: other\ndescription: Does stuff.'));
  const ids = out.skills[0].findings.map((f) => f.id);
  assert.equal(status, 1);
  for (const id of ['name', 'description-short', 'no-when', 'no-triggers']) assert.ok(ids.includes(id), id);
});

test('inline code without scripts/, a risky verb and no lessons loop each warn', () => {
  const body = '```sh\n' + 'echo x\n'.repeat(16) + '```\nThen deploy it.\n';
  const { out } = run(skill('good', good, body));
  const ids = out.skills[0].findings.map((f) => f.id);
  for (const id of ['no-scripts', 'risky-flag', 'no-lessons']) assert.ok(ids.includes(id), id);
});

test('a body over the line limit is flagged as a monolith', () => {
  const { out } = run(skill('good', good, 'lesson\n' + 'line\n'.repeat(520)));
  assert.ok(out.skills[0].findings.some((f) => f.id === 'monolith'));
});
