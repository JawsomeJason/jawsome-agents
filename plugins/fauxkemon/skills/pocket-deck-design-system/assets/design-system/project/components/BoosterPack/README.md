# BoosterPack

A sealed booster to choose and cut open, with this system's own wrapper. Measured: the pack's aspect is about 0.51 (width to height). The cut line is the lower edge of the header band, 8.5% from the top, and carries a faint glowing streak before it's touched. On the tear screen the pack is about 68% of screen width with its top edge at 47% of height, the body running off the bottom.

## The consumer provides

```
<button class="pd-pack" data-type="psychic" aria-label="Open Mind Bloom pack">
  <span class="pd-pack__top"></span><span class="pd-pack__cut"></span>
  <span class="pd-pack__body"><span class="pd-pack__variant">Booster</span><span class="pd-pack__set">Mind Bloom</span></span>
</button>
```

`data-type` picks the pack's colour (omit for `hero-battle`). `--pd-pack-width` sets the size. While the player swipes along the cut line, set `--pd-cut` (0–1) to the finger's position and `--pd-cut-visible: 1`. When the swipe passes 85% of the width, set `data-state="cut"`: the strip flies up-right while rotating about 18° and fades. Keyboard and switch users press the button to cut.

## Rules

- The tear follows the finger (direct manipulation), never a canned animation. The strip's fly-off and the light burst start on release.
- The pack picker shows three packs in a carousel (centre 42.6% W, sides 72% of that, yawed toward the centre) with a faint reflection beneath, an Offering Rates pill at bottom-left and a back circle.
- No price, timer or currency ever appears on or near a pack.
