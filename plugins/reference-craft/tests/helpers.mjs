import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../../standards/tests/schema.mjs';

export { validate };
export const scriptsDir = fileURLToPath(new URL('../skills/reference-measure/scripts/', import.meta.url));
export const scriptPath = (name) => join(scriptsDir, name);
export const loadSchema = (name) =>
  JSON.parse(readFileSync(new URL(`../skills/reference-measure/references/schemas/${name}.schema.json`, import.meta.url), 'utf8'));

// The scripts declare third-party libraries in requirements.txt. Where they are missing the
// tests skip, unless REFERENCE_MEASURE_REQUIRE_DEPS=1 (as in CI), which turns a skip into a failure.
export const PYTHON = process.env.REFERENCE_MEASURE_PYTHON || 'python3';
const ENV = { ...process.env, PYTHONDONTWRITEBYTECODE: '1' };
function missingDeps() {
  const py = spawnSync(PYTHON, ['-c', 'import numpy, PIL, cv2, librosa'], { encoding: 'utf8', env: ENV });
  if (py.error || py.status !== 0) return `Python libraries from requirements.txt are missing (${PYTHON})`;
  for (const tool of ['ffmpeg', 'ffprobe']) {
    if (spawnSync(tool, ['-version']).error) return `${tool} is not on PATH`;
  }
  return null;
}
const missing = missingDeps();
if (missing && process.env.REFERENCE_MEASURE_REQUIRE_DEPS === '1') throw new Error(`REFERENCE_MEASURE_REQUIRE_DEPS=1 but ${missing}`);
export const skip = missing ?? false;

// Every temp folder a test makes is removed when the test process exits.
const made = [];
process.once('exit', () => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});
export const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'reference-measure-test-'));
  made.push(dir);
  return dir;
};

export const py = (args, cwd) => spawnSync(PYTHON, args, { cwd, encoding: 'utf8', env: ENV });
export const run = (script, args, cwd) => py([scriptPath(script), ...args], cwd);
export const resultPath = (stdout) => /^result: (.+)$/m.exec(stdout)?.[1];
export const readResult = (stdout, cwd) => JSON.parse(readFileSync(join(cwd, resultPath(stdout)), 'utf8'));

export function ffmpeg(args, input) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { input });
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')}: ${r.stderr}`);
}
