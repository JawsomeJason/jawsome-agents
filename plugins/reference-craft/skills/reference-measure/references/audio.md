# Audio

## Extract once

`audio.py` extracts the recording's audio once into its cache folder as mono 44.1 kHz PCM WAV, and every later run reads that copy. By hand, a media CLI does the same in one command:

```sh
ffmpeg -i clip.mp4 -vn -ac 1 -ar 44100 -c:a pcm_s16le clip.wav
```

## Separate music from effects first

A music bed has onsets of its own, beats and note starts, and its level hides quiet effects. Separate before detecting onsets, in the best way available:

1. **A source-separation tool or library.** Split into music and effects stems, and detect onsets on the effects stem.
2. **Harmonic-percussive separation.** Interface effects are mostly percussive and music beds mostly harmonic. `audio.py --separate` splits the signal with a median-filter HPSS and detects onsets on the percussive part, while levels and pitch still come from the full mix.
3. **A high-pass filter.** Most beds carry their energy low in the spectrum and most taps, clicks and chimes sit high. Filter at about 1.5 kHz with any audio tool before detecting.
4. **Quiet stretches.** Measure effects where the bed is absent (a menu with music muted, a capture with music turned off), and the bed where no effect plays.

State which one you used in the method, because each misses different things.

## Onsets

`audio.py` detects onsets with spectral flux and peak picking (`--delta`, default 0.07; higher finds fewer) and drops onsets under `--min-peak-dbfs` (default −60). For each it reports the time, the peak level until the next onset, the decay to 30 dB under the peak, the loudest momentary loudness in the next 0.4 s, the spectral centroid over the first 93 ms and a rough pitch. The centroid and pitch tell a tap from a chime without listening.

## Align onsets to keyframes

```sh
python3 scripts/audio.py clip.mp4 --separate --align .reference-measure/clip-<sha12>/keyframes-v1-<params>/result.json
```

Each onset gets its nearest keyframe and the signed gap, and `within_frame` says whether the gap is under one frame at the keyframes' frame rate (or `--fps`). The median gap across all close matches is the capture's audio/video skew: screen recorders often write sound a frame or two early or late. Subtract the skew before reporting any single delay between a sound and its picture, and report the skew itself.

## Loudness

`audio.py` reads integrated loudness and loudness range from the media CLI's EBU R128 meter (K-weighting, 400 ms blocks, an absolute gate at −70 LUFS and a relative gate 10 LU below the mean), and keeps the momentary series for windows and per-onset loudness. Loudness of a capture depends on the device volume when it was recorded, so compare levels within one capture, never across captures, unless the capture is a direct digital export.

## Ducking

Ducking is how far the music drops under an effect or a voice. Name a window where the bed plays alone as the baseline and a window where it is ducked, and read the difference:

```sh
python3 scripts/audio.py clip.mp4 --window bed:3.0,5.0 --window ducked:6.2,6.8 --baseline bed
```

A window's loudness is the energy mean of the momentary loudness inside it, and each momentary value covers the 400 ms before it, so start a window 0.4 s after the change you mean to measure. Choose the ducked window between effects, so it holds only the lowered bed; otherwise the effect's own energy hides the dip. Report the ducking in dB, the attack (how long the drop takes) and the release (how long the return takes), reading both from the onset list or a level series.
