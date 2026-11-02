# playbook reference

```sh
playbook list [--repo <repo>] [--json] [--pstack <dir-or-version>]
playbook show <name> [--repo <repo>] [--json] [--pstack <dir-or-version>]
playbook map <name> [--repo <repo>] [--json] [--pstack <dir-or-version>]
playbook install <pack>... [--from <owner/repo|path>] [--user] [--link] [--repo <repo>] [--pstack <dir-or-version>]
playbook update [<pack>...] [--user] [--repo <repo>] [--pstack <dir-or-version>]
playbook remove <pack> [--user] [--repo <repo>] [--pstack <dir-or-version>]
playbook check [--locked | --packs <root>] [--user] [--repo <repo> | --every-repo] [--json] [--pstack <dir-or-version>]
playbook doctor [--json]
playbook help [<command>]
```

Playbook is `scripts/playbook.mjs` in this skill. It needs Node and nothing else. A plugin install's `bin/playbook` imports the script, and a skill install links the script itself, so one symlink puts the command on `PATH`. `show` is the main name of the command that prints a playbook, and `compute` stays as an alias of it.

Bare `playbook`, `playbook help` and `--help` print the usage and exit 0. `playbook <command> --help`, `-h` and `playbook help <command>` print that command's page, with its synopsis, options and examples. An unknown command or option exits 2 and points at help. One table in the script drives parsing, the usage and every page, on Node's built-in `parseArgs`, so they cannot drift and the script stays free of dependencies.

## Options

| Option | Effect |
| --- | --- |
| `--repo <repo>` | Sets the repo key. When it differs from the current checkout's key, playbook reads the team files of the checkout `config.json` records for that repo, or none when it records no checkout. |
| `--every-repo` | `check` only. Checks with no repo and in each repo `config.json` records, and prints one report in the same shape. It never records a version, because it reads several contexts' files. |
| `--json` | Prints the same data as JSON. |
| `--pstack <dir-or-version>` | Uses that pstack instead of the one playbook finds. It takes a folder, or a version next to the one in use or in any plugin cache. With this flag, playbook never writes `config.json`, so you can preview an upgrade. |

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Clean. |
| 1 | A validator problem, pstack's own checker failed, or a `doctor` check failed. `compute` still prints the playbook, except when the `check` it runs after a pstack change fails. Then it prints the `check` result. |
| 2 | Bad usage, such as `--repo` or `--pstack` with `doctor`. No pstack found, an unknown `--pstack` version, a `config.json` that is not valid JSON or has the wrong shape, or an unknown playbook. The message goes to stderr. |

## Environment

| Variable | Value | Default |
| --- | --- | --- |
| `PLAYBOOKS_CONFIG` | The config dir. | `.jawsome-playbooks` in the home directory. |
| `PLAYBOOKS_PSTACK_DIR` | The pstack plugin folder, the one that holds `skills/poteto-mode/`. | The search order below. |
| `PLAYBOOKS_STATE` | The folder that holds `usage.jsonl`, the read log that `telemetry` turns on. | `jawsome-playbooks` in `$XDG_STATE_HOME`, else in `.local/state` in the home directory. |

Playbook picks the pstack folder in this order, and uses the first one that holds poteto-mode's playbooks:

1. `PLAYBOOKS_PSTACK_DIR`.
2. The install record. Playbook reads `plugins/installed_plugins.json` in every dot-folder of the home directory and takes the `installPath` of each `pstack@<marketplace>` entry that has no `projectPath`. When several qualify, the highest version by semver wins. A harness loads the version its record names, and its cache keeps older and newer versions next to it, so the record is what keeps playbook on the pstack the session runs.
3. The cache. Playbook looks in every dot-folder of the home directory for `plugins/cache/*/pstack/<version>/` and takes the highest version by semver. Codex has no install record and needs none. It keeps one version of each plugin in its cache and replaces it on each install, upgrade, or downgrade, so the cache names the version Codex runs.

Both searches use the layout that plugin harnesses share, so they find pstack without naming any one harness. A pstack in any other place needs `PLAYBOOKS_PSTACK_DIR`.

Playbook reads the version from the first plugin manifest or `package.json` in the pstack folder that has a semver `version`. Without one, it uses the folder name when that is a semver, as plugin caches name their folders. When neither gives a version, output names pstack by its path and `--json` gives `null`. Playbook then records nothing in `config.json`, because that field holds a version.

## compute

`compute` prints one playbook family with every member applied, as Markdown:

```
# babysit (web · acme-eng · pstack 1.2.3)

1. Check the team's merge calendar.   [babysitting-an-acme-pr]
2. **Stop at the human's line.** ~~Never merge~~ Merge once green.   [babysit ~ babysit-sam]

Family: babysit (pstack), babysitting-an-acme-pr (team), babysit-sam (user)
```

The heading names the root, the repo, the forge owner or else the org, and the pstack version. When the name given is a member of the family, a line after the heading says so: any member's name prints its root's family. Each step ends with the stem of the file that wrote it, then `~` and each stem that edited it. Struck text is what a `Replace` removed. `Family:` lists the root and each active member in apply order, with its kind, when the family has more than the root.

These sections follow the steps, each only when it has entries, in this order:

- `Hands off to:` lists each other family that the steps or notes send the work to, by its root. Each line gives the root and where it appears, such as `- opening-a-pr (step 8)` or `- shipping (notes)`.
- `Notes:` lists each note with the stem of its file.
- `Overrides:` lists each `In` or `Replace` on a step a different file wrote, such as `- step 6: babysit-sam replaced "Never merge" (babysit, after babysitting-an-acme-pr)`. The parentheses name the step's writer, then the files that edited the step earlier.
- `Problems:` lists each problem in `config.json`, in a symlink, in a file of this family or one that extends a member, or in a file with an `extends` that names no playbook.

When a file in the family has a problem, `compute` withholds the playbook: it prints no steps, only a line that says so and points to `playbook check`, then `Problems:` and the pstack result, and exits 1. With `--json`, `steps`, `notes`, `overrides`, and `handoffs` are empty. A problem in `config.json` or a symlink alone, or a pstack checker failure alone, still prints the steps and exits 1.

A file with an `extends` stem that no context defines edits nothing, and any playbook may be the one it meant. So `compute` of every playbook lists that file's problems and exits 1. It still prints the steps of a playbook the file does not touch, under a line that says they may be incomplete. With `--json`, the steps stay and `problems` carries the file's problems.

`pstack check-playbooks:` comes last, with pstack's own checker result, or `ok`. `--json` prints the same data.

When the installed pstack differs from the `pstack` in `config.json`, `compute` runs `check` first. A pass records the new version. A failure stops with exit 1, because an upgrade that moved the quoted text would otherwise apply edits in the wrong place.

With `"telemetry": true` in `config.json`, `compute` appends one JSON line per playbook it finds to `usage.jsonl` in `PLAYBOOKS_STATE`: `ts`, `playbook`, `repo`, `org`, and `pstack`. The log stays on the machine, and a tool such as a usage counter reads it to tell which playbooks agents run. A failed write never fails the compute, because a read log must not block the work it records.

## map

`map` draws a family as a tree: the root at the top, every file below the parent it extends, each labelled with its origin.

```
# babysit (web · acme-eng · pstack 1.2.3)

babysit [pstack]
├── babysit-sam [user]
│   └── both-sam [user] (also extends babysitting-an-acme-pr)
└── babysitting-an-acme-pr [pack acme] <= asked
    ├── both-sam [user] (also extends babysit-sam; shown above)
    ├── releasing-web [repo web]
    └── waiting-sam [user] (dormant: extends only-other, which only playbooks/repos/other defines)
```

The origin is `pstack`, `pack <name>`, `repo <name>`, `user` or `user pack <name>`. `<= asked` marks the file you named, which any member of the family can be, so the lines above it are its ancestors and the lines below it are its descendants. A file with several parents appears under each, naming the others, and its subtree prints once. A file in two families prints both trees. A dormant file shows under its active parent with what it waits on, and you can ask for one by name. `--json` gives each file once.

## Packs

A pack is a named set of playbooks any repo can install, so one correction reaches everyone through one reviewed change. A source repo holds `packs/<name>/` with `pack.json` (`name`, `description`, `requires`), `playbooks/*.md`, and optional `skills/<skill>/SKILL.md` and `rules/*.md`.

A consumer repo commits:

```
.agents/packs.json       {"packs":[{"name":"acme","source":"acme-eng/agents"}]}
.agents/playbooks.lock   {"packs":{"acme":{"source":"acme-eng/agents","commit":"<sha>"}},"files":{"x.md":{"pack":"acme","hash":"sha256:<hex>"}}}
.agents/playbooks/*.md   pack files, byte for byte, plus files the repo owns, outside the lock
rulesync.jsonc           one `sources` entry per pack that ships skills or rules
```

A lock pack entry also carries `requires` when it has any, so `remove` can refuse offline. Copies stay committed, so a teammate on plain pstack reads them with no install step and CI needs no secret.

### install

`install <pack>... --from <owner/repo|path>` resolves `requires` from the same source, copies each pack's playbooks, and writes the lock and the manifest. A rerun changes nothing unless the source moved. `--from` can be left out for a pack the manifest lists. A slug always comes from the forge, even when a folder of that name exists, so a repo cannot stand in for its own source. Write a folder with a leading `./`. A slug fetches with `gh` when it is installed, else `git` over ssh, so a person's own login is the only auth. `PLAYBOOKS_GIT_BASE` points `git` at another forge or a mirror, as `<base>/<owner>/<repo>`. A path reads that folder's working tree, and the manifest records it relative to the repo.

In a linked worktree, the pack verbs and `check --locked` act on that worktree, because the change reaches others through its branch. `check` and `show` read the main checkout, as they do for all team files.

These fail with exit 1, name the file, and write nothing:

| Case | Names |
| --- | --- |
| A pack or a required pack is missing | `packs/<name>/pack.json` |
| A cycle in `requires` | `packs/<name>/pack.json`, with the cycle |
| Two packs ship one stem | `packs/<name>/playbooks/<file>`, with the other pack |
| A stem is a bundled playbook's | `packs/<name>/playbooks/<file>` |
| A different file the repo owns has that name, or a symlink does, dangling or not | `.agents/playbooks/<file>` |
| A locked file was edited by hand | `.agents/playbooks/<file>` |
| A symlink in a pack | `packs/<name>/playbooks/<file>` |
| A symlink that carries a pack, its `pack.json`, or its `playbooks`, `skills` or `rules` out of the source, because a clone must not copy from the installer's disk | that path, such as `packs/<name>/playbooks` |
| A lock key that is no plain `*.md` name, a lock or manifest pack that is no pack name, because `update` deletes at the paths they build | the lock or the manifest |
| A repo lock with `link` | `.agents/playbooks.lock` |
| A cycle in `extends`, a stale quote, or two files replacing the same words | the file, from the same validation as `check` |

A file the repo owns with the same bytes as the pack's is adopted into the lock. A flat lock from before packs is read and verified, and `install` rewrites it. Files it pinned that no pack ships become repo-owned.

### rulesync

`install` and `update` add one `sources` entry per pack that ships skills or rules, and run nothing: the next line tells you to run `rulesync install`. They edit only the text around the entry, so comments stay. The repo path sits in `source`, after a colon, such as `acme-eng/agents:packs/acme/skills`, because rulesync locks by `source` and skips a second entry that shares one, even when its `path` differs. A pack with no rulesync config, a local source, or `--user` gets an info line, and its skills and rules are not delivered.

### update

`update [<pack>...]` re-fetches each named pack, or every listed pack, deletes files the pack stopped shipping, and rewrites its rulesync entry. It refuses a hand-edited file, because overwriting it would lose the change.

### remove

`remove <pack>` deletes its files, its lock and manifest entries, and its rulesync entry, and removes the lock, the manifest and any folder left empty. It refuses while another installed pack requires it, or while a remaining file extends it.

### --user

`--user` installs into `<config>/playbooks/packs/<pack>/`, with the lock and manifest in the config dir. Those files are active everywhere, as user files, so a user file may extend them. A team file may not, because teammates do not have them.

### --link

`install <pack> --user --link --from <folder>` references the folder live instead of copying, so private playbooks stay in their own repo and edits apply at once, with no network. `<config>/playbooks/packs/<pack>` becomes a symlink to `<folder>/packs/<pack>/playbooks`. The lock records the path and `"link": true`, with no commit and no file hashes, so there is nothing for `--locked` to compare. A folder that goes missing is a problem in `check` and `check --locked --user`. Rerun `install` without `--link` to switch to a copy.

A repo install refuses `--link`, and refuses a local source outside the repo, because a committed manifest cannot point at a private folder.

### Same names under rulesync

rulesync drops a pack's skill or rule with exit 0 when the repo's own `.rulesync` has that name, where the repo wins, or when an earlier source already fetched it, where the first wins. `--frozen` passes either way. Because that loss is silent, `install` and `update` fail naming both sides, including other sources in `rulesync.lock`, and a rename resolves it.

### Without pstack

`install`, `update` and `remove` still work with no pstack, and print a `warning:` line naming how to install it, because playbooks need pstack's poteto-mode to run. Nothing validates the files against pstack on that run.

### check --packs

`check --packs <root>` is the linter for a repo that holds packs, for its CI, with no pstack and no install:

```sh
playbook check --packs .
```

It fails, naming the file and line, on a `pack.json` that is missing, has the wrong `name`, or lacks `description`, `requires` that name no pack or form a cycle, a playbook with no `when:`, a `layer:` key, a change with no straight-quoted anchor, a standalone playbook with edits, a stem two packs share, a cycle in `extends`, a parent in a pack the file's pack does not require, and a symlink, in a pack file or on a pack folder that leaves the source. To require a word in every stem, such as an org name, add `packs/config.json` holding `{"nameWords": ["acme"]}`. With no such file there is no name rule. `--json` prints the shape `check --json` prints. Stale quotes need a pstack, so run `playbook check` in a repo that installs the pack.

### check --locked

`check --locked` checks only that each locked file holds its locked bytes and that the lock and the manifest name the same packs. It needs neither pstack nor the source, so it fits CI. With no lock it passes and says so. Plain `check` runs the same check, and names each hand-edited file.

## list

`list` prints each root active in the context, with its kind (`pstack`, `team` or `user`) and the active members of its family in apply order.

## check

`check` runs pstack's `check-playbooks.mjs` from the repo root when the repo has `.agents/playbooks`, and passes its lines through. Then it checks every team file and every user file active in the context, and prints `<path>:<line>: <message>`. [playbooks.md](playbooks.md#check) says which rules come from pstack-claude.

| Rule | Message |
| --- | --- |
| frontmatter has `when` | `missing when:` |
| no `layer:` key | `layer: is retired, because extends sets the order; delete it` |
| no numbered or unnumbered layer folder at the config root | `numbered layer folders are retired; move each file into playbooks/ ...` |
| each `extends` stem is defined in some context | `extends <x>, which no playbook defines` |
| a team file extends only bundled or team stems | `team files extend bundled or team playbooks, and neither pstack <ver> nor this repo has <x>` |
| a locked file holds its locked bytes | `hand-edited: its bytes differ from the lock ...`, or `the lock pins it, but it is missing; run playbook update` |
| no cycle among user files | `extends a cycle: <a> -> <b> -> <a>` |
| a stem is not bundled | `<x> is a bundled playbook's name; rename the file, such as <x>-<qualifier>.md` |
| a stem is unique among active files and files active everywhere | `<x> is also <path>; rename one, such as <x>-<qualifier>.md` |
| an edit line's quote is in straight double quotes | `a change has no straight-quoted step text to anchor on` |
| quote matches a step its ancestors wrote | `quote not found: "<q>"`, or `quote not found in what its parents leave: "<q>"; <file> wrote it, so add <file> to extends` |
| quote matches only 1 step | `quote matches steps <a> and <b>; make it longer` |
| quote is in a numbered step, not intro text | `quote is outside a numbered step` |
| a team file quotes no user file | `team files may quote pstack and team files only, because teammates do not have user files` |
| two siblings do not Replace the same words | `replaces words that <x> also replaces in <playbook> step <N>; make one file extend the other` |
| a standalone playbook has no edit lines | `standalone playbook cannot carry edits` |
| no symlink in the config dir or `.agents/playbooks` is dangling | `broken link -> <target>` |
| `.agents/playbooks` does not link into the config dir | `links into the config dir; team playbooks are committed copies, so replace the link with them` |
| each handoff names a playbook some file or pstack defines | `hands off to <x>, which no playbook defines` |
| `<playbook> step N`, `steps N, M` or `steps N-M` names a step the family has | `<x> step <N>, but <x> has <K> steps` |

A handoff is a `playbooks/<stem>.md` path, or a playbook named right after `run`, `per`, `route ... to`, or `hand ... to`, as a bold title, a capitalized title, or a kebab-case stem. A title resolves to a stem the way poteto-mode resolves it: kebab case, hyphens kept, other punctuation dropped. A bold name that is a poteto-mode section or skill, such as **Comments**, is not a handoff. `check` reads only text a playbook file wrote, never the pstack words an edit quotes, because pstack owns its own text.

A known playbook after `run`, `runs`, `running`, `ran` or `per`, in a form the handoff parser skips, such as lowercase `run babysit` or `runs reviewing-code`, prints `info: <path>:<line>: "<phrase>" may name <x> but does not register as a handoff; if it is one, write playbooks/<x>.md`. It does not fail the check or withhold a playbook, because the same words are often plain prose, such as `one PR per feature`.

A step reference resolves `N` against the playbook's merged steps, so a reference that went stale when steps shifted fails, and `compute` withholds the playbook as it does for any other problem. A reference needs the whole playbook name, so `pre-shipping step 99` is not one, and it may be written `playbooks/<x>.md step N`. Both rules read only text a playbook file wrote.

These print `info:` lines and do not fail the check:

- A file whose parent only another context defines: `extends <x>, which only <where> defines, so this file is dormant here`, where `<where>` is a repo key or a scope folder. Its child gets `extends <x>, which is dormant here, so this file is too`.
- A handoff to a playbook only another context defines, `hands off to <x>, which only <where> defines`, or to a dormant file, `hands off to <x>, which is dormant here`. A user file in `playbooks/` applies in every repo, so it can hand off to a playbook that exists in some repos only.
- A team file with a team parent that the installed pstack's checker refuses: `extends a team file, and plain pstack refuses that until its check-playbooks accepts project parents, so playbook checked it instead`. `check` drops pstack's lines for that file and runs its own anchor check on it. A pstack that accepts it draws no line.
- A team file whose name lacks its scope word, unless the lock pins it, because a pack file installs into many repos: `a team file name carries its scope word (<org> or <repo>), such as <x>-<org>.md`.

`check` reads team stems from every checkout in `config.json` `repos`, so missing and dormant results are the same from any directory.

`check` ends with `check passed: pstack <ver>` or `check failed: ...`. Without `--pstack`, a pass records the checked version in `config.json` when that file exists.

## doctor

`doctor` checks the install and prints one line per check: `✓` for a pass, `✗` for a failure, and `-` for information. Only `✗` fails doctor. A failing line carries one short hint. doctor writes nothing, and runs `check` with `--pstack` set to the pstack it found, so `check` records no version.

| Check | Passes when |
| --- | --- |
| pstack-claude | playbook finds a pstack, by the search order under [Environment](#environment). The line names the version and folder. |
| cli | `playbook` on `PATH` resolves to a plugin's `bin/` script or the skill's own script. A missing link fails in a plugin install, and prints a `-` line in a skill install, where agents run the script by path. |
| config | The config dir holds a `config.json` that parses and has a `handle`. With no `config.json` it prints a `-` line, and skips the mode skill. |
| mode skill | `<config>/mode/<handle>-mode/SKILL.md` exists, and a `skills` folder in a dot-folder of the home directory links to it. |
| check | `playbook check --repo <repo>` passes for each repo in `config.json` `repos`, or `playbook check` passes when the config has no repos. A `.agents/playbooks` that git does not track prints a `-` line, because only the operator sees it. |

doctor finds a repo's checkout at `repos.<repo>.checkout` in `config.json`, which the `setup` skill records. Without that key, it uses the current directory's checkout when its key matches.

`--json` prints the findings.
