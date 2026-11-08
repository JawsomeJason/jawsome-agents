# UX and feel

What the original feels like, described so the replica can match the experience with its own original art and layout. Visual tokens and components come from the `pocket-deck-design-system` skill; this file is about behaviour and structure.

## Contents

1. Battle screen layout
2. Gestures and input
3. Pack opening
4. Card finishes by rarity
5. Navigation
6. Timing, sound and haptics
7. Larger screens

## 1. Battle screen layout (portrait phone)

Top to bottom:

1. Opponent's Bench (3 slots) along the top edge, opponent's points and hand count nearby.
2. Opponent's Active Spot in the upper middle.
3. A center line; the Stadium sits beside the Active Spots when one is in play.
4. Your Active Spot in the lower middle.
5. Your Bench (3 slots) below it.
6. Your hand fanned along the bottom edge.
7. The **Energy Zone stand at the bottom right**: the current Energy large on top, the preview Energy smaller in an inner circle.
8. Your points (0–3) and an End Turn / Attack control.

Each player's discard pile and deck count are reachable but out of the way.

## 2. Gestures and input

| Action | Gesture | Keyboard / accessible equivalent |
| --- | --- | --- |
| Attach Zone Energy | Drag from the Energy stand onto any of your Pokémon | Select Energy, then select a target |
| Play a Basic or evolve | Drag a hand card onto the Bench or onto a Pokémon | Select card, then select a target |
| Inspect a card | Tap (or long-press) for a large view | Enter / Space on a focused card |
| Attack | Tap your Active, choose an attack | Focus Active, choose from a menu |
| Retreat | From the Active's detail view | Same menu |

Every drag has a tap-to-select alternative, so the game works one-handed, with a mouse, and with a keyboard or switch control. Valid drop targets highlight when a drag or a selection starts. Invalid targets don't react.

Setup: Active is placed face-down, then both sides flip together.

## 3. Pack opening

1. Choose a set and a booster variant (each shows its featured art and its Offering Rates).
2. The pack sits center screen. Swipe across the top edge to cut it open; the cut follows the finger.
3. Cards come out as a stack. Swipe or tap to reveal one at a time, slot 1 to 5, so the rarest come last.
4. Rare cards get a distinct reveal: a held beat before the flip, a light burst, a stronger haptic.
5. Rare Packs and 6-card packs get their own announcement before the reveal ("Rare Pack!", "+1 card").
6. A summary grid at the end shows all cards with "New" badges and the Pack Points gained.

Keep the cut, flip and summary interruptible: a tap skips the current animation, never the reveal itself.

## 4. Card finishes by rarity

| Rarity | Finish |
| --- | --- |
| ◊–◊◊◊ | Standard frame, light sheen on tilt |
| ◊◊◊◊ (ex) | Foil frame |
| ☆ / ☆☆ | Full art; holographic sheen that follows tilt or pointer |
| ☆☆☆ Immersive | Full art plus an animated layer; tap and hold to enter a short animated scene |
| ✵ / ✵✵ Shiny | Sparkle that follows tilt |
| ♕ Crown | Gold treatment |
| Parallel foil | Shimmer pattern over a reprint |

Drive tilt from device orientation where permitted, else from pointer position. Respect `prefers-reduced-motion`: replace tilt-driven motion with a static sheen.

## 5. Navigation

Bottom tab bar: Home (packs, free pick, missions), My Cards (Dex, binders, decks), Battle (Solo, Versus), Social or Collection log, Menu (settings, odds, about). Keep the bar reachable by thumb and hide it during battles and pack openings.

## 6. Timing, sound and haptics

- Original timers: about 90 s per turn and 20 min per match. Replica default: off.
- No reputable public teardown of the original's animation timing, sounds or haptics exists. Tune by feel with the animation skills, and keep durations as design tokens.
- Use haptics (where supported) for: card cut, rare reveal, KO, win. Keep them optional in settings.

## 7. Larger screens

- **Tablet portrait**: same structure, larger cards, hand fan wider; card detail can open in a side sheet instead of a modal.
- **Tablet landscape and desktop**: board centered with the play log or card detail in a side column; keep the board's aspect ratio stable and scale it, rather than re-flowing slots.
- Pointer input gets hover previews; touch input never depends on hover.
