# Parallel agents and capture hygiene

## One worktree per agent

Measuring a large reference is easy to split: one agent per screen group, per video, or per property. When those agents also write to one repo, each one gets its own git worktree on its own branch:

```sh
git fetch origin main
git worktree add ../wt-<task> -B <branch> origin/main
```

The agent then works, commits and pushes only from that folder, and never switches branches in any other checkout. The reason is a failure that happened: with several agents sharing one checkout, one agent switched branches while another was mid-task, and the second agent's commits landed on the first agent's branch and pull request. A worktree gives each agent its own working files and its own `HEAD`, so a branch switch in one cannot move another.

Also:

- Give each agent its own cache root (`--out`) or share one read-only; two writers to one slot race, and the atomic rename only keeps the last.
- Merge results through the spec, one reviewed change at a time, not by agents editing the same file at once.
- Remove a worktree with `git worktree remove` when its branch is merged.

## Captures are for measuring only

Screenshots and recordings of a third-party product are someone else's work. Use them to measure, and ship only the numbers:

- Keep captures and everything derived from them (keyframes, sheets, crops, extracted audio, transcodes) out of what ships and out of version control. Store them where the measuring happens and list them in the ignore file.
- Never trace, copy or re-encode a capture's artwork, icons, illustrations or sounds into the build. Draw or source your own, and use the measurements only for size, position, colour, timing and level.
- Write reports about the design, not the people: strip names, account details and other personal data a capture shows.
