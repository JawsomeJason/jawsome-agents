# Audio

## Extract once

Extract the recording's audio once into the cache folder as PCM WAV (mono or stereo, 44.1 or 48 kHz). A media CLI does it in one command; `audio.mjs` then reads the WAV directly.

```sh
ffmpeg -i clip.mp4 -vn -ac 1 -ar 48000 -c:a pcm_s16le clip.wav
```

## Separate music from effects first

A music bed has onsets of its own, beats and note starts, and its level hides quiet effects. Separate before detecting onsets, in the best way available:

1. **A source-separation tool or library.** Split into music and effects stems, and detect onsets on the effects stem. Harmonic-percussive separation of a spectrogram is a good stand-in: user-interface effects are mostly percussive.
2. **A high-pass filter.** Most beds carry their energy low in the spectrum and most taps, clicks and chimes sit high. `audio.mjs --onsets --highpass 1500` detects on the filtered signal.
3. **Quiet stretches.** Measure effects where the bed is absent (a menu with music muted, a capture with music turned off), and the bed where no effect plays.

State which one you used in the method, because each misses different things.

## Onsets

`audio.mjs --onsets` finds rises of at least `--rise` dB (default 9) over the 300 ms median of a 10 ms level envelope, above `--floor` dBFS (default −50), at least 80 ms apart. Each onset has its time to ±10 ms and the peak level in the 200 ms after it. A spectral-flux detector from an audio library is finer; either output works with `align.mjs`.

## Align onsets to keyframes

```sh
node scripts/align.mjs --onsets onsets.csv --keyframes keyframes.json --fps 60
```

Each onset gets its nearest keyframe and the signed gap. The median gap across all close matches is the capture's audio/video skew: screen recorders often write sound a frame or two early or late. Subtract the skew before reporting any single delay between a sound and its picture, and report the skew itself.

## Loudness

`audio.mjs` follows the BS.1770 loudness recipe: K-weighting, 400 ms blocks every 100 ms, an absolute gate at −70 LUFS and a relative gate 10 LU below the mean. It reports integrated loudness for the whole file and the loudest 400 ms block. Loudness of a capture depends on the device volume when it was recorded, so compare levels within one capture, never across captures, unless the capture is a direct digital export.

## Ducking

Ducking is how far the music drops under an effect or a voice. Name a window where the bed plays alone as the baseline and a window where it is ducked, and read the difference:

```sh
node scripts/audio.mjs --wav clip.wav --window bed:3.0,5.0 --window ducked:6.2,6.8 --baseline bed
```

Choose the ducked window between effects, so it holds only the lowered bed; otherwise the effect's own energy hides the dip. Report the ducking in dB, the attack (how long the drop takes) and the release (how long the return takes), reading both from the onset list or a level series.
