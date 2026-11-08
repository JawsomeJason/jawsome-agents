# Token budget: what to look at

Image input is the largest cost in a measuring session, and it buys the least: a full-resolution frame costs as much as thousands of numbers and answers one question loosely. A number read from a file costs a few tokens, gives the same answer on every rerun, and can be diffed against the spec. So the default is to read numbers, and to look only to decide which numbers to read.

## The two allowed views

| View | Size | Use it to |
| --- | --- | --- |
| Contact sheet | one sheet per batch, long side at most 1200 px, tiles at least 120 px on the long side, each labelled `#index time` | learn what is on each screen or segment, and pick boxes and regions |
| Crop | one element, long side at most 400 px, never upscaled | settle a question the numbers leave open, such as which element a box caught or whether an edge is a shadow |

Never open a full-resolution frame. When a crop at 400 px is not enough, the question is a number: measure it.

## Planning a sheet

Run `contact-sheet.mjs` with the source size and the frame list. It picks the column count that gives the largest tiles on one sheet and splits the batch only when tiles would fall under the minimum. Its `viewed_fraction` is the share of full-frame pixels the plan shows; a typical batch of two dozen phone frames on one sheet is under 3%.

```sh
node scripts/contact-sheet.mjs --source 1170x2532 --frames keyframes.json --crop cta:0.1,0.8,0.8,0.08
```

Compose the sheet with whatever is at hand, at the plan's tile size and positions. With a media CLI that has a tile filter (for example `ffmpeg`), one command does it:

```sh
ffmpeg -i clip.mp4 -vf "select='eq(n\,0)+gt(scene\,0.2)',scale=158:-2,tile=6x4:padding=4" -frames:v 1 -fps_mode vfr sheet.jpg
```

Without one, any image library can paste resized frames onto a canvas. Without an image tool at all, skip the sheet: read the numbers each script prints and ask the user for the one or two screenshots that matter.

## Habits that keep the budget

- One sheet per batch, not one per question. Read it once, write down what each tile shows, and work from those notes.
- Ask a crop one question and write the answer down, so you never reopen it.
- Prefer a denser number over a larger image: rerun detection on a sub-range, add a box, shrink a region.
- Print summaries, not arrays. Every script here prints a few lines and leaves the full series in `result.json`; read only the field you need.
