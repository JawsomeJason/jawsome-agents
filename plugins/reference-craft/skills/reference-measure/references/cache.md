# Idempotent outputs

## Layout

```text
.reference-measure/
  <input stem>-<sha256[:12] of the input bytes>/
    <step>-v<script version>-<sha256[:8] of the parameters>/
      result.json
  params/
    <step>-v<version>-<params hash>/result.json   # steps with no input file
```

Several input files (an image and its tokens file) hash together. Parameters hash with their keys sorted, so their order never matters. Renaming a file keeps its slot, because the key is the bytes.

## Rules

- **A rerun is a no-op.** When `result.json` exists for the same bytes, version and parameters, the script prints `[cached]` and its summary, and computes nothing.
- **`--force` recomputes** into the same slot.
- **New parameters get a new slot**, so measuring a second region or window never overwrites the first.
- **A new algorithm gets a new version.** Bump a script's version when its method changes; old folders stay as they were, so earlier reports still point at the numbers they cite.
- **`result.json` is written last and atomically** (to a temporary file, then renamed), so a run cut off halfway leaves no result and the next run starts over.

Every `result.json` is an envelope: `{step, version, inputs: [{path, sha12}], params, result}`. The schema is `schemas/cache.result.schema.json`.

## Steps you run by hand

A step done with a media CLI or a library, such as keyframe detection, uses the same cache through `cache.mjs`:

```sh
node scripts/cache.mjs lookup --input clip.mp4 --step keyframes --version 1 --params '{"threshold":0.2}'
# status "miss": run detection, write keyframes.json, then
node scripts/cache.mjs commit --input clip.mp4 --step keyframes --version 1 --params '{"threshold":0.2}' --result keyframes.json
```

`lookup` prints `{status, dir, file, key}` (schema `schemas/cache.lookup.schema.json`). Write any extra files the step makes (frames, sheets, a WAV) into `dir` before the commit, so they sit beside the result they belong to. Without Node, build the same path by hand from the hashes and write `result.json` last.

Keep the cache out of version control: it holds frames and audio from the captures.
