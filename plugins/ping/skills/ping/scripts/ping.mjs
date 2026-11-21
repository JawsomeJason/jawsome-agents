#!/usr/bin/env node
// Decides which review-ask messages to post. It never calls the chat service: the agent saves channel history as JSON,
// this script reads it with the pull request data and writes a plan of actions the agent sends verbatim.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const defaultConfigPath = () => join(homedir(), '.config', 'jawsome', 'ping.json');
export const planPathFor = (configPath, config) => config.planFile ?? join(dirname(configPath), 'ping-plan.json');

const BOT = /\[bot\]$|^app\/|bot$/i;
const isHuman = (login, author) => !!login && login !== author && !BOT.test(login);
const tsMs = (ts) => Number(ts) * 1000;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const shortRepo = (repo) => repo.split('/').pop();
const urlRe = (url) => new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w/-])');

// ---- format ----

export function ticketOf(pr, config) {
  if (!config.ticketRegex) return null;
  const m = new RegExp(config.ticketRegex).exec(`${pr.title} ${pr.branch ?? ''}`);
  return m ? m[0] : null;
}

const label = (pr, multiRepo) => `<${pr.url}|${multiRepo ? shortRepo(pr.repo) : ''}#${pr.number}>`;

export function prLine(pr, config, multiRepo) {
  const key = ticketOf(pr, config);
  let line = `${label(pr, multiRepo)}: ${esc(pr.title)}`;
  if (key && !pr.title.includes(key)) {
    const link = config.ticketBaseUrl ? `<${config.ticketBaseUrl}${key}|${key}>` : key;
    line += ` (${link})`;
  }
  return line;
}

// Pull requests whose base branch is another pull request in the batch form a stack, ordered base-first.
export function groupStacks(prs) {
  const parentOf = (pr) => prs.find((p) => p !== pr && p.repo === pr.repo && p.branch === pr.baseBranch);
  const depth = (pr) => (parentOf(pr) ? 1 + depth(parentOf(pr)) : 0);
  const stacked = new Set(prs.filter((p) => parentOf(p) || prs.some((c) => parentOf(c) === p)));
  const stack = prs.filter((p) => stacked.has(p)).sort((a, b) => depth(a) - depth(b));
  return { singles: prs.filter((p) => !stacked.has(p)), stack };
}

export const STACK_HEADER = 'Stack, review in this order:';

export function topLevelText(prs, config) {
  const multiRepo = new Set(prs.map((p) => p.repo)).size > 1;
  const line = (p) => prLine(p, config, multiRepo);
  const { singles, stack } = groupStacks(prs);
  if (prs.length === 1) return line(prs[0]);
  const blocks = [];
  if (singles.length) blocks.push(singles.map((p) => `- ${line(p)}`).join('\n'));
  if (stack.length) blocks.push([STACK_HEADER, ...stack.map((p) => `- ${line(p)}`)].join('\n'));
  return blocks.join('\n\n');
}

export function smeLine(slackIds, items) {
  const who = new Intl.ListFormat('en-US', { type: 'disjunction' }).format(slackIds.map((id) => `<@${id}>`));
  return `${who}, ${new Intl.ListFormat('en-US').format(items)} ${items.length === 1 ? 'needs' : 'need'} SME`;
}

// Slack ids of the pending review requests that the config maps to people (users by login, teams by slug).
export function pendingSlackIds(pr, config) {
  const ids = (pr.reviewRequests ?? []).map((r) => config.reviewers?.[r.login ?? r.slug]).filter(Boolean);
  return [...new Set(ids)].sort();
}

// ---- thread lookup ----

// The thread root of the configured user's earlier message that links the pull request, or null.
export function findThread(history, config, pr) {
  const re = urlRe(pr.url);
  const hit = history
    .flatMap((m) => [m, ...(m.replies ?? []).map((r) => ({ ...r, thread_ts: r.thread_ts ?? m.ts }))])
    .filter((m) => m.user === config.user && re.test(m.text ?? ''))
    .sort((a, b) => tsMs(a.ts) - tsMs(b.ts))[0];
  if (!hit) return null;
  const root = history.find((m) => m.ts === (hit.thread_ts ?? hit.ts));
  const replies = (root?.replies ?? []).filter((r) => r.ts !== root.ts);
  return { ts: hit.thread_ts ?? hit.ts, messages: root ? [root, ...replies] : [hit] };
}

// ---- decision ----

const date = (s) => Date.parse(s);

export function decide(pr, thread, config) {
  if (pr.state !== 'OPEN') return { skip: pr.state === 'MERGED' ? 'merged' : 'closed' };
  if (pr.isDraft) return { skip: 'draft' };
  const reviews = (pr.reviews ?? []).filter((r) => !r.bot && isHuman(r.author, pr.author));
  const current = (pr.latestReviews ?? []).filter((r) => !r.bot && isHuman(r.author, pr.author));
  if (current.some((r) => r.state === 'APPROVED')) return { skip: 'already approved' };
  if (pr.conflicting) return { skip: 'merge conflicts' };
  if ((pr.checks ?? []).some((c) => c.bucket === 'fail')) return { skip: 'required checks failing' };
  if ((pr.checks ?? []).some((c) => c.bucket === 'pending')) return { skip: 'CI pending' };
  if (!thread) return { post: true };

  const lastUser = Math.max(...thread.messages.filter((m) => m.user === config.user).map((m) => tsMs(m.ts)));
  const lastReview = Math.max(0, ...reviews.map((r) => date(r.submittedAt)));
  const base = Math.max(lastUser, lastReview);
  const lastCommit = Math.max(0, ...(pr.commits ?? []).map((c) => date(c.date)));
  const reasons = [];

  const dismissed = reviews.filter((r) => r.state === 'DISMISSED' && lastCommit > date(r.submittedAt));
  if (dismissed.length && lastCommit > base) reasons.push({ code: 'dismissed', who: dismissed.map((r) => r.author) });

  const feedback = reviews.filter((r) => r.state === 'COMMENTED' || r.state === 'CHANGES_REQUESTED');
  const lastFeedback = Math.max(0, ...feedback.map((r) => date(r.submittedAt)));
  const threadsDone = (pr.threads ?? []).every((t) => t.resolved || t.lastAuthor === pr.author);
  if (feedback.length && lastCommit > lastFeedback && lastCommit > base && threadsDone) {
    reasons.push({ code: 'addressed', who: feedback.map((r) => r.author) });
  }

  const last = [...thread.messages].sort((a, b) => tsMs(a.ts) - tsMs(b.ts)).at(-1);
  if (last.user !== config.user && /\?/.test(last.text ?? '') && tsMs(last.ts) > base) {
    return { needsReply: last, changed: reasons.map((r) => r.code) };
  }
  if (reasons.length) return { reping: reasons };
  return { skip: 'nothing changed since the last ping or review' };
}

const andList = (ids) => new Intl.ListFormat('en-US').format(ids.map((id) => `<@${id}>`));

// Fixed wording per reason; only the reviewers whose reviews it concerns are tagged.
export function repingText(pr, reasons, config, multiRepo) {
  const link = label(pr, multiRepo);
  return reasons
    .map((r) => {
      const ids = [...new Set(r.who.map((l) => config.reviewers?.[l]).filter(Boolean))].sort();
      const tag = ids.length ? `${andList(ids)}, ` : '';
      return r.code === 'dismissed' ? `${tag}${link} needs re-approval: new commits since your review` : `${tag}${link}: feedback addressed, ready for another look`;
    })
    .join('\n');
}

// ---- time ----

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function localParts(now, timeZone = 'UTC') {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map((x) => [x.type, x.value]));
  return { day: p.weekday, minutes: Number(p.hour) * 60 + Number(p.minute), date: `${p.year}-${p.month}-${p.day}` };
}

const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

// A reason string when `now` falls outside the configured working hours, else null.
export function offHours(now, config) {
  const h = config.hours;
  if (!h) return null;
  const t = localParts(now, config.timezone);
  if (h.weekdays.includes(t.day) && t.minutes >= toMin(h.start) && t.minutes < toMin(h.end)) return null;
  return `outside working hours (${h.start}-${h.end} ${h.weekdays.join(', ')} ${config.timezone ?? 'UTC'})`;
}

// ---- plan ----

const ref = (pr) => `${pr.repo}#${pr.number}`;

const isPrAsk = (m) => /\/pull\/\d+/.test(m.text ?? '');

// The configured user's first top-level pull request ask today (in the config timezone), or null.
export function todaysThread(history, config, now) {
  const today = localParts(now, config.timezone).date;
  const m = history
    .filter((m) => m.user === config.user && (!m.thread_ts || m.thread_ts === m.ts) && isPrAsk(m) && localParts(new Date(tsMs(m.ts)), config.timezone).date === today)
    .sort((a, b) => tsMs(a.ts) - tsMs(b.ts))[0];
  return m?.ts ?? null;
}

const parentUrl = (pr) => pr.url.replace(/\/pull\/\d+/, `/pull/${pr.parent}`);

export function buildPlan({ prs, history, config, now = new Date(), dryRun = false }) {
  const actions = [];
  const add = (a) => actions.push({ id: `a${actions.length + 1}`, ...a });
  const base = { channel_id: config.channel, reply_broadcast: false };
  const multi = new Set(prs.map((p) => p.repo)).size > 1;
  const fresh = [];
  for (const pr of prs) {
    const thread = findThread(history, config, pr);
    const d = decide(pr, thread, config);
    const parentOut = d.post && pr.parent && !prs.some((p) => p.repo === pr.repo && p.number === pr.parent) && !findThread(history, config, { url: parentUrl(pr) });
    if (parentOut) add({ kind: 'skip', pr: ref(pr), reason: `parent #${pr.parent} not pinged` });
    else if (d.skip) add({ kind: 'skip', pr: ref(pr), reason: d.skip });
    else if (d.post) fresh.push(pr);
    else if (d.needsReply) {
      add({ kind: 'needs-reply', pr: ref(pr), channel_id: config.channel, thread_ts: thread.ts, question: { user: d.needsReply.user, ts: d.needsReply.ts, text: d.needsReply.text }, changed: d.changed });
    } else {
      add({ kind: 'send', pr: ref(pr), args: { ...base, thread_ts: thread.ts, message: repingText(pr, d.reping, config, multi) } });
    }
  }
  if (fresh.length) {
    // One top-level ask per day: later PRs join today's thread, and the SME lines go in the same thread.
    const daily = todaysThread(history, config, now);
    const freshMulti = new Set(fresh.map((p) => p.repo)).size > 1;
    add({ kind: 'send', pr: fresh.map(ref), args: { ...base, ...(daily ? { thread_ts: daily } : {}), message: topLevelText(fresh, config) } });
    const topId = actions.at(-1).id;
    const groups = new Map();
    for (const pr of fresh) {
      const ids = pendingSlackIds(pr, config);
      if (ids.length) groups.set(ids.join(','), [...(groups.get(ids.join(',')) ?? []), pr]);
    }
    for (const [key, group] of groups) {
      const args = { ...base, message: smeLine(key.split(','), group.map((p) => label(p, freshMulti))) };
      // A new top-level post has no timestamp until it is sent, so the agent supplies thread_ts from action topId.
      add(daily ? { kind: 'send', pr: group.map(ref), args: { ...args, thread_ts: daily } } : { kind: 'send', pr: group.map(ref), threadTsFrom: topId, args });
    }
  }
  const hold = offHours(now, config);
  const final = hold
    ? actions.map((a) => (a.kind === 'send' ? { id: a.id, kind: 'hold', pr: a.pr, reason: hold, message: a.args.message } : a.kind === 'needs-reply' ? { ...a, kind: 'hold', reason: hold } : a))
    : actions;
  const plan = { generatedAt: now.toISOString(), dryRun, channel: config.channel, actions: final };
  selfCheck(plan, prs);
  return plan;
}

// Every pull request reference must be a link, and no text may carry a client signature.
export function selfCheck(plan, prs) {
  for (const a of plan.actions) {
    const text = a.args?.message ?? a.message;
    if (text === undefined) continue;
    if (/Sent using/i.test(text)) throw new Error(`${a.id}: text contains "Sent using"`);
    let bare = text;
    for (const p of prs) bare = bare.split(esc(p.title)).join('');
    bare = bare.replace(/<[^>]*>/g, '');
    if (/#\d+/.test(bare)) throw new Error(`${a.id}: a pull request reference is not a link: ${text}`);
    for (const r of [a.pr].flat()) {
      const pr = prs.find((p) => ref(p) === r);
      if (pr && !text.includes(`<${pr.url}|`)) throw new Error(`${a.id}: ${r} is not linked in the text`);
    }
  }
}

export function preview(plan) {
  return plan.actions
    .map((a) => {
      if (a.kind === 'skip') return `skip  ${a.pr}: ${a.reason}`;
      if (a.kind === 'hold') return `hold  ${[a.pr].flat().join(', ')}: ${a.reason}`;
      if (a.kind === 'needs-reply') return `needs-reply  ${a.pr}: thread ${a.thread_ts}, "${a.question.text}"`;
      const where = a.args.thread_ts ? `thread ${a.args.thread_ts}` : a.threadTsFrom ? `thread of ${a.threadTsFrom}` : 'top-level';
      return `send  ${where}\n${a.args.message.replace(/^/gm, '      ')}`;
    })
    .join('\n');
}

// ---- gh (the only impure part) ----

const gh = (args) => JSON.parse(execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));

// A GitHub App reviewer such as `cursor` has no [bot] suffix, so only its type marks it.
const THREADS = 'query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviews(last:100){nodes{author{__typename login}}} reviewThreads(first:100){nodes{isResolved comments(last:1){nodes{author{login}}}}}}}}';

// `gh pr checks` exits non-zero while checks fail or run, but still prints the JSON.
function requiredChecks(repo, number) {
  try {
    return gh(['pr', 'checks', String(number), '-R', repo, '--required', '--json', 'name,bucket']);
  } catch (e) {
    try {
      return JSON.parse(e.stdout || '[]');
    } catch {
      return [];
    }
  }
}

export function fetchPr(repo, number) {
  const v = gh(['pr', 'view', String(number), '-R', repo, '--json', 'number,title,url,isDraft,state,headRefName,baseRefName,mergeable,mergeStateStatus,author,reviewRequests,reviews,latestReviews,commits']);
  const [o, r] = repo.split('/');
  const parent = gh(['pr', 'list', '-R', repo, '--head', v.baseRefName, '--state', 'open', '--json', 'number'])[0]?.number ?? null;
  const t = gh(['api', 'graphql', '-f', `query=${THREADS}`, '-f', `o=${o}`, '-f', `r=${r}`, '-F', `n=${number}`]);
  const bots = new Set(t.data.repository.pullRequest.reviews.nodes.filter((n) => n.author?.__typename === 'Bot').map((n) => n.author.login));
  return {
    repo,
    number: v.number,
    title: v.title,
    url: v.url,
    branch: v.headRefName,
    baseBranch: v.baseRefName,
    parent,
    conflicting: v.mergeStateStatus === 'DIRTY' || v.mergeable === 'CONFLICTING',
    checks: requiredChecks(repo, number),
    isDraft: v.isDraft,
    state: v.state,
    author: v.author?.login,
    reviewRequests: v.reviewRequests.map((q) => ({ login: q.login, slug: q.slug })),
    reviews: v.reviews.map((x) => ({ author: x.author?.login, bot: bots.has(x.author?.login), state: x.state, submittedAt: x.submittedAt })),
    latestReviews: v.latestReviews.map((x) => ({ author: x.author?.login, bot: bots.has(x.author?.login), state: x.state, submittedAt: x.submittedAt })),
    commits: v.commits.map((c) => ({ date: c.committedDate })),
    threads: t.data.repository.pullRequest.reviewThreads.nodes.map((n) => ({ resolved: n.isResolved, lastAuthor: n.comments.nodes[0]?.author?.login })),
  };
}

// "repo#12", "org/repo#12" or a pull request URL, resolved against the configured repos.
export function parseRef(text, repos) {
  const url = /github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/.exec(text);
  if (url) return { repo: url[1], number: Number(url[2]) };
  const m = /^(.*)#(\d+)$/.exec(text);
  const repo = repos.find((r) => r === m?.[1] || shortRepo(r) === m?.[1]);
  if (!m || !repo) throw new Error(`cannot resolve "${text}" against the configured repos`);
  return { repo, number: Number(m[2]) };
}

// ---- cli ----

function main(argv) {
  const opt = { pr: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') opt.dryRun = true;
    else if (a === '--pr') opt.pr.push(argv[++i]);
    else if (a.startsWith('--')) opt[a.slice(2)] = argv[++i];
    else throw new Error(`unexpected argument ${a}`);
  }
  if (opt.help) return console.log('usage: ping.mjs --history history.json [--config ping.json] [--pr ref]... [--pr-data prs.json] [--out plan.json] [--dry-run]');
  const configPath = opt.config ?? process.env.PING_CONFIG ?? defaultConfigPath();
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  for (const k of ['channel', 'user', 'repos']) if (!config[k]) throw new Error(`config is missing "${k}"`);
  const history = opt.history ? JSON.parse(readFileSync(opt.history, 'utf8')) : (() => { throw new Error('--history is required'); })();
  let prs;
  if (opt['pr-data']) prs = JSON.parse(readFileSync(opt['pr-data'], 'utf8'));
  else {
    const refs = opt.pr.length
      ? opt.pr.map((p) => parseRef(p, config.repos))
      : config.repos.flatMap((repo) => gh(['pr', 'list', '-R', repo, '--author', '@me', '--state', 'open', '--json', 'number']).map((p) => ({ repo, number: p.number })));
    prs = refs.map((r) => fetchPr(r.repo, r.number));
  }
  const plan = buildPlan({ prs, history, config, now: opt.now ? new Date(opt.now) : new Date(), dryRun: !!opt.dryRun });
  const out = opt.out ?? planPathFor(configPath, config);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(plan, null, 2) + '\n');
  console.log(preview(plan));
  console.log(`\nplan: ${out}${plan.dryRun ? ' (dry run: nothing may be sent)' : ''}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(`ping: ${e.message}`);
    process.exit(1);
  }
}
