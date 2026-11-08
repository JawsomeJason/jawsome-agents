---
name: pocket-deck-glyphs
description: Original Energy-type and rarity glyphs and two bundled open-licence fonts (Cabin for text, Jost for numerals) for a private, non-monetized pocket card game in the style of the original mobile card game. The glyphs ship as SVG files and as CSS mask variables that take any colour. Use when a screen needs an Energy-type or rarity symbol, when choosing or loading the game's fonts, or when changing or rebuilding a glyph.
compatibility: The tools need Python 3. fetch_fonts.py also needs npm, and only when a font file is missing.
---

# Pocket Deck glyphs and fonts

This skill ships the parts of the Pocket Deck look that are this project's own work: ten Energy-type glyphs, four rarity glyphs and two fonts. They replace the original game's symbols, which the replica must never carry or trace, because they are the rights holders' property.

## Files

| Path | Contents |
| --- | --- |
| `assets/glyphs/Energy/` | Ten single-ink Energy-type glyphs as 24×24 SVG files |
| `assets/glyphs/Rarity/` | Four single-ink rarity glyphs (diamond, star, crown, shiny) as 24×24 SVG files |
| `assets/glyphs.css` | Every glyph as a `--pd-glyph-<name>` custom property holding a data-URI mask |
| `assets/fonts/` | Cabin and Jost variable fonts, normal and italic, with their licences |
| `assets/tools/build_glyphs.py` | The source of every glyph's path. It writes the SVG files and `glyphs.css` |
| `assets/tools/fetch_fonts.py` | Fetches any missing font file from its open-licence package |

## Use the glyphs as masks

1. Load `glyphs.css` before any app CSS.
2. Give an element a size, a `background-color`, and `mask-image: var(--pd-glyph-fire)` with `mask-size: contain` and `mask-repeat: no-repeat`. The mask lets one glyph take any colour, so a theme change needs no new file.
3. Use the SVG files only where a mask can't be used, such as an exported image.
4. Label the element for assistive technology, for example `role="img"` with `aria-label="Fire"`, because a mask carries no text.

## Rules

- **Never use or trace the original's symbols**, because the replica must not carry the original's assets. Draw a missing glyph from scratch in `build_glyphs.py`.
- **Change a glyph only in `build_glyphs.py`**, then run `python3 tools/build_glyphs.py` from `assets/`, so the SVG files and `glyphs.css` never drift apart.
- **Keep glyphs single-ink on a 24×24 grid**, so every glyph masks cleanly and reads at small sizes.
- **Ship the font licences with the fonts**, because the SIL Open Font License requires it.

## Fonts

Cabin sets text and display. Jost sets numerals, such as HP and damage. Load each with `@font-face` from `assets/fonts/`, with `font-display: swap`. Run `python3 tools/fetch_fonts.py` from `assets/` to restore a missing file. It needs npm, and it does nothing when every file is present.
