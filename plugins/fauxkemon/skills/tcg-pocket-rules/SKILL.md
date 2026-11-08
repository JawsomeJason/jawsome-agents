---
name: tcg-pocket-rules
description: Authoritative rules, card mechanics, set history and pack-opening math for Pokémon TCG Pocket (Genetic Apex A1 through Dual Fusion C1 and promos), written for building a faithful, non-monetized replica. Use whenever implementing or reviewing anything about how the game plays, such as the battle engine, turn order, Energy Zone, special conditions, points and win checks, evolution, Tools, Stadiums, ex and Mega ex, deck validation, AI opponents, booster packs, rarity odds, pack points, Wonder Pick, card data import, even when the request names only one card, one rule or one screen.
---

# TCG Pocket rules for the replica

The rules core is small and stable. The card pool grows set by set. Build the engine around a fixed rules core plus **data-driven card effects**, and keep every number that changed over time (timers, ranked points, odds per set) in config.

## Rules core at a glance

| Rule | Value |
| --- | --- |
| Deck | Exactly 20 cards. Max 2 cards per **name** ("Pikachu" and "Pikachu ex" are different names). At least 1 Basic Pokémon. No Energy cards exist. |
| Energy Zone | Deck owner picks 1–3 of the 8 Energy types (Grass, Fire, Water, Lightning, Psychic, Fighting, Darkness, Metal). Dragon and Colorless are never Energy. Each turn one Energy is generated at random from the chosen types. The weighting is unpublished, so use uniform. |
| Setup | Coin flip for first player. Each player draws 5. The opening hand **always contains a Basic** (no mulligans). Place the Active and up to 3 Bench face-down, then reveal together. Fossils can't be placed at setup. |
| Board | 1 Active + max 3 Bench per player. |
| Turn | Draw 1 → Energy Zone step → main phase (any order) → optional attack (ends the turn) → Pokémon Checkup. |
| Once per turn | Attach the Zone Energy (to Active or Bench), retreat, play 1 Supporter, play 1 Stadium. Most Abilities are once per Pokémon. Unused Zone Energy is lost at end of turn. |
| Unlimited | Bench Basics, evolve, play Items, attach Tools (max 1 Tool per Pokémon). |
| First turn | First player gets **no Energy** on turn 1. Nobody evolves on their own first turn, nor a Pokémon played this turn. Supporters **are** allowed on turn 1. An attack is legal if its cost is met by other means or is 0. |
| Damage | Multiples of 10. Weakness = **+20** on damaging attacks. No Resistance. Colorless cost is paid by any type. |
| Points | KO regular = 1, Pokémon ex = 2, Mega Evolution ex = 3. First to 3 wins. |
| Other wins | Opponent can't promote a new Active after a KO. Simultaneous conditions: count conditions met per side. Equal counts = tie. |
| Not a loss | Empty deck (you skip the draw). |
| Turn limit | Versus 30 turns, Solo 50 turns → draw (config). |
| Special Conditions | Active only. Poisoned 10, Burned 20 + coin to recover, Asleep (coin), Paralyzed (one turn), Confused (coin on attack). Checkup order and stacking: [battle-rules.md](references/battle-rules.md#special-conditions-and-checkup). |

## Where a generic card-game engine is wrong for Pocket

A generic card-game skill (such as `card-game`) is a good base for zones, effect-as-data and seeded shuffles. Pocket overrides it in five places:

- **No reshuffle and no deck-out loss.** An empty deck means no draw. Never move the discard pile back.
- **Energy is not a card.** It is generated per turn, attached to Pokémon, and goes to the discard pile as a typed token when discarded.
- **No mana curve and no hand-size discard step.** The only resource is one Zone Energy per turn plus effects.
- **Win condition is points**, awarded per KO by the KO'd card's kind, plus the no-Active loss.
- **Copy limit is by name**, not by card id or art.

## How to build it

1. Model the rules as a **pure reducer**: `(state, action, rng) → state + events`. The UI only renders state and plays back events. Replays, undo for debugging, AI search and tests then need no extra machinery.
2. Generate **legal actions** from the state. The UI enables exactly those, and the AI picks from the same list.
3. Express card text as a small **effect-op vocabulary** (damage, heal, draw, search, attach, move Energy, switch, condition, coin flips and others) with a per-card scripted escape hatch. Measure coverage per set.
4. Keep every changeable number in a **rules config** (turn limits, first-player draw, hand cap, timers). Defaults: [assets/rules-config.default.json](assets/rules-config.default.json).
5. Use one **seeded RNG** stream per game and one per pack opening. Log the seed so any result can be replayed and audited.

The types, reducer phases, op catalog, AI levels and test plan are in [engine-architecture.md](references/engine-architecture.md).

## Reference map

Read only the file the task needs.

| Task | Read |
| --- | --- |
| Implementing or checking a rule, ruling, card type (Tools, Stadiums, Fossils, Rare Candy, ex, Mega, dual-type, Baby, Ultra Beast, Link Abilities, Ancient and Future, Team Rocket's), damage order, simultaneous KOs | [battle-rules.md](references/battle-rules.md) |
| Engine design: state types, action list, effect ops, RNG, AI opponent, tests | [engine-architecture.md](references/engine-architecture.md) |
| Which set introduced what, set codes, dates, card counts, packs, archetypes | [sets-and-mechanics.md](references/sets-and-mechanics.md) |
| Booster packs, rarity tiers, God Packs (Rare Packs), 6-card and Deluxe packs, pack points, Wonder Pick, trading, what's monetized and how the replica replaces it | [packs-and-economy.md](references/packs-and-economy.md) |
| Versus, Ranked, Solo and AI decks, events, rental decks, deck codes | [game-modes.md](references/game-modes.md) |
| Screen layout, gestures, pack-opening sequence, card finishes, navigation | [ux-and-feel.md](references/ux-and-feel.md) |
| Importing cards, schemas, data quality, art and licensing | [card-data.md](references/card-data.md) |
| A rule the sources disagree on, or that must be checked in the real client | [open-questions.md](references/open-questions.md) |

Data assets for the engine: [assets/rules-config.default.json](assets/rules-config.default.json) (rules config) and [assets/pack-odds.json](assets/pack-odds.json) (per-slot odds tables, Rare Pack and pack-point values).

## Fairness rules for this replica

The person playing chose this replica to avoid rigged, pay-gated play. Hold these lines in every feature. [packs-and-economy.md](references/packs-and-economy.md) gives the original's systems and the replica's replacement for each.

- No currency that can be bought, no stamina timers that gate packs, picks or trades, no exclusive cards behind any gate.
- Pack odds are **published in-app** and are the real odds the RNG uses. Never adjust odds by player behavior, streaks or spending.
- If a pity counter exists, show it.
- Every pack opening is reproducible from its logged seed.

## Before calling rules work done

- [ ] Each rule you touched has a unit test that states the rule in its name, for example `ex KO awards 2 points`.
- [ ] Turn-1 restrictions are tested for both the first and the second player.
- [ ] The Checkup order and condition stacking are tested.
- [ ] Simultaneous-KO and tie paths are tested.
- [ ] Any value marked as uncertain in [open-questions.md](references/open-questions.md) is read from config, not hard-coded.
