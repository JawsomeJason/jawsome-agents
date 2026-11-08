# Motion

## From frames to a CSV

Run `timing.py` on a recording with a region of interest and a window, and it differences the region itself as [video.md](video.md) step 5 describes. For a series read any other way, give it a CSV: a `t` column (or `frame` with `--fps`), and a `progress` column, a `diff` column, or both. Either way, choose the window so it starts and ends at rest, with a few still frames on each side.

```csv
t,progress
0.0000,0
0.0167,0
0.0333,0.072
```

```sh
python3 scripts/timing.py clip.mp4 --roi 0.1,0.6,0.8,0.3 --start 12.0 --end 13.5
python3 scripts/timing.py --csv motion.csv
```

## Onset, settle and duration

- With `progress`, onset is the last sample inside the 2% band around the start value, and settle is the first sample after which progress stays inside the 2% band around the end value. This is the usual settling-time definition, and it counts overshoot that leaves the band.
- With `diff` alone, onset is the frame before the first difference above `max(4 × noise floor, 10% of peak)`, and settle is the last such frame. A slow tail, such as the end of an ease-out, falls under that threshold, so this duration is a lower bound; the script says so.

Both are measured, with an error bar of one frame: a 60 fps capture times motion to ±16.7 ms, a 30 fps capture to ±33.3 ms. A transition of 100 ms at 30 fps is three frames, and its curve is unknowable; report its duration and stop.

## Easing and spring fits

Progress is normalized from the start value (0) to the end value (1), then fitted, from onset to half a duration past settle, to:

- `linear`, `ease-in-cubic`, `ease-out-cubic`, `ease-in-out-cubic`, `ease-out-quint`, `ease-out-expo`,
- the four standard CSS keyword curves (`css-ease`, `css-ease-in`, `css-ease-out`, `css-ease-in-out`),
- a damped spring at mass 1: stiffness `k`, damping `c`, damping ratio `ζ = c / (2√k)` and response `2π / √k` seconds.

Each easing gets its own fitted duration and a sub-frame start, because the frame that first shows motion was captured somewhere inside the interval after it began. So the fitted `duration_ms` of the best easing is the duration to propose, and the 2% settling time is a check on it. For a spring, propose stiffness and damping ratio, or the response and damping ratio for platforms that take those.

Report, for the best fit: its name, residual (`rmse`), the fitted duration or spring constants, `overshoot_pct`, the number of samples in the motion, and the runner-up with its residual. Every fit is an `estimate`: the names are candidates that reproduce the measured curve, not proof of what the source code uses.

## Reading a fit

- Under 8 moving samples, close easings cannot be told apart. Say so and give only duration and overshoot.
- Best and runner-up within 0.01 rmse: the fit is ambiguous; report both.
- Overshoot above 0 with an easing as the best fit: the motion is a spring or a custom curve; prefer the spring.
- A large residual on every candidate: the region caught two motions, or the progress is not monotone (a fade and a slide together). Shrink the region or split the window.

## What differencing cannot see

Fades, slides and scales all produce a progress curve, so the fit recovers the timing shape, not the path. Measure the path separately: `--track` reports the centroid of the change per frame, and a position read from an edge per frame fits as a CSV `progress` column too. Opacity and position of one element may use different curves; fit each.
