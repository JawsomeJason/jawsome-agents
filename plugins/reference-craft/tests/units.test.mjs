import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { py, skip } from './helpers.mjs';

test('the Python unit checks pass', { skip }, () => {
  const r = py(['-m', 'unittest', '-q', 'test_units'], fileURLToPath(new URL('.', import.meta.url)));
  assert.equal(r.status, 0, r.stderr);
});
