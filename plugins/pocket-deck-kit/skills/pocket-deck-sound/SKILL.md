---
name: pocket-deck-sound
description: Sound design for a private, non-monetized replica of the original mobile pocket card game, covering what each moment of the original mobile card game sounds like (pack tear, card reveal, rare chime, coin flip, Energy attach, attacks, KO, turn and result cues, adaptive battle music), free properly-licensed sound libraries with candidate files per event, layering and synthesis recipes, and the Web Audio bus architecture, haptics and loudness rules. Use whenever the replica needs a sound, music bed, haptic, volume setting or audio-related fix, including picking a sample, deciding a licence question, or making audio feel laggy or quiet on phones.
---

# Pocket Deck sound

The original's audio is the half of its feel that screenshots never show. Four facts drive every choice here:

1. **The pack tear is the hero sound.** The developers tuned it against real packs, and nearly every review that mentions audio mentions it. Spend most of the sample budget there and make it follow the finger.
2. **Rarity has an audio tell, but a subtle one.** A quiet pop when the pack opens, then the reveal chime carries the moment together with the background colour change and glow. Keep the pop small and let the chime scale with rarity.
3. **Music stays out of the way.** The beds are lounge-styled, light and semi-jazzy, and the battle-end bed is mellow regardless of result. Sound effects sit on top, and music ducks under big moments.
4. **Battle music is adaptive.** Separate pieces play for setup, the main struggle, crunch time ahead and crunch time behind. Build stems, not one loop.

Never use the game's own audio files, because the replica must not carry the original's assets. Every sound is a free, properly licensed sample or something synthesized here.

## One audio context feeds three buses

One audio context, created on the first gesture. Master gain → gentle compressor → output, with three buses: `music` (ducked under big moments, crossfades stems), `sfx` (foley, impacts, chimes) and `ui` (taps, toggles and errors, never ducked). Each one-shot is a fresh buffer source → its own gain → a bus. Per-bus gain is `userVolume × duckFactor`, so ducking never clobbers a setting. [references/web-audio.md](references/web-audio.md) gives the details, the code and the iOS rules.

## Workflow for a new sound

1. Find the event in [references/catalogue.md](references/catalogue.md): its character, length, pitch register and haptic, with a confidence tag. Design to that target.
2. Pick samples from [assets/sound-sources.json](assets/sound-sources.json), CC0 first. Entries marked `verify` were named from memory of a pack's contents, so check them after download. Note the licence of anything that is not CC0 in a `CREDITS` file.
3. Layer and tune with the recipes in [references/layering.md](references/layering.md). When nothing fits, synthesize with the generators in [web-audio.md](references/web-audio.md) (UI pip, bell note, noise riser, sub thump, synthetic reverb).
4. Normalise offline, trim leading silence to zero, encode to OGG plus AAC, and add the entry to the manifest shaped like [assets/sound-manifest.json](assets/sound-manifest.json). An entry holds files (round-robin), layers with delays, gain, pitch variation, bus, duck profile and haptic pattern.
5. Check on a phone with the music playing. The sound sits on top of the bed without the bed vanishing, and taps feel instant because they fire on `pointerdown`.

## Rules that keep it feeling right

- **Vary anything repeated**, because one sample played twice in a row makes a UI sound cheap. Card slides, flips and hits get 3–8 takes, ±40–80 cents of pitch for foley (±20–30 for impacts, 0 for tonal chimes), ±1.5 dB of gain, and a voice cap. [web-audio.md](references/web-audio.md#3-variation-for-repeated-sounds)
- **Duck, don't mute**, so the bed stays under big moments without vanishing. Duck music to about −9 dB (×0.35) for the pack tear through the last reveal, the rare chime, the god-pack sting, KO and result jingles. Never duck for UI taps. [web-audio.md](references/web-audio.md#1-graph-and-buses)
- **The pause is the effect**, because the silence makes the chime land. Before a high-rarity flip, play the riser, then 150–250 ms of true silence with the music ducked, then the chime. [layering.md](references/layering.md)
- **Haptics are an enhancement**, because the vibration API exists on Android only. Fire haptics from the same gesture handler as the sound. [web-audio.md](references/web-audio.md#6-haptics) gives the pattern vocabulary and gating.
- **Respect the switch and the setting**, because players expect the app to honour the silent switch and their own settings. No music before a gesture. Persist separate Music, Sound Effects and UI sliders plus Mute and Haptics toggles. Under reduced motion, shorten stingers and skip the riser. [web-audio.md](references/web-audio.md#8-settings-and-accessibility)
- **Hit the loudness targets**, so manifest gains start near 0 dB and encoding doesn't clip. Music bed about −16 LUFS integrated, true peak ≤ −1 dBTP on every asset, UI pips quietest, god pack and victory loudest. [web-audio.md](references/web-audio.md#7-loudness-and-normalisation) gives the numbers per class.

## Before calling audio work done

- [ ] Every event in the manifest has a sound or a synth fallback, and plays within 20 ms of its gesture on a phone.
- [ ] Repeated sounds vary, with no two consecutive identical plays.
- [ ] Music ducks and recovers without clicks, and stems crossfade on the beat.
- [ ] All assets are CC0 or have their licence recorded, and none came from the game.
- [ ] Settings sliders, Mute, Haptics and reduced-motion shortening all work.
