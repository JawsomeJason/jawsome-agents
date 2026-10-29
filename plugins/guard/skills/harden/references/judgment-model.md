# Judgment model

A judgment model is a hosted model that answers one narrow, typed question and returns a calibrated confidence with its answer. Services also call it a decision model or a System One model, after the fast, intuitive half of the two-systems model of thinking. It is cheaper and more repeatable than asking the agent, and the confidence lets a script act on sure answers and route unsure ones elsewhere.

## Detect one

Look for a judgment model the operator already uses: an SDK in the project's dependencies, an API key for one in the environment, or an installed skill that documents one. Use none the operator has not set up, because it needs an account and a key.

## Read its question types

Before proposing a question, read the judgment model's own docs or skill and take its question types and fields from there, because each service names and shapes them differently. The usual types are:

- **Choice.** One of a fixed set of options.
- **Yes-or-no.** The probability that a stated claim holds.
- **Score.** A position on a rubric.
- **Box.** Where something is in an image.

## Sketch the question

Each judgment-model row in the brief names:

- the question type and the exact question;
- the options or rubric;
- a confidence threshold, marked untuned until real cases set it;
- the fallback below the threshold: ask the operator, or hand the case to the agent.

## Without one

When the operator has no judgment model, sort the step to the agent and phrase it as the same narrow question with fixed options, because a fixed question is still more repeatable than an open one. Note in the brief that a judgment model could take it later.
