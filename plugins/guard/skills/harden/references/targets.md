# Targets

How `harden` finds a skill or playbook by name, where its scripts go, and which file to edit.

## Resolve a name

Try each in order and collect every match:

1. **A playbook.** A playbook is a Markdown file of numbered steps an agent follows. With a playbook tool that lists and computes layered playbooks, list the playbooks and match the name. Computing it prints its steps, each tagged with its origin layer and every layer that edited it, and lists every override. Without one, search the repo's agent folders and the operator's agent instruction folders for a Markdown playbook with that name.
2. **A skill.** Search the skill folders the harness loads: the project's skill folders, the operator's skill folders, and the skill folders of installed plugins. A `plugin:skill` name picks the skill inside that plugin.

Ask which when more than one matches, because harden rewrites the file and the wrong one costs a revert.

## Where scripts go

- A skill keeps its scripts in its own `scripts/` folder, so they install and move with it.
- A layered playbook keeps them in the scripts folder of the playbook tool's config dir. Layer folders hold playbook Markdown only, so a script there may be read as a layer file.
- A plain Markdown playbook keeps them beside the playbook file.

Each replaced step then runs its script by full path.

## Which file to edit

Edit the layer file that wrote the step. For a layered playbook, the computed output names its origin layer.

- A step whose origin is the bundled playbook takes a `**Replace**` or `**In**` edit line in the narrowest layer it applies to, the operator's own layer when it applies everywhere. Never edit the plugin's own files, because an upgrade overwrites them.
- A step whose origin is a team file takes its edit line in the matching overrides layer, because team files carry the team's rules and other people own them.
- A skill installed from a plugin you do not maintain gets the same treatment: write the change to your own copy or propose it upstream, never edit the installed copy in place.
