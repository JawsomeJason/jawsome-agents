#!/usr/bin/env node
// Checks every declared contrast pair in a tokens.json, in every theme, and reports each
// accessibility departure with the reference value's ratio beside the new one.
// Input shape: references/schemas/tokens.schema.json. Output: references/schemas/contrast.schema.json.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const USAGE = 'usage: contrast.mjs --tokens <tokens.json> [--out <report.json>] [--json]';

export class UsageError extends Error {}

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

// Returns [r, g, b, a], each 0..1.
export function parseHex(hex, where) {
  if (typeof hex !== 'string' || !HEX.test(hex)) throw new UsageError(`${where}: ${JSON.stringify(hex)} is not a hex colour (#rgb, #rgba, #rrggbb or #rrggbbaa)`);
  let h = hex.slice(1);
  if (h.length <= 4) h = [...h].map((c) => c + c).join('');
  if (h.length === 6) h += 'ff';
  return [0, 2, 4, 6].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const luminance = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

// Source-over compositing of a colour with alpha onto an opaque one.
export const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);

export function ratio(fg, bg) {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

const round2 = (x) => Math.floor(x * 100) / 100;

function themed(value, theme, where) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && theme in value) return value[theme];
  throw new UsageError(`${where} has no value for theme ${theme}`);
}

export function check(tokens) {
  if (!tokens || typeof tokens !== 'object') throw new UsageError('tokens file is not a JSON object');
  const { themes, color, contrast } = tokens;
  if (!Array.isArray(themes) || !themes.length) throw new UsageError('tokens.themes must list at least one theme');
  if (!Array.isArray(color)) throw new UsageError('tokens.color must be an array of colour tokens');
  if (!Array.isArray(contrast)) throw new UsageError('tokens.contrast must be an array of pairs');
  const byName = new Map();
  for (const t of color) {
    if (byName.has(t.name)) throw new UsageError(`colour token ${t.name} is declared twice`);
    byName.set(t.name, t);
  }

  // Resolves a token to an opaque colour in one theme. `useReference` swaps in a departure's reference value.
  const resolve = (name, theme, where, useReference) => {
    const t = byName.get(name);
    if (!t) throw new UsageError(`${where} names unknown colour token ${name}`);
    const source = useReference && t.departure ? t.departure.reference : t.value;
    return parseHex(themed(source, theme, `${name}${useReference && t.departure ? '.departure.reference' : ''}`), name);
  };

  const pairs = [];
  contrast.forEach((p, i) => {
    const where = `contrast[${i}]`;
    if (typeof p.min !== 'number' || p.min < 1 || p.min > 21) throw new UsageError(`${where}.min must be a number from 1 to 21`);
    const departed = [p.fg, p.bg, p.over].some((n) => n && byName.get(n)?.departure);
    for (const theme of themes) {
      const measure = (useReference) => {
        let bg = resolve(p.bg, theme, where, useReference);
        if (bg[3] < 1) {
          if (!p.over) throw new UsageError(`${where}: ${p.bg} has alpha in ${theme}; name the surface beneath it with "over"`);
          const under = resolve(p.over, theme, where, useReference);
          if (under[3] < 1) throw new UsageError(`${where}: ${p.over} must be opaque in ${theme}`);
          bg = over(bg, under);
        }
        let fg = resolve(p.fg, theme, where, useReference);
        if (fg[3] < 1) fg = over(fg, bg);
        return round2(ratio(fg, bg));
      };
      const r = measure(false);
      const row = { fg: p.fg, bg: p.bg, ...(p.over ? { over: p.over } : {}), theme, ratio: r, min: p.min, pass: r >= p.min };
      if (departed) row.reference_ratio = measure(true);
      pairs.push(row);
    }
  });

  const departures = [];
  for (const t of color) {
    if (!t.departure) continue;
    if (typeof t.departure.reason !== 'string' || !t.departure.reason) throw new UsageError(`${t.name}.departure needs a reason`);
    for (const theme of themes) {
      const value = themed(t.value, theme, t.name);
      const reference = themed(t.departure.reference, theme, `${t.name}.departure.reference`);
      parseHex(value, t.name);
      parseHex(reference, `${t.name}.departure.reference`);
      departures.push({ token: t.name, theme, value, reference, reason: t.departure.reason });
    }
  }
  const failed = pairs.filter((p) => !p.pass).length;
  return { themes, checked: pairs.length, failed, pairs, departures };
}

function main(argv) {
  const { values } = parseArgs({ args: argv, options: { tokens: { type: 'string' }, out: { type: 'string' }, json: { type: 'boolean' }, help: { type: 'boolean' } } });
  if (values.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (!values.tokens) throw new UsageError('--tokens is required');
  let tokens;
  try {
    tokens = JSON.parse(readFileSync(values.tokens, 'utf8'));
  } catch (e) {
    throw new UsageError(`cannot read ${values.tokens}: ${e.message}`);
  }
  const report = { tokens: values.tokens, ...check(tokens) };
  if (values.out) {
    mkdirSync(dirname(values.out), { recursive: true });
    writeFileSync(values.out, JSON.stringify(report, null, 2) + '\n');
  }
  if (values.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    for (const p of report.pairs.filter((x) => !x.pass)) process.stdout.write(`FAIL ${p.theme}: ${p.fg} on ${p.bg}${p.over ? ` over ${p.over}` : ''} = ${p.ratio} (needs ${p.min})\n`);
    for (const d of report.departures) {
      const refs = report.pairs.filter((p) => p.theme === d.theme && 'reference_ratio' in p && [p.fg, p.bg, p.over].includes(d.token));
      const detail = refs.map((p) => `${p.fg} on ${p.bg} ${p.reference_ratio} -> ${p.ratio}`).join('; ');
      process.stdout.write(`departure ${d.theme}: ${d.token} ${d.reference} -> ${d.value}${detail ? ` (${detail})` : ''}\n`);
    }
    process.stdout.write(`${report.checked} pairs checked across ${report.themes.length} theme(s); ${report.failed} failed\n`);
  }
  return report.failed ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    if (!(e instanceof UsageError) && !String(e.code).startsWith('ERR_PARSE_ARGS')) throw e;
    process.stderr.write(`contrast.mjs: ${e.message}\n${USAGE}\n`);
    process.exitCode = 2;
  }
}
