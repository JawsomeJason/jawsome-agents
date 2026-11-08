# playbook

Playbook extends team playbooks with personal ones, over pstack's bundled poteto-mode playbooks. Each file names the playbook it changes in `extends`, as pstack-claude's project playbooks do, and those chains set the order: parents first, team files before personal ones. `playbook` prints each playbook with every file that extends it applied, tags each step with the file that wrote it, and lists every override. An agent runs one step list, and you see whose rule changed which step.

Playbook keeps pstack's playbook format and edit grammar, adds no verbs, and never pins a pstack version. After a pstack upgrade, `playbook check` names each quote that does not match its step.

The plugin ships three skills. The `playbook` skill runs `playbook` for an agent. The `learn` skill turns a session's corrections into proposed playbook edits and writes the ones you pick. The `setup` skill writes your `<handle>-mode` skill, scaffolds the config dir, and records your repos' checkouts. You can rerun `setup` at any time.

Packs share playbooks across repos. `playbook install acme --from acme-eng/agents` copies a pack's files into `.agents/playbooks/` byte for byte, pins them in a lock, and prints the `rulesync.jsonc` line for any skills and rules it ships, so one reviewed change in the source reaches every repo on its next `playbook update`, and a teammate on plain pstack keeps working. CI runs `playbook check --locked`, which needs no pstack, no source and no secret. Private playbooks stay private: `playbook install mine --user --link --from <folder>` references a local folder live, with no copy and no network. A repo that holds packs lints them in CI with `playbook check --packs .`. This repo's [`packs/jawsome`](../../packs/jawsome/pack.json) is one such pack.

- The [playbook reference](skills/playbook/references/cli.md) lists the commands, flags, exit codes, and environment variables.
- [Playbook files, families, and order](skills/playbook/references/playbooks.md) describes where files live, their format and names, the order they apply in, and what `check` validates, each rule marked with the project that provides it.
- [ADR-0001](docs/adr/0001-extends-chains-replace-layers.md) records why `extends` chains replaced numbered layer folders.
- [CONTRIBUTING.md](CONTRIBUTING.md) lists the checks and the rules for changes.
- [GLOSSARY.md](GLOSSARY.md) defines the terms these docs use and says which of upstream pstack, pstack-claude or playbook each comes from.

This plugin began as its own repo, `jawsome-playbooks`, whose history came here intact.

## Install and set up playbook

Playbook needs Node, git, and [pstack-claude](https://github.com/michael-denyer/pstack-claude), a port of pstack. Poteto's original pstack for Cursor does not work with playbook. Project playbooks and `check-playbooks.mjs` exist only in the port. Playbook builds on project playbooks, and playbook runs `check-playbooks.mjs`.

Each step has one row per harness that pstack-claude supports, in the order its README lists them. `tests/readme-harnesses.test.mjs` fails when a step leaves one out.

The **Checked** column says what someone ran. The Claude Code, Codex, Pi, and Muse rows of steps 1 and 4 come from installs into a throwaway home directory. The rows of steps 2, 3 and 5 changed when the plugin moved into this repo, and only the skill-only route has been run since, by `tests/standalone.test.mjs`. No harness has run the `setup` skill end to end.

### 1. Install pstack-claude

These are pstack-claude's own steps. The source for them is [the install section of pstack-claude's README](https://github.com/michael-denyer/pstack-claude#install). If a command here fails, follow that section instead.

| Harness | Commands | Checked |
| --- | --- | --- |
| Claude Code | `claude plugin marketplace add michael-denyer/pstack-claude`, then `claude plugin install pstack@pstack-claude -s user` | Yes |
| Codex | `codex plugin marketplace add michael-denyer/pstack-claude`, then `codex plugin add pstack@pstack-claude` | Yes |
| Pi | `pi install git:github.com/michael-denyer/pstack-claude` | Yes |
| GitHub Copilot | `copilot plugin marketplace add michael-denyer/pstack-claude`, then `copilot plugin install pstack@pstack-claude` | Untested |
| Muse | `git clone https://github.com/michael-denyer/pstack-claude`, then `muse plugins install ./pstack-claude/plugins/pstack` and `muse plugins approve pstack` | Install yes, approve not run |
| OMP | `omp plugin marketplace add michael-denyer/pstack-claude`, then `omp plugin install --scope user pstack@pstack-claude`, then restart OMP | Untested |
| Kimi Code CLI | Close other Kimi sessions, then in a fresh session run `/plugins install https://github.com/michael-denyer/pstack-claude`, then `/reload` | Untested |
| Grok Build | `git clone https://github.com/michael-denyer/pstack-claude`, then `grok plugin install "$PWD/pstack-claude/plugins/pstack" --trust` and `grok plugin enable pstack` | Untested |
| MiniMax Code | Check that `${MINIMAX_DATA_DIR:-$HOME/.minimax}/plugins/pstack` does not exist, then `git clone https://github.com/michael-denyer/pstack-claude`, `mkdir -p "${MINIMAX_DATA_DIR:-$HOME/.minimax}/plugins"` and `cp -R pstack-claude/plugins/pstack "${MINIMAX_DATA_DIR:-$HOME/.minimax}/plugins/pstack"` | Untested |
| OpenCode 2 | `opencode plugin add 'github:michael-denyer/pstack-claude#main'`, or clone pstack-claude and add the absolute path to `plugins/pstack/opencode` to the `plugins` array in `~/.config/opencode/opencode.jsonc` | Untested |
| Antigravity (agy) | `git clone https://github.com/michael-denyer/pstack-claude`, then `agy plugin install ./pstack-claude/plugins/pstack` | Untested |
| Gemini CLI | Clone pstack-claude and link each folder in `plugins/pstack/skills/` into `$HOME/.agents/skills/`, with the loop under [Other harnesses](https://github.com/michael-denyer/pstack-claude#other-harnesses) | Untested |
| Prime Agent | The same as Gemini CLI | Untested |

### 2. Install playbook

If the harness asks for a scope, pick user scope, so playbook works in every repo. A repo can instead commit the skill through rulesync, as the [repo README](../../README.md#install) shows. The skill alone is a complete install: `playbook doctor` passes it without a plugin.

| Harness | Commands | Checked |
| --- | --- | --- |
| Claude Code | `claude plugin marketplace add JawsomeJason/jawsome-agents`, then `claude plugin install playbook@jawsome-agents -s user` | Not since the move |
| Codex | `codex plugin marketplace add JawsomeJason/jawsome-agents`, then `codex plugin add playbook@jawsome-agents` | Not since the move |
| Pi | `npx skills add JawsomeJason/jawsome-agents --skill playbook --skill setup --skill learn` | Untested |
| GitHub Copilot | `copilot plugin marketplace add JawsomeJason/jawsome-agents`, then `copilot plugin install playbook@jawsome-agents` | Untested |
| Muse | `npx skills add JawsomeJason/jawsome-agents --skill playbook --skill setup --skill learn` | Untested |
| OMP | `npx skills add JawsomeJason/jawsome-agents --skill playbook --skill setup --skill learn` | Untested |
| Kimi Code CLI | `npx skills add JawsomeJason/jawsome-agents --skill playbook --skill setup --skill learn` | Untested |
| Grok Build | `npx skills add JawsomeJason/jawsome-agents --skill playbook --skill setup --skill learn` | Untested |
| MiniMax Code | `npx skills add JawsomeJason/jawsome-agents --skill playbook --skill setup --skill learn` | Untested |
| OpenCode 2 | `npx skills add JawsomeJason/jawsome-agents --skill playbook --skill setup --skill learn` | Untested |
| Antigravity (agy) | `npx skills add JawsomeJason/jawsome-agents --skill playbook --skill setup --skill learn` | Untested |
| Gemini CLI | `npx skills add JawsomeJason/jawsome-agents --skill playbook --skill setup --skill learn` | Untested |
| Prime Agent | The same as Gemini CLI | Untested |

To update playbook or pstack, use the harness's own update command, such as `claude plugin update playbook@jawsome-agents`. Do not copy a newer version into a plugin cache by hand. The harness loads the version its install record names, so the harness never runs a hand copy. Playbook reads the same record to pick pstack.

### 3. Put playbook on PATH

Link the harness's copy of the command into a folder on `PATH`:

```sh
ln -s <path from the table> "$HOME/.local/bin/playbook"
```

Link from a folder that updates in place. A link into a versioned cache folder keeps pointing at the old version after an update. A skill install can skip this step, because agents run its script by path.

| Harness | Path to link | Checked |
| --- | --- | --- |
| Claude Code | `$HOME/.claude/plugins/marketplaces/jawsome-agents/plugins/playbook/bin/playbook`, the marketplace clone that plugin updates refresh | Not since the move |
| Codex | `plugins/playbook/bin/playbook` in your jawsome-agents clone. Codex offers no stable copy to link. | Not since the move |
| Pi | `scripts/playbook.mjs` in the installed `playbook` skill folder | Untested |
| GitHub Copilot | `$HOME/.copilot/installed-plugins/jawsome-agents/playbook/bin/playbook`, from the layout pstack-claude's Copilot smoke test checks | Untested |
| Muse | `scripts/playbook.mjs` in the installed `playbook` skill folder | Untested |
| OMP | `scripts/playbook.mjs` in the installed `playbook` skill folder | Untested |
| Kimi Code CLI | `scripts/playbook.mjs` in the installed `playbook` skill folder | Untested |
| Grok Build | `scripts/playbook.mjs` in the installed `playbook` skill folder | Untested |
| MiniMax Code | `scripts/playbook.mjs` in the installed `playbook` skill folder | Untested |
| OpenCode 2 | `scripts/playbook.mjs` in the installed `playbook` skill folder | Untested |
| Antigravity (agy) | `scripts/playbook.mjs` in the installed `playbook` skill folder | Untested |
| Gemini CLI | `scripts/playbook.mjs` in the installed `playbook` skill folder | Untested |
| Prime Agent | The same as Gemini CLI | Untested |

### 4. Point playbook at pstack

Playbook finds pstack without help when the harness keeps a plugin cache in a dot-folder of your home directory. For every other harness, set `PLAYBOOKS_PSTACK_DIR` to the pstack plugin folder, the one that holds `skills/poteto-mode/`. The [playbook environment reference](skills/playbook/references/cli.md#environment) gives the full search order.

| Harness | How playbook finds pstack | Checked |
| --- | --- | --- |
| Claude Code | The install record, `$HOME/.claude/plugins/installed_plugins.json`, so it uses the version the session runs | Yes |
| Codex | The one version folder in `$HOME/.codex/plugins/cache/pstack-claude/pstack/`. Codex keeps a single version of each plugin and replaces it on each `codex plugin add` and `codex plugin marketplace upgrade`, downgrades included, so that folder is the version Codex runs. Codex records the version nowhere else. `config.toml` holds only `enabled = true`, and `.codex-marketplace-install.json` in the marketplace snapshot holds the marketplace's git revision. If Claude Code also has pstack, its install record wins, so set the variable when the two run different versions. | Yes |
| Pi | Set `PLAYBOOKS_PSTACK_DIR=$HOME/.pi/agent/git/github.com/michael-denyer/pstack-claude/plugins/pstack` | Yes |
| GitHub Copilot | Set `PLAYBOOKS_PSTACK_DIR=$HOME/.copilot/installed-plugins/pstack-claude/pstack`, the folder pstack-claude's Copilot smoke test checks | Untested |
| Muse | Set `PLAYBOOKS_PSTACK_DIR` to `plugins/pstack` in your pstack-claude clone. After a `git pull` there, run `muse plugins update pstack` so Muse loads the same version. | Yes |
| OMP | Set `PLAYBOOKS_PSTACK_DIR` to the pstack folder OMP installed. pstack-claude's README names no path for it. | Untested |
| Kimi Code CLI | Set `PLAYBOOKS_PSTACK_DIR` to the pstack folder in the copy Kimi installed. pstack-claude's README names no path for it. | Untested |
| Grok Build | Set `PLAYBOOKS_PSTACK_DIR` to `plugins/pstack` in your pstack-claude clone. After a `git pull` there, reinstall as pstack-claude's Grok Build notes say, because `grok plugin update` does not refresh a local install. | Untested |
| MiniMax Code | Set `PLAYBOOKS_PSTACK_DIR=${MINIMAX_DATA_DIR:-$HOME/.minimax}/plugins/pstack`, the folder the `cp` in step 1 writes | Untested |
| OpenCode 2 | Set `PLAYBOOKS_PSTACK_DIR` to `plugins/pstack` in your pstack-claude clone. pstack-claude's README names no path for the native Git package. | Untested |
| Antigravity (agy) | Set `PLAYBOOKS_PSTACK_DIR=$HOME/.gemini/config/plugins/pstack`, where pstack-claude says `agy plugin install` puts the bundle | Untested |
| Gemini CLI | Set `PLAYBOOKS_PSTACK_DIR` to `plugins/pstack` in your pstack-claude clone | Untested |
| Prime Agent | The same as Gemini CLI | Untested |

### 5. Run setup

Run the `setup` skill. It writes your `<handle>-mode` skill, scaffolds the config dir, records your repos' checkouts, and links the mode skill into the skill folders your harness loads. The config dir is `$HOME/.jawsome-playbooks`, or `$PLAYBOOKS_CONFIG` when you set it. If it holds rules you would not publish, keep it private.

After setup, start a new session, so the harness loads `/<handle>-mode`. To check the install later, run `playbook doctor`. It prints each check with `✓` or `✗` and a short hint under each failure. The [doctor reference](skills/playbook/references/cli.md#doctor) lists the checks.

| Harness | How to run it | Checked |
| --- | --- | --- |
| Claude Code | `/playbook:setup` | Yes, the command. Setup itself not run. |
| Codex | Ask for `playbook:setup` by name, or pick it from the skill list, as pstack-claude's Codex notes say for `pstack:poteto-mode` | Untested |
| Pi | `/skill:setup`, the form pstack-claude's Pi notes give | Untested |
| GitHub Copilot | `/playbook:setup`, the form pstack-claude's Copilot notes give | Untested |
| Muse | `/setup`, the form pstack-claude's Muse notes give. | Untested |
| OMP | Ask the agent to run the `setup` skill by name. pstack-claude's OMP notes give no skill command. | Untested |
| Kimi Code CLI | Ask the agent to run the `setup` skill by name. pstack-claude's `/skill:pstack:<name>` form is for plugin skills, and playbook installs as a plain skill. | Untested |
| Grok Build | Ask the agent to run the `setup` skill by name. pstack-claude's `/poteto-mode` form is for plugin skills, and playbook installs as a plain skill. | Untested |
| MiniMax Code | Ask the agent to run the `setup` skill by name. pstack-claude's MiniMax Code notes give no skill command. | Untested |
| OpenCode 2 | Ask the agent to run the `setup` skill by name. pstack-claude's `pstack-` skill IDs are for its plugin, and playbook installs as a plain skill. | Untested |
| Antigravity (agy) | Ask the agent to run the `setup` skill by name. pstack-claude's Antigravity notes give no skill command. | Untested |
| Gemini CLI | Ask the agent to run the `setup` skill by name. pstack-claude says these harnesses have no routing hook, so you name the skill. | Untested |
| Prime Agent | The same as Gemini CLI | Untested |

## Credits

Playbook runs on top of two projects:

- [pstack](https://github.com/cursor/plugins/tree/main/pstack), which provides the playbooks and poteto-mode.
- [pstack-claude](https://github.com/michael-denyer/pstack-claude), which makes it possible for repos to add their own playbooks.

Playbook doesn't copy pstack's playbooks. It reads them from your install and adds your edits on top.

The test fixtures use a few short excerpts of pstack-claude's playbooks, under the MIT license. See [NOTICE](NOTICE).
