---
name: spec
description: Interviews the user for the goal behind a task before an agent starts, then writes a small spec file with tight scope, checkpoints, key decisions the user confirmed, evaluation criteria set before the work and a plan to verify it against outside evidence. Use before non-trivial work that touches more than one file or takes more than one sitting, when a prompt names a task but not the goal behind it, and when a past result looked fine but did not do what the user wanted. Triggers include "/spec", "write a spec", "spec this out", "before you start, ask me", "how will we know it works", or a brief with no stated success test. Reach for it even when the task looks clear, since a clear task can still hide an unstated goal. Prefer it over plan mode when the plan needs detail the user must check. For raising the ambition of a brief use the `ambition` or `sharpen` skills, and for the code's shape use `architect`.
license: MIT
argument-hint: "<task or rough brief>"
---

# Spec

A spec turns a task into a goal, a small scope, checks that were written before the work, and decisions the user has approved. The user reviews a page instead of discovering the gaps in a finished result. The file shape is in [references/schemas/spec.schema.md](references/schemas/spec.schema.md).

## 1. Find the goal

A task is not a goal. Ask what the result is for, who uses it and what they do next. Ask the questions the answer would change and skip the rest, because each extra question costs the user's attention.

Ask all of them in one message with your pick for each, so the user answers once and then leaves you to work.

If the brief reads as the first step of something larger, or the result came back competent but shallow, hand it to the `ambition` or `sharpen` skill first and spec what comes back. This skill does not raise ambition itself.

## 2. Cut the scope

Write the smallest slice that proves the goal. A small spec with checkpoints beats a large one, because the user can verify each slice and a wrong turn costs one slice, not the whole plan. Split the work into checkpoints where the user or a check can stop and look. List what is out of scope, so a later reader knows it was a choice.

For work that needs types, signatures or module layout decided, hand that part to the `architect` skill and link its result from the spec.

## 3. Pin the key decisions

A decision that changes the result or is costly to reverse goes in the spec as a line the user confirms: the choice, the rejected option and the reason. State the confirmation as an explicit "yes" from the user. Silence is not a yes, because the agent fills a gap with a guess the user never saw.

## 4. Set the evaluation criteria first

Write the criteria before any work starts. Each one is something a check can pass or fail: "3 sections, each ends with a recommendation", not "make it look good". Prefer a check a script runs. When no script can judge it, name who judges it and what they look for. Criteria written after the work bend to fit it.

## 5. Plan the verification

Say where the evidence comes from, because the agent's own report of success is not evidence.

- Outside signal: the build and test run, deployment status, the output of the real command, a past report to match the format of.
- A second model's critique when a wrong result is expensive or hard to see. Hand that review to the `interrogate` skill, and state in the spec which criteria it must try to break. Without a second model, a fresh subagent that sees only the spec and the result does the same job.
- Which checkpoints the user checks in person.

## 6. Write it and stop

Save the spec at the path the user names, or `spec.md` in the working folder. Show the user its decisions and criteria and ask for the go-ahead. Do not start the work in the same turn, because the go-ahead is the point of the spec.

## 7. During and after the work

Work one checkpoint at a time and run its checks before the next. When a check fails twice for the same reason, stop and change the spec, not the check. When the user corrects the agent, decide whether it is a one-time fix or a rule for every later run. Add a rule to the spec's `Lessons` section, or to the skill or instruction file that should hold it, so the next spec starts with it.
