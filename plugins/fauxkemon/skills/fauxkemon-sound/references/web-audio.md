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
- Use `setTargetAtTime` (not `linearRampToValueAtTime`) for ducking — it is click-free and robust when calls overlap.

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

Duck music to ~-9 dB (×0.35) for: pack tear through last card reveal, rare chime, god pack sting, KO, victory/defeat jingle. Do not duck for UI taps.

## 2. Adaptive battle music (stems)

Export four loops at identical length, tempo and key: `setup`, `primary`, `crunch_ahead`, `crunch_behind`. Start all four at `t0` with gain 0 except the active one (they stay sample-locked), then crossfade gains over 0.5–1 bar when the point state changes. Use `loopStart/loopEnd` with buffers decoded from WAV/OGG (MP3 adds encoder padding and will drift; prefer OGG Vorbis or AAC in CAF/M4A for Safari, or ship WAV for short loops).

## 3. Variation for repeated sounds

- **Round-robin**: 3–8 takes per event (card slide, flip, hit). Pick randomly, never the same as the last.
- **Pitch**: `source.playbackRate.value = 2 ** (cents / 1200)` with cents drawn from ±40–80 for foley (slides, flips), ±20–30 for impacts, **0** for tonal chimes (pitch must stay in key).
- **Gain**: ±1.5 dB random (`gain = base * 10 ** (dB/20)`).
- **Timing**: 0–15 ms random offset on secondary layers so stacked layers don't phase identically.
- **Voice limiting**: cap each event at N simultaneous voices (card slides: 4; UI taps: 2). Steal the oldest. Add a 40 ms cooldown on UI taps so a double-fire plays once.

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

**Glassy bell note (for chimes/arpeggios)** — additive: fundamental + partials at 2.76×, 5.4×, 8.9× (bell-like, inharmonic), each with its own faster decay.

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

For a _glockenspiel_ (harmonic, brighter) use ratios [1, 2.0 (weak), 2.76, 5.4] and shorter decay; or just sample VSCO 2 CE and pitch-shift ±2 semitones with `playbackRate` (anything further sounds fake).

**Whoosh / riser** — `AudioBufferSourceNode` playing 1 s of white noise (generate once into a buffer) → `BiquadFilterNode` (bandpass, Q 1–2) with `frequency` ramped 300 → 3000 Hz → gain envelope with a 60 ms attack and 200 ms release. Add a `DelayNode` (12 ms, 20 % feedback) for "air".

**Synthetic reverb IR** — fill a 1.0–1.5 s stereo buffer with white noise times `exp(-t/0.35)`; `ConvolverNode.buffer = ir`. Use a send `GainNode` per bus (~0.2 for chimes, 0 for UI).

**Sine sub thump** — 60 Hz sine, gain 0.5 → 0 over 90 ms with `exponentialRampToValueAtTime`; add a pitch drop 90 → 50 Hz for weight.

## 5. Loading, latency and iOS Safari

- **Unlock on first gesture.** Browsers create the context `suspended` unless it is created inside a user gesture; call `ctx.resume()` in the first `pointerdown`/`touchend`/`click` handler. On iOS also play a 1-sample silent buffer in that handler (`ctx.createBufferSource()` with an empty buffer, `start(0)`) — Safari needs an actual `start()` from a gesture before later scheduled playback is trusted.
- **Safari's `interrupted` state.** iOS Safari sets `ctx.state === 'interrupted'` after phone calls/Siri/backgrounding. Listen to `ctx.onstatechange` and `document.visibilitychange`; on return to visible, if state is not `running`, call `resume()` on the next gesture.
- **Ring/silent switch.** Web Audio output on iOS is muted by the hardware silent switch (it runs in the "ambient" session category), whereas a playing `<audio>`/`<video>` element is not. If you want sounds while the switch is on silent — the way the native app behaves — the known workaround is to loop a silent `<audio>` element after the first gesture so the page's session becomes "playback" (the technique a well-known small library uses). Make this opt-in; many users expect the switch to be honoured.
- **Preload and decode everything** at startup with `fetch` → `arrayBuffer` → `decodeAudioData`, store `AudioBuffer`s in a `Map`. Decoding on demand costs 10–60 ms and is what makes web UIs feel laggy. Total footprint for this project: ~150 sounds × 0.3 s × 48 kHz stereo float ≈ 17 MB RAM — fine.
- **Formats.** Ship OGG Vorbis for Chrome/Firefox and AAC (`.m4a`) for Safari (test `audio.canPlayType`), or short WAVs for anything under 0.3 s. Avoid MP3 for loops (encoder padding breaks seamless loops).
- **Latency.** Use `new AudioContext({ latencyHint: 'interactive' })` and check `ctx.baseLatency` + `ctx.outputLatency`. Schedule with `start(ctx.currentTime + 0.005)` rather than `start()` for repeatable timing. Use `pointerdown` (not `click`) for taps so the sound fires ~100 ms earlier. Expect ~20–40 ms on Android Chrome, ~10–20 ms on iOS Safari with wired/built-in output, more over Bluetooth (nothing you can do about that).
- **Keep the context alive** during long idle screens: if `ctx.state` becomes `suspended` on Chrome Android after inactivity, resume on the next gesture (same handler as unlock).

## 6. Haptics

- `navigator.vibrate(pattern)` works on **Android Chrome/Firefox**, requires sticky user activation, and is a no-op on **iOS Safari** (no Vibration API; nothing to polyfill). Design haptics as an enhancement.
- Pattern vocabulary (ms): tick `[10]`; light `[18]`; medium `[35]`; strong `[60]`; rising `[20,40,30,40,45]` (rare reveal); tear-continuous: call `vibrate([30, 20])` every 50 ms during the swipe, `vibrate(0)` on release; god pack `[60,40,60,40,120]`; victory `[40,60,40,60,80]`.
- Gate everything behind a user **Haptics** toggle (mirror the original's setting) that defaults to on for Android, hidden on platforms where `'vibrate' in navigator` is false.
- Fire haptics from the same gesture handler that plays the sound so they stay in sync.

## 7. Loudness and normalisation

- Work in WAV, normalise offline, then encode. Target the _mix_ at roughly **-16 LUFS integrated** for the music bed on phones (mobile games are typically mixed -14 to -18 LUFS; the original clearly sits on the quieter, lounge side), **true peak ≤ -1 dBTP** on every asset so AAC/OGG encoding doesn't clip.
- Per-asset short-term loudness targets so the manifest gains start near 0 dB: UI pips -24 to -20 LUFS-S; card foley -22 to -18; impacts -16 to -12; rare chime -14 to -12; god pack / victory -12 to -10 (these are the loudest things in the app).
- Command line (FFmpeg): `ffmpeg -i in.wav -af loudnorm=I=-18:TP=-1.5:LRA=7 -ar 48000 out.wav` for one-shots; for very short files loudnorm is unreliable — use peak normalisation instead: `ffmpeg -i in.wav -af "volume=-1dB" ...` after trimming silence with `silenceremove`.
- Trim leading silence to zero (`silenceremove=start_periods=1:start_threshold=-50dB`) — leading silence is perceived as latency.
- Keep the master compressor gentle; it's a safety net, not a mix tool.

## 8. Settings and accessibility

- Sliders: Music, Sound Effects, UI (0–100), plus Mute All, Haptics; persist in `localStorage`; apply via `userVol.*` so ducking math still works.
- `prefers-reduced-motion: reduce` → shorten long stingers (god pack, victory) to their first 600 ms, skip the "pause" riser, and lower haptics to a single tick. Offer an explicit "Reduce audio flourishes" toggle too.
- Never autoplay music before a gesture; show a small "Tap to enable sound" affordance on first load.
- Expose each event's sound as a plain `<button>`-triggered path so screen-reader users get the same feedback; don't tie sounds to `:hover`.
