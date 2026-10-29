# Playbook checks

A playbook is a Markdown file of numbered steps an agent follows, such as "opening a PR" or "releasing". Some setups layer playbooks: a bundled playbook ships with a plugin, and layer files from the operator, an org or a repo apply edit lines to its steps in cascade order, where a later layer wins. Others keep a playbook as one plain Markdown file.

A rule about how an agent runs a playbook ("never ping reviewers past a failing check") is enforced by a script the step runs, because the agent then cannot skip it by forgetting.

## Find the step

- With a playbook tool that lists and computes layered playbooks, list the playbooks, then compute the one the rule governs. The computed output tags each step with its origin layer and lists every override.
- Without one, the playbook is the Markdown file itself. Search the repo and the agent's instruction folders for it.

## Write the check

1. Write the check as a standalone executable. Put it in the scripts folder of the playbook tool's config dir, or beside the playbook file when there is no tool. Layer folders hold playbook Markdown only, so a script there may be read as a layer file.
2. Have it exit non-zero with a message that names the right action when the rule is broken.
3. Edit the step to run the script by its full path and stop on failure.

## Edit the right file

Edit the layer file that wrote the step. When the step's origin is the bundled playbook, write a `**Replace**` or `**In**` edit line quoting the step in the operator's own layer instead, because a plugin upgrade overwrites its own files. When the step's origin is a team file, put the edit line in the matching overrides layer, because team files carry the team's rules. When the playbook tool has a check command, run it after the edit and fix every line it reports, because a quote that no longer matches its step applies nowhere.

## Prove it

Run the script by path once on a case that breaks the rule and once on a case that holds. Both results go in the report.
