# OddsTable

The offering rates for a pack: rarity per slot, from the same data the pack RNG uses. The original opens it from an "Offering Rates" pill at the bottom-left of the pack screen.

## The consumer provides

A semantic `<table class="pd-odds">` inside a Panel, with a `<caption>` naming the pack, a header row (Rarity, Slots 1–3, Slot 4, Slot 5), one row per rarity with a RarityMark plus the rarity in words (visually hidden), and a `<tfoot>` line for the Rare Pack chance. Render values from the odds data, never typed by hand.

## Rules

- Three decimals for every non-zero rate. Zero rates read "0%" in `ink-subtle`. Numerals are Jost, tabular.
- Every pack links to its table. It is never more than one tap away.
- On phone, the table scrolls horizontally inside its panel rather than shrinking text below 12px.
