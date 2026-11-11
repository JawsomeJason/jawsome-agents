# Evaluating a model choice

A good eval set is the most important step, because every later decision reads off it.

## Steps

1. Collect 20 to 100 real inputs from the job, including the hard and odd ones. Synthetic prompts miss the edge cases that sink a model in production.
2. Write the expected output or a pass rule for each, before running any model, so the grade can't drift toward whichever answer came back.
3. Run every candidate, each at the effort levels in question, on the same inputs.
4. Score accuracy, response quality and edge-case handling, and record cost and latency per input.
5. Pick the cheapest candidate that meets the bar. Write down the bar, so the next review can rerun it.

## Scoring sheet

| Candidate (tier, model, effort) | Accuracy | Quality (1–5) | Edge cases passed | Cost per 1k inputs | p50 latency |
| --- | --- | --- | --- | --- | --- |
| fast, `<id>`, low |  |  |  |  |  |
| balanced, `<id>`, medium |  |  |  |  |  |
| flagship, `<id>`, high |  |  |  |  |  |

## When to rerun

- The provider ships a new model in a tier you use.
- The job's inputs change shape, such as a new language or a longer document.
- Cost or latency drifts past the budget written in step 1 of the skill.
