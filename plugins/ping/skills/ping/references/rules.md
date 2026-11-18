# Ping rules

Why each rule exists. The script applies them, so an agent never has to remember one.

- **One top-level ask per day.** Several top-level posts bury each other. Later pull requests reply in the day's thread, and so does their SME line.
- **A pinged pull request stays in its thread.** A second top-level post for the same pull request is a double ping.
- **Re-ping only on a change after the later of the user's last message and the last human review.** A ping with nothing new is a nudge nobody asked for. The changes are a dismissed approval, addressed feedback, and an unanswered reviewer question in the thread. The question case becomes `needs-reply`, because the answer needs the agent's judgment. Bots and the author are not reviewers.
- **Readiness skips.** A draft, closed or merged pull request, one already approved, one with merge conflicts, failing required checks or checks still running is not ready for a reviewer's time.
- **Stacks.** A pull request based on another one in the batch appears in one block, base first, so reviewers read them in order. A child whose open parent was never pinged is skipped, because the reviewer would meet it before its base.
- **Working hours.** Outside them every send becomes a `hold`. The agent reports the holds and sends nothing.
- **Dry run.** The default. A `--dry-run` plan is marked so nothing in it is sent.
- **The text is fixed.** The script writes every message, and the agent never edits one, so the format stays the same from run to run. A `needs-reply` is the one message the agent writes.
