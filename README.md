# jawsome-agents

Agent skills that run in any harness that reads the [Agent Skills spec](https://agentskills.io/specification). Each skill uses only the spec's frontmatter and plain files, so the same folder installs in Claude Code, Codex, opencode and any other harness that loads skill folders. A plugin named `claudecode-*` is the exception: it holds mods and hooks for Claude Code alone.

## Plugins

| Plugin | What it does |
| --- | --- |
| `standards` | Mines a repo's review history into coding standards that agents follow while they write code there, each with its reason and the review comments behind it, and prunes the rules that don't change what agents write. |
| `claudecode-smart-usage` | Claude Code only. Picks the reasoning effort for each prompt you send, and makes every subagent spawn name its model and effort. See its [README](plugins/claudecode-smart-usage/README.md). |

Invoke `standards` as `/standards [command] [scope]`:

- `command` is one of `mine`, `write`, `review`, `prune` or `doctor`. With no argument, the skill shows a menu and waits.
- `scope` is a path or glob, an area from the generated standards, or a § number such as `§2`. A scope with no command runs `review` on it.

Use it in this order:

1. `mine` the review history into ranked conventions.
2. `write` the standards skill into the repo.
3. `prune` the rules agents already follow without being told.
4. Write code. Agents load the generated standards while they edit the files the rules cover.
5. Optionally, `review` a diff: it adds a standards pass on top of an ordinary review and never replaces it.

Run `doctor` now and then to catch drift.

## Status

The `review` pass showed no lift over a plain review in our tests on two repos, one of them `cli/cli`: reviewers given the standards did not beat a plain review at catching the human reviewers' convention comments. So the product is the writing rules, and `prune` is its measure: for each rule, how often agents follow it with and without being told. The first prune results ran on one harness and an uncalibrated grader, so every decision in them is provisional until more harnesses and human-labeled calibration confirm it.

## Install

### Claude Code

```text
/plugin marketplace add JawsomeJason/jawsome-agents
/plugin install standards@jawsome-agents
/plugin install claudecode-smart-usage@jawsome-agents
```

### Every other harness

```sh
npx skills add JawsomeJason/jawsome-agents --skill standards
```

The [skills CLI](https://skills.sh) asks which harnesses to install into, then links the skill into each one's skills folder. `standards` is the only portable skill here, so it is the only one the CLI lists.

## Develop

```sh
node scripts/lint.mjs                              # lint the repo's skills and docs
node --test 'scripts/*.test.mjs'                   # tests for the lint and test-harnesses.mjs
node --test 'plugins/standards/tests/*.test.mjs'   # tests for the standards scripts
node scripts/test-harnesses.mjs                    # real runs in each installed harness
```

CI runs the lint and both test suites. The harness test needs each harness's login and spends real usage, so it runs by hand: in a temp home per harness, it installs the skills, invokes `standards` with no argument and checks that the menu prints. A harness that isn't installed or isn't logged in shows as skipped. Pass `--keep` to keep the temp homes for debugging.

### Add a plugin

1. Read [AGENTS.md](AGENTS.md). It holds the rules every skill follows and the reason for each.
2. Create `plugins/<name>/skills/<skill>/SKILL.md`, with optional `references/`, `scripts/` and `assets/` beside it. A `claudecode-*` plugin follows the rules in AGENTS.md under "Claude Code-only plugins" instead.
3. Add `plugins/<name>/.claude-plugin/plugin.json` and an entry for the plugin in `.claude-plugin/marketplace.json`.
4. Run the lint and the tests, then `node scripts/test-harnesses.mjs`.

## License

MIT. See [LICENSE](LICENSE).
