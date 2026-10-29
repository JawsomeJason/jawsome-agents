---
name: smart-usage
description: "Claude Code only: reports how the claudecode-smart-usage effort picker has been choosing, from its local pick log: which levels Jev picks, how many it applied and why the rest were not, how sure it was, how fast it answered, and the newest prompts per level. Use for an effort report, \"how's the effort picker doing\", \"is auto effort working\", \"why is effort always low\", /smart-usage, or /effort-report."
compatibility: Requires Claude Code with the claudecode-smart-usage plugin, and bun on the path
argument-hint: "report [--days N] [--html]"
---

# Smart usage

The mod appends one line per Jev pick to `$HOME/.claude/smart-usage/picks.jsonl`, unless its `log` option is off. `scripts/report.ts` does all the counting, so the numbers come from the log and never from a read of it by eye.

## Verbs

| Verb | Does |
| --- | --- |
| `report [--days N] [--html]` | Sums up the pick log, over the last N days when given. |

With no verb, print the table above and stop.

## report

1. Run `bun "${CLAUDE_PLUGIN_ROOT}/scripts/report.ts"`, adding `--days N` when the person names a window ("this week" is 7). With `--html`, add `--json` too.
2. Without `--html`, relay the script's output as it printed it.
3. With `--html`, render one page from the JSON: the level distribution, applied against not applied with each reason, the probability spread against the threshold, and the example prompts per level. Fire the `personal:html` skill for it when that skill is available; otherwise write one self-contained HTML file from the JSON yourself. The log holds the person's prompts, so the page stays a local file: never publish it, upload it or share a link to it. Give its path.
4. Close with a read of two or three lines: whether picks skew to one level, whether many picks went unapplied and the main reason why, and which example prompts look mislabeled for their level.

An empty or missing log means nothing was picked yet: the mod needs `TYPESAFE_API_KEY`, a `mode` other than `off`, and `log` left on. Say which of those to check.

Never edit the effort criteria or the plugin's options on your own. When the read suggests the rubric is off, offer tuning the criteria (a `tiersFile`, as the plugin README describes) as a next step.
