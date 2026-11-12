---
name: harden
description: Sorts every step one skill has the agent perform at run time into the cheapest place that does it reliably (code, a typed question to a judgment model, or the agent itself), and rebuilds it on the split the operator approves. Use when a skill has the agent count, sort, parse, match or look things up by hand, when it asks the agent for a narrow judgment that a judgment model (a decision model that answers typed questions such as a choice, a yes-or-no or a score, with a calibrated confidence) could answer, when it leans on rules the agent must remember or runs slow, costly or different every time. Triggers include "/harden", "harden the release skill", "what in this skill could be a script", "make this deterministic", "which of these could be a typed question", or a SKILL.md path with that intent. Prefer the `enforce` skill when the subject is one named convention rather than a whole skill; harden hands enforce each convention it finds.
argument-hint: "<skill name or path>"
---

# Harden

An agent that counts, parses or remembers rules by hand is slow, costly and different on every run. This skill moves each run-time step of one skill to the cheapest place that does it reliably: code when the answer is computable, a judgment model when it is a narrow typed judgment, and the agent only for open-ended writing and multi-step reasoning.

## 1. Resolve the target

Take a path as given. Resolve a name against the skill folders the harness loads: project, operator and installed plugins. A name matching more than one: ask which in one line, because harden rewrites the target and the wrong one costs a revert.

Read the target in full, with every file under its `scripts/` and `references/`.

When the subject is one convention rather than a whole skill, run the `enforce` skill with it and stop.

## 2. List the steps

List every action the agent takes when it runs: each command it runs, value it computes, decision it makes and piece of text it writes. A standing rule ("never X", "always Y before Z") is a step, because the agent must spend attention on it every run. A script it already runs is one step, marked `keep`.

## 3. Sort each step

| Goes to | Takes | Sketch |
| --- | --- | --- |
| Code | A computable answer: counting, sorting, parsing, matching across sources, lookups, rule tables, gathering from CLIs and APIs, formatting output, state and idempotency checks | A script name, with its inputs and outputs |
| Code, as a check | A rule the agent must remember | The rule, then "via the `enforce` skill" |
| Judgment model | A narrow judgment: one of a fixed set, whether a claim holds, a position on a rubric, where something is in an image | The question type, the question, the options, a confidence threshold, and the fallback below it |
| Agent | Open-ended writing, multi-step reasoning, new situations | Why it stays |

Mark a step already in the right place `keep`. Split a step that mixes them: code gathers the candidates, the judgment model judges them, the agent writes what is left. Leave each rule's check to the `enforce` skill, which picks the rung.

Sort a step to a judgment model only when the operator already has one set up; otherwise it stays with the agent as the same narrow question, because an unset model is a proposal the operator cannot run. Follow [references/judgment-model.md](references/judgment-model.md) to detect one, read its question types, and fall back when there is none.

Worked example: a ticket-status step became a report script plus one yes-or-no question for the judgment model: does a ticket key found only in a pull request body mean the pull request delivers that ticket.

## 4. Present the brief, then stop

One row per step: what it does today, where it goes, why, and the sketch. Wait for approval or edits, and change nothing before the operator approves, because a split the operator did not agree to is a rewrite they must review twice.

## 5. Build the approved brief

1. Run the `enforce` skill once per approved rule, with the rule as its argument.
2. Write each script in the skill's own `scripts/` folder, so it installs and moves with the skill. Make it idempotent, have it print what it will change before writing, and end with matched, changed and skipped counts that sum to the total, so a rerun after a crash is safe and its output is auditable.
3. Save every judgment-model answer a script gets to a JSON file beside it, and read it back on rerun, because each call costs money and may answer differently.
4. Rewrite the prose. Each replaced step becomes one line that runs the script by its full path, and the prose a check replaced goes. Edit a skill you maintain in place. For a skill installed from someone else's plugin, propose the edits upstream instead, because an installed copy is overwritten on upgrade.

## 6. Report

Per step, name what changed: the new script, judgment-model question or check, and the prose it replaced, plus the command that reruns each script. Offer tests in one line, and write them only if the operator asks.

One target per run, because a sweep of every skill produces a brief too long to approve with care.
