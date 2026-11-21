import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPlan, findThread, offHours, repingText, smeLine, topLevelText } from '../skills/ping/scripts/ping.mjs';

const config = {
  channel: 'C1',
  user: 'UME',
  repos: ['org/web', 'org/api'],
  reviewers: { alice: 'UA', bob: 'UB', 'org-team': 'UT' },
  ticketRegex: '[A-Z]{2,}-\\d+',
  ticketBaseUrl: 'https://t.example/browse/',
  timezone: 'America/New_York',
};
// 2030-01-15 is a Tuesday; 15:00Z is 10:00 in New York.
const NOW = new Date('2030-01-15T15:00:00Z');
const sec = (iso) => String(Date.parse(iso) / 1000);

const pr = (n, o = {}) => ({
  repo: 'org/web',
  number: n,
  title: `Title ${n}`,
  url: `https://git.example/org/web/pull/${n}`,
  branch: `feat/${n}`,
  baseBranch: 'main',
  state: 'OPEN',
  isDraft: false,
  author: 'me',
  reviewRequests: [],
  reviews: [],
  latestReviews: [],
  commits: [{ date: '2030-01-10T00:00:00Z' }],
  threads: [],
  checks: [],
  ...o,
});
const plan = (prs, history = [], c = config, now = NOW) => buildPlan({ prs, history, config: c, now });
const kinds = (p) => p.actions.map((a) => a.kind);
const link = (n) => `<https://git.example/org/web/pull/${n}|#${n}>`;

// A pinged PR: our top-level post at t0, with optional replies.
const pinged = (n, replies = [], ts = sec('2030-01-12T12:00:00Z')) => [{ ts, user: 'UME', text: `${link(n)}: Title ${n}`, replies }];

test('one PR: link, title, linked ticket from the branch; no greeting', () => {
  const p = plan([pr(1, { branch: 'feat/ABC-12-x' })]);
  assert.equal(p.actions[0].args.message, `${link(1)}: Title 1 (<https://t.example/browse/ABC-12|ABC-12>)`);
  assert.equal(p.actions[0].args.reply_broadcast, false);
  assert.equal(p.actions[0].args.thread_ts, undefined);
});

test('ticket: not repeated when in the title, plain without a base URL, absent without a key', () => {
  assert.equal(topLevelText([pr(1, { title: 'ABC-12 fix' })], config), `${link(1)}: ABC-12 fix`);
  assert.equal(topLevelText([pr(1, { title: 'fix ABC-12' })], { ...config, ticketBaseUrl: undefined }), `${link(1)}: fix ABC-12`);
  assert.equal(topLevelText([pr(1, { branch: 'ABC-9' })], { ...config, ticketBaseUrl: undefined }), `${link(1)}: Title 1 (ABC-9)`);
  assert.equal(topLevelText([pr(1)], config), `${link(1)}: Title 1`);
});

test('titles are escaped for the chat markup', () => {
  assert.match(topLevelText([pr(1, { title: 'a <b> & c' })], config), /a &lt;b&gt; &amp; c/);
});

test('several PRs: one top-level post with a bullet each', () => {
  const p = plan([pr(1), pr(2)]);
  const sends = p.actions.filter((a) => a.kind === 'send');
  assert.equal(sends.length, 1);
  assert.equal(sends[0].args.message, `- ${link(1)}: Title 1\n- ${link(2)}: Title 2`);
});

test('multi-repo batch uses repo#number as link text', () => {
  const api = pr(7, { repo: 'org/api', url: 'https://git.example/org/api/pull/7' });
  assert.equal(topLevelText([pr(1), api], config), `- <https://git.example/org/web/pull/1|web#1>: Title 1\n- <https://git.example/org/api/pull/7|api#7>: Title 7`);
});

test('SME line grammar: one needs, several need, Oxford list, disjunction of people', () => {
  assert.equal(smeLine(['UA', 'UB'], ['#1']), '<@UA> or <@UB>, #1 needs SME');
  assert.equal(smeLine(['UA'], ['#1', '#2']), '<@UA>, #1 and #2 need SME');
  assert.equal(smeLine(['UA'], ['#1', '#2', '#3']), '<@UA>, #1, #2, and #3 need SME');
  assert.equal(smeLine(['UA', 'UB', 'UT'], ['#1']), '<@UA>, <@UB>, or <@UT>, #1 needs SME');
});

test('SME lines group PRs by reviewer set, thread under the top-level post, skip unmapped requests', () => {
  const p = plan([
    pr(1, { reviewRequests: [{ login: 'alice' }, { login: 'bob' }] }),
    pr(2, { reviewRequests: [{ login: 'bob' }, { login: 'alice' }] }),
    pr(3, { reviewRequests: [{ login: 'alice' }] }),
    pr(4, { reviewRequests: [{ login: 'stranger' }] }),
  ]);
  const sends = p.actions.filter((a) => a.kind === 'send');
  assert.equal(sends.length, 3);
  assert.equal(sends[1].threadTsFrom, sends[0].id);
  assert.equal(sends[1].args.thread_ts, undefined);
  assert.equal(sends[1].args.message, `<@UA> or <@UB>, ${link(1)} and ${link(2)} need SME`);
  assert.equal(sends[2].args.message, `<@UA>, ${link(3)} needs SME`);
  assert.ok(sends.every((s) => s.args.reply_broadcast === false));
});

test('team review request maps through its slug', () => {
  const p = plan([pr(1, { reviewRequests: [{ slug: 'org-team' }] })]);
  assert.match(p.actions[1].args.message, /^<@UT>, /);
});

test('thread reuse: a pinged PR is never posted top-level again', () => {
  const p = plan([pr(1)], pinged(1));
  assert.deepEqual(kinds(p), ['skip']);
  assert.equal(p.actions[0].reason, 'nothing changed since the last ping or review');
});

test('thread lookup: matches the exact URL, not a longer PR number, and only our messages', () => {
  const h = [{ ts: '1', user: 'UME', text: 'https://git.example/org/web/pull/12' }, { ts: '2', user: 'UOTHER', text: link(1) }];
  assert.equal(findThread(h, config, pr(1)), null);
  assert.equal(findThread(h, config, pr(12)).ts, '1');
});

test('thread lookup: a link inside a reply resolves to the thread root', () => {
  const h = [{ ts: '5', user: 'UOTHER', text: 'x', replies: [{ ts: '6', user: 'UME', text: link(1) }] }];
  assert.equal(findThread(h, config, pr(1)).ts, '5');
});

const approvedDismissed = (extra = {}) =>
  pr(1, {
    reviews: [{ author: 'alice', state: 'DISMISSED', submittedAt: '2030-01-13T00:00:00Z' }],
    commits: [{ date: '2030-01-14T00:00:00Z' }],
    ...extra,
  });

test('re-ping: approval dismissed by a newer push, tags only that reviewer, fixed wording', () => {
  const p = plan([approvedDismissed({ reviewRequests: [{ login: 'bob' }] })], pinged(1));
  assert.equal(p.actions[0].kind, 'send');
  assert.equal(p.actions[0].args.message, `<@UA>, ${link(1)} needs re-approval: new commits since your review`);
  assert.equal(p.actions[0].args.thread_ts, pinged(1)[0].ts);
  assert.equal(p.actions[0].args.reply_broadcast, false);
});

test('no re-ping for a dismissal we already pinged after', () => {
  const h = pinged(1, [{ ts: sec('2030-01-14T06:00:00Z'), user: 'UME', text: 'ping' }]);
  assert.equal(plan([approvedDismissed()], h).actions[0].kind, 'skip');
});

const feedback = (extra = {}) =>
  pr(1, {
    reviews: [{ author: 'alice', state: 'CHANGES_REQUESTED', submittedAt: '2030-01-13T00:00:00Z' }],
    commits: [{ date: '2030-01-10T00:00:00Z' }, { date: '2030-01-14T00:00:00Z' }],
    threads: [{ resolved: true }, { resolved: false, lastAuthor: 'me' }],
    ...extra,
  });

test('re-ping: feedback addressed, with a new commit and threads resolved or author-answered', () => {
  const p = plan([feedback()], pinged(1));
  assert.equal(p.actions[0].args.message, `<@UA>, ${link(1)}: feedback addressed, ready for another look`);
});

test('no re-ping when feedback has no new commit, or a thread still awaits the author', () => {
  assert.equal(plan([feedback({ commits: [{ date: '2030-01-10T00:00:00Z' }] })], pinged(1)).actions[0].kind, 'skip');
  assert.equal(plan([feedback({ threads: [{ resolved: false, lastAuthor: 'alice' }] })], pinged(1)).actions[0].kind, 'skip');
});

test('bots and the author are not reviewers', () => {
  const only = { reviews: [{ author: 'ci[bot]', state: 'COMMENTED', submittedAt: '2030-01-13T00:00:00Z' }, { author: 'me', state: 'COMMENTED', submittedAt: '2030-01-13T00:00:00Z' }] };
  assert.equal(plan([feedback(only)], pinged(1)).actions[0].kind, 'skip');
  const approvedByBot = pr(1, { latestReviews: [{ author: 'ci[bot]', state: 'APPROVED' }] });
  assert.equal(plan([approvedByBot]).actions[0].kind, 'send');
  const approvedByApp = pr(1, { latestReviews: [{ author: 'cursor', bot: true, state: 'APPROVED' }] });
  assert.equal(plan([approvedByApp]).actions[0].kind, 'send');
});

test('needs-reply: a reviewer question is last in the thread', () => {
  const h = pinged(1, [{ ts: sec('2030-01-13T00:00:00Z'), user: 'UA', text: 'why this approach?' }]);
  const a = plan([pr(1)], h).actions[0];
  assert.equal(a.kind, 'needs-reply');
  assert.equal(a.thread_ts, h[0].ts);
  assert.equal(a.question.text, 'why this approach?');
});

test('no needs-reply when our message is last, or the last message is not a question', () => {
  const answered = pinged(1, [{ ts: sec('2030-01-13T00:00:00Z'), user: 'UA', text: 'why?' }, { ts: sec('2030-01-13T01:00:00Z'), user: 'UME', text: 'because' }]);
  assert.equal(plan([pr(1)], answered).actions[0].kind, 'skip');
  const thanks = pinged(1, [{ ts: sec('2030-01-13T00:00:00Z'), user: 'UA', text: 'thanks' }]);
  assert.equal(plan([pr(1)], thanks).actions[0].kind, 'skip');
});

test('skips with reasons: draft, closed, merged, already approved, conflicts, failing checks, CI pending', () => {
  const reasons = (o) => plan([pr(1, o)]).actions[0].reason;
  assert.equal(reasons({ isDraft: true }), 'draft');
  assert.equal(reasons({ state: 'CLOSED' }), 'closed');
  assert.equal(reasons({ state: 'MERGED' }), 'merged');
  assert.equal(reasons({ latestReviews: [{ author: 'alice', state: 'APPROVED' }] }), 'already approved');
  assert.equal(reasons({ conflicting: true }), 'merge conflicts');
  assert.equal(reasons({ checks: [{ bucket: 'pass' }, { bucket: 'fail' }] }), 'required checks failing');
  assert.equal(reasons({ checks: [{ bucket: 'pending' }] }), 'CI pending');
});

test('a skipped PR is left out of the top-level post', () => {
  const p = plan([pr(1), pr(2, { isDraft: true })]);
  assert.equal(p.actions.find((a) => a.kind === 'send').args.message, `${link(1)}: Title 1`);
});

test('one top-level ask per day: later PRs and the SME line reply in today\'s thread', () => {
  const today = [{ ts: sec('2030-01-15T13:00:00Z'), user: 'UME', text: link(9) }];
  const p = plan([pr(1, { reviewRequests: [{ login: 'alice' }] })], today);
  const sends = p.actions.filter((a) => a.kind === 'send');
  assert.equal(sends.length, 2);
  for (const s of sends) {
    assert.equal(s.args.thread_ts, today[0].ts);
    assert.equal(s.args.reply_broadcast, false);
    assert.equal(s.threadTsFrom, undefined);
  }
});

test('an ask from another day, or another user, does not count as today', () => {
  const old = [{ ts: sec('2030-01-14T13:00:00Z'), user: 'UME', text: link(9) }, { ts: sec('2030-01-15T13:00:00Z'), user: 'UOTHER', text: link(8) }];
  assert.equal(plan([pr(1)], old).actions[0].args.thread_ts, undefined);
});

test('"today" follows the config timezone', () => {
  // 03:00Z on the 15th is still the 14th in New York.
  const h = [{ ts: sec('2030-01-15T03:00:00Z'), user: 'UME', text: link(9) }];
  assert.equal(plan([pr(1)], h).actions[0].args.thread_ts, undefined);
});

test('stack: base-first block with fixed header', () => {
  const a = pr(1, { branch: 'a' });
  const b = pr(2, { branch: 'b', baseBranch: 'c' });
  const c = pr(3, { branch: 'c', baseBranch: 'a' });
  const msg = plan([b, c, a]).actions[0].args.message;
  assert.equal(msg, `Stack, review in this order:\n- ${link(1)}: Title 1\n- ${link(3)}: Title 3\n- ${link(2)}: Title 2`);
});

test('stack beside a single PR: singles first, blank line, then the block', () => {
  const msg = topLevelText([pr(5), pr(1, { branch: 'a' }), pr(2, { baseBranch: 'a' })], config);
  assert.equal(msg, `- ${link(5)}: Title 5\n\nStack, review in this order:\n- ${link(1)}: Title 1\n- ${link(2)}: Title 2`);
});

test('a child of an open PR outside the batch is skipped unless the parent was pinged', () => {
  const child = pr(2, { baseBranch: 'a', parent: 1 });
  assert.equal(plan([child]).actions[0].reason, 'parent #1 not pinged');
  assert.equal(plan([child], pinged(1)).actions[0].kind, 'send');
});

test('working hours: sends and needs-reply become holds, skips stay', () => {
  const c = { ...config, hours: { start: '08:30', end: '17:30', weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] } };
  assert.equal(offHours(NOW, c), null);
  const night = new Date('2030-01-16T03:00:00Z'); // 22:00 Tuesday in New York
  const q = pinged(2, [{ ts: sec('2030-01-13T00:00:00Z'), user: 'UA', text: 'why?' }]);
  const p = plan([pr(1), pr(2), pr(3, { isDraft: true })], q, c, night);
  assert.deepEqual(kinds(p), ['hold', 'skip', 'hold']);
  assert.match(p.actions[0].reason, /outside working hours/);
  assert.equal(p.actions[0].args, undefined);
  assert.equal(offHours(new Date('2030-01-19T15:00:00Z'), c) !== null, true); // Saturday
  assert.equal(offHours(new Date('2030-01-15T22:29:00Z'), c), null); // 17:29
  assert.notEqual(offHours(new Date('2030-01-15T22:30:00Z'), c), null); // 17:30
});

test('self-check: a signature or an unlinked reference throws', () => {
  assert.throws(() => plan([pr(1, { title: 'Sent using a client' })]), /Sent using/);
  const leaky = { ...config, ticketBaseUrl: undefined, ticketRegex: 'b#\\d+' };
  assert.throws(() => plan([pr(1, { branch: 'b#77' })], [], leaky), /not a link/);
  assert.doesNotThrow(() => plan([pr(1, { title: 'Fix #12 crash' })]));
});
