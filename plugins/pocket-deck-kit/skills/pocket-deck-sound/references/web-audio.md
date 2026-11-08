# Web Audio implementation

The bus graph, adaptive stems, variation rules, synthesis fallbacks, loading and latency rules for phones, haptics, loudness targets and settings. Code is plain Web Audio with no library.

## Contents

1. Graph and buses
2. Adaptive battle music (stems)
3. Variation for repeated sounds
4. Synthesis fallbacks
5. Loading, latency and iOS Safari
6. Haptics
7. Loudness and normalisation
8. Settings and accessibility

## 1. Graph and buses

```
AudioContext (latencyHint: "interactive")
 └─ master GainNode ─► DynamicsCompressorNode (gentle: threshold -12 dB, ratio 3, knee 20, attack 0.003, release 0.15) ─► destination
     ├─ music GainNode   (ducked by big moments; crossfades adaptive stems)
     ├─ sfx GainNode     (card foley, impacts, chimes)
     └─ ui GainNode      (taps, toggles, errors; never ducked)
```

- One `AudioContext` for the app. Create it lazily on the first user gesture (see section 5).
- Each one-shot is a fresh `AudioBufferSourceNode → GainNode (per-shot) → bus`. Never reuse a source node.
- Keep a per-bus user volume (0–1) _and_ a per-bus runtime trim so ducking never clobbers the user's setting: `bus.gain = userVolume * duckFactor`.
- Use `setTargetAtTime` (not `linearRampToValueAtTime`) for ducking. It is click-free and holds up when calls overlap.

```js
// duck music under a big moment, then restore
function duckMusic(amount = 0.35, attack = 0.05, hold = 1.2, release = 0.6) {
  const t = ctx.currentTime;
  const g = buses.music.gain;
  g.cancelScheduledValues(t);
  g.setTargetAtTime(userVol.music * amount, t, attack / 3);
  g.setTargetAtTime(userVol.music, t + hold, release / 3);
}
```

Duck music to about -9 dB (×0.35) for the pack tear through the last card reveal, the rare chime, the god pack sting, a KO, and the victory or defeat jingle. Do not duck for UI taps.

## 2. Adaptive battle music (stems)

Export four loops at identical length, tempo and key: `setup`, `primary`, `crunch_ahead`, `crunch_behind`. Start all four at `t0` with gain 0 except the active one, so they stay sample-locked. Crossfade gains over 0.5–1 bar when the point state changes. Use `loopStart` and `loopEnd` with buffers decoded from WAV or OGG. MP3 adds encoder padding and drifts. Prefer OGG Vorbis, or AAC in CAF or M4A for Safari, or ship WAV for short loops.

## 3. Variation for repeated sounds

- **Round-robin**: 3–8 takes per event (card slide, flip, hit). Pick randomly, never the same as the last.
- **Pitch**: `source.playbackRate.value = 2 ** (cents / 1200)`, with cents drawn from ±40–80 for foley (slides, flips), ±20–30 for impacts and **0** for tonal chimes, whose pitch must stay in key.
- **Gain**: ±1.5 dB random (`gain = base * 10 ** (dB/20)`).
- **Timing**: 0–15 ms random offset on secondary layers so stacked layers don't phase identically.
- **Voice limiting**: cap each event at N simultaneous voices (card slides 4, UI taps 2). Steal the oldest. Add a 40 ms cooldown on UI taps so a double-fire plays once.

```js
function play(
  id,
  { bus = "sfx", gainDb = 0, cents = 0, when = 0, offset = 0, duration } = {},
) {
  const spec = manifest.events[id];
  const files = spec.files;
  const file = files[nextIndex(id, files.length)];
  const src = ctx.createBufferSource();
  src.buffer = buffers[file];
  const c =
    cents +
    (spec.pitchVarCents ? rnd(-spec.pitchVarCents, spec.pitchVarCents) : 0);
  src.playbackRate.value = 2 ** (c / 1200);
  const g = ctx.createGain();
  const db =
    (spec.gainDb ?? 0) +
    gainDb +
    (spec.gainVarDb ? rnd(-spec.gainVarDb, spec.gainVarDb) : 0);
  g.gain.value = 10 ** (db / 20);
  src.connect(g).connect(buses[spec.bus ?? bus]);
  src.start(ctx.currentTime + when, offset, duration);
  return src;
}
```

## 4. Synthesis fallbacks (when no sample fits)

**UI pip (menu tap)**

```js
function pip(freq = 1100, dur = 0.07, bus = buses.ui, gainDb = -14) {
  const t = ctx.currentTime,
    o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.85, t + dur); // slight droop = softer
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(10 ** (gainDb / 20), t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.02);
}
// back: pip(750, 0.08); toggle on: pip(900)+pip(1350, 0.06) 30 ms later; toggle off: reverse order; error: two 220 Hz triangle pips 90 ms apart
```

**Glassy bell note (for chimes and arpeggios).** Additive: fundamental + partials at 2.76×, 5.4× and 8.9× (bell-like, inharmonic), each with its own faster decay.

```js
function bell(freq, t, dur = 1.2, gainDb = -12, bus = buses.sfx) {
  const partials = [
    [1, 1.0, 1.0],
    [2.76, 0.5, 0.6],
    [5.4, 0.25, 0.35],
    [8.93, 0.12, 0.2],
  ]; // ratio, amp, decay-scale
  const out = ctx.createGain();
  out.gain.value = 10 ** (gainDb / 20);
  out.connect(bus);
  for (const [r, a, d] of partials) {
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq * r;
    g.gain.setValueAtTime(a, t);
    g.gain.setTargetAtTime(0, t + 0.01, (dur * d) / 4);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.1);
  }
}
// ★ chime: [C6, G6, C7].forEach((f, i) => bell(f, t + i*0.07));  C6≈1046.5 Hz, G6≈1568, C7≈2093
```

For a _glockenspiel_ (harmonic, brighter), use ratios [1, 2.0 (weak), 2.76, 5.4] and a shorter decay. Or sample VSCO 2 CE and pitch-shift it up to ±2 semitones with `playbackRate`. Anything further sounds fake.

**Whoosh or riser.** An `AudioBufferSourceNode` playing 1 s of white noise (generate once into a buffer) → `BiquadFilterNode` (bandpass, Q 1–2) with `frequency` ramped 300 → 3000 Hz → gain envelope with a 60 ms attack and 200 ms release. Add a `DelayNode` (12 ms, 20 % feedback) for "air".

**Synthetic reverb IR.** Fill a 1.0–1.5 s stereo buffer with white noise times `exp(-t/0.35)`, then set `ConvolverNode.buffer = ir`. Use a send `GainNode` per bus (about 0.2 for chimes, 0 for UI).

**Sine sub thump.** A 60 Hz sine, gain 0.5 → 0 over 90 ms with `exponentialRampToValueAtTime`. Add a pitch drop 90 → 50 Hz for weight.

## 5. Loading, latency and iOS Safari

- **Unlock on first gesture.** Browsers create the context `suspended` unless it is created inside a user gesture. Call `ctx.resume()` in the first `pointerdown`, `touchend` or `click` handler. On iOS, also play a 1-sample silent buffer in that handler (`ctx.createBufferSource()` with an empty buffer, `start(0)`). Safari needs an actual `start()` from a gesture before it trusts later scheduled playback.
- **Safari's `interrupted` state.** iOS Safari sets `ctx.state === 'interrupted'` after phone calls, Siri and backgrounding. Listen to `ctx.onstatechange` and `document.visibilitychange`. When the page is visible again and the state is not `running`, call `resume()` on the next gesture.
- **Ring and silent switch.** On iOS, the hardware silent switch mutes Web Audio output, because it runs in the "ambient" session category. A playing `<audio>` or `<video>` element is not muted. To play sounds while the switch is on silent, the way the native app behaves, loop a silent `<audio>` element after the first gesture so the page's session becomes "playback". A well-known small library uses this technique. Make it opt-in, because many users expect the switch to be honoured.
- **Preload and decode everything** at startup with `fetch` → `arrayBuffer` → `decodeAudioData`, and store the `AudioBuffer`s in a `Map`. Decoding on demand costs 10–60 ms and is what makes web UIs feel laggy. Total footprint for this project: about 150 sounds × 0.3 s × 48 kHz stereo float ≈ 17 MB RAM, which is acceptable.
- **Formats.** Ship OGG Vorbis for Chrome and Firefox and AAC (`.m4a`) for Safari (test `audio.canPlayType`), or short WAVs for anything under 0.3 s. Avoid MP3 for loops, because encoder padding breaks seamless loops.
- **Latency.** Use `new AudioContext({ latencyHint: 'interactive' })` and check `ctx.baseLatency` + `ctx.outputLatency`. Schedule with `start(ctx.currentTime + 0.005)` rather than `start()` for repeatable timing. Use `pointerdown` (not `click`) for taps so the sound fires about 100 ms earlier. Expect about 20–40 ms on Android Chrome and about 10–20 ms on iOS Safari with wired or built-in output. Bluetooth adds more, and the app can't reduce it.
- **Keep the context alive** during long idle screens. If `ctx.state` becomes `suspended` on Chrome Android after inactivity, resume on the next gesture, in the same handler as the unlock.

## 6. Haptics

- `navigator.vibrate(pattern)` works on **Android Chrome and Firefox** and requires sticky user activation. It is a no-op on **iOS Safari**, which has no Vibration API and nothing to polyfill. Design haptics as an enhancement.
- Pattern vocabulary (ms):
  - tick `[10]`
  - light `[18]`
  - medium `[35]`
  - strong `[60]`
  - rising `[20,40,30,40,45]` (rare reveal)
  - tear-continuous: call `vibrate([30, 20])` every 50 ms during the swipe, and `vibrate(0)` on release
  - god pack `[60,40,60,40,120]`
  - victory `[40,60,40,60,80]`
- Gate everything behind a user **Haptics** toggle that mirrors the original's setting. It defaults to on for Android and is hidden on platforms where `'vibrate' in navigator` is false.
- Fire haptics from the same gesture handler that plays the sound so they stay in sync.

## 7. Loudness and normalisation

- Work in WAV, normalise offline, then encode. Target the _mix_ at roughly **-16 LUFS integrated** for the music bed on phones. Mobile games are typically mixed at -14 to -18 LUFS, and the original clearly sits on the quieter, lounge side. Keep **true peak ≤ -1 dBTP** on every asset so AAC and OGG encoding doesn't clip.
- Per-asset short-term loudness targets, so the manifest gains start near 0 dB:

  | Class                                             | LUFS-S     |
  | ------------------------------------------------- | ---------- |
  | UI pips                                           | -24 to -20 |
  | Card foley                                        | -22 to -18 |
  | Impacts                                           | -16 to -12 |
  | Rare chime                                        | -14 to -12 |
  | God pack, victory (the loudest things in the app) | -12 to -10 |

- Command line (FFmpeg): `ffmpeg -i in.wav -af loudnorm=I=-18:TP=-1.5:LRA=7 -ar 48000 out.wav` for one-shots. For very short files loudnorm is unreliable, so use peak normalisation instead: `ffmpeg -i in.wav -af "volume=-1dB" ...` after trimming silence with `silenceremove`.
- Trim leading silence to zero (`silenceremove=start_periods=1:start_threshold=-50dB`), because listeners hear leading silence as latency.
- Keep the master compressor gentle. It is a safety net, not a mix tool.

## 8. Settings and accessibility

- Sliders: Music, Sound Effects and UI (0–100), plus Mute All and Haptics toggles. Persist them in `localStorage`. Apply them through `userVol.*` so the ducking math still works.
- `prefers-reduced-motion: reduce` → shorten long stingers (god pack, victory) to their first 600 ms, skip the "pause" riser, and lower haptics to a single tick. Offer an explicit "Reduce audio flourishes" toggle too.
- Never autoplay music before a gesture. Show a small "Tap to enable sound" affordance on first load.
- Expose each event's sound as a plain `<button>`-triggered path so screen-reader users get the same feedback. Don't tie sounds to `:hover`.
