# Tokens

Tokens are the contract between the measurements and everything built on them. One generator writes both token files from one table, and the same run checks contrast.

## The table

Keep the token table as data inside the generator: one row per token with its name, a value per theme (or one value for all), its usage, and its evidence record from [measured-vs-original.md](measured-vs-original.md). Usage text says where the token goes and what sits on it ("Primary action fill. Text on it is `on-brand`."), because a token without a stated pairing gets paired with whatever looks close.

Families: colour (per theme), shadow (per theme), type (families, font files, named styles), spacing, radius, size, duration, easing, gradient, stacking order.

## What the generator writes

- **`tokens.json`:** every family, every token, with usage, evidence, departures and the declared contrast pairs. Its shape is [schemas/tokens.schema.json](schemas/tokens.schema.json). Other generators (docs, previews) read this file and nothing else.
- **`tokens.css`:** `@font-face` rules; one block per theme (`:root, [data-theme="light"]` for the default, `[data-theme="dark"]` for the next) holding the themed families; one `:root` block for the rest; one class per named type style.

Before writing, the generator asserts that names are unique and match one pattern (lowercase, digits, hyphens), because a duplicate name means the second value silently wins in CSS.

## Contrast inside the build

Declare every foreground and background pair that the system lets features use, with its floor: 4.5 for text, 3 for large text, icons, control borders and focus rings. The generator computes each pair in every theme and exits non-zero on any failure, printing `theme: fg on bg = ratio (needs floor)`.

The ratio, per WCAG:

```text
channel c in 0..1:  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ^ 2.4
luminance L = 0.2126 R + 0.7152 G + 0.0722 B   (linearised channels)
ratio = (L_lighter + 0.05) / (L_darker + 0.05)
```

- A foreground with alpha is composited over its background before the check.
- A background with alpha is composited over the surface beneath it, so name that surface in the pair (`over`).
- Text on a gradient or on an image is checked against its worst stop or against the scrim beneath it; declare that stop as the background.
- Some pairs are decorative (a glow on a board, a progress bar with a number beside it). Leave them out of the list and say in their usage why no floor applies.

`scripts/contrast.mjs` runs this check over any `tokens.json` that follows the schema. A generator in another language can implement the three lines above, or call the script as its last step.

## Departures

When the reference fails contrast, keep its look and change its value. Record both, so the reason survives and nobody restores the reference value:

```json
{
  "name": "on-brand",
  "value": "#0f2a33",
  "usage": "Labels and icons on `brand`.",
  "provenance": "original",
  "confidence": "measured",
  "evidence": "The reference sets white labels on its cyan button.",
  "departure": {
    "reference": "#ffffff",
    "reason": "White on `brand` is about 1.7:1; a deep teal label passes 4.5:1, and a glossy white top band keeps the white look."
  }
}
```

Patterns that keep the look while fixing the value:

- **Dark label on a light fill.** Swap the label, not the fill; keep a highlight band or a white stroke so the button still reads as the reference's.
- **Darker shade for small marks.** A brand colour used for text or thin icons gets an `-ink` sibling a few steps darker; the fill keeps the measured value.
- **Deeper track colour.** A switch or slider whose on colour fails 3:1 against the page gets a darker on colour; the knob stays as measured.

The contrast report lists each departure with the reference value's ratio beside the new one, so a reviewer sees what the change bought.

## Roles

Fix what each colour means and write it in the usage: one primary action colour, one colour only for things earned or rewarded, status colours that always come with a word or an icon. A role that drifts (the reward colour on a purchase button) changes what the product says, not just how it looks.
