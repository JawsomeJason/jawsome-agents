# Video: keyframes, segments and regions

A screen recording is a sequence of states joined by transitions. Measure the states as screenshots and the transitions as motion; do both per segment, so one number never mixes two screens.

## 1. Probe the file

Record, per recording: displayed width and height after rotation, coded size, rotation, average frame rate, whether the frame rate is variable, duration, codec, and whether there is audio. A media CLI's probe command gives all of these (`ffprobe -show_streams -show_format -of json`). Rotation matters: a portrait phone capture is often stored landscape with a rotation flag, and every fraction you measure must be of the displayed frame.

Variable frame rate is normal for screen recordings: frames arrive only when the screen changes. Use each frame's own timestamp, never `index / fps`, and state the median frame interval as the error bar.

## 2. Detect scene changes

Scene detection scores the change between consecutive frames and keeps the frames above a threshold. Keep each keyframe's index, timestamp and score in a list shaped like `[{index, t_seconds, diff_score}]`; that list is the input to `contact-sheet.mjs` and `align.mjs`.

```sh
ffmpeg -i clip.mp4 -vf "select='eq(n\,0)+gt(scene\,0.2)',metadata=print:file=scenes.txt" -an -f null -
```

Start at a threshold near 0.2 with a minimum gap of about half a second. Fewer keyframes than screens means the threshold is too high; dozens per second means a transition or video content is playing. Without a media CLI, decode frames at a low resolution with any video library and compute the mean absolute difference of grey levels between consecutive frames; a jump of several times the median is a cut.

## 3. Measure per segment

A segment runs from one keyframe to the next. Measure its settled state from one frame near its end (the state is stable there), and its entrance transition from its start. Write the segment list down with a one-line description of each tile from the contact sheet.

## 4. Re-detect densely instead of looking harder

When a segment holds several states (a list that scrolls, a sheet that opens in stages), rerun detection on that sub-range with a lower threshold and no minimum gap, rather than opening more frames. Detection reads every frame and returns a list of numbers; viewing reads a few frames and returns impressions.

```sh
ffmpeg -ss 12.0 -to 14.5 -i clip.mp4 -vf "select='gt(scene\,0.05)',metadata=print:file=dense.txt" -an -f null -
```

## 5. Region differencing for motion

For one transition, crop a region of interest (as fractions of the displayed frame), shrink it to about 128 px on its long side, convert to grey, and read raw frames with their timestamps. Then per frame write one CSV row:

- `t`: the frame's timestamp.
- `diff`: mean absolute grey difference to the previous frame inside the region.
- `progress`: the projection of the frame's change onto the total change, `<f - f0, f1 - f0> / |f1 - f0|²`, where `f0` is the first frame and `f1` the last. It runs from 0 to 1 and passes 1 when the motion overshoots.

Pick the window so it starts and ends at rest. A position, scale or opacity series read any other way (a tracked centroid, a measured edge) works as `progress` too. Feed the CSV to `fit-motion.mjs`; [motion.md](motion.md) covers the fit.

```sh
ffmpeg -ss 12.0 -to 13.5 -i clip.mp4 -vf "crop=iw*0.8:ih*0.3:iw*0.1:ih*0.6,scale=128:-2,format=gray,showinfo" -f rawvideo -pix_fmt gray roi.raw
```

Read `pts_time` for each frame from the `showinfo` lines, and split `roi.raw` into frames of width × height bytes.

## Fallbacks

- No media CLI and no video library: ask the user to export the frames at given timestamps as PNG, and measure those as screenshots. Motion timing then needs the user's frame-accurate export, or it stays an estimate.
- A codec the decoder cannot read: transcode once to a common codec at a long side near 960 px, into the cache folder, and measure the copy. Note the transcode in the method, because it adds compression.
