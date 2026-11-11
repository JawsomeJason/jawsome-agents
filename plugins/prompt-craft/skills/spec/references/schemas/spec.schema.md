# Spec file

One markdown file per piece of work. Every section is required; write `None` rather than drop one, so a reader can tell it was considered.

```markdown
---
status: draft | approved | done
goal: <one sentence: what the result is for>
---

# <Title>

## Goal

Who uses the result and what they do next, in two or three sentences.

## Scope

- In: <what this spec covers>
- Out: <what it leaves for later, and why>

## Checkpoints

1. <slice, ends in a state a check or the user can inspect>
2. <slice>

## Decisions

- <choice>. Rejected: <option>. Why: <reason>. Confirmed: yes | no (with the date in the commit, not here)

## Criteria

- [ ] <pass or fail statement>. Check: <command, script or named judge>

## Verification

- Outside evidence: <build, tests, real command output, past report to match>
- Second-model critique: <none | when, and which criteria it must try to break>
- User checks: <which checkpoints>

## Lessons

- <one line per rule learned while doing the work, or None>
```

## Rules

- `status` is `approved` only after the user confirmed every line under Decisions.
- A criterion with no `Check` is a defect: add the check or cut the criterion.
- Criteria are fixed once the status is `approved`. A change goes in as a new line under Decisions with the user's confirmation.
