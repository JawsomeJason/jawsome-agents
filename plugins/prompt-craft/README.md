# prompt-craft

Skills for prompting the environment instead of the model: the goal and checks go in a spec, the rules go in skills, and what you learn goes in a knowledge base.

| Skill | What it holds |
| --- | --- |
| `spec` | An interview for the goal behind a task, a small spec with checkpoints and user-confirmed decisions, evaluation criteria written before the work, and a verification plan with outside evidence and an optional second-model critique. The file shape is in `references/schemas/spec.schema.md`. It hands ambition to `ambition` or `sharpen`, adversarial review to `interrogate` and code shape to `architect`. |
| `skill-audit` | An audit of one skill or a plugin's skills: description triggers, instructions against scripts, one job per skill, invocation flags and a lessons loop. `scripts/audit.mjs` runs the checks a machine can make. It hands rules-to-checks to `enforce`, whole-skill code splitting to `harden` and session lessons to `learn`. |
| `wiki` | A knowledge base in a folder of markdown notes: ingest a source into a raw folder the agent never edits, ask questions answered from the wiki and filed back, and lint for broken links, orphans, stale pages and gaps. `scripts/wiki.mjs` runs lint and rebuilds the index. |

## Requirements

Node, for the two scripts. Without it, each skill gives the by-hand route.

## Usage

```sh
node skills/skill-audit/scripts/audit.mjs <skill dir | plugin dir> [--json]
node skills/wiki/scripts/wiki.mjs lint <vault> [--json]
node skills/wiki/scripts/wiki.mjs index <vault>
```

The wiki reads `.wiki.json` at the vault root, shaped `{"raw": "<folder>", "wiki": "<folder>"}`. Output shapes and exit codes are in each skill's `references/schemas/`.

Run the tests with `node --test 'plugins/prompt-craft/tests/*.test.mjs'`.
