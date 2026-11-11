# Skill rules

Each rule has its reason, so it still applies when tools change.

## Description

- Says what the skill does and when to use it, in 1024 characters or fewer. The description is the only part loaded before the skill fires, so it alone decides whether the skill fires.
- Carries trigger phrases a user would say, and a line that says when to reach for it anyway. Users describe a need, not a skill name.
- Says what it is preferred over, and which skill takes the neighbouring job. Two skills that claim the same job both fire badly.

## Instructions, tools and references

- Instructions state decisions and their order. A step that gives the same answer each run is code: put it in `scripts/`, and the agent runs it instead of reasoning about it. Agent-written code that comes back each run is the sign.
- Detail the agent needs only sometimes lives in `references/`, linked from the line that needs it, so the body stays short and the cost is paid on demand.
- Every script's output has a schema, so the output can be produced by hand when the script cannot run.

## One job

- A skill does one job. A long body, many sections or a description joined by "and" suggest two. Small skills compose, and a monolith fires for jobs it does badly.

## Invocation flags

- An agent-only helper is hidden from the user's menu, because the user has no reason to start it.
- A skill with side effects the user must decide on is not loaded by the agent alone, because the agent cannot know the user's intent.
- A harness reads only the keys it knows. Use only the keys the host repo allows.

## Lessons loop

- After each run, decide whether a correction is a one-time fix or a rule for every run. A rule goes into the skill, so the skill improves with use.
