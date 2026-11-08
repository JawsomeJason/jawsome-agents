"""Composition components: README.md + preview.html for each.

`card()` builds PocketCard markup from a dict so every preview (PocketCard, DexTile, BoardSlot, HandFan,
Board, SpeechBubble) shares one structure. Names and art are invented; the art is gradients.
"""

C = {}

# ----------------------------------------------------------------------------- card builder

ENERGY = '<span class="pd-energy" data-type="{t}"{extra}></span>'
HIDDEN = 'aria-hidden="true"'


def pips(types, label=None):
    extra = ' aria-hidden="true"'
    inner = "".join(ENERGY.format(t=t, extra=extra) for t in types)
    lab = f' aria-label="{label}"' if label else ""
    return f'<span class="pd-card__cost"{lab}>{inner}</span>'


def layers(spec):
    """spec: list of (depth, css-background) tuples -> .pd-card__layers markup."""
    out = "".join(f'<div class="pd-card__layer" data-depth="{d}" style="background:{bg}"></div>' for d, bg in spec)
    return f'<div class="pd-card__layers" aria-hidden="true">{out}</div>'


def card(c, width="250px", extra_attrs="", role=None):
    """Build a PocketCard from a dict. Keys: type, name, hp, stage, evolves, ex, finish, art ('full'|'layered'|None),
    layers (list), dex, ability (label-less dict: name, text), attacks (list of dicts: cost, name, damage, text),
    weakness (type, value), retreat (int), illus, rarity (tier, n), set, flavor, rule (text), kind ('trainer'),
    trainer ('item'|'supporter'), text (trainer body text)."""
    attrs = [f'data-type="{c["type"]}"'] if c.get("type") else []
    if c.get("kind"):
        attrs.append(f'data-kind="{c["kind"]}"')
        attrs.append(f'data-trainer="{c["trainer"]}"')
    if c.get("finish"):
        attrs.append(f'data-finish="{c["finish"]}"')
    if c.get("art"):
        attrs.append(f'data-art="{c["art"]}"')
    style = f' style="--pd-card-width:{width}"' if width else ""
    if role:
        attrs.append(role)
    if extra_attrs:
        attrs.append(extra_attrs)
    label = c.get("aria") or c["name"]
    ex = '<span class="pd-card__ex">ex</span>' if c.get("ex") else ""
    head_name = f'<h3 class="pd-card__name">{c["name"]}{ex}</h3>'
    parts = [f'<article class="pd-card" {" ".join(attrs)}{style} aria-label="{label}">', '<div class="pd-card__frame"></div>']
    if c.get("kind") == "trainer":
        kind_word = c["trainer"].capitalize()
        parts.append(f'<div class="pd-card__band" aria-hidden="true"><b>{kind_word}</b><i>TRAINER</i></div>')
        parts.append(f'<header class="pd-card__head">{head_name}</header>')
    else:
        parts.append(f'<span class="pd-card__stage">{c.get("stage", "Basic")}</span>')
        if c.get("evolves"):
            parts.append(f'<span class="pd-card__evolves"><i aria-hidden="true"></i><span>Evolves from {c["evolves"]}</span></span>')
        parts.append(f'<header class="pd-card__head">{head_name}<span class="pd-card__hp"><small>HP</small>{c["hp"]}</span>'
                     f'<span class="pd-energy" data-type="{c["type"]}" role="img" aria-label="{c["type"].capitalize()} type"></span></header>')
    art = ['<div class="pd-card__art" role="img" aria-label="Card art">']
    if c.get("layers"):
        art.append(layers(c["layers"]))
    if c.get("dex"):
        art.append(f'<span class="pd-card__dex">{c["dex"]}</span>')
    art.append("</div>")
    parts.append("".join(art))
    body = ['<div class="pd-card__body">']
    if c.get("kind") == "trainer":
        body.append(f'<p class="pd-card__text">{c["text"]}</p>')
    else:
        if c.get("ability"):
            a = c["ability"]
            body.append(f'<div class="pd-card__ability"><span class="pd-card__ability-label">Ability</span><span class="pd-card__ability-name">{a["name"]}</span><p class="pd-card__text">{a["text"]}</p></div>')
        for a in c.get("attacks", []):
            row = [f'<div class="pd-card__attack">{pips(a["cost"], a.get("costLabel"))}<span class="pd-card__attack-name">{a["name"]}</span><span class="pd-card__damage">{a.get("damage", "")}</span>']
            if a.get("text"):
                row.append(f'<p class="pd-card__text">{a["text"]}</p>')
            row.append("</div>")
            body.append("".join(row))
    body.append("</div>")
    parts.append("".join(body))
    if c.get("kind") != "trainer":
        wt, wv = c.get("weakness", ("fire", "+20"))
        retreat = "".join(ENERGY.format(t="colorless", extra=' aria-hidden="true"') for _ in range(c.get("retreat", 1)))
        parts.append(f'<footer class="pd-card__foot"><span>Weakness <span class="pd-energy" data-type="{wt}" role="img" aria-label="{wt.capitalize()}"></span><b>{wv}</b></span>'
                     f'<span>Retreat <span role="img" aria-label="Retreat cost {c.get("retreat", 1)}">{retreat}</span></span></footer>')
    if c.get("illus"):
        parts.append(f'<span class="pd-card__illus">Illus. {c["illus"]}</span>')
    tier, n = c.get("rarity", ("diamond", 1))
    words = {"diamond": "diamond", "star": "star", "shiny": "shiny", "crown": "crown"}[tier]
    marks = "<i></i>" * n
    tier_attr = f' data-tier="{tier}"' if tier != "diamond" else ""
    parts.append(f'<div class="pd-card__meta"><span class="pd-rarity"{tier_attr} role="img" aria-label="Rarity: {n} {words}{"s" if n > 1 and tier != "crown" else ""}">{marks}</span>'
                 f'{"<span>" + c["set"] + "</span>" if c.get("set") else ""}</div>')
    if c.get("rule"):
        tab = ' data-tab="ex rule"' if c.get("kind") != "trainer" else ""
        parts.append(f'<p class="pd-card__rule"{tab}>{c["rule"]}</p>')
    elif c.get("flavor"):
        parts.append(f'<p class="pd-card__flavor">{c["flavor"]}</p>')
    parts.append("</article>")
    return "".join(parts)


# Invented cards. Art is gradient stand-ins, never creature drawings.
SKY = "linear-gradient(180deg, #cfe9ff, #eef6ff)"
BASIC = dict(
    type="grass", name="Sproutling", hp=60, stage="Basic", finish="sheen",
    dex="No. 0001 · Seed Pokémon · HT: 2'04\" WT: 15.2 lbs",
    attacks=[dict(cost=["grass"], costLabel="Cost: 1 Grass", name="Vine Tap", damage="20"),
             dict(cost=["grass", "colorless"], costLabel="Cost: 1 Grass, 1 Colorless", name="Seed Volley", damage="30+", text="Flip a coin. If heads, this attack does 20 more damage.")],
    weakness=("fire", "+20"), retreat=1, illus="A. Fern", rarity=("diamond", 1), set="PD1 · 001",
    flavor="It stores sunlight in the bud on its back and opens it only on cloudless days.",
    aria="Sproutling, Basic Grass Pokémon, 60 HP",
)
STAGE1 = dict(
    type="grass", name="Thornbrush", hp=100, stage="Stage 1", evolves="Sproutling", finish="foil",
    dex="No. 0002 · Bramble Pokémon · HT: 3'03\" WT: 28.7 lbs",
    attacks=[dict(cost=["grass", "grass"], costLabel="Cost: 2 Grass", name="Razor Leaf", damage="50"),
             dict(cost=["grass", "grass", "colorless"], costLabel="Cost: 2 Grass, 1 Colorless", name="Bramble Wall", damage="60", text="During your opponent's next turn, this Pokémon takes 20 less damage from attacks.")],
    weakness=("fire", "+20"), retreat=2, illus="A. Fern", rarity=("diamond", 3), set="PD1 · 002",
    flavor="Its thorns grow back overnight, sharper than before.",
    aria="Thornbrush, Stage 1 Grass Pokémon, 100 HP, evolves from Sproutling",
)
EX = dict(
    type="fire", name="Emberwyrm", ex=True, hp=140, stage="Basic", finish="ex", art="layered",
    layers=[("back", "radial-gradient(80% 60% at 60% 30%, #ffd9a8, #f26a3d 70%)"),
            ("mid", "radial-gradient(40% 40% at 30% 70%, rgba(255,120,60,.9), transparent 70%)"),
            ("front", "radial-gradient(28% 36% at 55% 48%, #7a1a0a 0 40%, transparent 42%)")],
    dex="No. 0036 · Cinder Pokémon · HT: 5'07\" WT: 199.5 lbs",
    ability=dict(name="Kindle", text="Once during your turn, you may take a Fire Energy from your Energy Zone and attach it to this Pokémon."),
    attacks=[dict(cost=["fire", "fire", "colorless"], costLabel="Cost: 2 Fire, 1 Colorless", name="Blaze Coil", damage="90")],
    weakness=("water", "+20"), retreat=2, illus="R. Sol", rarity=("diamond", 4), set="PD1 · 036",
    rule="When your Pokémon ex is Knocked Out, your opponent gets 2 points.",
    aria="Emberwyrm ex, Basic Fire Pokémon ex, 140 HP",
)
FULLART = dict(
    type="water", name="Tidecrest", hp=70, stage="Basic", finish="holo", art="full",
    layers=[("back", "linear-gradient(180deg, #0b3a6b, #2f8fd6 55%, #a8e1ff)")],
    attacks=[dict(cost=["water"], costLabel="Cost: 1 Water", name="Undertow", damage="30"),
             dict(cost=["water", "water"], costLabel="Cost: 2 Water", name="Tidal Lock", damage="40", text="Your opponent's Active Pokémon can't retreat during their next turn.")],
    weakness=("lightning", "+20"), retreat=1, illus="M. Reef", rarity=("star", 1), set="PD1 · 231",
    aria="Tidecrest, Basic Water Pokémon, 70 HP, full art",
)
IMMERSIVE = dict(
    type="psychic", name="Auroralis", ex=True, hp=150, stage="Basic", finish="immersive", art="full",
    layers=[("back", "linear-gradient(200deg, #1b0e3a, #5b2a9b 50%, #c9a8ff)"),
            ("mid", "radial-gradient(60% 50% at 50% 60%, rgba(255,255,255,.35), transparent 70%)"),
            ("front", "radial-gradient(30% 30% at 50% 55%, rgba(255,214,255,.9), transparent 60%)")],
    attacks=[dict(cost=["psychic", "psychic", "colorless"], costLabel="Cost: 2 Psychic, 1 Colorless", name="Dreamveil", damage="120")],
    weakness=("darkness", "+20"), retreat=2, illus="K. Noctis", rarity=("star", 3), set="PD1 · 280",
    rule="When your Pokémon ex is Knocked Out, your opponent gets 2 points.",
    aria="Auroralis ex, Basic Psychic Pokémon ex, 150 HP, immersive",
)
SHINY = dict(
    type="lightning", name="Voltwhisk", hp=50, stage="Basic", finish="shiny",
    layers=[("back", "radial-gradient(70% 60% at 50% 40%, #fff9c4, #c8f0ff 60%, #e9ddff)")],
    dex="No. 0173 · Static Pokémon · HT: 1'00\" WT: 4.4 lbs",
    attacks=[dict(cost=["lightning"], costLabel="Cost: 1 Lightning", name="Spark Nip", damage="20")],
    weakness=("fighting", "+20"), retreat=1, illus="J. Arc", rarity=("shiny", 1), set="PD2 · 088",
    flavor="Its whiskers crackle whenever a storm is near.",
    aria="Voltwhisk, Basic Lightning Pokémon, 50 HP, shiny",
)
CROWN = dict(
    type="colorless", name="Regalune", ex=True, hp=160, stage="Basic", finish="crown", art="full",
    layers=[("back", "conic-gradient(from 20deg at 50% 45%, #fcd518, #fff3a8, #d9b321, #fcd518)"),
            ("front", "radial-gradient(35% 40% at 50% 50%, rgba(255,255,255,.55), transparent 65%)")],
    attacks=[dict(cost=["colorless", "colorless", "colorless"], costLabel="Cost: 3 Colorless", name="Lunar Crest", damage="130")],
    weakness=("fighting", "+20"), retreat=2, illus="S. Aurum", rarity=("crown", 1), set="PD1 · 284",
    rule="When your Pokémon ex is Knocked Out, your opponent gets 2 points.",
    aria="Regalune ex, Basic Colorless Pokémon ex, 160 HP, crown rare",
)
ITEM = dict(
    kind="trainer", trainer="item", name="Mending Salve", finish="sheen",
    text="Heal 20 damage from 1 of your Pokémon.",
    rule="You may play any number of Item cards during your turn.",
    rarity=("diamond", 1), set="PD1 · 219", illus="T. Vial", aria="Mending Salve, Item",
)
SUPPORTER = dict(
    kind="trainer", trainer="supporter", name="Coach Mira", finish="sheen",
    text="Draw 2 cards.",
    rule="You may play only 1 Supporter card during your turn.",
    rarity=("diamond", 2), set="PD1 · 225", illus="L. Vane", aria="Coach Mira, Supporter",
)

TILT_SCRIPT = """<script>
  // bundle.js loads after the preview, so wait for the document before attaching the tilt driver.
  addEventListener('DOMContentLoaded', () => {
    if (window.PocketDeck) document.querySelectorAll('.pd-card').forEach((card) => PocketDeck.attachTilt(card));
  });
</script>"""

C["PocketCard"] = dict(
    readme="""# PocketCard

The card face. Its geometry is measured from the original's card renders and expressed in container units (`cqi`, 1% of card width; vertical positions converted from % of card height), so one markup scales from the 88px hand card to the 320px inspector. The frame, glyphs and art are this system's own.

## Measured anatomy (Pokémon card)
| Part | Position (% of width unless noted) |
|---|---|
| Frame | brushed-silver border 4% thick (`card-frame`, highlight, shade); body in the type's measured pair (`card-*`, `card-*-edge`) |
| Stage pill | x 2.5, y 4.36%H, 14.5 × 3.52%H, 2.2 text |
| Name | from x 18, 6.6 text, 700; `ex` suffix in gold italic Jost |
| HP | right-aligned at 87.17, 6.9 Jost 800 with a 3.2 "HP" label |
| Type disc | centre 91.3 × 6.2%H, Ø 6.5 |
| Evolves-from | octagonal thumb 11.83 × 6.91%H at (4, 7.76%H) and a slanted band |
| Art frame | (7.33, 9.21%H) 85.5 × 41.33%H, bevelled; illustration 1 in; dex strip 2.18%H along the bottom |
| Body | 50.9%H to 85.8%H; attacks centre, or stack from the top when an Ability leads |
| Ability | red pill 22.5 × 3.15%H at 53.82%H, name at x 30.83 in 5.0 |
| Attack row | pips Ø 5.3 from x 9.25, name at x 30.5 in 4.9, damage right at 93.33 in 6.2 Jost; effect text 3.8 |
| Footer | Weakness pill 7.33–48.33, Retreat pill 52–93, both 3.27%H at 85.82%H |
| Illus. / rarity | x 6.67 at 89.58%H (2.0) and x 7 at 91.27%H (glyphs 4 wide, 4.08 pitch) |
| Flavour | right-aligned block at 93.17 from 90.18%H, max 48.3 wide, 2.7 italic |
| ex rule | gold slanted slab 33.33–96 at 90.67%H, 6.18%H tall, with a black "EX RULE" tab |

Trainers: a header band at 3.27%H with the kind at left and TRAINER at right, the name at x 5.67 (6.3), the art frame from 13.58%H, centred 4.0 text, and a kind-coloured rule box 31.67–96 at 88.97%H.

## The consumer provides
`<article class="pd-card">` with `data-type` (or `data-kind="trainer" data-trainer="item|supporter"`), a width through `--pd-card-width`, an `aria-label` reading the essentials, and these children in order:

1. `.pd-card__frame` (empty: carries the border and body)
2. `.pd-card__stage` ("Basic", "Stage 1") and optional `.pd-card__evolves` (`<i></i><span>Evolves from X</span>`); trainers use `.pd-card__band` (`<b>Item</b><i>TRAINER</i>`) instead
3. `header.pd-card__head`: `h3.pd-card__name` (optional `span.pd-card__ex`), `span.pd-card__hp` (`<small>HP</small>60`), a `.pd-energy` type disc
4. `.pd-card__art`: optionally an `<img>` or `.pd-card__layers > .pd-card__layer[data-depth="back|mid|front"]` with inline backgrounds, plus `.pd-card__dex` text
5. `.pd-card__body`: optional `.pd-card__ability` (`.pd-card__ability-label`, `.pd-card__ability-name`, `p.pd-card__text`) and `.pd-card__attack` rows (`.pd-card__cost` of `.pd-energy` pips, `.pd-card__attack-name`, `.pd-card__damage`, optional `p.pd-card__text`)
6. `footer.pd-card__foot`: `<span>Weakness <span class="pd-energy" data-type="fire"></span><b>+20</b></span><span>Retreat <span>…pips…</span></span>`
7. `.pd-card__illus`, `.pd-card__meta` (RarityMark and set code), and either `p.pd-card__flavor` or `p.pd-card__rule[data-tab="ex rule"]`

Attack costs carry an `aria-label` ("Cost: 2 Fire, 1 Colorless"); the type disc has `role="img"`.

## Attributes
| Attribute | Values |
|---|---|
| `data-type` | the Pokémon's type: body colours, disc, placeholder art tint |
| `data-kind="trainer"` + `data-trainer` | `item` (blue) or `supporter` (orange) |
| `data-art` | `full` (☆ and up: art fills the card, text stroked in `card-fullart-outline`), `layered` (parallax layers, the front one may break out of the art frame) |
| `data-finish` | `sheen` (◊, ◊◊), `foil` (◊◊◊), `ex` (◊◊◊◊), `holo` (☆, ☆☆), `immersive` (☆☆☆), `shiny` (✵), `crown` (♕), `parallel` |
| `--pd-card-width` | any length; default `size-card-inspect` (320px) |
| `aria-selected="true"` / `data-selected`, `data-dragging` | selected glow; dragging shadow |

## Size steps
Container queries hide what can't be read: below 220px the effect text, flavour, rule, illustrator, dex line and evolves band go; below 140px only the frame, name, HP, type disc and art remain (the hand and Bench size).

## Finishes and tilt
Finishes read `--pd-pointer-x/y` (0–100%), `--pd-tilt-x/y` (-1…1), `--pd-from-center` (0…1) and `--pd-active` (0…1). `bundle.js` sets them: `PocketDeck.attachTilt(card)` returns a detach function; `PocketDeck.requestTilt()` asks for gyro permission from a tap. Under reduced motion the driver sets one off-axis pose and the card does not rotate. Layer order: body → illustration → frame holo (`::before`) → front effects (`::after`). See `finishes-and-motion.md` in the skill references.

## Rules
- Geometry is the contract. Don't move parts with inline styles; change `components.css` and re-render.
- Never set px font sizes inside a card; everything is `cqi`.
- Art is an `<img>` cropped with `object-fit: cover`, or gradient layers. Without either, the type-tinted placeholder shows.
- The frame, pills, glyphs and art are this system's. Never ship the original's frames, symbols, logos or illustrations.
""",
    preview=f"""<!-- @dsCard group="Cards" height=1420 subtitle="◊ sheen · ◊◊◊ foil · ex (layered) · ☆ full-art holo · ☆☆☆ immersive · ✵ shiny · ♕ crown · Item · Supporter · size steps" -->
<div class="pd-app" style="display:grid;gap:var(--space-6);padding:var(--space-6);background:var(--ground)">
  <div style="display:flex;flex-wrap:wrap;gap:var(--space-6);align-items:flex-start">
    {card(BASIC)}
    {card(STAGE1)}
    {card(EX)}
    {card(FULLART)}
    {card(IMMERSIVE)}
    {card(SHINY)}
    {card(CROWN)}
    {card(ITEM)}
    {card(SUPPORTER)}
  </div>
  <div style="display:flex;gap:var(--space-6);align-items:flex-end">
    {card(BASIC, width="140px")}
    {card(BASIC, width="88px")}
    <p style="margin:0;max-width:360px;color:var(--ink-muted)">140px (below 220px: no effect text, flavour or dex line) and 88px, the hand and Bench size (head and art only).</p>
  </div>
</div>
{TILT_SCRIPT}
""")

C["CardBack"] = dict(
    readme="""# CardBack

The back of every card: decks, face-down setup, the opponent's hand.

## The consumer provides
`<div class="pd-card-back" role="img" aria-label="Face-down card"></div>` with a width through `--pd-card-width` (default `size-card-hand`, 88px).

## Rules
- Face-down cards are never interactive by themselves; the deck pile is a button that wraps a back.
- The opponent's hand is a row of backs at about 14.7% of screen width, fanned ±8°, clipped at the top edge.
- Flipping: put the back and the face in a 3D container and rotate over `dur-slow` with `ease-in-out`; with reduced motion, cross-fade instead.
- The pattern (silver frame, blue lattice, gold seal) is this system's own. Don't replace it with the original's card back.
""",
    preview="""<!-- @dsCard group="Cards" height=220 subtitle="hand · board · deck pile" -->
<div class="pd-app" style="display:flex;gap:var(--space-6);align-items:flex-end;padding:var(--space-4);background:var(--board)">
  <div class="pd-card-back" role="img" aria-label="Face-down card" style="--pd-card-width:57px"></div>
  <div class="pd-card-back" role="img" aria-label="Face-down card"></div>
  <div class="pd-card-back" role="img" aria-label="Face-down card" style="--pd-card-width:126px"></div>
  <button class="pd-button" data-variant="quiet" style="padding:0;height:auto;border-radius:var(--radius-md)" aria-label="Deck, 14 cards">
    <span style="display:grid">
      <span class="pd-card-back" style="--pd-card-width:84px;grid-area:1/1;translate:6px -6px"></span>
      <span class="pd-card-back" style="--pd-card-width:84px;grid-area:1/1;translate:3px -3px"></span>
      <span class="pd-card-back" style="--pd-card-width:84px;grid-area:1/1"></span>
    </span>
  </button>
</div>
""")


def dex_tile(c, number, count=None, new=False, empty=False):
    if empty:
        return f'<a class="pd-dex-tile" href="#{number}" aria-label="Card {number}, not owned"><span class="pd-dex-tile__empty">{number}</span><span>{number}</span></a>'
    extras = ""
    if count:
        extras += f'<span class="pd-dex-tile__count" aria-hidden="true">{count}</span>'
    if new:
        extras += '<span class="pd-chip" data-tone="reward">New</span>'
    owned = f", owned ×{count}" if count else ", owned"
    new_word = ", new" if new else ""
    return f'<a class="pd-dex-tile" href="#{number}" aria-label="{c["name"]}{owned}{new_word}">{card(c, width="100%", role=HIDDEN)}{extras}<span>{number}</span></a>'


C["DexTile"] = dict(
    readme="""# DexTile

One entry in the collection grid: the card if owned (with a copy count), a numbered empty slot if not.

## Measured grid
Five columns at the default zoom: tiles 17.4% of screen width (pitch 18.4%), 1% gutters, 4.4% side margins, 10px row gap. The zoomed-in view is three columns with tiles at 28%. Pinch changes the tile size. `.pd-dex-grid` sets this up with `--pd-dex-cols` (default 5).

## The consumer provides
A `.pd-dex-grid` of links or buttons with `class="pd-dex-tile"`, each containing either a `.pd-card` (owned) or `.pd-dex-tile__empty` with the card number (not owned), an optional `.pd-dex-tile__count` tab (the dark slate "1"/"2" tab at the tile's bottom-left), an optional `New` chip (top-left) and the collector number beneath. The accessible name states the card and whether it's owned: "Sproutling, owned ×2" or "Card 004, not owned".

## Rules
- Not-owned tiles show the number only, never a silhouette of the art.
- Owned tiles open the card inspector; not-owned tiles open the card's crafting cost and which packs contain it.
- Above the grid the original shows per-rarity counters (◊ 183/226, ☆ 22, ♕ 1) and a Dex/Owned Toggle; use Chips and Toggle for those.
""",
    preview=f"""<!-- @dsCard group="Cards" height=260 subtitle="5-column phone grid · owned · duplicates · new · missing" -->
<div class="pd-app" style="display:grid;justify-content:center;padding:var(--space-4) 0;background:var(--ground)">
  <div class="pd-dex-grid" style="width:390px">
    {dex_tile(BASIC, "001", count=2)}
    {dex_tile(STAGE1, "002", count=1)}
    {dex_tile("", "003", empty=True)}
    {dex_tile(EX, "036", count=1, new=True)}
    {dex_tile("", "037", empty=True)}
    {dex_tile(FULLART, "231", count=1, new=True)}
    {dex_tile(SHINY, "088", count=1)}
    {dex_tile("", "089", empty=True)}
    {dex_tile(ITEM, "219", count=2)}
    {dex_tile(SUPPORTER, "225", count=1)}
  </div>
</div>
""")

# ----------------------------------------------------------------------------- board

ICON_MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'


def hp(value, mx, size=None):
    sz = f' data-size="{size}"' if size else ""
    return (f'<div class="pd-hp"{sz} style="--pd-hp:{value};--pd-hp-max:{mx}" role="meter" aria-valuenow="{value}" aria-valuemin="0" aria-valuemax="{mx}" aria-label="HP">'
            f'<span class="pd-hp__value">{value}<small>HP</small></span><span class="pd-hp__track"><span class="pd-hp__fill"></span></span></div>')


def slot_energy(types):
    inner = "".join(ENERGY.format(t=t, extra="") for t in types)
    return f'<span class="pd-slot__energy" role="img" aria-label="Attached: {len(types)} Energy">{inner}</span>'


def occupied(c, zone, hpv, hpmax, energy, status=None, size=None, extra=""):
    st = f'<span class="pd-slot__status"><span class="pd-energy" data-type="{status[0]}" role="img" aria-label="{status[1]}"></span></span>' if status else ""
    return (f'<div class="pd-slot" data-zone="{zone}"{extra}>{card(c, width=None, role=HIDDEN)}'
            f'{hp(hpv, hpmax, size)}{st}{slot_energy(energy)}</div>')


def points(n, who):
    pips = "".join('<span class="pd-points__pip" data-filled></span>' if i < n else '<span class="pd-points__pip"></span>' for i in range(3))
    return f'<div class="pd-points" role="img" aria-label="{who} points: {n} of 3">{pips}</div>'


def strip(name, n, side=None, timer=None):
    s = ' data-side="opp"' if side == "opp" else ""
    t = f'<span class="pd-strip__timer">{timer}</span>' if timer else ""
    who = "Opponent's" if side == "opp" else "Your"
    return f'<div class="pd-strip"{s}><span>{name}</span>{t}{points(n, who)}</div>'


EMPTY_SLOT = '<div class="pd-slot" data-zone="{zone}" data-empty role="button" tabindex="0" aria-label="{label}"></div>'

C["BoardSlot"] = dict(
    readme="""# BoardSlot

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
""",
    preview=f"""<!-- @dsCard group="Board" height=360 subtitle="empty · valid target · hovered target · greyed · Active with HP, Energy and a condition · Bench with sm HP" -->
<div class="pd-app" style="display:flex;flex-wrap:wrap;gap:var(--space-8);align-items:center;padding:var(--space-12) var(--space-6) var(--space-6);background:var(--board)">
  {EMPTY_SLOT.format(zone="bench", label="Bench slot 1, empty")}
  {EMPTY_SLOT.format(zone="bench", label="Bench slot 2, empty, valid target").replace('data-empty', 'data-empty data-drop="valid"')}
  {EMPTY_SLOT.format(zone="bench", label="Bench slot 3, empty, drop here").replace('data-empty', 'data-empty data-drop="over"')}
  {EMPTY_SLOT.format(zone="bench", label="Bench slot 4, unavailable").replace('data-empty', 'data-empty data-drop="none"')}
  {occupied(EX, "active", 90, 140, ["fire", "fire"], status=("psychic", "Poisoned"), extra=' aria-label="Your Active: Emberwyrm ex, 90 of 140 HP, Poisoned, 2 Fire Energy"')}
  {occupied(BASIC, "bench", 40, 60, ["grass"], size="sm", extra=' aria-label="Bench 1: Sproutling, 40 of 60 HP, 1 Grass Energy"')}
</div>
""")

C["PlayerStrip"] = dict(
    readme="""# PlayerStrip

The slanted dark strip carrying a player's name, optional clock and point discs. Measured: yours spans 0–44% of screen width at 93.5–96.6% of height (26px tall) with its right end slanted about 20°; the opponent's is mirrored at the top-right (7–10% of height).

## The consumer provides
```
<div class="pd-strip"><span>Player</span><span class="pd-strip__timer">17:00</span><div class="pd-points" …></div></div>
<div class="pd-strip" data-side="opp">…</div>
```
Names are 13px 600 in `ink-inverse` on `strip`. The PointTracker sits at the slanted end (right for you, left for the opponent). The timer is optional: the original shows one only in timed matches.

## Rules
- The strip is `min-inline-size: 44%` of its container; place it in the Board's design box, not in a flex row.
- Points are announced by the Banner; the strip only shows them.
""",
    preview=f"""<!-- @dsCard group="Board" height=170 subtitle="yours (bottom-left) · opponent's (top-right, mirrored) · with a clock" -->
<div class="pd-app" style="display:grid;gap:var(--space-4);padding:var(--space-4);background:var(--field)">
  <div style="width:390px;display:flex;justify-content:flex-end">{strip("Rival Ash-Tree", 1, side="opp")}</div>
  <div style="width:390px">{strip("You", 2)}</div>
  <div style="width:390px">{strip("You", 0, timer="17:00")}</div>
</div>
""")

C["EnergyZone"] = dict(
    readme="""# EnergyZone

The Energy stand at the bottom-right of the board. Measured: a round pale stand Ø 15.2% of screen width (`size-energy-stand`, 59px) at (88.8%, 86%) of the screen; this turn's Energy sits on it as a large glossy orb; a 20px badge at the stand's lower-right previews the next turn's type. The opponent's is mirrored at (19%, 15%) and smaller (Ø 44px).

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
- On attach, the orb flies to the target over `dur-slow` along an arc (`ease-in-out`) and shrinks into a 26px badge; the preview then promotes with `ease-pop`.
- Exactly one upcoming Energy is previewed, as in the original.
""",
    preview="""<!-- @dsCard group="Board" height=150 subtitle="available · selected · empty (turn 1) · opponent size" -->
<div class="pd-app" style="display:flex;gap:var(--space-12);align-items:center;padding:var(--space-6);background:var(--board)">
  <div class="pd-energy-zone"><button class="pd-energy-zone__current" aria-label="Attach Fire Energy" aria-pressed="false"><span class="pd-energy" data-type="fire"></span></button><span class="pd-energy-zone__next" role="img" aria-label="Next: Water"><span class="pd-energy" data-type="water"></span></span></div>
  <div class="pd-energy-zone"><button class="pd-energy-zone__current" aria-label="Fire Energy selected: choose a Pokémon" aria-pressed="true"><span class="pd-energy" data-type="fire"></span></button><span class="pd-energy-zone__next" role="img" aria-label="Next: Fire"><span class="pd-energy" data-type="fire"></span></span></div>
  <div class="pd-energy-zone"><button class="pd-energy-zone__current" disabled aria-label="No Energy on your first turn"><span class="pd-energy" data-state="empty" data-type="colorless"></span></button><span class="pd-energy-zone__next" role="img" aria-label="Next: Grass"><span class="pd-energy" data-type="grass"></span></span></div>
  <div class="pd-energy-zone" style="--size-energy-stand:44px"><button class="pd-energy-zone__current" disabled aria-label="Opponent's Energy: Water"><span class="pd-energy" data-type="water"></span></button><span class="pd-energy-zone__next" role="img" aria-label="Next: Water"><span class="pd-energy" data-type="water"></span></span></div>
</div>
""")

HAND = [BASIC, dict(BASIC, type="fire", name="Cindercub", hp=60, finish=None, aria="Cindercub, 60 HP"), FULLART, SHINY, dict(IMMERSIVE, finish="holo", art="full")]


def hand(cards, selected=2, n=None):
    n = n or len(cards)
    out = []
    for i, c in enumerate(cards):
        sel = ' aria-selected="true"' if i == selected else ""
        out.append(card(c, width=None, role=f'role="option" tabindex="0" style="--i:{i}"{sel}'))
    return f'<div class="pd-hand" style="--n:{n}" role="listbox" aria-label="Your hand, {n} cards">{"".join(out)}</div>'


C["HandFan"] = dict(
    readme="""# HandFan

The player's hand as a fan of compact cards along the bottom edge. Measured: cards 22.6% of screen width (`size-card-hand`), top edge at 83% of height with the lower 40% of each card off-screen, fanned ±6°, centred.

## The consumer provides
A container with `class="pd-hand"` and `--n` (card count), whose children are `.pd-card` elements each with `--i` (index from 0). Mark the selected card with `aria-selected="true"`. Use a listbox pattern (`role="listbox"` on the hand, `role="option"` on cards) so arrow keys move between cards; tap-and-hold inspects.

## Rules
- The fan step is 6° (`--pd-fan-step`); tighten to 4° above seven cards. Cards overlap by 20% of their width.
- The selected card lifts 28px and straightens; hover lifts 16px on hover-capable pointers only.
- Play a card by pulling it upward out of the hand onto a slot. The opponent's hand is a row of CardBacks, never faces.
""",
    preview=f"""<!-- @dsCard group="Board" height=200 subtitle="5 cards, one selected, clipped at the bottom as on the board" -->
<div class="pd-app" style="background:var(--field);padding-top:var(--space-4);height:170px;overflow:hidden">
  {hand(HAND)}
</div>
""")


def board():
    opp_w = ' style="--pd-slot-width:82px"'
    opp_bench = "".join(EMPTY_SLOT.format(zone="bench", label=f"Opponent's Bench slot {i}, empty").replace("data-empty", "data-empty" + opp_w) for i in (1, 2))
    opp_bench = occupied(dict(STAGE1, finish=None), "bench", 100, 100, ["grass"], size="sm", extra=opp_w + ' aria-label="Opponent\'s Bench 1: Thornbrush, 100 HP"') + opp_bench
    opp_active = occupied(dict(FULLART, finish=None), "active", 70, 70, ["water", "water"], size="sm", extra=' aria-label="Opponent\'s Active: Tidecrest, 70 HP"')
    own_active = occupied(EX, "active", 90, 140, ["fire", "fire"], status=("psychic", "Poisoned"), extra=' aria-label="Your Active: Emberwyrm ex, 90 of 140 HP, Poisoned"')
    own_bench = occupied(BASIC, "bench", 60, 60, ["grass"], size="sm", extra=' aria-label="Bench 1: Sproutling, 60 HP"')
    own_bench += EMPTY_SLOT.format(zone="bench", label="Bench slot 2, empty, valid target").replace("data-empty", 'data-empty data-drop="valid"')
    own_bench += EMPTY_SLOT.format(zone="bench", label="Bench slot 3, empty, valid target").replace("data-empty", 'data-empty data-drop="valid"')
    return f"""<div class="pd-board" role="region" aria-label="Battle">
    <div class="pd-board__center" aria-hidden="true"></div>
    <div style="position:absolute;inset-inline-end:0;inset-block-start:7%">{strip("Rival Ash-Tree", 1, side="opp")}</div>
    <div class="pd-energy-zone" style="position:absolute;inset-inline-start:13.6%;inset-block-start:12.3%;--size-energy-stand:44px"><button class="pd-energy-zone__current" disabled aria-label="Opponent's Energy: Water"><span class="pd-energy" data-type="water"></span></button><span class="pd-energy-zone__next" role="img" aria-label="Next: Water"><span class="pd-energy" data-type="water"></span></span></div>
    <div class="pd-board__row" data-side="opp" style="inset-block-end:72.4%" aria-label="Opponent's Bench">{opp_bench}</div>
    <div class="pd-board__row" data-side="opp" style="inset-block-end:55%;--pd-slot-width:138px" aria-label="Opponent's Active Spot">{opp_active}</div>
    <label class="pd-toggle" style="position:absolute;inset-inline-end:3%;inset-block-start:39.3%;min-block-size:26px"><input type="checkbox" role="switch"><span class="pd-toggle__track"></span>Auto</label>
    <button class="pd-button" data-variant="end-turn" style="position:absolute;inset-inline-start:70.5%;inset-block-start:45%">End Turn</button>
    <div class="pd-board__row" data-side="own" style="inset-block-start:47.7%" aria-label="Your Active Spot">{own_active}</div>
    <div class="pd-board__row" data-side="own" style="inset-block-start:67.7%" aria-label="Your Bench">{own_bench}</div>
    <button class="pd-button" data-shape="circle" data-size="sm" data-variant="strip" style="position:absolute;inset-inline-start:3.5%;inset-block-start:76.6%" aria-label="Battle menu">{ICON_MENU}</button>
    <div style="position:absolute;inset-inline:0;inset-block-start:83%">{hand(HAND[:4], selected=-1)}</div>
    <div class="pd-energy-zone" style="position:absolute;inset-inline-start:81.2%;inset-block-start:82.4%;z-index:11"><button class="pd-energy-zone__current" aria-label="Attach Fire Energy" aria-pressed="false"><span class="pd-energy" data-type="fire"></span></button><span class="pd-energy-zone__next" role="img" aria-label="Next: Water"><span class="pd-energy" data-type="water"></span></span></div>
    <div style="position:absolute;inset-inline-start:0;inset-block-start:93.5%;z-index:11">{strip("You", 2)}</div>
  </div>"""


C["Board"] = dict(
    readme="""# Board

The battle mat composition: a portrait 9:19.5 design box (390×845 on phone) whose background is the field, split at the centre line, with the white-rimmed board circle (Ø 73% of height, 159% of width) centred on that line. The app places slots, HUD and hand inside the box at the measured positions; on tablet and desktop the whole box scales to fit the height, centres, and the field and HUD bleed to the edges.

## Measured positions (% of the design box; y is the top edge unless noted)
| Element | Position |
|---|---|
| Opponent strip | top-right, y 7–10% |
| Opponent Energy Zone | Ø 11% W centred at (19%, 15%) |
| Opponent Bench (3) | y 18–27.6%, slots about 18% W |
| Opponent Active | y 28.4–45%, about 30.5% W; both opponent rows foreshortened (scale 0.85 × 0.8, tilted about 14°) |
| Centre line | y 46.6% |
| Auto toggle | x 80.8%, y 39.3% |
| End Turn | x 70.5–96.5%, y 45–49% |
| Your Active | y 47.7–66.7%, 32% W (`size-card-board`) |
| Your deck / discard | x 86% to off-screen, y 50–61% and 63–74.5% (fully visible on tablet) |
| Your Bench (3) | y 67.7–82.3%, 22.6% W each (`size-card-hand`), gap 2.3% |
| Menu button | Ø 9% W at (7.9%, 78.6%) |
| Your Energy Zone | Ø 15.2% W at (88.8%, 86%) |
| Your hand | cards 22.6% W, top edge at 83%, fanned ±6° |
| Your strip | x 0–44%, y 93.5–96.6% |

## The consumer provides
`<div class="pd-board">` (set `--pd-board-width` to resize) with a `.pd-board__center` line, `.pd-board__row[data-side="opp"]` and `[data-side="own"]` rows of `.pd-slot`s positioned with `inset-block-start` (own) or `inset-block-end` (opp, so the foreshortening scales toward the measured bottom edge), and absolutely placed PlayerStrips, EnergyZones, the Auto Toggle, the End Turn Button, the menu circle and the HandFan. Give the board `role="region"` and label each row.

## Rules
- Colours: `field` / `field-opp` outside the circle, `board` / `board-opp` inside, `board-band` along the centre line, `board-rim` for the rim. Playmats can recolour these through tokens; never through raw hex.
- The circle may overflow the box on phone (it does in the original); on tablet it fits the width.
- Nothing inside the box uses px positions; everything is % of the box so the scale rule holds.
""",
    preview=f"""<!-- @dsCard group="Board" height=900 subtitle="390×845 design box: opponent rows foreshortened, HUD at measured positions" -->
<div class="pd-app" style="display:grid;justify-content:center;padding:var(--space-6);background:var(--ground)">
  {board()}
</div>
{TILT_SCRIPT}
""")

C["Banner"] = dict(
    readme="""# Banner

A diagonal announcement band over the board: turn changes, attacks, KOs, points, wins, rare pulls. Measured from the attack banner: a diagonal band with the attack name in big white italic display type and the Pokémon's name beneath, on a red-to-orange gradient.

## The consumer provides
`<div class="pd-banner" role="status" data-tone="…"><span class="pd-banner__title">Your Turn</span><span class="pd-banner__detail">Turn 3</span></div>`, centred over the board, removed after about 1 s (turn) or on tap (results).

## Attributes
| Attribute | Use |
|---|---|
| default (`hero-battle` blue) | turn changes |
| `data-tone="attack"` | an attack: title is the attack name, detail the attacker |
| `data-tone="danger"` | your Pokémon Knocked Out, defeat |
| `data-tone="reward"` | points earned, victory, rare pulls |
| `data-tone="neutral"` | coin results, draws |

## Rules
- One banner at a time; queue the rest in event order. Titles are two or three words in `display-l` italic.
- Enter over `dur-base` with `ease-pop` from the left; under reduced motion it fades.
- A long press skips the current animation, never the information: the engine state is already final.
""",
    preview="""<!-- @dsCard group="Board" height=260 subtitle="turn · attack · KO · points · coin" -->
<div class="pd-app" style="display:grid;grid-template-columns:repeat(2,max-content);gap:var(--space-4);justify-content:center;padding:var(--space-6);background:var(--board)">
  <div class="pd-banner" role="status"><span class="pd-banner__title">Your Turn</span><span class="pd-banner__detail">Turn 3</span></div>
  <div class="pd-banner" role="status" data-tone="attack"><span class="pd-banner__title">Blaze Coil</span><span class="pd-banner__detail">Emberwyrm ex</span></div>
  <div class="pd-banner" role="status" data-tone="danger"><span class="pd-banner__title">Knocked Out</span><span class="pd-banner__detail">Emberwyrm ex</span></div>
  <div class="pd-banner" role="status" data-tone="reward"><span class="pd-banner__title">+2 Points</span><span class="pd-banner__detail">2 of 3</span></div>
  <div class="pd-banner" role="status" data-tone="neutral"><span class="pd-banner__title">Heads</span><span class="pd-banner__detail">+20 damage</span></div>
</div>
""")

# ----------------------------------------------------------------------------- navigation

TAB_ICONS = {
    "Home": '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 12 13 4l9.5 8V22a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1Z"/><path data-cut d="M10.5 23v-7h5v7Z"/></svg>',
    "My Cards": '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="3" width="14" height="19" rx="2"/><rect data-cut x="10" y="6" width="8" height="6" rx="1"/><path d="M5 7v13a3 3 0 0 0 3 3h10"/></svg>',
    "Social Hub": '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-linejoin="round" aria-hidden="true"><circle cx="13" cy="8" r="3.5"/><circle cx="5.5" cy="13" r="3"/><circle cx="20.5" cy="13" r="3"/><path d="M7 23a6 6 0 0 1 12 0Z"/></svg>',
    "Battle": '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5 10 4l6 3.5-6 13-6-3.5Z"/><path d="m22 9.5-6-5.5-2.2 1.3 4.2 2.5-6 13 4 2.2Z"/></svg>',
    "Menu": '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true"><path d="M4 7h18M4 13h18M4 19h18"/><rect data-cut x="4" y="6" width="18" height="2" rx="1"/><rect data-cut x="4" y="12" width="18" height="2" rx="1"/><rect data-cut x="4" y="18" width="18" height="2" rx="1"/></svg>',
}


def tabbar(current="My Cards", dot="Social Hub"):
    links = []
    for name, icon in TAB_ICONS.items():
        cur = ' aria-current="page"' if name == current else ""
        d = '<span class="pd-tabbar__dot" aria-hidden="true"></span>' if name == dot else ""
        links.append(f'<a href="#{name.lower().replace(" ", "-")}" aria-label="{name}"{cur}>{icon}<span class="pd-visually-hidden">{name}</span>{d}</a>')
    return f'<nav class="pd-tabbar" aria-label="Main">{"".join(links)}</nav>'


C["TabBar"] = dict(
    readme="""# TabBar

The bottom navigation. Measured from the original: five icon-only items, evenly spaced, in this order: **Home · My Cards · Social Hub · Battle · Menu**. Icon centres at 12.4%, 31%, 50%, 68.6% and 87.2% of the width; glyphs about 24–26px; the bar is 49px tall (`size-tabbar`) plus the home-indicator padding, filled `ground` with no top border. The current item's icon is filled; a red `notice` dot sits at an icon's top-right.

## The consumer provides
A `<nav aria-label="Main">` with `class="pd-tabbar"` and five `<a>` links, each with an `aria-label`, a 26px stroke SVG (`aria-hidden`), and a `.pd-visually-hidden` text label. Mark the current screen with `aria-current="page"`; CSS fills its icon (`fill: currentColor`) and paints any `[data-cut]` shape in `ground` to cut a window. Add `<span class="pd-tabbar__dot">` inside a link for a notification. Pin the bar to the bottom of the viewport.

## Rules
- No visible text labels: the original has none. The hidden label and `aria-label` carry the name.
- Exactly these five destinations; new features live inside them. Hide the bar during battles, pack opening and the card inspector.
- On tablet the same five icons spread across the full width at the same relative positions; there is no side rail in the original.
- Icons are this system's own 1.8px-stroke line drawings (the original's have a slight double-line depth); keep them slate `ink-muted`, filled `strip` when current.
""",
    preview=f"""<!-- @dsCard group="Navigation" height=150 subtitle="phone bottom bar · My Cards current · Social Hub notification" -->
<div class="pd-app" style="display:grid;align-content:end;min-height:120px;background:var(--ground)">
  <div style="width:390px;margin:0 auto">{tabbar()}</div>
</div>
""")

# ----------------------------------------------------------------------------- collecting

C["BoosterPack"] = dict(
    readme="""# BoosterPack

A sealed booster to choose and cut open, with this system's own wrapper. Measured: the pack's aspect is about 0.51 (w/h); the cut line is the lower edge of the header band, 8.5% from the top, and carries a faint glowing streak before it's touched. On the tear screen the pack is about 68% of screen width with its top edge at 47% of height, the body running off the bottom.

## The consumer provides
```
<button class="pd-pack" data-type="psychic" aria-label="Open Mind Bloom pack">
  <span class="pd-pack__top"></span><span class="pd-pack__cut"></span>
  <span class="pd-pack__body"><span class="pd-pack__variant">Booster</span><span class="pd-pack__set">Mind Bloom</span></span>
</button>
```
`data-type` picks the pack's colour (omit for `hero-battle`); `--pd-pack-width` sets the size. While the player swipes along the cut line, set `--pd-cut` (0–1) to the finger's position and `--pd-cut-visible: 1`; when the swipe passes 85% of the width, set `data-state="cut"`: the strip flies up-right while rotating about 18° and fades. Keyboard and switch users press the button to cut.

## Rules
- The tear follows the finger (direct manipulation), never a canned animation; the strip's fly-off and the light burst start on release.
- The pack picker shows three packs in a carousel (centre 42.6% W, sides 72% of that, yawed toward the centre) with a faint reflection beneath, an Offering Rates pill at bottom-left and a back circle.
- No price, timer or currency ever appears on or near a pack.
""",
    preview="""<!-- @dsCard group="Collecting" height=330 subtitle="sealed · mid-swipe · cut" -->
<div class="pd-app" style="display:flex;gap:var(--space-8);justify-content:center;padding:var(--space-6);background:var(--gradient-sky)">
  <button class="pd-pack" style="--pd-pack-width:150px" aria-label="Open First Light pack"><span class="pd-pack__top"></span><span class="pd-pack__cut"></span><span class="pd-pack__body"><span class="pd-pack__variant">Booster</span><span class="pd-pack__set">First Light</span></span></button>
  <button class="pd-pack" data-type="psychic" style="--pd-pack-width:150px;--pd-cut:.55;--pd-cut-visible:1" aria-label="Open Mind Bloom pack"><span class="pd-pack__top"></span><span class="pd-pack__cut"></span><span class="pd-pack__body"><span class="pd-pack__variant">Booster</span><span class="pd-pack__set">Mind Bloom</span></span></button>
  <button class="pd-pack" data-type="fire" data-state="cut" style="--pd-pack-width:150px" aria-label="Ember Rise pack, opened"><span class="pd-pack__top"></span><span class="pd-pack__cut"></span><span class="pd-pack__body"><span class="pd-pack__variant">Booster</span><span class="pd-pack__set">Ember Rise</span></span></button>
</div>
""")

ROWS = [("diamond", 1, "1 diamond", "100%", "0%", "0%"), ("diamond", 2, "2 diamonds", "0%", "90.000%", "60.000%"),
        ("diamond", 3, "3 diamonds", "0%", "5.000%", "20.000%"), ("diamond", 4, "4 diamonds", "0%", "1.666%", "6.664%"),
        ("star", 1, "1 star", "0%", "2.572%", "10.288%"), ("star", 2, "2 stars", "0%", "0.500%", "2.000%"),
        ("star", 3, "3 stars", "0%", "0.222%", "0.888%"), ("crown", 1, "Crown", "0%", "0.040%", "0.160%")]


def odds_rows():
    out = []
    for tier, n, words, a, b, c in ROWS:
        marks = "<i></i>" * n
        cells = "".join(f'<td{" data-zero" if v == "0%" else ""}>{v}</td>' for v in (a, b, c))
        out.append(f'<tr><th scope="row"><span class="pd-rarity" data-tier="{tier}" aria-hidden="true">{marks}</span><span class="pd-visually-hidden">{words}</span></th>{cells}</tr>')
    return "\n      ".join(out)


C["OddsTable"] = dict(
    readme="""# OddsTable

The offering rates for a pack: rarity per slot, from the same data the pack RNG uses. The original opens it from an "Offering Rates" pill at the bottom-left of the pack screen.

## The consumer provides
A semantic `<table class="pd-odds">` inside a Panel, with a `<caption>` naming the pack, a header row (Rarity, Slots 1–3, Slot 4, Slot 5), one row per rarity with a RarityMark plus the rarity in words (visually hidden), and a `<tfoot>` line for the Rare Pack chance. Render values from the odds data, never typed by hand.

## Rules
- Three decimals for every non-zero rate; zero rates read "0%" in `ink-subtle`. Numerals are Jost, tabular.
- Every pack links to its table; it is never more than one tap away.
- On phone, the table scrolls horizontally inside its panel rather than shrinking text below 12px.
""",
    preview=f"""<!-- @dsCard group="Collecting" height=470 subtitle="per-slot rates · Rare Pack note" -->
<div class="pd-app" style="padding:var(--space-4);background:var(--ground)">
  <div class="pd-panel">
    <table class="pd-odds">
      <caption>First Light · Offering Rates</caption>
      <thead><tr><th scope="col">Rarity</th><th scope="col">Slots 1–3</th><th scope="col">Slot 4</th><th scope="col">Slot 5</th></tr></thead>
      <tbody>
      {odds_rows()}
      </tbody>
      <tfoot><tr><td colspan="4">1 pack in 2,000 (0.050%) is a Rare Pack: all five cards are ☆ or better. There is no visible tell before opening.</td></tr></tfoot>
    </table>
  </div>
</div>
""")
