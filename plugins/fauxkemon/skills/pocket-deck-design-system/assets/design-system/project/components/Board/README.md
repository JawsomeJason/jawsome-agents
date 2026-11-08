# Board

The battle mat composition: a portrait 9:19.5 design box (390×845 on phone) whose background is the field, split at the centre line, with the white-rimmed board circle (Ø 73% of height, 159% of width) centred on that line. The app places slots, HUD and hand inside the box at the measured positions; on tablet and desktop the whole box scales to fit the height, centres, and the field and HUD bleed to the edges.

## Measured positions (% of the design box; y is the top edge unless noted)

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

## The consumer provides

`<div class="pd-board">` (set `--pd-board-width` to resize) with a `.pd-board__center` line, `.pd-board__row[data-side="opp"]` and `[data-side="own"]` rows of `.pd-slot`s positioned with `inset-block-start` (own) or `inset-block-end` (opp, so the foreshortening scales toward the measured bottom edge), and absolutely placed PlayerStrips, EnergyZones, the Auto Toggle, the End Turn Button, the menu circle and the HandFan. Give the board `role="region"` and label each row.

## Rules

- Colours: `field` / `field-opp` outside the circle, `board` / `board-opp` inside, `board-band` along the centre line, `board-rim` for the rim. Playmats can recolour these through tokens; never through raw hex.
- The circle may overflow the box on phone (it does in the original); on tablet it fits the width.
- Nothing inside the box uses px positions; everything is % of the box so the scale rule holds.
