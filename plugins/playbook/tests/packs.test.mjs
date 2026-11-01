import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { CLI, git, PSTACK, tempDir, world } from './helpers.mjs';

const WHEN = 'when: Any request\n';
const patch = (parent, line) => `---\nextends: ${parent}\n${WHEN}---\n\n${line}\n`;
const IN_BABYSIT = patch('babysit', '- **In** "Work the merge frontier" Read the ruleset.');
const standaloneBody = (text) => `---\nextends:\n${WHEN}---\n\n1. ${text}\n`;
const sha = (text) => `sha256:${createHash('sha256').update(text).digest('hex')}`;

/** A pstack whose checker refuses what the released one refuses: a parent it does not bundle, and a quote outside its bundled parents. */
function plainPstack() {
  const dir = join(tempDir(), 'pstack');
  cpSync(PSTACK, dir, { recursive: true });
  writeFileSync(join(dir, 'skills/poteto-mode/scripts/check-playbooks.mjs'), `#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const BUNDLED = join(dirname(fileURLToPath(import.meta.url)), '../playbooks');
const root = process.argv[2];
const problems = [];
for (const name of readdirSync(join(root, '.agents/playbooks')).filter((f) => f.endsWith('.md'))) {
  const text = readFileSync(join(root, '.agents/playbooks', name), 'utf8');
  const bases = (/^extends:[ \\t]*(.*)$/m.exec(text)?.[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const known = bases.filter((b) => existsSync(join(BUNDLED, b + '.md')));
  for (const b of bases.filter((x) => !known.includes(x))) problems.push('.agents/playbooks/' + name + ': extends ' + b + ', which this pstack has no playbook for');
  for (const m of text.matchAll(/\\*\\*(?:After|Before|Replace|In)\\*\\*\\s+"([^"]+)"/g)) {
    if (!known.some((b) => readFileSync(join(BUNDLED, b + '.md'), 'utf8').includes(m[1]))) problems.push('.agents/playbooks/' + name + ': "' + m[1] + '" is not in any playbook it extends');
  }
}
if (problems.length) { console.error(problems.join('\\n')); process.exitCode = 1; } else console.log('Every project playbook matches.');
`);
  return dir;
}

/** A git repo of packs, as { pack: { requires, playbooks: { stem: text }, skills, rules } }. */
function source(packs, dir = join(tempDir(), 'source')) {
  mkdirSync(dir, { recursive: true });
  git(dir, ['init', '-q', '-b', 'main']);
  writePacks(dir, packs);
  return dir;
}

function writePacks(dir, packs) {
  rmSync(join(dir, 'packs'), { recursive: true, force: true });
  for (const [name, pack] of Object.entries(packs)) {
    const root = join(dir, 'packs', name);
    mkdirSync(join(root, 'playbooks'), { recursive: true });
    writeFileSync(join(root, 'pack.json'), JSON.stringify({ name, description: `${name} pack`, requires: pack.requires ?? [] }));
    for (const [stem, text] of Object.entries(pack.playbooks ?? {})) writeFileSync(join(root, 'playbooks', `${stem}.md`), text);
    if (pack.skills) {
      mkdirSync(join(root, 'skills', 'a-skill'), { recursive: true });
      writeFileSync(join(root, 'skills', 'a-skill', 'SKILL.md'), '---\nname: a-skill\ndescription: x\n---\n');
    }
    if (pack.rules) {
      mkdirSync(join(root, 'rules'), { recursive: true });
      writeFileSync(join(root, 'rules', 'a-rule.md'), '# rule\n');
    }
  }
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '--allow-empty', '-m', 'packs']);
}

/** A consumer checkout with no team files, a source of packs, and a run bound to both. */
function consumer(packs, opts = {}) {
  const w = world({ team: { 'babysitting-an-acme-pr.md': null, 'releasing-web.md': null }, ...opts });
  rmSync(join(w.repo, '.agents'), { recursive: true, force: true });
  // These extend the team files gone from this checkout, which no other context defines.
  for (const path of ['babysitting-an-acme-pr-tester.md', 'releasing-web-tester.md', 'repos/web/babysitting-an-acme-pr-web.md']) rmSync(join(w.config, 'playbooks', path));
  git(w.repo, ['add', '-A']);
  const from = source(packs);
  const dir = join(w.repo, '.agents', 'playbooks');
  const lockPath = join(w.repo, '.agents', 'playbooks.lock');
  return { ...w, from, dir, lockPath, lock: () => JSON.parse(readFileSync(lockPath, 'utf8')), manifest: () => JSON.parse(readFileSync(join(w.repo, '.agents', 'packs.json'), 'utf8')) };
}

const snapshot = (dir) => {
  const out = {};
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === '.git') continue;
      if (e.isDirectory()) walk(join(d, e.name));
      else out[join(d, e.name)] = readFileSync(join(d, e.name), 'utf8');
    }
  };
  walk(dir);
  return out;
};

test('install copies byte-identical files, writes the manifest and the lock, and a rerun changes nothing', () => {
  const text = '﻿---\r\nextends: babysit\r\nwhen: Crlf\r\n---\r\n\r\n- **In** "Work the merge frontier" Read it.\r\n';
  const w = consumer({ roobet: { playbooks: { 'x-acme': text } } });
  const r = w.run(['install', 'roobet', '--from', w.from]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(readFileSync(join(w.dir, 'x-acme.md'), 'utf8'), text);
  const commit = git(w.from, ['rev-parse', 'HEAD']).trim();
  assert.deepEqual(w.lock().files, { 'x-acme.md': { pack: 'roobet', hash: sha(text) } });
  assert.equal(w.lock().packs.roobet.commit, commit);
  assert.equal(w.manifest().packs[0].name, 'roobet');
  const before = snapshot(join(w.repo, '.agents'));
  assert.equal(w.run(['install', 'roobet', '--from', w.from]).status, 0);
  assert.deepEqual(snapshot(join(w.repo, '.agents')), before);
  assert.equal(w.run(['check']).status, 0);
  const again = w.run(['install', 'roobet']);
  assert.equal(again.status, 0, 'the manifest names the source once it is installed');
  assert.deepEqual(snapshot(join(w.repo, '.agents')), before);
});

test('install resolves requires from the same source, and a missing or cyclic one fails naming the pack file', () => {
  const w = consumer({ roobet: { playbooks: { 'a-acme': IN_BABYSIT } }, 'ui-team': { requires: ['roobet'], playbooks: { 'b-acme': patch('feature', '- A note.') } }, orphan: { requires: ['nowhere'] }, c1: { requires: ['c2'] }, c2: { requires: ['c1'] } });
  const r = w.run(['install', 'ui-team', '--from', w.from]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(Object.keys(w.lock().packs).sort(), ['roobet', 'ui-team']);
  assert.deepEqual(w.manifest().packs.map((p) => p.name).sort(), ['roobet', 'ui-team']);
  const missing = w.run(['install', 'orphan', '--from', w.from]);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /packs\/orphan\/pack\.json.*nowhere/);
  const cycle = w.run(['install', 'c1', '--from', w.from]);
  assert.equal(cycle.status, 1);
  assert.match(cycle.stderr, /packs\/c\d\/pack\.json.*cycle.*c1 -> c2 -> c1|packs\/c\d\/pack\.json.*cycle.*c2 -> c1 -> c2/);
  const absent = w.run(['install', 'ghost', '--from', w.from]);
  assert.equal(absent.status, 1);
  assert.match(absent.stderr, /packs\/ghost\/pack\.json/);
});

test('install with no known source says to pass --from, and a bad pack name is refused before any path is built', () => {
  const w = consumer({});
  assert.match(w.run(['install', 'roobet']).stderr, /--from/);
  assert.equal(w.run(['install', '../evil', '--from', w.from]).status, 2);
});

test('two packs shipping one stem fail naming both, and nothing is written', () => {
  const w = consumer({ a: { playbooks: { 'same-acme': IN_BABYSIT } }, b: { playbooks: { 'same-acme': IN_BABYSIT } } });
  const both = w.run(['install', 'a', 'b', '--from', w.from]);
  assert.equal(both.status, 1);
  assert.match(both.stderr, /same-acme\.md/);
  assert.match(both.stderr, /packs\/a\/.*\bb\b|packs\/b\/.*\ba\b/);
  assert.equal(existsSync(join(w.dir, 'same-acme.md')), false);
  assert.equal(w.run(['install', 'a', '--from', w.from]).status, 0);
  const later = w.run(['install', 'b', '--from', w.from]);
  assert.equal(later.status, 1);
  assert.match(later.stderr, /packs\/b\/playbooks\/same-acme\.md.*\ba\b/);
  assert.deepEqual(Object.keys(w.lock().packs), ['a']);
});

test('install fails naming the file for a bundled stem, an extends cycle, a stale quote and two files replacing the same words, and rolls back', () => {
  const REPLACE = (stem) => patch('babysit', `- **Replace** "Work the merge frontier" ${stem} rule.`);
  const cases = [
    [{ playbooks: { babysit: IN_BABYSIT } }, /babysit\.md.*bundled/],
    [{ playbooks: { 'p-acme': patch('q-acme', '- A note.'), 'q-acme': patch('p-acme', '- A note.') } }, /[pq]-acme\.md.*cycle/],
    [{ playbooks: { 'stale-acme': patch('babysit', '- **In** "Words pstack never wrote" Be brief.') } }, /stale-acme\.md.*Words pstack never wrote/],
    [{ playbooks: { 'r1-acme': REPLACE('one'), 'r2-acme': REPLACE('two') } }, /r[12]-acme\.md.*replaces words/],
  ];
  for (const [pack, message] of cases) {
    const w = consumer({ bad: pack });
    const before = snapshot(w.repo);
    const r = w.run(['install', 'bad', '--from', w.from]);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stderr, message);
    assert.deepEqual(snapshot(w.repo), before);
  }
});

test('a repo-owned file is left alone: an equal one is adopted, a different one refuses the install', () => {
  const w = consumer({ a: { playbooks: { 'mine-acme': IN_BABYSIT } } });
  mkdirSync(w.dir, { recursive: true });
  writeFileSync(join(w.dir, 'mine-acme.md'), `${IN_BABYSIT}\n`);
  const r = w.run(['install', 'a', '--from', w.from]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /\.agents\/playbooks\/mine-acme\.md/);
  writeFileSync(join(w.dir, 'mine-acme.md'), IN_BABYSIT);
  assert.equal(w.run(['install', 'a', '--from', w.from]).status, 0);
  writeFileSync(join(w.dir, 'own-web.md'), IN_BABYSIT.replace('Read the ruleset', 'Mine'));
  assert.equal(w.run(['check']).status, 0);
  assert.equal(w.run(['update']).status, 0);
  assert.equal(existsSync(join(w.dir, 'own-web.md')), true);
  assert.equal(w.lock().files['own-web.md'], undefined);
});

test('update re-fetches, deletes what the pack no longer ships, and refuses to overwrite a hand edit', () => {
  const w = consumer({ a: { playbooks: { 'one-acme': IN_BABYSIT, 'two-acme': patch('feature', '- A note.') } } });
  assert.equal(w.run(['install', 'a', '--from', w.from]).status, 0);
  const next = patch('babysit', '- **In** "Work the merge frontier" Updated.');
  writePacks(w.from, { a: { playbooks: { 'one-acme': next } } });
  const edited = join(w.dir, 'two-acme.md');
  const original = readFileSync(edited, 'utf8');
  writeFileSync(edited, `${original}- Hand edit.\n`);
  const refused = w.run(['update', 'a']);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /two-acme\.md.*hand/);
  writeFileSync(edited, original);
  const r = w.run(['update', 'a']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(readFileSync(join(w.dir, 'one-acme.md'), 'utf8'), next);
  assert.equal(existsSync(edited), false);
  assert.deepEqual(Object.keys(w.lock().files), ['one-acme.md']);
  assert.equal(w.lock().packs.a.commit, git(w.from, ['rev-parse', 'HEAD']).trim());
  assert.equal(w.run(['update', 'never-installed']).status, 2);
});

test('update names a pack its source dropped', () => {
  const w = consumer({ a: { playbooks: { 'one-acme': IN_BABYSIT } } });
  assert.equal(w.run(['install', 'a', '--from', w.from]).status, 0);
  writePacks(w.from, {});
  const r = w.run(['update']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /packs\/a\/pack\.json/);
});

test('an install rerun converges after a crash that wrote the new files but not the lock', () => {
  const w = consumer({ a: { playbooks: { 'one-acme': IN_BABYSIT } } });
  assert.equal(w.run(['install', 'a', '--from', w.from]).status, 0);
  const next = patch('babysit', '- **In** "Work the merge frontier" Updated.');
  writePacks(w.from, { a: { playbooks: { 'one-acme': next } } });
  writeFileSync(join(w.dir, 'one-acme.md'), next);
  assert.equal(w.run(['update', 'a']).status, 0);
  assert.equal(w.run(['check', '--locked']).status, 0);
});

test('remove leaves zero stale files, and refuses while another pack requires it or a file extends it', () => {
  const w = consumer({ base: { playbooks: { 'base-acme': IN_BABYSIT } }, top: { requires: ['base'], playbooks: { 'top-acme': patch('feature', '- A note.') } } });
  assert.equal(w.run(['install', 'top', '--from', w.from]).status, 0);
  const refused = w.run(['remove', 'base']);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /top requires base/);
  assert.equal(existsSync(join(w.dir, 'base-acme.md')), true);
  assert.equal(w.run(['remove', 'top']).status, 0);
  writeFileSync(join(w.dir, 'child-web.md'), patch('base-acme', '- **In** "Read the ruleset" More.'));
  const extended = w.run(['remove', 'base']);
  assert.equal(extended.status, 1);
  assert.match(extended.stderr, /child-web\.md.*base-acme/);
  rmSync(join(w.dir, 'child-web.md'));
  assert.equal(w.run(['remove', 'base']).status, 0);
  assert.deepEqual(snapshot(join(w.repo, '.agents')), {});
  assert.equal(existsSync(join(w.repo, '.agents')), false);
  assert.equal(w.run(['remove', 'base']).status, 2);
});

test('check names a hand-edited, a missing and an unlocked pack file, and check --locked needs no pstack and no source', () => {
  const w = consumer({ a: { playbooks: { 'one-acme': IN_BABYSIT, 'two-acme': patch('feature', '- A note.') } } });
  assert.equal(w.run(['install', 'a', '--from', w.from]).status, 0);
  rmSync(w.from, { recursive: true });
  const bare = { PLAYBOOKS_PSTACK_DIR: join(w.root, 'nowhere'), PATH: `${dirname(process.execPath)}:/usr/bin:/bin` };
  const clean = w.run(['check', '--locked'], { env: bare });
  assert.equal(clean.status, 0, clean.stdout + clean.stderr);
  assert.match(clean.stdout, /2 files/);
  writeFileSync(join(w.dir, 'one-acme.md'), `${IN_BABYSIT}- Hand edit.\n`);
  rmSync(join(w.dir, 'two-acme.md'));
  const r = w.run(['check']);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /\.agents\/playbooks\/one-acme\.md:1: .*hand-edited/);
  assert.match(r.stdout, /\.agents\/playbooks\/two-acme\.md:1: .*missing/);
  const locked = w.run(['check', '--locked', '--json'], { env: bare });
  assert.equal(locked.status, 1);
  assert.deepEqual(JSON.parse(locked.stdout).problems.map((p) => p.path).sort(), ['.agents/playbooks/one-acme.md', '.agents/playbooks/two-acme.md']);
});

test('check --locked passes where no lock exists, and refuses flags that need a context', () => {
  const dir = tempDir();
  git(dir, ['init', '-q', '-b', 'main']);
  const r = spawnSync(process.execPath, [CLI, 'check', '--locked'], { cwd: dir, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: dir } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /no .*playbooks\.lock/);
  const w = world();
  assert.equal(w.run(['check', '--locked', '--every-repo']).status, 2);
  assert.equal(w.run(['show', 'babysit', '--locked']).status, 2);
});

test('check verifies a lock in the flat shape from before packs, says it is the old shape, and install rewrites it', () => {
  const w = consumer({ a: { playbooks: { 'one-acme': IN_BABYSIT } } });
  mkdirSync(w.dir, { recursive: true });
  writeFileSync(join(w.dir, 'one-acme.md'), IN_BABYSIT);
  writeFileSync(join(w.dir, 'kept-web.md'), patch('feature', '- A note.'));
  const flat = { source: 'acme-eng/agents', commit: '0'.repeat(40), files: { 'one-acme.md': sha(IN_BABYSIT), 'kept-web.md': sha(patch('feature', '- A note.')) } };
  writeFileSync(w.lockPath, JSON.stringify(flat));
  const ok = w.run(['check']);
  assert.equal(ok.status, 0, ok.stdout);
  assert.match(ok.stdout, /info: \.agents\/playbooks\.lock:1: .*playbook install/);
  writeFileSync(join(w.dir, 'kept-web.md'), 'tampered\n');
  assert.match(w.run(['check', '--locked']).stdout, /kept-web\.md:1: .*hand-edited/);
  writeFileSync(join(w.dir, 'kept-web.md'), patch('feature', '- A note.'));
  assert.equal(w.run(['install', 'a', '--from', w.from]).status, 0);
  assert.deepEqual(Object.keys(w.lock().files), ['one-acme.md']);
  assert.equal(existsSync(join(w.dir, 'kept-web.md')), true);
});

test('a malformed lock or manifest is a named problem', () => {
  const w = consumer({ a: { playbooks: { 'one-acme': IN_BABYSIT } } });
  assert.equal(w.run(['install', 'a', '--from', w.from]).status, 0);
  writeFileSync(w.lockPath, '{nope');
  const r = w.run(['check', '--locked']);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /\.agents\/playbooks\.lock:1: /);
});

test('a pack may chain: a team file extends a team file, replaces its words, and check says plain pstack refuses it', () => {
  const w = consumer({
    'roobet-one': { playbooks: { 'one-acme': patch('babysit', '- **After** "Work the merge frontier" Serve foo bar daily.') } },
    'roobet-two': { requires: ['roobet-one'], playbooks: { 'two-acme': patch('one-acme', '- **Replace** "foo bar" free beer') } },
  });
  const r = w.run(['install', 'roobet-two', '--from', w.from]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const shown = w.run(['show', 'two-acme']);
  assert.equal(shown.status, 0, shown.stdout);
  assert.match(shown.stdout, /~~foo bar~~ free beer/);
  const check = w.run(['check'], { env: { PLAYBOOKS_PSTACK_DIR: plainPstack() } });
  assert.equal(check.status, 0, check.stdout);
  assert.match(check.stdout, /info: \.agents\/playbooks\/two-acme\.md:\d+: .*plain pstack refuses/);
  assert.doesNotMatch(check.stdout, /info: \.agents\/playbooks\/one-acme\.md:\d+: .*plain pstack/);
});

test('a chained file gets playbook\'s own anchor check, a chain-free one keeps pstack\'s, and a pstack that accepts chains draws no info line', () => {
  const stale = consumer({ a: { playbooks: { 'one-acme': patch('babysit', '- **After** "Work the merge frontier" Serve foo bar.') } } });
  assert.equal(stale.run(['install', 'a', '--from', stale.from]).status, 0);
  writeFileSync(join(stale.dir, 'two-web.md'), patch('one-acme', '- **Replace** "not in the parent" x'));
  const r = stale.run(['check']);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /two-web\.md:\d+: quote not found: "not in the parent"/);
  rmSync(join(stale.dir, 'two-web.md'));
  writeFileSync(join(stale.dir, 'free-web.md'), patch('babysit', '- **In** "not in pstack" x'));
  const free = stale.run(['check', '--json'], { env: { PLAYBOOKS_PSTACK_DIR: plainPstack() } });
  assert.equal(JSON.parse(free.stdout).pstackCheck.status, 'failed');
  rmSync(join(stale.dir, 'free-web.md'));
  writeFileSync(join(stale.dir, 'two-web.md'), patch('one-acme', '- **Replace** "foo bar" x'));
  const patched = join(tempDir(), 'pstack');
  cpSync(PSTACK, patched, { recursive: true });
  writeFileSync(join(patched, 'skills/poteto-mode/scripts/check-playbooks.mjs'), 'console.log("Every project playbook matches.");\n');
  const accepts = stale.run(['check'], { env: { PLAYBOOKS_PSTACK_DIR: patched } });
  assert.equal(accepts.status, 0, accepts.stdout);
  assert.doesNotMatch(accepts.stdout, /plain pstack refuses/);
});

test('a team file may not extend or quote a user file, because teammates do not have it', () => {
  const w = world({ team: { 'uses-user-acme.md': patch('babysit-tester', '- A note.') } });
  const r = w.run(['check']);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /uses-user-acme\.md:\d+: team files extend bundled or team playbooks/);
});

test('a pack may ship a standalone root that another pack chains on', () => {
  const w = consumer({ root: { playbooks: { 'sorting-pack': standaloneBody('Sort the queue.') } }, more: { requires: ['root'], playbooks: { 'sorting-more-pack': patch('sorting-pack', '- **In** "Sort the queue" By age.') } } });
  const installed = w.run(['install', 'more', '--from', w.from]);
  assert.equal(installed.status, 0, installed.stdout + installed.stderr);
  const r = w.run(['show', 'sorting-pack']);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /Sort the queue\. By age\./);
});

test('--user installs into the config dir, active everywhere, with its lock there, and a user file may extend it', () => {
  const w = consumer({ mine: { playbooks: { 'user-pack': patch('babysit', '- **After** "Work the merge frontier" Say foo bar.') } } });
  const r = w.run(['install', 'mine', '--from', w.from, '--user'], { cwd: w.outside });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(existsSync(join(w.config, 'playbooks', 'packs', 'mine', 'user-pack.md')), true);
  assert.equal(JSON.parse(readFileSync(join(w.config, 'playbooks.lock'), 'utf8')).files['user-pack.md'].pack, 'mine');
  assert.equal(existsSync(join(w.repo, '.agents', 'packs.json')), false);
  writeFileSync(join(w.config, 'playbooks', 'over-pack.md'), patch('user-pack', '- **Replace** "foo bar" free beer'));
  for (const cwd of [w.repo, w.outside]) {
    const shown = w.run(['show', 'babysit'], { cwd });
    assert.match(shown.stdout, /~~foo bar~~ free beer/, cwd);
  }
  assert.equal(w.run(['check']).status, 0);
  const packFile = join(w.config, 'playbooks', 'packs', 'mine', 'user-pack.md');
  const text = readFileSync(packFile, 'utf8');
  writeFileSync(packFile, `${text}- Hand edit.\n`);
  assert.match(w.run(['check']).stdout, /user-pack\.md:1: .*hand-edited/);
  writeFileSync(packFile, text);
  rmSync(join(w.config, 'playbooks', 'over-pack.md'));
  assert.equal(w.run(['remove', 'mine', '--user']).status, 0);
  assert.equal(existsSync(join(w.config, 'playbooks', 'packs')), false);
  assert.equal(existsSync(join(w.config, 'playbooks.lock')), false);
});

test('a linked worktree installs into itself, not its main checkout', () => {
  const w = consumer({ a: { playbooks: { 'one-acme': IN_BABYSIT } } });
  git(w.repo, ['add', '-A']);
  git(w.repo, ['commit', '-q', '--allow-empty', '-m', 'x']);
  const tree = join(w.root, 'tree');
  git(w.repo, ['worktree', 'add', '-q', '-b', 'side', tree]);
  const r = w.run(['install', 'a', '--from', w.from], { cwd: tree });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(existsSync(join(tree, '.agents', 'playbooks', 'one-acme.md')), true);
  assert.equal(existsSync(join(w.dir, 'one-acme.md')), false);
  assert.equal(w.run(['check', '--locked'], { cwd: tree }).status, 0);
});

const RULESYNC = `// Generated copies.
{
  "targets": ["claudecode"], // the harnesses
  // The curated skills.
  "sources": [
    {
      "source": "remix-run/agent-skills",
      "skills": ["x"],
    },
    // keep this comment
  ],
}
`;
const stripJsonc = (text) => JSON.parse(text.replace(/^\s*\/\/.*$/gm, '').replace(/\/\/ the harnesses/, '').replace(/,(\s*[}\]])/g, '$1'));

/** A consumer whose packs come from a forge-shaped slug, served by a local bare repo. */
function forgeConsumer(packs, files = {}) {
  const w = consumer({});
  const base = tempDir();
  const bare = join(base, 'acme-eng', 'agents');
  mkdirSync(dirname(bare), { recursive: true });
  source(packs, bare);
  for (const [name, text] of Object.entries(files)) writeFileSync(join(w.repo, name), text);
  const env = { PLAYBOOKS_GIT_BASE: base };
  return { ...w, base, bare, slug: 'acme-eng/agents', forge: (args) => w.run(args, { env }) };
}

test('install from a forge slug fetches with git, records the slug, and writes one rulesync entry per pack, keeping comments', () => {
  const w = forgeConsumer(
    { both: { skills: true, rules: true, playbooks: { 'b-acme': IN_BABYSIT } }, skills: { skills: true }, rules: { rules: true }, bare: { playbooks: { 'p-acme': patch('feature', '- A note.') } } },
    { 'rulesync.jsonc': RULESYNC },
  );
  const r = w.forge(['install', 'both', 'skills', 'rules', 'bare', '--from', w.slug]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(w.manifest().packs[0].source, w.slug);
  const text = readFileSync(join(w.repo, 'rulesync.jsonc'), 'utf8');
  for (const comment of ['// Generated copies.', '// the harnesses', '// The curated skills.', '// keep this comment']) assert.ok(text.includes(comment), comment);
  assert.deepEqual(stripJsonc(text).sources.slice(1), [
    { source: 'acme-eng/agents:packs/both/skills', skills: ['*'], rules: ['*'], rulesPath: 'packs/both/rules' },
    { source: 'acme-eng/agents:packs/skills/skills', skills: ['*'] },
    { source: 'acme-eng/agents:packs/rules/rules', rules: ['*'], rulesPath: 'packs/rules/rules' },
  ]);
  assert.match(r.stdout, /rulesync install/);
  assert.equal(w.forge(['install', 'both', 'skills', 'rules', 'bare', '--from', w.slug]).status, 0);
  assert.equal(readFileSync(join(w.repo, 'rulesync.jsonc'), 'utf8'), text);
  assert.equal(w.forge(['remove', 'both']).status, 0);
  assert.equal(w.forge(['remove', 'skills']).status, 0);
  assert.equal(w.forge(['remove', 'rules']).status, 0);
  const after = readFileSync(join(w.repo, 'rulesync.jsonc'), 'utf8');
  assert.deepEqual(stripJsonc(after).sources, [{ source: 'remix-run/agent-skills', skills: ['x'] }]);
  for (const comment of ['// Generated copies.', '// the harnesses', '// The curated skills.', '// keep this comment']) assert.ok(after.includes(comment), comment);
});

test('update rewrites a rulesync entry when a pack gains rules, and drops it when the pack stops shipping both', () => {
  const w = forgeConsumer({ p: { skills: true } }, { 'rulesync.jsonc': '{\n  "sources": []\n}\n' });
  assert.equal(w.forge(['install', 'p', '--from', w.slug]).status, 0);
  writePacks(w.bare, { p: { skills: true, rules: true } });
  assert.equal(w.forge(['update']).status, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(w.repo, 'rulesync.jsonc'), 'utf8')).sources, [{ source: 'acme-eng/agents:packs/p/skills', skills: ['*'], rules: ['*'], rulesPath: 'packs/p/rules' }]);
  writePacks(w.bare, { p: {} });
  assert.equal(w.forge(['update']).status, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(w.repo, 'rulesync.jsonc'), 'utf8')).sources, []);
});

test('a rulesync config with no sources key gains one, and a repo with no config gets an info line and no new file', () => {
  const w = forgeConsumer({ p: { skills: true } }, { 'rulesync.jsonc': '// c\n{\n  "targets": ["claudecode"]\n}\n' });
  assert.equal(w.forge(['install', 'p', '--from', w.slug]).status, 0);
  assert.deepEqual(stripJsonc(readFileSync(join(w.repo, 'rulesync.jsonc'), 'utf8')).sources, [{ source: 'acme-eng/agents:packs/p/skills', skills: ['*'] }]);
  const bare = forgeConsumer({ p: { skills: true } });
  const r = bare.forge(['install', 'p', '--from', bare.slug]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /info: .*p ships skills or rules.*no rulesync\.jsonc/);
  assert.equal(existsSync(join(bare.repo, 'rulesync.jsonc')), false);
});

test('a local source cannot reach rulesync, which refuses a local path, so install says so and leaves the config alone', () => {
  const w = consumer({ p: { skills: true, playbooks: { 'p-acme': IN_BABYSIT } } });
  writeFileSync(join(w.repo, 'rulesync.jsonc'), RULESYNC);
  const r = w.run(['install', 'p', '--from', w.from]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /info: .*p ships skills or rules.*local/);
  assert.equal(readFileSync(join(w.repo, 'rulesync.jsonc'), 'utf8'), RULESYNC);
});

test('a symlink in a pack is refused, because a copy must be the bytes the source commits', () => {
  const w = consumer({ p: { playbooks: { 'p-acme': IN_BABYSIT } } });
  symlinkSync('/etc/hosts', join(w.from, 'packs', 'p', 'playbooks', 'link-acme.md'));
  const r = w.run(['install', 'p', '--from', w.from]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /link-acme\.md.*not a plain file/);
});

test('the usage lists the pack verbs, and writing flags stay on their commands', () => {
  const w = world();
  const help = w.run(['--help']).stdout;
  for (const verb of ['playbook install', 'playbook update', 'playbook remove', 'check [--locked']) assert.ok(help.includes(verb), verb);
  assert.equal(w.run(['install']).status, 2);
  assert.equal(w.run(['remove']).status, 2);
  assert.equal(w.run(['remove', 'a', 'b']).status, 2);
  assert.equal(w.run(['show', 'babysit', '--from', 'x']).status, 2);
  assert.equal(w.run(['install', 'a', '--with', 'x']).status, 2);
  assert.equal(w.run(['update', '--from', 'x']).status, 2);
});
