# Card data

Where to get card definitions, how good each source is, and how to normalize them into the engine's `CardDef` (see `engine-architecture.md`, section 2).

## Sources

The sources, with their access methods and licences, are listed in [../assets/data-sources.json](../assets/data-sources.json). In short: one open card database with a keyless API is the primary source (`primary`); two JSON compilations in public repositories are alternatives; the `pokeclaude` CSV is for deck-advice lookups only (see the warning below); and the community reference sites are for checking card text, rulings and per-set offering rates.

### Warning: the pokeclaude CSV isn't engine-grade

It was built for deck-advice queries, not for running a game. Checked against the repo at commit `cb33ba5`:

- The `abilities` column is empty for every row, so no Abilities.
- Trainer rows have no subtype and no effect text.
- `evolution_stage` is `Basic` for every non-Mega card: there is no Stage 1 or Stage 2 data, and `evolves_from` is empty for them.
- Mega cards' `evolves_from` is the Mega name with "Mega … ex" removed (for example Mega Blaziken ex → "Blaziken"), which isn't necessarily the real line (sources say Combusken → Mega Blaziken ex).
- No ♕ or Shiny rarities appear; about 248 rows have an empty rarity.
- No data for B4b, C1 or P-C.

Use it for quick lookups and deck-building ideas (its MCP tools are handy while developing), but import game data from the primary database or the MIT JSON compilation, and cross-check card text against a community reference site.

## Normalization pipeline

1. **Fetch** one set at a time into `data/raw/<set>.json`. Commit raw files, so imports are reproducible offline.
2. **Normalize** into `CardDef`: lowercase type ids, integer HP and damage, `stage`, `isEx` (name ends in " ex"), `isMega` (name starts with "Mega " and is ex), `tags`, Weakness type, Retreat Cost, attack costs as arrays of type ids, `boosters`.
3. **Parse effects** into effect ops (`engine-architecture.md`, section 5). Keep the original text alongside for display.
4. **Validate**: every Stage 1/2 has an `evolvesFrom` that exists in the pool; every attack cost uses known types; damage is a multiple of 10; each set's card count matches `sets-and-mechanics.md`.
5. **Emit** `public/data/<set>.json` and a coverage report (parsed / custom / missing per set).

## Art and copyright

Card names, numbers and game stats are facts the engine needs. Card art, card frames, logos and the game's own UI art belong to the rights holders. For a private build that never leaves the household, using official card images is the owner's call. The replica's own UI should still use original art and the `pocket-deck-design-system` components, and should never be published with official images.

Prefer loading images lazily from a local cache folder the owner fills, rather than hotlinking a third-party CDN: hotlinked images break offline play and depend on someone else's servers.
