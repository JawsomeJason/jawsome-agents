# Geometry

Measurements arrive in pixels of one screenshot. The system ships them as relative values, so the measured layout holds at every size the product runs at.

## Two frames of reference

- **The component box.** For anything that scales as a unit (a card, a badge, a ticket), measure each part as a percentage of the component's width and height, from the largest clean render available.
- **The design box.** For screen layouts, scale the screenshot onto a fixed design box (for example a 390 by 844 phone frame) and record positions in that box's pixels and as percentages of its width or height. Record the source size and the scale factor, so anyone can redo the conversion.

Store screen-layout measurements as data (a JSON file of named regions with `x`, `y`, `w`, `h` or centres and diameters, each with a confidence), not only inside CSS, so a later measurement pass can diff against them.

## Container-query units for components that scale

Make the scaling component a size container and express every inner length in container units, so one width setting scales the whole face:

```css
.xx-card {
  container-type: inline-size;
  inline-size: var(--xx-card-width, 300px);
  aspect-ratio: 63 / 88;
  --h: 1.3968cqi; /* 1% of card height, in width units: 88 / 63 */
}
.xx-card__name {
  inset-inline-start: 18cqi;
  inset-block-start: calc(4.6 * var(--h));
  font-size: 6.6cqi;
}
```

- `cqi` is 1% of the container's inline size. Horizontal measurements as a percentage of width map straight to `cqi`.
- Vertical measurements taken as a percentage of height need a conversion. Define one custom property for 1% of height in `cqi` (the height-to-width ratio divided by 100), and multiply by it, so every vertical value stays in the units it was measured in.
- Corner radii that scale use `cqi` too, or a percentage token (`radius-card: 4.6%`), so corners do not stay sharp on a large card and blobby on a small one.
- Type inside the component uses `cqi` sizes. State in the README the card width at which each size equals its token, so the type scale stays traceable.

## Size steps that hide unreadable detail

A component shown at many widths cannot show everything at every width. Pick breakpoints by the smallest readable size (about 9 to 10 CSS pixels for text), and hide whole regions below them with container queries:

```css
@container (inline-size < 220px) {
  .xx-card__text {
    display: none;
  }
}
@container (inline-size < 140px) {
  .xx-card__details,
  .xx-card__footer {
    display: none;
  }
}
```

Hide whole regions, never shrink text below the floor, and list each step in the README, because a consumer placing the component in a small slot needs to know what disappears.

## Positions in screen layouts

- Anchor regions the way the reference anchors them: a bottom bar stays at the bottom with safe-area padding; a centred board scales to the shorter side.
- When the reference has a tablet or desktop layout, measure it separately and record how each region re-anchors. Do not infer a wide layout from a phone screenshot.
- Write minimum touch targets as a size token and apply them to hit areas even when a control draws smaller, because a measured 35px button is a fidelity choice and a 44px hit area is an access requirement.

## When a number looks wrong

Fix it at the source (the measurement record or the component source), rebuild and re-render. Never nudge a measured position with an inline style in a feature, because the nudge hides the error from every other consumer.
