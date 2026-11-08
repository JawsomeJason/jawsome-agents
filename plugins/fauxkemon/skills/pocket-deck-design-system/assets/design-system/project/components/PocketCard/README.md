# PocketCard

The card face. Its geometry is measured from the original's card renders and expressed in container units (`cqi`, 1% of card width, with vertical positions converted from % of card height), so one markup scales from the 88px hand card to the 320px inspector. The frame, glyphs and art are this system's own.

## Measured anatomy (Pokémon card)

| Part | Position (% of width unless noted) |
| --- | --- |
| Frame | brushed-silver border 4% thick (`card-frame`, highlight, shade). Body in the type's measured pair (`card-*`, `card-*-edge`) |
| Stage pill | x 2.5, y 4.36%H, 14.5 × 3.52%H, 2.2 text |
| Name | from x 18, 6.6 text, 700. `ex` suffix in gold italic Jost |
| HP | right-aligned at 87.17, 6.9 Jost 800 with a 3.2 "HP" label |
| Type disc | centre 91.3 × 6.2%H, Ø 6.5 |
| Evolves-from | octagonal thumb 11.83 × 6.91%H at (4, 7.76%H) and a slanted band |
| Art frame | (7.33, 9.21%H) 85.5 × 41.33%H, bevelled. Illustration 1 in. Dex strip 2.18%H along the bottom |
| Body | 50.9%H to 85.8%H. Attacks centre, or stack from the top when an Ability leads |
| Ability | red pill 22.5 × 3.15%H at 53.82%H, name at x 30.83 in 5.0 |
| Attack row | pips Ø 5.3 from x 9.25, name at x 30.5 in 4.9, damage right at 93.33 in 6.2 Jost. Effect text 3.8 |
| Footer | Weakness pill 7.33–48.33, Retreat pill 52–93, both 3.27%H at 85.82%H |
| Illustrator and rarity | x 6.67 at 89.58%H (2.0) and x 7 at 91.27%H (glyphs 4 wide, 4.08 pitch) |
| Flavour | right-aligned block at 93.17 from 90.18%H, max 48.3 wide, 2.7 italic |
| ex rule | gold slanted slab 33.33–96 at 90.67%H, 6.18%H tall, with a black "EX RULE" tab |

Trainers: a header band at 3.27%H with the kind at left and TRAINER at right, the name at x 5.67 (6.3), the art frame from 13.58%H, centred 4.0 text, and a kind-coloured rule box 31.67–96 at 88.97%H.

## The consumer provides

`<article class="pd-card">` with `data-type` (or `data-kind="trainer" data-trainer="item|supporter"`), a width through `--pd-card-width`, an `aria-label` reading the essentials, and these children in order:

1. `.pd-card__frame` (empty: carries the border and body)
2. `.pd-card__stage` ("Basic", "Stage 1") and optional `.pd-card__evolves` (`<i></i><span>Evolves from X</span>`). Trainers use `.pd-card__band` (`<b>Item</b><i>TRAINER</i>`) instead
3. `header.pd-card__head`: `h3.pd-card__name` (optional `span.pd-card__ex`), `span.pd-card__hp` (`<small>HP</small>60`), a `.pd-energy` type disc
4. `.pd-card__art`: optionally an `<img>` or `.pd-card__layers > .pd-card__layer[data-depth="back|mid|front"]` with inline backgrounds, plus `.pd-card__dex` text
5. `.pd-card__body`: optional `.pd-card__ability` (`.pd-card__ability-label`, `.pd-card__ability-name`, `p.pd-card__text`) and `.pd-card__attack` rows (`.pd-card__cost` of `.pd-energy` pips, `.pd-card__attack-name`, `.pd-card__damage`, optional `p.pd-card__text`)
6. `footer.pd-card__foot`: `<span>Weakness <span class="pd-energy" data-type="fire"></span><b>+20</b></span><span>Retreat <span>…pips…</span></span>`
7. `.pd-card__illus`, `.pd-card__meta` (RarityMark and set code), and either `p.pd-card__flavor` or `p.pd-card__rule[data-tab="ex rule"]`

Attack costs carry an `aria-label` ("Cost: 2 Fire, 1 Colorless"). The type disc has `role="img"`.

## Attributes

| Attribute | Values |
| --- | --- |
| `data-type` | the Pokémon's type: body colours, disc, placeholder art tint |
| `data-kind="trainer"` + `data-trainer` | `item` (blue) or `supporter` (orange) |
| `data-art` | `full` (☆ and up: art fills the card, text stroked in `card-fullart-outline`), `layered` (parallax layers, the front one may break out of the art frame) |
| `data-finish` | `sheen` (◊, ◊◊), `foil` (◊◊◊), `ex` (◊◊◊◊), `holo` (☆, ☆☆), `immersive` (☆☆☆), `shiny` (✵), `crown` (♕), `parallel` |
| `--pd-card-width` | any length. Default `size-card-inspect` (320px) |
| `aria-selected="true"` or `data-selected`, and `data-dragging` | selected glow, dragging shadow |

## Size steps

Container queries hide what can't be read: below 220px the effect text, flavour, rule, illustrator, dex line and evolves band go. Below 140px only the frame, name, HP, type disc and art remain (the hand and Bench size).

## Finishes and tilt

Finishes read `--pd-pointer-x/y` (0–100%), `--pd-tilt-x/y` (-1…1), `--pd-from-center` (0…1) and `--pd-active` (0…1). `bundle.js` sets them: `PocketDeck.attachTilt(card)` returns a detach function. `PocketDeck.requestTilt()` asks for gyro permission from a tap. Under reduced motion the driver sets one off-axis pose and the card does not rotate. Layer order: body → illustration → frame holo (`::before`) → front effects (`::after`). See `finishes-and-motion.md` in the skill references.

## Rules

- Geometry is the contract. Don't move parts with inline styles. Change `components.css` and re-render.
- Never set px font sizes inside a card. Everything is `cqi`.
- Art is an `<img>` cropped with `object-fit: cover`, or gradient layers. Without either, the type-tinted placeholder shows.
- The frame, pills, glyphs and art are this system's. Never ship the original's frames, symbols, logos or illustrations.
