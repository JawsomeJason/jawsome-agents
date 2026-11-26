import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../skills/youtube-later/scripts/later.sh", import.meta.url));

// Runs later.sh against a fake gog that fails every call with `error`.
function run(error) {
  const dir = mkdtempSync(join(tmpdir(), "later-"));
  try {
    writeFileSync(join(dir, "gog"), `#!/bin/sh\necho '${error}' >&2\nexit 4\n`);
    chmodSync(join(dir, "gog"), 0o755);
    return spawnSync("bash", [script, "list"], {
      encoding: "utf8",
      env: { ...process.env, PATH: dir + delimiter + process.env.PATH },
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

for (const [error, status, message] of [
  ["auth_required", 2, /auth needed/],
  ["invalid_grant", 2, /auth needed/],
  ["accessNotConfigured", 1, /accessNotConfigured/],
]) {
  test(`${error} stops with exit ${status} and nothing after it`, () => {
    const result = run(error);
    assert.equal(result.status, status);
    assert.match(result.stderr, message);
    assert.doesNotMatch(result.stderr, /Traceback|no playlist/);
  });
}
