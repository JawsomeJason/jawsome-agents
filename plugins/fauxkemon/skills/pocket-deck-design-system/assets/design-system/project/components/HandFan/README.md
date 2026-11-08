# HandFan

The player's hand as a fan of compact cards along the bottom edge. Measured: cards 22.6% of screen width (`size-card-hand`), top edge at 83% of height with the lower 40% of each card off-screen, fanned ±6°, centred.

## The consumer provides

A container with `class="pd-hand"` and `--n` (card count), whose children are `.pd-card` elements each with `--i` (index from 0). Mark the selected card with `aria-selected="true"`. Use a listbox pattern (`role="listbox"` on the hand, `role="option"` on cards) so arrow keys move between cards; tap-and-hold inspects.

## Rules

- The fan step is 6° (`--pd-fan-step`); tighten to 4° above seven cards. Cards overlap by 20% of their width.
- The selected card lifts 28px and straightens; hover lifts 16px on hover-capable pointers only.
- Play a card by pulling it upward out of the hand onto a slot. The opponent's hand is a row of CardBacks, never faces.
