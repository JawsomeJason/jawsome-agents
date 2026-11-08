# Layout

## Units

A pixel value means nothing without its capture. Report every box twice:

- **% of the frame**: x and w of the width, y and h of the height. These transfer between captures of the same screen class.
- **Points at a stated design width**: `pt = px × design_width / capture_width`. These are what a spec and a build use.

`layout.py` gives every size with `error_pt`, its accuracy in points: three capture pixels, because the flat-region finder places an edge to within about that. A 1170 px capture at 390 pt has `error_pt` 1.0.

## Capture scale

Captures from different devices, zoom levels or export settings have different px-per-pt scales. Each `layout.py` result states its `pt_per_px`; when two captures differ, compare their values in points, never in pixels, and say so in the report. A different aspect ratio means a different screen class: a vertical position in % does not carry over, because tall screens add space where the layout flexes.

## Finding panels

```sh
python3 scripts/layout.py shot.png --design-width 390
```

`layout.py` finds flat fills (low colour gradient), drops thin lines and text, keeps components that are rectangular enough, and grows each panel's edges back out to where its fill ends. It reports each panel's box in % and in points, its fill colour and a corner radius. Tune `--flat` up for noisy or compressed captures and `--min-area` down for small buttons. Shadows and gradients can merge or split panels; check a doubtful one with a crop (`--crops`, at most 400 px).

## Measuring an edge by hand

For an element the finder misses (text, an icon, a gradient button), walk a row or column of pixels across it and take the first and last positions where the colour leaves the background by more than the noise. Anti-aliased edges blend over one or two pixels; take the half-way crossing. A shadow is not the box: it fades gradually, where the box edge steps. Convert with `pt = px × design_width / capture_width`, and propose any snap to a grid step as an estimate beside the measured value.

## Corner radius

Measure the radius along the diagonal: the gap `a` from the bounding-box corner to the first filled pixel along the 45° line gives `r = a / (1 − 1/√2)`, about `3.41 × a`. Average all four corners, cap at half the shorter side, and tag the result `estimate`, because anti-aliasing blurs `a` by a pixel.

## Text

Read text size from the cap height or the x-height of a known glyph run, not from the line box, and report it as an estimate of font size with the ratio you assumed. Line height is the distance between baselines of two lines in the same block.
