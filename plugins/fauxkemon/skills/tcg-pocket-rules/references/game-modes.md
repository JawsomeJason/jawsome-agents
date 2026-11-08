# Game modes

For a single-person replica, Solo is the core. Versus can be local (pass-and-play) or against the AI, with Ranked as an optional progression ladder. Read every ranked number from config, because the original changed them most seasons.

## Versus

- **Random Match** (original: online casual). Replica: against the AI, or pass-and-play on one device. 30-turn limit.
- **Ranked Match** (launched with Shining Revelry, date in `assets/sets.json`):
  - Tiers: Beginner 1–4, Poké Ball 1–4, Great Ball 1–4, Ultra Ball 1–4, Master Ball (17 tiers).
  - Win = +10 points. Launch-era losses: Beginner 0, Poké Ball and Great Ball −5, Ultra Ball −7, Master Ball −10.
  - Win-streak bonus: +3, +6, +9 and +12 for 2, 3, 4 and 5 wins in a row. It first applied from Beginner to Great Ball only. It was later extended to Ultra Ball and Master Ball. A season after that, mid-season drops from Master Ball to Ultra Ball and from Ultra Ball to Great Ball were removed. The dates are in `assets/sets.json`, `milestones`.
  - Later seasons varied. B4 removed loss points in some ranks. One B4b special season had no losses and streaks up to 10.
  - Season-end reset:
    - Beginner 1–4, Poké Ball 1–4 and Great Ball 1: unchanged.
    - Ultra Ball 1 → Great Ball 3.
    - Master Ball → Ultra Ball 3.
    - Master Ball with 1,675+ points → Ultra Ball 4.
  - Rewards: Pack Hourglasses and emblems by rank. Replica: emblems and cosmetics only.
- **Friend battles**: private matches by code in the original. Replica: optional local or peer-to-peer play later. Not needed for v1.

## Solo

- 50-turn limit.
- Each set adds AI opponent decks across difficulty steps (Beginner, Intermediate, Advanced, Expert). Map these to the AI levels in `engine-architecture.md`, section 7, and to deck strength.
- C1 added 12 "Step-Up" battles with deck-content conditions (for example "win with 12+ Dual Fusion cards"). Model a Solo battle as `{ opponentDeck, aiLevel, conditions[], rewards[] }`.
- First-clear rewards in the original include Pack Hourglasses. Replica: packs or crafting dust directly.

## Events

| Event kind | Original | Replica |
| --- | --- | --- |
| Emblem events | Win counts or streaks earn emblems | Achievements |
| Drop events | Special Solo battles drop promo cards | Keep: a way to earn promos by play |
| Wonder Pick events | Event promos in picks | Free pick mini-game |
| Mass Outbreak | Boosted parallel foils (B4b) | Optional |
| Restricted-card events | Battles with card restrictions (C1) | Deck-rule filters on a Solo battle |

## Decks

- Rental decks: preset decks per set. From C1 they have unlimited uses and are removed when a new set releases. Replica: keep them permanently as starter and AI decks.
- Deck codes: 2D-pattern sharing from B4. Replica: a short text code (set + number list, base64url) for export and import.
- Community decks (C1). Replica: not needed.
- The deck builder shows Energy Zone type selection (1–3 types) next to the 20-card list, with validation messages.
