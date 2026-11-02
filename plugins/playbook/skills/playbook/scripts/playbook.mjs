#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { accessSync, constants, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, realpathSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, delimiter, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { fetcher, hashOf, isForgeSource, isPlainFile, lockProblems, PACK_NAME, packEscape, PackError, readLock, readManifest, repoLinkProblem, resolvePacks, rulesyncEntry, rulesyncKeys, sourceId } from './playbook.packs.mjs';

class UsageError extends Error {
  /** `usage` adds a pointer to help: true for the general usage, or a command's name for its own line. */
  constructor(message, { usage = false } = {}) {
    super(usage ? [message, ...usageHint(usage)].filter(Boolean).join('\n') : message);
  }
}

// User files sit in playbooks/ (active everywhere) or a scope folder under it. A folder says where a file is active, never its order.
const USER_DIR = 'playbooks';
const SCOPES = {
  everywhere: { dir: (c) => join(c.configDir, USER_DIR) },
  org: { dir: (c) => c.repo.org && join(c.configDir, USER_DIR, 'orgs', c.repo.org) },
  repo: { dir: (c) => c.repo.name && join(c.configDir, USER_DIR, 'repos', c.repo.name) },
};
const TEAM_DIR = join('.agents', 'playbooks');
const PACK_DIR = 'packs';
const TEAM_LOCK = join('.agents', 'playbooks.lock');
const TEAM_MANIFEST = join('.agents', 'packs.json');

const CHANGE = /^\s*(?:[-*]|\d+\.)\s+\*\*(After|Before|Replace|In)\*\*\s+"([^"]+)"[ \t]*(.*)$/;
const CHANGE_VERB = /^\s*(?:[-*]|\d+\.)\s+\*\*(?:After|Before|Replace|In)\*\*/;
// A bold word before a straight quote is the edit shape, so any other word there is a misspelled verb, not a note.
const CHANGE_LIKE = /^\s*(?:[-*]|\d+\.)\s+\*\*(\w+)\*\*\s*"/;
const LIST_ITEM = /^\s*(?:[-*]|\d+\.)\s+(.*)$/;
const NUMBERED_STEP = /^\d+\.\s(.*)$/;
const HEADING = /^#{1,6}\s+(.+)$/;

const FAILURES = {
  ambiguous: { rank: 5, message: (quote, f) => `quote matches steps ${andList(f.steps)}; make it longer` },
  teamOnly: { rank: 4, message: () => 'team files may quote pstack and team files only, because teammates do not have user files' },
  unseen: { rank: 3, message: (quote, f) => `quote not found in what its parents leave: "${quote}"; ${f.writer} wrote it, so add ${f.writer} to extends` },
  outside: { rank: 2, message: () => 'quote is outside a numbered step' },
  missing: { rank: 1, message: (quote) => `quote not found: "${quote}"` },
};
const failure = (found, quote) => FAILURES[found.fail].message(quote, found);

const isBlank = (line) => line.trim() === '';
const andList = (items) => (items.length < 2 ? String(items[0]) : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);
const quoteRegex = (quote) => new RegExp(quote.trim().split(/\s+/).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+'));
const normalize = (text) => text.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n');

/** Splits playbook text into its first heading, intro and step texts: numbered steps, else bold-lead paragraphs. */
function parsePlaybook(text) {
  const lines = normalize(text).split('\n');
  const title = lines.map((l) => HEADING.exec(l)?.[1]).find(Boolean) ?? null;
  return { title, ...(lines.some((l) => NUMBERED_STEP.test(l)) ? numberedSteps(lines) : boldLeadSteps(lines)) };
}

function numberedSteps(lines) {
  const intro = [];
  const steps = [];
  let step = null;
  lines.forEach((line, i) => {
    const m = NUMBERED_STEP.exec(line);
    if (m) {
      step = [m[1]];
      steps.push(step);
    } else if (step && (isBlank(line) || /^\s/.test(line) || !isBlank(lines[i - 1]))) {
      step.push(line);
    } else {
      step = null;
      intro.push(line);
    }
  });
  return { intro: intro.join('\n'), steps: steps.map((s) => s.join('\n').trimEnd()) };
}

function boldLeadSteps(lines) {
  const intro = [];
  const steps = [];
  let para = [];
  const flush = () => {
    if (para.length && /^\*\*.+?\*\*/.test(para[0])) steps.push(para.join('\n'));
    else intro.push(...para);
    para = [];
  };
  for (const line of lines) {
    if (isBlank(line)) flush();
    else para.push(line);
  }
  flush();
  return { intro: intro.join('\n'), steps };
}

/** Frontmatter, edit lines, notes, and the body with edit lines removed, all carrying 1-based line numbers. */
function parseLayerText(raw) {
  const lines = normalize(raw).split('\n');
  const front = {};
  let start = 0;
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end > 0) {
      start = end + 1;
      for (let i = 1; i < end; i++) {
        const m = /^([\w-]+):[ \t]*(.*)$/.exec(lines[i]);
        if (m) front[m[1]] = { value: m[2].trim(), line: i + 1 };
      }
    }
  }
  const edits = [];
  const prose = [];
  const notes = [];
  const malformed = [];
  const badVerbs = [];
  const body = [];
  let open = null;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const change = CHANGE.exec(line);
    if (change) {
      open = { verb: change[1], quote: change[2], text: change[3].trim(), line: i + 1 };
      edits.push(open);
      prose.push({ text: open.text, line: open.line });
      continue;
    }
    if (CHANGE_VERB.test(line)) {
      malformed.push(i + 1);
      open = null;
      continue;
    }
    const like = CHANGE_LIKE.exec(line);
    if (like) {
      badVerbs.push({ line: i + 1, verb: like[1] });
      open = null;
      continue;
    }
    body.push(line);
    prose.push({ text: line, line: i + 1 });
    if (isBlank(line) || /^#{1,6}\s/.test(line)) {
      open = null;
      continue;
    }
    const item = LIST_ITEM.exec(line);
    if (item || !open) {
      open = { text: (item ? item[1] : line).trim(), line: i + 1 };
      notes.push(open);
    } else {
      open.text += ` ${line.trim()}`;
    }
  }
  return { front, edits, notes, malformed, badVerbs, prose, body: body.join('\n') };
}

// A segment records the stem that wrote it and the stem whose Replace struck it, so each file can see only its ancestors' text.
const segment = (text, writer) => ({ text, writer, struckBy: null });
const newStep = (text, origin, kind) => ({ origin, kind, touched: [], overrides: [], afterOf: null, segments: [segment(text, origin)] });
const effective = (step) => step.segments.filter((s) => !s.struckBy).map((s) => s.text).join('');
const display = (step) => step.segments.map((s) => (s.struckBy ? `~~${s.text}~~ ` : s.text)).join('');
const tags = (step) => `[${[step.origin, ...step.touched].join(' ~ ')}]`;

/** What a file whose ancestors are `seen` reads in a step: its ancestors' segments, less what its ancestors struck. */
const seenBy = (seen) => (s) => seen.has(s.writer) && !(s.struckBy && seen.has(s.struckBy));
const viewText = (step, seen) => step.segments.filter(seenBy(seen)).map((s) => s.text).join('');

/** Splits the segments `inSpan` selects at [start, end) of their joined text, returning the pieces inside. */
function takeSpan(step, inSpan, start, end) {
  const out = [];
  const taken = [];
  let pos = 0;
  for (const seg of step.segments) {
    if (!inSpan(seg)) {
      out.push(seg);
      continue;
    }
    const a = pos;
    const b = pos + seg.text.length;
    pos = b;
    const cuts = [a, Math.max(a, Math.min(b, start)), Math.max(a, Math.min(b, end)), b];
    for (let k = 0; k < 3; k++) {
      if (cuts[k + 1] <= cuts[k]) continue;
      const piece = { ...seg, text: seg.text.slice(cuts[k] - a, cuts[k + 1] - a) };
      out.push(piece);
      if (k === 1) taken.push(piece);
    }
  }
  step.segments = out;
  return taken;
}

/** Strikes the quoted span as `seen` reads it and inserts the change after it. Words a sibling already struck are a clash. */
function replaceSpan(step, edit, stem, seen) {
  const m = quoteRegex(edit.quote).exec(viewText(step, seen));
  const taken = takeSpan(step, seenBy(seen), m.index, m.index + m[0].length);
  const clash = taken.find((s) => s.struckBy)?.struckBy;
  for (const s of taken) s.struckBy ??= stem;
  const last = Math.max(...taken.map((s) => step.segments.indexOf(s)));
  step.segments.splice(last + 1, 0, segment(edit.text, stem));
  return clash ? { clash } : {};
}

const VERBS = {
  // A new After step lands after the steps earlier files put after the same anchor, so it reads in apply order.
  After: {
    edits: false,
    apply: (pb, step, edit, file) => {
      let at = pb.steps.indexOf(step) + 1;
      while (pb.steps[at]?.afterOf === step) at++;
      pb.steps.splice(at, 0, { ...newStep(edit.text, file.stem, file.kind), afterOf: step });
      return {};
    },
  },
  Before: { edits: false, apply: (pb, step, edit, file) => (pb.steps.splice(pb.steps.indexOf(step), 0, newStep(edit.text, file.stem, file.kind)), {}) },
  In: { edits: true, apply: (pb, step, edit, file) => (step.segments.push(segment(` ${edit.text}`, file.stem)), {}) },
  Replace: { edits: true, apply: (pb, step, edit, file, seen) => replaceSpan(step, edit, file.stem, seen) },
};

const makePlaybook = (name, kind, parsed) => ({ name, kind, title: parsed.title, intro: parsed.intro, steps: parsed.steps.map((t) => newStep(t, name, kind)), notes: [], family: [] });

/** The one step a quote names in what `seen` wrote, or the reason it names none. */
function locate(pb, quote, seen, team) {
  const re = quoteRegex(quote);
  const hits = pb.steps.flatMap((s, i) => (seen.has(s.origin) && re.test(viewText(s, seen)) ? [i + 1] : []));
  if (hits.length === 1) return { step: pb.steps[hits[0] - 1] };
  if (hits.length > 1) return { fail: 'ambiguous', steps: hits };
  const elsewhere = pb.steps.find((s) => re.test(effective(s)));
  if (elsewhere) {
    const writer = writersOf(elsewhere, re)[0];
    return team && pb.family.find((m) => m.stem === writer)?.kind === 'user' ? { fail: 'teamOnly' } : { fail: 'unseen', writer };
  }
  if (re.test(pb.intro)) return { fail: 'outside' };
  return { fail: 'missing' };
}

/** The stems that wrote the unstruck words `re` matches in a step, in step order. */
function writersOf(step, re) {
  const live = step.segments.filter((s) => !s.struckBy);
  const m = re.exec(live.map((s) => s.text).join(''));
  if (!m) return [];
  const out = [];
  let pos = 0;
  for (const s of live) {
    const [a, b] = [pos, pos + s.text.length];
    pos = b;
    if (b > m.index && a < m.index + m[0].length && s.text.trim() && !out.includes(s.writer)) out.push(s.writer);
  }
  return out;
}

/**
 * Builds the extends graph over the active files: roots (bundled playbooks and standalones) and patches. A patch is
 * active when a parent is; one in a cycle, with no parent, or whose parents exist only in other contexts is not.
 */
function buildGraph(bundled, files, universe, pstackName) {
  const nodes = new Map([...bundled.keys()].map((stem) => [stem, { stem, kind: 'pstack', file: null, parents: [] }]));
  const byStem = new Map(files.map((f) => [f.stem, f]));
  for (const file of files) {
    if (bundled.has(file.stem)) continue;
    if (file.extends.length === 0) {
      nodes.set(file.stem, { stem: file.stem, kind: file.kind, file, parents: [] });
      for (const edit of file.edits) file.problems.push({ line: edit.line, message: 'standalone playbook cannot carry edits' });
    }
  }
  for (const file of files) {
    for (const cycle of cycleFrom(file, byStem)) file.problems.push({ line: file.extendsLine, message: `extends a cycle: ${cycle.join(' -> ')}` });
  }
  const pending = files.filter((f) => f.extends.length > 0 && !bundled.has(f.stem) && !f.problems.some((p) => p.message.startsWith('extends a cycle')));
  // A team file reaches teammates, who have this repo's team files and pstack, and nothing else.
  const teamParent = (stem) => bundled.has(stem) || byStem.get(stem)?.kind === 'team';
  for (const file of pending) {
    if (file.kind !== 'team') continue;
    for (const stem of file.extends.filter((s) => !teamParent(s))) {
      file.problems.push({ line: file.extendsLine, message: `team files extend bundled or team playbooks, and neither pstack ${pstackName} nor this repo has ${stem}` });
      file.unresolved = true;
    }
  }
  const valid = (file, stem) => nodes.has(stem) && (file.kind !== 'team' || teamParent(stem));
  const teamInvalid = (file, stem) => file.kind === 'team' && !teamParent(stem);
  // A file applies only where every parent it names exists, so a parent defined only elsewhere keeps it dormant here.
  const ready = (file) => file.extends.some((s) => valid(file, s)) && file.extends.every((s) => valid(file, s) || teamInvalid(file, s) || !universe.has(s));
  for (let grew = true; grew; ) {
    grew = false;
    for (const file of pending) {
      if (nodes.has(file.stem) || !ready(file)) continue;
      nodes.set(file.stem, { stem: file.stem, kind: file.kind, file, parents: [] });
      grew = true;
    }
  }
  const dormant = [];
  for (const file of pending) {
    const node = nodes.get(file.stem);
    if (node) node.parents = file.extends.filter((s) => valid(file, s));
    for (const stem of file.extends) {
      if (valid(file, stem) || teamInvalid(file, stem)) continue;
      const where = universe.get(stem);
      if (pending.some((f) => f.stem === stem)) file.info.push({ line: file.extendsLine, message: `extends ${stem}, which is dormant here, so this file is too` });
      else if (where) file.info.push({ line: file.extendsLine, message: `extends ${stem}, which only ${where.where} defines, so this file is dormant here` });
      else {
        file.problems.push({ line: file.extendsLine, message: `extends ${stem}, which no playbook defines` });
        file.unresolved = true;
      }
    }
    if (!node) dormant.push(file);
  }
  return { nodes, dormant };
}

/** Each cycle through `file` along user extends, as stems from `file` back to itself, at most one per parent. */
function cycleFrom(file, byStem) {
  const found = [];
  for (const first of file.extends) {
    const path = [file.stem];
    const walk = (stem, seen) => {
      if (stem === file.stem) return [...path, stem];
      const next = byStem.get(stem);
      if (!next || seen.has(stem)) return null;
      path.push(stem);
      for (const parent of next.extends) {
        const hit = walk(parent, new Set([...seen, stem]));
        if (hit) return hit;
      }
      path.pop();
      return null;
    };
    const hit = walk(first, new Set());
    if (hit) {
      found.push(hit);
      break;
    }
  }
  return found;
}

/** Every stem `stem` reaches through active parents, itself excluded. */
function ancestorsOf(nodes, stem, memo = new Map()) {
  if (memo.has(stem)) return memo.get(stem);
  const out = new Set();
  memo.set(stem, out);
  for (const parent of nodes.get(stem)?.parents ?? []) {
    out.add(parent);
    for (const a of ancestorsOf(nodes, parent, memo)) out.add(a);
  }
  return out;
}

const KIND_RANK = { pstack: 0, team: 1, user: 2 };
const byApplyOrder = (a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || (a.stem < b.stem ? -1 : a.stem > b.stem ? 1 : 0);

/** A root's family in apply order: a topological sort that breaks ties team before user, then by stem. */
function familyOrder(nodes, root, ancestors) {
  const members = [...nodes.values()].filter((n) => n.stem === root || ancestors(n.stem).has(root));
  const inFamily = new Set(members.map((n) => n.stem));
  const waiting = new Map(members.map((n) => [n.stem, n.parents.filter((p) => inFamily.has(p)).length]));
  const order = [];
  for (let ready = members.filter((n) => waiting.get(n.stem) === 0); ready.length; ) {
    ready.sort(byApplyOrder);
    const next = ready.shift();
    order.push(next);
    for (const n of members) {
      if (!n.parents.includes(next.stem)) continue;
      waiting.set(n.stem, waiting.get(n.stem) - 1);
      if (waiting.get(n.stem) === 0) ready.push(n);
    }
  }
  return order;
}

/**
 * Applies every active family. Each file sees only what its ancestors wrote, so the result does not depend on the
 * order siblings are read in. An edit fails only when it lands in none of its families.
 */
function applyFamilies(bundled, graph) {
  const { nodes } = graph;
  const memo = new Map();
  const ancestors = (stem) => ancestorsOf(nodes, stem, memo);
  const playbooks = new Map();
  const roots = new Map();
  const outcomes = new Map();
  for (const node of nodes.values()) {
    if (node.parents.length || (node.file && node.file.extends.length)) continue;
    const parsed = node.file ? parsePlaybook(node.file.body) : bundled.get(node.stem);
    const pb = makePlaybook(node.stem, node.kind, parsed);
    playbooks.set(node.stem, pb);
    for (const member of familyOrder(nodes, node.stem, ancestors)) {
      pb.family.push({ stem: member.stem, kind: member.kind });
      roots.set(member.stem, [...(roots.get(member.stem) ?? []), node.stem]);
      if (member.stem === node.stem) continue;
      const file = member.file;
      const seen = new Set([...ancestors(file.stem)]);
      if (!outcomes.has(file)) outcomes.set(file, file.edits.map(() => ({ applied: false, fails: [], clash: null, step: null })));
      file.edits.forEach((edit, i) => {
        const found = locate(pb, edit.quote, seen, file.kind === 'team');
        const outcome = outcomes.get(file)[i];
        if (!found.step) return outcome.fails.push(found);
        const verb = VERBS[edit.verb];
        const step = found.step;
        const result = verb.apply(pb, step, edit, file, seen);
        outcome.applied = true;
        if (result.clash) outcome.clash = { other: result.clash, pb, step };
        if (!verb.edits || step.origin === file.stem) return;
        const after = step.touched.filter((s) => s !== file.stem);
        step.overrides.push({ file: file.stem, verb: edit.verb, quote: edit.quote, origin: step.origin, ...(after.length ? { after } : {}) });
        if (!step.touched.includes(file.stem)) step.touched.push(file.stem);
      });
      for (const note of file.notes) pb.notes.push({ text: note.text, file: file.stem });
    }
  }
  for (const [file, list] of outcomes) {
    file.edits.forEach((edit, i) => {
      const { applied, fails, clash } = list[i];
      if (clash) file.problems.push({ line: edit.line, message: `replaces words that ${clash.other} also replaces in ${clash.pb.name} step ${clash.pb.steps.indexOf(clash.step) + 1}; make one file extend the other` });
      if (applied || fails.length === 0) return;
      const worst = fails.reduce((a, b) => (FAILURES[b.fail].rank > FAILURES[a.fail].rank ? b : a));
      file.problems.push({ line: edit.line, message: failure(worst, edit.quote) });
    });
  }
  return { playbooks, roots };
}

const kebab = (title) => title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');

/** Resolves a written name to a playbook stem by stem or by title, the way poteto-mode turns a title into a file name. */
function playbookIndex(playbooks, roots) {
  const stems = new Map();
  for (const pb of playbooks.values()) {
    stems.set(pb.name, pb.name);
    if (pb.title) stems.set(kebab(pb.title), pb.name);
  }
  for (const stem of roots.keys()) stems.set(stem, stem);
  return {
    resolve: (name) => stems.get(kebab(name)) ?? null,
    names: [...stems.keys()],
    root: (stem) => roots.get(stem)?.[0] ?? null,
  };
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nameAlternatives = (index) => [...index.names].sort((a, b) => b.length - a.length).map((name) => escapeRegex(name).replaceAll('-', '[ -]')).join('|');

/** Each `<playbook> step N`, `steps N, M` or `steps N-M` that names a step the merged playbook lacks. */
function badStepRefs(text, index, playbooks) {
  // A step number counts against the family's computed steps, whichever member the text names.
  if (index.names.length === 0) return [];
  const re = new RegExp(`(?<![\\w-])(${nameAlternatives(index)})(?:\\.md)?(?:\\*\\*|\`)?\\s+steps?\\s+(\\d+(?:(?:\\s*(?:,|and|or|to|&)\\s*|[-–])\\d+)*)(?![\\w-])`, 'gi');
  return [...text.matchAll(re)].flatMap((m) => {
    const stem = index.resolve(m[1]);
    const count = playbooks.get(index.root(stem))?.steps.length;
    if (count === undefined) return [];
    return m[2].match(/\d+/g).map(Number).filter((n) => n < 1 || n > count).map((n) => ({ stem, n, count }));
  });
}

function computed(pb) {
  return {
    family: pb.family,
    steps: pb.steps.map((s) => ({ text: effective(s), origin: s.origin, kind: s.kind, touched: s.touched, display: display(s), tags: tags(s) })),
    notes: pb.notes,
    overrides: pb.steps.flatMap((s, i) => s.overrides.map((o) => ({ step: i + 1, ...o }))),
  };
}

const lexists = (path) => lstatSync(path, { throwIfNoEntry: false }) !== undefined;
const isDir = (path) => statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false;
const isFile = (path) => statSync(path, { throwIfNoEntry: false })?.isFile() ?? false;
const listDir = (dir) => {
  try {
    return readdirSync(dir).sort();
  } catch {
    return [];
  }
};
const mdFiles = (dir) => (dir ? listDir(dir).filter((f) => f.endsWith('.md') && isFile(join(dir, f))) : []);

function readSettings(configDir) {
  const path = join(configDir, 'config.json');
  if (!isFile(path)) return null;
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new UsageError(`${path}: ${e.message}`);
  }
  const bad = (what) => new UsageError(`${path}: ${what}`);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw bad('must be a JSON object');
  if (raw.pstack !== undefined && typeof raw.pstack !== 'string') throw bad('"pstack" must be a string');
  const orgs = raw.orgs ?? {};
  if (typeof orgs !== 'object' || Array.isArray(orgs)) throw bad('"orgs" must be an object');
  for (const [org, entry] of Object.entries(orgs)) {
    if (!Array.isArray(entry?.owners) || !entry.owners.every((o) => typeof o === 'string')) throw bad(`orgs.${org}.owners must be an array of strings`);
  }
  const repos = raw.repos ?? {};
  if (typeof repos !== 'object' || Array.isArray(repos)) throw bad('"repos" must be an object');
  for (const [repo, entry] of Object.entries(repos)) {
    if (entry?.checkout !== undefined && typeof entry.checkout !== 'string') throw bad(`repos.${repo}.checkout must be a path`);
  }
  return { path, raw, pstack: raw.pstack ?? null, orgs, repos };
}

const gitOut = (cwd, args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
};

/** Parses scp-style, https and ssh:// remotes into owner/name. */
function parseRemote(url) {
  const scp = /^[^/:@]+@[^/:]+:(.+)$/.exec(url);
  let path = scp?.[1];
  if (!path) {
    try {
      path = new URL(url).pathname;
    } catch {
      path = url;
    }
  }
  const parts = path.replace(/\/+$/, '').replace(/\.git$/, '').split('/').filter(Boolean);
  if (parts.length === 0) return null;
  return { name: parts.at(-1), owner: parts.length > 1 ? parts.at(-2) : null };
}

function findCheckout(cwd) {
  const common = gitOut(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  if (!common) return null;
  const root = basename(common) === '.git' ? dirname(common) : gitOut(cwd, ['rev-parse', '--show-toplevel']);
  if (!root) return null;
  const url = gitOut(root, ['remote', 'get-url', 'origin']);
  const remote = url ? parseRemote(url) : null;
  return { root, name: remote?.name ?? basename(root), owner: remote?.owner ?? null };
}

/**
 * The repo of the current checkout, or of `--repo`. A `--repo` outside its checkout reads the checkout config.json
 * records, so its team files and org come out the same from any directory.
 */
function resolveRepo(opts, configDir, settings, checkout = findCheckout(process.cwd())) {
  let found = checkout && (!opts.repo || opts.repo === checkout.name) ? checkout : null;
  const recorded = opts.repo && !found ? settings?.repos?.[opts.repo]?.checkout : null;
  if (recorded && isDir(recorded)) found = findCheckout(recorded);
  const name = opts.repo ?? found?.name ?? null;
  const owner = found?.owner ?? null;
  const root = found?.root ?? null;
  const agentsDir = root && lexists(join(root, TEAM_DIR)) ? join(root, TEAM_DIR) : null;
  const org = owner ? (Object.entries(settings?.orgs ?? {}).find(([, o]) => o.owners.includes(owner))?.[0] ?? null) : null;
  return { name, owner, org, root, agentsDir, teamDisplay: (file) => `.agents/playbooks/${file}` };
}

const PLAYBOOKS = join('skills', 'poteto-mode', 'playbooks');
const semver = (v) => v.split(/[.-]/).map((p) => Number.parseInt(p, 10) || 0);
const bySemverDesc = (a, b) => {
  const [x, y] = [semver(a.version), semver(b.version)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (y[i] ?? 0) - (x[i] ?? 0);
  return 0;
};

const SEMVER = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const MANIFESTS = ['.claude-plugin/plugin.json', '.codex-plugin/plugin.json', '.muse-plugin/plugin.json', 'package.json'];

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
};

/**
 * A pstack's version comes from a manifest at the plugin root, else from a folder named like a version, as plugin
 * caches name them. With neither, `version` is null, so nothing records it, and `name` falls back to the path.
 */
function pstackAt(path) {
  const dir = resolve(path);
  const declared = MANIFESTS.map((m) => readJson(join(dir, m))?.version).find((v) => typeof v === 'string' && SEMVER.test(v));
  const version = declared ?? (SEMVER.test(basename(dir)) ? basename(dir) : null);
  return { dir, version, name: version ?? dir };
}

const pluginDirs = () => {
  const home = homedir();
  return listDir(home).filter((e) => e.startsWith('.')).map((dot) => join(home, dot, 'plugins'));
};

/**
 * The pstack a harness loads, per the install record next to its plugin cache. The cache keeps old versions
 * after an upgrade, so the newest cached one is not always the one running.
 */
function installedPstack() {
  const found = [];
  for (const plugins of pluginDirs()) {
    const record = readJson(join(plugins, 'installed_plugins.json'));
    for (const [key, installs] of Object.entries(record?.plugins ?? {})) {
      if (!key.startsWith('pstack@') || !Array.isArray(installs)) continue;
      for (const { installPath, projectPath } of installs) {
        if (typeof installPath === 'string' && !projectPath && isDir(join(installPath, PLAYBOOKS))) found.push(pstackAt(installPath));
      }
    }
  }
  return found.sort(bySemverDesc)[0] ?? null;
}

/** Every pstack under a dot-directory plugin cache in the home dir, highest version first. */
function discoverPstacks() {
  const found = [];
  for (const plugins of pluginDirs()) {
    const cache = join(plugins, 'cache');
    for (const market of listDir(cache)) {
      const base = join(cache, market, 'pstack');
      for (const version of listDir(base).filter((v) => /^\d+\.\d+/.test(v))) {
        if (isDir(join(base, version, PLAYBOOKS))) found.push({ dir: join(base, version), version, name: version });
      }
    }
  }
  return found.sort(bySemverDesc);
}

function resolvePstack(flag) {
  const envDir = envVar('PSTACK_DIR');
  const base = envDir ? pstackAt(envDir) : (installedPstack() ?? discoverPstacks()[0] ?? null);
  let pick = base;
  if (flag) {
    const sibling = base && join(dirname(base.dir), flag);
    if (existsSync(flag)) pick = pstackAt(flag);
    else if (sibling && existsSync(sibling)) pick = pstackAt(sibling);
    else pick = discoverPstacks().find((p) => p.version === flag) ?? null;
    if (!pick) throw new UsageError(`no pstack ${flag} found`);
  }
  if (!pick) throw new UsageError('no pstack found; set PLAYBOOKS_PSTACK_DIR to a pstack install (the folder holding skills/poteto-mode)');
  if (!isDir(join(pick.dir, PLAYBOOKS))) throw new UsageError(`${pick.dir} has no ${PLAYBOOKS}; set PLAYBOOKS_PSTACK_DIR to a pstack install`);
  return pick;
}

const envVar = (name) => process.env[`PLAYBOOKS_${name}`];

const configDirPath = () => {
  const env = envVar('CONFIG');
  return env ? resolve(env) : join(homedir(), '.jawsome-playbooks');
};
const PSTACK_HELP = "playbooks need pstack's poteto-mode to run; install it with: claude plugin marketplace add michael-denyer/pstack-claude, then claude plugin install pstack@pstack-claude -s user. Other harnesses: see the pstack-claude README, or set PLAYBOOKS_PSTACK_DIR";

/** `pstackOptional` lets a pack verb run without pstack: ctx.pstack is null, and the verb warns and skips what needs it. */
function loadContext(opts, { pstackOptional = false } = {}) {
  const configDir = configDirPath();
  const settings = readSettings(configDir);
  let pstack = null;
  try {
    pstack = resolvePstack(opts.pstack);
  } catch (e) {
    if (!(e instanceof UsageError) || !pstackOptional || opts.pstack) throw e;
  }
  const repo = resolveRepo(opts, configDir, settings);
  return { configDir, settings, pstack, repo, pinned: Boolean(opts.pstack) };
}

/** One playbook file, team or user. `scope` is where it is active: a repo's checkout, everywhere, or one org or repo. */
function readPlaybookFile(path, displayPath, kind, scope) {
  const parsed = parseLayerText(readFileSync(path, 'utf8'));
  const { front } = parsed;
  const problems = [
    ...parsed.malformed.map((line) => ({ line, message: 'a change has no straight-quoted step text to anchor on' })),
    ...parsed.badVerbs.map(({ line, verb }) => ({ line, message: `**${verb}** is not an edit verb; use After, Before, Replace or In` })),
  ];
  if (!front.when?.value) problems.push({ line: 1, message: 'missing when:' });
  return {
    path,
    display: displayPath,
    kind,
    scope,
    stem: basename(path, '.md'),
    extends: (front.extends?.value ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    extendsLine: front.extends?.line ?? 1,
    edits: parsed.edits,
    notes: parsed.notes,
    prose: parsed.prose,
    body: parsed.body,
    problems,
    info: [],
  };
}

/** The user scope folders active in a context, as [scope label, folder]. */
const userDirs = (ctx) =>
  Object.entries(SCOPES)
    .map(([scope, s]) => [scope, s.dir(ctx)])
    .filter(([, dir]) => dir);

const userPackDirs = (configDir) => listDir(join(configDir, USER_DIR, PACK_DIR)).map((pack) => join(configDir, USER_DIR, PACK_DIR, pack));

/** Team files from the checkout, then user files from each active scope folder and each user pack, which is active everywhere. */
function collectFiles(ctx) {
  const team = mdFiles(ctx.repo.agentsDir).map((name) => readPlaybookFile(join(ctx.repo.agentsDir, name), ctx.repo.teamDisplay(name), 'team', ctx.repo.name));
  const dirs = [...userDirs(ctx), ...userPackDirs(ctx.configDir).map((dir) => ['everywhere', dir])];
  const user = dirs.flatMap(([scope, dir]) => mdFiles(dir).map((name) => readPlaybookFile(join(dir, name), join(dir, name), 'user', scope)));
  return { team, all: [...team, ...user] };
}

/** Dangling symlinks in .agents/playbooks (top level) and anywhere under the config dir, each reported once. */
function brokenLinks(ctx) {
  const problems = [];
  const seen = new Set();
  const realDir = (dir) => realOr(dir) ?? dir;
  const dangling = (path) => lstatSync(path).isSymbolicLink() && !statSync(path, { throwIfNoEntry: false });
  let teamBroken = false;
  const agents = ctx.repo.agentsDir;
  if (agents) {
    if (dangling(agents)) {
      teamBroken = true;
      problems.push({ path: '.agents/playbooks', line: 1, message: `broken link -> ${readlinkSync(agents)}` });
    } else {
      for (const name of listDir(agents)) {
        const path = join(agents, name);
        seen.add(join(realDir(agents), name));
        if (!dangling(path)) continue;
        teamBroken = true;
        problems.push({ path: ctx.repo.teamDisplay(name), line: 1, message: `broken link -> ${readlinkSync(path)}` });
      }
    }
  }
  const walk = (dir) => {
    for (const name of listDir(dir)) {
      const path = join(dir, name);
      const stat = lstatSync(path);
      if (stat.isDirectory()) walk(path);
      else if (dangling(path) && !seen.has(join(realDir(dir), name))) {
        problems.push({ path, line: 1, message: `broken link -> ${readlinkSync(path)}` });
      }
    }
  };
  if (isDir(ctx.configDir)) walk(ctx.configDir);
  return { problems, teamBroken };
}

/**
 * pstack's own checker, for the files it can read. Plain pstack refuses a file with a team parent, and `check` runs its
 * anchor check on those instead, so only chain-free files can fail here. A chained file it refused gets an info line.
 */
function runPstackCheck(ctx, teamBroken, chained = []) {
  const skipped = (why) => ({ status: 'skipped', lines: [`not run: ${why}`] });
  if (!ctx.repo.agentsDir) return skipped('no .agents/playbooks');
  if (teamBroken) return skipped('broken link in .agents/playbooks');
  const script = join(ctx.pstack.dir, 'skills', 'poteto-mode', 'scripts', 'check-playbooks.mjs');
  if (!isFile(script)) return skipped(`pstack ${ctx.pstack.name} has no check-playbooks.mjs`);
  const r = spawnSync(process.execPath, [script, ctx.repo.root], { cwd: ctx.repo.root, encoding: 'utf8' });
  const all = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.split('\n').filter((l) => l.trim());
  const refused = (file) => all.some((l) => l.startsWith(`${file.display}:`));
  for (const file of chained.filter(refused)) file.info.push({ line: file.extendsLine, message: `extends a team file, and plain pstack refuses that until its check-playbooks accepts project parents, so playbook checked it instead` });
  const lines = all.filter((l) => !chained.some((file) => l.startsWith(`${file.display}:`)));
  const failed = r.status !== 0 && lines.length > 0;
  return { status: failed ? 'failed' : 'ok', lines: failed || r.status === 0 ? lines : [] };
}

/**
 * Every stem any context defines, with where: each user scope folder, and the team files of each checkout config.json
 * records. A stem defined only elsewhere makes a file dormant here instead of broken.
 */
function stemUniverse(ctx) {
  const stems = new Map();
  const add = (dir, where) => {
    for (const name of mdFiles(dir)) if (!stems.has(basename(name, '.md'))) stems.set(basename(name, '.md'), { where, path: join(dir, name) });
  };
  const base = join(ctx.configDir, USER_DIR);
  add(base, USER_DIR);
  for (const group of ['orgs', 'repos']) for (const name of listDir(join(base, group))) add(join(base, group, name), `${USER_DIR}/${group}/${name}`);
  for (const dir of userPackDirs(ctx.configDir)) add(dir, USER_DIR);
  const checkouts = [[ctx.repo.name, ctx.repo.root], ...Object.entries(ctx.settings?.repos ?? {}).map(([name, r]) => [name, r.checkout && isDir(r.checkout) ? findCheckout(r.checkout)?.root : null])];
  for (const [name, root] of checkouts) if (root) add(join(root, TEAM_DIR), name);
  return stems;
}

function readBundled(ctx) {
  if (!ctx.pstack) return new Map();
  const dir = join(ctx.pstack.dir, PLAYBOOKS);
  return new Map(mdFiles(dir).map((f) => [basename(f, '.md'), parsePlaybook(readFileSync(join(dir, f), 'utf8'))]));
}

/** Stems must be unique: never a bundled stem, and never one another file active here, or a file active everywhere, uses. */
function nameProblems(ctx, files, bundled, universe) {
  const handle = ctx.settings?.raw.handle;
  const hint = (stem, qualifier) => (qualifier ? `, such as ${stem}-${qualifier}.md` : '');
  const qualifier = (file) => (file.kind === 'team' ? ctx.repo.org ?? ctx.repo.name : file.scope === 'org' ? ctx.repo.org : file.scope === 'repo' ? ctx.repo.name : handle);
  const first = new Map();
  for (const file of files) {
    if (bundled.has(file.stem)) {
      file.problems.push({ line: 1, message: `${file.stem} is a bundled playbook's name; rename the file${hint(file.stem, qualifier(file))}` });
      continue;
    }
    const other = first.get(file.stem) ?? (file.scope === 'everywhere' && universe.get(file.stem)?.path !== file.path ? universe.get(file.stem) : null);
    if (other) file.problems.push({ line: 1, message: `${file.stem} is also ${other.display ?? other.path}; rename one${hint(file.stem, qualifier(file))}` });
    else first.set(file.stem, file);
  }
  const words = [ctx.repo.org, ctx.repo.name].filter(Boolean);
  // A pack file is named for its pack and installs into many repos, so no one repo's word belongs in its name.
  const locked = ctx.repo.root ? readLock(join(ctx.repo.root, TEAM_LOCK))?.files ?? {} : {};
  for (const file of files.filter((f) => f.kind === 'team' && words.length && !locked[`${f.stem}.md`] && !words.some((w) => f.stem.split('-').includes(w)))) {
    file.info.push({ line: 1, message: `a team file name carries its scope word (${words.join(' or ')}), such as ${file.stem}-${words[0]}.md` });
  }
}

function analyze(ctx, { pstackCheck }) {
  const bundled = readBundled(ctx);
  const files = collectFiles(ctx);
  const universe = stemUniverse(ctx);
  nameProblems(ctx, files.all, bundled, universe);
  const usable = files.all.filter((f) => !f.problems.some((p) => p.line === 1 && / is (?:a bundled playbook's name|also )/.test(p.message)));
  const graph = buildGraph(bundled, usable, universe, ctx.pstack.name);
  const { playbooks, roots } = applyFamilies(bundled, graph);
  const index = playbookIndex(playbooks, roots);
  for (const file of files.all) {
    for (const { text, line } of file.prose) {
      for (const { stem, n, count } of badStepRefs(text, index, playbooks)) {
        file.problems.push({ line, message: `${stem} step ${n}, but ${stem} has ${count} ${count === 1 ? 'step' : 'steps'}` });
      }
    }
  }
  const links = brokenLinks(ctx);
  const chained = files.team.filter((f) => f.extends.some((s) => !bundled.has(s)));
  return { files, graph, playbooks, roots, index, links, pstackCheck: pstackCheck ? runPstackCheck(ctx, links.teamBroken, chained) : null };
}

const fileProblems = (files, key = 'problems') => files.flatMap((f) => [...f[key]].sort((a, b) => a.line - b.line).map(({ path, line, message }) => ({ path: f.display, line, message })));

const needsRecord = (ctx) => !ctx.pinned && ctx.settings && ctx.pstack.version && ctx.settings.pstack !== ctx.pstack.version;
// Swaps only the version text, so the user's own formatting of config.json survives.
function record(ctx) {
  const text = readFileSync(ctx.settings.path, 'utf8');
  const value = JSON.stringify(ctx.pstack.version);
  const swapped = text.replace(/("pstack"\s*:\s*)"[^"]*"/, (_, key) => key + value);
  writeFileSync(ctx.settings.path, swapped !== text || ctx.settings.raw.pstack === ctx.pstack.version ? swapped : `${JSON.stringify({ ...ctx.settings.raw, pstack: ctx.pstack.version }, null, 2)}\n`);
}

const teamLockOf = (root) => ({
  lockPath: join(root, TEAM_LOCK),
  lockShown: '.agents/playbooks.lock',
  manifestPath: join(root, TEAM_MANIFEST),
  manifestShown: '.agents/packs.json',
  fileOf: (name) => join(root, TEAM_DIR, name),
  shownOf: (name) => `.agents/playbooks/${name}`,
});

const userLockOf = (configDir) => ({
  user: true,
  lockPath: join(configDir, 'playbooks.lock'),
  lockShown: join(configDir, 'playbooks.lock'),
  manifestPath: join(configDir, 'packs.json'),
  manifestShown: join(configDir, 'packs.json'),
  fileOf: (name, entry) => join(configDir, USER_DIR, PACK_DIR, entry.pack, name),
  shownOf: (name, entry) => join(configDir, USER_DIR, PACK_DIR, entry.pack, name),
});

function checkReport(ctx, analysis) {
  const files = analysis.files.all;
  const locks = [...(ctx.repo.root ? [lockProblems(teamLockOf(ctx.repo.root))] : []), lockProblems(userLockOf(ctx.configDir))];
  const problems = [...analysis.links.problems, ...fileProblems(files), ...locks.flatMap((l) => l.problems)];
  const info = [...fileProblems(files, 'info'), ...locks.flatMap((l) => l.info)];
  const passed = problems.length === 0 && analysis.pstackCheck.status !== 'failed';
  return { pstack: ctx.pstack.version, problems, info, pstackCheck: analysis.pstackCheck, passed };
}

const problemLine = (p) => `${p.path}:${p.line}: ${p.message}`;

function renderCheck(report, pstack) {
  const n = report.problems.length;
  return [
    ...(report.pstackCheck.status === 'skipped' ? [] : report.pstackCheck.lines),
    ...report.problems.map(problemLine),
    ...report.info.map((p) => `info: ${problemLine(p)}`),
    report.passed
      ? `check passed: pstack ${pstack}`
      : `check failed: ${n ? `${n} ${n === 1 ? 'problem' : 'problems'}` : "pstack's checker failed"} against pstack ${pstack}`,
  ].join('\n');
}

const checkJson = (report, recorded) => {
  const { passed, ...rest } = report;
  return { ...rest, recorded };
};

/** One report over every context, in check's shape. It records no version, because it reads several contexts' files. */
function everyRepoReport(ctx) {
  const reports = everyContext(ctx).map((c) => checkReport(c, analyze(c, { pstackCheck: true })));
  const once = (key) => [...new Map(reports.flatMap((r) => r[key]).map((p) => [JSON.stringify(p), p])).values()];
  const statuses = reports.map((r) => r.pstackCheck.status);
  const lines = [...new Set(reports.flatMap((r) => (r.pstackCheck.status === 'skipped' ? [] : r.pstackCheck.lines)))];
  const status = statuses.includes('failed') ? 'failed' : statuses.includes('ok') ? 'ok' : 'skipped';
  return { pstack: ctx.pstack.version, problems: once('problems'), info: once('info'), pstackCheck: { status, lines }, passed: reports.every((r) => r.passed) };
}

/** `check --locked`: only the committed hashes, so CI needs neither pstack nor the pack's source. A worktree checks itself. */
function runLockedCheck(opts) {
  const root = gitOut(process.cwd(), ['rev-parse', '--show-toplevel']) ?? process.cwd();
  const report = lockProblems(opts.user ? userLockOf(configDirPath()) : teamLockOf(root));
  const passed = report.problems.length === 0;
  if (opts.json) {
    const out = { pstack: null, problems: report.problems, info: report.info, pstackCheck: { status: 'skipped', lines: ['not run: --locked'] }, recorded: false };
    return { out, status: passed ? 0 : 1 };
  }
  const linked = report.linked ? `; ${report.linked} linked ${report.linked === 1 ? 'pack' : 'packs'} carry no hash` : '';
  const end = !report.found ? `check --locked passed: no ${opts.user ? 'playbooks.lock in the config dir' : '.agents/playbooks.lock'} to verify` : passed ? `check --locked passed: ${report.count} ${report.count === 1 ? 'file matches' : 'files match'} the lock${linked}` : `check --locked failed: ${report.problems.length} ${report.problems.length === 1 ? 'problem' : 'problems'}`;
  return { out: [...report.problems.map(problemLine), ...report.info.map((p) => `info: ${problemLine(p)}`), end].join('\n'), status: passed ? 0 : 1 };
}

/** Every pack in a source repo, for that repo's CI: the rules a machine can check with no pstack and no install. */
function runPackLint(opts) {
  const root = resolve(opts.packs);
  if (!isDir(root)) throw new UsageError(`--packs ${opts.packs}: not a folder`);
  const packsDir = join(root, 'packs');
  const problems = [];
  const problem = (path, line, message) => problems.push({ path, line, message });
  const names = listDir(packsDir).filter((name) => {
    const escape = packEscape(root, name);
    if (escape) problem(escape, 1, 'a symlink leaves the source, so the pack cannot ship it');
    return !escape && isDir(join(packsDir, name));
  });
  if (names.length === 0 && problems.length === 0) problem('packs', 1, 'no pack here: a source repo holds packs/<name>/pack.json');
  const packs = new Map();
  const files = [];
  for (const name of names) {
    const manifest = `packs/${name}/pack.json`;
    let meta = {};
    try {
      meta = JSON.parse(readFileSync(join(packsDir, name, 'pack.json'), 'utf8'));
    } catch (e) {
      problem(manifest, 1, e.code === 'ENOENT' ? 'a pack needs a pack.json' : e.message);
    }
    if (!PACK_NAME.test(name)) problem(manifest, 1, `${name}: a pack name is lowercase letters, digits and dashes`);
    if (meta.name !== undefined && meta.name !== name) problem(manifest, 1, `"name" must be ${name}`);
    if (Object.keys(meta).length && typeof meta.description !== 'string') problem(manifest, 1, 'needs a "description"');
    const requires = Array.isArray(meta.requires) ? meta.requires.filter((r) => typeof r === 'string') : [];
    if (meta.requires !== undefined && requires.length !== (meta.requires?.length ?? -1)) problem(manifest, 1, '"requires" must be an array of pack names');
    packs.set(name, { name, manifest, requires });
    const dir = join(packsDir, name, 'playbooks');
    for (const entry of listDir(dir).filter((f) => f.endsWith('.md'))) {
      const shown = `packs/${name}/playbooks/${entry}`;
      if (!lstatSync(join(dir, entry)).isFile()) {
        problem(shown, 1, 'not a plain file, so the pack cannot ship it');
        continue;
      }
      files.push({ ...readPlaybookFile(join(dir, entry), shown, 'team', null), pack: name });
    }
  }
  for (const pack of packs.values()) {
    for (const req of pack.requires.filter((r) => !packs.has(r))) problem(pack.manifest, 1, `requires ${req}, which no pack here defines`);
    const walk = (at, path) => {
      if (at === pack.name && path.length) return [...path, at];
      if (path.includes(at)) return null;
      for (const next of packs.get(at)?.requires ?? []) {
        const hit = walk(next, [...path, at]);
        if (hit) return hit;
      }
      return null;
    };
    const cycle = walk(pack.name, []);
    if (cycle) problem(pack.manifest, 1, `requires a cycle: ${cycle.join(' -> ')}`);
  }
  const reach = (name, seen = new Set()) => {
    if (seen.has(name)) return seen;
    seen.add(name);
    for (const next of packs.get(name)?.requires ?? []) reach(next, seen);
    return seen;
  };
  const words = readJson(join(packsDir, 'config.json'))?.nameWords ?? [];
  const byStem = new Map();
  for (const file of files) {
    const other = byStem.get(file.stem);
    if (other) problem(file.display, 1, `${file.stem} is also ${other.display}; every stem is unique, because packs install flat`);
    else byStem.set(file.stem, file);
    if (words.length && !words.some((w) => file.stem.split('-').includes(w))) problem(file.display, 1, `a pack file name carries one of this source's name words (${words.length > 1 ? `${words.slice(0, -1).join(', ')} or ${words.at(-1)}` : words[0]}), as packs/config.json asks`);
  }
  for (const file of files) {
    for (const p of file.problems) problem(file.display, p.line, p.message);
    if (file.extends.length === 0) for (const edit of file.edits) problem(file.display, edit.line, 'standalone playbook cannot carry edits');
    for (const cycle of cycleFrom(file, byStem)) problem(file.display, file.extendsLine, `extends a cycle: ${cycle.join(' -> ')}`);
    for (const stem of file.extends) {
      const parent = byStem.get(stem);
      if (parent && !reach(file.pack).has(parent.pack)) problem(file.display, file.extendsLine, `extends ${stem}, in pack ${parent.pack}, which pack ${file.pack} does not require`);
    }
  }
  const passed = problems.length === 0;
  if (opts.json) return { out: { pstack: null, problems, info: [], pstackCheck: { status: 'skipped', lines: ['not run: --packs'] }, recorded: false }, status: passed ? 0 : 1 };
  const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const end = passed ? `check --packs passed: ${count(packs.size, 'pack')}, ${count(files.length, 'playbook')}` : `check --packs failed: ${count(problems.length, 'problem')}`;
  return { out: [...problems.map(problemLine), end].join('\n'), status: passed ? 0 : 1 };
}

function runCheck(ctx, opts) {
  if (opts.everyRepo) {
    const report = everyRepoReport(ctx);
    return { out: opts.json ? checkJson(report, false) : renderCheck(report, ctx.pstack.name), status: report.passed ? 0 : 1 };
  }
  const report = checkReport(ctx, analyze(ctx, { pstackCheck: true }));
  const recorded = report.passed && needsRecord(ctx);
  if (recorded) record(ctx);
  return { out: opts.json ? checkJson(report, recorded) : renderCheck(report, ctx.pstack.name), status: report.passed ? 0 : 1 };
}

const headerParts = (ctx) => [ctx.repo.name, ctx.repo.owner ?? ctx.repo.org, `pstack ${ctx.pstack.name}`].filter(Boolean);

function renderCompute(r) {
  const sections = [`# ${r.playbook} (${r.header.join(' · ')})`];
  if (r.asked !== r.playbook) sections.push(`${r.asked} is part of the ${r.playbook} family.`);
  if (r.withheld) {
    sections.push(`No steps: a file in the ${r.playbook} family has problems, so some of its edits would be lost. Fix the files below, then run \`playbook check\` until it passes.`);
  } else {
    if (r.partial) sections.push('These steps may be incomplete: a file has an extends that names no playbook, so it edits nothing, and its edits may belong in these steps. It is listed under Problems.');
    sections.push(
      r.steps
        .map((s, i) => {
          const [first, ...rest] = s.display.split('\n');
          return [`${i + 1}. ${first}   ${s.tags}`, ...rest].join('\n');
        })
        .join('\n'),
    );
    if (r.family.length > 1) sections.push(`Family: ${r.family.map((m) => `${m.stem} (${m.kind})`).join(', ')}`);
  }
  if (r.notes.length) sections.push(['Notes:', ...r.notes.map((n) => `- ${n.text}   [${n.file}]`)].join('\n'));
  if (r.overrides.length) {
    const line = (o) => `- step ${o.step}: ${o.file} ${o.verb === 'Replace' ? 'replaced' : 'added to'} "${o.quote}" (${o.origin}${o.after ? `, after ${o.after.join(', ')}` : ''})`;
    sections.push(['Overrides:', ...r.overrides.map(line)].join('\n'));
  }
  if (r.problems.length) sections.push(['Problems:', ...r.problems.map(problemLine)].join('\n'));
  const check = r.pstackCheck;
  sections.push(['pstack check-playbooks:', ...(check.status === 'ok' ? ['ok'] : check.lines)].join('\n'));
  return sections.join('\n\n');
}

/** The root whose family `name` belongs to, by stem or title. A patch of several roots, or a dormant one, is a usage error. */
function familyOf(analysis, name) {
  const stem = analysis.index.resolve(name) ?? name;
  const roots = analysis.roots.get(stem);
  if (roots?.length === 1) return { root: roots[0], stem };
  if (roots) throw new UsageError(`${stem} edits ${andList(roots)}; show one of those`);
  const dormant = analysis.graph.dormant.find((f) => f.stem === stem);
  if (dormant) throw new UsageError(`${stem} is dormant here: it extends ${andList(dormant.extends)}, which this context does not define`);
  throw new UsageError(`no playbook named ${name}`);
}

function runCompute(ctx, opts, name) {
  const analysis = analyze(ctx, { pstackCheck: true });
  const { root, stem } = familyOf(analysis, name);
  const pb = analysis.playbooks.get(root);
  if (needsRecord(ctx)) {
    const report = checkReport(ctx, analysis);
    if (!report.passed) return { out: opts.json ? checkJson(report, false) : renderCheck(report, ctx.pstack.name), status: 1 };
    record(ctx);
  }
  const members = new Set(pb.family.map((m) => m.stem));
  const touching = analysis.files.all.filter((f) => members.has(f.stem) || (f.extends.some((s) => members.has(s)) && f.problems.length));
  const fileFound = fileProblems(touching);
  // Its edits reach no playbook, and any playbook may be the one it meant, so every show reports it.
  const unresolved = analysis.files.all.filter((f) => f.unresolved && !touching.includes(f));
  const problems = [...analysis.links.problems, ...fileFound, ...fileProblems(unresolved)];
  const withheld = fileFound.length > 0;
  const empty = { family: pb.family, steps: [], notes: [], overrides: [] };
  const result = { playbook: root, asked: stem, ...(withheld ? empty : computed(pb)), problems, pstackCheck: analysis.pstackCheck, withheld };
  const status = problems.length || analysis.pstackCheck.status === 'failed' ? 1 : 0;
  if (!opts.json) return { out: renderCompute({ ...result, partial: unresolved.length > 0, header: headerParts(ctx) }), status };
  const { repo } = ctx;
  return {
    out: {
      playbook: root,
      asked: stem,
      repo: repo.name,
      owner: repo.owner,
      org: repo.org,
      pstack: ctx.pstack.version,
      family: result.family,
      steps: result.steps.map(({ text, origin, kind, touched }) => ({ text, origin, kind, touched })),
      notes: result.notes,
      overrides: result.overrides,
      problems,
      pstackCheck: analysis.pstackCheck,
    },
    status,
  };
}

/** Where a file came from, as a reader would name it: pstack, a pack, a repo, or the operator. */
function originOf(ctx, kind, file) {
  if (kind === 'pstack') return 'pstack';
  if (kind === 'team') {
    const pack = ctx.repo.root ? readLock(join(ctx.repo.root, TEAM_LOCK))?.files?.[`${file.stem}.md`]?.pack : null;
    return pack ? `pack ${pack}` : `repo ${ctx.repo.name}`;
  }
  const rel = relative(join(ctx.configDir, USER_DIR, PACK_DIR), file.path).split(sep);
  return rel[0] === '..' ? 'user' : `user pack ${rel[0]}`;
}

/** Every file the context knows, active or dormant, as the graph the tree draws: parents are those it can draw. */
function familyGraph(ctx, analysis) {
  const { nodes, dormant } = analysis.graph;
  const all = new Map();
  for (const n of nodes.values()) all.set(n.stem, { stem: n.stem, kind: n.kind, file: n.file, parents: n.parents, dormant: null });
  for (const file of dormant) {
    const why = file.info.find((i) => i.line === file.extendsLine && /^extends /.test(i.message))?.message ?? `extends ${file.extends.join(', ')}, which is not active here`;
    all.set(file.stem, { stem: file.stem, kind: file.kind, file, parents: [], dormant: why.replace(/, so this file (?:is dormant here|is too)$/, '') });
  }
  for (const file of dormant) all.get(file.stem).parents = file.extends.filter((s) => all.has(s));
  for (const node of all.values()) {
    node.origin = originOf(ctx, node.kind, node.file);
    node.children = [];
  }
  for (const node of all.values()) for (const parent of node.parents) all.get(parent).children.push(node.stem);
  for (const node of all.values()) node.children.sort();
  return all;
}

function runMap(ctx, opts, name) {
  const analysis = analyze(ctx, { pstackCheck: false });
  const all = familyGraph(ctx, analysis);
  const asked = analysis.index.resolve(name) ?? name;
  if (!all.has(asked)) throw new UsageError(`no playbook named ${name}`);
  const rootsOf = (stem, seen = new Set()) => {
    if (seen.has(stem)) return [];
    seen.add(stem);
    const { parents } = all.get(stem);
    return parents.length ? [...new Set(parents.flatMap((p) => rootsOf(p, seen)))] : [stem];
  };
  const roots = rootsOf(asked).sort();
  const printed = new Set();
  const label = (node, parent) => {
    const notes = [...(node.dormant ? [`dormant: ${node.dormant}`] : [])];
    const others = node.parents.filter((p) => p !== parent);
    const also = [...(others.length && parent ? [`also extends ${others.join(', ')}`] : []), ...(printed.has(node.stem) ? ['shown above'] : [])];
    if (also.length) notes.push(also.join('; '));
    return `${node.stem} [${node.origin}]${node.stem === asked ? ' <= asked' : ''}${notes.length ? ` (${notes.join('; ')})` : ''}`;
  };
  const lines = [];
  const walk = (stem, parent, lead, branch) => {
    const node = all.get(stem);
    lines.push(`${lead}${branch}${label(node, parent)}`);
    if (printed.has(stem)) return;
    printed.add(stem);
    const under = lead + (branch === '└── ' ? '    ' : branch === '├── ' ? '│   ' : '');
    node.children.forEach((child, i) => walk(child, stem, under, i === node.children.length - 1 ? '└── ' : '├── '));
  };
  roots.forEach((root, i) => {
    if (i) lines.push('');
    walk(root, null, '', '');
  });
  if (opts.json) {
    const { repo } = ctx;
    const nodes = [...printed].map((stem) => {
      const { kind, origin, parents, children, dormant } = all.get(stem);
      return { stem, kind, origin, parents, children, dormant, asked: stem === asked };
    });
    return { out: { asked, roots, repo: repo.name, owner: repo.owner, org: repo.org, pstack: ctx.pstack.version, nodes }, status: 0 };
  }
  return { out: [`# ${roots.join(', ')} (${headerParts(ctx).join(' · ')})`, '', ...lines].join('\n'), status: 0 };
}

/** The current context, the one with no repo, and each repo config.json records, read from its checkout when it has one. */
function everyContext(ctx) {
  const at = (name) => {
    const recorded = name && ctx.settings.repos[name].checkout;
    const checkout = recorded && isDir(recorded) ? findCheckout(recorded) : null;
    return { ...ctx, repo: resolveRepo({ repo: name }, ctx.configDir, ctx.settings, checkout) };
  };
  const all = [ctx, at(null), ...Object.keys(ctx.settings?.repos ?? {}).map(at)];
  const key = ({ repo }) => JSON.stringify([repo.name, repo.org, repo.agentsDir]);
  return all.filter((c, i) => all.findIndex((o) => key(o) === key(c)) === i);
}

const reportLines = (report) => [...report.problems.map(problemLine), ...(report.pstackCheck.status === 'failed' ? report.pstackCheck.lines : [])];

const contextLines = (contexts) => contexts.flatMap((c) => {
  const report = checkReport(c, analyze(c, { pstackCheck: true }));
  return report.passed ? [] : reportLines(report).map((line) => `in ${c.repo.name ?? 'no repo'}: ${line}`);
});

/** A stale step reference names the live step count, which the write itself can change. */
const sameProblem = (line) => line.replace(/ has \d+ steps?$/, ' has N steps');

/**
 * Where a pack verb writes. A repo's packs land in the current worktree, not its main checkout like a read, because they
 * reach everyone through that branch's pull request. `--user` packs land in the config dir.
 */
function packTarget(ctx, opts) {
  if (opts.user) {
    const lock = userLockOf(ctx.configDir);
    return { ...lock, contexts: everyContext(ctx), ctx, base: ctx.configDir, dirOf: (pack) => join(ctx.configDir, USER_DIR, PACK_DIR, pack), rulesync: null, user: true };
  }
  const root = opts.repo && opts.repo !== findCheckout(process.cwd())?.name ? ctx.repo.root : gitOut(process.cwd(), ['rev-parse', '--show-toplevel']);
  if (!root) throw new UsageError('not in a git checkout; run from the repo, or pass --user');
  const repo = { ...ctx.repo, root, agentsDir: lexists(join(root, TEAM_DIR)) ? join(root, TEAM_DIR) : null };
  const here = { ...ctx, repo };
  return { ...teamLockOf(root), contexts: [here], ctx: here, base: root, dirOf: () => join(root, TEAM_DIR), rulesync: join(root, 'rulesync.jsonc'), user: false };
}

/** Tracks every path a pack verb changes, so a refusal puts back the prior bytes or link and removes what it created. */
function fileBatch() {
  const prior = new Map();
  const remember = (path) => {
    if (prior.has(path)) return;
    const stat = lstatSync(path, { throwIfNoEntry: false });
    prior.set(path, !stat ? null : stat.isSymbolicLink() ? { link: readlinkSync(path) } : readFileSync(path));
  };
  const madeDirs = [];
  const emptyDirs = [];
  const dropEmpty = (dir) => {
    for (let d = dir; lexists(d) && listDir(d).length === 0; d = dirname(d)) {
      emptyDirs.push(d);
      rmSync(d, { recursive: true });
    }
  };
  const makeParents = (path) => {
    for (let d = dirname(path); !lexists(d); d = dirname(d)) madeDirs.push(d);
    mkdirSync(dirname(path), { recursive: true });
  };
  return {
    write(path, bytes) {
      remember(path);
      makeParents(path);
      writeFileSync(path, bytes);
    },
    link(path, target) {
      remember(path);
      makeParents(path);
      symlinkSync(target, path);
    },
    remove(path, { upTo } = {}) {
      remember(path);
      if (lexists(path)) unlinkSync(path);
      if (upTo && isDir(dirname(path)) && dirname(path) !== upTo && dirname(path).startsWith(upTo)) dropEmpty(dirname(path));
    },
    dropEmpty,
    undo() {
      for (const dir of emptyDirs.reverse()) mkdirSync(dir, { recursive: true });
      for (const [path, was] of [...prior].reverse()) {
        rmSync(path, { recursive: true, force: true });
        if (was === null) continue;
        mkdirSync(dirname(path), { recursive: true });
        if (was.link) symlinkSync(was.link, path);
        else writeFileSync(path, was);
      }
      for (const dir of madeDirs.reverse()) if (lexists(dir) && listDir(dir).length === 0) rmSync(dir, { recursive: true });
    },
  };
}

/** Runs `change`, then refuses it, with every byte put back, when it adds a check problem in any context of the target. With no pstack, nothing can check it. */
function guardedChange(target, change) {
  const checking = Boolean(target.ctx.pstack);
  const lines = (contexts) => (checking ? contextLines(contexts.map((c) => withAgents(c))) : []);
  const before = new Set(lines(target.contexts).map(sameProblem));
  const batch = fileBatch();
  let committed = false;
  try {
    change(batch);
    const added = lines(target.contexts).filter((line) => !before.has(sameProblem(line)));
    if (added.length) throw Object.assign(new UsageError(`refused: this adds check problems, so nothing was written\n${added.join('\n')}`), { status: 1 });
    committed = true;
  } finally {
    if (!committed) batch.undo();
  }
}

/** A context whose team folder is re-read, because a pack verb creates and removes it. */
const withAgents = (c) => {
  const { root } = c.repo;
  return root ? { ...c, repo: { ...c.repo, agentsDir: lexists(join(root, TEAM_DIR)) ? join(root, TEAM_DIR) : null } } : c;
};

const packFail = (message) => Object.assign(new UsageError(message), { status: 1 });

const writeJson = (batch, path, value) => batch.write(path, `${JSON.stringify(value, null, 2)}\n`);
const sorted = (entries) => Object.fromEntries([...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

/** The lock and manifest of a target, read for a write: a broken one stops the verb, since writing would lose what it holds. */
function packState(target) {
  const lock = readLock(target.lockPath);
  if (lock?.error) throw packFail(`${target.lockShown}: not a valid lock: ${lock.error}`);
  const repoLink = lock && !target.user ? repoLinkProblem(lock) : null;
  if (repoLink) throw packFail(`${target.lockShown}: ${repoLink}`);
  const manifest = readManifest(target.manifestPath);
  if (manifest.error) throw packFail(`${target.manifestShown}: not a valid manifest: ${manifest.error}`);
  return { lock: lock ?? { packs: {}, files: {} }, manifest };
}

function writePackState(batch, target, lockPacks, lockFiles, manifestPacks) {
  if (Object.keys(lockPacks).length === 0 && Object.keys(lockFiles).length === 0) {
    batch.remove(target.lockPath);
    batch.remove(target.manifestPath);
    return;
  }
  writeJson(batch, target.lockPath, { packs: sorted(Object.entries(lockPacks)), files: sorted(Object.entries(lockFiles)) });
  writeJson(batch, target.manifestPath, { packs: manifestPacks });
}

/** Refuses to overwrite or delete a file whose bytes are neither what the lock pins nor what this run would write. */
function assertUnedited(target, name, entry, incoming) {
  const path = entry.pack ? target.fileOf(name, entry) : join(target.base, TEAM_DIR, name);
  if (!lexists(path)) return;
  const hash = isPlainFile(path) ? hashOf(readFileSync(path)) : null;
  if (hash === null || (hash !== entry.hash && hash !== incoming)) throw packFail(`${target.shownOf(name, entry)}: hand-edited, so playbook will not overwrite it; move the change to the pack's source, then restore the file or delete it`);
}

/**
 * rulesync 15 drops a pack's skill or rule, with exit 0, when the repo's own .rulesync holds that name (the repo wins) or
 * an earlier source already fetched it (the first wins). A pack that silently loses a skill is worse than a failed install.
 */
function assertNoRulesyncClash(target, packs, lock) {
  const root = dirname(target.rulesync);
  const names = new Set(packs.map((p) => p.name));
  const owners = { skills: new Map(), rules: new Map() };
  for (const [name, entry] of Object.entries(lock.packs)) {
    if (names.has(name)) continue;
    for (const kind of ['skills', 'rules']) for (const item of entry[kind] ?? []) owners[kind].set(item, `pack ${name}`);
  }
  const ours = new Set(packs.flatMap((p) => rulesyncKeys(p.source, p.name)).map((k) => k.toLowerCase()));
  const vendored = readJson(join(root, 'rulesync.lock'))?.sources ?? {};
  for (const [key, entry] of Object.entries(vendored)) {
    if (ours.has(key.toLowerCase())) continue;
    for (const kind of ['skills', 'rules']) for (const item of Object.keys(entry?.[kind] ?? {})) if (!owners[kind].has(item)) owners[kind].set(item, `rulesync source ${key}`);
  }
  const clash = (pack, kind, item) => {
    const shown = kind === 'skills' ? `packs/${pack.name}/skills/${item}` : `packs/${pack.name}/rules/${item}.md`;
    const own = kind === 'skills' ? join('.rulesync', 'skills', item) : join('.rulesync', 'rules', `${item}.md`);
    if (lexists(join(root, own))) throw packFail(`${shown}: the repo's own ${own} has this name, and rulesync would keep the repo's and drop the pack's with exit 0; rename one`);
    const other = owners[kind].get(item);
    if (other) throw packFail(`${shown}: ${other} also ships ${item}, and rulesync would keep only the first with exit 0; rename one`);
    owners[kind].set(item, `pack ${pack.name}`);
  };
  for (const pack of packs) {
    if (!isForgeSource(pack.source)) continue;
    for (const item of pack.skillNames) clash(pack, 'skills', item);
    for (const item of pack.ruleNames) clash(pack, 'rules', item);
  }
}

const linkSource = (pack) => join(pack.dir, 'packs', pack.name, 'playbooks');

/** Copies `packs` into the target, or links them, deletes what they no longer ship, and rewrites the lock and the manifest. */
function syncPacks(ctx, opts, packs, fetch, target, state) {
  const { lock, manifest } = state;
  const names = new Set(packs.map((p) => p.name));
  const bundled = readBundled(ctx);
  const keptFiles = new Map(Object.entries(lock.files).filter(([, e]) => e.pack && !names.has(e.pack)));
  const incoming = new Map();
  for (const pack of packs) {
    pack.dir = fetch.get(pack.source).dir;
    pack.linked = opts.link || (Boolean(lock.packs[pack.name]?.link) && opts.from === null);
    for (const [name, bytes] of pack.playbooks) {
      const shown = `packs/${pack.name}/playbooks/${name}`;
      const other = incoming.get(name)?.pack ?? keptFiles.get(name)?.pack;
      if (other) throw packFail(`${shown}: pack ${other} also ships ${name}; rename one`);
      const stem = basename(name, '.md');
      if (bundled.has(stem)) throw packFail(`${shown}: ${stem} is a bundled playbook's name; rename the file`);
      incoming.set(name, { pack: pack.name, bytes, hash: hashOf(bytes), linked: pack.linked });
    }
  }
  for (const [name, next] of incoming) {
    const entry = lock.files[name];
    if (entry) {
      assertUnedited(target, name, entry, next.hash);
      continue;
    }
    const dest = join(target.dirOf(next.pack), name);
    if (!next.linked && !lock.packs[next.pack]?.link && lexists(dest) && !(isPlainFile(dest) && hashOf(readFileSync(dest)) === next.hash)) throw packFail(`${target.user ? dest : `.agents/playbooks/${name}`}: a file this ${target.user ? 'config' : 'repo'} owns, and pack ${next.pack} ships ${name}; rename or delete one`);
  }
  const stale = Object.entries(lock.files).filter(([name, e]) => e.pack && names.has(e.pack) && (!incoming.has(name) || incoming.get(name).linked));
  for (const [name, entry] of stale) assertUnedited(target, name, entry, null);
  if (target.rulesync && isFile(target.rulesync)) assertNoRulesyncClash(target, packs, lock);
  const notes = [];
  const lockPacks = { ...lock.packs };
  const manifestPacks = [...manifest.packs];
  for (const pack of packs) {
    const fetched = fetch.get(pack.source);
    if (fetched.dirty && !pack.linked) notes.push(`${pack.name}: ${pack.source} has uncommitted changes under packs, so the locked commit does not describe these bytes`);
    lockPacks[pack.name] = {
      source: pack.source,
      commit: pack.linked ? null : fetched.commit,
      ...(pack.linked ? { link: true } : {}),
      ...(pack.requires.length ? { requires: pack.requires } : {}),
      ...(pack.skillNames.length ? { skills: pack.skillNames } : {}),
      ...(pack.ruleNames.length ? { rules: pack.ruleNames } : {}),
    };
    const at = manifestPacks.findIndex((p) => p.name === pack.name);
    const listed = { name: pack.name, source: pack.source, ...(pack.linked ? { link: true } : {}) };
    if (at === -1) manifestPacks.push(listed);
    else manifestPacks[at] = listed;
  }
  const lockFiles = sorted([...keptFiles, ...[...incoming].filter(([, v]) => !v.linked).map(([name, { pack, hash }]) => [name, { pack, hash }])]);
  const summary = [];
  guardedChange(target, (batch) => {
    for (const [name, entry] of stale) {
      batch.remove(target.fileOf(name, entry), { upTo: target.base });
      summary.push(`deleted ${target.shownOf(name, entry)}`);
    }
    for (const pack of packs) {
      const dest = target.dirOf(pack.name);
      const wasLink = target.user && lstatSync(dest, { throwIfNoEntry: false })?.isSymbolicLink();
      if (pack.linked) {
        const source = linkSource(pack);
        if (wasLink && readlinkSync(dest) === source) continue;
        if (wasLink) batch.remove(dest);
        if (lexists(dest)) throw packFail(`${dest}: holds files the lock does not pin, so playbook cannot link it; move them first`);
        if (isDir(source)) {
          batch.link(dest, source);
          summary.push(`linked ${dest} -> ${source}`);
        }
      } else if (wasLink) batch.remove(dest);
    }
    for (const [name, { pack, bytes, hash, linked }] of incoming) {
      if (linked) continue;
      const dest = join(target.dirOf(pack), name);
      if (lexists(dest) && hashOf(readFileSync(dest)) === hash) continue;
      batch.write(dest, bytes);
      summary.push(`wrote ${target.user ? dest : `.agents/playbooks/${name}`}`);
    }
    writePackState(batch, target, lockPacks, lockFiles, manifestPacks);
  });
  notes.push(...packs.flatMap((pack) => rulesyncNote(target, pack, lock.packs[pack.name])));
  const end = packs.map((p) => `${p.name} ${p.linked ? 'linked' : (lockPacks[p.name].commit?.slice(0, 12) ?? 'no commit')}`).join(', ');
  return { out: [...summary, `installed ${end}`, ...notes.map((n) => `info: ${n}`), ...pstackWarning(ctx)].join('\n'), status: 0 };
}

const pstackWarning = (ctx) => (ctx.pstack ? [] : [`warning: no pstack found, so nothing checked these playbooks. ${PSTACK_HELP}`]);

/** What is left to do by hand in rulesync.jsonc, which is the repo's own file, for one pack and its old lock entry. */
function rulesyncNote(target, pack, was) {
  const entry = rulesyncEntry(pack);
  if (!entry) return rulesyncLeftover(target, pack.name, was);
  if (!isForgeSource(pack.source)) return [`${pack.name} ships skills or rules, but its source is local, and rulesync reads only forge sources, so they were not delivered`];
  if (target.user) return [`${pack.name} ships skills or rules, but a --user install delivers playbooks only; add its skills through your harness`];
  // The key moves when a pack drops its skills but keeps rules, or comes from a new source, so the old one is named too.
  const old = lockedEntry(target, pack.name, was);
  return [
    ...(old && old.source !== entry.source ? [`${pack.name} moved; delete ${old.source} from "sources" in rulesync.jsonc`] : []),
    `${pack.name} ships skills or rules; add this to "sources" in rulesync.jsonc, then run rulesync install:\n${JSON.stringify(entry)}`,
  ];
}

/** The rulesync source the lock entry `was` stood for, or null when it stood for none. */
const lockedEntry = (target, name, was) => (!target.user && was && isForgeSource(was.source) && rulesyncEntry({ name, source: was.source, hasSkills: was.skills?.length, hasRules: was.rules?.length })) || null;

function rulesyncLeftover(target, name, was) {
  const entry = lockedEntry(target, name, was);
  return entry ? [`${name} no longer ships skills or rules here; delete ${entry.source} from "sources" in rulesync.jsonc`] : [];
}

function requireInstalled(state, target, name) {
  if (!state.manifest.packs.some((p) => p.name === name)) throw new UsageError(`${name} is not installed in ${target.manifestShown}`);
}

/** A repo's manifest is committed, so a local source must be a folder in the repo, which every teammate has. */
function assertSourceAllowed(target, source) {
  if (target.user || isForgeSource(source)) return;
  const root = realOr(target.base) ?? target.base;
  const abs = resolve(target.base, source);
  const rel = relative(root, realOr(abs) ?? abs);
  if (rel.startsWith('..') || resolve(rel) === rel) throw new UsageError(`${source} is outside the repo, and a committed manifest cannot point at a private folder; use an owner/repo source, or install with --user`);
}

function runPackFetch(ctx, opts, names, target, state) {
  const listed = (name) => state.manifest.packs.find((p) => p.name === name)?.source ?? null;
  const fetch = fetcher(target.base);
  try {
    const from = opts.from === null ? null : opts.link ? resolve(opts.from) : sourceId(opts.from, target.base);
    const sourceOf = (name) => {
      const source = (names.includes(name) && from) || listed(name);
      if (source) assertSourceAllowed(target, source);
      return source;
    };
    const packs = resolvePacks(names, sourceOf, fetch, new Set(Object.keys(state.lock.packs)));
    return syncPacks(ctx, opts, packs, fetch, target, state);
  } catch (e) {
    if (e instanceof PackError) throw packFail(e.message);
    throw e;
  } finally {
    fetch.close();
  }
}

function checkPackNames(names) {
  for (const name of names) if (!PACK_NAME.test(name)) throw new UsageError(`${name}: a pack name is lowercase letters, digits and dashes`);
}

function runInstall(ctx, opts, names) {
  checkPackNames(names);
  if (opts.link && !opts.user) throw new UsageError('--link needs --user, because a committed manifest cannot point at a private folder');
  if (opts.link && (opts.from === null || !isDir(resolve(opts.from)))) throw new UsageError('--link needs --from <local folder>');
  const target = packTarget(ctx, opts);
  const state = packState(target);
  for (const name of names) {
    if (opts.from === null && !state.manifest.packs.some((p) => p.name === name)) throw new UsageError(`${name} has no known source; pass --from <owner/repo|path>`);
  }
  return runPackFetch(target.ctx, opts, names, target, state);
}

function runUpdate(ctx, opts, asked) {
  checkPackNames(asked);
  const target = packTarget(ctx, opts);
  const state = packState(target);
  for (const name of asked) requireInstalled(state, target, name);
  const names = asked.length ? asked : state.manifest.packs.map((p) => p.name);
  if (names.length === 0) return { out: 'no packs to update', status: 0 };
  return runPackFetch(target.ctx, opts, names, target, state);
}

function runRemove(ctx, opts, [name]) {
  checkPackNames([name]);
  const target = packTarget(ctx, opts);
  const state = packState(target);
  requireInstalled(state, target, name);
  const { lock, manifest } = state;
  const dependents = Object.entries(lock.packs).filter(([other, p]) => other !== name && p.requires?.includes(name)).map(([other]) => other);
  if (dependents.length) throw packFail(`refused: ${andList(dependents)} requires ${name}; remove ${dependents.length > 1 ? 'them' : 'it'} first`);
  const owned = Object.entries(lock.files).filter(([, e]) => e.pack === name);
  for (const [file, entry] of owned) assertUnedited(target, file, entry, null);
  const { [name]: _gone, ...lockPacks } = lock.packs;
  const lockFiles = Object.fromEntries(Object.entries(lock.files).filter(([, e]) => e.pack !== name));
  const manifestPacks = manifest.packs.filter((p) => p.name !== name);
  const notes = rulesyncLeftover(target, name, lock.packs[name]);
  guardedChange(target, (batch) => {
    for (const [file, entry] of owned) batch.remove(target.fileOf(file, entry));
    writePackState(batch, target, lockPacks, lockFiles, manifestPacks);
    const top = target.user ? join(ctx.configDir, USER_DIR, PACK_DIR) : dirname(target.lockPath);
    const leaf = target.dirOf(name);
    if (lstatSync(leaf, { throwIfNoEntry: false })?.isSymbolicLink()) batch.remove(leaf);
    else if (isDir(leaf) && listDir(leaf).length === 0) batch.dropEmpty(leaf);
    if (isDir(top) && listDir(top).length === 0) batch.dropEmpty(top);
  });
  return { out: [`removed ${name}: ${owned.length} ${owned.length === 1 ? 'file' : 'files'}`, ...notes.map((n) => `info: ${n}`), ...pstackWarning(ctx)].join('\n'), status: 0 };
}

function runList(ctx, opts) {
  const { playbooks } = analyze(ctx, { pstackCheck: false });
  const rows = [...playbooks.values()]
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map((pb) => ({ name: pb.name, kind: pb.kind, family: pb.family.slice(1).map((m) => m.stem) }));
  if (opts.json) {
    const { repo } = ctx;
    return { out: { repo: repo.name, owner: repo.owner, org: repo.org, pstack: ctx.pstack.version, playbooks: rows }, status: 0 };
  }
  const nameWidth = Math.max('playbook'.length, ...rows.map((r) => r.name.length)) + 2;
  const kindWidth = 'pstack'.length + 2;
  const [repoName, ...rest] = headerParts(ctx);
  const header = ctx.repo.name ? `${repoName} (${rest.join(' · ')})` : `(${repoName})`;
  const lines = [header, `${'playbook'.padEnd(nameWidth)}${'kind'.padEnd(kindWidth)}family`, ...rows.map((r) => `${r.name.padEnd(nameWidth)}${r.kind.padEnd(kindWidth)}${r.family.join(', ')}`)];
  return { out: lines.map((l) => l.trimEnd()).join('\n'), status: 0 };
}

const SCRIPT = fileURLToPath(import.meta.url);
const SELF_BIN = fileURLToPath(new URL('../../../bin/playbook', import.meta.url));
const SKILL_SCRIPT = join('skills', 'playbook', 'scripts', 'playbook.mjs');
const MARKS = { ok: '✓', fail: '✗', info: '-' };
const SETUP_HINT = 'run the setup skill';
const LINK_HINT = "link the plugin's bin/playbook, or a skill's scripts/playbook.mjs, into a folder on PATH, from a copy that updates in place";

const finding = (id, status, message, details = []) => ({ id, status, message, details });
const realOr = (path) => {
  try {
    return realpathSync(path);
  } catch {
    return null;
  }
};

function onPath(name) {
  for (const dir of (process.env.PATH ?? '').split(delimiter).filter(Boolean)) {
    const path = join(dir, name);
    try {
      accessSync(path, constants.X_OK);
      if (isFile(path)) return path;
    } catch {}
  }
  return null;
}

/** True when the command at `path` resolves to a plugin's bin/ script, or to the skill's own script. */
const isOurs = (path) => {
  const real = realOr(path);
  return Boolean(real) && (isFile(join(dirname(real), '..', SKILL_SCRIPT)) || real.endsWith(join(sep, 'scripts', 'playbook.mjs')));
};

function checkPstack() {
  try {
    const { dir, version } = resolvePstack(null);
    return { dir, finding: finding('pstack', 'ok', `pstack-claude ${version}: ${dir}`) };
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
    const env = envVar('PSTACK_DIR');
    if (env) return { finding: finding('pstack', 'fail', `PLAYBOOKS_PSTACK_DIR=${env} holds no pstack`) };
    return { finding: finding('pstack', 'fail', 'pstack-claude not found', [PSTACK_HELP]) };
  }
}

function checkCommand() {
  const found = onPath('playbook');
  if (found && !isOurs(found)) return finding('cli', 'fail', `playbook on PATH is ${found}, which is not this tool`, [LINK_HINT]);
  if (found) {
    const real = realOr(found);
    return finding('cli', 'ok', `playbook: ${found}${real === found ? '' : ` -> ${real}`}`);
  }
  // The skill runs its script by path, so a link only adds the short command for the operator.
  if (!isFile(SELF_BIN)) return finding('cli', 'info', `playbook is not on PATH; agents run node ${SCRIPT}`, [LINK_HINT]);
  return finding('cli', 'fail', 'playbook is not on PATH', [LINK_HINT]);
}

function checkConfig(configDir) {
  let settings;
  try {
    settings = readSettings(configDir);
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
    return { finding: finding('config', 'fail', e.message, [SETUP_HINT]) };
  }
  if (!settings) return { finding: finding('config', 'info', `no config at ${configDir}, so no personal playbooks`, [SETUP_HINT]) };
  const { handle } = settings.raw;
  if (typeof handle !== 'string' || !handle) return { settings, finding: finding('config', 'fail', `${settings.path} has no handle`, [SETUP_HINT]) };
  return { settings, handle, finding: finding('config', 'ok', `config ${configDir}: config.json parses, handle ${handle}`) };
}

function checkMode(configDir, handle) {
  const name = `${handle}-mode`;
  const modeDir = join(configDir, 'mode', name);
  if (!isFile(join(modeDir, 'SKILL.md'))) return finding('mode', 'fail', `${modeDir}/SKILL.md is missing`, [SETUP_HINT]);
  const home = homedir();
  const skillDirs = listDir(home).filter((e) => e.startsWith('.')).map((dot) => join(home, dot, 'skills')).filter(isDir);
  const linked = skillDirs.filter((dir) => realOr(join(dir, name)) === realOr(modeDir));
  if (linked.length) return finding('mode', 'ok', `mode skill ${modeDir} is linked into ${linked.join(', ')}`);
  return finding('mode', 'fail', `mode skill ${modeDir} is not linked into any skills folder`, [SETUP_HINT]);
}

/** Runs `playbook check` pinned to the resolved pstack, so it reads the same files and records nothing. */
function checkRun(repo, cwd, pstackDir) {
  const label = repo ? `playbook check --repo ${repo}` : 'playbook check';
  const id = repo ? `check:${repo}` : 'check';
  const args = [SCRIPT, 'check', '--json', ...(repo ? ['--repo', repo] : []), ...(pstackDir ? ['--pstack', pstackDir] : [])];
  const r = spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });
  if (r.status === 0) return finding(id, 'ok', `${label} passed`);
  if (r.status !== 1) return finding(id, 'fail', `${label} could not run`, r.stderr.split('\n').filter(Boolean));
  const report = JSON.parse(r.stdout);
  return finding(id, 'fail', `${label} failed`, [...report.problems.map(problemLine), ...(report.pstackCheck.status === 'failed' ? report.pstackCheck.lines : [])]);
}

function diagnose() {
  const cwd = process.cwd();
  const configDir = configDirPath();
  const pstack = checkPstack();
  const config = checkConfig(configDir);
  const findings = [pstack.finding, checkCommand(), config.finding];
  if (config.handle) findings.push(checkMode(configDir, config.handle));
  const here = findCheckout(cwd);
  const recorded = Object.entries(config.settings?.repos ?? {}).map(([name, r]) => [name, r.checkout ?? (here?.name === name ? here.root : null)]);
  for (const [name, path] of recorded.length ? recorded : [[null, here?.root]]) {
    const root = path && isDir(path) ? findCheckout(path)?.root : null;
    // An untracked team folder reaches only the operator.
    if (root && lexists(join(root, TEAM_DIR)) && !gitOut(root, ['ls-files', '--', TEAM_DIR])) findings.push(finding(`repo:${name ?? basename(root)}`, 'info', `${join(root, TEAM_DIR)}: git does not track these team playbooks, so teammates do not see them`));
    findings.push(checkRun(name, root ?? cwd, pstack.dir));
  }
  return findings;
}

function renderDoctor(findings) {
  const failed = findings.filter((f) => f.status === 'fail').length;
  return [
    ...findings.flatMap((f) => [`${MARKS[f.status]} ${f.message}`, ...f.details.map((l) => `    ${l}`)]),
    failed ? `doctor failed: ${failed} ${failed === 1 ? 'problem' : 'problems'}` : 'doctor passed',
  ].join('\n');
}

function runDoctor(opts) {
  const findings = diagnose();
  const status = findings.some((f) => f.status === 'fail') ? 1 : 0;
  return { out: opts.json ? { passed: status === 0, findings } : renderDoctor(findings), status };
}

// One table drives parsing, the usage and every help page, so none of them can drift. It is plain node:util parseArgs in
// non-strict mode, so an unknown option gets this command's own message.
const OPTIONS = {
  repo: { value: '<repo>', help: 'Use this repo key. Away from its checkout, read the checkout config.json records.' },
  pstack: { value: '<dir-or-version>', help: 'Use this pstack, and write nothing to config.json.' },
  json: { help: 'Print the same data as JSON.' },
  from: { value: '<owner/repo|path>', help: 'Where the pack comes from. Not needed for a pack the manifest lists.' },
  user: { help: 'Act on packs in the config dir, active everywhere, instead of this repo.' },
  link: { help: 'With --user and a local folder: reference the folder live instead of copying.' },
  locked: { help: 'Verify only the lock, offline, with no pstack and no source. With --user, the config dir lock.' },
  packs: { value: '<root>', help: "Lint every pack in a source repo, with no pstack: pack.json, stems, requires, when." },
  'every-repo': { help: 'Check with no repo and in each repo config.json records.' },
  help: { short: 'h', help: 'Print this page.' },
};

const COMMANDS = {
  list: {
    summary: 'List each playbook active here, with its kind and family.',
    options: ['repo', 'json', 'pstack'],
    examples: ['playbook list', 'playbook list --repo web --json'],
    run: (opts) => runList(loadContext(opts), opts),
  },
  show: {
    operands: '<name>',
    min: 1,
    max: 1,
    aliases: ['compute'],
    summary: 'Print one playbook family with every file applied, tagging each step. compute is an alias of show.',
    options: ['repo', 'json', 'pstack'],
    examples: ['playbook show babysit', 'playbook show opening-an-acme-pr --json'],
    run: (opts, [name]) => runCompute(loadContext(opts), opts, name),
  },
  map: {
    operands: '<name>',
    min: 1,
    max: 1,
    summary: 'Draw a playbook family as a tree, each file labelled with its origin. Marks the file you asked for, a second parent, and dormant files.',
    options: ['repo', 'json', 'pstack'],
    examples: ['playbook map babysit', 'playbook map babysitting-an-acme-pr --json'],
    run: (opts, [name]) => runMap(loadContext(opts), opts, name),
  },
  install: {
    operands: '<pack>...',
    min: 1,
    max: Infinity,
    summary: 'Install packs and what they require, as copies pinned in a lock. Warns when pstack is missing.',
    options: ['from', 'user', 'link', 'repo', 'pstack'],
    examples: ['playbook install acme --from acme-eng/agents', 'playbook install mine --user --link --from ../private'],
    run: (opts, args) => runInstall(loadContext(opts, { pstackOptional: true }), opts, args),
  },
  update: {
    operands: '[<pack>...]',
    min: 0,
    max: Infinity,
    summary: 'Re-fetch packs, and delete files they no longer ship.',
    options: ['user', 'repo', 'pstack'],
    examples: ['playbook update', 'playbook update acme'],
    run: (opts, args) => runUpdate(loadContext(opts, { pstackOptional: true }), opts, args),
  },
  remove: {
    operands: '<pack>',
    min: 1,
    max: 1,
    summary: 'Remove a pack and every file it put here. Refuses while another pack requires it.',
    options: ['user', 'repo', 'pstack'],
    examples: ['playbook remove acme'],
    run: (opts, args) => runRemove(loadContext(opts, { pstackOptional: true }), opts, args),
  },
  check: {
    summary: 'Validate every playbook file against the installed pstack, and each locked file against the lock.',
    options: ['locked', 'packs', 'user', 'repo', 'every-repo', 'json', 'pstack'],
    oneOf: [['locked', 'packs'], ['repo', 'every-repo']],
    examples: ['playbook check', 'playbook check --locked', 'playbook check --packs .'],
    validate: (o) => {
      if (o.packs !== null && (o.user || o.repo || o.everyRepo || o.pstack)) return '--packs takes only --json';
      if (o.locked && (o.repo || o.everyRepo || o.pstack)) return '--locked reads only the lock';
      if (o.user && !o.locked) return '--user needs --locked here';
      return null;
    },
    run: (opts) => (opts.packs !== null ? runPackLint(opts) : opts.locked ? runLockedCheck(opts) : runCheck(loadContext(opts), opts)),
  },
  doctor: {
    summary: 'Check the install, with a short hint under each failure.',
    options: ['json'],
    examples: ['playbook doctor', 'playbook doctor --json'],
    run: (opts) => runDoctor(opts),
  },
  help: {
    operands: '[<command>]',
    min: 0,
    max: 1,
    summary: 'Print the usage, or one command\'s page.',
    options: [],
    examples: ['playbook help', 'playbook help install'],
    run: (opts, [name]) => ({ out: name ? helpPage(commandNamed(name)) : usageText(), status: 0 }),
  },
};

const optKey = (name) => name.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const flagText = (name) => `--${name}${OPTIONS[name].value ? ` ${OPTIONS[name].value}` : ''}`;
const commandNamed = (word) => Object.keys(COMMANDS).find((name) => name === word || COMMANDS[name].aliases?.includes(word)) ?? null;

function synopsis(name) {
  const { operands, options, oneOf = [] } = COMMANDS[name];
  const parts = [];
  for (const option of options) {
    const group = oneOf.find((g) => g.includes(option));
    if (!group) parts.push(`[${flagText(option)}]`);
    else if (group[0] === option) parts.push(`[${group.map(flagText).join(' | ')}]`);
  }
  return ['playbook', name, operands, ...parts].filter(Boolean).join(' ');
}

const usageText = () => {
  const lines = Object.keys(COMMANDS).map(synopsis);
  return [`usage: ${lines[0]}`, ...lines.slice(1).map((l) => `       ${l}`), '', "Run playbook help <command> for a command's options and examples."].join('\n');
};

function helpPage(name) {
  const { summary, options, examples } = COMMANDS[name];
  const rows = [...options, 'help'].map((o) => [`--${o}${OPTIONS[o].value ? ` ${OPTIONS[o].value}` : ''}${OPTIONS[o].short ? `, -${OPTIONS[o].short}` : ''}`, OPTIONS[o].help]);
  const width = Math.max(...rows.map(([flag]) => flag.length)) + 2;
  return [`usage: ${synopsis(name)}`, '', summary, '', 'Options:', ...rows.map(([flag, help]) => `  ${flag.padEnd(width)}${help}`), '', 'Examples:', ...examples.map((e) => `  ${e}`)].join('\n');
}

const usageHint = (usage) => (usage === true ? [usageText()] : [`usage: ${synopsis(usage)}`, `run playbook help ${usage}`]);

function parseCli(argv) {
  const config = Object.fromEntries(Object.entries(OPTIONS).map(([name, o]) => [name, { type: o.value ? 'string' : 'boolean', ...(o.short ? { short: o.short } : {}) }]));
  const { positionals, tokens } = parseArgs({ args: argv, options: config, allowPositionals: true, strict: false, tokens: true });
  const opts = Object.fromEntries(Object.entries(OPTIONS).map(([name, o]) => [optKey(name), o.value ? null : false]));
  const set = [];
  for (const token of tokens) {
    if (token.kind !== 'option') continue;
    const option = OPTIONS[token.name];
    if (!option) throw new UsageError(`unknown option ${token.rawName}; run playbook help`);
    if (!option.value && token.value !== undefined) throw new UsageError(`${token.rawName} takes no value; run playbook help`);
    if (option.value && (token.value === undefined || token.value === '' || token.value.startsWith('-'))) throw new UsageError(`${token.rawName} needs a value; run playbook help`);
    opts[optKey(token.name)] = option.value ? token.value : true;
    set.push(token.name);
  }
  const [word, ...args] = positionals;
  if (word === undefined) {
    if (set.length === 0 || opts.help) return { print: usageText() };
    throw new UsageError('', { usage: true });
  }
  const name = commandNamed(word);
  if (!name) throw new UsageError(`unknown command ${word}; run playbook help`);
  if (opts.help) return { print: helpPage(name) };
  if (name === 'help' && args[0] !== undefined && !commandNamed(args[0])) throw new UsageError(`unknown command ${args[0]}; run playbook help`);
  const command = COMMANDS[name];
  if (args.length < (command.min ?? 0) || args.length > (command.max ?? 0)) throw new UsageError('', { usage: name });
  const stray = set.find((o) => o !== 'help' && !command.options.includes(o));
  if (stray) throw new UsageError(`--${stray} does not go with ${name}`, { usage: name });
  for (const group of command.oneOf ?? []) if (group.filter((o) => set.includes(o)).length > 1) throw new UsageError(`${group.map((o) => `--${o}`).join(' and ')} do not go together`, { usage: name });
  const wrong = command.validate?.(opts);
  if (wrong) throw new UsageError(wrong, { usage: name });
  return { opts, command, args };
}

function main(argv) {
  try {
    const { print, opts, command, args } = parseCli(argv);
    if (print) {
      process.stdout.write(`${print}\n`);
      return 0;
    }
    const { out, status } = command.run(opts, args);
    process.stdout.write(typeof out === 'string' ? `${out}\n` : `${JSON.stringify(out, null, 2)}\n`);
    return status;
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
    process.stderr.write(`${e.message}\n`);
    return e.status ?? 2;
  }
}

process.exitCode = main(process.argv.slice(2));
