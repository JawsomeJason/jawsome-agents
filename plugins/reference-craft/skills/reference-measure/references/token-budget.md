# Token budget: what to look at

Image input is the largest cost in a measuring session, and it buys the least: a full-resolution frame costs as much as thousands of numbers and answers one question loosely. A number read from a file costs a few tokens, gives the same answer on every rerun, and can be diffed against the spec. So the default is to read numbers, and to look only to decide which numbers to read.

## The two allowed views

| View | Size | Use it to |
| --- | --- | --- |
| Contact sheet | one sheet per batch, long side at most 1200 px, tiles at least 120 px on the long side, each labelled `#index time` | learn what is on each screen or segment, and pick boxes and regions |
| Crop | one element, long side at most 400 px, never upscaled | settle a question the numbers leave open, such as which element a box caught or whether an edge is a shadow |

Never open a full-resolution frame. When a crop at 400 px is not enough, the question is a number: measure it.

## Making the sheet

`keyframes.py --sheet` writes the sheet for a recording's keyframes. It picks the column count that gives the largest tiles on one sheet within the long-side cap, and splits the batch evenly only when tiles would fall under the minimum; `sheets.json` lists each sheet with its tile size. Two dozen phone frames fit one 1200 px sheet with tiles near 160 px wide, a few percent of the pixels of the frames themselves.

```sh
python3 scripts/keyframes.py clip.mp4 --sheet --sheet-long 1200 --min-tile 120
```

For screenshots, or without the scripts, compose a sheet with whatever is at hand. A media CLI with a tile filter does it in one command:

```sh
ffmpeg -i clip.mp4 -vf "select='eq(n\,0)+gt(scene\,0.2)',scale=158:-2,tile=6x4:padding=4" -frames:v 1 -fps_mode vfr sheet.jpg
```

Any image library can paste resized frames onto a canvas instead. Without an image tool at all, skip the sheet: read the numbers each script prints and ask the user for the one or two screenshots that matter. Crops come from `colors.py --crops` and `layout.py --crops`, already capped at 400 px.

## Habits that keep the budget

- One sheet per batch, not one per question. Read it once, write down what each tile shows, and work from those notes.
- Ask a crop one question and write the answer down, so you never reopen it.
- Prefer a denser number over a larger image: rerun detection on a sub-range, add a box, shrink a region.
- Print summaries, not arrays. Every script here prints a few lines and leaves the full series in `result.json`; read only the field you need.
