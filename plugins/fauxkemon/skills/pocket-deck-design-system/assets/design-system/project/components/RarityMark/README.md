# RarityMark

A row of rarity glyphs (◊ to ◊◊◊◊, ☆ to ☆☆☆, ♕, ✵ to ✵✵) for cards, lists and the odds table.

## The consumer provides

`<span class="pd-rarity" data-tier="star" role="img" aria-label="Rarity: 2 stars"><i></i><i></i></span>`: one empty `<i>` per glyph, and the rarity in words in `aria-label`.

## Attributes

| Attribute | Values |
| --- | --- |
| `data-tier` | `diamond` (default), `star`, `crown`, `shiny` |
| `font-size` | the glyph size. It inherits, so set it on the mark or its parent |

## Rules

- In the UI the glyphs take `rarity-*`, which hold 3:1 on `surface` in both themes. On a card face PocketCard swaps in the measured card colours (`card-rarity-*`: a dark olive diamond, indigo star, lime shiny, gold crown) at 4% of card width with a 4.08% pitch.
- Name rarities in words where a player decides something (odds, crafting costs). Glyphs alone are fine on card faces.
- The glyphs are this system's own drawings.
