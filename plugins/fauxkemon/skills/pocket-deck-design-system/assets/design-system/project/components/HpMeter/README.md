# HpMeter

The floating HP read-out on a board card. Measured from the battle screen: a heavy 28px numeral (`hp-ink`, Jost 800) with a white `board-rim` stroke floating above the card's top-right corner, and a 7px mint `hp` bar on a white track about 40% of the card's width.

## The consumer provides

```
<div class="pd-hp" style="--pd-hp:50;--pd-hp-max:120" role="meter" aria-valuenow="50" aria-valuemin="0" aria-valuemax="120" aria-label="HP">
  <span class="pd-hp__value">50<small>HP</small></span>
  <span class="pd-hp__track"><span class="pd-hp__fill"></span></span>
</div>
```

`--pd-hp` and `--pd-hp-max` are unitless numbers (the bare `--hp` name is the bar colour token, so the numbers take the component prefix). The fill width is computed from them. BoardSlot anchors the meter to the card's top-right. Elsewhere it stands alone.

## Attributes

| Attribute | Values |
| --- | --- |
| `data-size="sm"` | 20px numeral and a 38px track for Bench and opponent cards |
| `--pd-hp-track` | override the track width (default 52px, about 40% of an Active card) |

## Rules

- The number is always visible. The bar is a hint. The bar does not change colour at low HP (the original's stays mint). Say "low" in the label if the app wants to.
- The bar drains over `dur-slow` with `ease-out` after the damage number has shown.
- Printed HP on the card face is PocketCard's `.pd-card__hp`. This meter is only for cards in play.
