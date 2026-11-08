# PlayerStrip

The slanted dark strip carrying a player's name, optional clock and point discs. Measured: yours spans 0–44% of screen width at 93.5–96.6% of height (26px tall) with its right end slanted about 20°; the opponent's is mirrored at the top-right (7–10% of height).

## The consumer provides

```
<div class="pd-strip"><span>Player</span><span class="pd-strip__timer">17:00</span><div class="pd-points" …></div></div>
<div class="pd-strip" data-side="opp">…</div>
```

Names are 13px 600 in `ink-inverse` on `strip`. The PointTracker sits at the slanted end (right for you, left for the opponent). The timer is optional: the original shows one only in timed matches.

## Rules

- The strip is `min-inline-size: 44%` of its container; place it in the Board's design box, not in a flex row.
- Points are announced by the Banner; the strip only shows them.
