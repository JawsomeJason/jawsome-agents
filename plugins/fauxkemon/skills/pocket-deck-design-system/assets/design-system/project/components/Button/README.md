# Button

The pill button: the one way to trigger an action. Measured from the original's screens: a full pill, 44px minimum height, 15px medium text, soft shadow, and a glossy lighter band across the top of coloured fills.

## Use it for

- `primary`: the main action on a screen or sheet (Open, OK, Battle!, Add). Cyan `brand` fill.
- `reward`: claiming something earned. Gold `reward` fill. Never for anything that spends.
- default (no variant): secondary actions in `surface` (Offering Rates, Cancel, Next, Change, Edit). The original pairs these with the primary pill at about 133×35px.
- `quiet`: low-emphasis text actions in lists and toolbars.
- `danger`: destructive actions (Delete deck, Concede), behind a confirmation.
- `strip`: the dark slate round buttons on the battle screen (menu, skip).
- `end-turn`: the End Turn pill: 101×36px, pale `surface-raised` fill with a 2px indigo-to-cyan hairline (`gradient-end-turn`), 16px text.

## The consumer provides

A native `<button>` (or `<a>` for navigation) with `class="pd-button"`, a `data-variant`, and a text label. Icon-only buttons add `aria-label` and a 22px SVG; round ones add `data-shape="circle"` (53px, the original's back and close circles) or `data-shape="circle" data-size="sm"` (35px, the battle menu button).

## Attributes

| Attribute | Values |
| --- | --- |
| `data-variant` | `primary`, `reward`, `danger`, `quiet`, `strip`, `end-turn`, or none |
| `data-size` | `sm` (35px) for pills beside a primary; `lg` (49px, the original's Share and Open pills) for hero actions |
| `data-shape="circle"` | round icon button; `data-icon-only` for a square one |
| `disabled` / `aria-disabled="true"` | greyed `surface-sunken` fill with `ink-subtle` text, no gloss, no shadow |

## Rules

- One `primary` per view. If two actions compete, one becomes the default pill.
- Every size keeps a `size-tap` (44px) hit area; `sm` and `end-turn` draw smaller but must sit in a 44px row.
- **Contrast tradeoff.** The original sets white text on its cyan pill, which fails 4.5:1. This system sets `on-brand` (a deep teal) on `brand` instead, so the pill reads and passes. Keep it; don't "fix" it back to white.
- Press feedback is a 1px drop with a 0.98 scale over `dur-instant`; hover tint only on hover-capable pointers.
- Labels are verbs in sentence case, the way the original writes them: "Open", "End Turn" is the one title-case exception because it's the original's label.
