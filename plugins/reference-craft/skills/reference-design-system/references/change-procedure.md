# Change procedure and definition of done

Every change, from one colour to a new component, goes through the same steps, because each skipped step is a place where tokens, docs and shipped copies drift apart.

## Procedure

1. **Find the source.** A token lives in the token table; component styles in the CSS source; a README or preview in the content sources; the driver in the runtime source; a layout number in its measurement data. Never edit a generated file.
2. **Classify the value.** Measured, derived or original, with evidence and confidence ([measured-vs-original.md](measured-vs-original.md)). An identity asset is drawn fresh.
3. **Declare its pairs.** A new colour that carries text or icons gets its contrast pairs in the same edit, and a departure record when it differs from the reference for access.
4. **Build.** Run the build entry point. It fetches missing fonts, writes tokens and fails on contrast, writes components, and copies the runtime.
5. **Render and inspect.** Run the render step, read the console-error list, and look at every screenshot in every theme that the change can reach. Fix at the source and repeat until clean ([components-and-previews.md](components-and-previews.md)).
6. **Regenerate docs.** Run the docs step; update hand-written references and data files when the research changed.
7. **Sync.** Copy the built system to each destination, deleting stale files ([docs-and-sync.md](docs-and-sync.md)).
8. **Check the repo.** Run the destination's formatter and linter, and rerun the build to prove it is idempotent.

## Definition of done

A change is done when all of these hold:

- [ ] No generated file was edited by hand; a fresh build reproduces every shipped file byte for byte.
- [ ] Every new or changed measured value has evidence and a confidence; every original value says it is original.
- [ ] Nothing the reference owns ships: no logo, glyph, illustration, texture or font file of the reference's.
- [ ] The contrast check passes in every theme, and each departure records the reference value and the reason.
- [ ] Feature CSS uses tokens for every colour, space, radius, shadow, duration and easing; component variables carry the prefix.
- [ ] Every component has a README and a preview, and every preview shows its variants, sizes and states.
- [ ] Every preview rendered in every theme with an empty console-error list, and someone inspected each screenshot.
- [ ] Reduced motion leaves every finish visible and still; motion timings name tokens and carry a confidence.
- [ ] Font files ship with their licences.
- [ ] Docs are regenerated, every shipped copy is synced, and the formatter and linter pass.
