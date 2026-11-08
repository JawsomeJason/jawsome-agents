# Open questions — check these in the real client

Each item has a default in `assets/rules-config.default.json` (or in data) so the engine doesn't block on it. When the owner confirms one in the real game, update the default and remove the item here.

| # | Question | Sources | Default | Config key |
| --- | --- | --- | --- | --- |
| 1 | Does the player going first draw a card on turn 1? | Pokémon Zone lists the draw with no exception; Game8's comparison table says the first player doesn't draw. | Draws | `firstPlayerDrawsOnTurn1` |
| 2 | How is the Energy Zone weighted when 2–3 types are selected? | Unpublished. | Uniform random | `energyZoneWeighting` |
| 3 | Is the draw skipped at 10 cards in hand? | Pokémon Zone only. | Skipped at 10 | `handCap` |
| 4 | Per-set Shiny-era slot odds and 6th-card odds | Per-set Offering Rates screens; only partially captured. | A1 table + Shiny slice | `assets/pack-odds.json` per set |
| 5 | Dual-type Weakness and support matching (C1) | Secondary sources (MMO Culture). | Attacks count as both types; support matches either | `dualTypeWeaknessMatchesEither` |
| 6 | Special Pack mechanics (C1+) | One secondary blog. | Guaranteed ☆ slot | data |
| 7 | Mega Evolution lines' `evolvesFrom` | Game8 examples say the previous stage (Combusken → Mega Blaziken ex); the pokeclaude CSV says the non-Mega form (Blaziken). | Read from TCGdex card data | data |
| 8 | The point at which the Mega 3-point rule began | Multiple sources say B1; one outlet says B3. | B1 | data |
| 9 | Exact damage-modifier order in rare edge cases | Adopted from the physical TCG. | `battle-rules.md` section 5 order | — |
| 10 | Ranked thresholds per season | Change every season. | Launch-era values | `ranked` |
