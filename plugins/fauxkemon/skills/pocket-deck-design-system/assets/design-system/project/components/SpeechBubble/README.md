# SpeechBubble

The highlight bubble above the packs on the booster screen. Measured: a white rounded rectangle (20px radius) with an inset lighter inner frame and a centred downward tail about 24px wide and 12px tall; inside, a horizontally scrolling strip of card thumbnails clipped at both sides.

## The consumer provides

`<div class="pd-bubble">` with a row of small `.pd-card` thumbnails (about 12.8% of screen width each, so around 50px on phone) in an `overflow-x: auto` strip. Give the strip `role="list"` and each card `role="listitem"` with an `aria-label`.

## Rules

- One bubble per screen, directly above the pack carousel, 71% of the screen width.
- The strip scrolls; it never wraps. Clip it so the first and last thumbnails are cut, which signals the scroll.
- Thumbnails are PocketCards at their smallest step (head and art only), not separate images.
