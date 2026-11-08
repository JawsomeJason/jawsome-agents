# TabBar

The bottom navigation. Measured from the original: five icon-only items, evenly spaced, in this order: **Home · My Cards · Social Hub · Battle · Menu**. Icon centres at 12.4%, 31%, 50%, 68.6% and 87.2% of the width; glyphs about 24–26px; the bar is 49px tall (`size-tabbar`) plus the home-indicator padding, filled `ground` with no top border. The current item's icon is filled; a red `notice` dot sits at an icon's top-right.

## The consumer provides

A `<nav aria-label="Main">` with `class="pd-tabbar"` and five `<a>` links, each with an `aria-label`, a 26px stroke SVG (`aria-hidden`), and a `.pd-visually-hidden` text label. Mark the current screen with `aria-current="page"`; CSS fills its icon (`fill: currentColor`) and paints any `[data-cut]` shape in `ground` to cut a window. Add `<span class="pd-tabbar__dot">` inside a link for a notification. Pin the bar to the bottom of the viewport.

## Rules

- No visible text labels: the original has none. The hidden label and `aria-label` carry the name.
- Exactly these five destinations; new features live inside them. Hide the bar during battles, pack opening and the card inspector.
- On tablet the same five icons spread across the full width at the same relative positions; there is no side rail in the original.
- Icons are this system's own 1.8px-stroke line drawings (the original's have a slight double-line depth); keep them slate `ink-muted`, filled `strip` when current.
