Pocket Deck is the interface for a private, non-monetized replica of a pocket-sized trading card game. It reproduces the look of the original as closely as measurement allows: UI colours sampled from its screens, card geometry measured from its card renders, the battle layout measured from its battle screen, and finishes built the way its developers describe building theirs. What stays ours is everything that is the original's property: the logo, the Energy and rarity symbols, the card back, the frame artwork and every illustration.

## What is measured and what is original

| Measured from the original (keep exact) | This system's own (never copy the original's) |
| --- | --- |
| UI palette: ground, surfaces, slate, cyan, teal, gold, board colours, card body and disc colours | Energy and rarity glyphs (single-ink SVGs in `assets/`) |
| Card anatomy: every position and size in `components.css`, in % of card width | Frame texture (a brushed-silver gradient), card back pattern, placeholder art |
| Battle layout: slot positions, HUD positions, circle size, foreshortening | Tab bar icons (simple line drawings) |
| Buttons, toggle, tab bar, panels, strip, points, HP read-out dimensions | Dark theme (the original has none) |
| Pack aspect and cut line; collection grid; pack-opening flow | Contrast fixes where the original fails (`on-brand` text, `toggle-on`) |

## Principles

- **Cards are the hero.** Chrome is bright, pearly and quiet; colour belongs to card faces, Energy and rewards.
- **Measured geometry is the contract.** A component's positions come from the research and live in `components.css`. Features never nudge them with inline styles.
- **One thumb, any screen.** Everything works by touch, mouse and keyboard, from a 360px phone to a desktop that scales the phone design box.
- **Motion explains.** Animate what the rules did (a card moved, Energy attached, damage landed); no idle shimmer.

## Content fundamentals

- Second person, present tense, sentence case: "Your turn", "Choose a Benched Pokémon", "Open". The original's own labels keep their case: "End Turn", "Offering Rates", "My Cards".
- Buttons are verbs or the original's labels: "Open", "End Turn", "Offering Rates", "OK".
- Capitalize game terms the way the rules do: Energy, Active, Bench, Benched, Supporter, Item, Tool, Stadium, Weakness, Retreat, Knocked Out, Pokémon ex.
- Numbers are numerals: "2 points", "+20", "3 cards left".
- Announcements are two or three words ("Knocked Out", "+2 Points") with one detail line.
- Nothing that sounds like a sale: no "limited time", "don't miss", "special offer".

## Colour

Two themes, `light` and `dark`; every text pair holds 4.5:1 in both. `light` is the original's; `dark` is this system's addition.

- **Ground and surfaces.** The app sits on `ground` (pale blue-lavender). Panels, pills and rows are `surface`; menus, dialogs and sheets `surface-raised`; wells `surface-sunken`. Hero screens lay `gradient-wall` or a section colour (`hero-battle`, `hero-social`, `hero-set`) over the ground.
- **Ink.** Body text `ink`; secondary `ink-muted` (the slate of icons and pill labels); tertiary `ink-subtle`. Text on dark fills `ink-inverse`.
- **Brand.** `brand` (cyan) is the one primary action per view; text on it is `on-brand`, a deep teal, because the original's white fails contrast. `brand-strong` for pressed, `brand-ink` for cyan text, `brand-tint` for washes.
- **Teal.** `toggle-on`, `progress`, `hp`: on states, bars and the HP bar. `glow` is the cyan selection glow on the board.
- **Reward.** `reward` (gold) for earned things: point coins, New tags, Pack Points. `coin-ink` is the blue numeral on a coin; `point-empty` the unearned disc.
- **Slate.** `strip` for player strips, the battle menu button and filled tab icons.
- **Status.** `danger`, `success`, `notice` (the red dot), each with a word or icon beside it.
- **Board.** `field`/`field-opp` outside the circle, `board`/`board-opp` inside, `board-band` at the centre, `board-rim` white rim, `slot`/`slot-edge` for empty slots.
- **Cards.** `card-*` tokens are fixed in both themes because a card is a printed object: frame silvers, per-type body pairs (`card-grass`, `card-grass-edge`), disc colours (`disc-*`), pills, dex bar, Ability red, ex gold, trainer bands and boxes, full-art ink and outline, card rarity colours.
- **Types.** UI type colours (`type-*`, `on-type-*`, `type-*-tint`) are for chips and filters; on cards use the `card-*` and `disc-*` colours.

## Typography

- **Cabin** (`--font-text`, `--font-display`; weights 400–700) stands in for the original's humanist sans in UI and on cards. **Jost** (`--font-numeral`; weights 100–900) stands in for its heavy geometric numerals: HP, damage, points, odds, the ex suffix. Both are variable fonts under `fonts/` with their licences; `tools/fetch_fonts.py` restores them from their install slugs when missing.
- Display: `display-xl` 44px, `display-l` 36px (banners, italic), `display-m` 28px, `title` 21px (section titles such as "My Cards").
- Numerals: `numeral-xl` 28px (floating HP), `numeral-l` 22px, `numeral-m` 15px.
- Text: `body` 15/22 500, `body-strong` 700, `label` 15 600 (buttons, toggles), `caption` 12 600 (chips, tile labels).
- Card group (defined at a 300px card, applied in `cqi`): `card-name` 6.6% of width, `card-hp` 6.9%, `attack-name` 4.9%, `attack-damage` 6.2%, `card-text` 3.8%, `card-label` 2.2%.
- Changing numbers use tabular figures; `.pd-app` sets them.

## Space, shape and depth

- Spacing `space-1` (4px) to `space-16` (64px). Phone gutter `space-4`; panels pad `space-4`; dialogs `space-6`.
- Radii: panels 24px, sheets 20px top, buttons and pills `radius-pill`, slots 10px, cards 3.67% of their width (`radius-card`), tiles `radius-sm`.
- Depth from shadows: `shadow-1` resting, `shadow-2` menus, `shadow-3` dialogs and dragged cards, `shadow-card` every card. Panels add a 1px lighter inner top edge and, on some, a diagonal sheen (`data-sheen`).
- Sizes: `size-tap` 44px; `size-card-hand` 88px (22.6% of a 390px phone), `size-card-board` 126px (32%), `size-card-inspect` 320px; `size-energy-badge` 26px; `size-energy-stand` 59px; `size-icon-button` 53px; `size-tabbar` 49px.
- Stacking: `z-board`, `z-hand`, `z-tabbar`, `z-drag`, `z-sheet`, `z-dialog`, `z-toast`.

## Motion

- Durations: `dur-instant` 90ms press; `dur-fast` 150ms hover and toggles; `dur-base` 240ms cards between zones; `dur-slow` 380ms flips, the Energy arc, HP drain; `dur-reveal` 620ms the pack strip and rare beats.
- Easing: `ease-out` default; `ease-in-out` for travel; `ease-pop` for badges, coins and damage numbers; `ease-in` for exits.
- The engine emits events and the UI plays them in order. A long press skips the current animation, never the information.
- Under `prefers-reduced-motion`: no tilt, pulse or travel; cross-fades instead, and every state change stays visible.
- Per-animation timings and their confidence live in the skill's `assets/motion.json`.

## Cards and finishes

- **PocketCard** encodes the measured anatomy (stage pill, name, HP, type disc, evolves band, art frame with dex strip, Ability pill, attack rows, footer capsules, illustrator, rarity, flavour or ex rule, trainer band and rule box) in `cqi` so one markup scales from 88px to 320px; container queries hide what can't be read below 220px and 140px.
- Finishes follow rarity: `sheen` ◊ ◊◊, `foil` ◊◊◊ (holo on the frame and over the art, matte body), `ex` ◊◊◊◊ (rainbow frame, parallax layers, sparkle pass), `holo` ☆ ☆☆ (full-face rainbow with a centre mask that lifts as the card tilts), `immersive` ☆☆☆ (charcoal frame, rounded window, conic sheen), `shiny` ✵ (cyan-mint frame, prism bands, two sparkle lattices), `crown` ♕ (gold frame and body, gold-to-teal holo), `parallel` (diagonal lines).
- Layer order, back to front: body → illustration (optionally `.pd-card__layers` with `back`/`mid`/`front` parallax) → frame holo (`::before`) → front effects (`::after`).
- **Tilt driver** (`components/bundle.js`): `PocketDeck.attachTilt(card, { gyro, maxTilt, restPose })` returns `detach()`; `PocketDeck.requestTilt()` asks for device-orientation permission from a tap and resolves to a boolean; `PocketDeck.version`. It writes `--pd-pointer-x/y` (0–100%), `--pd-tilt-x/y` (-1…1), `--pd-from-center` (0…1) and `--pd-active` (0…1) on the card with spring smoothing (follow k 0.12 d 0.32; release k 0.035 d 0.18), gyro clamped to ±16°. Under reduced motion it sets one off-axis rest pose and never animates.
- The frame texture, glyphs, card back and placeholder art are this system's; never ship the original's image assets.

## Layout

- Phone portrait is the design target: a 9:19.5 design box. Battle positions (% of the box) are in the Board component and the skill's `assets/battle-layout.json`.
- Tablet and desktop scale the design box to the viewport height, centre it, and let the field, board circle and edge-anchored HUD bleed to the edges. There is no side rail; the tab bar keeps its five icons at the same relative positions.
- Safe areas: the tab bar and anything pinned to an edge pad with `env(safe-area-inset-*)`.

## Iconography

- Energy and rarity glyphs: this system's single-ink SVGs (`assets/Energy`, `assets/Rarity`), applied as CSS masks so they take any token colour.
- Tab bar and button icons: simple 1.8–2.2px stroke line drawings in `ink-muted` (filled `strip` when current). The system ships the five tab icons in the TabBar preview.
- No emoji as icons; no creature art outside `.pd-card__art`.

## Components

Primitives: Button, Toggle, Chip, RainbowRule, EnergyBadge, RarityMark, PointTracker, HpMeter, Panel, SpeechBubble. Cards: PocketCard, CardBack, DexTile. Board: Board, BoardSlot, PlayerStrip, EnergyZone, HandFan, Banner. Navigation: TabBar. Collecting: BoosterPack, OddsTable. All are plain CSS classes in `components/bundle.css` (prefix `pd-`, cascade layer `pocket-deck`), so unlayered app CSS always wins. Behaviour (drag and drop, dialogs, listboxes) comes from the app's accessible primitives; these classes style them.

## Using the system in code

1. Load `tokens.css` (it declares the fonts from `fonts/`), then `components/bundle.css`, then `components/bundle.js` as a classic script.
2. Put `class="pd-app"` on the app root and `data-theme="light"` or `"dark"` on `<html>`.
3. Call `PocketDeck.attachTilt(el)` for each card that should respond to the pointer or device tilt, and `PocketDeck.requestTilt()` from a tap to enable the gyro.
4. Use tokens through `var(--name)` only. Feature CSS never contains raw colours, px spacing or ad-hoc shadows; if a value is missing, add a token in `tools/build_tokens.py` first.
