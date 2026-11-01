// What packs need that reads no playbook: fetching a source, reading a pack, the lock, and editing rulesync.jsonc. This file
// never needs a pstack, so `check --locked` runs on it alone.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export class PackError extends Error {}

export const PACK_NAME = /^[a-z0-9][a-z0-9-]*$/;
const LOCKED_FILE = /^[^/\\]+\.md$/;
const SLUG = /^[\w][\w.-]*\/[\w][\w.-]*$/;
const isDir = (path) => statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false;
/** Never follows a link, so a symlink at a pack file's path is not one, and nothing reads or writes through it. */
export const isPlainFile = (path) => lstatSync(path, { throwIfNoEntry: false })?.isFile() ?? false;

export const hashOf = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
export const isForgeSource = (source) => SLUG.test(source) && !source.startsWith('.');

/** A `--from` value as the manifest records it: a slug stays one, and a folder becomes a path relative to `base`. */
export function sourceId(from, base) {
  if (isForgeSource(from)) return from;
  const abs = resolve(from);
  if (isDir(abs)) {
    const rel = relative(base, abs);
    return isAbsolute(rel) ? abs : rel.startsWith('..') ? rel : `.${sep}${rel}`;
  }
  throw new PackError(`--from ${from}: not a folder, and not an owner/repo`);
}

function gitOut(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

function onPath(name) {
  return spawnSync(name, ['--version'], { encoding: 'utf8' }).status === 0;
}

/**
 * Clones a slug with the person's own login: `gh` when it is installed, else git over ssh. PLAYBOOKS_GIT_BASE points git
 * at another forge or a local mirror, as <base>/<owner>/<repo>.
 */
function cloneSlug(slug, dir) {
  const base = process.env.PLAYBOOKS_GIT_BASE;
  const run = base || !onPath('gh')
    ? spawnSync('git', ['clone', '-q', '--depth', '1', '--', base ? `${base}/${slug}` : `git@github.com:${slug}.git`, dir], { encoding: 'utf8' })
    : spawnSync('gh', ['repo', 'clone', slug, dir, '--', '-q', '--depth', '1'], { encoding: 'utf8' });
  if (run.error || run.status !== 0) throw new PackError(`cannot fetch ${slug}: ${(run.stderr || run.error?.message || '').trim()}`);
}

/** Fetches each source once per run, and removes every clone on `close`. */
export function fetcher(base) {
  const clones = new Map();
  const temps = [];
  return {
    get(source) {
      if (clones.has(source)) return clones.get(source);
      let found;
      if (isForgeSource(source)) {
        const temp = mkdtempSync(join(tmpdir(), 'playbook-pack-'));
        temps.push(temp);
        const dir = join(temp, 'source');
        cloneSlug(source, dir);
        found = { dir, commit: gitOut(dir, ['rev-parse', 'HEAD']), dirty: false };
      } else {
        const dir = resolve(base, source);
        if (!isDir(dir)) throw new PackError(`${source}: the source folder is missing`);
        const inGit = gitOut(dir, ['rev-parse', '--is-inside-work-tree']) === 'true';
        found = { dir, commit: inGit ? gitOut(dir, ['rev-parse', 'HEAD']) : null, dirty: inGit && gitOut(dir, ['status', '--porcelain', '--', 'packs']) !== '' };
      }
      clones.set(source, found);
      return found;
    },
    close: () => temps.forEach((temp) => rmSync(temp, { recursive: true, force: true })),
  };
}

const plainMarkdown = (dir, shown) => {
  if (!isDir(dir)) return new Map();
  const out = new Map();
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith('.md')) continue;
    if (!lstatSync(join(dir, name)).isFile()) throw new PackError(`${shown}/${name}: not a plain file, so the pack cannot ship it`);
    out.set(name, readFileSync(join(dir, name)));
  }
  return out;
};

/** The first of a pack's paths that a symlink carries out of its source, because a clone must not copy from the installer's disk. */
export function packEscape(sourceDir, name) {
  const top = realpathSync(sourceDir);
  for (const sub of ['', '/pack.json', '/playbooks', '/skills', '/rules']) {
    const shown = `packs/${name}${sub}`;
    try {
      const real = realpathSync(join(sourceDir, shown));
      if (real !== top && !real.startsWith(`${top}${sep}`)) return shown;
    } catch (e) {
      if (e.code === 'ELOOP') return shown;
    }
  }
  return null;
}

/** One pack as its source holds it. Paths in errors are source-relative, so they name the file to fix. */
export function readPack(sourceDir, name, source) {
  const escape = packEscape(sourceDir, name);
  if (escape) throw new PackError(`${escape}: a symlink leaves ${source}, so the pack cannot ship it`);
  const root = join(sourceDir, 'packs', name);
  const manifest = `packs/${name}/pack.json`;
  let meta;
  try {
    meta = JSON.parse(readFileSync(join(root, 'pack.json'), 'utf8'));
  } catch (e) {
    throw new PackError(`${manifest}: ${e.code === 'ENOENT' ? `${source} has no such pack` : e.message}`);
  }
  if (meta?.name !== name) throw new PackError(`${manifest}: "name" must be ${name}`);
  const requires = meta.requires ?? [];
  if (!Array.isArray(requires) || !requires.every((r) => typeof r === 'string' && PACK_NAME.test(r))) throw new PackError(`${manifest}: "requires" must be an array of pack names`);
  return {
    name,
    source,
    requires,
    playbooks: plainMarkdown(join(root, 'playbooks'), `packs/${name}/playbooks`),
    hasSkills: isDir(join(root, 'skills')),
    hasRules: isDir(join(root, 'rules')),
    skillNames: isDir(join(root, 'skills')) ? readdirSync(join(root, 'skills')).filter((n) => isDir(join(root, 'skills', n))).sort() : [],
    ruleNames: isDir(join(root, 'rules')) ? readdirSync(join(root, 'rules')).filter((n) => n.endsWith('.md')).map((n) => n.slice(0, -3)).sort() : [],
  };
}

/** Reads `names` and what they require, requirements first. `known(name)` gives a source, or null when the pack stays as locked. */
export function resolvePacks(names, sourceOf, fetch, locked) {
  const order = [];
  const seen = new Set();
  const visit = (name, source, from, path) => {
    if (path.includes(name)) throw new PackError(`packs/${path.at(-1)}/pack.json: requires a cycle: ${[...path.slice(path.indexOf(name)), name].join(' -> ')}`);
    if (seen.has(name)) return;
    const pack = readPack(fetch.get(source).dir, name, source);
    for (const req of pack.requires) {
      if (seen.has(req) || path.includes(req)) {
        visit(req, source, name, [...path, name]);
        continue;
      }
      if (locked.has(req) && !names.includes(req)) continue;
      let required;
      try {
        visit(req, sourceOf(req) ?? source, name, [...path, name]);
        required = true;
      } catch (e) {
        if (!(e instanceof PackError) || !e.message.startsWith(`packs/${req}/pack.json: `) || !e.message.includes('has no such pack')) throw e;
      }
      if (!required) throw new PackError(`packs/${name}/pack.json: requires ${req}, which ${source} does not ship`);
    }
    seen.add(name);
    order.push(pack);
  };
  for (const name of names) visit(name, sourceOf(name), null, []);
  return order;
}

/** What is wrong with a lock's names, since `update` and `remove` build paths from them and delete there. */
function lockNameProblem(packs, files) {
  for (const [name, pack] of Object.entries(packs)) if (!PACK_NAME.test(name) || typeof pack !== 'object' || pack === null) return `${JSON.stringify(name)} is not a pack name with an entry`;
  for (const [name, entry] of Object.entries(files)) {
    if (!LOCKED_FILE.test(name)) return `${JSON.stringify(name)} is not a plain .md file name`;
    if (entry?.pack !== null && !PACK_NAME.test(entry?.pack ?? '')) return `${JSON.stringify(name)} names no valid pack`;
  }
  return null;
}

/**
 * A lock as { packs, files, legacy }, or { error }. The flat shape from before packs, { source, commit, files: { name: hash } },
 * reads with a null pack per file, so its hashes still verify. A linked pack has no files here, only `link` and its path.
 */
export function readLock(path) {
  if (!existsSync(path)) return null;
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    return { error: e.message };
  }
  if (!raw || typeof raw.files !== 'object' || raw.files === null) return { error: '"files" must be an object' };
  const lock = raw.packs
    ? { packs: raw.packs, files: raw.files, legacy: false }
    : { packs: {}, files: Object.fromEntries(Object.entries(raw.files).map(([name, hash]) => [name, { pack: null, hash }])), legacy: true };
  const error = lockNameProblem(lock.packs, lock.files);
  return error ? { error } : lock;
}

export function readManifest(path) {
  if (!existsSync(path)) return { packs: [] };
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    if (!Array.isArray(raw?.packs)) return { packs: [], error: '"packs" must be an array' };
    const bad = raw.packs.find((p) => typeof p?.name !== 'string' || !PACK_NAME.test(p.name));
    return bad ? { packs: [], error: `${JSON.stringify(bad?.name)} is not a pack name` } : raw;
  } catch (e) {
    return { packs: [], error: e.message };
  }
}

/** A repo's lock reaches people who do not have the linked folder, and an update would link to a clone it then deletes. */
export const repoLinkProblem = (lock) => {
  const name = Object.keys(lock.packs).find((n) => lock.packs[n]?.link);
  return name ? `${name} has "link", and only a --user pack may link; delete it from the lock and the manifest, then run playbook update` : null;
};

/** Offline: each locked file holds its locked bytes, and the manifest and the lock name the same packs. */
export function lockProblems({ lockPath, lockShown, manifestPath, manifestShown, fileOf, shownOf, user }) {
  const lock = readLock(lockPath);
  if (!lock) return { problems: [], info: [], count: 0, found: false };
  if (lock.error) return { problems: [{ path: lockShown, line: 1, message: `not a valid lock: ${lock.error}` }], info: [], count: 0, found: true };
  const problems = [];
  const info = [];
  for (const [name, entry] of Object.entries(lock.files).sort()) {
    const path = fileOf(name, entry);
    if (!existsSync(path)) problems.push({ path: shownOf(name, entry), line: 1, message: `the lock pins it, but it is missing; run playbook update` });
    else if (!isPlainFile(path) || hashOf(readFileSync(path)) !== entry.hash) problems.push({ path: shownOf(name, entry), line: 1, message: `hand-edited: its bytes differ from the lock${entry.pack ? ` (pack ${entry.pack})` : ''}; change it in the pack's source, or restore it` });
  }
  const repoLink = user ? null : repoLinkProblem(lock);
  if (repoLink) problems.push({ path: lockShown, line: 1, message: repoLink });
  const links = Object.entries(lock.packs).filter(([, p]) => user && p.link);
  for (const [name, pack] of links) {
    const target = join(pack.source, 'packs', name, 'playbooks');
    if (!existsSync(target)) problems.push({ path: lockShown, line: 1, message: `${name} links to ${target}, which is missing` });
  }
  if (lock.legacy) info.push({ path: lockShown, line: 1, message: 'holds no packs, so it is the flat shape from before them; playbook install <pack> rewrites it' });
  else {
    const manifest = readManifest(manifestPath);
    if (manifest.error) problems.push({ path: manifestShown, line: 1, message: `not a valid manifest: ${manifest.error}` });
    const listed = manifest.packs.map((p) => p.name);
    for (const name of listed.filter((n) => !lock.packs[n])) problems.push({ path: manifestShown, line: 1, message: `lists ${name}, which the lock does not; run playbook install ${name}` });
    for (const name of Object.keys(lock.packs).filter((n) => !manifest.error && !listed.includes(n))) problems.push({ path: lockShown, line: 1, message: `pins ${name}, which the manifest does not list; run playbook remove ${name}` });
  }
  return { problems, info, count: Object.keys(lock.files).length, linked: links.length, found: true };
}

/** The text with comments blanked and, when `strings` is set, string contents too, keeping every offset. */
function mask(text, strings) {
  const out = text.split('');
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') {
      for (i++; i < text.length && text[i] !== '"'; i++) {
        if (text[i] === '\\') {
          if (strings) out[i] = ' ';
          i++;
        }
        if (strings && i < text.length) out[i] = ' ';
      }
    } else if (text[i] === '/' && text[i + 1] === '/') {
      for (; i < text.length && text[i] !== '\n'; i++) out[i] = ' ';
    } else if (text[i] === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? text.length : end + 2;
      for (; i < stop; i++) if (text[i] !== '\n') out[i] = ' ';
      i--;
    }
  }
  return out.join('');
}

export function parseJsonc(text) {
  const shape = mask(text, true);
  const chars = mask(text, false).split('');
  for (let i = 0; i < chars.length; i++) {
    if (shape[i] !== ',') continue;
    let j = i + 1;
    while (/\s/.test(shape[j] ?? '')) j++;
    if (shape[j] === '}' || shape[j] === ']') chars[i] = ' ';
  }
  return JSON.parse(chars.join(''));
}

const closeOf = (shape, open) => {
  let depth = 0;
  for (let i = open; i < shape.length; i++) {
    if (shape[i] === '{' || shape[i] === '[') depth++;
    if (shape[i] === '}' || shape[i] === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new PackError('rulesync.jsonc: unbalanced brackets');
};

/** The offsets of the root object and of its `sources` array, if it has one. */
function layout(text) {
  const shape = mask(text, true);
  const rootOpen = shape.indexOf('{');
  if (rootOpen === -1) throw new PackError('rulesync.jsonc: no root object');
  const rootClose = closeOf(shape, rootOpen);
  let depth = 0;
  for (let i = rootOpen; i < rootClose; i++) {
    if (shape[i] === '{' || shape[i] === '[') depth++;
    if (shape[i] === '}' || shape[i] === ']') depth--;
    if (depth === 1 && text.startsWith('"sources"', i) && shape[i + 8] === '"') {
      const open = shape.indexOf('[', i);
      return { shape, rootClose, open, close: closeOf(shape, open) };
    }
  }
  return { shape, rootClose, open: -1, close: -1 };
}

const lastSignificant = (shape, before) => {
  let i = before - 1;
  while (i >= 0 && /\s/.test(shape[i])) i--;
  return i;
};

const entryText = (entry, indent) => {
  const rows = Object.entries(entry).map(([key, value]) => `${indent}  ${JSON.stringify(key)}: ${JSON.stringify(value)},`);
  return `${indent}{\n${rows.join('\n').replace(/,$/, '')}\n${indent}}`;
};

/** Adds one entry to `sources`, editing only the text around it, so every comment and the file's own format survive. */
export function addSource(text, entry) {
  const { shape, rootClose, open, close } = layout(text);
  if (open === -1) {
    const last = lastSignificant(shape, rootClose);
    const comma = shape[last] === '{' || shape[last] === ',' ? '' : ',';
    return `${text.slice(0, last + 1)}${comma}\n  "sources": [\n${entryText(entry, '    ')}\n  ]\n${text.slice(rootClose)}`;
  }
  const last = lastSignificant(shape, close);
  const empty = last === open;
  const trailing = shape[last] === ',';
  const lead = text.slice(0, last + 1);
  const between = text.slice(last + 1, close).replace(/\s+$/, '');
  const closeIndent = /\n([ \t]*)$/.exec(text.slice(0, close))?.[1] ?? '  ';
  const body = entryText(entry, `${closeIndent}  `);
  return `${lead}${empty || trailing ? '' : ','}${between}\n${body}${trailing ? ',' : ''}\n${closeIndent}${text.slice(close)}`;
}

/** Removes the entry whose `source` is `key`, with its line and comma. Returns the text unchanged when there is none. */
export function removeSource(text, key) {
  const { shape, open, close } = layout(text);
  if (open === -1) return text;
  for (let i = open + 1; i < close; i++) {
    if (shape[i] !== '{') continue;
    const end = closeOf(shape, i);
    if (parseJsonc(text.slice(i, end + 1)).source === key) {
      let from = i;
      while (from > 0 && (text[from - 1] === ' ' || text[from - 1] === '\t')) from--;
      if (text[from - 1] === '\n') from--;
      let to = end + 1;
      while (/\s/.test(shape[to]) && shape[to] !== '\n') to++;
      if (shape[to] === ',') to++;
      return text.slice(0, from) + text.slice(to);
    }
    i = end;
  }
  return text;
}

/**
 * The rulesync source for a pack, or null when it ships neither skills nor rules. The repo path sits in `source`, after a
 * colon: rulesync 15 locks by `source`, and skips a second entry that shares one, whatever its `path` says.
 */
export function rulesyncEntry(pack) {
  if (!pack.hasSkills && !pack.hasRules) return null;
  const rules = { rules: ['*'], rulesPath: `packs/${pack.name}/rules` };
  if (pack.hasSkills) return { source: `${pack.source}:packs/${pack.name}/skills`, skills: ['*'], ...(pack.hasRules ? rules : {}) };
  return { source: `${pack.source}:packs/${pack.name}/rules`, ...rules };
}

export const rulesyncKeys = (source, name) => [`${source}:packs/${name}/skills`, `${source}:packs/${name}/rules`];
