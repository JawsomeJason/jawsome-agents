# EnergyZone

The Energy stand at the bottom-right of the board. Measured: a round pale stand Ø 15.2% of screen width (`size-energy-stand`, 59px) at (88.8%, 86%) of the screen. This turn's Energy sits on it as a large glossy orb. A 20px badge at the stand's lower-right previews the next turn's type. The opponent's is mirrored at (19%, 15%) and smaller (Ø 44px).

## The consumer provides

```
<div class="pd-energy-zone">
  <button class="pd-energy-zone__current" aria-label="Attach Fire Energy" aria-pressed="false"><span class="pd-energy" data-type="fire"></span></button>
  <span class="pd-energy-zone__next" role="img" aria-label="Next: Water"><span class="pd-energy" data-type="water"></span></span>
</div>
```

The current Energy is a button: drag it to a Pokémon, or press it (`aria-pressed="true"`) and then choose a slot. The stand glows in the type colour while an orb sits on it. When none is available (going first on turn 1, or already attached), render an empty badge (`data-state="empty"`) and disable the button with a reason in its label. Set `--size-energy-stand` to resize (the opponent's is 44px).

## Rules

- Anchor it bottom-right on phone, above the hand, in thumb reach.
- On attach, the orb flies to the target over `dur-slow` along an arc (`ease-in-out`) and shrinks into a 26px badge. The preview then promotes with `ease-pop`.
- Exactly one upcoming Energy is previewed, as in the original.
