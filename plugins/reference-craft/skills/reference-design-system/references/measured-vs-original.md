# Measured vs original

The system reproduces the reference's look and none of its property. Sort every value and asset into one of two bins before it enters the system.

## What may be measured

These describe how the reference looks, and any careful observer could arrive at them:

- **Colours:** sampled fills, text colours, gradient stops, shadow tints.
- **Geometry:** positions, sizes, radii, aspect ratios, stroke widths, spacing rhythm.
- **Type metrics:** sizes, line heights, weights, tracking, cap positions; which classification a face belongs to.
- **Timing:** durations, delays, easing shapes, spring feel.
- **Behaviour:** what moves with the pointer, what responds to tilt, what never animates.

## What is always original

These are the reference's identity, and copying them copies the property rather than the look:

- logos, wordmarks and app icons
- glyphs, symbols, marks and icon sets
- illustrations, photos, character art and textures
- the artwork inside frames, backs and borders (the frame's measured geometry and colours are fine; its painted texture is not)
- the reference's font files
- sounds, if the system covers them

Draw each of these fresh, in the system's own style, at the measured size and position. A placeholder is a gradient or a neutral shape, never a traced or recoloured copy, because placeholders ship more often than anyone plans.

## Evidence records

Every measured token carries a record, so a later reader can tell a sampled value from a guess:

```json
{
  "name": "surface",
  "value": { "light": "#f0f4f8", "dark": "#16202a" },
  "usage": "Panels, list rows, secondary buttons.",
  "provenance": "measured",
  "confidence": "measured",
  "evidence": "Light: median of 9 samples from three settings screens at 1x. Dark: original; the reference has no dark theme."
}
```

| Field | Values | Meaning |
| --- | --- | --- |
| `provenance` | `measured`, `derived`, `original` | Read from the reference; computed from measured values (a pressed state, a tint); or chosen by this system |
| `confidence` | `measured`, `observed`, `estimate` | Read from pixels, frames or the reference's own statements; described in words by others without numbers, then tuned to the description; no source, a starting value to tune by eye |
| `evidence` | free text | What was sampled, from what, how many times; or why the value is original |

Rules of thumb:

- Measure from the largest clean source available and record its scale, because a value read from a compressed thumbnail is an estimate wearing a measured label.
- Record the reference value even when you depart from it (see departures in [tokens.md](tokens.md)), because the reference value is the evidence.
- A theme the reference lacks (a dark theme for a light-only product) is `original` throughout. Say so once at the top of the token table and per token in `evidence`.
- Values that describe a physical object inside the product (a card, a ticket, a page) stay the same in every theme, because the object does not change colour when the room does.
