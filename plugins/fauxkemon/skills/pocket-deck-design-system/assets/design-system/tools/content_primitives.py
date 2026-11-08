"""Primitive components: README.md + preview.html for each.

Every preview's first line is a `<!-- @dsCard group="…" height=N subtitle="…" -->` directive that the
build reads. Markup matches tools/components.css exactly; READMEs state the measured facts the CSS
encodes and the places this system deliberately differs from the original.
"""

TYPES = ["grass", "fire", "water", "lightning", "psychic", "fighting", "darkness", "metal", "dragon", "colorless"]

C = {}

ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
ICON_BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 7 4 12l5 5M4 12h11a5 5 0 0 1 0 10h-3"/></svg>'
ICON_MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
ICON_HELP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/></svg>'

C["Button"] = dict(
    readme="""# Button

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
A native `<button>` (or `<a>` for navigation) with `class="pd-button"`, a `data-variant`, and a text label. Icon-only buttons add `aria-label` and a 22px SVG. Round ones add `data-shape="circle"` (53px, the original's back and close circles) or `data-shape="circle" data-size="sm"` (35px, the battle menu button).

## Attributes
| Attribute | Values |
|---|---|
| `data-variant` | `primary`, `reward`, `danger`, `quiet`, `strip`, `end-turn`, or none |
| `data-size` | `sm` (35px) for pills beside a primary. `lg` (49px, the original's Share and Open pills) for hero actions |
| `data-shape="circle"` | round icon button. `data-icon-only` for a square one |
| `disabled` or `aria-disabled="true"` | greyed `surface-sunken` fill with `ink-subtle` text, no gloss, no shadow |

## Rules
- One `primary` per view. If two actions compete, one becomes the default pill.
- Every size keeps a `size-tap` (44px) hit area. `sm` and `end-turn` draw smaller but must sit in a 44px row.
- **Contrast tradeoff.** The original sets white text on its cyan pill, which fails 4.5:1. This system sets `on-brand` (a deep teal) on `brand` instead, so the pill reads and passes. Keep it. Don't "fix" it back to white.
- Press feedback is a 1px drop with a 0.98 scale over `dur-instant`. Hover tint only on hover-capable pointers.
- Labels are verbs in sentence case, the way the original writes them: "Open", "End Turn" is the one title-case exception because it's the original's label.
""",
    preview=f"""<!-- @dsCard group="Primitives" height=260 subtitle="primary · reward · default · quiet · danger · strip · end-turn · sizes · circles · disabled" -->
<div class="pd-app" style="display:grid;gap:var(--space-4);padding:var(--space-4);background:var(--ground)">
  <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:center">
    <button class="pd-button" data-variant="primary">Open</button>
    <button class="pd-button" data-variant="reward">Claim</button>
    <button class="pd-button">Offering Rates</button>
    <button class="pd-button" data-variant="quiet">View details</button>
    <button class="pd-button" data-variant="danger">Concede</button>
    <button class="pd-button" data-variant="strip">Skip</button>
    <button class="pd-button" data-variant="end-turn">End Turn</button>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:center">
    <button class="pd-button" data-variant="primary" data-size="lg">Share</button>
    <button class="pd-button" data-size="sm">Cancel</button>
    <button class="pd-button" data-variant="primary" data-size="sm">OK</button>
    <button class="pd-button" data-shape="circle" aria-label="Back">{ICON_BACK}</button>
    <button class="pd-button" data-shape="circle" aria-label="Close">{ICON_X}</button>
    <button class="pd-button" data-shape="circle" data-size="sm" data-variant="strip" aria-label="Battle menu">{ICON_MENU}</button>
    <button class="pd-button" data-shape="circle" data-variant="quiet" aria-label="Help">{ICON_HELP}</button>
    <button class="pd-button" data-variant="primary" disabled>Save</button>
  </div>
</div>
""")

C["Toggle"] = dict(
    readme="""# Toggle

The two-state switch: the battle screen's Auto toggle and the collection's Dex toggle, which switches between owned cards and the full Dex. Measured: a 64×26px pill track with a 20px round knob. Off is a pale `surface` track with a `surface-sunken` knob, on is a teal track with a white knob.

## The consumer provides
```
<label class="pd-toggle"><input type="checkbox" role="switch"><span class="pd-toggle__track"></span>Auto</label>
```
The label text sits to the right of the track, as in the original. The input is the control: it carries `checked`, `disabled` and focus. The track is decoration driven by `:checked`.

## Rules
- The on colour is `toggle-on`, not the original's `#00c4b4`, which fails 3:1 on `ground`. `toggle-on` holds it in both themes.
- Always a visible word. The original labels every toggle (Auto, Dex). So does this system.
- The knob travels 38px over `dur-fast` with `ease-out`. Nothing else animates.
""",
    preview="""<!-- @dsCard group="Primitives" height=120 subtitle="off · on · disabled" -->
<div class="pd-app" style="display:flex;flex-wrap:wrap;gap:var(--space-8);align-items:center;padding:var(--space-4);background:var(--ground)">
  <label class="pd-toggle"><input type="checkbox" role="switch"><span class="pd-toggle__track"></span>Auto</label>
  <label class="pd-toggle"><input type="checkbox" role="switch" checked><span class="pd-toggle__track"></span>Dex</label>
  <label class="pd-toggle"><input type="checkbox" role="switch" disabled><span class="pd-toggle__track"></span>Auto</label>
</div>
""")

C["Chip"] = dict(
    readme="""# Chip

A small pill for status, counts, tags and filters: the original's timer chips, "New" tags, count pills and the Energy picker's pills.

## Use it for
- Counts and tags on panels (`"1,025"` with a card icon, `"24/30"`, `"#MyCollection"`), timers on Wonder Pick cards.
- "New" on freshly pulled cards (`reward`).
- Deck validity ("Valid deck" in `success`, "Over 20 cards" in `danger`).
- Type pills in the deck builder's Energy picker and the Dex filters: a `<button class="pd-chip" aria-pressed>` with an Energy badge. Pressed pills take the dark `strip` fill with white text, as the original's selected Energy pills do.

## The consumer provides
A `<span>` (status) or `<button>` (filter) with `class="pd-chip"`, a tone, and a word. For type tones, set `data-type` on the chip. An Energy badge may lead the text.

## Attributes
| Attribute | Values |
|---|---|
| `data-tone` | `brand`, `reward`, `danger`, `success`, `strip`, `type`, `tint`, or none (neutral `surface`) |
| `data-type` | an Energy type, with `type` or `tint` tones |
| `aria-pressed` | on filter buttons. `true` renders the `strip` fill |

## Rules
- A chip always carries a word. Colour alone never carries meaning.
- Filter chips grow to 36px tall. Wrap them in a row with `space-2` gaps.
- Don't stack more than two chips on a board slot.
""",
    preview="""<!-- @dsCard group="Primitives" height=200 subtitle="status · tags · type tones · pressed filters" -->
<div class="pd-app" style="display:grid;gap:var(--space-3);padding:var(--space-4);background:var(--ground)">
  <div style="display:flex;flex-wrap:wrap;gap:var(--space-2)">
    <span class="pd-chip" data-tone="reward">New</span>
    <span class="pd-chip" data-tone="success">Valid deck</span>
    <span class="pd-chip" data-tone="danger">Over 20 cards</span>
    <span class="pd-chip">20 / 20</span>
    <span class="pd-chip">00 hr 58 min</span>
    <span class="pd-chip" data-tone="brand">MAX</span>
    <span class="pd-chip" data-tone="strip">#MyCollection</span>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:var(--space-2)">
    <span class="pd-chip" data-tone="type" data-type="psychic">Poisoned</span>
    <span class="pd-chip" data-tone="type" data-type="fire">Burned</span>
    <span class="pd-chip" data-tone="type" data-type="water">Asleep</span>
    <span class="pd-chip" data-tone="type" data-type="lightning">Paralyzed</span>
    <span class="pd-chip" data-tone="tint" data-type="grass">Grass</span>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:var(--space-2)" role="group" aria-label="Energy types">
    <button class="pd-chip" aria-pressed="true"><span class="pd-energy" data-type="grass" aria-hidden="true"></span>Grass</button>
    <button class="pd-chip" aria-pressed="false"><span class="pd-energy" data-type="water" aria-hidden="true"></span>Water</button>
    <button class="pd-chip" aria-pressed="false"><span class="pd-energy" data-type="fire" aria-hidden="true"></span>Fire</button>
    <button class="pd-chip" aria-pressed="false">ex only</button>
  </div>
</div>
""")

C["RainbowRule"] = dict(
    readme="""# RainbowRule

The 2px rule under section titles (My Cards, Wonder Pick, Display Boards) and the thin rule on Opening Results. Measured: full width, 2px tall, a horizontal lime-to-pink gradient (`gradient-rainbow`).

## The consumer provides
`<hr class="pd-rule">` directly under the title. `data-tone="brand"` gives the solid cyan rule used on Opening Results.

## Rules
- One per screen, under the title only. It is a section marker, not a divider between rows (rows use `line`).
- Titles above it are `title` (21px, 700) centred, as the original centres "My Cards".
""",
    preview="""<!-- @dsCard group="Primitives" height=160 subtitle="rainbow under a title · brand variant" -->
<div class="pd-app" style="display:grid;gap:var(--space-6);padding:var(--space-4) 0;background:var(--ground)">
  <div><h2 style="margin:0 0 var(--space-2);text-align:center;font-family:var(--font-display);font-size:21px;line-height:28px;font-weight:700">My Cards</h2><hr class="pd-rule"></div>
  <div><h2 style="margin:0 0 var(--space-2);text-align:center;font-family:var(--font-display);font-size:21px;line-height:28px;font-weight:700">Opening Results</h2><hr class="pd-rule" data-tone="brand"></div>
</div>
""")

badges = "\n".join(
    f'    <figure style="margin:0;display:grid;justify-items:center;gap:var(--space-1)"><span class="pd-energy" data-type="{t}" data-size="lg" role="img" aria-label="{t.capitalize()}"></span><figcaption style="font-size:12px;line-height:16px;font-weight:600;color:var(--ink-muted)">{t.capitalize()}</figcaption></figure>'
    for t in TYPES)
C["EnergyBadge"] = dict(
    readme="""# EnergyBadge

The round type disc used for Energy, attack costs, Weakness, the Energy Zone and type filters. Measured from the original's card renders: a glossy disc in the type's disc colour (`disc-*`) with a rim light at 35% 30%, a shade at the bottom, a thin dark ring, and a white (or dark, on light types) type glyph.

## Use it for
- Attached Energy on a board slot (26px, `size-energy-badge`), attack costs on cards (5.3% of card width, set by the card), Weakness (3.7% of card width), the Energy Zone orb (`xl`), type filters and the deck's Energy picker (`lg`).

## The consumer provides
`<span class="pd-energy" data-type="fire"></span>`. Give it `role="img"` and an `aria-label` ("Fire Energy") wherever it stands alone. Inside a labelled control or next to a type name, leave it decorative (`aria-hidden="true"`).

## Attributes
| Attribute | Values |
|---|---|
| `data-type` | `grass` `fire` `water` `lightning` `psychic` `fighting` `darkness` `metal` `dragon` `colorless` |
| `data-size` | `xs` 16px · `sm` 20px · default 26px (`size-energy-badge`) · `lg` 44px · `xl` 64px |
| `data-state="empty"` | an outlined placeholder (no Energy yet) |

## Rules
- The disc colours (`disc-*`, `disc-*-hi`, `disc-*-shade`) are measured from the original's cards. The glyph colour is `on-type-*`. Never recolour one without the other.
- Dragon and Colorless are types, not Energy: they never appear in the Energy Zone or the deck's Energy picker.
- The glyphs are this system's own single-ink drawings. Don't swap in the original's Energy symbols.
""",
    preview=f"""<!-- @dsCard group="Primitives" height=250 subtitle="10 types · 5 sizes · empty" -->
<div class="pd-app" style="display:grid;gap:var(--space-4);padding:var(--space-4);background:var(--ground)">
  <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:var(--space-3)">
{badges}
  </div>
  <div style="display:flex;gap:var(--space-3);align-items:center">
    <span class="pd-energy" data-type="water" data-size="xs" aria-hidden="true"></span>
    <span class="pd-energy" data-type="water" data-size="sm" aria-hidden="true"></span>
    <span class="pd-energy" data-type="water" aria-hidden="true"></span>
    <span class="pd-energy" data-type="water" data-size="lg" aria-hidden="true"></span>
    <span class="pd-energy" data-type="water" data-size="xl" aria-hidden="true"></span>
    <span class="pd-energy" data-type="water" data-size="lg" data-state="empty" aria-hidden="true"></span>
  </div>
</div>
""")

C["RarityMark"] = dict(
    readme="""# RarityMark

A row of rarity glyphs (◊ to ◊◊◊◊, ☆ to ☆☆☆, ♕, ✵ to ✵✵) for cards, lists and the odds table.

## The consumer provides
`<span class="pd-rarity" data-tier="star" role="img" aria-label="Rarity: 2 stars"><i></i><i></i></span>`: one empty `<i>` per glyph, and the rarity in words in `aria-label`.

## Attributes
| Attribute | Values |
|---|---|
| `data-tier` | `diamond` (default), `star`, `crown`, `shiny` |
| `font-size` | the glyph size. It inherits, so set it on the mark or its parent |

## Rules
- In the UI the glyphs take `rarity-*`, which hold 3:1 on `surface` in both themes. On a card face PocketCard swaps in the measured card colours (`card-rarity-*`: a dark olive diamond, indigo star, lime shiny, gold crown) at 4% of card width with a 4.08% pitch.
- Name rarities in words where a player decides something (odds, crafting costs). Glyphs alone are fine on card faces.
- The glyphs are this system's own drawings.
""",
    preview="""<!-- @dsCard group="Primitives" height=150 subtitle="◊–◊◊◊◊ · ☆–☆☆☆ · ♕ · ✵–✵✵" -->
<div class="pd-app" style="display:grid;grid-template-columns:repeat(4,max-content);gap:var(--space-3) var(--space-8);padding:var(--space-4);background:var(--ground);font-size:20px">
  <span class="pd-rarity" role="img" aria-label="Rarity: 1 diamond"><i></i></span>
  <span class="pd-rarity" role="img" aria-label="Rarity: 2 diamonds"><i></i><i></i></span>
  <span class="pd-rarity" role="img" aria-label="Rarity: 3 diamonds"><i></i><i></i><i></i></span>
  <span class="pd-rarity" role="img" aria-label="Rarity: 4 diamonds"><i></i><i></i><i></i><i></i></span>
  <span class="pd-rarity" data-tier="star" role="img" aria-label="Rarity: 1 star"><i></i></span>
  <span class="pd-rarity" data-tier="star" role="img" aria-label="Rarity: 2 stars"><i></i><i></i></span>
  <span class="pd-rarity" data-tier="star" role="img" aria-label="Rarity: 3 stars"><i></i><i></i><i></i></span>
  <span class="pd-rarity" data-tier="crown" role="img" aria-label="Rarity: crown"><i></i></span>
  <span class="pd-rarity" data-tier="shiny" role="img" aria-label="Rarity: 1 shiny"><i></i></span>
  <span class="pd-rarity" data-tier="shiny" role="img" aria-label="Rarity: 2 shiny"><i></i><i></i></span>
</div>
""")


def points(n, label, size=None, who="Your"):
    pips = "".join('<span class="pd-points__pip" data-filled></span>' if i < n else '<span class="pd-points__pip"></span>' for i in range(3))
    sz = f' data-size="{size}"' if size else ""
    lab = f'<span class="pd-points__label" aria-hidden="true">{label}</span>' if label else ""
    return f'<div class="pd-points"{sz} role="img" aria-label="{who} points: {n} of 3">{pips}{lab}</div>'


C["PointTracker"] = dict(
    readme="""# PointTracker

The three point discs in each player's strip. Measured: 13px discs. Unearned ones are dark (`point-empty`), earned ones become a gold coin (`reward`) with a blue italic numeral (`coin-ink`) counting 1, 2, 3.

## The consumer provides
A `role="img"` container with the score in words, three `.pd-points__pip` spans (`data-filled` on earned ones) and an optional visible `.pd-points__label`. The numeral on each coin is a CSS counter. Don't type it.

```
<div class="pd-points" role="img" aria-label="Your points: 2 of 3">
  <span class="pd-points__pip" data-filled></span><span class="pd-points__pip" data-filled></span><span class="pd-points__pip"></span>
</div>
```

## Attributes
| Attribute | Values |
|---|---|
| `data-size="lg"` | 24px coins for result screens and the VS screen |

## Rules
- Each strip shows its own tracker (PlayerStrip places it at the slanted end). Announce new points through the Banner, not the tracker.
- A coin fills over `dur-base` with `ease-pop`. An ex KO fills two, staggered by 80ms so the player can count.
- The numeral is decorative (`coin-ink` is not a text colour). The score lives in the `aria-label`.
""",
    preview=f"""<!-- @dsCard group="Primitives" height=130 subtitle="0 · 2 · 3 points · lg" -->
<div class="pd-app" style="display:flex;flex-wrap:wrap;gap:var(--space-8);align-items:center;padding:var(--space-4);background:var(--board)">
  {points(0, "0 / 3", who="Opponent's")}
  {points(2, "2 / 3")}
  {points(3, "3 / 3")}
  {points(2, None, size="lg")}
</div>
""")


def hp(value, mx, size=None, label="HP"):
    sz = f' data-size="{size}"' if size else ""
    return (f'<div class="pd-hp"{sz} style="--pd-hp:{value};--pd-hp-max:{mx}" role="meter" aria-valuenow="{value}" aria-valuemin="0" aria-valuemax="{mx}" aria-label="{label}">'
            f'<span class="pd-hp__value">{value}<small>HP</small></span><span class="pd-hp__track"><span class="pd-hp__fill"></span></span></div>')


C["HpMeter"] = dict(
    readme="""# HpMeter

The floating HP read-out on a board card. Measured from the battle screen: a heavy 28px numeral (`hp-ink`, Jost 800) with a white `board-rim` stroke floating above the card's top-right corner, and a 7px mint `hp` bar on a white track about 40% of the card's width.

## The consumer provides
```
<div class="pd-hp" style="--pd-hp:50;--pd-hp-max:120" role="meter" aria-valuenow="50" aria-valuemin="0" aria-valuemax="120" aria-label="HP">
  <span class="pd-hp__value">50<small>HP</small></span>
  <span class="pd-hp__track"><span class="pd-hp__fill"></span></span>
</div>
```
`--pd-hp` and `--pd-hp-max` are unitless numbers (the bare `--hp` name is the bar colour token, so the numbers take the component prefix). The fill width is computed from them. BoardSlot anchors the meter to the card's top-right. Elsewhere it stands alone.

## Attributes
| Attribute | Values |
|---|---|
| `data-size="sm"` | 20px numeral and a 38px track for Bench and opponent cards |
| `--pd-hp-track` | override the track width (default 52px, about 40% of an Active card) |

## Rules
- The number is always visible. The bar is a hint. The bar does not change colour at low HP (the original's stays mint). Say "low" in the label if the app wants to.
- The bar drains over `dur-slow` with `ease-out` after the damage number has shown.
- Printed HP on the card face is PocketCard's `.pd-card__hp`. This meter is only for cards in play.
""",
    preview=f"""<!-- @dsCard group="Primitives" height=150 subtitle="full · damaged · low · sm" -->
<div class="pd-app" style="display:flex;flex-wrap:wrap;gap:var(--space-8);align-items:end;padding:var(--space-4);background:var(--board)">
  {hp(120, 120)}
  {hp(50, 120)}
  {hp(20, 120)}
  {hp(60, 70, size="sm")}
</div>
""")

C["Panel"] = dict(
    readme="""# Panel

The surface container: list groups, filter panels, sheets, dialogs, expansion tiles. Measured from the original: 24px corner radius, `surface` fill, a soft down-right shadow with a 1px lighter inner top edge, and on some panels a faint diagonal lighter sheen across the upper half.

## The consumer provides
Any element with `class="pd-panel"`. An optional `.pd-panel__title` heading and `.pd-panel__divider` rule inside. Dialog behaviour (focus trap, Escape, scrim) comes from the app's dialog primitive. The panel is only the surface.

## Attributes
| Attribute | Values |
|---|---|
| `data-elevation` | `2` for menus and popovers, `3` for dialogs (24px padding). Default is resting |
| `data-tone` | `reward` (gold callout), `sunken` (well), `set` (an expansion tile: `--pd-hero` tint, default `hero-set`, with a lighter diagonal wedge) |
| `data-sheen` | the diagonal lighter wedge across the upper half |
| `data-sheet` | a bottom sheet: `surface-raised`, 20px top corners, square bottom |

## Rules
- Panels sit on `ground` or `board`, never inside another panel. Nest with `data-tone="sunken"` instead.
- Dialogs: `data-elevation="3"` centred over `scrim`, bold `title`, a `.pd-panel__divider`, one cyan primary pill. The original blurs the screen behind.
- Sheets: `data-sheet`, a title bar with a divider, content, primary pill, and a close circle beneath on phone.
""",
    preview="""<!-- @dsCard group="Primitives" height=330 subtitle="resting · sheen · raised · dialog · reward · set · sheet" -->
<div class="pd-app" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-4);padding:var(--space-4);background:var(--ground)">
  <section class="pd-panel"><h3 class="pd-panel__title">Missions</h3><p style="margin:0;color:var(--ink-muted)">Win 3 battles with a Grass deck.</p></section>
  <section class="pd-panel" data-sheen><h3 class="pd-panel__title">My Cards</h3><hr class="pd-panel__divider"><p style="margin:0;color:var(--ink-muted)">1,025 cards</p></section>
  <section class="pd-panel" data-elevation="2"><h3 class="pd-panel__title">Sort by</h3><p style="margin:0;color:var(--ink-muted)">Number · Rarity · Type</p></section>
  <section class="pd-panel" data-elevation="3"><h3 class="pd-panel__title" data-align="center">End your turn?</h3><hr class="pd-panel__divider"><p style="margin:0 0 var(--space-3);text-align:center;color:var(--ink-muted)">You still have Energy to attach.</p><div style="display:flex;gap:var(--space-2);justify-content:center"><button class="pd-button" data-size="sm">Back</button><button class="pd-button" data-variant="primary" data-size="sm">OK</button></div></section>
  <section class="pd-panel" data-tone="reward"><h3 class="pd-panel__title">+5 Pack Points</h3><p style="margin:0;color:var(--ink-muted)">35 more to craft any ◊◊◊◊ card.</p></section>
  <section class="pd-panel" data-tone="set"><h3 class="pd-panel__title">First Light</h3><p style="margin:0;color:var(--ink-muted)">3 packs · 226 cards</p></section>
  <section class="pd-panel" data-sheet style="grid-column:1/-1"><h3 class="pd-panel__title">Select Icon</h3><hr class="pd-panel__divider"><p style="margin:0;color:var(--ink-muted)">A bottom sheet: square bottom corners, raised fill.</p></section>
</div>
""")

MINI_CARD = ('<article class="pd-card" data-type="{t}" role="listitem" style="--pd-card-width:56px;flex:none" aria-label="{n}, {hp} HP"><div class="pd-card__frame"></div>'
             '<header class="pd-card__head"><h3 class="pd-card__name">{n}</h3><span class="pd-card__hp"><small>HP</small>{hp}</span><span class="pd-energy" data-type="{t}" aria-hidden="true"></span></header>'
             '<div class="pd-card__art"></div></article>')

C["SpeechBubble"] = dict(
    readme="""# SpeechBubble

The highlight bubble above the packs on the booster screen. Measured: a white rounded rectangle (20px radius) with an inset lighter inner frame and a centred downward tail about 24px wide and 12px tall. Inside, a horizontally scrolling strip of card thumbnails clipped at both sides.

## The consumer provides
`<div class="pd-bubble">` with a row of small `.pd-card` thumbnails (about 12.8% of screen width each, so around 50px on phone) in an `overflow-x: auto` strip. Give the strip `role="list"` and each card `role="listitem"` with an `aria-label`.

## Rules
- One bubble per screen, directly above the pack carousel, 71% of the screen width.
- The strip scrolls. It never wraps. Clip it so the first and last thumbnails are cut, which signals the scroll.
- Thumbnails are PocketCards at their smallest step (head and art only), not separate images.
""",
    preview=f"""<!-- @dsCard group="Primitives" height=190 subtitle="highlight bubble with a clipped strip of card thumbnails" -->
<div class="pd-app" style="display:grid;justify-content:center;padding:var(--space-6) var(--space-4) var(--space-8);background:var(--gradient-wall)">
  <div class="pd-bubble" style="width:277px">
    <div role="list" aria-label="Highlight cards" style="display:flex;justify-content:center;gap:var(--space-2);overflow:hidden;margin:0 calc(var(--space-3) * -1)">
      {MINI_CARD.format(t="grass", n="Sproutling", hp=60)}
      {MINI_CARD.format(t="fire", n="Emberwyrm", hp=140)}
      {MINI_CARD.format(t="water", n="Tidecrest", hp=70)}
      {MINI_CARD.format(t="lightning", n="Voltwhisk", hp=50)}
      {MINI_CARD.format(t="psychic", n="Auroralis", hp=120)}
    </div>
  </div>
</div>
""")
