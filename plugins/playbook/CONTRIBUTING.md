# Contributing

## Run the checks

```sh
node --test 'plugins/playbook/tests/*.test.mjs'
claude plugin validate plugins/playbook
```

The tests in `tests/playbook.test.mjs` run playbook against a fake pstack in `tests/fixtures/pstack/` and a config dir in `tests/fixtures/config/`. That config dir has user files in every scope folder, including a three-deep chain, and `tests/fixtures/team/` holds the team files that `world()` in `tests/helpers.mjs` commits into a checkout's `.agents/playbooks`. Together they use all four edit verbs.

`tests/readme-harnesses.test.mjs` reads pstack-claude's README from `PSTACK_CLAUDE_README`, or from the pstack-claude marketplace clone under `$HOME/.*/plugins/marketplaces/`. Without either, the test skips and says why. CI clones pstack-claude, so the test always runs there.

## Write the failing test first

Commit a test that fails for the reason you expect, then the change that turns it green. A test that never failed may test nothing. The commit order also lets a reviewer see the test fail, then pass.

## Use the Node standard library only

Playbook and the tests import nothing outside Node, so they run wherever Node runs, with no install step.

## Stay compatible with pstack

- Use pstack's playbook format and edit grammar, and add no verbs. Team files live in a repo's `.agents/playbooks/`, where pstack reads them as project playbooks and its `check-playbooks.mjs` checks them. A verb that pstack lacks would break them there.
- Never pin a pstack version. Playbook reads whichever pstack the harness installed, and `playbook check` names each quote that an upgrade broke. A pin would hold users on an old pstack.

## Cover every harness pstack-claude supports

Each README install step has one table with a row per harness, in the order pstack-claude's README lists them. `tests/readme-harnesses.test.mjs` fails when a table drops a harness or changes the order. When pstack-claude adds a harness, add its row to every table. Mark the row untested until someone runs it.

Claude Code reads `.claude-plugin/` and Codex reads `.codex-plugin/`, with the repo-level `.agents/plugins/marketplace.json`. Every other harness installs the skills alone with a skills CLI or rulesync, so the skill folder must work with nothing around it. `tests/standalone.test.mjs` proves it.

Three files carry the version: `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, and the entry in the repo's `.claude-plugin/marketplace.json`. Change all three together. `tests/manifests.test.mjs` fails when they disagree. Keep the plugin free of symlinks, because Codex drops them when it copies a plugin.

## Write Conventional Commits

Use [Conventional Commits](https://www.conventionalcommits.org/), as the history does: `type(scope): subject`. In the body, say what changed and why, because the diff already shows how. Claim only what you checked, and name the check.

## License

Playbook is MIT-licensed, under the repo's `LICENSE`. [NOTICE](NOTICE) lists the text adapted from pstack-claude.
