# RainbowRule

The 2px rule under section titles (My Cards, Wonder Pick, Display Boards) and the thin rule on Opening Results. Measured: full width, 2px tall, a horizontal lime-to-pink gradient (`gradient-rainbow`).

## The consumer provides

`<hr class="pd-rule">` directly under the title. `data-tone="brand"` gives the solid cyan rule used on Opening Results.

## Rules

- One per screen, under the title only; it is a section marker, not a divider between rows (rows use `line`).
- Titles above it are `title` (21px, 700) centred, as the original centres "My Cards".
