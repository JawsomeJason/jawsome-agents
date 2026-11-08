# Stack tradeoffs and repo layout

## Contents

1. UI layer
2. Rendering cards and effects
3. State in the UI
4. Storage and offline
5. Repo layout
6. Commands

## 1. UI layer

| Option | Pros | Cons | Pick when |
| --- | --- | --- | --- |
| **React + React Aria Components** (default) | Accessible drag and drop (`useDrag`, `useDrop`, `DropZone`) with keyboard and screen-reader paths. Mature focus management for dialogs, menus and listboxes. The owner already knows both. | Bundle weight. Needs re-render discipline during animations. | Default for this project |
| Vanilla TS + web components | Smallest runtime. No framework churn. | You hand-build accessible drag and drop, focus traps and menus | The UI stays very small |
| Svelte or Solid | Fine-grained updates, small output | Smaller accessible-component ecosystem. Less owner familiarity. | A rewrite for performance, later |

Keep React out of the engine. Components subscribe to a small store that wraps the engine (section 3).

## 2. Rendering cards and effects

| Option | Use for | Avoid for |
| --- | --- | --- |
| **DOM + CSS** (default) | Cards, board, hand fan, flips (`transform: rotateY` with `backface-visibility`), holo sheen (layered gradients + `mix-blend-mode`, driven by custom properties from pointer or tilt), View Transitions between screens | Thousands of particles |
| WAAPI (`element.animate`) | Sequenced, interruptible animations with exact timing driven by engine events | Simple hover states (use CSS transitions) |
| Canvas or WebGL (PixiJS) | Particle bursts on rare pulls or KOs, layered on top of the DOM | Text, interactive cards, anything that needs accessibility |

If a WebGL layer becomes necessary, install the official PixiJS skills then (`npx skills add pixijs/pixijs-skills`), and keep it decorative: `aria-hidden`, pointer-events off, and turned off under reduced motion.

## 3. State in the UI

- The engine owns game state. A thin store holds `{ state, eventQueue }`, applies actions through the engine, and exposes `useSyncExternalStore` hooks.
- The UI plays the event queue in order (each event → one animation), then shows the next legal actions. While events play, input is limited to "skip animation".
- The AI runs in a Web Worker: post `(state, aiLevel)`, receive an action, apply it through the same store.
- Collection and deck state live in their own store backed by IndexedDB.

## 4. Storage and offline

- IndexedDB through a small wrapper (`idb` or `idb-keyval`). One object store per entity: `collection`, `decks`, `packLog`, `games`, `settings`. A `meta` store holds the schema version. Migrations are pure functions that run at startup.
- Card data ships as static JSON per set in the app bundle, so the game works offline from the first load.
- Card images, if the owner adds them, live in a separate cache (Cache Storage), filled once and never hotlinked during play.
- Ask for persistent storage (`navigator.storage.persist()`) so the browser doesn't evict the collection.
- Offer export and import of the whole save as a JSON file, so the collection survives a phone change.

## 5. Repo layout

```text
pokeclaude/
├── packages/
│   ├── engine/            # pure TS rules engine, effect ops, AI
│   │   ├── src/
│   │   └── test/          # rule tests, card tests, property tests, replays
│   └── data/              # import + normalize scripts, raw and built set JSON
├── apps/
│   └── web/               # Vite + React app
│       ├── src/
│       │   ├── design-system/   # tokens.css, bundle.css, fonts from the design-system skill
│       │   ├── screens/         # Home, Packs, Battle, Collection, Decks, Settings
│       │   └── components/      # compositions built from design-system primitives
│       └── e2e/           # Playwright device checks
└── docs/
```

Copy the design system's `tokens.css`, `bundle.css` and fonts into `apps/web/src/design-system/` once, and treat that folder as vendor code. Change tokens in the design system first, then re-copy.

## 6. Commands

Keep these four commands working at all times, so any agent can verify its work:

| Command              | Runs                                            |
| -------------------- | ----------------------------------------------- |
| `npm test`           | Engine and data tests (Vitest)                  |
| `npm run e2e`        | Playwright flows at the four viewport sizes     |
| `npm run dev`        | The web app                                     |
| `npm run data:check` | Validation and effect coverage for enabled sets |
