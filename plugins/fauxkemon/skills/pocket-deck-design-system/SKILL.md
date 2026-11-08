---
name: pocket-deck-design-system
description: The Pocket Deck design system for the Fauxkemon replica, measured from the original mobile card game. Tokens (colour in light and dark, type, spacing, radius, shadow, motion), bundled Cabin and Jost fonts, original Energy and rarity glyphs, CSS components for cards, board, HUD, navigation and collecting, a tilt driver for card finishes, and measured screen layouts. Use for any visual or UI work on the replica, including a single colour, button, card face, screen layout, animation timing or theme question, and before writing or reviewing any CSS, markup or motion for it. It overrides general aesthetic guidance.
---

# Pocket Deck design system

Pocket Deck reproduces the look of the original pocket card game as closely as measurement allows: UI colours sampled from its screens, card anatomy measured from its card renders, the battle layout measured from its battle screen, finishes built the way its developers describe theirs. What stays ours is the original's property: logo, Energy and rarity symbols, card back, frame artwork and every illustration.

The system is a contract. Build features from its tokens and components; when something is missing, extend the system first, then use it.

## What's in the box

| Path | What |
| --- | --- |
| `assets/design-system/project/tokens.css` | Every token as a custom property, light and dark themes, `@font-face` rules |
| `assets/design-system/project/components/bundle.css` | All components as `pd-` classes in the `pocket-deck` cascade layer, plus the glyph masks |
| `assets/design-system/project/components/bundle.js` | The tilt driver: `window.PocketDeck` with `attachTilt`, `requestTilt`, `version` |
| `assets/design-system/project/fonts/` | Cabin (text and display) and Jost (numerals) variable fonts with their licences |
| `assets/design-system/project/assets/` | Energy and rarity glyph SVGs, this system's own |
| `assets/design-system/project/components/<Name>/` | Each component's `README.md` (contract) and `preview.html` (working markup) |
| `assets/design-system/project/README.md` | The brand book: measured vs original, voice, colour, type, space, motion, cards, layout |
| `assets/design-system/tools/` | The generator: `build_tokens.py`, `components.css`, `bundle.js`, `content_*.py`, `build.py`, `fetch_fonts.py`, `docs.py` |
| `assets/battle-layout.json`, `assets/motion.json` | Measured battle positions and motion timings as data, each value with its confidence |

## Using it in the app

1. Copy `tokens.css`, `components/bundle.css`, `components/bundle.js` and `fonts/` into the app, keeping `fonts/` beside `tokens.css`. Treat the folder as vendor code.
2. Load `tokens.css`, then `bundle.css`, before any app CSS; load `bundle.js` as a classic script.
3. Put `class="pd-app"` on the root and `data-theme="light"` or `"dark"` on `<html>`.
4. Build markup from each component's preview. Behaviour (drag and drop, dialogs, listboxes, focus) comes from the app's accessible primitives; Pocket Deck styles them.
5. Call `PocketDeck.attachTilt(card)` for every `.pd-card` that should respond to the pointer, keep the returned `detach()` for unmount, and call `PocketDeck.requestTilt()` from a tap to enable the gyro.
6. Size cards with `--pd-card-width`; everything inside scales in container units, and the card hides what can't be read below 220px and 140px.

## Rules that keep the contract

- **Tokens only.** Feature CSS uses `var(--…)` for every colour, space, radius, shadow, duration and easing, so a theme or a palette change lands everywhere at once. Missing value: add a token in `tools/build_tokens.py` (it fails on any contrast pair below its floor), rebuild, re-copy. [tokens](references/tokens.md)
- **Measured geometry is the contract.** Card anatomy, battle positions and HUD sizes come from the research and live in `components.css` and the JSON assets. Features never nudge them with inline styles; a wrong number is fixed in the source and re-rendered. [components](references/components.md), [screens](references/screens.md)
- **Glyphs and art are ours.** Never ship or recreate the original's Energy symbols, rarity marks, logo, card back, frame textures or illustrations, even as placeholders, because the replica must not carry the original's assets. Placeholder art is gradients. [components](references/components.md)
- **Dark theme is an addition.** The original is bright and has no dark mode; `light` is the measured theme and `dark` is ours. Card-face tokens stay fixed in both because a card is a printed object. [tokens](references/tokens.md)
- **Keep the deliberate deviations.** Text on `brand` is `on-brand`, not the original's white, and the toggle's on colour is `toggle-on`, not its teal, because the originals fail contrast. Component numbers use the `--pd-` prefix (`--pd-hp`, `--pd-card-width`) so they never collide with a token. [components](references/components.md)
- **Primitives vs compositions.** Primitives (Button, Toggle, Chip, RainbowRule, EnergyBadge, RarityMark, PointTracker, HpMeter, Panel, SpeechBubble) know nothing about game state; Cards, Board, Navigation and Collecting compose them for one surface. New screens compose; they don't fork. [components](references/components.md)
- **Colour roles are fixed.** `brand` is the one primary action; `reward` is only for things earned; `strip` is the slate of strips and filled icons; status carries a word or icon. [tokens](references/tokens.md)
- **Finishes follow rarity and the hand.** `data-finish` per rarity tier, driven only by `--pd-*` variables from the tilt driver; no idle shimmer, and a reduced-motion pose that is still but visible. [finishes and motion](references/finishes-and-motion.md)
- **Motion through tokens, with a skip.** `dur-*` and `ease-*` for every animation, timings from `assets/motion.json`, a long press finishes the current animation, and state never waits on one. [finishes and motion](references/finishes-and-motion.md)
- **Nothing that sells.** No prices, timers that pressure, currency icons or "limited" language near packs or cards, because the replica is private and non-monetized. [brand book](assets/design-system/project/README.md)

## Reference map

| Task | Read |
| --- | --- |
| A token's value, theme values or intended use | [references/tokens.md](references/tokens.md) |
| Building with a component: markup, attributes, measured anatomy, rules | [references/components.md](references/components.md) |
| Laying out a screen: global UI language, Home and packs, Wonder Pick, pack opening, battle region map, collection, deck builder, tablet rule | [references/screens.md](references/screens.md) |
| How a finish is built, the tilt driver API, reduced motion, motion timings | [references/finishes-and-motion.md](references/finishes-and-motion.md) |
| Battle positions and motion timings as data | [assets/battle-layout.json](assets/battle-layout.json), [assets/motion.json](assets/motion.json) |
| Voice, copy rules and the reasoning behind the visual system | [assets/design-system/project/README.md](assets/design-system/project/README.md) |

## Changing the system

1. Edit the source in `assets/design-system/tools/`: `build_tokens.py` (tokens), `components.css` (component CSS), `bundle.js` (tilt driver), `content_primitives.py` or `content_compositions.py` (component READMEs and previews), `cover.html`.
2. Run `python3 tools/build.py --render` from `assets/design-system/`. It fetches missing fonts, rebuilds `project/`, fails on contrast regressions, copies `bundle.js`, and writes light and dark screenshots of every preview to `out/`. Look at every screenshot and at the console-error list it prints.
3. Run `python3 tools/docs.py <skill>/references` to regenerate `tokens.md` and `components.md`; update `screens.md`, `finishes-and-motion.md` and the JSON assets by hand when the research changes.
4. Sync `project/` (without `design-system.json`, `__pycache__` and `out/`) and `tools/` into `assets/design-system/`, deleting stale files.
5. Run the repo lint and formatter, then re-copy `tokens.css`, `bundle.css`, `bundle.js` and `fonts/` into the app.
