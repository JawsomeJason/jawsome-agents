#!/usr/bin/env node
// The idempotent cache every measuring script shares, and a CLI for steps an agent runs by hand.
// A result lives at <root>/<stem>-<inputs sha12>/<step>-v<version>-<params sha8>/result.json, so
// the same bytes, step version and parameters always land in the same folder. A rerun finds
// result.json and does nothing; --force recomputes. result.json is written last and atomically,
// so a run cut off halfway is never mistaken for a finished one.
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, renameSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const DEFAULT_ROOT = '.reference-measure';

export class UsageError extends Error {}

// Key order must not change a hash, so objects are serialized with sorted keys.
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

// Reads in chunks, so a long screen recording never has to fit in memory.
export function fileSha(path, n = 12) {
  const hash = createHash('sha256');
  const fd = openSync(path, 'r');
  const buf = Buffer.alloc(1 << 20);
  try {
    for (let read; (read = readSync(fd, buf, 0, buf.length, null)) > 0; ) hash.update(buf.subarray(0, read));
  } finally {
    closeSync(fd);
  }
  return hash.digest('hex').slice(0, n);
}

// A step with no input file (a plan computed from parameters alone) lives under params/.
export function cacheKey({ inputs = [], step, version, params = {} }) {
  for (const p of inputs) if (!existsSync(p)) throw new UsageError(`input not found: ${p}`);
  const files = inputs.map((p) => ({ path: p, sha12: fileSha(p) }));
  const inputsSha =
    files.length === 1 ? files[0].sha12 : createHash('sha256').update(files.map((f) => f.sha12).join('\n')).digest('hex').slice(0, 12);
  const paramsSha = createHash('sha256').update(canonical(params)).digest('hex').slice(0, 8);
  const top = inputs.length ? `${basename(inputs[0], extname(inputs[0])).replace(/[^\w.-]+/g, '_')}-${inputsSha}` : 'params';
  return { files, inputs_sha12: inputs.length ? inputsSha : null, params_sha8: paramsSha, folder: join(top, `${step}-v${version}-${paramsSha}`) };
}

export function lookup({ inputs, step, version, params = {}, root = DEFAULT_ROOT, force = false }) {
  const key = cacheKey({ inputs, step, version, params });
  const dir = resolve(root, key.folder);
  const file = join(dir, 'result.json');
  let cached = null;
  if (!force && existsSync(file)) {
    try {
      cached = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      cached = null;
    }
  }
  return { status: cached ? 'hit' : 'miss', dir, file, key, cached };
}

export function writeAtomic(file, text) {
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync(tmp, text);
  renameSync(tmp, file);
}

export function commit({ dir, file, key }, step, version, params, result) {
  mkdirSync(dir, { recursive: true });
  const envelope = { step, version, inputs: key.files, params, result };
  writeAtomic(file, `${JSON.stringify(envelope, null, 2)}\n`);
  return envelope;
}

// The shape every measuring script follows: look up, compute on a miss, commit, print a short summary.
export function runCached({ inputs, step, version, params, root, force }, compute, summarize) {
  const slot = lookup({ inputs, step, version, params, root, force });
  const hit = slot.status === 'hit';
  const envelope = hit ? slot.cached : commit(slot, step, version, params, compute());
  const lines = summarize(envelope.result);
  console.log([hit ? `[cached] ${step} (pass --force to recompute)` : `${step}`, ...lines, `result: ${slot.file}`].join('\n'));
  return { ...slot, envelope };
}

export const commonOptions = { out: { type: 'string' }, force: { type: 'boolean' }, help: { type: 'boolean', short: 'h' } };

export function parse(argv, options, usage) {
  try {
    return parseArgs({ args: argv, options: { ...commonOptions, ...options }, allowPositionals: true });
  } catch (e) {
    throw new UsageError(`${e.message}\n${usage}`);
  }
}

// Runs a script's main and turns a UsageError into exit code 2 with one line on stderr.
export function cli(meta, name, main) {
  if (process.argv[1] !== fileURLToPath(meta)) return;
  try {
    main(process.argv.slice(2));
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
    console.error(`${name}: ${e.message}`);
    process.exitCode = 2;
  }
}

export function parseBox(spec, what = 'box') {
  const [name, rest] = spec.includes(':') ? [spec.slice(0, spec.indexOf(':')), spec.slice(spec.indexOf(':') + 1)] : [null, spec];
  const nums = rest.split(',').map(Number);
  if (!name || nums.length !== 4 || nums.some((v) => !Number.isFinite(v))) throw new UsageError(`${what} must be name:x,y,w,h, got ${spec}`);
  return { name, x: nums[0], y: nums[1], w: nums[2], h: nums[3] };
}

export function readJson(path, what) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new UsageError(`cannot read ${what} ${path}: ${e.message}`);
  }
}

const USAGE = `usage: cache.mjs <lookup|commit> --input <file> [--input <file>...] --step <name> --version <n> [--params <json>] [--out <root>] [--force] [--result <file>]
  lookup  prints {status, dir, file, key} as JSON; status is hit when result.json exists for these inputs, step version and params
  commit  wraps the JSON in --result in the result envelope and writes it atomically to the slot's result.json`;

function main(argv) {
  const { values, positionals } = parse(
    argv,
    { input: { type: 'string', multiple: true }, step: { type: 'string' }, version: { type: 'string' }, params: { type: 'string' }, result: { type: 'string' } },
    USAGE,
  );
  if (values.help) return console.log(USAGE);
  const [command] = positionals;
  if (!['lookup', 'commit'].includes(command)) throw new UsageError(`command must be lookup or commit\n${USAGE}`);
  for (const n of ['input', 'step', 'version']) if (!values[n]) throw new UsageError(`--${n} is required\n${USAGE}`);
  if (!/^[a-z][\w-]*$/.test(values.step)) throw new UsageError('--step must be a lowercase name such as keyframes');
  let params = {};
  if (values.params) {
    try {
      params = JSON.parse(values.params);
    } catch (e) {
      throw new UsageError(`--params is not JSON: ${e.message}`);
    }
  }
  if (!/^\d+$/.test(values.version)) throw new UsageError('--version must be a whole number');
  const version = Number(values.version);
  const slot = lookup({ inputs: values.input, step: values.step, version, params, root: values.out ?? DEFAULT_ROOT, force: values.force });
  if (command === 'lookup') {
    const { cached, ...rest } = slot;
    return console.log(JSON.stringify(rest));
  }
  if (!values.result) throw new UsageError(`commit needs --result <file>\n${USAGE}`);
  commit(slot, values.step, version, params, readJson(values.result, 'result'));
  console.log(slot.file);
}

cli(import.meta.url, 'cache', main);
