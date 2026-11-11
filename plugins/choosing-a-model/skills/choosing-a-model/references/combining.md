# Combining models

Most jobs mix routine steps with a few hard calls. Paying frontier rates for every token wastes the budget on the routine part, so split the job by difficulty.

## Executor with an advisor

A cheap model runs the whole job and escalates only the decisions it flags as hard to a strong model.

- Fits: a support agent that answers most tickets itself and asks the strong model about refunds over a set amount.
- The cheap model needs a clear escalation rule, such as a confidence floor or a named list of decision types, because a model left to judge its own limits under-escalates.

## Orchestrator with workers

A strong model plans the job, splits it into pieces, hands the bulk work to cheap workers and checks what comes back.

- Fits: a research agent that plans queries with the strong model and has fast-tier workers read and summarize each source.
- Give each worker a narrow brief and a fixed output shape, so the orchestrator can check results without redoing them.

## Checking the split

Run the eval from [evaluating.md](evaluating.md) on the combined setup against the strong model alone. Keep the split only when it holds the bar at a lower cost.
