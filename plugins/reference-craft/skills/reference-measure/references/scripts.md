# Scripts

All scripts are standard-library Node.js (18 or later) with no install step. Run them by path from the skill folder. Each one:

- takes `--out <root>` (default `.reference-measure`) and `--force`, and caches as [cache.md](cache.md) describes;
- prints a few summary lines, warnings marked `!`, and `result: <path>` last;
- exits 0 on success and 2 with one line on stderr for a usage error, such as a missing file or a malformed box;
- writes `result.json` following the schema in `schemas/` named after the script.

When a script cannot run, write the same `result.json` by hand from the schema, so the next step reads it the same way.

## contact-sheet.mjs

```sh
node scripts/contact-sheet.mjs --source 1080x1920 --frames keyframes.json [--sheet-long 1200] [--min-tile 120] [--crop name:x,y,w,h ...] [--crop-long 400]
node scripts/contact-sheet.mjs --source 1080x1920 --count 24 --duration 60
```

Frames come from a keyframe list, `--times t1,t2,...`, or `--count` evenly spaced over `--duration`. Output: `sheets[]` with tile size, columns, rows and each tile's position and label, `crops[]` with the source rectangle and output size, and `viewed_fraction`. Schema: `schemas/contact-sheet.schema.json`.

## colors.mjs

```sh
node scripts/colors.mjs --tokens tokens.json --image shot.png --box cta:0.14,0.51,0.72,0.04 [--grid 4x8] [--theme dark] [--match 3]
node scripts/colors.mjs --tokens tokens.json --samples samples.json
```

Output per colour: `hex`, `rgb`, `rect_px`, `pixel_count`, `spread`, `warnings`, `token`, `token_hex`, `delta_e`, `runner_up`, `verdict`, `tag`, `method`. Schema: `schemas/colors.schema.json`. See [color.md](color.md).

## layout.mjs

```sh
node scripts/layout.mjs --spec layout.json [--design-width 390] [--grid 4]
```

Output: `captures[]` with `pt_per_px`, `scale_vs_first` and `aspect`; `boxes[]` in % and pt with snapped sizes and `error_pt`; `lengths[]`; `warnings`. Schema: `schemas/layout.schema.json`. See [layout.md](layout.md).

## fit-motion.mjs

```sh
node scripts/fit-motion.mjs --csv motion.csv [--fps 60]
```

Output: `fps`, `frame_ms`, `onset_s`, `settle_s`, `duration_ms`, `duration_error_ms`, `fits[]` best first, `best_fit`, `overshoot_pct`, `fit_samples`, tags, methods and `warnings`. Schema: `schemas/fit-motion.schema.json`. See [motion.md](motion.md).

## audio.mjs

```sh
node scripts/audio.mjs --wav clip.wav [--window name:start,end ...] [--baseline name] [--onsets] [--highpass 1500] [--rise 9] [--floor -50]
```

Reads 16, 24 or 32-bit integer or 32 or 64-bit float PCM WAV. Output: `integrated_lufs`, `momentary_max`, `windows[]` with `lufs` and `ducking_db`, and with `--onsets`, `onsets[]` with time and peak. Schema: `schemas/audio.schema.json`. See [audio.md](audio.md).

## align.mjs

```sh
node scripts/align.mjs --onsets onsets.json --keyframes keyframes.json --fps 60 [--tolerance-frames 1]
```

Onsets may be a JSON array of seconds, objects with `t` or `t_seconds`, `{onsets: [...]}`, an `audio.mjs` `result.json`, or a CSV with a `t` column. Output: `matches[]`, `matched`, `median_offset_ms`. Schema: `schemas/align.schema.json`.

## cache.mjs

```sh
node scripts/cache.mjs lookup --input clip.mp4 --step keyframes --version 1 --params '{"threshold":0.2}'
node scripts/cache.mjs commit --input clip.mp4 --step keyframes --version 1 --params '{"threshold":0.2}' --result keyframes.json
```

Schemas: `schemas/cache.lookup.schema.json` and `schemas/cache.result.schema.json`. See [cache.md](cache.md).
