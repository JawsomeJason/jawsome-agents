# reference-craft

Skills for building against a reference UI: an existing product you match from screenshots and screen recordings.

| Skill | What it holds |
| --- | --- |
| `reference-measure` | How to measure captures as reproducible numbers while looking at few pixels: contact sheets and small crops instead of full frames, scene detection and per-segment measurement, box-median colours matched to design tokens by CIEDE2000, layout in % and points at a design width, motion onset, duration and easing or spring fits with a one-frame error bar, audio onsets, loudness and ducking, measured or estimate tags with deltas proposed against the spec, and outputs cached by input hash. Its standard-library Node.js scripts each write JSON that follows a schema in `references/schemas/`. |

Captures of third-party products are for measuring only: the skill keeps them, and everything derived from them, out of what ships.

Run the tests with `node --test 'plugins/reference-craft/tests/*.test.mjs'`.
