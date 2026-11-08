import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { test } from 'node:test';
import { run, scriptPath, tempDir } from './helpers.mjs';

for (const script of readdirSync(scriptPath('')).filter((f) => f.endsWith('.mjs'))) {
  test(`${script} --help prints usage and exits 0`, () => {
    const r = run(script, ['--help'], tempDir());
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, new RegExp(`^usage: ${script.replace('.', '\\.')} `));
  });
}
