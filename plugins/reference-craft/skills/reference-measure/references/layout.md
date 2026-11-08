# Layout

## Units

A pixel value means nothing without its capture. Report every box twice:

- **% of the frame**: x and w of the width, y and h of the height. These transfer between captures of the same screen class.
- **Points at a stated design width**: `pt = px × design_width / capture_width`. These are what a spec and a build use.

One capture pixel is the resolution of every value, so `layout.mjs` gives it as `error_pt`. A 1170 px capture measured at 390 pt has `error_pt` 0.3.

## Capture scale

Captures from different devices, zoom levels or export settings have different px-per-pt scales. `layout.mjs` lists each capture's `pt_per_px` and its scale against the first, and warns when they differ, so you compare in points, never in pixels. A different aspect ratio means a different screen class: a vertical position in % does not carry over, because tall screens add space where the layout flexes.

## Measuring a box

Find edges from numbers, not from a look: walk a row or column of pixels across the element and take the first and last positions where the colour leaves the background by more than the noise. Anti-aliased edges blend over one or two pixels; take the half-way crossing. A shadow is not the box: it fades gradually, where the box edge steps.

Write the boxes and lengths into a spec file and convert them in one run:

```json
{
  "design_width": 390,
  "captures": [{ "name": "home", "width": 1170, "height": 2532 }],
  "boxes": [
    {
      "name": "cta",
      "capture": "home",
      "x": 117,
      "y": 2100,
      "w": 936,
      "h": 150
    }
  ],
  "lengths": [{ "name": "card-radius", "capture": "home", "px": 36 }]
}
```

```sh
node scripts/layout.mjs --spec layout.json
```

Boxes may be given as fractions with `"unit": "frac"`. `lengths` takes radii, gaps and paddings. Snapped values (`w_pt_snapped`, `pt_snapped`) round to the `grid_pt` step (default 4) and are estimates: propose the snap, and keep the measured value beside it.

## Corner radius

Measure the radius along the diagonal: the gap `a` from the bounding-box corner to the first filled pixel along the 45° line gives `r = a / (1 − 1/√2)`, about `3.41 × a`. Average all four corners, cap at half the shorter side, and tag the result `estimate`, because anti-aliasing blurs `a` by a pixel.

## Text

Read text size from the cap height or the x-height of a known glyph run, not from the line box, and report it as an estimate of font size with the ratio you assumed. Line height is the distance between baselines of two lines in the same block.
