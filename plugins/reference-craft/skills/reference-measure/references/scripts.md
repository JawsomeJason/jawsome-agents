# Scripts

The scripts are Python 3. They need the packages in `scripts/requirements.txt` and, for video and audio, the `ffmpeg` and `ffprobe` CLIs; `common.py` needs only the standard library. Run them by path from the skill folder. Each one:

- takes `--out <root>` (default `.reference-measure`) and `--force`, and caches as [cache.md](cache.md) describes;
- takes box and region values as fractions (0 to 1) of the displayed frame, after rotation;
- prints a few summary lines, warnings marked `!`, and `result: <path>` last;
- exits 0 on success and 2 with one line on stderr for a usage error, such as a missing file, a missing CLI or a malformed box;
- writes `result.json` in the envelope `{step, version, inputs, params, result}`, with `result` following the schema named after the script.

When a script cannot run, write the same `result.json` by hand from the schema, so the next step reads it the same way.

## keyframes.py

```sh
python3 scripts/keyframes.py clip.mp4 --sheet
python3 scripts/keyframes.py clip.mp4 --start 12 --end 14.5 --threshold 0.05 --min-gap 0
```

Keyframes go to `kf_*.jpg` (long side `--long-side`, default 540) beside `result.json`. `--sheet` writes `sheet_*.jpg` and `sheets.json`: one sheet per batch, long side at most `--sheet-long` (1200), split evenly only when tiles would fall under `--min-tile` (120) px. Schemas: `schemas/keyframes.schema.json`, `schemas/keyframes.sheets.schema.json`. See [video.md](video.md) and [token-budget.md](token-budget.md).

## timing.py

```sh
python3 scripts/timing.py clip.mp4 --roi 0.1,0.6,0.8,0.3 --start 12.0 --end 13.5 [--track]
python3 scripts/timing.py --csv motion.csv [--fps 60]
```

From video, the region is differenced frame by frame and projected onto its total change. A CSV holds `t` (or `frame` with `--fps`) and `progress`, `diff` or both. Output: `fps`, `frame_ms`, `onset_s`, `settle_s`, `duration_ms`, `duration_error_ms`, `fits[]` best first, `best_fit`, `overshoot_pct`, tags, methods and `warnings`; `--track` adds the centroid of change. Schema: `schemas/timing.schema.json`. See [motion.md](motion.md).

## colors.py

```sh
python3 scripts/colors.py shot.png --tokens tokens.json --box cta:0.14,0.51,0.72,0.04 [--grid 4x8] [--auto] [--theme dark] [--match 3] [--crops]
```

Output per box or cell: `hex`, `rgb`, `rect_px`, `pixel_count`, `spread`, `warnings`, `token`, `token_hex`, `delta_e`, `runner_up`, `verdict`, `tag`, `method`; `--auto` adds k-means dominant colours tagged `estimate`. Schema: `schemas/colors.schema.json`. See [color.md](color.md).

## layout.py

```sh
python3 scripts/layout.py shot.png [--design-width 390] [--flat 9] [--min-area 0.004] [--min-fill 0.8] [--crops]
```

Output: `boxes[]` (panels) and `background[]`, each in % and in points at `--design-width`, with `error_pt`, fill colour and, for panels, a corner radius estimate. Schema: `schemas/layout.schema.json`. See [layout.md](layout.md).

## audio.py

```sh
python3 scripts/audio.py clip.mp4 [--separate] [--align <keyframes result.json>] [--window bed:3,5 --window ducked:6.2,6.8 --baseline bed]
```

Extracts mono 44.1 kHz WAV into the cache folder once. Output: `integrated_lufs`, `lra_lu`, `windows[]` with `lufs` and `ducking_db`, `onsets[]` with level, decay, momentary loudness, centroid and pitch, and with `--align` an `alignment` block with each onset's nearest keyframe and the median offset. Schema: `schemas/audio.schema.json`. See [audio.md](audio.md).

## common.py

```sh
python3 scripts/common.py lookup --input clip.mp4 --step scenes --version 1 --params '{"threshold":0.2}'
python3 scripts/common.py commit --input clip.mp4 --step scenes --version 1 --params '{"threshold":0.2}' --result scenes.json
```

Schemas: `schemas/common.lookup.schema.json` and `schemas/common.result.schema.json`. See [cache.md](cache.md).
