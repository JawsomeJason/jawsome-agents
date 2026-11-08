# reference-craft

Skills for building against a reference UI: an existing product you match from screenshots and screen recordings.

| Skill | What it holds |
| --- | --- |
| `reference-measure` | How to measure captures as reproducible numbers while looking at few pixels: contact sheets and small crops instead of full frames, scene detection and per-segment measurement, box-median colours matched to design tokens by CIEDE2000, layout in % and points at a design width, motion onset, duration and easing or spring fits with a one-frame error bar, audio onsets, loudness and ducking, measured or estimate tags with deltas proposed against the spec, and outputs cached by input hash. Its Python scripts declare their packages in `scripts/requirements.txt` and need the ffmpeg CLI for video and audio; each writes JSON that follows a schema in `references/schemas/`, and `SKILL.md` gives the by-hand route when the dependencies are missing. |

Captures of third-party products are for measuring only: the skill keeps them, and everything derived from them, out of what ships.

Run the tests with `node --test 'plugins/reference-craft/tests/*.test.mjs'`. They run the scripts with `python3` (or `REFERENCE_MEASURE_PYTHON`) and skip when the packages or ffmpeg are missing; `REFERENCE_MEASURE_REQUIRE_DEPS=1` turns that skip into a failure, as CI sets it.
