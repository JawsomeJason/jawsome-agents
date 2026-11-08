# Provenance and deltas

## Tag every value

Every number in a report is one of:

- `measured`: read from a capture by a stated method, with its error bar. Example: `duration 400 ms ±16.7 (60 fps, 2% settling)`.
- `estimate`: inferred from measurements. Fits, snaps to a grid, font sizes from cap heights, and anything read by eye are estimates. Example: `easing ease-out-cubic (rmse 0.003, 24 samples; runner-up ease-out-quint 0.009)`.

Name the method beside every value: which capture, which box or region, which script and version, which parameters. The scripts write `tag` and `method` fields into each result for this, and the cache folder name pins the script version and parameters. A reader can then rerun any number, and can tell a reading from a guess.

## Propose deltas; never apply them silently

Compare each value with the current spec and hand back the differences as proposals. A silent edit hides a guess inside the spec, and the next reader cannot tell which values came from a capture and which from the original design.

| Property | Spec | Measured | Δ | Tag | Method | Proposal |
| --- | --- | --- | --- | --- | --- | --- |
| button height | 44 pt | 48.0 pt ±0.3 | +4 | measured | `layout` v1, box `cta`, capture `home`, 390 pt wide | change to 48 |
| button fill | gold-500 | #f2c94c → gold-400 ΔE 0.8 | token | measured | `colors` v1, box `cta`, median of 702×36 px | change token |
| sheet open | 300 ms | 400 ms (fit) | +100 | estimate | `fit-motion` v1, 24 samples at 60 fps | change to 400 ms ease-out-cubic |

Change the spec only for the rows the reader accepts, and keep the method with each value you write in.

## Keep measuring separate from deciding

A capture shows what one build did on one device. When the spec and the capture disagree, the capture is evidence, not a ruling: the reference may be wrong, out of date or in an unusual state. Say what you measured and let the reader decide.
