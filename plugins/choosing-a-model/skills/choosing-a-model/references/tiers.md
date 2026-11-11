# Tiers

Providers name and number their models differently and replace them often, so this skill talks in four tiers. Map them to real model IDs from the provider's model overview each time, and note the model's default effort while you are there.

| Tier | When you need | Example jobs |
| --- | --- | --- |
| Frontier | The highest available capability | Agent sessions that run for hours, multistep deep research, analysis carried through to a finished document, spreadsheet or deck |
| Flagship | Complex agentic coding and enterprise work | Multihour autonomous coding agents, large-scale refactoring, complex systems engineering, vision-heavy workflows, computer use |
| Balanced | Speed and capability for everyday work | Code generation, data analysis, content creation, visual understanding, agentic tool use |
| Fast | The lowest latency and price | Real-time applications, high-volume processing, cost-sensitive deployments that still need reasoning, subagent tasks |

## Mapping a lineup

1. Open the provider's model overview and list each model with its context window, output limit, price and default effort.
2. Place each model in one tier by what the provider says it is for, not by its price alone.
3. Some frontier models are open only to verified organizations. Record access limits next to the tier, so a pick never lands on a model the account cannot call.
4. Where a provider marks one model as the default start for most workloads, mark it in the table.

## Examples

- A subagent that greps a repo and summarizes the hits: fast tier, low effort. The work is retrieval, and the parent judges the result.
- A nightly batch that tags 200,000 support tickets: fast tier first, because volume dominates cost; upgrade only for a category the eval shows it misreads.
- An autonomous agent that lands a multi-package refactor: flagship tier at high effort, with the frontier tier as the step up if evals still fail at the top effort.
- A chat reply that must start in under a second: fast or balanced tier, and check the provider's faster output mode before moving down a tier.
