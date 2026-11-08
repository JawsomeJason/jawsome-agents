# Docs and sync

The docs and every shipped copy are outputs of the build, like the stylesheet. A rerun rewrites them; nobody edits them by hand.

## Generated docs

A docs step reads `tokens.json` and the component READMEs and writes two references:

- **Token reference:** one table per family, with the token, its value per theme, and its usage; colour grouped by role (surfaces, ink and lines, brand and status, reward, per-object colours). Departures appear in their token's row with the reference value.
- **Component reference:** a contents list by group, then each README in group order, with its headings shifted down one level and the path to its preview.

Write the docs so the repo's Markdown formatter leaves them unchanged: a blank line after headings and around fences, tables either column-aligned or compact, one trailing newline. A generator whose output the formatter rewrites produces a diff on every run, which hides real changes.

Docs that the build cannot generate (screen layouts, how finishes are built, the reasoning behind the visual system) live as hand-written references beside the generated ones, and say at the top that they are hand-written, so a reader knows which to regenerate and which to edit.

## Sync

When the built system ships somewhere else (into an app, into a skill folder, into a hosted design-system artifact), one sync step copies it:

- Copy `project/` and `tools/` as trees, then delete files in the destination that the source no longer has, because a stale component left behind looks supported.
- Leave out what is not part of the system: caches, `out/`, and any manifest the hosting surface keeps for itself.
- Copy the runtime script, the stylesheet, `tokens.css` and `fonts/` together, keeping `fonts/` beside `tokens.css`, because the `@font-face` paths are relative to it.
- Treat the destination copy as vendor code: changes go into the source, then sync again.

## Idempotent reruns

Every step converges to the same files whatever ran before:

- Generators write whole files from their inputs; none appends or patches.
- The font fetch does nothing when every target file exists, and replaces only what is missing.
- Sync deletes what the source lacks and overwrites what differs, so a half-finished sync is fixed by running it again.
- Output order is deterministic (input order or sorted), so two runs over the same inputs produce byte-identical files and a clean diff.

Check it: run the full build twice and diff. Any change on the second run is a bug in a generator.
