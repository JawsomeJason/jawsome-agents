# EnergyBadge

The round type disc used for Energy, attack costs, Weakness, the Energy Zone and type filters. Measured from the original's card renders: a glossy disc in the type's disc colour (`disc-*`) with a rim light at 35% 30%, a shade at the bottom, a thin dark ring, and a white (or dark, on light types) type glyph.

## Use it for

- Attached Energy on a board slot (26px, `size-energy-badge`), attack costs on cards (5.3% of card width, set by the card), Weakness (3.7% of card width), the Energy Zone orb (`xl`), type filters and the deck's Energy picker (`lg`).

## The consumer provides

`<span class="pd-energy" data-type="fire"></span>`. Give it `role="img"` and an `aria-label` ("Fire Energy") wherever it stands alone; inside a labelled control or next to a type name, leave it decorative (`aria-hidden="true"`).

## Attributes

| Attribute | Values |
| --- | --- |
| `data-type` | `grass` `fire` `water` `lightning` `psychic` `fighting` `darkness` `metal` `dragon` `colorless` |
| `data-size` | `xs` 16px · `sm` 20px · default 26px (`size-energy-badge`) · `lg` 44px · `xl` 64px |
| `data-state="empty"` | an outlined placeholder (no Energy yet) |

## Rules

- The disc colours (`disc-*`, `disc-*-hi`, `disc-*-shade`) are measured from the original's cards; the glyph colour is `on-type-*`. Never recolour one without the other.
- Dragon and Colorless are types, not Energy: they never appear in the Energy Zone or the deck's Energy picker.
- The glyphs are this system's own single-ink drawings. Don't swap in the original's Energy symbols.
