# Toggle

The on/off switch: the battle screen's Auto toggle and the collection's Dex/Owned toggle. Measured: a 64×26px pill track with a 20px round knob; off is a pale `surface` track with a `surface-sunken` knob, on is a teal track with a white knob.

## The consumer provides

```
<label class="pd-toggle"><input type="checkbox" role="switch"><span class="pd-toggle__track"></span>Auto</label>
```

The label text sits to the right of the track, as in the original. The input is the control: it carries `checked`, `disabled` and focus; the track is decoration driven by `:checked`.

## Rules

- The on colour is `toggle-on`, not the original's `#00c4b4`, which fails 3:1 on `ground`; `toggle-on` holds it in both themes.
- Always a visible word. The original labels every toggle (Auto, Dex); so does this system.
- The knob travels 38px over `dur-fast` with `ease-out`; nothing else animates.
