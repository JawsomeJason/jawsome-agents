# claudecode-playbook-guard

An optional Claude Code plugin for people who use the [`playbook`](../playbook/README.md) command. Repos never need it: a teammate on plain pstack or on the `playbook` skill alone keeps working without it.

It works in Claude Code only, and needs `playbook` on `PATH`. It has no portable skills, so `npx skills add` finds nothing in it.

- A read hook stops an agent from reading an installed pstack playbook file directly and names the `playbook show` command to run instead. That file holds only pstack's steps, so reading it would skip your edits.
- An edit hook blocks a direct Edit or Write of a top-level `.md` file, other than a `README.md`, in `playbooks/`, `playbooks/orgs/*/` or `playbooks/repos/*/` of your config dir, resolving symlinks, and names `playbook extend` and `playbook new` instead. Those commands accept only valid grammar and undo a write that adds a `playbook check` problem. The hook allows a direct edit of a file that has a `check` problem, so a stale quote can always be repaired, and it allows the edit and says so when `check` cannot run. Set `PLAYBOOKS_ALLOW_EDITS=1` to edit by hand anyway.

The hooks have known gaps. A Bash command can still write a playbook file (`sed -i`, `tee`, a redirect) or read a bundled playbook that mentions `playbook.mjs` or `playbook show` anywhere in the command. The read hook covers Read and Bash only, so Grep and Glob can still read a bundled playbook.

## Install

```text
/plugin marketplace add JawsomeJason/jawsome-agents
/plugin install claudecode-playbook-guard@jawsome-agents
```
