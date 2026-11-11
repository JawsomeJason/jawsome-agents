#!/usr/bin/env node
// Deterministic skill audit. Usage: audit.mjs <skill dir | folder of skills | plugin dir> [--json]
// Output shape: references/schemas/audit.schema.md. Exit 1 when any finding is a fail.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const LIMITS = { descMax: 1024, descMin: 120, bodyLines: 500, h2Max: 10, codeLines: 15 };
const RISKY = /\b(delete|deploy|publish|push|send|drop|force|overwrite|rm -rf|migrate)\b/i;

export function parseFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) return { fm: null, body: text };
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (kv) fm[kv[1]] = kv[2].replace(/^(["'])(.*)\1$/, '$2');
  }
  return { fm, body: text.slice(m[0].length) };
}

export function findSkills(root) {
  const dir = resolve(root);
  if (existsSync(join(dir, 'SKILL.md'))) return [dir];
  const out = [];
  for (const base of [dir, join(dir, 'skills')]) {
    if (!existsSync(base)) continue;
    for (const e of readdirSync(base)) {
      const p = join(base, e);
      if (statSync(p).isDirectory() && existsSync(join(p, 'SKILL.md'))) out.push(p);
    }
  }
  return out;
}

export function auditSkill(dir) {
  const text = readFileSync(join(dir, 'SKILL.md'), 'utf8');
  const { fm, body } = parseFrontmatter(text);
  const findings = [];
  const add = (id, severity, message) => findings.push({ id, severity, message });
  const lines = body.split('\n');
  const desc = fm?.description ?? '';
  if (!fm) add('frontmatter', 'fail', 'no frontmatter');
  else {
    if (fm.name !== basename(dir)) add('name', 'fail', `name "${fm.name ?? ''}" does not match folder "${basename(dir)}"`);
    if (!desc) add('description', 'fail', 'no description');
  }
  if (desc.length > LIMITS.descMax) add('description-long', 'fail', `description is ${desc.length} chars, over ${LIMITS.descMax}`);
  if (desc && desc.length < LIMITS.descMin) add('description-short', 'warn', `description is ${desc.length} chars: too thin to trigger on`);
  if (desc && !/\buse\b/i.test(desc)) add('no-when', 'warn', 'description never says when to use the skill');
  if (desc && !/triggers? include/i.test(desc)) add('no-triggers', 'warn', 'description lists no trigger phrases');
  if (lines.length > LIMITS.bodyLines) add('monolith', 'warn', `body is ${lines.length} lines: split into smaller skills or move detail to references/`);
  const h2 = lines.filter((l) => /^## /.test(l)).length;
  if (h2 > LIMITS.h2Max) add('monolith', 'warn', `${h2} sections: likely more than one job; propose a split`);
  let code = 0;
  let inFence = false;
  for (const l of lines) {
    if (/^\s*```/.test(l)) inFence = !inFence;
    else if (inFence) code++;
  }
  if (code >= LIMITS.codeLines && !existsSync(join(dir, 'scripts'))) add('no-scripts', 'warn', `${code} lines of code in SKILL.md and no scripts/ folder: move code the agent keeps writing into scripts/`);
  if (RISKY.test(desc + '\n' + body) && fm && !('disable-model-invocation' in fm)) add('risky-flag', 'warn', 'mentions a risky action and sets no disable-model-invocation: decide whether the user should be the only one who can start it');
  if (!/lesson|findings|learn|update this skill|playbook/i.test(body)) add('no-lessons', 'warn', 'no lessons loop: say when a run changes the skill');
  return { path: dir, name: fm?.name ?? basename(dir), bodyLines: lines.length, descriptionChars: desc.length, findings };
}

export function audit(root) {
  return { skills: findSkills(root).map(auditSkill) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const target = args.find((a) => !a.startsWith('--'));
  if (!target || !existsSync(target)) {
    console.error('usage: audit.mjs <skill dir | folder of skills | plugin dir> [--json]');
    process.exit(2);
  }
  const result = audit(target);
  if (json) console.log(JSON.stringify(result, null, 2));
  else {
    for (const s of result.skills) {
      console.log(`${s.name}: ${s.bodyLines} lines, description ${s.descriptionChars} chars`);
      for (const f of s.findings) console.log(`  ${f.severity} ${f.id}: ${f.message}`);
      if (!s.findings.length) console.log('  ok');
    }
    if (!result.skills.length) console.log('no SKILL.md found');
  }
  process.exit(result.skills.some((s) => s.findings.some((f) => f.severity === 'fail')) ? 1 : 0);
}
