# claudecode-smart-usage

A Claude Code plugin that spends reasoning effort where it pays. It does two things:

- **Auto effort.** When you send a prompt, a mod asks TypeSafe's Jev judgment model which effort fits the task (`low`, `medium`, `high`, `xhigh` or `max`) and applies it to that turn.
- **Deliberate subagents.** A hook blocks any subagent spawn that leaves out its model or effort, and answers with the model tiers and effort levels to pick from. A fork is exempt, since it always runs on the parent's model and effort.

`hooks/tiers.ts` is the one source for both: the effort levels the mod asks about and the model tiers the hook prints.

It works in Claude Code only. It is a mod, hooks and one Claude Code-only skill, `/smart-usage`, so `npx skills add` installs nothing from it.

## Install

```text
/plugin install claudecode-smart-usage --marketplace JawsomeJason/jawsome-agents
```

Or add the marketplace first, then install from it:

```text
/plugin marketplace add JawsomeJason/jawsome-agents
/plugin install claudecode-smart-usage@jawsome-agents
```

## Settings

Set these in `/config`, or under `pluginConfigs` in your settings file.

| Option | Default | What it does |
| --- | --- | --- |
| `mode` | `auto` | `auto` applies the picked effort to the turn's first request when Jev answers within 0.9 seconds of Enter, and the status line shows the level it applied. `suggest` shows a band above the prompt with **Apply** and **Dismiss** instead; an applied level stays on each request in the chat until you run `/effort`. `off` sends nothing. |
| `threshold` | `0.6` | The minimum probability Jev must give its pick before the mod acts. The default is untuned. |
| `skipUnder` | `30` | A follow-up shorter than this many characters keeps the current effort without asking Jev. `0` asks every time. |
| `tiersFile` | empty | An absolute path to your own tiers file. See below. |
| `log` | `true` | Appends each Jev pick to `$HOME/.claude/smart-usage/picks.jsonl`. See below. `false` writes nothing. |

### Your own tiers

Copy the object in `hooks/tiers.ts` into a JSON file, edit the effort descriptions or the model tiers, and set `tiersFile` to its path. The mod reads `efforts` from it, and the hook reads both `efforts` and `models`. A file that can't be read or parsed falls back to `hooks/tiers.ts`.

### The pick log

Each Jev answer adds one JSON line: the time, session, mode, the first 500 characters of the prompt, whether a previous prompt went with it, the picked level with its probability and every level's probability, the current and base effort, the level applied (in `suggest` mode, the level the band offered) or `null` with a `reason` (`below-threshold`, `same-level`, `timeout` or `no-answer`), the call's milliseconds and its input tokens. Each write keeps only the last 14 days and at most 2000 lines. A log that can't be written costs a debug line and never changes the pick. It holds your prompts, so it stays on your machine.

Ask `/smart-usage report` in Claude Code, or run the script yourself:

```sh
bun plugins/claudecode-smart-usage/scripts/report.ts [--days N] [--json]
```

It prints the picks per level, applied against not applied with the count per reason, the median probability and the share under the threshold, the median latency and the timeouts, and the five newest prompts per level. `/smart-usage report --html` renders the same numbers as a local page.

## What it needs and costs

- **Auto effort** needs `TYPESAFE_API_KEY` in the environment Claude Code starts from. It is optional: without the key, or without a network, the mod stays silent and the session keeps its own effort.
- Each prompt you type costs one Jev call, except short follow-ups under `skipUnder`. The call sends the prompt text, plus the previous prompt when it came within 15 minutes, to `https://api.typesafe.ai/v1/systemone` and nowhere else.
- **Deliberate subagents** needs `python3` on the path and no key.

## Limits

The mod API can rewrite the effort of each model request, but it has no call that sets the chat's own effort setting. So Claude Code's effort label and footer keep showing the chat's setting while the mod's level is in force. The status line says when that is the case.

## Check it

```sh
claude plugin validate plugins/claudecode-smart-usage
claude plugin test plugins/claudecode-smart-usage             # the mod's engine tests
bats plugins/claudecode-smart-usage/tests/require-agent-tier.bats
node --test plugins/claudecode-smart-usage/tests/report.test.mjs  # the report script, against a fixture log
bun plugins/claudecode-smart-usage/scripts/eval.ts            # live Jev picks for six reference prompts; needs the key
```

## Credit

The effort rubric in `hooks/tiers.ts` comes from Ben AI's video on choosing Claude's effort level.
