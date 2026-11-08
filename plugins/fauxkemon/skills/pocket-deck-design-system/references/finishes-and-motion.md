# Finishes and motion

How each card finish is built in `components/bundle.css`, how the tilt driver in `components/bundle.js` feeds it, and the motion timings with their confidence. [`../assets/motion.json`](../assets/motion.json) holds the same timings and spring constants as data.

## Contents

1. What the original does
2. Layer order and the driving variables
3. Each `data-finish`
4. The tilt driver
5. Reduced motion
6. Motion tokens

## 1. What the original does

The original's developers describe a card as stacked layers (UI, frame, background, illustration) with holo and effect layers added per rarity, a holo made by combining a phase texture with a gradient texture, and tilt smoothed with a spring-damper controller that adds a little response delay. Per rarity:

- ◊◊◊ adds a holo on the frame and a holo element in front of the illustration.
- ◊◊◊◊ ex renders the subject as a 3D model between front and back effect layers over a parallax background, with parts breaking out of the frame.
- ☆ and ☆☆ are full art with holo across the illustration, and a mask at the centre removes the reflection when the card faces forward.
- ☆☆☆ Immersive uses depth planes and a 30-second scene.
- ✵ Shiny adds a tilt-dependent trail glitter, a soft glow, a prism layer and a mirror-ball background.
- ♕ Crown is gold with a spiralling gold background and etched glitter.

Drivers are the gyroscope and touch drag. There is no idle shimmer. This system reproduces those behaviours with CSS gradients, blend modes and masks, never with the original's textures.

## 2. Layer order and the driving variables

Back to front inside `.pd-card`:

1. `.pd-card__frame`: the brushed-silver border (`border-box` gradient) and the type body (`padding-box` gradient), plus a soft white vignette behind the text region.
2. `.pd-card__art`: the bevelled art frame, then the placeholder, an `<img>`, or `.pd-card__layers` (parallax planes) inside it, with the dex strip on top.
3. `.pd-card::before`: the **frame holo**, a gradient masked to the border ring (`mask-composite: exclude`) so the body stays matte.
4. Text and pills (`z-index: 2`).
5. `.pd-card::after`: the **front effects** over the whole face (glare, prism bands, sparkle lattices), `z-index: 3`, `pointer-events: none`.

Every finish reads these custom properties, set on the card by the driver:

| Variable | Range | Drives |
| --- | --- | --- |
| `--pd-pointer-x`, `--pd-pointer-y` | 0–100% | where the glare sits and the `background-position` of every rainbow gradient |
| `--pd-tilt-x`, `--pd-tilt-y` | −1…1 | the card's `rotateY` and `rotateX` (12° and 10° at full tilt), the angle of the rainbow stripes, parallax layer offsets |
| `--pd-from-center` | 0…1 | how much the holo shows. Every reflection's opacity grows with it, so a face-on card is calm |
| `--pd-active` | 0…1 | glare strength (0.35 at rest, 1 while held) |

Parallax: `.pd-card__layer[data-depth="back"]` moves against the tilt (−2.5%), `mid` with it (1.5%) and `front` further (4%). With `data-art="layered"`, the front layer's top edge sits 14% above the art frame so it breaks out.

## 3. Each `data-finish`

| Finish | Rarity | Frame holo (`::before`) | Art and body | Front effects (`::after`) |
| --- | --- | --- | --- | --- |
| `sheen` | ◊, ◊◊ | none | matte | soft-light radial glare at the pointer |
| `foil` | ◊◊◊ | five-colour rainbow stripes, colour-dodge, opacity 0.25 + 0.6 × from-center. Stripe angle turns with `--pd-tilt-x` | `.pd-card__art::after` adds a white sweep plus type-tinted stripes over the illustration only (overlay) | soft radial glare |
| `ex` | ◊◊◊◊ | dark silver frame (`card-frame-ex`) under a six-colour rainbow, screen, 0.45 + 0.5 × from-center | parallax layers. The front plane breaks out above the art frame | glare plus two offset sparkle lattices (7% pitch), masked to the art window |
| `holo` | ☆, ☆☆ | a pale rainbow ring 1.6% wide (so the full-bleed art keeps an edge) | `data-art="full"`: art fills the card, text in `card-fullart-ink` with a `card-fullart-outline` stroke | full-face rainbow × fine phase rings, color-dodge, opacity 0.15 + 0.55 × from-center, under a **centre mask**: a 60% radial hole at the pointer whose alpha is 0.15 + 0.85 × from-center, so the art stays clear face-on and the holo rolls in as the card tilts |
| `immersive` | ☆☆☆ | charcoal frame (`card-frame-immersive`) | art in a 16%-radius window inset 4%, white 0.8% stroke, parallax layers | conic rainbow sheen rotating with `--pd-tilt-x`, color-dodge, 0.2 + 0.4 × from-center |
| `shiny` | ✵, ✵✵ | cyan-mint prism stripes (`card-frame-shiny`), opacity 0.8 | normal or full-art layout | glare, a diagonal prism streak whose angle follows `--pd-tilt-y`, and two staggered sparkle lattices (9% pitch) that drift with the pointer. Screen, 0.35 + 0.5 × from-center |
| `crown` | ♕ | gold stripes cycling gold → cream → teal (`card-frame-crown`), 0.6 + 0.4 × from-center | gold body (`card-crown-body-1`, `card-crown-body-2`) | warm sweep plus gold and teal stripes, overlay |
| `parallel` | reprint foils | none | matte art | fine 135° lines plus a glare, soft-light |

Dark theme switches the `holo` and `immersive` front layer to `overlay`, because color-dodge over a dark ground blows out.

Selection and drag states sit outside the finish. `aria-selected="true"` or `data-selected` adds a `glow` ring. `data-dragging` lifts to `shadow-3` and `z-drag`.

## 4. The tilt driver

`components/bundle.js` is a classic script that assigns `window.PocketDeck`:

| Member | Behaviour |
| --- | --- |
| `attachTilt(card, options?) → detach()` | Listens for pointer enter, move, down, up and leave on the card, and writes the variables above every animation frame through a spring. `options.gyro` (default true) lets device tilt drive this card once `requestTilt()` succeeds. `options.maxTilt` (0…1) scales the gyro range. `options.restPose` (`{x, y}` in %) is the pose used under reduced motion. Returns a function that removes the listeners and stops the frame loop. |
| `requestTilt() → Promise<boolean>` | Asks for device-orientation permission where a tap is required, then subscribes to `deviceorientation` for every attached card, relative to the orientation at activation and clamped to ±16° so a comfortable wrist turn sweeps the whole finish. Call it from a tap handler. Resolves false under reduced motion or without the API. |
| `version` | the driver's version string |

Spring: per frame `v += (target − x) × k; v *= 1 − d; x += v`. While a pointer is down or hovering it uses **follow** (k 0.12, d 0.32), which lags a little behind the finger. After release it uses **release** (k 0.035, d 0.18), which settles slowly back to centre. The loop sleeps after 30 settled frames. `--pd-active` springs toward 1 while interacting and back to 0 after. A mouse that only passes over (no `pointerenter` first) is ignored so stray moves do not wake cards.

Previews attach the driver after the document loads: `addEventListener('DOMContentLoaded', () => { if (window.PocketDeck) document.querySelectorAll('.pd-card').forEach((c) => PocketDeck.attachTilt(c)); })`.

## 5. Reduced motion

When `prefers-reduced-motion: reduce` matches, `attachTilt` sets a single off-axis pose (`--pd-pointer-x` 35%, `--pd-pointer-y` 30%, `--pd-from-center` 0.5, `--pd-active` 0.6) once and never animates, so the finish is visible but still. `requestTilt()` resolves false. The CSS drops the card's rotation transition, the slot pulse, the hand lift transitions and the pack strip's travel, and banners fade instead of sliding. Finishes stay, and parallax layers hold their rest offsets.

## 6. Motion tokens

Base tokens:

| Token         | Value | Use                             |
| ------------- | ----- | ------------------------------- |
| `dur-instant` | 90ms  | press                           |
| `dur-fast`    | 150ms | hover, toggles, selection       |
| `dur-base`    | 240ms | cards between zones, sheets     |
| `dur-slow`    | 380ms | flips, the Energy arc, HP drain |
| `dur-reveal`  | 620ms | the pack strip, rare beats      |
| `ease-out`    |       | default                         |
| `ease-in-out` |       | travel                          |
| `ease-pop`    |       | small overshoots                |
| `ease-in`     |       | exits                           |

Per-animation values, in ms. Confidence levels:

- **measured**: read from footage or the original's own statements.
- **observed**: described in writing without numbers.
- **estimate**: no source.

| Animation | Duration | Easing | Confidence |
| --- | --- | --- | --- |
| Pack tear | follows the finger | linear with the pointer | measured |
| Pack strip fly-off | 550 | `ease-in`, translate 24% −140%, rotate 18° | estimate |
| Pack light burst | 700 | `ease-out` | observed |
| Cards emerge from the pack | 700, stagger 20 | `linear(0, 0.6 40%, 1.03 75%, 1)` | estimate |
| Card reveal swipe | 300 | `cubic-bezier(.2,.7,.3,1)` | estimate |
| Next card settles | 400 | `linear(0, 1.02 70%, 1)` | estimate |
| Rare build-up hold | 800 | `ease-in` | observed |
| Rare build-up flash | 180 | linear | estimate |
| Fan out five | 450 | `ease-out` | estimate |
| Swipe up to register | 700 | `ease-out` | estimate |
| Summary grid | 500, stagger 50 | `ease-out` | estimate |
| New badge pop | 320 | `ease-pop` | estimate |
| Whole pack without skipping | about 25–40 s | None | observed |
| Wonder Pick shuffle | 2000 (300 per swap, 150 overlap) | `ease-in-out` | observed |
| Card inspect zoom | 400 | `ease-pop` | estimate |
| Card inspect spring back | 800 | spring release | estimate |
| Card tilt | continuous | spring follow | measured (driver), estimate (constants) |
| Immersive hold | 1800 | None | observed |
| Immersive enter | 800 | cinematic | estimate |
| Immersive scene | 30000 | None | measured |
| Immersive exit | 500 | cinematic | estimate |
| Coin toss | 1400 | arc + linear spin | estimate |
| Coin land wobble | 300 | `linear(0, 1.06, .98, 1)` | estimate |
| Setup snap | 250 | `linear(0, 1.04 70%, 1)` | estimate |
| Setup simultaneous reveal flip | 450, stagger 40 | `ease-in-out` | estimate |
| Turn banner | 200 in, 500 hold, 200 out | `ease-out` in, `ease-in` out | estimate |
| Draw | 400 | `ease-out`, small arc | estimate |
| Play to Bench (drop) | 300 | `linear(0, 1 60%, .94 75%, 1)` | estimate |
| Valid slot pulse | 1400 loop | `ease-in-out` | observed |
| Energy spawn | 350 | `linear(0, 1.08 70%, 1)` | estimate |
| Energy attach fly | 380 | `ease-in-out` | estimate |
| Energy pulse | 180 | `ease-out` | estimate |
| Evolve (flash 200) | 500 | `ease-out` | estimate |
| Tool attach | 300 | `ease-out` | estimate |
| Retreat swap | 450 | `ease-in-out` | estimate |
| Promote Active | 400 | `ease-in-out` | estimate |
| Attack: menu, zoom, banner, wind-up, lunge, flash, shake | 220, 300, 1300, 150, 120, 80, 250 | `ease-out`, `ease-pop` (banner), `ease-in` (wind-up), decaying sine (shake, 4px) | observed (banner), estimate |
| Damage number | 150 pop, 600 hold, 250 fade | `ease-out` | estimate |
| HP drain | 400 | `ease-out` | estimate |
| Condition marker | 300 | `ease-pop` | estimate |
| Checkup tick | 400 each | `ease-pop` | estimate |
| KO exit | 550 | `ease-in` | estimate |
| Point coin fill | 350, stagger 80 | `ease-pop` | estimate |
| Timer warning pulse | 1000 loop under 10 s (90 s turns, 45 s after a Ranked timeout, 20 min clock) | None | measured (limits), estimate (pulse) |
| Result slam | 600 | `linear(0, 1.08 70%, 1)` | estimate |
| Result hold | 2500 | None | observed |
| Result tally | 1000 | `ease-out` | estimate |
| Toast | 300 in, 2500 hold | `ease-out` | estimate |
| Level up | 1200 | `ease-out` | estimate |
| Pack Points count | 500 | `ease-out` | estimate |
| Skip | long press finishes every running animation | None | observed |

Motion rules:

- Keep interaction feedback at 150–300ms, transitions at 300–500ms and ceremonial moments (rare reveal, KO, result) at 600–1500ms.
- Keep overshoot small (2–8%) on pops and landings, and use none on cinematic moves.
- Run every animation so a long press can finish it.
- Never block game state on an animation.
