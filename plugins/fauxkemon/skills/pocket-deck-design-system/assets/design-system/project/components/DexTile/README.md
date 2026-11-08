# DexTile

One entry in the collection grid: the card if owned (with a copy count), a numbered empty slot if not.

## Measured grid

Five columns at the default zoom: tiles 17.4% of screen width (pitch 18.4%), 1% gutters, 4.4% side margins, 10px row gap. The zoomed-in view is three columns with tiles at 28%. Pinch changes the tile size. `.pd-dex-grid` sets this up with `--pd-dex-cols` (default 5).

## The consumer provides

A `.pd-dex-grid` of links or buttons with `class="pd-dex-tile"`, each containing either a `.pd-card` (owned) or `.pd-dex-tile__empty` with the card number (not owned), an optional `.pd-dex-tile__count` tab (the dark slate "1"/"2" tab at the tile's bottom-left), an optional `New` chip (top-left) and the collector number beneath. The accessible name states the card and whether it's owned: "Sproutling, owned ×2" or "Card 004, not owned".

## Rules

- Not-owned tiles show the number only, never a silhouette of the art.
- Owned tiles open the card inspector. Not-owned tiles open the card's crafting cost and which packs contain it.
- Above the grid the original shows per-rarity counters (◊ 183/226, ☆ 22, ♕ 1) and a Toggle between owned cards and the full Dex. Use Chips and Toggle for those.
