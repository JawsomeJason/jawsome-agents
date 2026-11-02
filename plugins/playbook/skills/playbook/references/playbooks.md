# Playbook files, families, and order

Each rule is tagged **[pstack-claude]** when pstack-claude provides it, so a teammate without playbook gets it too, or **[playbook]** when only playbook does. An agent reading a team file assumes only the [pstack-claude] rules apply. Chains replaced numbered layer folders because a chain states what a file depends on, and `check` can prove each quote still anchors.

## Where files are found

- **Team files** are `<main checkout>/.agents/playbooks/*.md`, top level only. A pull request changes them. [pstack-claude] The repo is the main checkout of the current directory, so a worktree reads its main checkout's team files, and `--repo <repo>` reads the checkout `config.json` records. [playbook]
- **Pack files** are team files a repo installed, or user files under `<config>/playbooks/packs/<pack>/` with `--user`, pinned by a lock. [cli.md](cli.md#packs) describes them. [playbook]
- **User files** sit in the config dir, `$PLAYBOOKS_CONFIG` or `.jawsome-playbooks` in the home directory. [playbook]

  ```
  <config>/
  ├── config.json
  ├── playbooks/*.md                 active in every context
  ├── playbooks/orgs/<org>/*.md      active in a checkout whose owner config.json maps to <org>
  └── playbooks/repos/<repo>/*.md    active in the checkout whose repo key is <repo>
  ```

  A scope folder says where a file is active, never its order. A file whose parent exists only in some contexts needs none: elsewhere it is dormant.

- The repo key is the name part of `git remote get-url origin`, and the owner is the part before it. A repo with no `origin` uses its folder name. [playbook]

## config.json

```json
{
  "handle": "sam",
  "modeTrigger": "manual",
  "pstack": "1.2.3",
  "orgs": { "acme": { "owners": ["acme-eng"] } },
  "repos": { "web": { "checkout": "/tmp/sam/code/web" } }
}
```

`orgs` maps an org to its forge owners and selects `playbooks/orgs/<org>/`. `repos` records each main checkout, so `check` and `doctor` find team files from any directory. `pstack` is the version the files last passed `check` against; playbook records it and never pins it. `handle` names the mode skill and is the default file-name qualifier. [playbook]

## File format

```markdown
---
extends: babysit
when: one sentence naming the requests it serves
---

- **After** "Work the merge frontier" Read the default branch's ruleset first.
- A list item with no verb is a note.
```

- `extends` names parents by stem, separated by commas, and patches them in place. [pstack-claude] An empty `extends` with numbered steps is a standalone playbook. [pstack-claude]
- `when` is required. poteto-mode finds a standalone playbook only by it. [pstack-claude]
- An edit line is a list item, a bold verb (`After`, `Before`, `Replace`, `In`), a quote in straight double quotes, then the change text. [pstack-claude] `After` and `Before` insert a step, `Replace` strikes the quoted words and adds the change after them, and `In` appends to the step. [pstack-claude]
- A team file that extends only bundled stems and quotes only bundled text runs on plain pstack. [pstack-claude] A team file may also extend another team file in the repo, and plain pstack refuses that file until its checker accepts project parents, so shared content stays chain-free when teammates run plain pstack. [playbook] A user file may extend any bundled playbook, any active team file, or any active user file. [playbook]
- `source:` is a team review convention that playbook ignores. [playbook]

## Names

1. Every stem is unique: no file takes a bundled stem, and no two files active in one context share one. [playbook]
2. A team file carries its scope word, the org name or repo key, as one hyphen-separated word, such as `opening-an-acme-pr`. `check` reports a missing one as info. [playbook]
3. A user file that derives from a parent is `<parent>-<qualifier>`: the handle, the org or repo key, or a word for a variant. A standalone playbook is named for the work. [playbook]

## Resolution

1. A **root** is a bundled playbook or a standalone playbook. A file with an `extends` is a **patch**, and never becomes its own step list. [pstack-claude]
2. A root's **family** is the root and every active file that reaches it through `extends`. A file with several parents belongs to each one's family. [pstack-claude] for team files, [playbook] across chains.
3. A file is active only where every parent it names is active. A parent defined only in another context makes the file **dormant**, which `check` reports as info. [playbook]
4. Any member's name resolves to its root: `playbook show opening-an-acme-pr` prints the `opening-a-pr` family. [playbook]
5. The bundled playbook splits into steps. A line `N. ` at column 0 starts a step, which runs until the next step or a blank line followed by an unindented line. A playbook with no numbered steps takes each paragraph with a bold lead as a step. Other text is intro, and no quote may match there. [playbook]
6. Members apply in topological order, parents first. Ties break team files before user files, then by stem. [playbook] Each file applies its edits in line order. [playbook]
7. A quote matches, whitespace collapsed, only the text the file's ancestors wrote, never a sibling's. [playbook], generalizing pstack-claude's rule that team quotes match only bundled text. The result does not depend on the order siblings are read in.
8. **Siblings** share a parent and neither descends from the other. Both apply. [pstack-claude] for team files, [playbook] for the rest. Their `In` and `After` text lands in apply order. Two siblings that `Replace` the same words fail `check`; make one extend the other. [playbook]
9. Every step records the stem that wrote it and each stem that edited it. An `In` or `Replace` on a step a different file wrote is an override, which `show` lists for the agent to name. [playbook]

## Check

| Check | Result | Provenance |
| --- | --- | --- |
| `check-playbooks.mjs` passes on `.agents/playbooks` | fail | [pstack-claude] |
| A chain-free team file quotes text no bundled parent has | fail | [pstack-claude] |
| A team file extends a stem that neither pstack nor the repo has, or quotes a user file | fail | [playbook] |
| A team file with a team parent that pstack's checker refuses | info | [playbook] |
| A locked pack file whose bytes differ from the lock | fail | [playbook] |
| Missing `when` | fail | [pstack-claude] |
| An `extends` stem that no context defines | fail | [playbook] |
| An `extends` stem defined only in another context | info: dormant here | [playbook] |
| A cycle among team and user files, self-extension included | fail, naming the cycle | [playbook] |
| A stem that is bundled, or that another active file uses | fail, with a rename hint | [playbook] |
| A quote that matches no step, or several, in what its ancestors leave | fail, naming the file that wrote it when that file is no ancestor | [playbook] |
| Sibling `Replace` edits on the same words | fail | [playbook] |
| A `<playbook> step N` that names a step the family lacks | fail | [playbook] |
| A team file name without its scope word | info | [playbook] |
| A standalone playbook with edit lines | fail | [playbook] |

[cli.md](cli.md#check) gives each message.

## Writing files

Edit the Markdown directly, then run `playbook check`, which names every problem an edit adds. A user file reaches every repo it is active in, so run `playbook check --every-repo` after changing one. [playbook] Team files change through a pull request. [pstack-claude]
