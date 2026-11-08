# Colour

## Sample boxes, not pixels

Pick a box inside a flat area, at least 4 px on each side and a few pixels clear of every edge, and take the median of each channel. One pixel is unreliable for four reasons:

- **Compression.** Lossy image and video codecs shift flat colours by a few levels and add ringing next to edges.
- **Chroma subsampling.** Most video stores colour at half resolution, so colour bleeds about two pixels across every edge. Stay clear of edges in video frames.
- **Anti-aliasing and dithering.** Edge pixels blend two colours; gradients may be dithered so that no single pixel holds the true value.
- **Overlays.** A scrim, shadow or blur behind a translucent panel changes what the panel's pixels show. Sample the panel where its background is known, and report the result as the composite colour, not the token's raw value.

`colors.mjs` reports each box's `spread`, the widest channel's interquartile range. Over 12 levels, the box crossed an edge, text or a gradient: shrink or move it before trusting its median.

```sh
node scripts/colors.mjs --tokens tokens.json --image shot.png --box cta:0.14,0.51,0.72,0.04 --box ground:0.02,0.02,0.2,0.05
```

Box values are fractions of the image width and height, so the same box works on captures of different sizes. `--grid 4x8` samples a whole screen in cells when you do not yet know where the colours are.

## Nearest token by CIEDE2000

Each median is converted from sRGB to CIE Lab (D65) and compared with every solid colour token by CIEDE2000, the colour difference that tracks what people see. Report the token, the ΔE and the runner-up, because two tokens close together make a match ambiguous.

| ΔE | Verdict | Meaning |
| --- | --- | --- |
| ≤ 1 | `exact` | indistinguishable; the token is right |
| ≤ 3 (`--match`) | `match` | within capture noise; use the token |
| ≤ 6 | `near` | probably the token through compression or an overlay; check the capture and say so |
| more | `none` | no token fits; propose a new one or a change, as a delta |

Raise `--match` for heavily compressed video and lower it for lossless screenshots, and state the value you used.

## Tokens file

`colors.mjs` reads a flat map (`{"ground": "#e4eaf4"}`), an array of `{name, value}`, or nested groups whose leaves are hex strings or `{value}` / `{$value}` objects, joining group names with dots. A value that is an object of themes (`{"light": "#fff", "dark": "#111"}`) uses `--theme`. Alpha is ignored and non-colour values are skipped, so match translucent tokens by hand against the composite.

## Without a PNG decoder path

`colors.mjs` decodes plain 8-bit and 16-bit PNG files itself. For a JPEG, a video frame or an interlaced PNG, convert the frame to a plain PNG with any image tool, or read the box pixels with any image library and pass them as `--samples`: `[{name, pixels: [[r, g, b], ...]}]`, or one `{name, hex}` per colour another tool already measured.

## Capture colour

Screenshots may carry a wide-gamut colour profile while tokens are sRGB. A profile mismatch shows as every colour off by a similar ΔE in the same direction. Convert the capture to sRGB first, or note the profile in the method and treat matches as `near` at best.
