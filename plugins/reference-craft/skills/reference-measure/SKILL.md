---
name: reference-measure
description: Measures a reference UI from screenshots and screen recordings, including sound timing, as reproducible numbers while spending few image tokens. Colours become nearest design tokens with a CIEDE2000 distance, boxes become % of the frame and points at a design width, motion becomes onset, duration, easing or spring with an error bar, and audio becomes onsets, loudness and ducking. Every value carries its method and a measured or estimate tag, and outputs are cached by input hash so reruns cost nothing. Use when matching a build to captures of an existing product, pulling tokens, spacing, durations, easings or sound cues out of a screenshot or video, checking a spec against a reference, or whenever you are about to open many full-resolution frames to eyeball a detail.
license: MIT
compatibility: The optional scripts need Node.js 18 or later and nothing else. Decoding video or compressed audio needs a media CLI or an image or audio library; every step names a fallback.
---

# Reference measure

A reference capture answers questions only when its answers are numbers. "The button looks about 48 tall and fairly rounded" cannot be checked, diffed or reproduced; `h 48.0 pt ±0.3, radius 12.0 pt, fill #f2c94c → gold-400 ΔE 0.8` can. This skill turns screenshots and screen recordings into such numbers, and it looks at as few pixels as it can, because pixels are what a measuring session spends.

## Core principles

- **Work in numbers; look at pixels last.** Image input dominates the cost of a measuring session, and a number read from a file is reproducible where a glance is not. Open images only as one low-resolution contact sheet per batch and as small crops at most 400 px on the long side, never as full-resolution frames. See [references/token-budget.md](references/token-budget.md).
- **Segment video before measuring it.** Scene and keyframe detection splits a recording into segments, and each segment gets measured on its own. When a segment needs more detail, rerun detection densely on that sub-range instead of viewing more frames, because detection reads every frame for the price of a list of numbers. See [references/video.md](references/video.md).
- **Never trust a single pixel.** Take the median of a small box inside a flat area, match it to the nearest design token by CIEDE2000 and report the ΔE, because compression, chroma subsampling, dithering and anti-aliasing move single pixels and leave a median alone. See [references/color.md](references/color.md).
- **State the frame, the design width and the capture scale.** Report positions and sizes as % of the frame and in points at a stated design width, and note when captures differ in scale or aspect, because a pixel value means nothing without its capture. See [references/layout.md](references/layout.md).
- **Time motion from the change, not from a look.** Difference a region of interest frame by frame to find onset and settle, fit the normalized progress to candidate easings and a damped spring, and report overshoot, residual and sample count. The frame rate sets the error bar at one frame, so say it. See [references/motion.md](references/motion.md).
- **Separate music from effects before finding onsets.** A music bed triggers onsets of its own and hides quiet effects. Align each onset to its keyframe, report integrated loudness, and give ducking in dB against a baseline window. See [references/audio.md](references/audio.md).
- **Tag every value.** Each number is `measured` or `estimate` and names its method, and a difference from the current spec is proposed as a delta, never applied silently, because a reader must be able to tell a reading from a guess and accept or reject each change. See [references/provenance.md](references/provenance.md).
- **Make every step idempotent.** Outputs are keyed by input hash, script version and parameters, so a rerun is a no-op and `--force` recomputes. A crashed or repeated session then costs nothing and never mixes results from two runs. See [references/cache.md](references/cache.md).
- **One worktree per parallel agent.** When several agents measure or write in one repo, each works in its own worktree, because in a shared checkout one agent's branch switch landed another agent's commits on the wrong pull request. See [references/parallel-work.md](references/parallel-work.md).
- **Captures are for measuring only.** Reference captures of a third-party product, and every frame, crop or sheet derived from them, stay out of what ships and out of version control, because they are someone else's work. Ship the numbers. See [references/parallel-work.md](references/parallel-work.md).

## Workflow

1. **Inventory.** List every capture with its pixel size, and for video its frame rate, duration, rotation and whether it has audio. Pick the design width the spec uses. Note captures that differ in scale.
2. **Plan the views.** Run `contact-sheet.mjs` for the batch and look at the one sheet it plans, to learn what is where. Name the questions each screen or segment must answer.
3. **Segment video.** Detect scene changes into a keyframe list and measure per segment. Rerun detection densely on a sub-range when one segment hides several states.
4. **Measure.** Colours with `colors.mjs`, boxes and lengths with `layout.mjs`, motion with a per-frame CSV into `fit-motion.mjs`, sound with `audio.mjs` and `align.mjs`. Open a small crop only for what the numbers cannot settle, such as which element a box caught.
5. **Compare.** Set each value beside the spec value, with its tag, method and error bar, and list the deltas.
6. **Report.** Hand back the deltas for approval in the shape [references/provenance.md](references/provenance.md) gives. Change the spec only for the deltas the reader accepts.

## Scripts

Every script reads plain files, writes `result.json` into its cache folder, prints a few summary lines and the result path, and exits 2 with one line on a usage error. Each output follows a schema in `references/schemas/`, so when a script fails or cannot run, write the same file by hand. Run any script with `--help`. Details and examples: [references/scripts.md](references/scripts.md).

| Script | Reads | Gives |
| --- | --- | --- |
| `contact-sheet.mjs` | frame times and the source size | one sheet plan per batch, crop rectangles, the share of pixels viewed |
| `colors.mjs` | a PNG and boxes, or pixel samples; a tokens file | box medians, nearest token, ΔE, runner-up, spread warnings |
| `layout.mjs` | captures and pixel boxes or lengths | % of frame, points at the design width, capture scales |
| `fit-motion.mjs` | a CSV of per-frame progress or difference | onset, settle, duration ± one frame, ranked easing and spring fits, overshoot |
| `audio.mjs` | a PCM WAV | integrated and momentary loudness, window loudness, ducking, onsets |
| `align.mjs` | onset times and keyframes | nearest keyframe per onset, the capture's audio/video skew |
| `cache.mjs` | inputs, a step name, version and params | the cache slot for a step run by hand, and a commit into it |

The scripts use no media decoder. Frame extraction, scene detection, region differencing and audio extraction take a media CLI or an image or audio library, called as an optional capability; each reference file gives the procedure and a fallback when neither exists.

## Hygiene

- Keep the cache folder (`.reference-measure/` by default) out of version control; commit the numbers you accept into the spec instead.
- Strip names, product names and account details from anything you write about a capture, because a measurement is about the design, not about whose screen it came from.
