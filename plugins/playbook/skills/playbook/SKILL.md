---
name: playbook
description: Lists, computes, and checks poteto-mode playbooks extended by team and personal files, with the playbook command. show, also spelled compute, prints one playbook family with every file that extends it applied over pstack's bundled steps in extends order, tags each step with the file that wrote it, and names every override. check validates every playbook file against the installed pstack. Use when running a poteto-mode playbook through this plugin, when a mode skill asks for `playbook show`, when writing or editing a playbook file, or after a pstack upgrade.
argument-hint: "<list|show|compute|map|install|update|remove|check|doctor> [playbook|pack] [--repo <repo>]"
compatibility: Requires Node and the pstack plugin's poteto-mode skill.
license: MIT
---

# Playbook

Playbook applies the operator's personal and team playbook files over pstack's bundled poteto-mode playbooks, in the order their `extends` chains give: parents first, team files before personal ones. This skill runs playbook and shows the result, so the agent copies one computed step list instead of merging files by hand, which drops or misplaces edits.

## Run it

1. When `playbook` is on `PATH`, use it. `compute` is an alias of `show`. Otherwise run `node scripts/playbook.mjs` from this skill's folder. Both run the same script, and the `PATH` copy is how the operator runs it in a terminal.
2. Map the argument to a command:

   | Argument | Command |
   | --- | --- |
   | `list` | `playbook list` |
   | `show <playbook>` (alias `compute`) | `playbook show <playbook>` |
   | `map <playbook>` | `playbook map <playbook>` |
   | `check` | `playbook check` |
   | `install <pack>` | `playbook install <pack> --from <owner/repo\|path>` |
   | `update [<pack>]` | `playbook update [<pack>]` |
   | `remove <pack>` | `playbook remove <pack>` |
   | `doctor` | `playbook doctor` |

3. When the argument includes `--repo <repo>`, pass it through. Without it, playbook reads the repo from the current directory's checkout.
4. Print the output as it is. The operator reads the tags, the struck text, and the override list to see which file changed a step, so rewording them hides that.

`playbook <command> --help` prints any command's options and examples. Exit code 1 means a validator problem. Report each problem line to the operator. Do not guess where an edit with a broken quote belongs, because a wrong guess applies a rule to the wrong step. Exit code 2 is a usage or setup error, and the message names the fix, such as setting `PLAYBOOKS_PSTACK_DIR`. [references/cli.md](references/cli.md) lists the commands, flags, environment variables, and exit codes.

## Run a computed playbook

- Copy `show`'s numbered steps into the todolist once, as poteto-mode's copy-and-apply step. Recomputing mid-task can change the list under the work.
- When a step sends the work to another playbook, show that playbook with playbook and run its computed steps. Its own family changes its steps, so the bundled text alone would drop them.
- Name every line under `Overrides:` in the reply. An override changes the bundled behavior the operator expects, so it must be visible.
- When `pstack check-playbooks:` shows lines other than `ok`, report them as poteto-mode asks.

## Write a playbook file

- Edit the Markdown directly, then run `playbook check`, which names every problem the edit added. User files sit in `playbooks/`, or in `playbooks/orgs/<org>/` or `playbooks/repos/<repo>/` of the config dir to limit where they are active, named `<parent>-<handle>` when they derive from a parent. A user file reaches every repo it is active in, so run `playbook check --every-repo` after changing one. Team files go through a pull request.
- Pick the parent from the tags `playbook show` prints: the first stem wrote the step, and the rest edited it. Extend the file that wrote the words you quote, because a file's quotes see only what its ancestors wrote. When the parent is wrong, `check` names the file to add to `extends`.
- Keep pstack's grammar: `extends`, `when`, and edit lines `- **After|Before|Replace|In** "quote" change`. pstack's own checker reads team files, so a new verb or key there breaks pstack. [references/playbooks.md](references/playbooks.md) gives where files live, names, the apply order, and what `check` validates, each rule tagged with the project that provides it.
- Quote a short, distinctive phrase from one step, such as its bold title. pstack rewrites step text between releases, and a long quote breaks on the first rewrite.
- A team file carries the org or repo word in its name unless a pack ships it. Keep it chain-free, extending only bundled stems and quoting only pstack's text, when teammates run plain pstack, because pstack's checker refuses any other parent. `playbook check` reports a chained team file as an info line and checks it itself.
- Change a pack file in its source repo, then run `playbook update`. `check` fails a hand-edited copy, because the lock pins its bytes. [references/cli.md](references/cli.md#packs) covers `install`, `update`, `remove`, `--link` for a private local folder, `check --locked`, and `check --packs`, the linter a repo that holds packs runs in CI.
- Run `playbook check` after every edit and after every pstack upgrade. It catches a quote that matches nothing, matches two steps, or sits outside the steps, before an agent runs the playbook.
