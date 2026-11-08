# Battle rules (complete)

This file covers every set through Dual Fusion (C1). `assets/sets.json` holds the data date. A rule marked **⚠ verify** has conflicting or secondary-only sources. Its default lives in `assets/rules-config.default.json`, and `open-questions.md` gives the details.

## Contents

1. Deck construction
2. Setup
3. Turn structure
4. Energy Zone
5. Attacking and damage
6. Knockouts, points and winning
7. Special Conditions and Checkup
8. Retreat and switching
9. Evolution
10. Trainer cards
11. Pokémon kinds and tags
12. Types
13. Card anatomy
14. Edge rulings

## 1. Deck construction

- Exactly 20 cards: Pokémon and Trainers only.
- At most 2 cards with the same **name**, whatever the art, rarity or set. The name includes suffixes: "Pikachu" and "Pikachu ex" are different names, so 2 of each is legal.
- At least 1 Basic Pokémon. Fossils are Items, so they don't count as Basics for this check.
- Energy Zone types: 1 to 3 of Grass, Fire, Water, Lightning, Psychic, Fighting, Darkness and Metal. The player picks them. The order of generation is random.
- A deck validation error names the rule and the cards: "3 cards named Misty (max 2)".

## 2. Setup

1. Flip a coin to decide who goes first.
2. Each player draws 5 cards. The game guarantees at least 1 Basic Pokémon in each opening hand. **Implementation:** shuffle, then if the top 5 hold no Basic, swap one random Basic from the deck into the hand and reshuffle the deck. Do this per player with the game's seeded RNG.
3. Each player places 1 Basic face-down as the Active Pokémon and may place up to 3 Basics face-down on the Bench. Fossils can't be placed during setup.
4. Both players confirm, then all placed cards are revealed together.
5. Both players start at 0 points.

Timers (Versus): about 90 seconds per turn and a 20-minute match clock. For a private replica, default to no timers and keep them as config.

## 3. Turn structure

1. **Draw** 1 card. If the deck is empty, skip the draw. An empty deck is not a loss. If the hand already holds the hand cap (10 by default), skip the draw. **⚠ verify:** whether the player going first draws on turn 1 (default: yes, they draw).
2. **Energy Zone step** (see section 4).
3. **Main phase**, actions in any order:
   - Unlimited:
     - Put Basics onto the Bench (Bench max 3).
     - Evolve (section 9).
     - Play Items.
     - Attach Pokémon Tools (max 1 per Pokémon).
     - Use Abilities. Most are once per turn per Pokémon. Follow the card text.
   - Once per turn:
     - Attach the Zone Energy.
     - Retreat (section 8).
     - Play 1 Supporter.
     - Play 1 Stadium.
4. **Attack** (optional) with the Active Pokémon if its cost is met and nothing prevents it. Attacking ends the turn immediately after the attack resolves.
5. **Pokémon Checkup** (section 7), then the other player's turn begins.

First-turn restrictions:

| Restriction | First player, turn 1 | Second player, their turn 1 |
| --- | --- | --- |
| Zone Energy | None | Yes |
| Evolve | No | No |
| Supporter | Allowed | Allowed |
| Attack | Allowed if the cost is met another way or is 0 | Allowed |

The earliest evolution is therefore the first player's turn 3 (game turn 3) and the second player's turn 4 (game turn 4). "Turn N" in this file counts game turns: turn 1 = first player's first turn, turn 2 = second player's first turn.

## 4. Energy Zone

- The Zone shows two slots: the **current** Energy, available to attach this turn, and a smaller **preview** of the next one.
- At the Energy step, if the current slot is empty, the preview moves into it and a new preview is generated from the chosen types.
- On the first player's turn 1, the current slot is empty and the preview slot shows the next Energy.
- Attach the current Energy to any one of your Pokémon (Active or Bench) by dragging it. If it isn't attached by the end of the turn, it is lost.
- Effects can also attach Energy "from your Energy Zone" (for example Misty, or Abilities). These attach generated Energy of the type the card names. They don't consume the once-per-turn attachment unless the card says so.
- Energy is not a card. When discarded (retreat cost, attack costs, KO) it goes to the discard pile as typed Energy, where some effects can retrieve it.

## 5. Attacking and damage

**Cost.** Typed symbols need Energy of that type. Colorless symbols take any type. An attack with no cost can always be used if nothing prevents attacking.

**Damage order** (adopted from the physical TCG, with Pocket-specific edge cases in section 14):

1. Base damage from the attack, including its own "+", "×" or "−" text (for example "+30 for each Benched Pokémon", "30× the number of heads").
2. Attacker-side modifiers from Abilities, Tools and Supporters played this turn ("attacks do +10 damage").
3. Weakness: **+20** if the attack's type matches the Defending Pokémon's Weakness. Only for damaging attacks against the Active Pokémon. Damage to the Bench never applies Weakness.
4. Defender-side reductions ("takes −20 damage from attacks").
5. Floor at 0. Place damage.

Damage rules:

- Damage is always a multiple of 10. HP and damage are stored as integers.
- Effects that "put damage counters" are not damage: Weakness and reductions don't apply.
- Effects from attacks resolve in text order. If the attack can't be used (Confused tails), nothing resolves.
- Attacks that hit the Bench do not trigger "when damaged by an attack while Active" effects unless the card says so.

## 6. Knockouts, points and winning

- A Pokémon with damage ≥ HP is Knocked Out. KO checks run after each attack resolves, after each effect that places damage, and after Checkup.
- On a KO, the KO'd card, its evolutions underneath, attached Energy and Tool go to the owner's discard pile.
- Points to the opponent: regular Pokémon **1**, Pokémon ex **2**, Mega Evolution ex **3**.
- If the owner's Active was KO'd, the owner promotes a Benched Pokémon. With no Bench, the owner can't promote and loses.
- **Win conditions:** reach 3 points, or the opponent can't promote an Active after a KO.
- **Simultaneous results** (both Actives KO'd in one action, for example by Rocky Helmet): award all points, then count the win conditions each player meets. More conditions wins. Equal counts is a tie. Example: both at 2 points, both Actives KO'd, both reach 3 → tie. If one of them also can't promote, the other player meets 2 conditions to 1 and wins.
- Turn limit reached (Versus 30, Solo 50) → the game ends in a draw. No sudden death.

## 7. Special Conditions and Checkup

Special Conditions only affect the **Active** Pokémon. Moving to the Bench (retreat or switch) and evolving remove all of them.

| Condition | Effect | Recovery | Stacks with |
| --- | --- | --- | --- |
| Poisoned | 10 damage at each Checkup | Bench, evolve, effects | Burned, and one of Asleep, Paralyzed or Confused |
| Burned (from A2) | 20 damage at each Checkup, then flip: heads = recovers | Coin, Bench, evolve, effects | Poisoned, and one of Asleep, Paralyzed or Confused |
| Asleep | Can't attack or retreat. Flip at each Checkup: heads = wakes | Coin, evolve, effects | Replaces Paralyzed or Confused |
| Paralyzed | Can't attack or retreat | Recovers at the Checkup after its owner's next turn | Replaces Asleep or Confused |
| Confused (from A2) | When attacking, flip: tails = the attack does nothing and the turn ends | Bench, evolve, effects | Replaces Asleep or Paralyzed |

Asleep, Paralyzed and Confused are mutually exclusive: applying one replaces the one already there. Poisoned and Burned each sit alongside them.

**Checkup** runs between turns. The player whose turn just ended resolves first, then the other player. Within one Pokémon, resolve in this order: Poisoned → Burned → Asleep → Paralyzed. Then run KO checks for both sides.

Immunity: some cards prevent Special Conditions (for example Arceus ex's Fabled Luster in A2a). Model immunity as a status filter on the Pokémon, checked when a condition would be applied.

## 8. Retreat and switching

- Retreat: once per turn, swap the Active with a Benched Pokémon by discarding Energy from the Active equal to its Retreat Cost (0–4). Requires a Benched Pokémon. Not allowed while Asleep or Paralyzed.
- Effects can lower retreat cost (Tools, Stadiums such as Peculiar Plaza, Supporters). Floor at 0.
- "Switch" effects (Items, Supporters, attacks) are not retreats: they ignore Retreat Cost and don't use the once-per-turn retreat.
- "Gust" effects (Sabrina, Cyrus and similar) choose which of the opponent's Benched Pokémon becomes Active, subject to the card's filter (for example "a damaged Benched Pokémon").

## 9. Evolution

- Put an evolution card from hand onto the matching Pokémon in play. The evolved Pokémon keeps damage, Energy and Tool, and loses Special Conditions and "until the end of your opponent's next turn" effects on it.
- Can't evolve on your first turn, or a Pokémon put into play this turn.
- Each Pokémon can evolve once per turn.
- Stage 1 evolves from a Basic, Stage 2 from a Stage 1.
- **Rare Candy** (A3): evolve a Basic directly into a Stage 2 from hand, skipping Stage 1. Same timing limits as normal evolution. Works on Fossil lines.
- **Pokémon ex** that evolve (for example Charizard ex) evolve from a regular Pokémon. A Basic ex can't evolve unless an effect says so (Eevee ex's Veevee 'volve, A3b, lets it evolve into any Pokémon that evolves from Eevee).
- **Mega Evolution ex** (B1): evolve from the previous stage of their line (for example Combusken → Mega Blaziken ex). Some are Basic (Mega Absol ex, Mega Pinsir ex). **⚠ verify** each line's `evolvesFrom` from the card data, not from name stripping.

## 10. Trainer cards

| Subtype | Rule | From |
| --- | --- | --- |
| Item | Unlimited per turn. Discard after use. | A1 |
| Supporter | 1 per turn, including turn 1. Discard after use. | A1 |
| Fossil (Item) | Played to the Bench (or to the Active Spot when it is empty, by card text) as a Basic Colorless Pokémon with the HP on the card. Can't be placed at setup. Some Pokémon evolve from it. Follow the card's own text for retreat and discarding. | A1 |
| Pokémon Tool | Attach to one of your Pokémon, max 1 per Pokémon. Any number per turn. Stays until the Pokémon leaves play or an effect removes it. HP bonuses (Giant Cape +20) end the moment the Tool leaves. Rocky Helmet deals 20 to the attacker only while the holder is Active. | A2 |
| Stadium | Stays in play, affects both players. 1 per turn. A new Stadium discards the old one. Can't play a Stadium with the same name as the one in play. Usually ◊◊. | B2 |
| Generated card | An effect can create a temporary card in hand that isn't part of the deck (Ribombee's Honey Gather creates "Sweet Honey" in C1). Model as a card instance with `generated: true` that never returns to a deck and is removed when discarded. | C1 |

## 11. Pokémon kinds and tags

| Kind or tag | Rule | From |
| --- | --- | --- |
| Pokémon ex | Rule box. KO gives 2 points. Can be Basic or evolved. | A1 |
| Mega Evolution ex | Rule box. KO gives **3 points**: losing one ends the game for most boards. | B1 |
| Baby Pokémon | Basics whose attacks cost 0 Energy. Often the 6th card in a 6-card pack. | A4 |
| Ultra Beast | A tag that support cards reference (Beastite, Buzzwole ex, Guzzlord ex…). | A3a |
| Link Abilities | Five Abilities (Power, Resilience, Vigor, Speed, Cunning) that switch on while Arceus or Arceus ex is in play. | A2a |
| Ancient and Future | Paradox tags that support cards reference (Professor Sada, Turo, Booster Energy Capsules). | B3a |
| "Team Rocket's" Pokémon | Owner-named Pokémon (for example Team Rocket's Moltres ex). The owner prefix is part of the name: support cards match on it. | B4a |
| Dual-type | A Pokémon with two types (for example Mega Mewtwo X ex, Psychic and Fighting). Attack costs still use one type. It has one Weakness. Its attacks count as **both** types for the defender's Weakness. Type-specific support applies if either type matches. **⚠ verify** from card text. | C1 |

Model tags as a string set on the card (`tags: ["ultra-beast"]`) and the owner prefix as data, not as a separate card kind.

## 12. Types

Ten types: Grass, Fire, Water, Lightning, Psychic, Fighting, Darkness, Metal, Dragon, Colorless. Dragon and Colorless have no Energy of their own. Weakness is printed per card, so store it per card. Don't derive it from a type chart.

The video-game types fold into these as follows. Use the mapping for card-data cleanup only.

| Video-game types | Pocket type |
| ---------------- | ----------- |
| Bug              | Grass       |
| Ice              | Water       |
| Ghost, Fairy     | Psychic     |
| Ground, Rock     | Fighting    |
| Poison, Dark     | Darkness    |
| Normal, Flying   | Colorless   |

## 13. Card anatomy

Pokémon: name, type (1, or 2 from C1), HP, stage (Basic, Stage 1, Stage 2), kind flags (ex, Mega), evolves-from name, Ability (name + text), attacks (each with an Energy cost array, name, base damage, optional `+`, `×` or `−` modifier, effect text), Weakness type (always +20), Retreat Cost 0–4, rule-box text, rarity, set code, number, illustrator, which booster packs it appears in.

Trainer: subtype, effect text, rarity, set, number, illustrator, packs.

## 14. Edge rulings

- **Zone attachment triggers.** "When you attach Energy from your Energy Zone" (for example Jolteon ex's Electromagnetic Wall) triggers on any attachment from the Zone, manual or by effect. It does not trigger on Energy attached from the discard pile or moved between Pokémon.
- **Turn-1 attacks.** The first player can attack on turn 1 if a Supporter or Ability attached Energy, or the attack costs nothing. This is legal, and was controversial (Misty).
- **Tools on KO.** The Tool goes to the discard pile with the Pokémon.
- **HP bonus removal.** If removing an HP-boosting Tool leaves damage ≥ HP, the Pokémon is KO'd at the next KO check.
- **Rocky Helmet double KO.** An attack that KOs the defender while the helmet KOs the attacker is a simultaneous result (section 6).
- **Effects "during your opponent's next turn"** expire at the end of that turn, and are removed if the Pokémon leaves the Active Spot or evolves.
- **Coin flips** are separate RNG draws, resolved one at a time, and shown to both players. "Flip until tails" needs a cap only as a safety net against infinite loops in tests.
- **Copy limit and generated cards.** Generated cards don't count toward the 2-copy limit.
