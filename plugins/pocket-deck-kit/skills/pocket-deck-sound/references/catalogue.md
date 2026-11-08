# Sound catalogue

What the original sounds like, as far as public reviews and guides describe it, and the design target for each cue. Confidence tags:

- **[D]**: documented in a public source.
- **[C]**: a design target written from documented facts plus genre convention, to verify by ear against the app with Haptics on.
- **[?]**: no public source, an informed guess.

No public text source gives exact tempos, keys, durations or per-effect descriptions, so every [C] value is a starting point.

## Contents

1. Music by screen
2. Sound-effect catalogue
3. Design principles

## 1. Music by screen

| Screen | Documented [D] | Design target for the replica [C] |
| --- | --- | --- |
| Splash or title | "Lounge-styled intro piece" (fan blog), "smooth, warm, semi-jazzy" with clear chord-based writing (remix community). | Mid-tempo (~88–96 BPM feel), electric-piano or soft-synth keys, brushed or soft drums, warm bass, major-key with jazzy extensions (maj7, 9ths). Loop 60–90 s. |
| Home or main (packs) | Lounge-styled piece (fan blog). "Light and fun" (review). | Slightly brighter than title. Relaxed groove, glockenspiel or bell countermelody. Nothing in the 2–4 kHz band that fights UI blips. |
| Collection or card display | A different lounge piece from main (fan blog). | Sparser, more ambient: pads + soft keys, slower harmonic rhythm. |
| Pack select (expansion → pack carousel) | "Ambient pieces" that the blogger suspects hint at the pack (fan blog). | Low-density bed: pad, light percussion, suspense but calm. Music should leave headroom. This is the screen where SFX carry the moment. |
| After opening (results) | "Lively, mildly celebratory" (fan blog). | Up-tempo (~120 BPM feel), bright keys, light brass or synth stabs, short loop. |
| Free pick | "Lively pieces" (fan blog). | Playful, bouncy, slightly mischievous (minor-to-major turns). Marimba and pizzicato colours. |
| Battle venue select and battle | "Liveliest music in the game", with setup, primary, crunch-ahead and crunch-behind variants (fan blog). | Four stems in the same key and tempo so they crossfade on the beat. Crunch variants add drive (busier hats, extra synth layer). "Behind" adds tension (minor colour, rising ostinato), "ahead" adds brightness. |
| Battle end | Mellow piece regardless of win or loss (fan blog). | Short warm cadence loop. The win or loss _jingle_ carries the result, not the bed. |

## 2. Sound-effect catalogue

Durations and pitch characters are **design targets** [C] unless marked [D]. "Haptic" describes what the replica does on Android. iOS Safari has no vibration API (see web-audio.md).

| # | Event | Character (timbre) | Approx. length | Pitch or register | Haptic (replica) | Conf. |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Pack carousel swipe or select | Soft foil-wrapper rustle + a short low airy whoosh. One "tick" when the carousel snaps | 150–300 ms | Noise-based, HF rustle 4–8 kHz, body ~200 Hz | Light tick on snap (10 ms) | [C] |
| 2 | Pack tap (zoom in) | Clean, soft UI pop with a tiny foil crinkle under it | 80–120 ms | ~800 Hz–1.2 kHz pop | None | [C] |
| 3 | Pack cut or tear (swipe across top) | Real-pack rip: a foil or paper tear that follows the finger, with a fast "zip" texture and air whoosh. Ends with a tiny release crinkle | 350–600 ms, tracks the swipe | Broadband noise, emphasis 2–6 kHz. The tear "zip" has rising pitch as speed increases | Medium continuous buzz while swiping (for example 30–40 ms pulses), short strong pulse at completion | [D] (tear recorded from real packs, "pleasing tearing", "riiiiip") + [C] |
| 4 | Pack "pop" on open (rare tell) | A short crack or pop at the instant the pack opens. Subtle, and hard to notice when muted | ~60–120 ms | Transient, ~1–3 kHz | One sharp pulse | [D] (guide site) |
| 5 | Card slides out of pack | Soft paper-on-paper slide with a high airy swish. Slightly longer than a deal | 250–400 ms | Noise, HF 3–7 kHz, low-level body | Light tick at end of slide | [C] |
| 6 | Card flip or reveal (standard) | Card-stock flick: a short "fwip" with a dull body thump when it lands face-up. Cards reveal one by one | 120–220 ms | Noise transient + ~150–250 Hz body | Light tick | [D] (one-by-one reveal) + [C] |
| 7 | Rare-card reveal chime | On ★, ★★, EX and other rare tiers: a glassy ascending arpeggio or shimmer (bell, glockenspiel or celesta character) layered on the flip. Brighter and longer the higher the rarity. The background colour shifts and a glow appears | 500–900 ms (★), 1–1.5 s (★★ and ★★★), longer for Crown | Major arpeggio in a high register (C6–C7 region), sparkly tail | Two or three rising pulses (for example 20, 40, 60 ms) | [D] (special sounds signal rares, background changes) + [C] |
| 8 | The "pause" build-up | Before a high-rarity card flips, the reveal hesitates: a rising riser or shimmer swell with a slight sub bed, then silence for a beat, then the chime hits | Riser 600–900 ms, gap 150–250 ms | Rising filtered noise + pitch sweep, resolves to the chime's root | Single long soft buzz during riser, then strong pulse on reveal | [C] |
| 9 | God pack sting | Everything-rare pack: a bigger, longer fanfare-shimmer with a low impact and long sparkle tail. Reads as "jackpot" without casino kitsch | 1.5–2.5 s | Full-range: sub thump + mid brass or synth + HF sparkle | Long pattern (for example 60, 40, 60, 40, 120 ms) | [?] |
| 10 | Card tap or zoom (collection) | Soft pop + tiny card-stock flick. Immersive cards get their own cue | 80–150 ms | ~1 kHz pop | None | [D] (immersive cards have unique audio) + [C] |
| 11 | Menu tap or confirm | Short, rounded "pip", not a hard click. Low-passed so it never pokes out of the mix | 40–90 ms | 900 Hz–1.5 kHz, slight downward pitch | None | [C] |
| 12 | Back or cancel | Same family as #11 but lower and slightly descending | 50–100 ms | ~600–800 Hz, falling | None | [C] |
| 13 | Toggle or switch | Two-tone flick: up for on, down for off | 60–100 ms | Two sine-ish partials a 4th or 5th apart | None | [C] |
| 14 | Error or invalid move | Soft double "buh-buh" or a dull low tone. The game also shows an immediate text prompt for invalid moves | 150–300 ms | ~200–300 Hz, slightly detuned | One short pulse | [D] (immediate feedback prompt) + [C] |
| 15 | Coin flip: spin | Metallic flick, then a whirring, wobbling spin that slows (classic coin-on-table wobble but cleaner, more "designed") | 800–1200 ms | Metallic 2–5 kHz ring, wobble rate decelerating | Light pulses matching wobble, decelerating | [C] |
| 16 | Coin lands: heads or tails | Heads: bright clink + short positive chime. Tails: duller clink + lower, flatter tone | 200–400 ms | Heads ~2 kHz metallic + major 3rd. Tails ~1 kHz + minor or flat | Pulse on landing (heads stronger) | [C] |
| 17 | Energy generated (Energy Zone) | Soft shimmer or sparkle "ping", type-coloured. A small magical pop | 200–350 ms | ~1.5–3 kHz with sparkle tail | None | [C] |
| 18 | Energy attached | Snap or click with a little tonal "tink" that confirms attachment | 120–200 ms | Click + ~1 kHz tone | Light tick | [C] |
| 19 | Card draw (from deck) | Fast card slide + light fwip | 150–250 ms | HF paper noise | None | [C] |
| 20 | Play to Bench or Active | Card lands on mat: soft thud + card-stock slap, and a small confirm "tick" | 150–250 ms | Thud ~150 Hz + slap transient | Light tick | [C] |
| 21 | Evolve | Rising magical swell → bright "bloom" chime when the new card appears | 700–1100 ms | Rising sweep resolving on a high major chord | Medium pulse on bloom | [C] |
| 22 | Retreat | Quick swoosh (card leaving) + soft landing thud (swap) | 300–450 ms | Whoosh mid-band, thud low | None | [C] |
| 23 | Attack selected or confirmed | Punchy UI confirm with a slight "arming" edge (short sweep up) | 150–250 ms | ~1 kHz up-sweep | Light tick | [C] |
| 24 | Attack impact variants | Type-flavoured hits. Fire: whoosh-burst + crackle. Water: splash + low thump. Lightning: zap-crack. Grass: leafy whip + thud. Psychic: airy warble + soft impact. Fighting: heavy punch thud. Darkness: low rumbling hit. Metal: clang. Colorless: generic punch or thud. All share one low "body" impact for consistency. Damage SFX are a documented source of satisfaction | 300–600 ms | Body thump 60–120 Hz + type layer | Strong single pulse (scale by damage) | [D] (satisfying damage SE) + [C] |
| 25 | Special Condition applied | Poison: bubbly gurgle-pop. Burn: crackle hiss. Sleep: soft descending "zzz" tone. Paralysis: short electric buzz. Confusion: wobbly detuned warble | 300–600 ms | Per condition | None | [C] |
| 26 | Damage counter placed or HP change | Quick tick-tick counter roll with a small final "thunk" | 150–300 ms | Clicks + ~300 Hz final | None | [C] |
| 27 | Knock Out | Heavier impact + short descending tone or whoosh as the card dims and leaves | 600–900 ms | Low impact + falling pitch | Strong pulse then short second pulse | [C] |
| 28 | Point awarded | Bright, short positive chime (two or three rising notes), clearly distinct from the rare-card chime | 300–500 ms | High major (for example G5–C6–E6) | Two pulses | [C] |
| 29 | Turn change | Soft, neutral chime or whoosh. "Your turn" is slightly brighter than "opponent's turn" | 400–600 ms | Mid-high, gentle | Light pulse on your turn only | [C] |
| 30 | Timer warning | Repeating soft ticks that speed up and rise as time runs out, then a final sharper tone | 100 ms ticks | ~1.5–2 kHz | Short pulse per tick in final seconds | [C] |
| 31 | Victory jingle | Short upbeat fanfare (keys, bells or a brass-ish synth) landing on a bright major cadence. The battle-end _bed_ stays mellow | 2–3 s | Major, ends high | Celebratory pattern | [D] (mellow end bed) + [C] |
| 32 | Defeat jingle | Gentle, not punishing: descending phrase that resolves softly | 2–3 s | Minor → soft resolution | None or single soft pulse | [C] |
| 33 | Mission complete or reward | Bright "ta-da" chime + small sparkle. Shorter than victory | 700–1200 ms | High major arpeggio | Two pulses | [C] |
| 34 | Pack Points or currency gain | Counting ticks + soft coin-like "ping" per increment, final confirm chime | Ticks 40–60 ms, final 300 ms | ~2 kHz pings | None | [C] |
| 35 | Free pick select or reveal | Shuffle rustle (cards shuffling face down), hover tick on each card, selection pop, then the standard flip and reveal cues. Non-picked cards reveal first, the picked card last, then a summary | Shuffle 1–2 s | Paper noise then standard reveal family | Tick on select, pulse on reveal | [D] (phase order) + [C] |

## 3. Design principles

These follow from what reviews and guides document:

1. **The pack tear is the hero sound.** It was researched against physical packs and is mentioned in almost every review that mentions audio at all. Spend most of your sample-hunting budget here.
2. **Rarity has an audio tell, but it is subtle.** The "pop" is hard to notice when muted. The chime, the background colour and the glow carry the big reveal. Keep the pop small and let the chime scale with rarity.
3. **Music stays out of the way.** "Lounge", "light and fun", mellow battle-end bed. SFX sit on top. Music ducks during pack opening and reveals (see web-audio.md).
4. **Battle music is adaptive by points**, so build stems, not one loop.
