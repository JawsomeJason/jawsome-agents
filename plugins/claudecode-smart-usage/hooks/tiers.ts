// The default effort levels and subagent model tiers. Keep the object strict JSON (double
// quotes, no trailing commas): require-agent-tier.sh reads it with a JSON parser, and a
// user's tiers file has the same shape. Mods can't import .json files, hence a .ts wrapper.
export default {
  "_comment": "Effort levels (the auto effort pick and subagent spawns) and subagent model tiers. The mod's question reads `efforts`; require-agent-tier.sh reads both.",
  "efforts": {
    "low": "The user is iterating back and forth with Claude on something already in progress, or the task is simple: a quick rewrite, brainstorming options, tagging or sorting, a short summary, a rough draft, or a small tweak to something already made.",
    "medium": "An ordinary piece of real work that is neither simple nor high-stakes, such as drafting a proper email or document from notes, a typical feature or fix, or an analysis the user will read and check themselves.",
    "high": "A hidden mistake would cost money, a client or a wrong decision, so the work hinges on verification: checking numbers against sources, hunting edge cases, reviewing a contract or risk, fact-checking a long document, building or fixing a skill, or a final verification pass. The user stays around for the result.",
    "xhigh": "The user hands off a long, hard, critical job and walks away while it runs unattended, such as research across a large body of material or the best one-shot attempt at a high-stakes artifact.",
    "max": "A truly critical job where only the most exhaustive effort possible will do, whatever the time and cost. This is rare."
  },
  "models": {
    "haiku": {
      "effort": "low",
      "when": "Trivial lookups, summaries, 'go check X', cleanup sweeps."
    },
    "sonnet": {
      "effort": "high",
      "when": "Well-specified work where only the result matters: builds from a clear brief, research, scans."
    },
    "opus": {
      "effort": "medium",
      "when": "Judgment: vague intent, design, review, anything that must be right the first time."
    },
    "fable": {
      "effort": "high",
      "when": "One genuinely hard problem (gnarly bug, subtle algorithm), never a fan-out."
    }
  }
}
