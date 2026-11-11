---
name: choosing-a-model
description: Picks the model tier and reasoning effort for a job by weighing capability, speed and cost, starting either efficiency-first or capability-first, and settles the pick with an eval on real prompts instead of a hunch. Use when choosing a model for a new feature, an API integration, a pipeline step or a subagent; when deciding whether to upgrade, downgrade or switch models; when a job costs too much or runs too slow; and when pairing a cheap model with a strong one. Triggers include "/choosing-a-model", "which model should I use", "is a smaller model good enough", "should we upgrade the model", "this costs too much", "pick a model for this subagent", or "raise the effort or switch models". Reach for it even when the ask names one model, since effort and a cheaper tier are often the better lever.
license: MIT
argument-hint: "<the job, or the model choice in question>"
---

# Choosing a model

The pick is a trade between capability, speed and cost, and only an eval on the job's own prompts settles it. Every step below states its reason, so it still applies when the lineup changes.

## 1. Name the criteria

Write one line each for the job before naming any model, because a pick made without them gets argued from taste:

- **Capability.** What the model must do: long autonomous runs, hard reasoning, code, vision, tool use, or plain extraction and classification.
- **Speed.** How fast an answer must land: real-time, interactive, or batch with no one waiting. Some providers sell a faster output mode at a premium, which can fix speed without a tier change.
- **Cost.** The budget for development and for production volume.
- **Effort.** Whether the model takes a reasoning-effort setting. Tuning effort within one model is often a better lever than switching models, because it moves cost and latency without new prompts or new behavior. Start at the provider's documented default for that model and move it up or down by eval.

## 2. Map the tiers

Name the provider's current models against these four tiers. Read the lineup from the provider's model docs, or ask the user, because tier names and defaults change faster than this skill does. [references/tiers.md](references/tiers.md) gives each tier's fit and example jobs.

| Tier | Fits |
| --- | --- |
| Frontier | The highest capability: hours-long agent runs, deep multistep research, analysis carried to a finished document |
| Flagship | Complex agentic coding and knowledge work, large refactors, systems engineering, vision and computer use |
| Balanced | Everyday coding, data analysis, writing and tool use, at better speed |
| Fast | The lowest latency and price: real-time replies, high-volume processing, subagent chores |

When the provider names a default starting model for most workloads, start from that unless the criteria point elsewhere.

## 3. Pick a starting point

Take one of two starts, because each wastes less than guessing in the middle:

- **Efficiency-first.** Build on the fast tier, test thoroughly, and upgrade only for a capability gap the tests show. Fits prototypes, tight latency, tight budgets and high-volume simple jobs.
- **Capability-first.** Build on the flagship tier and tune prompts for it. Once evals pass, lower effort or step down a tier as the workflow matures. When the highest effort still falls short on hard reasoning or long agentic work, move up to the frontier tier. Fits complex reasoning, science and math, nuanced reading, accuracy over cost, and high-autonomy agents.

Before switching an existing integration, read the target model's migration notes, because a new model can reject settings the old one accepted, such as forced tool use or thinking turned off.

## 4. Settle it with an eval

Change models only on evidence, because a model that feels better on three prompts can lose on the hundredth. Build a test set from the job's own prompts and data, then compare candidates on accuracy, response quality and edge cases, and weigh the gain against the cost. [references/evaluating.md](references/evaluating.md) gives the steps and a scoring sheet.

## 5. Consider combining models

Pair a cheap model with a strong one when most of the work is routine, so most tokens bill at the lower rate. Either an executor runs the job and escalates hard calls to an advisor, or an orchestrator plans and hands bulk work to cheap workers. [references/combining.md](references/combining.md) shows both.

## Report

Give the pick as tier, model and effort, the criterion that decided it, the start you took, and the eval that would change it. Say when no eval has run yet, so the pick reads as a starting point and not a result.
