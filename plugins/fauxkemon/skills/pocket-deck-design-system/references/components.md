# Component reference

Every component's contract, generated from the component READMEs by `tools/docs.py`. Markup lives in each `assets/design-system/project/components/<Name>/preview.html`; styles in `components/bundle.css`. Groups: Primitives know nothing about game state; Cards, Board, Navigation and Collecting compose them for one surface.

## Contents

- Primitives: Button, Toggle, Chip, RainbowRule, EnergyBadge, RarityMark, PointTracker, HpMeter, Panel, SpeechBubble
- Cards: PocketCard, CardBack, DexTile
- Board: BoardSlot, PlayerStrip, EnergyZone, HandFan, Board, Banner
- Navigation: TabBar
- Collecting: BoosterPack, OddsTable

## Button (Primitives)

Preview: `assets/design-system/project/components/Button/preview.html`

The pill button: the one way to trigger an action. Measured from the original's screens: a full pill, 44px minimum height, 15px medium text, soft shadow, and a glossy lighter band across the top of coloured fills.

### Use it for

- `primary`: the main action on a screen or sheet (Open, OK, Battle!, Add). Cyan `brand` fill.
- `reward`: claiming something earned. Gold `reward` fill. Never for anything that spends.
- default (no variant): secondary actions in `surface` (Offering Rates, Cancel, Next, Change, Edit). The original pairs these with the primary pill at about 133×35px.
- `quiet`: low-emphasis text actions in lists and toolbars.
- `danger`: destructive actions (Delete deck, Concede), behind a confirmation.
- `strip`: the dark slate round buttons on the battle screen (menu, skip).
- `end-turn`: the End Turn pill: 101×36px, pale `surface-raised` fill with a 2px indigo-to-cyan hairline (`gradient-end-turn`), 16px text.

### The consumer provides

A native `<button>` (or `<a>` for navigation) with `class="pd-button"`, a `data-variant`, and a text label. Icon-only buttons add `aria-label` and a 22px SVG; round ones add `data-shape="circle"` (53px, the original's back and close circles) or `data-shape="circle" data-size="sm"` (35px, the battle menu button).

### Attributes

| Attribute | Values |
| --- | --- |
| `data-variant` | `primary`, `reward`, `danger`, `quiet`, `strip`, `end-turn`, or none |
| `data-size` | `sm` (35px) for pills beside a primary; `lg` (49px, the original's Share and Open pills) for hero actions |
| `data-shape="circle"` | round icon button; `data-icon-only` for a square one |
| `disabled` / `aria-disabled="true"` | greyed `surface-sunken` fill with `ink-subtle` text, no gloss, no shadow |

### Rules

- One `primary` per view. If two actions compete, one becomes the default pill.
- Every size keeps a `size-tap` (44px) hit area; `sm` and `end-turn` draw smaller but must sit in a 44px row.
- **Contrast tradeoff.** The original sets white text on its cyan pill, which fails 4.5:1. This system sets `on-brand` (a deep teal) on `brand` instead, so the pill reads and passes. Keep it; don't "fix" it back to white.
- Press feedback is a 1px drop with a 0.98 scale over `dur-instant`; hover tint only on hover-capable pointers.
- Labels are verbs in sentence case, the way the original writes them: "Open", "End Turn" is the one title-case exception because it's the original's label.

## Toggle (Primitives)

Preview: `assets/design-system/project/components/Toggle/preview.html`

The on/off switch: the battle screen's Auto toggle and the collection's Dex/Owned toggle. Measured: a 64×26px pill track with a 20px round knob; off is a pale `surface` track with a `surface-sunken` knob, on is a teal track with a white knob.

### The consumer provides

```
<label class="pd-toggle"><input type="checkbox" role="switch"><span class="pd-toggle__track"></span>Auto</label>
```

The label text sits to the right of the track, as in the original. The input is the control: it carries `checked`, `disabled` and focus; the track is decoration driven by `:checked`.

### Rules

- The on colour is `toggle-on`, not the original's `#00c4b4`, which fails 3:1 on `ground`; `toggle-on` holds it in both themes.
- Always a visible word. The original labels every toggle (Auto, Dex); so does this system.
- The knob travels 38px over `dur-fast` with `ease-out`; nothing else animates.

## Chip (Primitives)

Preview: `assets/design-system/project/components/Chip/preview.html`

A small pill for status, counts, tags and filters: the original's timer chips, "New" tags, count pills and the Energy picker's pills.

### Use it for

- Counts and tags on panels (`"1,025"` with a card icon, `"24/30"`, `"#MyCollection"`), timers on Wonder Pick cards.
- "New" on freshly pulled cards (`reward`).
- Deck validity ("Valid deck", `success`; "Over 20 cards", `danger`).
- Type pills in the deck builder's Energy picker and the Dex filters: a `<button class="pd-chip" aria-pressed>` with an Energy badge; pressed pills take the dark `strip` fill with white text, as the original's selected Energy pills do.

### The consumer provides

A `<span>` (status) or `<button>` (filter) with `class="pd-chip"`, a tone, and a word. For type tones, set `data-type` on the chip. An Energy badge may lead the text.

### Attributes

| Attribute | Values |
| --- | --- |
| `data-tone` | `brand`, `reward`, `danger`, `success`, `strip`, `type`, `tint`, or none (neutral `surface`) |
| `data-type` | an Energy type, with `type` or `tint` tones |
| `aria-pressed` | on filter buttons; `true` renders the `strip` fill |

### Rules

- A chip always carries a word. Colour alone never carries meaning.
- Filter chips grow to 36px tall; wrap them in a row with `space-2` gaps.
- Don't stack more than two chips on a board slot.

## RainbowRule (Primitives)

Preview: `assets/design-system/project/components/RainbowRule/preview.html`

The 2px rule under section titles (My Cards, Wonder Pick, Display Boards) and the thin rule on Opening Results. Measured: full width, 2px tall, a horizontal lime-to-pink gradient (`gradient-rainbow`).

### The consumer provides

`<hr class="pd-rule">` directly under the title. `data-tone="brand"` gives the solid cyan rule used on Opening Results.

### Rules

- One per screen, under the title only; it is a section marker, not a divider between rows (rows use `line`).
- Titles above it are `title` (21px, 700) centred, as the original centres "My Cards".

## EnergyBadge (Primitives)

Preview: `assets/design-system/project/components/EnergyBadge/preview.html`

The round type disc used for Energy, attack costs, Weakness, the Energy Zone and type filters. Measured from the original's card renders: a glossy disc in the type's disc colour (`disc-*`) with a rim light at 35% 30%, a shade at the bottom, a thin dark ring, and a white (or dark, on light types) type glyph.

### Use it for

- Attached Energy on a board slot (26px, `size-energy-badge`), attack costs on cards (5.3% of card width, set by the card), Weakness (3.7% of card width), the Energy Zone orb (`xl`), type filters and the deck's Energy picker (`lg`).

### The consumer provides

`<span class="pd-energy" data-type="fire"></span>`. Give it `role="img"` and an `aria-label` ("Fire Energy") wherever it stands alone; inside a labelled control or next to a type name, leave it decorative (`aria-hidden="true"`).

### Attributes

| Attribute | Values |
| --- | --- |
| `data-type` | `grass` `fire` `water` `lightning` `psychic` `fighting` `darkness` `metal` `dragon` `colorless` |
| `data-size` | `xs` 16px · `sm` 20px · default 26px (`size-energy-badge`) · `lg` 44px · `xl` 64px |
| `data-state="empty"` | an outlined placeholder (no Energy yet) |

### Rules

- The disc colours (`disc-*`, `disc-*-hi`, `disc-*-shade`) are measured from the original's cards; the glyph colour is `on-type-*`. Never recolour one without the other.
- Dragon and Colorless are types, not Energy: they never appear in the Energy Zone or the deck's Energy picker.
- The glyphs are this system's own single-ink drawings. Don't swap in the original's Energy symbols.

## RarityMark (Primitives)

Preview: `assets/design-system/project/components/RarityMark/preview.html`

A row of rarity glyphs (◊ to ◊◊◊◊, ☆ to ☆☆☆, ♕, ✵ to ✵✵) for cards, lists and the odds table.

### The consumer provides

`<span class="pd-rarity" data-tier="star" role="img" aria-label="Rarity: 2 stars"><i></i><i></i></span>`: one empty `<i>` per glyph, and the rarity in words in `aria-label`.

### Attributes

| Attribute | Values |
| --- | --- |
| `data-tier` | `diamond` (default), `star`, `crown`, `shiny` |
| `font-size` | the glyph size; it inherits, so set it on the mark or its parent |

### Rules

- In the UI the glyphs take `rarity-*`, which hold 3:1 on `surface` in both themes. On a card face PocketCard swaps in the measured card colours (`card-rarity-*`: a dark olive diamond, indigo star, lime shiny, gold crown) at 4% of card width with a 4.08% pitch.
- Name rarities in words where a player decides something (odds, crafting costs); glyphs alone are fine on card faces.
- The glyphs are this system's own drawings.

## PointTracker (Primitives)

Preview: `assets/design-system/project/components/PointTracker/preview.html`

The three point discs in each player's strip. Measured: 13px discs; unearned ones are dark (`point-empty`), earned ones become a gold coin (`reward`) with a blue italic numeral (`coin-ink`) counting 1, 2, 3.

### The consumer provides

A `role="img"` container with the score in words, three `.pd-points__pip` spans (`data-filled` on earned ones) and an optional visible `.pd-points__label`. The numeral on each coin is a CSS counter; don't type it.

```
<div class="pd-points" role="img" aria-label="Your points: 2 of 3">
  <span class="pd-points__pip" data-filled></span><span class="pd-points__pip" data-filled></span><span class="pd-points__pip"></span>
</div>
```

### Attributes

| Attribute        | Values                                          |
| ---------------- | ----------------------------------------------- |
| `data-size="lg"` | 24px coins for result screens and the VS screen |

### Rules

- Each strip shows its own tracker (PlayerStrip places it at the slanted end). Announce new points through the Banner, not the tracker.
- A coin fills over `dur-base` with `ease-pop`; an ex KO fills two, staggered by 80ms so the player can count.
- The numeral is decorative (`coin-ink` is not a text colour); the score lives in the `aria-label`.

## HpMeter (Primitives)

Preview: `assets/design-system/project/components/HpMeter/preview.html`

The floating HP read-out on a board card. Measured from the battle screen: a heavy 28px numeral (`hp-ink`, Jost 800) with a white `board-rim` stroke floating above the card's top-right corner, and a 7px mint `hp` bar on a white track about 40% of the card's width.

### The consumer provides

```
<div class="pd-hp" style="--pd-hp:50;--pd-hp-max:120" role="meter" aria-valuenow="50" aria-valuemin="0" aria-valuemax="120" aria-label="HP">
  <span class="pd-hp__value">50<small>HP</small></span>
  <span class="pd-hp__track"><span class="pd-hp__fill"></span></span>
</div>
```

`--pd-hp` and `--pd-hp-max` are unitless numbers (the bare `--hp` name is the bar colour token, so the numbers take the component prefix); the fill width is computed from them. BoardSlot anchors the meter to the card's top-right; elsewhere it stands alone.

### Attributes

| Attribute | Values |
| --- | --- |
| `data-size="sm"` | 20px numeral and a 38px track for Bench and opponent cards |
| `--pd-hp-track` | override the track width (default 52px, about 40% of an Active card) |

### Rules

- The number is always visible; the bar is a hint. The bar does not change colour at low HP (the original's stays mint); say "low" in the label if the app wants to.
- The bar drains over `dur-slow` with `ease-out` after the damage number has shown.
- Printed HP on the card face is PocketCard's `.pd-card__hp`; this meter is only for cards in play.

## Panel (Primitives)

Preview: `assets/design-system/project/components/Panel/preview.html`

The surface container: list groups, filter panels, sheets, dialogs, expansion tiles. Measured from the original: 24px corner radius, `surface` fill, a soft down-right shadow with a 1px lighter inner top edge, and on some panels a faint diagonal lighter sheen across the upper half.

### The consumer provides

Any element with `class="pd-panel"`; an optional `.pd-panel__title` heading and `.pd-panel__divider` rule inside. Dialog behaviour (focus trap, Escape, scrim) comes from the app's dialog primitive; the panel is only the surface.

### Attributes

| Attribute | Values |
| --- | --- |
| `data-elevation` | `2` for menus and popovers, `3` for dialogs (24px padding); default is resting |
| `data-tone` | `reward` (gold callout), `sunken` (well), `set` (an expansion tile: `--pd-hero` tint, default `hero-set`, with a lighter diagonal wedge) |
| `data-sheen` | the diagonal lighter wedge across the upper half |
| `data-sheet` | a bottom sheet: `surface-raised`, 20px top corners, square bottom |

### Rules

- Panels sit on `ground` or `board`, never inside another panel; nest with `data-tone="sunken"` instead.
- Dialogs: `data-elevation="3"` centred over `scrim`, bold `title`, a `.pd-panel__divider`, one cyan primary pill; the original blurs the screen behind.
- Sheets: `data-sheet`, a title bar with a divider, content, primary pill, and a close circle beneath on phone.

## SpeechBubble (Primitives)

Preview: `assets/design-system/project/components/SpeechBubble/preview.html`

The highlight bubble above the packs on the booster screen. Measured: a white rounded rectangle (20px radius) with an inset lighter inner frame and a centred downward tail about 24px wide and 12px tall; inside, a horizontally scrolling strip of card thumbnails clipped at both sides.

### The consumer provides

`<div class="pd-bubble">` with a row of small `.pd-card` thumbnails (about 12.8% of screen width each, so around 50px on phone) in an `overflow-x: auto` strip. Give the strip `role="list"` and each card `role="listitem"` with an `aria-label`.

### Rules

- One bubble per screen, directly above the pack carousel, 71% of the screen width.
- The strip scrolls; it never wraps. Clip it so the first and last thumbnails are cut, which signals the scroll.
- Thumbnails are PocketCards at their smallest step (head and art only), not separate images.

## PocketCard (Cards)

Preview: `assets/design-system/project/components/PocketCard/preview.html`

The card face. Its geometry is measured from the original's card renders and expressed in container units (`cqi`, 1% of card width; vertical positions converted from % of card height), so one markup scales from the 88px hand card to the 320px inspector. The frame, glyphs and art are this system's own.

### Measured anatomy (Pokémon card)

| Part | Position (% of width unless noted) |
| --- | --- |
| Frame | brushed-silver border 4% thick (`card-frame`, highlight, shade); body in the type's measured pair (`card-*`, `card-*-edge`) |
| Stage pill | x 2.5, y 4.36%H, 14.5 × 3.52%H, 2.2 text |
| Name | from x 18, 6.6 text, 700; `ex` suffix in gold italic Jost |
| HP | right-aligned at 87.17, 6.9 Jost 800 with a 3.2 "HP" label |
| Type disc | centre 91.3 × 6.2%H, Ø 6.5 |
| Evolves-from | octagonal thumb 11.83 × 6.91%H at (4, 7.76%H) and a slanted band |
| Art frame | (7.33, 9.21%H) 85.5 × 41.33%H, bevelled; illustration 1 in; dex strip 2.18%H along the bottom |
| Body | 50.9%H to 85.8%H; attacks centre, or stack from the top when an Ability leads |
| Ability | red pill 22.5 × 3.15%H at 53.82%H, name at x 30.83 in 5.0 |
| Attack row | pips Ø 5.3 from x 9.25, name at x 30.5 in 4.9, damage right at 93.33 in 6.2 Jost; effect text 3.8 |
| Footer | Weakness pill 7.33–48.33, Retreat pill 52–93, both 3.27%H at 85.82%H |
| Illus. / rarity | x 6.67 at 89.58%H (2.0) and x 7 at 91.27%H (glyphs 4 wide, 4.08 pitch) |
| Flavour | right-aligned block at 93.17 from 90.18%H, max 48.3 wide, 2.7 italic |
| ex rule | gold slanted slab 33.33–96 at 90.67%H, 6.18%H tall, with a black "EX RULE" tab |

Trainers: a header band at 3.27%H with the kind at left and TRAINER at right, the name at x 5.67 (6.3), the art frame from 13.58%H, centred 4.0 text, and a kind-coloured rule box 31.67–96 at 88.97%H.

### The consumer provides

`<article class="pd-card">` with `data-type` (or `data-kind="trainer" data-trainer="item|supporter"`), a width through `--pd-card-width`, an `aria-label` reading the essentials, and these children in order:

1. `.pd-card__frame` (empty: carries the border and body)
2. `.pd-card__stage` ("Basic", "Stage 1") and optional `.pd-card__evolves` (`<i></i><span>Evolves from X</span>`); trainers use `.pd-card__band` (`<b>Item</b><i>TRAINER</i>`) instead
3. `header.pd-card__head`: `h3.pd-card__name` (optional `span.pd-card__ex`), `span.pd-card__hp` (`<small>HP</small>60`), a `.pd-energy` type disc
4. `.pd-card__art`: optionally an `<img>` or `.pd-card__layers > .pd-card__layer[data-depth="back|mid|front"]` with inline backgrounds, plus `.pd-card__dex` text
5. `.pd-card__body`: optional `.pd-card__ability` (`.pd-card__ability-label`, `.pd-card__ability-name`, `p.pd-card__text`) and `.pd-card__attack` rows (`.pd-card__cost` of `.pd-energy` pips, `.pd-card__attack-name`, `.pd-card__damage`, optional `p.pd-card__text`)
6. `footer.pd-card__foot`: `<span>Weakness <span class="pd-energy" data-type="fire"></span><b>+20</b></span><span>Retreat <span>…pips…</span></span>`
7. `.pd-card__illus`, `.pd-card__meta` (RarityMark and set code), and either `p.pd-card__flavor` or `p.pd-card__rule[data-tab="ex rule"]`

Attack costs carry an `aria-label` ("Cost: 2 Fire, 1 Colorless"); the type disc has `role="img"`.

### Attributes

| Attribute | Values |
| --- | --- |
| `data-type` | the Pokémon's type: body colours, disc, placeholder art tint |
| `data-kind="trainer"` + `data-trainer` | `item` (blue) or `supporter` (orange) |
| `data-art` | `full` (☆ and up: art fills the card, text stroked in `card-fullart-outline`), `layered` (parallax layers, the front one may break out of the art frame) |
| `data-finish` | `sheen` (◊, ◊◊), `foil` (◊◊◊), `ex` (◊◊◊◊), `holo` (☆, ☆☆), `immersive` (☆☆☆), `shiny` (✵), `crown` (♕), `parallel` |
| `--pd-card-width` | any length; default `size-card-inspect` (320px) |
| `aria-selected="true"` / `data-selected`, `data-dragging` | selected glow; dragging shadow |

### Size steps

Container queries hide what can't be read: below 220px the effect text, flavour, rule, illustrator, dex line and evolves band go; below 140px only the frame, name, HP, type disc and art remain (the hand and Bench size).

### Finishes and tilt

Finishes read `--pd-pointer-x/y` (0–100%), `--pd-tilt-x/y` (-1…1), `--pd-from-center` (0…1) and `--pd-active` (0…1). `bundle.js` sets them: `PocketDeck.attachTilt(card)` returns a detach function; `PocketDeck.requestTilt()` asks for gyro permission from a tap. Under reduced motion the driver sets one off-axis pose and the card does not rotate. Layer order: body → illustration → frame holo (`::before`) → front effects (`::after`). See `finishes-and-motion.md` in the skill references.

### Rules

- Geometry is the contract. Don't move parts with inline styles; change `components.css` and re-render.
- Never set px font sizes inside a card; everything is `cqi`.
- Art is an `<img>` cropped with `object-fit: cover`, or gradient layers. Without either, the type-tinted placeholder shows.
- The frame, pills, glyphs and art are this system's. Never ship the original's frames, symbols, logos or illustrations.

## CardBack (Cards)

Preview: `assets/design-system/project/components/CardBack/preview.html`

The back of every card: decks, face-down setup, the opponent's hand.

### The consumer provides

`<div class="pd-card-back" role="img" aria-label="Face-down card"></div>` with a width through `--pd-card-width` (default `size-card-hand`, 88px).

### Rules

- Face-down cards are never interactive by themselves; the deck pile is a button that wraps a back.
- The opponent's hand is a row of backs at about 14.7% of screen width, fanned ±8°, clipped at the top edge.
- Flipping: put the back and the face in a 3D container and rotate over `dur-slow` with `ease-in-out`; with reduced motion, cross-fade instead.
- The pattern (silver frame, blue lattice, gold seal) is this system's own. Don't replace it with the original's card back.

## DexTile (Cards)

Preview: `assets/design-system/project/components/DexTile/preview.html`

One entry in the collection grid: the card if owned (with a copy count), a numbered empty slot if not.

### Measured grid

Five columns at the default zoom: tiles 17.4% of screen width (pitch 18.4%), 1% gutters, 4.4% side margins, 10px row gap. The zoomed-in view is three columns with tiles at 28%. Pinch changes the tile size. `.pd-dex-grid` sets this up with `--pd-dex-cols` (default 5).

### The consumer provides

A `.pd-dex-grid` of links or buttons with `class="pd-dex-tile"`, each containing either a `.pd-card` (owned) or `.pd-dex-tile__empty` with the card number (not owned), an optional `.pd-dex-tile__count` tab (the dark slate "1"/"2" tab at the tile's bottom-left), an optional `New` chip (top-left) and the collector number beneath. The accessible name states the card and whether it's owned: "Sproutling, owned ×2" or "Card 004, not owned".

### Rules

- Not-owned tiles show the number only, never a silhouette of the art.
- Owned tiles open the card inspector; not-owned tiles open the card's crafting cost and which packs contain it.
- Above the grid the original shows per-rarity counters (◊ 183/226, ☆ 22, ♕ 1) and a Dex/Owned Toggle; use Chips and Toggle for those.

## BoardSlot (Board)

Preview: `assets/design-system/project/components/BoardSlot/preview.html`

An Active or Bench position on the mat: empty, a drop target, or occupied with its floating HP, attached Energy and condition marker.

### Measured

- Empty slot: a translucent white rounded rectangle (`slot`, 10px radius) with a hairline `slot-edge`.
- Your Active card is 32% of screen width (`size-card-board`, 126px); your Bench and hand cards 22.6% (`size-card-hand`, 88px). The opponent's rows are foreshortened by the Board.
- Valid target: a cyan `glow` outer glow about 8–10px, no hard border, pulsing; unavailable spots are greyed.
- HP floats above the card's top-right corner (HpMeter); Energy badges (Ø 26px) stack along the card's bottom-left, overlapping its edge by about 3px; a condition icon sits under the HP.

### The consumer provides

`<div class="pd-slot" data-zone="active|bench">` containing nothing (empty; add `data-empty`) or a `.pd-card`; plus, when occupied, a `.pd-hp` (HpMeter), `.pd-slot__energy` (a row of `.pd-energy`) and `.pd-slot__status` (one `.pd-energy` recoloured by `data-type` as the condition marker: Poisoned psychic, Burned fire, Asleep water, Paralyzed lightning, Confused darkness, each with `role="img"` and the condition's name). Set `data-drop="valid"` on every legal target while a card or Energy is being moved, `data-drop="over"` on the one under the pointer or focus, and `data-drop="none"` on the rest. Droppable slots are buttons for keyboard users (`role="button"`, `tabindex="0"`, an `aria-label` like "Bench slot 2, empty").

### Rules

- Only legal targets highlight, all at once, the moment a drag or selection starts.
- The pulse stops under reduced motion; the glow stays.
- Hide the card's own `aria-label` (`aria-hidden`) inside a slot whose label already names it.

## PlayerStrip (Board)

Preview: `assets/design-system/project/components/PlayerStrip/preview.html`

The slanted dark strip carrying a player's name, optional clock and point discs. Measured: yours spans 0–44% of screen width at 93.5–96.6% of height (26px tall) with its right end slanted about 20°; the opponent's is mirrored at the top-right (7–10% of height).

### The consumer provides

```
<div class="pd-strip"><span>Player</span><span class="pd-strip__timer">17:00</span><div class="pd-points" …></div></div>
<div class="pd-strip" data-side="opp">…</div>
```

Names are 13px 600 in `ink-inverse` on `strip`. The PointTracker sits at the slanted end (right for you, left for the opponent). The timer is optional: the original shows one only in timed matches.

### Rules

- The strip is `min-inline-size: 44%` of its container; place it in the Board's design box, not in a flex row.
- Points are announced by the Banner; the strip only shows them.

## EnergyZone (Board)

Preview: `assets/design-system/project/components/EnergyZone/preview.html`

The Energy stand at the bottom-right of the board. Measured: a round pale stand Ø 15.2% of screen width (`size-energy-stand`, 59px) at (88.8%, 86%) of the screen; this turn's Energy sits on it as a large glossy orb; a 20px badge at the stand's lower-right previews the next turn's type. The opponent's is mirrored at (19%, 15%) and smaller (Ø 44px).

### The consumer provides

```
<div class="pd-energy-zone">
  <button class="pd-energy-zone__current" aria-label="Attach Fire Energy" aria-pressed="false"><span class="pd-energy" data-type="fire"></span></button>
  <span class="pd-energy-zone__next" role="img" aria-label="Next: Water"><span class="pd-energy" data-type="water"></span></span>
</div>
```

The current Energy is a button: drag it to a Pokémon, or press it (`aria-pressed="true"`) and then choose a slot. The stand glows in the type colour while an orb sits on it. When none is available (going first on turn 1, or already attached), render an empty badge (`data-state="empty"`) and disable the button with a reason in its label. Set `--size-energy-stand` to resize (the opponent's is 44px).

### Rules

- Anchor it bottom-right on phone, above the hand, in thumb reach.
- On attach, the orb flies to the target over `dur-slow` along an arc (`ease-in-out`) and shrinks into a 26px badge; the preview then promotes with `ease-pop`.
- Exactly one upcoming Energy is previewed, as in the original.

## HandFan (Board)

Preview: `assets/design-system/project/components/HandFan/preview.html`

The player's hand as a fan of compact cards along the bottom edge. Measured: cards 22.6% of screen width (`size-card-hand`), top edge at 83% of height with the lower 40% of each card off-screen, fanned ±6°, centred.

### The consumer provides

A container with `class="pd-hand"` and `--n` (card count), whose children are `.pd-card` elements each with `--i` (index from 0). Mark the selected card with `aria-selected="true"`. Use a listbox pattern (`role="listbox"` on the hand, `role="option"` on cards) so arrow keys move between cards; tap-and-hold inspects.

### Rules

- The fan step is 6° (`--pd-fan-step`); tighten to 4° above seven cards. Cards overlap by 20% of their width.
- The selected card lifts 28px and straightens; hover lifts 16px on hover-capable pointers only.
- Play a card by pulling it upward out of the hand onto a slot. The opponent's hand is a row of CardBacks, never faces.

## Board (Board)

Preview: `assets/design-system/project/components/Board/preview.html`

The battle mat composition: a portrait 9:19.5 design box (390×845 on phone) whose background is the field, split at the centre line, with the white-rimmed board circle (Ø 73% of height, 159% of width) centred on that line. The app places slots, HUD and hand inside the box at the measured positions; on tablet and desktop the whole box scales to fit the height, centres, and the field and HUD bleed to the edges.

### Measured positions (% of the design box; y is the top edge unless noted)

| Element | Position |
| --- | --- |
| Opponent strip | top-right, y 7–10% |
| Opponent Energy Zone | Ø 11% W centred at (19%, 15%) |
| Opponent Bench (3) | y 18–27.6%, slots about 18% W |
| Opponent Active | y 28.4–45%, about 30.5% W; both opponent rows foreshortened (scale 0.85 × 0.8, tilted about 14°) |
| Centre line | y 46.6% |
| Auto toggle | x 80.8%, y 39.3% |
| End Turn | x 70.5–96.5%, y 45–49% |
| Your Active | y 47.7–66.7%, 32% W (`size-card-board`) |
| Your deck / discard | x 86% to off-screen, y 50–61% and 63–74.5% (fully visible on tablet) |
| Your Bench (3) | y 67.7–82.3%, 22.6% W each (`size-card-hand`), gap 2.3% |
| Menu button | Ø 9% W at (7.9%, 78.6%) |
| Your Energy Zone | Ø 15.2% W at (88.8%, 86%) |
| Your hand | cards 22.6% W, top edge at 83%, fanned ±6° |
| Your strip | x 0–44%, y 93.5–96.6% |

### The consumer provides

`<div class="pd-board">` (set `--pd-board-width` to resize) with a `.pd-board__center` line, `.pd-board__row[data-side="opp"]` and `[data-side="own"]` rows of `.pd-slot`s positioned with `inset-block-start` (own) or `inset-block-end` (opp, so the foreshortening scales toward the measured bottom edge), and absolutely placed PlayerStrips, EnergyZones, the Auto Toggle, the End Turn Button, the menu circle and the HandFan. Give the board `role="region"` and label each row.

### Rules

- Colours: `field` / `field-opp` outside the circle, `board` / `board-opp` inside, `board-band` along the centre line, `board-rim` for the rim. Playmats can recolour these through tokens; never through raw hex.
- The circle may overflow the box on phone (it does in the original); on tablet it fits the width.
- Nothing inside the box uses px positions; everything is % of the box so the scale rule holds.

## Banner (Board)

Preview: `assets/design-system/project/components/Banner/preview.html`

A diagonal announcement band over the board: turn changes, attacks, KOs, points, wins, rare pulls. Measured from the attack banner: a diagonal band with the attack name in big white italic display type and the Pokémon's name beneath, on a red-to-orange gradient.

### The consumer provides

`<div class="pd-banner" role="status" data-tone="…"><span class="pd-banner__title">Your Turn</span><span class="pd-banner__detail">Turn 3</span></div>`, centred over the board, removed after about 1 s (turn) or on tap (results).

### Attributes

| Attribute | Use |
| --- | --- |
| default (`hero-battle` blue) | turn changes |
| `data-tone="attack"` | an attack: title is the attack name, detail the attacker |
| `data-tone="danger"` | your Pokémon Knocked Out, defeat |
| `data-tone="reward"` | points earned, victory, rare pulls |
| `data-tone="neutral"` | coin results, draws |

### Rules

- One banner at a time; queue the rest in event order. Titles are two or three words in `display-l` italic.
- Enter over `dur-base` with `ease-pop` from the left; under reduced motion it fades.
- A long press skips the current animation, never the information: the engine state is already final.

## TabBar (Navigation)

Preview: `assets/design-system/project/components/TabBar/preview.html`

The bottom navigation. Measured from the original: five icon-only items, evenly spaced, in this order: **Home · My Cards · Social Hub · Battle · Menu**. Icon centres at 12.4%, 31%, 50%, 68.6% and 87.2% of the width; glyphs about 24–26px; the bar is 49px tall (`size-tabbar`) plus the home-indicator padding, filled `ground` with no top border. The current item's icon is filled; a red `notice` dot sits at an icon's top-right.

### The consumer provides

A `<nav aria-label="Main">` with `class="pd-tabbar"` and five `<a>` links, each with an `aria-label`, a 26px stroke SVG (`aria-hidden`), and a `.pd-visually-hidden` text label. Mark the current screen with `aria-current="page"`; CSS fills its icon (`fill: currentColor`) and paints any `[data-cut]` shape in `ground` to cut a window. Add `<span class="pd-tabbar__dot">` inside a link for a notification. Pin the bar to the bottom of the viewport.

### Rules

- No visible text labels: the original has none. The hidden label and `aria-label` carry the name.
- Exactly these five destinations; new features live inside them. Hide the bar during battles, pack opening and the card inspector.
- On tablet the same five icons spread across the full width at the same relative positions; there is no side rail in the original.
- Icons are this system's own 1.8px-stroke line drawings (the original's have a slight double-line depth); keep them slate `ink-muted`, filled `strip` when current.

## BoosterPack (Collecting)

Preview: `assets/design-system/project/components/BoosterPack/preview.html`

A sealed booster to choose and cut open, with this system's own wrapper. Measured: the pack's aspect is about 0.51 (w/h); the cut line is the lower edge of the header band, 8.5% from the top, and carries a faint glowing streak before it's touched. On the tear screen the pack is about 68% of screen width with its top edge at 47% of height, the body running off the bottom.

### The consumer provides

```
<button class="pd-pack" data-type="psychic" aria-label="Open Mind Bloom pack">
  <span class="pd-pack__top"></span><span class="pd-pack__cut"></span>
  <span class="pd-pack__body"><span class="pd-pack__variant">Booster</span><span class="pd-pack__set">Mind Bloom</span></span>
</button>
```

`data-type` picks the pack's colour (omit for `hero-battle`); `--pd-pack-width` sets the size. While the player swipes along the cut line, set `--pd-cut` (0–1) to the finger's position and `--pd-cut-visible: 1`; when the swipe passes 85% of the width, set `data-state="cut"`: the strip flies up-right while rotating about 18° and fades. Keyboard and switch users press the button to cut.

### Rules

- The tear follows the finger (direct manipulation), never a canned animation; the strip's fly-off and the light burst start on release.
- The pack picker shows three packs in a carousel (centre 42.6% W, sides 72% of that, yawed toward the centre) with a faint reflection beneath, an Offering Rates pill at bottom-left and a back circle.
- No price, timer or currency ever appears on or near a pack.

## OddsTable (Collecting)

Preview: `assets/design-system/project/components/OddsTable/preview.html`

The offering rates for a pack: rarity per slot, from the same data the pack RNG uses. The original opens it from an "Offering Rates" pill at the bottom-left of the pack screen.

### The consumer provides

A semantic `<table class="pd-odds">` inside a Panel, with a `<caption>` naming the pack, a header row (Rarity, Slots 1–3, Slot 4, Slot 5), one row per rarity with a RarityMark plus the rarity in words (visually hidden), and a `<tfoot>` line for the Rare Pack chance. Render values from the odds data, never typed by hand.

### Rules

- Three decimals for every non-zero rate; zero rates read "0%" in `ink-subtle`. Numerals are Jost, tabular.
- Every pack links to its table; it is never more than one tap away.
- On phone, the table scrolls horizontally inside its panel rather than shrinking text below 12px.
