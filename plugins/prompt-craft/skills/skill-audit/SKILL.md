---
name: skill-audit
description: Audits one skill, or every skill in a folder or plugin, against the rules for skills that trigger when they should and keep working: a description that says what and when, instructions kept apart from scripts and references, one job per skill, invocation flags that fit the risk, and a lessons loop. A script makes the checks a machine can make; the agent judges the rest. Use when writing or reviewing a skill, when a skill fires too often, never fires or does several jobs, and when a skill's run keeps rewriting the same code. Triggers include "/skill-audit", "audit this skill", "why doesn't my skill trigger", "is this skill too big", "review my plugin's skills", or a SKILL.md path to review. Reach for it even when the ask is one description, since the other checks are cheap. Prefer it over a code review for SKILL.md files. For turning a rule into a check use `enforce`, for moving a skill's steps into code or a narrow model question use `harden`, and for recording what a session taught use `learn`.
license: MIT
compatibility: Requires Node. Without it, apply the rules in references/rules.md by hand.
argument-hint: "<skill dir | plugin dir>"
---

# Skill audit

A skill is a prompt for an agent: a description that decides when it loads, instructions for what to do and tools the agent runs instead of rewriting. The audit checks each. The rules and the reason for each are in [references/rules.md](references/rules.md).

## 1. Run the script

```sh
node scripts/audit.mjs <skill dir | folder of skills | plugin dir>
```

Add `--json` for the shape in [references/schemas/audit.schema.md](references/schemas/audit.schema.md). The script checks the description's length, its "use when" and trigger phrases, the name against the folder, the body's length and section count, inline code with no `scripts/` folder, risky verbs with no invocation flag, and any mention of a lessons loop. It exits `1` on a failure and `0` on warnings only.

## 2. Judge what the script cannot

Read the `SKILL.md` and answer each, quoting the line that shows it:

- **Trigger.** Would a user's real phrasing match the description? Does it also match jobs the skill does not do? Name a phrase that should fire it and one that should not.
- **Split.** Does the skill do one job? A skill that does two jobs in sequence, or has a section a user would run alone, becomes two skills. Propose the split and the description for each.
- **Instructions or tools.** Instructions say what to decide and in what order. A step the agent computes the same way each run, such as counting, sorting, parsing or matching, belongs in `scripts/`. Check the transcript or the skill for code the agent wrote more than once.
- **Flags.** An agent-only helper is not meant to be run by hand, and a skill with side effects the user must start (delete, send, publish, deploy) should not load by itself. Say which applies and name the flag. Use only keys the host repo's rules allow.
- **Lessons loop.** After a run, does anything change the skill? A rule stated twice in chat becomes a line in the skill.

## 3. Report

Per skill: the script's findings, your judgments and one proposed edit per problem, worst first. Do not edit the skill unless the user asks, because an audit that rewrites what it reviews hides what it found.

## 4. Hand off

Do not rebuild these here:

- A rule that a lint, hook or test could enforce goes to the `enforce` skill.
- A skill whose steps should become scripts or narrow model questions goes to the `harden` skill as a whole.
- A lesson from the session that should change a playbook goes to the `learn` skill.
