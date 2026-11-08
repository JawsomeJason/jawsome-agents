# Packs, rarities and the economy

How collecting works in the original, which parts exist only to sell things, and what the replica does instead. Machine-readable odds are in `assets/pack-odds.json`.

## Contents

1. Standard pack odds
2. Rare Packs (God Packs)
3. Other pack formats
4. Rarity tiers and Pack Points
5. Picking a card within a rarity
6. Timers, currencies and Wonder Pick
7. Trading
8. What's monetized, and the replica's replacement
9. Making odds trustworthy

## 1. Standard pack odds

5 cards. Slots 1–3 are always ◊. Slots 4 and 5 roll on the table below. These are the in-game "Offering Rates" values for the A1 era.

| Rarity | Slots 1–3 | Slot 4  | Slot 5  |
| ------ | --------- | ------- | ------- |
| ◊      | 100%      | 0%      | 0%      |
| ◊◊     | 0%        | 90.000% | 60.000% |
| ◊◊◊    | 0%        | 5.000%  | 20.000% |
| ◊◊◊◊   | 0%        | 1.666%  | 6.664%  |
| ☆      | 0%        | 2.572%  | 10.288% |
| ☆☆     | 0%        | 0.500%  | 2.000%  |
| ☆☆☆    | 0%        | 0.222%  | 0.888%  |
| ♕      | 0%        | 0.040%  | 0.160%  |

Each column sums to 100% (within rounding). From Shining Revelry (A2b) on, Shiny rarities take a small slice from the ◊ tiers: ✵ 0.714% (slot 4) and 2.857% (slot 5); ✵✵ 0.333% and 1.333%. The fully recalibrated table differs per set; read each set's in-game Offering Rates (also mirrored on Bulbapedia's set pages) and store it per set. Re-normalize so each slot sums to exactly 1.

Reveal order: slots 1→5, so the rarest cards come last.

## 2. Rare Packs (God Packs)

- 0.05% of packs are Rare Packs; the other 99.95% roll normally.
- All 5 cards are ☆ or better: ☆ 40%, ☆☆ 50%, ☆☆☆ 5%, ♕ 5% per slot, uniform per eligible card.
- In Shiny-era sets, Rare Packs also include ✵ (25.641%) and ✵✵ (10.256%); store those per set.
- Decide "rare or normal" once per pack before rolling slots.

## 3. Other pack formats

| Format | Composition | Sets |
| --- | --- | --- |
| 6-card pack | 8.33% of packs. The first 5 cards are normal; the 6th is a Baby Pokémon (example Lugia pack: 29.03% for each ◊◊◊ Baby, 12.9% for the ☆ Pichu). | A4 and later regular sets (not Deluxe). Whether later 6th slots can hold Shinies is unconfirmed. |
| Deluxe pack | 4 cards, at least 1 guaranteed ◊◊◊◊ or better; includes parallel-foil variants. | A4b, B4b |
| Special Pack | Guaranteed ☆; opened with a weekly-refilling stamina in the original. First one: "First Partners" (dates in `assets/sets.json`, `milestones`). Secondary source only. | C1+ |

## 4. Rarity tiers and Pack Points

| Symbol | Name (physical equivalent) | Typical use | Pack Points to craft | Trade cost in original (Shinedust) |
| --- | --- | --- | --- | --- |
| ◊ | Common | Basics, Fossils | 35 | free |
| ◊◊ | Uncommon | Stage 1, most Trainers, Stadiums | 70 | free |
| ◊◊◊ | Rare | Stage 2, strong Pokémon | 150 | 1,200 |
| ◊◊◊◊ | Double Rare | ex / Mega ex | 500 | 5,000 |
| ☆ | Art Rare | Full-art non-ex | 400 | 4,000 |
| ☆☆ | Super / Special Art Rare | Full-art ex and Trainers | 1,250 | tradeable since B1 |
| ☆☆☆ | Immersive Rare | Animated, pack-exclusive | 1,500 | not tradeable |
| ♕ | Crown Rare | Gold | 2,500 | not tradeable |
| ✵ / ✵✵ | Shiny / Double Shiny (A2b+) | Shiny non-ex / ex | unconfirmed | tradeable since B1 |
| Parallel foil | A4b+ finish variant | Reprints | — | — |

Several sites swap the ◊◊◊◊ and ☆ Pack Point costs (400/500); most sources, including Pokémon Zone, give ◊◊◊◊ = 500 and ☆ = 400.

Pack Points in the original: +5 per pack opened, locked to that expansion, never expire. Promo cards can't be bought with them.

## 5. Picking a card within a rarity

Each booster variant has its own pool. Within a slot, once the rarity is rolled, pick uniformly among the cards of that rarity in that pack's pool. So a specific ☆☆☆ card's chance in slot 4 = 0.222% ÷ (number of ☆☆☆ cards in the pack's pool). Some cards appear in several packs of a set; model `boosters: string[]` per card.

## 6. Timers, currencies and Wonder Pick

| System | How it works in the original |
| --- | --- |
| Free pack timer | 1 pack per 12 h, store up to 2 (2 per day). |
| Pack Hourglass | −1 h on the pack timer. |
| Poké Gold | Paid currency (5 for $0.99 up to 690 for $99.99). −2 h per Gold on the pack timer, capped at 720 per day. Also buys cosmetics and bundles. |
| Premium Pass ($9.99 / month) | +1 pack per 24 h, Premium Missions (~11 Pack Hourglasses, 8 Wonder Hourglasses, 29 Premium Tickets a month), an exclusive promo shop. |
| Wonder Pick | Shows 5 face-down shuffled cards from a pack another player opened; you pick 1 at random. Costs Wonder Stamina by the pack's best rarity. Stamina: +1 per 12 h, max 5. |
| Chansey Pick / Bonus Pick | Event picks: Chansey = all 5 are event promos (2 stamina, 2.5% to appear); Bonus = free, 1 promo plus items, 20% to appear, expires in 30 min – 4 h. |
| Shop Tickets, Event Shop | Earned from missions and events; buy hourglasses, cosmetics, some cards. |
| Shinedust | Earned automatically from duplicates; spent on Flair (card effects) and trades. |
| Cosmetics | Sleeves, playmats, coins, backdrops, binder covers, display boards, emblems, icons, Flair. From B3, a gold frame for owning 10 copies of a ◊–◊◊◊ card. |

## 7. Trading

- Launched with A2. Friends only; same rarity only; costs Trade Stamina (refill 1 per 24 h, max 5, items to 8).
- Originally also needed Trade Tokens, earned by giving up rare cards. Widely criticized and removed in a mid-year update (date in `assets/sets.json`, `milestones`); Shinedust replaced them.
- B1: ☆☆ and Shinies became tradeable; newest-set cards tradeable without limits. ☆☆☆ and ♕ remain untradeable.

## 8. What's monetized, and the replica's replacement

| System | Monetized how | Replica |
| --- | --- | --- |
| Poké Gold | Bought directly; skips timers; buys bundles and cosmetics | Remove. |
| Premium Pass | Subscription; extra pack; exclusive promos | Remove; make every promo obtainable through play. |
| Pack timer and hourglasses | Scarcity that pushes spending | Unlimited packs, or an optional cosmetic timer the player can turn off. |
| Wonder Stamina | Gate refilled by paid items | Optional free mini-game: pick 1 of 5 face-down cards from a simulated pack. |
| Trade Stamina, Shinedust gates | Friction | Single player: duplicates turn into dust that crafts any card directly. |
| Paid bundles with exclusive cards | Some cards were unobtainable for free players | Every card is obtainable in-game. |
| Pack odds | Not paid directly, but drive spending | **Keep** them exactly: they are the feel of the game. Optionally add a visible pity counter. |

Keep the things that are fun on their own: pack opening, Pack Points as a pity/crafting system, the Dex, binders, missions as achievements, cosmetics earned by play.

## 9. Making odds trustworthy

- An "Offering Rates" screen per pack that reads from the same data the RNG uses.
- A pack history: every opening with its seed, date and result, replayable.
- Optional pity: guaranteed ◊◊◊◊+ every N packs, shown as a counter. Off by default to match the original's feel; the player decides.
- A test that simulates a million packs and asserts frequencies match the published table (see `engine-architecture.md`, section 9).
