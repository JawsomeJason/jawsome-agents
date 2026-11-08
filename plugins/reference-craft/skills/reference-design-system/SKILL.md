---
name: reference-design-system
description: Builds a design system that reproduces a reference product's look from measurements, with identity assets that are always original. Covers measured tokens with evidence and confidence, one generator that writes tokens.json and tokens.css and fails on contrast, recorded accessibility departures, geometry in relative and container-query units, generated components with a README and a preview each, previews rendered in every theme and inspected, generated docs and sync, interaction physics as data, open-licensed font substitutes, a change procedure and a definition of done. Use when asked to make something look like an existing app, site, game or printed object, to turn measurements or screenshots of a reference into tokens and components, to build or extend a replica's design system, or to review one for borrowed assets, contrast or drift between tokens and docs. Pairs with reference-measure, which takes the measurements.
---

# Reference design system

A reference design system reproduces how a reference product looks without shipping anything the reference owns. Measurements become tokens; logos, glyphs and artwork are drawn fresh. Everything else in the system is generated from code, so that a rerun of one build is the only way any shipped file changes.

The system is a contract. Features use its tokens and components; when something is missing, extend the system first, then use it.

## Pipeline

Each stage reads only what the stage before it wrote, so any stage can be rerun on its own.

| Stage | Reads | Writes |
| --- | --- | --- |
| Measure | the reference | measurement records with evidence and confidence |
| Tokens | measurement records, original choices | `tokens.json`, `tokens.css`, contrast results |
| Components | tokens, component sources | one stylesheet, a small runtime script, a README and a preview per component |
| Render | previews | a screenshot per preview per theme, a console-error list |
| Docs | `tokens.json`, component READMEs | token and component reference docs |
| Sync | the built project | each copy shipped elsewhere |

Lay the project out as `tools/` (every source and generator) and `project/` (every generated file), so a reader can tell at a glance what to edit and what to rebuild. [project layout](references/project-layout.md)

## Rules

- **Measured or original, never borrowed.** Colours, geometry, type metrics and timings may be measured from the reference; logos, glyphs, illustrations and frame artwork are always this system's own, even as placeholders, because a replica that ships the reference's assets copies the property rather than the look. [measured vs original](references/measured-vs-original.md)
- **Every measured value keeps its evidence.** Each token records where it came from and a confidence (measured, observed, estimate), so a later reader knows which numbers to trust and which to tune by eye. [measured vs original](references/measured-vs-original.md)
- **One generator owns the tokens.** A single script writes `tokens.json` and `tokens.css` from one table; nobody edits either file by hand, because two writers drift and the docs then describe a system that does not exist. [tokens](references/tokens.md)
- **Contrast fails the build.** The token generator checks every declared foreground and background pair in every theme and exits non-zero below the floor, because a contrast bug caught after features use the token costs a sweep instead of one edit. [tokens](references/tokens.md)
- **Record each accessibility departure with both values.** When the reference fails contrast, keep the look and change the value, and store the reference value and the reason beside the new one, so nobody "fixes" it back. [tokens](references/tokens.md)
- **Geometry is measured, then made relative.** Positions become percentages of the component or of a design box, and components that scale use container-query units, so a measured layout holds at any size. [geometry](references/geometry.md)
- **Size steps hide what cannot be read.** Below set widths a scaling component drops its detail, because shrunken text that nobody can read is noise, not fidelity. [geometry](references/geometry.md)
- **Components come from code.** Each component's CSS, README and preview are generated from one source, so the contract, the markup and the styles cannot disagree. [components and previews](references/components-and-previews.md)
- **Render every preview in every theme and look.** A headless browser screenshots each preview per theme, a console error fails the run, and someone inspects each image; iterate until all are clean, because most layout bugs are invisible in source and obvious in a picture. [components and previews](references/components-and-previews.md)
- **Docs are generated.** Token and component reference docs are written from `tokens.json` and the READMEs, so docs never describe a value the build does not ship. [docs and sync](references/docs-and-sync.md)
- **Reruns are idempotent.** Every generator, fetch and sync converges to the same files whatever ran before, and a sync deletes what the source no longer has, so a half-finished run is fixed by running again. [docs and sync](references/docs-and-sync.md)
- **Interaction physics is data.** Pointer- and tilt-driven finishes read custom properties set by one small driver whose spring constants and reduced-motion pose are named values with confidence, so motion is tuned in one place. [interaction physics](references/interaction-physics.md)
- **Motion goes through tokens.** Durations and easings are tokens with confidence, and reduced motion keeps every state visible but still, because the reference's timing is often an estimate and must be easy to retune. [interaction physics](references/interaction-physics.md)
- **Fonts are open-licensed substitutes.** Pick the closest open-licensed family for each reference face, fetch it by script, and ship its licence beside the files, because the reference's fonts are rarely licensed for reuse. [fonts](references/fonts.md)
- **Change through the procedure.** Edit sources, rebuild, render, inspect, regenerate docs, sync, and check against the definition of done, because a skipped step is where tokens, docs and copies drift apart. [change procedure](references/change-procedure.md)

## Contrast check

`scripts/contrast.mjs` checks a `tokens.json` in the shape of [references/schemas/tokens.schema.json](references/schemas/tokens.schema.json): every pair in its `contrast` list, in every theme, with alpha composited, and the reference value's ratio beside each departure. It needs only a JavaScript runtime's standard library.

```sh
node scripts/contrast.mjs --tokens project/tokens.json --out out/contrast.json
```

It exits 1 when any pair fails and 2 on bad input; the report follows [references/schemas/contrast.schema.json](references/schemas/contrast.schema.json). A generator in another language can run the same check itself with the formula in [references/tokens.md](references/tokens.md), or call this script at the end of its build.

## Optional capabilities

- **Headless browser.** Rendering needs a browser that runs without a display and can screenshot a page and report console errors. Without one, open each preview in any browser, switch themes by hand, read the console, and record what you checked. [components and previews](references/components-and-previews.md)
- **Image inspection.** Someone, or a model that reads images, must look at each screenshot. Without either, ask the user to review the screenshot folder before calling a change done.

## Reference map

| Task | Read |
| --- | --- |
| Folder layout, what is source and what is generated | [references/project-layout.md](references/project-layout.md) |
| Deciding whether a value may be measured or must be original; evidence records | [references/measured-vs-original.md](references/measured-vs-original.md) |
| Token table, generator, theme output, contrast pairs, departures | [references/tokens.md](references/tokens.md) |
| Container units, percentage positions, design boxes, size steps | [references/geometry.md](references/geometry.md) |
| Component sources, READMEs, previews, the render loop and the bugs it catches | [references/components-and-previews.md](references/components-and-previews.md) |
| Generated docs, syncing shipped copies, idempotent reruns | [references/docs-and-sync.md](references/docs-and-sync.md) |
| Pointer and tilt finishes, the driver, springs, reduced motion, motion tokens | [references/interaction-physics.md](references/interaction-physics.md) |
| Choosing, fetching and licensing font substitutes | [references/fonts.md](references/fonts.md) |
| Making a change; the definition of done | [references/change-procedure.md](references/change-procedure.md) |
