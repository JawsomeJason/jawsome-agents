import assert from 'node:assert/strict';
import { test } from 'node:test';
import { world } from './helpers.mjs';

const patch = (parent, line = '- A note.') => `---\nextends: ${parent}\nwhen: Any request\n---\n\n${line}\n`;

test('map prints the root and every active descendant as a tree, each labelled with its origin', () => {
  const w = world();
  const r = w.run(['map', 'babysit']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, `# babysit (web · acme-eng · pstack 1.0.0)

babysit [pstack] <= asked
├── babysit-tester [user]
│   └── babysitting-an-acme-pr-tester [user] (also extends babysitting-an-acme-pr)
└── babysitting-an-acme-pr [pack acme]
    ├── babysitting-an-acme-pr-tester [user] (also extends babysit-tester; shown above)
    └── babysitting-an-acme-pr-web [user]
`);
});

test('map of a mid-chain file marks it, and shows its ancestors above and descendants below', () => {
  const r = world().run(['map', 'babysitting-an-acme-pr']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^babysit \[pstack\]$/m);
  assert.match(r.stdout, /babysitting-an-acme-pr \[pack acme\] <= asked/);
  assert.match(r.stdout, /babysitting-an-acme-pr-web \[user\]/);
  assert.doesNotMatch(r.stdout, /^babysit \[pstack\] <= asked/m);
});

test('map labels a repo-owned team file with its repo', () => {
  const r = world({ team: { 'tidying-web.md': patch('feature') } }).run(['map', 'feature']);
  assert.match(r.stdout, /tidying-web \[repo web\]/);
});

test('a file with two parents shows under each, with the others named and its subtree printed once', () => {
  const w = world({ files: { 'playbooks/both-tester.md': patch('babysit-tester, babysitting-an-acme-pr'), 'playbooks/under-both.md': patch('both-tester') } });
  const r = w.run(['map', 'both-tester']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /└── both-tester \[user\] <= asked \(also extends babysitting-an-acme-pr\)\n[│ ]+└── under-both \[user\]/);
  assert.match(r.stdout, /── both-tester \[user\] <= asked \(also extends babysit-tester; shown above\)/);
  assert.equal(r.stdout.match(/under-both/g).length, 1);
});

test('a file spanning two families prints both trees', () => {
  const r = world({ files: { 'playbooks/span-tester.md': patch('babysit, feature') } }).run(['map', 'span-tester']);
  assert.match(r.stdout, /^babysit \[pstack\]$/m);
  assert.match(r.stdout, /^feature \[pstack\]$/m);
  assert.equal(r.stdout.match(/span-tester \[user\] <= asked/g).length, 2);
});

test('a dormant file shows under its active parent and says what it waits on, and asking for one works', () => {
  const w = world({ files: { 'playbooks/repos/other/only-other.md': '---\nextends: babysit\nwhen: w\n---\n\n- A note.\n', 'playbooks/waiting-tester.md': patch('babysit, only-other'), 'playbooks/deep-tester.md': patch('waiting-tester') } });
  const r = w.run(['map', 'babysit']);
  assert.match(r.stdout, /waiting-tester \[user\] \(dormant: extends only-other, which only playbooks\/repos\/other defines\)/);
  assert.match(r.stdout, /deep-tester \[user\] \(dormant: extends waiting-tester, which is dormant here\)/);
  const asked = w.run(['map', 'waiting-tester']);
  assert.equal(asked.status, 0, asked.stderr);
  assert.match(asked.stdout, /^babysit \[pstack\]$/m);
  assert.match(asked.stdout, /waiting-tester \[user\] <= asked \(dormant: /);
});

test('map --json gives every node once, with its origin, parents, children and dormant reason', () => {
  const w = world({ files: { 'playbooks/repos/other/only-other.md': patch('babysit'), 'playbooks/waiting-tester.md': patch('babysit, only-other') } });
  const out = JSON.parse(w.run(['map', 'babysit-tester', '--json']).stdout);
  assert.equal(out.asked, 'babysit-tester');
  assert.deepEqual(out.roots, ['babysit']);
  const by = Object.fromEntries(out.nodes.map((n) => [n.stem, n]));
  assert.deepEqual(by.babysit, { stem: 'babysit', kind: 'pstack', origin: 'pstack', parents: [], children: ['babysit-tester', 'babysitting-an-acme-pr', 'waiting-tester'], dormant: null, asked: false });
  assert.equal(by['babysit-tester'].asked, true);
  assert.equal(by['babysitting-an-acme-pr'].origin, 'pack acme');
  assert.match(by['waiting-tester'].dormant, /only-other/);
});

test('map of an unknown name is a usage error', () => {
  const r = world().run(['map', 'nope']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no playbook named nope/);
});
