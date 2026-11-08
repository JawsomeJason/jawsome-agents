---
name: fauxkemon-sound
description: Sound design for the Fauxkemon replica — what each moment of the original mobile card game sounds like (pack tear, card reveal, rare chime, coin flip, Energy attach, attacks, KO, turn and result cues, adaptive battle music), free properly-licensed sound libraries with candidate files per event, layering and synthesis recipes, and the Web Audio bus architecture, haptics and loudness rules. Use whenever the replica needs a sound, music bed, haptic, volume setting or audio-related fix, including picking a sample, deciding a licence question, or making audio feel laggy or quiet on phones.
---

# Fauxkemon sound

The original's audio is the half of its feel that screenshots never show. Four facts drive every choice here:

1. **The pack tear is the hero sound.** The developers tuned it against real packs, and nearly every review that mentions audio mentions it. Spend most of the sample budget there and make it follow the finger.
2. **Rarity has an audio tell, but a subtle one.** A quiet pop when the pack opens, then the reveal chime carries the moment together with the background colour change and glow. Keep the pop small and let the chime scale with rarity.
3. **Music stays out of the way.** Lounge-styled, light, semi-jazzy beds; a mellow battle-end bed regardless of result. Sound effects sit on top, and music ducks under big moments.
4. **Battle music is adaptive.** Separate pieces for setup, the main struggle, crunch time ahead, crunch time behind. Build stems, not one loop.

Never use the game's own audio files. Every sound is a free, properly licensed sample or something synthesized here.

## Architecture in one picture

One audio context, created on the first gesture. Master gain → gentle compressor → output, with three buses: `music` (ducked under big moments, crossfades stems), `sfx` (foley, impacts, chimes), `ui` (taps, toggles, errors; never ducked). Each one-shot is a fresh buffer source → its own gain → a bus. Per-bus gain is `userVolume × duckFactor`, so ducking never clobbers a setting. Details, code and the iOS rules: [references/web-audio.md](references/web-audio.md).

## Workflow for a new sound

1. Find the event in [references/catalogue.md](references/catalogue.md): its character, length, pitch register and haptic, with a confidence tag. Design to that target.
2. Pick samples from [assets/sound-sources.json](assets/sound-sources.json), CC0 first. Entries marked `verify` were named from memory of a pack's contents; check them after download. Note the licence of anything that is not CC0 in a `CREDITS` file.
3. Layer and tune with the recipes in [references/layering.md](references/layering.md). When nothing fits, synthesize with the generators in `web-audio.md` (UI pip, bell note, noise riser, sub thump, synthetic reverb).
4. Normalise offline, trim leading silence to zero, encode to OGG plus AAC, and add the entry to the manifest shaped like [assets/sound-manifest.json](assets/sound-manifest.json): files (round-robin), layers with delays, gain, pitch variation, bus, duck profile, haptic pattern.
5. Check on a phone with the music playing: the sound should sit on top of the bed without the bed vanishing, and taps should feel instant (fire on `pointerdown`).

## Rules that keep it feeling right

- **Variation on anything repeated.** Card slides, flips and hits get 3–8 takes, ±40–80 cents of pitch for foley (±20–30 for impacts, 0 for tonal chimes), ±1.5 dB of gain, and a voice cap. A single sample played twice in a row is what makes a UI sound cheap.
- **Duck, don't mute.** Music to about −9 dB (×0.35) for the pack tear through the last reveal, the rare chime, the god-pack sting, KO and result jingles. Never duck for UI taps.
- **The pause is the effect.** Before a high-rarity flip: riser, then 150–250 ms of true silence with the music ducked, then the chime.
- **Haptics are an enhancement.** The vibration API exists on Android only; pattern vocabulary and gating are in `web-audio.md`. Fire haptics from the same gesture handler as the sound.
- **Respect the switch and the setting.** No music before a gesture; separate Music, Sound Effects and UI sliders plus Mute and Haptics toggles, persisted; under reduced motion, shorten stingers and skip the riser.
- **Loudness targets.** Music bed about −16 LUFS integrated; true peak ≤ −1 dBTP on every asset; UI pips quietest, god pack and victory loudest. Numbers per class in `web-audio.md`.

## Before calling audio work done

- [ ] Every event in the manifest has a sound or a synth fallback, and plays within 20 ms of its gesture on a phone.
- [ ] Repeated sounds vary; no two consecutive identical plays.
- [ ] Music ducks and recovers without clicks; stems crossfade on the beat.
- [ ] All assets are CC0 or have their licence recorded; none came from the game.
- [ ] Settings sliders, Mute, Haptics and reduced-motion shortening all work.
