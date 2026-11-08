# Fonts

The reference's fonts are almost never licensed for reuse, so the system ships the closest open-licensed substitute for each face and keeps a fallback stack that names the reference face for machines that already have it installed under their own licence.

## Choosing a substitute

1. Identify each reference face by classification first (humanist sans, geometric sans, grotesque, slab, serif), then by the features that carry its look: x-height, aperture, the shape of `a`, `g`, `R` and `Q`, numeral style, width.
2. Pick a family under an open font licence that matches those features, with the weights the reference uses. Prefer a variable font with a weight axis, because one file then covers every weight.
3. Compare at the measured sizes: set the same strings in both and match cap height and line length; adjust the size tokens rather than the font, and record the adjustment in the token's evidence.
4. Numerals often come from a different face than text (score counters, prices, hit points). Treat them as their own family token.

## The family tokens

```text
--font-text:    Substitute, "Reference Face", similar system faces, ui-sans-serif, system-ui, sans-serif
--font-numeral: Numeral Substitute, "Reference Numeral Face", similar faces, ui-sans-serif, sans-serif
```

The substitute comes first so every user sees the same metrics. The reference face's name in the stack is a local-font hint only; the system never ships its files.

## Fetching by script

A fetch script downloads each family from an open font distribution (a package registry, a font library, or a release archive), copies only the files the system uses (subset by script and axis, normal and italic) under the file names `tokens.css` expects, and copies each family's licence beside them as `LICENSE-<Family>.txt`. It does nothing when every target exists, so a build can run it every time.

Use whatever download tool the project already has; the fetch itself is not part of the shipped system. When no network is available, the build fails with the list of missing files and where each comes from, rather than rendering previews with fallback metrics.

## Licences ship beside the files

Every copy of `fonts/` carries its licence files, and the system's top-level readme states which licence covers the fonts and which covers the rest. A font file without its licence is a licence breach even when the font is free.
