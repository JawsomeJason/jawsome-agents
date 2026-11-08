# CardBack

The back of every card: decks, face-down setup, the opponent's hand.

## The consumer provides

`<div class="pd-card-back" role="img" aria-label="Face-down card"></div>` with a width through `--pd-card-width` (default `size-card-hand`, 88px).

## Rules

- Face-down cards are never interactive by themselves; the deck pile is a button that wraps a back.
- The opponent's hand is a row of backs at about 14.7% of screen width, fanned ±8°, clipped at the top edge.
- Flipping: put the back and the face in a 3D container and rotate over `dur-slow` with `ease-in-out`; with reduced motion, cross-fade instead.
- The pattern (silver frame, blue lattice, gold seal) is this system's own. Don't replace it with the original's card back.
