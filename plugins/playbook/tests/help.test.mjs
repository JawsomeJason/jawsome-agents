import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { world } from './helpers.mjs';

const VERBS = ['list', 'show', 'map', 'install', 'update', 'remove', 'check', 'doctor', 'help'];
const reference = readFileSync(new URL('../skills/playbook/references/cli.md', import.meta.url), 'utf8');
const skill = readFileSync(new URL('../skills/playbook/SKILL.md', import.meta.url), 'utf8');

test('bare playbook prints the usage and exits 0', () => {
  const r = world().run([]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^usage: playbook list/);
  assert.match(r.stdout, /playbook help <command>/);
});

test('every verb has one page, through --help, -h and help, with synopsis, options and examples', () => {
  const w = world();
  const general = w.run(['--help']).stdout;
  for (const verb of VERBS) {
    const page = w.run([verb, '--help']);
    assert.equal(page.status, 0, verb);
    assert.equal(w.run([verb, '-h']).stdout, page.stdout, verb);
    assert.equal(w.run(['help', verb]).stdout, page.stdout, verb);
    assert.match(page.stdout, new RegExp(`^usage: playbook ${verb}\\b`), verb);
    assert.match(page.stdout, /\nExamples:\n {2}playbook /, verb);
    assert.ok(general.includes(page.stdout.split('\n')[0].replace('usage: ', '')), `${verb}: the general usage carries its synopsis`);
  }
});

test('every option a synopsis names is explained on that page, and the table is the one source', () => {
  const w = world();
  for (const verb of VERBS) {
    const page = w.run(['help', verb]).stdout;
    const synopsis = page.split('\n')[0];
    for (const [flag] of synopsis.matchAll(/--[a-z-]+/g)) assert.match(page.slice(synopsis.length), new RegExp(`^ {2}${flag}\\b`, 'm'), `${verb} ${flag}`);
  }
});

test('the reference and SKILL.md name every verb, and the reference carries each synopsis word for word', () => {
  const w = world();
  for (const verb of VERBS) {
    const synopsis = w.run(['help', verb]).stdout.split('\n')[0].replace('usage: ', '');
    assert.ok(reference.includes(synopsis), `cli.md lacks: ${synopsis}`);
    if (verb !== 'help') assert.ok(skill.includes(`playbook ${verb}`), `SKILL.md lacks ${verb}`);
  }
});

test('an unknown verb, option or help topic exits 2 and points at help', () => {
  const w = world();
  for (const [args, message] of [[['frobnicate'], /unknown command frobnicate/], [['list', '--nope'], /unknown option --nope/], [['help', 'nope'], /unknown command nope/], [['--nope'], /unknown option --nope/]]) {
    const r = w.run(args);
    assert.equal(r.status, 2, args.join(' '));
    assert.match(r.stderr, message);
    assert.match(r.stderr, /playbook help/);
  }
});

test('a wrong argument count or a flag of another verb prints that verb\'s usage', () => {
  const w = world();
  for (const args of [['show'], ['show', 'a', 'b'], ['list', '--from', 'x']]) {
    const r = w.run(args);
    assert.equal(r.status, 2, args.join(' '));
    assert.match(r.stderr, new RegExp(`usage: playbook ${args[0]}\\b`));
    assert.match(r.stderr, new RegExp(`playbook help ${args[0]}`));
  }
});

test('an option does not take a value that starts with a dash', () => {
  const w = world();
  const repo = w.run(['list', '--repo', '--json']);
  assert.equal(repo.status, 2);
  assert.match(repo.stderr, /--repo needs a value/);
  assert.equal(w.run(['list', '--repo']).status, 2);
});

test('compute stays an alias of show, and its page is show\'s', () => {
  const w = world();
  assert.equal(w.run(['compute', '--help']).stdout, w.run(['show', '--help']).stdout);
  assert.match(w.run(['help', 'show']).stdout, /compute/);
});
