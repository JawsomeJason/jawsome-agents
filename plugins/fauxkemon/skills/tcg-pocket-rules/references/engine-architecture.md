# Engine architecture

A design for a rules engine that is correct, testable, replayable and shared by the UI and the AI. TypeScript is assumed; the shapes carry over to any language.

## Contents

1. Principles
2. State model
3. Actions and legal moves
4. The reducer and events
5. Effect ops
6. Randomness
7. AI opponent
8. Persistence
9. Testing plan

## 1. Principles

- **Pure core.** `apply(state, action, rng) → { state, events }`. No DOM, timers, storage or network inside the engine package.
- **One source of legality.** `legalActions(state, player)` is the only place rules decide what's allowed. The UI enables exactly those actions; the AI chooses among them; tests assert on them.
- **Events drive presentation.** The reducer emits an ordered list of events (`EnergyAttached`, `CoinFlipped`, `DamageDealt`, `KnockedOut`, `PointsAwarded`…). The UI animates events in order; it never infers what happened by diffing state.
- **Data over code.** Card behaviour is data (effect ops). A per-card script is the escape hatch, not the default.
- **Config over constants.** Anything that changed over the game's life lives in `RulesConfig`.

## 2. State model

```ts
type PlayerId = "p1" | "p2";
type EnergyType =
  | "grass"
  | "fire"
  | "water"
  | "lightning"
  | "psychic"
  | "fighting"
  | "darkness"
  | "metal";
type CardType = EnergyType | "dragon" | "colorless";
type Condition = "poisoned" | "burned" | "asleep" | "paralyzed" | "confused";

interface CardDef {
  // immutable, from card data
  id: string; // "A1-036"
  name: string; // copy-limit key
  category: "pokemon" | "trainer";
  trainerKind?: "item" | "supporter" | "tool" | "stadium" | "fossil";
  stage?: "basic" | "stage1" | "stage2";
  types?: CardType[]; // 1, or 2 from C1
  hp?: number;
  evolvesFrom?: string; // a name, not an id
  isEx?: boolean;
  isMega?: boolean;
  tags?: string[]; // 'ultra-beast', 'ancient', 'future', 'baby', owner prefixes
  weakness?: CardType;
  retreatCost?: number;
  ability?: AbilityDef;
  attacks?: AttackDef[];
  effects?: EffectOp[]; // trainers
  rarity: Rarity;
  set: string;
  number: number;
}

interface PokemonInPlay {
  uid: string; // instance id
  stack: string[]; // card uids, top = current form
  damage: number;
  energy: EnergyType[];
  tool?: string;
  conditions: Set<Condition>;
  enteredTurn: number; // blocks evolving the turn it was played
  evolvedTurn?: number; // one evolution per turn
  modifiers: Modifier[]; // "takes −20 until end of opponent's next turn", etc.
}

interface PlayerState {
  deck: string[]; // card uids, top = index 0
  hand: string[];
  discard: string[];
  discardEnergy: EnergyType[];
  active?: PokemonInPlay;
  bench: PokemonInPlay[]; // max 3
  points: number;
  zoneTypes: EnergyType[]; // 1..3
  zoneCurrent?: EnergyType;
  zonePreview: EnergyType;
  flags: {
    attachedZoneEnergy: boolean;
    retreated: boolean;
    supporterPlayed: boolean;
    stadiumPlayed: boolean;
  };
}

interface GameState {
  config: RulesConfig;
  turn: number; // game turn, 1-based
  current: PlayerId;
  firstPlayer: PlayerId;
  phase:
    | "setup"
    | "main"
    | "awaitingPromotion"
    | "awaitingChoice"
    | "checkup"
    | "ended";
  players: Record<PlayerId, PlayerState>;
  stadium?: { uid: string; owner: PlayerId };
  pendingChoice?: Choice; // "choose a Benched Pokémon", "choose 1 card"
  result?: { winner?: PlayerId; tie?: boolean; reason: string };
  rngState: string; // serializable seeded RNG state
  log: GameEvent[];
}
```

Keep card definitions (`CardDef`) separate from card instances (`uid`). Every zone holds uids; each uid maps to one definition. Assert after every action that each uid lives in exactly one zone.

## 3. Actions and legal moves

```ts
type Action =
  | { t: "placeActive"; uid: string }
  | { t: "placeBench"; uid: string }
  | { t: "confirmSetup" }
  | { t: "attachZoneEnergy"; target: string }
  | { t: "playBasic"; uid: string }
  | { t: "evolve"; uid: string; target: string }
  | { t: "playTrainer"; uid: string; targets?: string[] }
  | { t: "useAbility"; pokemon: string; targets?: string[] }
  | { t: "retreat"; to: string; energyToDiscard: EnergyType[] }
  | { t: "attack"; index: number; targets?: string[] }
  | { t: "choose"; selection: string[] } // answers pendingChoice
  | { t: "promote"; uid: string }
  | { t: "endTurn" }
  | { t: "concede" };
```

`legalActions` must cover: Bench space, evolution timing (turn 1 of either player, entered this turn, already evolved this turn), once-per-turn flags, attack cost against attached Energy (assign typed Energy first, then Colorless from the rest), conditions that block attacking or retreating, card-specific "can't" modifiers, and pending choices (when a choice is pending, only `choose` is legal).

Retreat with mixed Energy: let the player pick which Energy to discard. Default the UI to the cheapest choice that keeps the most attacks payable.

## 4. The reducer and events

Reducer phases per action:

1. Validate against `legalActions` (reject with a reason; never partially apply).
2. Pay costs (discard Energy, flip once-per-turn flags).
3. Resolve effect ops in order, pausing on a `pendingChoice` when an op needs a player decision.
4. Run KO checks → award points → open `awaitingPromotion` for each side that needs it → evaluate win conditions (section 6 of `battle-rules.md`).
5. If the action was an attack (or `endTurn`), run Checkup, KO checks again, advance turn, clear per-turn flags, draw, then run the Energy Zone step.

Emit events at each step. The turn transition itself is an event (`TurnStarted`), so the UI can show a banner.

## 5. Effect ops

A small vocabulary covers most Pocket card text. Write each op as a pure function on state.

| Op | Parameters | Examples |
| --- | --- | --- |
| `damage` | `amount`, `target` (defender, choice of opponent's Pokémon, each Benched…), `applyWeakness` | Snipe attacks, bench spread |
| `damageFormula` | `base`, `per` (energy on self/defender, Bench count, heads, damage on self), `amount` | "+30 for each Benched Pokémon", "30× heads" |
| `placeCounters` | `amount`, `target` | Effects that aren't damage |
| `heal` | `amount` or `all`, `target` | Potion, Erika |
| `draw` | `count` | Professor's Research |
| `search` | `filter`, `count`, `to` (hand, Bench), `random?` | Poké Ball (random Basic) |
| `attachEnergy` | `type`, `count`, `from` (zone, discard), `target filter` | Misty (per heads), Abilities |
| `moveEnergy` | `type?`, `from`, `to` | Dawn-style effects |
| `discardEnergy` | `count`, `type?`, `from` (self, defender), `random?` | Attack drawbacks, disruption |
| `switch` | `side` (self, opponent), `choice` (owner, opponent, filter) | Switch, Sabrina, Cyrus |
| `applyCondition` | `condition`, `target` | Poison, Sleep… |
| `coinFlip` | `count` or `untilTails`, `onHeads`, `onTails` | Most RNG cards |
| `modifier` | `kind` (damageTaken, damageDealt, retreatCost, cantAttack, cantRetreat, preventEffects), `amount`, `duration` (thisTurn, opponentsNextTurn, whileActive, whileInPlay) | Giant Cape, defensive attacks |
| `returnToHand` / `shuffleIntoDeck` | `target` | Bounce and recycle effects |
| `revealHand` / `lookAtTop` | `count` | Information effects |
| `createCard` | `cardId` | Generated cards (C1) |
| `custom` | `script` key | Anything the vocabulary can't express |

Workflow for card text:

1. Write template parsers for the common wordings ("Flip a coin. If heads, …", "This attack does X more damage for each …", "Heal X damage from …"). Each parser returns ops or `null`.
2. Every card whose text no parser handles gets a `custom` stub that throws "not implemented" in tests.
3. Track coverage per set (parsed / custom / missing) and show it in a dev page, so the playable pool is honest.
4. Every card with an effect gets at least one test that plays it.

## 6. Randomness

- Use a small seeded PRNG (for example xoshiro128** or a PCG variant) with serializable state. Never use `Math.random()` inside the engine.
- Separate streams: one per game (shuffles, coin flips, Energy Zone), one per pack opening. A pack-opening seed and its result go into the collection log, so the player can replay any pull.
- Unbiased shuffle: Fisher–Yates with an unbiased integer in `[0, i]` (rejection sampling, not `% n`).

## 7. AI opponent

Pocket has hidden information (hand, deck order, the next Energy beyond the preview). Pick the AI level per difficulty:

| Level | Method |
| --- | --- |
| Beginner | Random legal action, but always attack when an attack is payable. |
| Intermediate | Greedy: score each legal action by one-ply lookahead (points gained, KO threat removed, Energy progress toward the best attack, Bench development). |
| Advanced | Determinized search: sample the hidden state several times consistent with what's known, run a short lookahead or MCTS on each, and pick the action with the best average. Cap the time per decision (about 300 ms on a phone) and run it in a Web Worker. |

Heuristic features that matter in Pocket: points to win for each side; whether the opponent can KO our Active next turn; Energy needed for each of our attacks; ex and Mega exposure (2 and 3 points at risk); Bench count against the no-promotion loss; Weakness hits; condition damage at Checkup.

Solo-mode AI decks: ship prebuilt decks per set and difficulty (see `game-modes.md`).

## 8. Persistence

- Collection, decks, settings and pack logs go in IndexedDB with a **schema version** and pure migration functions per version.
- Save game state as JSON: the engine state is already serializable (uids, seed state). Autosave after each turn so a closed tab resumes mid-game.
- Store card definitions as bundled static JSON per set, versioned by data import date. Collection entries reference card ids, never embedded copies.

## 9. Testing plan

- **Rules tests** (Vitest): one test per rule in `battle-rules.md`, named by the rule.
- **Card tests**: for each card with an effect, build a minimal state, play the card, assert the events and resulting state.
- **Property tests**: random legal-action playouts from many seeds must never throw, must keep every uid in exactly one zone, must keep Bench ≤ 3 and damage a multiple of 10, and must end within the turn limit.
- **Replay tests**: a recorded `(seed, actions[])` must reproduce the same final state and event log byte for byte.
- **Odds tests**: open a million simulated packs per set; per-slot rarity frequencies must match `assets/pack-odds.json` within a tight tolerance.
