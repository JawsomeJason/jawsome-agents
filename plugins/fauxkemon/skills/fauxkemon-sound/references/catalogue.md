# Sound catalogue

What the original sounds like, as far as public sources allow, and the design target for each cue. Confidence tags: **[D]** documented in a public source; **[C]** a design target written from documented facts plus genre convention, to verify by ear against the app with Haptics on; **[?]** no public source, an informed guess. No public text source gives exact tempos, keys, durations or per-effect descriptions, so every [C] value is a starting point.

## Contents

1. Production facts
2. Music by screen
3. Sound-effect catalogue
4. Design principles

## 1. Production facts

| Fact | Detail | Basis |
| --- | --- | --- |
| Developers | The Pokémon Company, Creatures Inc. and DeNA (DeNA's joint-venture studio for the game was later renamed "Pokémon Card D Studio") | Encyclopedia and games press |
| Music | Two credited composers, one of them the lead studio's long-time composer for its other games. The in-game sound-team credits also list a sound director at each studio. | Encyclopedia infobox; in-game credits as transcribed on a fan forum; remix-community credits |
| Known track titles | "Title" (title screen) and "Feed Challenge Menu" (the Wonder Pick screen's internal credit name) are the two source tracks named by the remix community. No official soundtrack has been released or catalogued. | Remix-community song pages |
| Pack-open SFX design | The lead studio's art director told the games press the team paid close attention to pack-opening sounds because players open packs daily; he opened physical packs and tested interactions, including sliding a finger around on the pack, to land on a sound that evokes excitement. | Games press interview |
| Pack-open SFX character | Described in reviews as "a pleasing tearing sound" and as an attempt to replicate the exact way a card pack sounds when ripped into; a collector site calls it a "riiiiip". | Reviews |
| Rare-card audio tell | A popping/cracking sound plays when the pack opens; the guide warns it is easy to miss with the phone muted. Light shines from the pack and the reveal background changes from blue to another colour (both guaranteed on a rare pull). "Special sounds signal rare cards." | Guide sites |
| Battle SFX | Hitting the opponent triggers sound effects and staging that give 爽快感 (an exhilarating, "satisfying" feel). | Japanese tech press |
| Music mood | Reviewers: "the background tunes throughout are light and fun"; a fan blog describes the whole score as lounge-styled with a chill factor, livelier than the PC client's; remix-community judges describe the title theme as "smooth, warm, semi-jazzy", conveying lightness, brightness and joy, with a coherent style and careful music theory. | Reviews; fan blog; remix community |
| Adaptive battle music | Separate pieces for: setup phase; "primary struggle" (neither player has 2 points); "crunch time" (someone has 2 points) with different pieces for being ahead vs behind; a mellow battle-end piece regardless of result. | Fan blog |
| Haptics | The settings menu has a **Haptics** toggle (next to frame-rate cap 30/60 fps). | Guide site |
| Immersive cards | Have "their own unique music and visuals" (per-card cue, not the standard reveal). | Review |

Not found in any public text source: exact tempos, keys, durations, or a per-effect description. Everything marked [C] or [?] should be checked by ear.

## 2. Music by screen

| Screen | Documented [D] | Design target for the replica [C] |
| --- | --- | --- |
| Splash / title | "Lounge-styled intro piece" (fan blog). Title theme is "smooth, warm, semi-jazzy" with clear chord-based writing (remix community). | Mid-tempo (~88–96 BPM feel), electric-piano or soft-synth keys, brushed/soft drums, warm bass, major-key with jazzy extensions (maj7, 9ths). Loop 60–90 s. |
| Home / main (packs) | Lounge-styled piece (fan blog). "Light and fun" (review). | Slightly brighter than title; relaxed groove, glockenspiel/bell countermelody; nothing in the 2–4 kHz band that fights UI blips. |
| Collection / card display | A different lounge piece from main (fan blog). | Sparser, more ambient: pads + soft keys, slower harmonic rhythm. |
| Pack select (expansion → pack carousel) | "Ambient pieces" that the blogger suspects hint at the pack (fan blog). | Low-density bed: pad, light percussion, suspense but calm. Music should leave headroom; this is the screen where SFX carry the moment. |
| After opening (results) | "Lively, mildly celebratory" (fan blog). | Up-tempo (~120 BPM feel), bright keys, light brass/synth stabs, short loop. |
| Wonder Pick | "Lively pieces" (fan blog); credited internally as "Feed Challenge Menu" (remix community). | Playful, bouncy, slightly mischievous (minor-to-major turns); marimba/pizzicato colours. |
| Battle venue select / battle | "Liveliest music in the game", with setup / primary / crunch-ahead / crunch-behind variants (fan blog). | Four stems in the same key and tempo so they crossfade on the beat. Crunch variants add drive (busier hats, extra synth layer); "behind" adds tension (minor colour, rising ostinato), "ahead" adds brightness. |
| Battle end | Mellow piece regardless of win/lose (fan blog). | Short warm cadence loop; the win/lose _jingle_ carries the result, not the bed. |

## 3. Sound-effect catalogue

Durations and pitch characters are **design targets** [C] unless marked [D]. "Haptic" describes what the replica should do on Android (iOS Safari has no vibration API; see web-audio.md).

| # | Event | Character (timbre) | Approx. length | Pitch / register | Haptic (replica) | Conf. |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Pack carousel swipe / select | Soft foil-wrapper rustle + a short low airy whoosh; one "tick" when the carousel snaps | 150–300 ms | Noise-based, HF rustle 4–8 kHz, body ~200 Hz | Light tick on snap (10 ms) | [C] |
| 2 | Pack tap (zoom in) | Clean, soft UI pop with a tiny foil crinkle under it | 80–120 ms | ~800 Hz–1.2 kHz pop | None | [C] |
| 3 | Pack cut / tear (swipe across top) | Real-pack rip: foil/paper tear that follows the finger, with a fast "zip" texture and air whoosh; ends with a tiny release crinkle | 350–600 ms, tracks the swipe | Broadband noise, emphasis 2–6 kHz; tear "zip" has rising pitch as speed increases | Medium continuous buzz while swiping (e.g. 30–40 ms pulses), short strong pulse at completion | [D] (tear recorded from real packs; "pleasing tearing", "riiiiip") + [C] |
| 4 | Pack "pop" on open (rare tell) | A short crack/pop at the instant the pack opens; subtle and easy to miss when muted | ~60–120 ms | Transient, ~1–3 kHz | One sharp pulse | [D] (GameWith) |
| 5 | Card slides out of pack | Soft paper-on-paper slide with a high airy swish; slightly longer than a deal | 250–400 ms | Noise, HF 3–7 kHz, low-level body | Light tick at end of slide | [C] |
| 6 | Card flip / reveal (standard) | Card-stock flick: a short "fwip" with a dull body thump when it lands face-up; cards reveal one by one | 120–220 ms | Noise transient + ~150–250 Hz body | Light tick | [D] (one-by-one reveal) + [C] |
| 7 | Rare-card reveal chime | On ★/★★/EX etc.: glassy ascending arpeggio or shimmer (bell/glockenspiel/celesta character) layered on the flip; brighter and longer the higher the rarity; background colour shifts and a glow appears | 500–900 ms (★), 1–1.5 s (★★/★★★), longer for Crown | Major arpeggio in a high register (C6–C7 region), sparkly tail | Two or three rising pulses (e.g. 20, 40, 60 ms) | [D] (special sounds signal rares; background changes) + [C] |
| 8 | The "pause" build-up | Before a high-rarity card flips, the reveal hesitates: a rising riser/shimmer swell with a slight sub bed, then silence for a beat, then the chime hits | Riser 600–900 ms, gap 150–250 ms | Rising filtered noise + pitch sweep, resolves to the chime's root | Single long soft buzz during riser, then strong pulse on reveal | [C] |
| 9 | God pack sting | Everything-rare pack: a bigger, longer fanfare-shimmer with a low impact and long sparkle tail; reads as "jackpot" without casino kitsch | 1.5–2.5 s | Full-range: sub thump + mid brass/synth + HF sparkle | Long pattern (e.g. 60, 40, 60, 40, 120 ms) | [?] |
| 10 | Card tap / zoom (collection) | Soft pop + tiny card-stock flick; immersive cards get their own cue | 80–150 ms | ~1 kHz pop | None | [D] (immersive cards have unique audio) + [C] |
| 11 | Menu tap / confirm | Short, rounded "pip" — not a hard click; low-passed so it never pokes out of the mix | 40–90 ms | 900 Hz–1.5 kHz, slight downward pitch | None | [C] |
| 12 | Back / cancel | Same family as #11 but lower and slightly descending | 50–100 ms | ~600–800 Hz, falling | None | [C] |
| 13 | Toggle / switch | Two-tone flick: up for on, down for off | 60–100 ms | Two sine-ish partials a 4th/5th apart | None | [C] |
| 14 | Error / invalid move | Soft double "buh-buh" or a dull low tone; game also shows an immediate text prompt for invalid moves | 150–300 ms | ~200–300 Hz, slightly detuned | One short pulse | [D] (immediate feedback prompt) + [C] |
| 15 | Coin flip — spin | Metallic flick, then a whirring, wobbling spin that slows (classic coin-on-table wobble but cleaner, more "designed") | 800–1200 ms | Metallic 2–5 kHz ring, wobble rate decelerating | Light pulses matching wobble, decelerating | [C] |
| 16 | Coin lands — heads / tails | Heads: bright clink + short positive chime; Tails: duller clink + lower, flatter tone | 200–400 ms | Heads ~2 kHz metallic + major 3rd; Tails ~1 kHz + minor/flat | Pulse on landing (heads stronger) | [C] |
| 17 | Energy generated (Energy Zone) | Soft shimmer/sparkle "ping", type-coloured; a small magical pop | 200–350 ms | ~1.5–3 kHz with sparkle tail | None | [C] |
| 18 | Energy attached | Snap/click with a little tonal "tink" that confirms attachment | 120–200 ms | Click + ~1 kHz tone | Light tick | [C] |
| 19 | Card draw (from deck) | Fast card slide + light fwip | 150–250 ms | HF paper noise | None | [C] |
| 20 | Play to Bench / Active | Card lands on mat: soft thud + card-stock slap; a small confirm "tick" | 150–250 ms | Thud ~150 Hz + slap transient | Light tick | [C] |
| 21 | Evolve | Rising magical swell → bright "bloom" chime when the new card appears | 700–1100 ms | Rising sweep resolving on a high major chord | Medium pulse on bloom | [C] |
| 22 | Retreat | Quick swoosh (card leaving) + soft landing thud (swap) | 300–450 ms | Whoosh mid-band, thud low | None | [C] |
| 23 | Attack selected / confirmed | Punchy UI confirm with a slight "arming" edge (short sweep up) | 150–250 ms | ~1 kHz up-sweep | Light tick | [C] |
| 24 | Attack impact variants | Type-flavoured hits: Fire = whoosh-burst + crackle; Water = splash + low thump; Lightning = zap-crack; Grass = leafy whip + thud; Psychic = airy warble + soft impact; Fighting = heavy punch thud; Darkness = low rumbling hit; Metal = clang; Colorless = generic punch/thud. All share one low "body" impact for consistency; damage SFX are a documented source of satisfaction | 300–600 ms | Body thump 60–120 Hz + type layer | Strong single pulse (scale by damage) | [D] (satisfying damage SE) + [C] |
| 25 | Special Condition applied | Poison: bubbly gurgle-pop; Burn: crackle hiss; Sleep: soft descending "zzz" tone; Paralysis: short electric buzz; Confusion: wobbly detuned warble | 300–600 ms | Per condition | None | [C] |
| 26 | Damage counter placed / HP change | Quick tick-tick counter roll with a small final "thunk" | 150–300 ms | Clicks + ~300 Hz final | None | [C] |
| 27 | Knock Out | Heavier impact + short descending tone/whoosh as the card dims and leaves | 600–900 ms | Low impact + falling pitch | Strong pulse then short second pulse | [C] |
| 28 | Point awarded | Bright, short positive chime (two or three rising notes), clearly distinct from the rare-card chime | 300–500 ms | High major (e.g. G5–C6–E6) | Two pulses | [C] |
| 29 | Turn change | Soft, neutral chime/whoosh; "your turn" slightly brighter than "opponent's turn" | 400–600 ms | Mid-high, gentle | Light pulse on your turn only | [C] |
| 30 | Timer warning | Repeating soft ticks that speed up / rise as time runs out; final sharper tone | 100 ms ticks | ~1.5–2 kHz | Short pulse per tick in final seconds | [C] |
| 31 | Victory jingle | Short upbeat fanfare (keys/bells/brass-ish synth) landing on a bright major cadence; the battle-end _bed_ stays mellow | 2–3 s | Major, ends high | Celebratory pattern | [D] (mellow end bed) + [C] |
| 32 | Defeat jingle | Gentle, not punishing: descending phrase that resolves softly | 2–3 s | Minor → soft resolution | None or single soft pulse | [C] |
| 33 | Mission complete / reward | Bright "ta-da" chime + small sparkle; shorter than victory | 700–1200 ms | High major arpeggio | Two pulses | [C] |
| 34 | Pack Points / currency gain | Counting ticks + soft coin-like "ping" per increment, final confirm chime | Ticks 40–60 ms, final 300 ms | ~2 kHz pings | None | [C] |
| 35 | Wonder Pick select / reveal | Shuffle rustle (cards shuffling face down), hover tick on each card, selection pop, then standard flip/reveal cues; non-picked cards reveal first, picked card last, then a summary | Shuffle 1–2 s | Paper noise then standard reveal family | Tick on select, pulse on reveal | [D] (phase order) + [C] |

## 4. Design principles

These follow from the documented facts:

1. **The pack tear is the hero sound.** It was researched against physical packs and is mentioned in almost every review that mentions audio at all. Spend most of your sample-hunting budget here.
2. **Rarity has an audio tell, but it is subtle.** The "pop" is easy to miss when muted; the big reveal is carried by the chime + background colour + glow. Keep the pop small and let the chime scale with rarity.
3. **Music stays out of the way.** "Lounge", "light and fun", mellow battle-end bed. SFX sit on top; music ducks during pack opening and reveals (see web-audio.md).
4. **Battle music is adaptive by points**, so build stems, not one loop.

---
