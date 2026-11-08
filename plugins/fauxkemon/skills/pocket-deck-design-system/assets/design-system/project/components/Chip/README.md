# Chip

A small pill for status, counts, tags and filters: the original's timer chips, "New" tags, count pills and the Energy picker's pills.

## Use it for

- Counts and tags on panels (`"1,025"` with a card icon, `"24/30"`, `"#MyCollection"`), timers on Wonder Pick cards.
- "New" on freshly pulled cards (`reward`).
- Deck validity ("Valid deck", `success`; "Over 20 cards", `danger`).
- Type pills in the deck builder's Energy picker and the Dex filters: a `<button class="pd-chip" aria-pressed>` with an Energy badge; pressed pills take the dark `strip` fill with white text, as the original's selected Energy pills do.

## The consumer provides

A `<span>` (status) or `<button>` (filter) with `class="pd-chip"`, a tone, and a word. For type tones, set `data-type` on the chip. An Energy badge may lead the text.

## Attributes

| Attribute | Values |
| --- | --- |
| `data-tone` | `brand`, `reward`, `danger`, `success`, `strip`, `type`, `tint`, or none (neutral `surface`) |
| `data-type` | an Energy type, with `type` or `tint` tones |
| `aria-pressed` | on filter buttons; `true` renders the `strip` fill |

## Rules

- A chip always carries a word. Colour alone never carries meaning.
- Filter chips grow to 36px tall; wrap them in a row with `space-2` gaps.
- Don't stack more than two chips on a board slot.
