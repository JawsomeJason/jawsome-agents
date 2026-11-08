# Battle rules

A paraphrase of the original mobile card game's battle rules, in neutral terms. "Creature" means the card kind that battles. Card names, set names and set codes are left out. A rule marked **⚠ verify** has conflicting or secondary-only sources, and its default lives in `assets/rules-config.default.json`.

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
11. Creature kinds and tags
12. Types
13. Card anatomy
14. Edge rulings

## 1. Deck construction

- Exactly 20 cards: creatures and Trainers only.
- At most 2 cards with the same **name**, whatever the art, rarity or set. The name includes suffixes: "Bolt" and "Bolt ex" are different names, so 2 of each is legal.
- At least 1 Basic creature. Fossils are Items, so they don't count as Basics for this check.
- Energy Zone types: 1 to 3 of Grass, Fire, Water, Lightning, Psychic, Fighting, Darkness and Metal. The player picks them. The order of generation is random.
- A deck validation error names the rule and the cards: "3 cards named Bolt (max 2)".

## 2. Setup

1. Flip a coin to decide who goes first.
2. Each player draws 5 cards. The game guarantees at least 1 Basic creature in each opening hand. **Implementation:** shuffle, then if the top 5 hold no Basic, swap one random Basic from the deck into the hand and reshuffle the deck. Do this per player with the game's seeded RNG.
3. Each player places 1 Basic face-down as the Active creature and may place up to 3 Basics face-down on the Bench. Fossils can't be placed during setup.
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
     - Attach Tools (max 1 per creature).
     - Use Abilities. Most are once per turn per creature. Follow the card text.
   - Once per turn:
     - Attach the Zone Energy.
     - Retreat (section 8).
     - Play 1 Supporter.
     - Play 1 Stadium.
4. **Attack** (optional) with the Active creature if its cost is met and nothing prevents it. Attacking ends the turn immediately after the attack resolves.
5. **Checkup** (section 7), then the other player's turn begins.

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
- Attach the current Energy to any one of your creatures (Active or Bench) by dragging it. If it isn't attached by the end of the turn, it is lost.
- Effects can also attach Energy "from your Energy Zone" (some Supporters and Abilities). These attach generated Energy of the type the card names. They don't consume the once-per-turn attachment unless the card says so.
- Energy is not a card. When discarded (retreat cost, attack costs, KO) it goes to the discard pile as typed Energy, where some effects can retrieve it.

## 5. Attacking and damage

**Cost.** Typed symbols need Energy of that type. Colorless symbols take any type. An attack with no cost can always be used if nothing prevents attacking.

**Damage order** (adopted from the physical card game, with edge cases in section 14):

1. Base damage from the attack, including its own "+", "×" or "−" text (for example "+30 for each Benched creature", "30× the number of heads").
2. Attacker-side modifiers from Abilities, Tools and Supporters played this turn ("attacks do +10 damage").
3. Weakness: **+20** if the attack's type matches the Defending creature's Weakness. Only for damaging attacks against the Active creature. Damage to the Bench never applies Weakness.
4. Defender-side reductions ("takes −20 damage from attacks").
5. Floor at 0. Place damage.

Damage rules:

- Damage is always a multiple of 10. HP and damage are stored as integers.
- Effects that "put damage counters" are not damage: Weakness and reductions don't apply.
- Effects from attacks resolve in text order. If the attack can't be used (Confused tails), nothing resolves.
- Attacks that hit the Bench do not trigger "when damaged by an attack while Active" effects unless the card says so.

## 6. Knockouts, points and winning

- A creature with damage ≥ HP is Knocked Out. KO checks run after each attack resolves, after each effect that places damage, and after Checkup.
- On a KO, the KO'd card, its evolutions underneath, attached Energy and Tool go to the owner's discard pile.
- Points to the opponent: regular creature **1**, ex **2**, Mega ex **3**.
- If the owner's Active was KO'd, the owner promotes a Benched creature. With no Bench, the owner can't promote and loses.
- **Win conditions:** reach 3 points, or the opponent can't promote an Active after a KO.
- **Simultaneous results** (both Actives KO'd in one action, for example by a recoil Tool): award all points, then count the win conditions each player meets. More conditions wins. Equal counts is a tie. Example: both at 2 points, both Actives KO'd, both reach 3 → tie. If one of them also can't promote, the other player meets 2 conditions to 1 and wins.
- Turn limit reached (Versus 30, Solo 50) → the game ends in a draw. No sudden death.

## 7. Special Conditions and Checkup

Special Conditions only affect the **Active** creature. Moving to the Bench (retreat or switch) and evolving remove all of them.

| Condition | Effect | Recovery | Stacks with |
| --- | --- | --- | --- |
| Poisoned | 10 damage at each Checkup | Bench, evolve, effects | Burned, and one of Asleep, Paralyzed or Confused |
| Burned | 20 damage at each Checkup, then flip: heads = recovers | Coin, Bench, evolve, effects | Poisoned, and one of Asleep, Paralyzed or Confused |
| Asleep | Can't attack or retreat. Flip at each Checkup: heads = wakes | Coin, evolve, effects | Replaces Paralyzed or Confused |
| Paralyzed | Can't attack or retreat | Recovers at the Checkup after its owner's next turn | Replaces Asleep or Confused |
| Confused | When attacking, flip: tails = the attack does nothing and the turn ends | Bench, evolve, effects | Replaces Asleep or Paralyzed |

Asleep, Paralyzed and Confused are mutually exclusive: applying one replaces the one already there. Poisoned and Burned each sit alongside them.

**Checkup** runs between turns. The player whose turn just ended resolves first, then the other player. Within one creature, resolve in this order: Poisoned → Burned → Asleep → Paralyzed. Then run KO checks for both sides.

Immunity: some cards prevent Special Conditions. Model immunity as a status filter on the creature, checked when a condition would be applied.

## 8. Retreat and switching

- Retreat: once per turn, swap the Active with a Benched creature by discarding Energy from the Active equal to its Retreat Cost (0–4). Requires a Benched creature. Not allowed while Asleep or Paralyzed.
- Effects can lower retreat cost (Tools, Stadiums, Supporters). Floor at 0.
- "Switch" effects (Items, Supporters, attacks) are not retreats: they ignore Retreat Cost and don't use the once-per-turn retreat.
- "Gust" effects choose which of the opponent's Benched creatures becomes Active, subject to the card's filter (for example "a damaged Benched creature").

## 9. Evolution

- Put an evolution card from hand onto the matching creature in play. The evolved creature keeps damage, Energy and Tool, and loses Special Conditions and "until the end of your opponent's next turn" effects on it.
- Can't evolve on your first turn, or a creature put into play this turn.
- Each creature can evolve once per turn.
- Stage 1 evolves from a Basic, Stage 2 from a Stage 1.
- **Stage-skip Items**: evolve a Basic directly into a Stage 2 from hand, skipping Stage 1. Same timing limits as normal evolution. Works on Fossil lines.
- **ex that evolve** evolve from a regular creature. A Basic ex can't evolve unless an effect says so.
- **Mega ex** evolve from the previous stage of their line, and some are Basic. **⚠ verify** each line's `evolvesFrom` from the card data, not from name stripping.

## 10. Trainer cards

| Subtype | Rule |
| --- | --- |
| Item | Unlimited per turn. Discard after use. |
| Supporter | 1 per turn, including turn 1. Discard after use. |
| Fossil (Item) | Played to the Bench (or to the Active Spot when it is empty, by card text) as a Basic Colorless creature with the HP on the card. Can't be placed at setup. Some creatures evolve from it. Follow the card's own text for retreat and discarding. |
| Tool | Attach to one of your creatures, max 1 per creature. Any number per turn. Stays until the creature leaves play or an effect removes it. HP bonuses end the moment the Tool leaves. A recoil Tool deals its damage to the attacker only while the holder is Active. |
| Stadium | Stays in play, affects both players. 1 per turn. A new Stadium discards the old one. Can't play a Stadium with the same name as the one in play. |
| Generated card | An effect can create a temporary card in hand that isn't part of the deck. Model as a card instance with `generated: true` that never returns to a deck and is removed when discarded. |

## 11. Creature kinds and tags

| Kind or tag | Rule |
| --- | --- |
| ex | Rule box. KO gives 2 points. Can be Basic or evolved. |
| Mega ex | Rule box. KO gives **3 points**: losing one ends the game for most boards. |
| Baby | Basics whose attacks cost 0 Energy. |
| Support tags | Tags that support cards reference, such as a faction or an era. Abilities can switch on while a named creature is in play. |
| Owner prefix | Part of the name. Support cards match on it. |
| Dual-type | A creature with two types. Attack costs still use one type. It has one Weakness. Its attacks count as **both** types for the defender's Weakness. Type-specific support applies if either type matches. **⚠ verify** from card text. |

Model tags as a string set on the card (`tags: ["baby"]`) and the owner prefix as data, not as a separate card kind.

## 12. Types

Ten types: Grass, Fire, Water, Lightning, Psychic, Fighting, Darkness, Metal, Dragon, Colorless. Dragon and Colorless have no Energy of their own. Weakness is printed per card, so store it per card. Don't derive it from a type chart.

## 13. Card anatomy

Creature: name, type (1 or 2), HP, stage (Basic, Stage 1, Stage 2), kind flags (ex, Mega), evolves-from name, Ability (name + text), attacks (each with an Energy cost array, name, base damage, optional `+`, `×` or `−` modifier, effect text), Weakness type (always +20), Retreat Cost 0–4, rule-box text, rarity, set code, number, illustrator, which booster packs it appears in.

Trainer: subtype, effect text, rarity, set, number, illustrator, packs.

## 14. Edge rulings

- **Zone attachment triggers.** "When you attach Energy from your Energy Zone" triggers on any attachment from the Zone, manual or by effect. It does not trigger on Energy attached from the discard pile or moved between creatures.
- **Turn-1 attacks.** The first player can attack on turn 1 if a Supporter or Ability attached Energy, or the attack costs nothing.
- **Tools on KO.** The Tool goes to the discard pile with the creature.
- **HP bonus removal.** If removing an HP-boosting Tool leaves damage ≥ HP, the creature is KO'd at the next KO check.
- **Recoil double KO.** An attack that KOs the defender while a recoil Tool KOs the attacker is a simultaneous result (section 6).
- **Effects "during your opponent's next turn"** expire at the end of that turn, and are removed if the creature leaves the Active Spot or evolves.
- **Coin flips** are separate RNG draws, resolved one at a time, and shown to both players. "Flip until tails" needs a cap only as a safety net against infinite loops in tests.
- **Copy limit and generated cards.** Generated cards don't count toward the 2-copy limit.
