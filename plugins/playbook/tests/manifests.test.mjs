import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { test } from 'node:test';

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

test('the two plugin manifests and the marketplace entry carry the same version', () => {
  const versions = {
    '.claude-plugin/plugin.json': read('.claude-plugin/plugin.json').version,
    '.codex-plugin/plugin.json': read('.codex-plugin/plugin.json').version,
    marketplace: read('../../.claude-plugin/marketplace.json').plugins.find((p) => p.name === 'playbook')?.version,
  };
  const expected = versions['.claude-plugin/plugin.json'];
  assert.match(expected, /^\d+\.\d+\.\d+/);
  assert.deepEqual(versions, Object.fromEntries(Object.keys(versions).map((path) => [path, expected])));
});

test('the marketplace lists every skill of the plugin, so a skills CLI finds them', () => {
  const entry = read('../../.claude-plugin/marketplace.json').plugins.find((p) => p.name === 'playbook');
  assert.deepEqual(entry.skills.map((s) => basename(s)).sort(), readdirSync(new URL('../skills/', import.meta.url)).sort());
});

test('the mode contract runs playbook, and falls back to poteto-mode only without it', () => {
  const contract = readFileSync(new URL('../skills/setup/references/mode-contract.md', import.meta.url), 'utf8');
  assert.match(contract, /runs `playbook` when it is on `PATH`/);
  assert.match(contract, /When it is not on `PATH`, it follows poteto-mode as written/);
  assert.doesNotMatch(contract, /jstack/);
});
