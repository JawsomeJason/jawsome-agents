# Sets and the mechanics each introduced

Use this to gate features by set (a card pool limited to A1 needs no Tools or Stadiums) and to know which rules a set's cards depend on. Release dates, card counts and the split between regular and secret cards live in [../assets/sets.json](../assets/sets.json), in release order. This file keeps the order and what each set introduced.

## Contents

1. Set table
2. Mechanics timeline
3. Headline archetypes
4. Using this in the engine

## 1. Set table

| Code | Name | Booster packs | Introduced or notable |
| --- | --- | --- | --- |
| P-A | Promo-A | none (events, missions, shop, Premium) | Promos can't be bought with Pack Points |
| A1 | Genetic Apex | Charizard, Mewtwo, Pikachu | Base ruleset, ex, Fossils, ◊–♕ rarities, Rare (God) Packs, Immersive ☆☆☆ cards |
| A1a | Mythical Island | 1 themed (Mew) | First themed mini-set. Mew ex, Celebi ex |
| A2 | Space-Time Smackdown | Dialga, Palkia | **Pokémon Tools**, **Burned** and **Confused**. Trading launched alongside. |
| A2a | Triumphant Light | Arceus | **Link Abilities** (Arceus) |
| A2b | Shining Revelry | 1 themed | **Shiny rarities ✵ and ✵✵**, first Gen 9 cards. Ranked Matches launched. |
| A3 | Celestial Guardians | Solgaleo, Lunala | **Rare Candy**, first Immersive Trainers, Leaf Cape and Poison Barb Tools |
| A3a | Extradimensional Crisis | 1 themed | **Ultra Beasts**, Beastite and Electrical Cord Tools |
| A3b | Eevee Grove | Eevee | Eevee ex Veevee 'volve (first evolvable ex), Eevee Bag |
| A4 | Wisdom of Sea and Sky | Ho-Oh, Lugia | **Baby Pokémon**, **6-card packs** |
| A4a | Secluded Springs | Suicune | Legendary-beast ex, Memory Light Tool |
| A4b | Deluxe Pack: ex | Deluxe (4-card) | **4-card packs, guaranteed ◊◊◊◊+**, **parallel foils**. Reprints every ex from A1–A4. |
| P-B | Promo-B | none | Second promo series |
| B1 | Mega Rising | Mega Gyarados, Mega Blaziken, Mega Altaria | **Mega Evolution ex (3 points)**. Trading expanded to ☆☆ and Shinies. |
| B1a | Crimson Blaze | 1 themed | Mega Venusaur, Charizard Y, Blastoise ex |
| B2 | Fantastical Parade | Mega Gardevoir (only 1 pack) | **Stadium cards** (for example Peculiar Plaza) |
| B2a | Paldean Wonders | 1 | Mesagoza Stadium. Chien-Pao ex, Gholdengo ex |
| B2b | Mega Shine | 1 themed | Shiny Mega ex prints |
| B3 | Pulsing Aura | 1 | Arena of Antiquity Stadium, Field Blower, gold frame for 10 copies |
| B3a | Paradox Drive | 1 | **Ancient** and **Future** tags, Area Zero Stadium, Booster Energy Capsules |
| B3b | Everyday Wonders | 1 | Kid's Room Stadium, Hisuian Pokémon |
| B4 | Ruler of the Skies | Mega Rayquaza | Deck sharing by 2D code |
| B4a | Team Rocket's Ambition | 1 | **"Team Rocket's" owner Pokémon**, Arcade Stadium |
| B4b | Deluxe Pack: Mega | Deluxe (4-card, guaranteed ex) | Reprints and parallel foils from B1–B4 |
| P-C | Promo-C | none | Count grows while the C series runs |
| C1 | Dual Fusion | Pikachu, Mega Mewtwo X | **Dual-type Pokémon**, return of Basic ex, Special Packs, unlimited rental decks, generated cards |

The C series reportedly moves from a 4-week to a 6-week release cycle. The projected C2 date in `sets.json` (`milestones.c2Projected`) is a projection, not an announcement.

## 2. Mechanics timeline

| Mechanic | First set | Engine impact |
| --- | --- | --- |
| ex (2 points), Fossils, Items, Supporters | A1 | Core |
| Poisoned, Asleep, Paralyzed | A1 | Core |
| Pokémon Tools, Burned, Confused | A2 | Tool slot per Pokémon. Two more conditions. |
| Link Abilities | A2a | Conditional Abilities ("while X is in play") |
| Rare Candy | A3 | Evolution that skips a stage |
| Ultra Beast tag | A3a | Tag-based filters |
| Evolvable Basic ex | A3b | Evolution permission from an Ability |
| Baby Pokémon, 6-card packs | A4 | 0-cost attacks. Pack format. |
| Deluxe 4-card packs, parallel foils | A4b | Pack format. A finish variant on reprints. |
| Mega Evolution ex (3 points) | B1 | Point value by kind. Mega evolution lines. |
| Stadiums | B2 | Shared board slot. Replacement rule. |
| Ancient and Future tags | B3a | Tag filters |
| Owner-named Pokémon | B4a | Name prefix matching |
| Dual-type, generated cards, Special Packs | C1 | Multi-type Weakness and support matching. Temporary cards. |

## 3. Headline archetypes

Use these to build Solo-mode AI decks and to test the engine against real strategies. Commas separate archetypes, and `+` joins the cards of one archetype.

| Set | Headline archetypes |
| --- | --- |
| A1 | Charizard ex, Mewtwo ex + Gardevoir, Pikachu ex |
| A1a | Mew ex, Celebi ex + Serperior |
| A2 | Dialga ex, Palkia ex, Darkrai ex, Garchomp, Cyrus |
| A2a | Arceus ex variants, Leafeon ex |
| A3 | Solgaleo ex, Lunala ex, Alolan Raichu ex, Rare Candy Stage 2 decks, Giratina ex + Greninja |
| A3a | Buzzwole ex, Guzzlord ex, Tapu Koko ex |
| A3b | Sylveon ex, Flareon ex |
| A4 | Ho-Oh ex, Lugia ex, Espeon ex |
| A4a | Suicune ex, Entei ex, Raikou ex |
| B1 | Mega Gyarados ex, Mega Blaziken ex, Mega Altaria ex, Mega Absol ex |
| B1a | Mega Charizard Y ex, Mega Venusaur ex |
| B2 | Mega Gardevoir ex, Mega Mawile ex, Teal Mask Ogerpon ex |
| B2a | Chien-Pao ex + Baxcalibur |
| B2b | Mega Gengar ex |
| B3 | Mega Lucario ex, Mega Sceptile ex |
| B3a | Miraidon ex, Koraidon ex, Flutter Mane ex |
| B3b | Milotic ex, Mega Diancie ex, Hisuian Zoroark ex |
| B4 | Mega Rayquaza ex, Mega Metagross ex, Mega Gallade ex |
| B4a | Team Rocket's legendary-bird ex |
| C1 | Mega Mewtwo X ex, Mega Greninja ex, Pikachu ex + Light Ball |

## 4. Using this in the engine

- Ship sets incrementally in release order. Before enabling a set, its mechanics from section 2 must exist and its cards must reach full effect coverage (see `engine-architecture.md`, section 5).
- A1 alone is a complete game: core rules, three conditions, Items, Supporters, Fossils and ex.
- Gate deck building by enabled sets. The 2-copy rule spans sets by name.
