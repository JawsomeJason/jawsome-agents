# BoardSlot

An Active or Bench position on the mat: empty, a drop target, or occupied with its floating HP, attached Energy and condition marker.

## Measured

- Empty slot: a translucent white rounded rectangle (`slot`, 10px radius) with a hairline `slot-edge`.
- Your Active card is 32% of screen width (`size-card-board`, 126px); your Bench and hand cards 22.6% (`size-card-hand`, 88px). The opponent's rows are foreshortened by the Board.
- Valid target: a cyan `glow` outer glow about 8–10px, no hard border, pulsing; unavailable spots are greyed.
- HP floats above the card's top-right corner (HpMeter); Energy badges (Ø 26px) stack along the card's bottom-left, overlapping its edge by about 3px; a condition icon sits under the HP.

## The consumer provides

`<div class="pd-slot" data-zone="active|bench">` containing nothing (empty; add `data-empty`) or a `.pd-card`; plus, when occupied, a `.pd-hp` (HpMeter), `.pd-slot__energy` (a row of `.pd-energy`) and `.pd-slot__status` (one `.pd-energy` recoloured by `data-type` as the condition marker: Poisoned psychic, Burned fire, Asleep water, Paralyzed lightning, Confused darkness, each with `role="img"` and the condition's name). Set `data-drop="valid"` on every legal target while a card or Energy is being moved, `data-drop="over"` on the one under the pointer or focus, and `data-drop="none"` on the rest. Droppable slots are buttons for keyboard users (`role="button"`, `tabindex="0"`, an `aria-label` like "Bench slot 2, empty").

## Rules

- Only legal targets highlight, all at once, the moment a drag or selection starts.
- The pulse stops under reduced motion; the glow stays.
- Hide the card's own `aria-label` (`aria-hidden`) inside a slot whose label already names it.
