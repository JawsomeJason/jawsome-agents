---
name: enforce
description: Turns one convention or repeated correction into a check the toolchain runs, in any repo. Finds the cheapest rung that catches it (type system, existing lint rule, custom lint rule, generator, commit hook, CI, test, agent-run script), builds it, and proves it fires on a real violation; reports instead when the convention is already enforced or is a judgment call no machine can check. Use for an enforcement candidate (a rule a tool could check, such as one a lint or a hook could enforce), right after a correction, a recurring bug, the same review comment twice, or a newly written rule, and whenever a rules file, agent instructions file or style guide states something a tool could check. Triggers include "/enforce", "can we enforce this", "make this a lint rule", "is this already enforced", "add a guardrail", or "keep this from regressing". Prefer the `harden` skill when the subject is a whole skill rather than one named convention; harden hands enforce each rule it finds.
argument-hint: "[convention to enforce]"
---

# Enforce

A rule written in prose holds only while someone remembers it. A check holds on every run. This skill moves one convention from prose into the cheapest check that catches it, and proves the check fires.

## 0. Pick the subject

With an argument, enforce exactly that and do not widen to neighbouring rules, because a wider sweep ships checks nobody asked to review. Bare, take the last correction, recurring bug, review comment or rule edit from the conversation, name it in one line ("Enforcing: X. Say otherwise if you meant something else."), and carry on without waiting. Stop only when the conversation offers no candidate.

When the subject is a whole skill rather than one rule, run the `harden` skill with it and stop, because harden sorts every step and hands each rule back here.

## 1. Inventory the real stack

Read what is installed: package scripts and dev dependencies, lint and type configs (per package in a monorepo, where config nests), commit hooks, commit-message config, CI workflows, and any local lint plugin. Never assume what a repo of this shape usually has, because a rung the repo lacks costs a new tool to adopt. A local lint plugin already in the tree makes a custom rule nearly as cheap as an existing one.

## 2. Is it already enforced?

Check before designing anything, because a duplicate check is maintenance with no gain. Search the configs for the rule's subject, and check whether a function's signature already rejects the wrong shape. If it is enforced, the deliverable is the file and line doing it plus the prose to delete. Cite the line, because nobody agrees to lose a paragraph for an enforcement they cannot see.

## 3. Can a machine check it at all?

Not when it is taste or voice, a process with no trace in the result ("look up the token before hardcoding"), something that needs a human first, or a rule a competent engineer would break on purpose elsewhere, since a check there only breeds disable comments. Say so in one sentence and leave the prose.

## 4. Climb to the cheapest rung that holds

Cheapest means closest to the author and least new code to maintain. Stop at the first rung that catches the violation. [references/rungs.md](references/rungs.md) gives each rung's examples and the traps that make a lint rule silently miss.

1. **Type system.** Make the wrong shape unrepresentable, because it fails in the editor before any lint runs.
2. **Existing lint rule.** A configured built-in rule, because it carries tested messages and survives parser upgrades.
3. **Custom lint rule.** When no built-in rule can express it: an absence, a relationship between two nodes, a value derived from the filename. It earns a rule test.
4. **Formatter or generator.** Make the wrong shape impossible rather than detected.
5. **Commit hook.** The commit itself is the subject: its message or what is staged.
6. **CI.** It needs the whole repo, the network or a build artifact.
7. **Test.** The property is behavioural.
8. **Agent-run script.** The rule governs how an agent works, not the code. Write a script that exits non-zero with the right action when the rule breaks, and add the one line that runs it at that point in the instructions the agent follows, because the agent then cannot skip it by forgetting.
9. **Prose.** Last resort, for section 3.

The check's message is the author's only teaching, so name the right shape ("use the `data-*` state attributes"), not the ban. Put the rationale in a config comment.

## 5. Prove it fires

Two failures look like success: a glob that matches no real file, so the rule never loads, and the tool's own include or exclude config skipping the target files. So:

1. Write a violating snippet at a real path the config covers, because a temp file elsewhere does not exercise file-scoped config.
2. Run the check and watch it fail with your message.
3. Write the correct version at the same path and watch it pass, so you know the rule does not match everything.
4. Delete both.

Run a commit hook directly on a sample message rather than make a throwaway commit. Run an agent-run script by path on a case that breaks the rule and on one that holds. Not seen rejecting something means not finished.

## 6. Report

Group by outcome ("one already enforced, one new lint rule, one stays prose"). Per convention, give one of:

- the rung, why cheaper rungs did not reach, the change as a diff or path, and the error line the violating snippet produced;
- the enforcing file and line, plus the prose to delete;
- one sentence on why no machine can check it.
