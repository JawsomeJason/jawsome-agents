import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { PLAYBOOK, PSTACK, git, world } from './helpers.mjs';

/**
 * A healthy playbook install in a fake home: playbook on PATH, the mode skill linked into the home .claude/skills, and
 * the web checkout recorded in config.json with its team playbooks committed. Tests remove one piece at a time.
 */
function doctorWorld(opts = {}) {
  const w = world(opts);
  const bin = join(w.root, 'bin');
  mkdirSync(bin);
  symlinkSync(PLAYBOOK, join(bin, 'playbook'));
  const settings = JSON.parse(readFileSync(join(w.config, 'config.json'), 'utf8'));
  writeFileSync(join(w.config, 'config.json'), JSON.stringify({ ...settings, pstack: '0.9.0', repos: { web: { checkout: w.repo } } }, null, 2));
  mkdirSync(join(w.config, 'mode', 'tester-mode'), { recursive: true });
  writeFileSync(join(w.config, 'mode', 'tester-mode', 'SKILL.md'), '---\nname: tester-mode\n---\n');
  mkdirSync(join(w.home, '.claude', 'skills'), { recursive: true });
  symlinkSync(join(w.config, 'mode', 'tester-mode'), join(w.home, '.claude', 'skills', 'tester-mode'));
  git(w.repo, ['add', '.agents']);
  git(w.repo, ['commit', '-q', '-m', 'team playbooks']);
  const doctor = (args = [], { cwd = w.outside, env = {} } = {}) => w.run(['doctor', ...args], { cwd, env: { PATH: `${bin}:/usr/bin:/bin`, ...env } });
  return { ...w, bin, doctor };
}

test('doctor passes a healthy install, and writes nothing', () => {
  const w = doctorWorld();
  const before = readFileSync(join(w.config, 'config.json'), 'utf8');
  const r = w.doctor();
  assert.equal(r.stderr, '');
  assert.equal(
    r.stdout,
    `✓ pstack-claude 1.0.0: ${PSTACK}
✓ playbook: ${w.bin}/playbook -> ${realpathSync(PLAYBOOK)}
✓ config ${w.config}: config.json parses, handle tester
✓ mode skill ${w.config}/mode/tester-mode is linked into ${w.home}/.claude/skills
✓ playbook check --repo web passed
doctor passed
`,
  );
  assert.equal(r.status, 0);
  assert.equal(readFileSync(join(w.config, 'config.json'), 'utf8'), before, 'check runs pinned, so it records no pstack version');
});

test('each failing check carries a short hint, and doctor exits 1', () => {
  const w = doctorWorld();
  unlinkSync(join(w.bin, 'playbook'));
  unlinkSync(join(w.home, '.claude', 'skills', 'tester-mode'));
  const r = w.doctor();
  assert.match(r.stdout, /^✗ playbook is not on PATH\n {4}link the plugin's bin\/playbook/m);
  assert.ok(r.stdout.includes(`✗ mode skill ${w.config}/mode/tester-mode is not linked into any skills folder\n    run the setup skill\n`), r.stdout);
  assert.match(r.stdout, /^doctor failed: 2 problems$/m);
  assert.equal(r.status, 1);
});

test('doctor says pstack is needed and how to get it, when it is missing', () => {
  const w = doctorWorld();
  const r = w.doctor([], { env: { PLAYBOOKS_PSTACK_DIR: '' } });
  assert.ok(r.stdout.includes('✗ pstack-claude not found\n'), r.stdout);
  assert.match(r.stdout, /pstack@pstack-claude/);
  assert.equal(r.status, 1);
});

test('doctor --json carries each finding with its status and details', () => {
  const w = doctorWorld();
  unlinkSync(join(w.bin, 'playbook'));
  const r = w.doctor(['--json']);
  const out = JSON.parse(r.stdout);
  assert.equal(r.status, 1);
  assert.equal(out.passed, false);
  assert.deepEqual(out.findings.map((f) => [f.id, f.status]), [['pstack', 'ok'], ['cli', 'fail'], ['config', 'ok'], ['mode', 'ok'], ['check:web', 'ok']]);
  assert.equal(out.findings[1].message, 'playbook is not on PATH');
  assert.equal(out.findings[1].details.length, 1);
});

test('a playbook on PATH that is not ours fails', () => {
  const w = doctorWorld();
  unlinkSync(join(w.bin, 'playbook'));
  writeFileSync(join(w.bin, 'playbook'), '#!/bin/sh\n');
  chmodSync(join(w.bin, 'playbook'), 0o755);
  const cli = JSON.parse(w.doctor(['--json']).stdout).findings.find((f) => f.id === 'cli');
  assert.equal(cli.status, 'fail');
  assert.equal(cli.message, `playbook on PATH is ${w.bin}/playbook, which is not this tool`);
});

test('no config is information, and doctor still runs check', () => {
  const w = doctorWorld();
  rmSync(w.config, { recursive: true });
  const r = w.doctor();
  assert.ok(r.stdout.includes(`- no config at ${w.config}, so no personal playbooks\n    run the setup skill\n`), r.stdout);
  assert.ok(r.stdout.includes('✓ playbook check passed\n'), r.stdout);
  assert.equal(r.status, 0);
});

test('a config with no handle, or that does not parse, fails', () => {
  const w = doctorWorld();
  writeFileSync(join(w.config, 'config.json'), '{}');
  assert.ok(w.doctor().stdout.includes(`✗ ${join(w.config, 'config.json')} has no handle\n`));
  writeFileSync(join(w.config, 'config.json'), '{');
  const r = w.doctor();
  assert.match(r.stdout, /^✗ .*config\.json: /m);
  assert.equal(r.status, 1);
});

test('a repo with no recorded checkout uses the current checkout', () => {
  const w = doctorWorld();
  const settings = JSON.parse(readFileSync(join(w.config, 'config.json'), 'utf8'));
  writeFileSync(join(w.config, 'config.json'), JSON.stringify({ ...settings, repos: { web: {} } }));
  git(w.repo, ['rm', '-r', '-q', '--cached', '.agents']);
  assert.doesNotMatch(w.doctor().stdout, /git does not track/);
  assert.match(w.doctor([], { cwd: w.repo }).stdout, /git does not track/);
});

test('team playbooks that git does not track are a note, not a failure', () => {
  const w = doctorWorld();
  git(w.repo, ['rm', '-r', '-q', '--cached', '.agents']);
  const r = w.doctor();
  assert.ok(r.stdout.includes(`- ${w.repo}/.agents/playbooks: git does not track these team playbooks, so teammates do not see them\n`), r.stdout);
  assert.equal(r.status, 0);
});

test('a failing playbook check shows its lines', () => {
  const w = doctorWorld({ files: { 'playbooks/broken.md': '---\nextends: babysit\n---\n\n- **In** "no such words" more.\n' } });
  const r = w.doctor();
  assert.ok(
    r.stdout.includes(`✗ playbook check --repo web failed
    ${w.config}/playbooks/broken.md:1: missing when:
    ${w.config}/playbooks/broken.md:5: quote not found: "no such words"
`),
    r.stdout,
  );
  assert.equal(r.status, 1);
});

test('doctor rejects --fix, which is gone, and the playbook flags', () => {
  const w = doctorWorld();
  for (const args of [['--fix'], ['--repo', 'web'], ['--pstack', '1.0.0']]) assert.equal(w.doctor(args).status, 2, args.join(' '));
  assert.equal(w.run(['check', '--fix']).status, 2);
});
