import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { lint } from './lint.mjs';

const fixture = (name) => fileURLToPath(new URL(`./lint-fixtures/${name}`, import.meta.url));

const expected = {
  'absolute-date': 'absolute-date',
  'body-tokens': 'body-tokens',
  'compatibility-length': 'compatibility-length',
  'description-length': 'description-length',
  'description-length-multiline': 'description-length',
  'description-missing': 'description-missing',
  'dependency-undeclared': 'dependency-undeclared',
  'doc-scope': 'time-word',
  'fence-length': 'fence-length',
  'generated-time-word': 'time-word',
  'extension-key-unlisted': 'frontmatter-key',
  'frontmatter-key': 'frontmatter-key',
  'frontmatter-missing': 'frontmatter-missing',
  'harness-tool': 'harness-tool',
  'link-broken': 'link-broken',
  'link-escape': 'link-escape',
  'link-space': 'link-broken',
  'lockfile': 'package-file',
  'marketplace-plugins': 'marketplace-plugins',
  'marketplace-source-object': 'marketplace-plugins',
  'model-name': 'model-name',
  'name-dir': 'name-dir',
  'name-format': 'name-format',
  'name-length': 'name-length',
  'name-missing': 'name-missing',
  'no-skills': 'no-skills',
  'node-modules': 'package-file',
  'org-term': 'org-term',
  'package-file': 'package-file',
  'script-schema': 'script-schema',
  'time-word': 'time-word',
  'url-allowlist': 'url-allowlist',
  'vendor-name': 'vendor-name',
  'skill-code-url': 'url-allowlist',
  'tracked-identity': 'org-term',
  'doc-history': 'history-word',
  'workflow-pin': 'workflow-pin',
  'manifest-sync': 'manifest-sync',
  'generated-section': 'generated-section',
  'claude-only-skill': 'claude-only-skill',
  'claude-only-name': 'claude-only-name',
  'official-mark': 'official-mark',
  'media-file': 'media-file',
};

const passing = ['clean', 'dependency-declared', 'doc-allow', 'extension-key-allowed', 'generated-quote-allowed', 'generated-vendor-allowed', 'link-placeholder', 'private-term', 'fence-nested', 'generated-section-complete', 'claude-only-allowed', 'claude-only-labeled'];

test('every fixture directory has an expectation', () => {
  const dirs = readdirSync(fileURLToPath(new URL('./lint-fixtures', import.meta.url))).filter((d) => !passing.includes(d));
  assert.deepEqual(dirs.sort(), Object.keys(expected).sort());
});

test('clean fixture passes', () => {
  assert.deepEqual(lint(fixture('clean')), []);
});

test('generated standards may name the services their repo runs on', () => {
  assert.deepEqual(lint(fixture('generated-vendor-allowed')), []);
});

test('generated standards may quote a reviewer\'s time word in a blockquote', () => {
  assert.deepEqual(lint(fixture('generated-quote-allowed')), []);
});

test('a time word outside a quote in generated standards still fails, on its own line', () => {
  assert.deepEqual(lint(fixture('generated-time-word')).map((e) => [e.line, e.rule]), [[10, 'time-word']]);
});

test('a link target with a space is checked, and only a {{ }} placeholder is skipped', () => {
  assert.deepEqual(lint(fixture('link-placeholder')), []);
  assert.deepEqual(lint(fixture('link-space')).map((e) => e.message), ['"references/no such file.md" does not resolve']);
});

test('an allowlisted extension key passes', () => {
  assert.deepEqual(lint(fixture('extension-key-allowed')), []);
});

for (const [name, rule] of Object.entries(expected)) {
  test(`${name} fails only ${rule}`, () => {
    const rules = [...new Set(lint(fixture(name)).map((e) => e.rule))];
    assert.deepEqual(rules, [rule]);
  });
}

test('cli prints file:line rule message and exits non-zero', () => {
  const cli = fileURLToPath(new URL('./lint.mjs', import.meta.url));
  const run = spawnSync(process.execPath, [cli, fixture('time-word')], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stdout, /^\S*time-word[\\/]demo[\\/]SKILL\.md:6 time-word "currently" /m);
});

test('cli exits zero on a clean folder', () => {
  const cli = fileURLToPath(new URL('./lint.mjs', import.meta.url));
  const run = spawnSync(process.execPath, [cli, fixture('clean')], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout);
  assert.equal(run.stdout, '');
});

test('a private denylist named by STANDARDS_LINT_PRIVATE_DENYLIST adds its terms to org-term', () => {
  const cli = fileURLToPath(new URL('./lint.mjs', import.meta.url));
  const target = fixture('private-term');
  const without = spawnSync(process.execPath, [cli, target], { encoding: 'utf8', env: { ...process.env, STANDARDS_LINT_PRIVATE_DENYLIST: '' } });
  assert.equal(without.status, 0, without.stdout);
  const withList = spawnSync(process.execPath, [cli, target], { encoding: 'utf8', env: { ...process.env, STANDARDS_LINT_PRIVATE_DENYLIST: `${target}/denylist.json` } });
  assert.equal(withList.status, 1);
  assert.match(withList.stdout, /SKILL\.md:8 org-term "Acme Widgets" /);
  const missing = spawnSync(process.execPath, [cli, target], { encoding: 'utf8', env: { ...process.env, STANDARDS_LINT_PRIVATE_DENYLIST: `${target}/nope.json` } });
  assert.notEqual(missing.status, 0, 'a named list that cannot be read fails instead of passing silently');
  assert.match(missing.stderr, /STANDARDS_LINT_PRIVATE_DENYLIST=.*nope\.json is not a readable JSON file/);
});

test('a ``` line inside a ```` fence stays code, so a time word there passes', () => {
  assert.deepEqual(lint(fixture('fence-nested')), []);
});

test('a skill that ships a dependency manifest passes only with a compatibility field, and the manifest needs no output schema', () => {
  assert.deepEqual(lint(fixture('dependency-declared')), []);
  assert.deepEqual(lint(fixture('dependency-undeclared')).map((e) => [e.file.split('/').slice(-2).join('/'), e.rule]), [['scripts/requirements.txt', 'dependency-undeclared']]);
  assert.match(lint(fixture('dependency-undeclared'))[0].message, /non-empty compatibility/);
});

test('a skill that ships a lockfile fails even with a compatibility field', () => {
  assert.deepEqual(lint(fixture('lockfile')).map((e) => [e.file.split('/').slice(-2).join('/'), e.rule]), [['scripts/uv.lock', 'package-file']]);
});

test('a skill script is scanned, and only a schema\'s top-level $schema URL is exempt', () => {
  assert.deepEqual(lint(fixture('skill-code-url')).map((e) => `${e.file.split('/').slice(-2).join('/')}:${e.line}`), ['scripts/fetch.mjs:1']);
});

test('every shipped file is scanned for identity, except LICENSE and the manifests\' author objects', () => {
  const cli = fileURLToPath(new URL('./lint.mjs', import.meta.url));
  const target = fixture('tracked-identity');
  const run = spawnSync(process.execPath, [cli, target], { encoding: 'utf8', env: { ...process.env, STANDARDS_LINT_PRIVATE_DENYLIST: fixture('private-term/denylist.json') } });
  assert.deepEqual(run.stdout.trim().split('\n').map((l) => l.split(' ').slice(0, 2).join(' ').replace(/^.*tracked-identity\//, '')), ['plan.txt:1 org-term', 'plan.txt:2 org-term']);
});

test('workflows pin every action by SHA and the runner image', () => {
  assert.deepEqual(lint(fixture('workflow-pin')).map((e) => e.line), [4, 6]);
});

test('a generated § file that follows the template passes the section check', () => {
  assert.deepEqual(lint(fixture('generated-section-complete')), []);
});

test('a Claude Code-only plugin may name its harness, models and vendors, and only its name prefix grants that', () => {
  assert.deepEqual(lint(fixture('claude-only-allowed')), []);
  const copy = mkdtempSync(join(tmpdir(), 'claude-only-'));
  try {
    cpSync(fixture('claude-only-allowed'), copy, { recursive: true });
    renameSync(join(copy, 'plugins/claudecode-demo'), join(copy, 'plugins/demo'));
    writeFileSync(join(copy, 'plugins/demo/.claude-plugin/plugin.json'), '{"name":"demo","version":"0.0.0"}');
    writeFileSync(join(copy, '.claude-plugin/marketplace.json'), '{"name":"copy","owner":{"name":"Fixture"},"plugins":[{"name":"demo","source":"./plugins/demo"}]}');
    assert.deepEqual([...new Set(lint(copy).map((e) => e.rule))].sort(), ['harness-tool', 'model-name', 'vendor-name']);
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
});

test('a skill in a Claude Code-only plugin passes as internal or fully labeled, and fails unmarked or half labeled', () => {
  assert.deepEqual(lint(fixture('claude-only-labeled')), []);
  const copy = mkdtempSync(join(tmpdir(), 'claude-only-'));
  const skill = join(copy, 'plugins/claudecode-demo/skills/demo/SKILL.md');
  try {
    cpSync(fixture('claude-only-labeled'), copy, { recursive: true });
    for (const frontmatter of [
      'description: Unmarked fixture skill. Use only in lint tests.',
      'description: "Claude Code only: fixture skill with no compatibility. Use only in lint tests."',
      'description: "Claude Code only: fixture skill on another harness. Use only in lint tests."\ncompatibility: Requires Node.js',
    ]) {
      writeFileSync(skill, `---\nname: demo\n${frontmatter}\n---\n\nAsk the user before you edit.\n`);
      assert.deepEqual(lint(copy).map((e) => e.rule), ['claude-only-skill'], frontmatter);
    }
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
});

test('hooks declared in plugin.json also need the Claude Code-only name prefix', () => {
  const copy = mkdtempSync(join(tmpdir(), 'claude-only-name-'));
  try {
    cpSync(fixture('claude-only-name'), copy, { recursive: true });
    rmSync(join(copy, 'plugins/demo/hooks'), { recursive: true });
    writeFileSync(join(copy, 'plugins/demo/.claude-plugin/plugin.json'), '{"name":"demo","version":"0.0.0","hooks":{}}');
    assert.deepEqual(lint(copy).map((e) => e.rule), ['claude-only-name']);
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
});

test('a pack playbook answers to the identity rule alone, and other repo docs keep the time rule', () => {
  const root = mkdtempSync(join(tmpdir(), 'lint-pack-'));
  mkdirSync(join(root, '.claude-plugin'));
  writeFileSync(join(root, '.claude-plugin', 'marketplace.json'), '{"plugins":[]}');
  mkdirSync(join(root, 'packs', 'p', 'playbooks'), { recursive: true });
  writeFileSync(join(root, 'packs', 'p', 'playbooks', 'time.md'), 'Cut it from the latest remote.\n');
  writeFileSync(join(root, 'packs', 'p', 'playbooks', 'who.md'), `Ask ${'Ja'}son.\n`);
  writeFileSync(join(root, 'packs', 'p', 'NOTES.md'), 'The latest notes.\n');
  const rules = lint(root).map((e) => `${e.file.split('/').pop()} ${e.rule}`);
  rmSync(root, { recursive: true, force: true });
  assert.deepEqual(rules.sort(), ['NOTES.md time-word', 'who.md org-term']);
});

// The marks are built at run time so this public file never spells one out.
test('official marks fail in every shipped file type, not only in skills and docs', () => {
  const root = mkdtempSync(join(tmpdir(), 'lint-mark-'));
  try {
    mkdirSync(join(root, '.claude-plugin'));
    writeFileSync(join(root, '.claude-plugin', 'marketplace.json'), '{"plugins":[]}');
    mkdirSync(join(root, 'assets'));
    writeFileSync(join(root, 'assets', 'card.css'), `/* ${['Nin', 'tendo'].join('')} red */\n`);
    writeFileSync(join(root, 'assets', 'build.py'), `# ${'Pok' + '\u00e9' + 'mon'} card frame\n`);
    writeFileSync(join(root, 'notes.md'), `The ${['faux', 'kemon'].join('')} plugin.\n`);
    const found = lint(root).map((e) => `${e.file.split('/').pop()}:${e.line} ${e.rule}`);
    assert.deepEqual(found.sort(), ['build.py:1 official-mark', 'card.css:1 official-mark', 'notes.md:1 official-mark']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('media passes only under an allowlisted glyph folder', () => {
  const root = mkdtempSync(join(tmpdir(), 'lint-media-'));
  const plugin = join(root, 'plugins', 'pocket-deck-kit');
  try {
    mkdirSync(join(root, '.claude-plugin'));
    writeFileSync(join(root, '.claude-plugin', 'marketplace.json'), '{"plugins":[{"name":"pocket-deck-kit","source":"./plugins/pocket-deck-kit"}]}');
    mkdirSync(join(plugin, '.claude-plugin'), { recursive: true });
    writeFileSync(join(plugin, '.claude-plugin', 'plugin.json'), '{"name":"pocket-deck-kit"}');
    const glyphs = join(plugin, 'skills', 'pocket-deck-glyphs', 'assets', 'glyphs', 'Energy');
    mkdirSync(glyphs, { recursive: true });
    writeFileSync(join(glyphs, 'fire.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>\n');
    assert.deepEqual(lint(root), []);
    writeFileSync(join(plugin, 'battle.WEBM'), '');
    assert.deepEqual(lint(root).map((e) => `${e.file.split('/').pop()} ${e.rule}`), ['battle.WEBM media-file']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
