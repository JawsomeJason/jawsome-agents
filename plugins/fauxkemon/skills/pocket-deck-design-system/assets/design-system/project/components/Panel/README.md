# Panel

The surface container: list groups, filter panels, sheets, dialogs, expansion tiles. Measured from the original: 24px corner radius, `surface` fill, a soft down-right shadow with a 1px lighter inner top edge, and on some panels a faint diagonal lighter sheen across the upper half.

## The consumer provides

Any element with `class="pd-panel"`; an optional `.pd-panel__title` heading and `.pd-panel__divider` rule inside. Dialog behaviour (focus trap, Escape, scrim) comes from the app's dialog primitive; the panel is only the surface.

## Attributes

| Attribute | Values |
| --- | --- |
| `data-elevation` | `2` for menus and popovers, `3` for dialogs (24px padding); default is resting |
| `data-tone` | `reward` (gold callout), `sunken` (well), `set` (an expansion tile: `--pd-hero` tint, default `hero-set`, with a lighter diagonal wedge) |
| `data-sheen` | the diagonal lighter wedge across the upper half |
| `data-sheet` | a bottom sheet: `surface-raised`, 20px top corners, square bottom |

## Rules

- Panels sit on `ground` or `board`, never inside another panel; nest with `data-tone="sunken"` instead.
- Dialogs: `data-elevation="3"` centred over `scrim`, bold `title`, a `.pd-panel__divider`, one cyan primary pill; the original blurs the screen behind.
- Sheets: `data-sheet`, a title bar with a divider, content, primary pill, and a close circle beneath on phone.
