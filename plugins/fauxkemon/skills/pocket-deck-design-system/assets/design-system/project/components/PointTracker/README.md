# PointTracker

The three point discs in each player's strip. Measured: 13px discs. Unearned ones are dark (`point-empty`), earned ones become a gold coin (`reward`) with a blue italic numeral (`coin-ink`) counting 1, 2, 3.

## The consumer provides

A `role="img"` container with the score in words, three `.pd-points__pip` spans (`data-filled` on earned ones) and an optional visible `.pd-points__label`. The numeral on each coin is a CSS counter. Don't type it.

```
<div class="pd-points" role="img" aria-label="Your points: 2 of 3">
  <span class="pd-points__pip" data-filled></span><span class="pd-points__pip" data-filled></span><span class="pd-points__pip"></span>
</div>
```

## Attributes

| Attribute        | Values                                          |
| ---------------- | ----------------------------------------------- |
| `data-size="lg"` | 24px coins for result screens and the VS screen |

## Rules

- Each strip shows its own tracker (PlayerStrip places it at the slanted end). Announce new points through the Banner, not the tracker.
- A coin fills over `dur-base` with `ease-pop`. An ex KO fills two, staggered by 80ms so the player can count.
- The numeral is decorative (`coin-ink` is not a text colour). The score lives in the `aria-label`.
