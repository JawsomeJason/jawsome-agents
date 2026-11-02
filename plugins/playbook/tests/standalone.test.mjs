import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CLI, PSTACK, git, tempDir } from './helpers.mjs';

const SKILL = dirname(dirname(CLI));

/** A clean repo holding only a copy of the skill folder, as a skills CLI or rulesync lays it out, plus a pstack dir. */
function standalone(where = join('.agents', 'skills', 'playbook')) {
  const root = tempDir();
  const repo = join(root, 'repo');
  mkdirSync(repo);
  git(repo, ['init', '-q', '-b', 'main']);
  cpSync(SKILL, join(repo, where), { recursive: true });
  mkdirSync(join(repo, '.agents', 'playbooks'), { recursive: true });
  writeFileSync(join(repo, '.agents', 'playbooks', 'triage-repo.md'), '---\nextends: babysit\nwhen: Triage\n---\n\n- **In** "Work the merge frontier" Read the ruleset.\n');
  const home = join(root, 'home');
  mkdirSync(home);
  const script = join(repo, where, 'scripts', 'playbook.mjs');
  const run = (args, env = {}) => spawnSync(process.execPath, [script, ...args], { cwd: repo, encoding: 'utf8', env: { PATH: '/usr/bin:/bin', HOME: home, PLAYBOOKS_CONFIG: join(root, 'config'), PLAYBOOKS_PSTACK_DIR: PSTACK, ...env } });
  return { repo, root, home, script, run };
}

test('the skill folder alone runs show and check, with only Node and a pstack dir', () => {
  const w = standalone();
  const show = w.run(['show', 'babysit']);
  assert.equal(show.status, 0, show.stderr);
  assert.match(show.stdout, /Read the ruleset\.\s+\[babysit ~ triage-repo\]/);
  const check = w.run(['check']);
  assert.equal(check.status, 0, check.stdout + check.stderr);
  assert.match(check.stdout, /check passed: pstack 1\.0\.0/);
});

test('doctor passes a skill-only install, where no plugin exists, and notes the PATH link as information', () => {
  for (const where of [join('.agents', 'skills', 'playbook'), join('.rulesync', 'skills', '.curated', 'playbook')]) {
    const w = standalone(where);
    const r = w.run(['doctor', '--json']);
    const byId = Object.fromEntries(JSON.parse(r.stdout).findings.map((f) => [f.id, f]));
    assert.equal(byId.cli.status, 'info', where);
    assert.match(byId.cli.message, /agents run node/);
    assert.equal(r.status, 0, r.stdout);
  }
});

test('doctor accepts a link on PATH straight to the skill script', () => {
  const w = standalone();
  const bin = join(w.root, 'bin');
  mkdirSync(bin);
  chmodSync(w.script, 0o755);
  symlinkSync(w.script, join(bin, 'playbook'));
  const r = w.run(['doctor', '--json'], { PATH: `${bin}:/usr/bin:/bin` });
  const cli = JSON.parse(r.stdout).findings.find((f) => f.id === 'cli');
  assert.equal(cli.status, 'ok', cli.message);
});

test('the skill folder holds everything the script imports', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL(join('..', 'skills', 'playbook', 'scripts', 'playbook.mjs'), import.meta.url)), '--help'], { encoding: 'utf8' });
  assert.equal(r.status, 0);
});
