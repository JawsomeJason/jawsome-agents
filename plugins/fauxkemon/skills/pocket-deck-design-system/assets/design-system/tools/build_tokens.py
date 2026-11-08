"""Build project/tokens.json and project/tokens.css for the Pocket Deck design system,
then check every declared contrast pair in every theme.

Run: python3 tools/build_tokens.py   (exits 1 if any pair fails)
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "project"
TITLE = "Pocket Deck"

# name: (light, dark, usage)
COLORS = [
    # Surfaces
    # Surfaces. Light values are sampled from official screenshots of the pearly, near-white UI;
    # dark values are this system's own (the original has no dark mode).
    ("ground", "#e4eaf4", "#0d141b", "App background behind panels: the pale blue-lavender page wash. Hero screens lay `gradient-wall` or a section colour over it."),
    ("surface", "#f0f4f8", "#16202a", "Panels, pills, list rows, the filter panel, secondary buttons."),
    ("surface-raised", "#fcfcfc", "#1d2934", "Dialogs, sheets, speech bubbles and round icon buttons; always with `shadow-2` or `shadow-3`."),
    ("surface-sunken", "#dde3ef", "#0a1015", "Wells: search fields, the empty-dex slot, the deck-list gutter."),
    ("scrim", "#0c1620a8", "#000000b3", "Behind dialogs, the card inspector and pack opening; the original also blurs what's behind."),
    # Battle mat (your side bottom, opponent's top). Sampled from the default playmat.
    ("field", "#78adea", "#173a66", "Background outside the board circle on your side of the centre line."),
    ("field-opp", "#d0d8f8", "#2b3052", "Background outside the board circle on the opponent's side."),
    ("board", "#7cb3e9", "#22507f", "Your half of the mat inside the board circle. Text on it uses `ink`; Energy badges and slots sit on it."),
    ("board-opp", "#d8defd", "#3a3f63", "The opponent's half of the mat inside the circle."),
    ("board-band", "#c9e4fc", "#2b4360", "The lighter band along the centre line of the mat."),
    ("board-rim", "#ffffff", "#9fb3c8", "The board circle's rim (about 1.5% of screen height thick)."),
    ("slot", "#d8d9fc", "#5c6a9a", "Empty Active and Bench slots: a translucent-white rounded rectangle on the mat (this is the flattened value)."),
    ("slot-edge", "#eef1ff", "#7f8db8", "Hairline edge of an empty slot."),
    ("glow", "#4deffc", "#4deffc", "Selection and valid-target glow around cards, slots and the Energy stand: a soft outer blur, never a hard border."),
    # Text
    ("ink", "#343c4c", "#eef3f7", "Primary text on `surface`, `ground`, `surface-sunken`, `board`, `board-opp` and every `type-*-tint`. The original's dark slate."),
    ("ink-muted", "#4f5c72", "#b7c4cf", "Secondary text, the UI slate: pill labels, captions, outline icons. On `surface`, `ground`, `surface-sunken` and tints."),
    ("ink-subtle", "#56637a", "#93a3b2", "Tertiary text (set codes, timestamps) on `surface` and `ground`. Never on tints."),
    ("ink-inverse", "#ffffff", "#0d141b", "Text on `ink`-coloured fills: tooltips, the owned-count tab, the player strips."),
    ("hp-ink", "#3c4a66", "#eef3f7", "Floating HP numerals on the board (28px bold, so 3:1 applies), with a 2px `board-rim` stroke."),
    # Lines and focus
    ("line", "#d4dbe6", "#2b3946", "Hairline dividers between rows and under dialog titles. Decorative only."),
    ("line-strong", "#71808d", "#71859a", "Control borders where one is needed (inputs). 3:1 on `surface` and `ground`."),
    ("focus-ring", "#0a5a8a", "#8fdcf5", "The 2px focus outline on every focusable element. 3:1 on all surfaces and the mat."),
    # Accent: the game's cyan, used as a fill. The original sets white text on it (about 1.7:1); this system
    # sets `on-brand` instead so labels read, and keeps the white look through the glossy top band.
    ("brand", "#58d4f4", "#45b8dc", "Primary action fill (Open, OK, Battle!, Next) and the active Energy orb's ring. Text on it is `on-brand`."),
    ("brand-strong", "#38c2e6", "#2d9bbd", "Pressed primary fill."),
    ("on-brand", "#0f2a33", "#04202a", "Text and icons on `brand` and `brand-strong`."),
    ("brand-ink", "#0a6a8c", "#7fd0ea", "Cyan-coloured text and icons on `surface` and `ground`: links, quiet buttons, the Opening Results rule."),
    ("brand-tint", "#d9f1f9", "#0f3341", "Selected rows, active filters, drop-target wash, tutorial callout borders."),
    # Progress and state
    ("progress", "#24d0c0", "#24d0c0", "EXP and mission progress bars, completed-mission gradients. Decorative: a number sits beside it."),
    ("toggle-on", "#0a8e82", "#2fd3c2", "ON track of switches (Auto, Dex view). The original's `#00c4b4` fails 3:1 on `ground`; this one holds it. The knob is `ink-inverse`."),
    ("hp", "#15e5b0", "#15e5b0", "The HP bar on board cards, on a `board-rim` track."),
    ("reward", "#fce870", "#fce870", "Points coins, Pack Points, rare pulls, New badges. Fill with `on-reward` text."),
    ("on-reward", "#2a1b00", "#2a1b00", "Text and icons on `reward`."),
    ("reward-ink", "#7a4f00", "#f6c65a", "Gold-coloured text on `surface` and `ground` (Pack Points, rarity names)."),
    ("reward-tint", "#fdf1d4", "#3a2c0c", "Background of reward callouts and the rare-pull summary row."),
    ("coin-ink", "#348cfc", "#348cfc", "The italic numeral on an earned point coin (13pt disc). Decorative: the score is in the tracker's label."),
    ("point-empty", "#384450", "#6b7a8c", "Unearned point discs in the player strip."),
    ("strip", "#4c5c74", "#9fb3c8", "Player name strips (slanted), battle icon buttons, filled tab icons. Text on it is `ink-inverse`."),
    ("notice", "#ff3b30", "#ff6b61", "Notification dots on tabs and tiles."),
    ("danger", "#b42a20", "#ff8a7a", "Destructive actions, KO banners, low HP. Always with a word or icon."),
    ("on-danger", "#ffffff", "#2a0703", "Text on `danger`."),
    ("success", "#1e6e8a", "#6fd0c0", "Valid deck, completed missions as text. Kept off the red-green axis; always with a word or icon."),
    ("on-success", "#ffffff", "#062a24", "Text on `success`."),
    # Section heroes
    ("hero-battle", "#3884f8", "#2b5fb3", "Battle section banner (diagonal lower edge, white title)."),
    ("hero-social", "#3cc96a", "#2a9a50", "Social Hub section banner."),
    ("hero-set", "#c0a8fc", "#6a5aa8", "Default expansion panel tint on the pack screen; each set may override it."),
    # Rarity marks in lists and on the odds table
    ("rarity-diamond", "#4f6476", "#b9c8d6", "◊ marks in lists. 3:1 on `surface` and every `type-*-tint`."),
    ("rarity-star", "#8f6400", "#f4c34d", "☆ marks in lists. 3:1 on `surface` and every `type-*-tint`."),
    ("rarity-crown", "#7a5200", "#ffd76e", "♕ marks in lists. 3:1 on `surface` and every `type-*-tint`."),
    ("rarity-shiny", "#b0245f", "#ff8cc0", "✵ marks in lists. 3:1 on `surface` and every `type-*-tint`."),
    # Card stock (measured from official card renders; identical in both themes because a card is a printed object)
    ("card-frame", "#dedede", "#dedede", "Silver card border base (◊, ◊◊ and Trainers)."),
    ("card-frame-highlight", "#f6f6f6", "#f6f6f6", "Brushed highlight streaks on the silver border."),
    ("card-frame-shade", "#c8c8c8", "#c8c8c8", "Brushed shadow streaks on the silver border."),
    ("card-frame-rare", "#9f98ad", "#9f98ad", "◊◊◊ border: lavender-steel base under a low-saturation rainbow sheen."),
    ("card-frame-ex", "#4a4446", "#4a4446", "◊◊◊◊ ex border: dark silver base under a strong rainbow holo."),
    ("card-frame-immersive", "#424242", "#424242", "☆☆☆ Immersive border: charcoal, with a white window stroke."),
    ("card-frame-shiny", "#99f3f5", "#99f3f5", "✵ and ✵✵ border: cyan-mint holo base."),
    ("card-frame-crown", "#fcd518", "#fcd518", "♕ Crown border and symbols base: gold, holo cycling toward teal."),
    ("card-ink", "#201a0b", "#201a0b", "Name, HP, attack names, damage and effect text on every card body except Darkness."),
    ("card-ink-light", "#f2f4f1", "#f2f4f1", "Text on the Darkness card body and on full-art plates."),
    ("card-label", "#707070", "#707070", "Small grey labels on cards: stage, weakness, retreat, dex line. Sits on `card-pill` and the dex bar at the original's 4.2:1; keep it at or above 2.1% of card width."),
    ("card-pill", "#e1e4e2", "#e1e4e2", "Stage pill and footer capsules, light stop."),
    ("card-pill-deep", "#d4d9da", "#d4d9da", "Stage pill and footer capsules, deep stop."),
    ("card-dex-bar", "#e6e6e6", "#e6e6e6", "The dex line strip under the art on ◊–◊◊◊◊ Pokémon."),
    ("card-ability", "#b4101a", "#b4101a", "Ability pill fill (gradient `#df2b37` → `#7c0411` around it), outline `card-ability-outline`."),
    ("card-ability-outline", "#6c1111", "#6c1111", "Ability pill outline."),
    ("card-ability-ink", "#901f0c", "#901f0c", "Ability name text."),
    ("card-ex-gold-1", "#fff573", "#fff573", "ex rule box gradient, top."),
    ("card-ex-gold-2", "#e9c649", "#e9c649", "ex rule box gradient, middle; also the ex logotype fill."),
    ("card-ex-gold-3", "#bca435", "#bca435", "ex rule box gradient, bottom."),
    ("card-ex-tab", "#180a07", "#180a07", "The black tab on the ex rule box; its text is `card-ex-tab-ink`."),
    ("card-ex-tab-ink", "#c7a734", "#c7a734", "Text on the ex rule-box tab."),
    ("card-rule-ink", "#574406", "#574406", "Rule text inside the gold ex box."),
    ("card-ex-outline", "#5c4325", "#5c4325", "Outline of the ex logotype."),
    ("card-trainer-body", "#f1f2f4", "#f1f2f4", "Trainer card body."),
    ("card-trainer-band", "#e4e4e4", "#e4e4e4", "Trainer header band."),
    ("card-trainer-word", "#646464", "#646464", "The TRAINER word, with a white stroke."),
    ("card-item", "#3d86bc", "#3d86bc", "Item label; Item rule box runs `card-item-box` → `card-item-box-deep`."),
    ("card-item-box", "#c1e4f1", "#c1e4f1", "Item rule box, light stop."),
    ("card-item-box-deep", "#75bbde", "#75bbde", "Item rule box, deep stop."),
    ("card-supporter", "#e58c50", "#e58c50", "Supporter label; Supporter rule box runs `card-supporter-box` → `card-supporter-box-deep`."),
    ("card-supporter-box", "#ebd9bb", "#ebd9bb", "Supporter rule box, light stop."),
    ("card-supporter-box-deep", "#f0ba81", "#f0ba81", "Supporter rule box, deep stop."),
    ("card-fullart-ink", "#d9dedc", "#d9dedc", "Text fill on full-art cards, stroked with `card-fullart-outline`."),
    ("card-fullart-outline", "#1a1515", "#1a1515", "Text outline on full-art cards."),
    ("card-evolves-band", "#1e1e28", "#1e1e28", "Evolves-from band over the art at 60% alpha, white text."),
    ("card-rarity-diamond", "#2e3c0f", "#2e3c0f", "◊ symbol stroke printed on the card (the fill is a silver gradient)."),
    ("card-rarity-star", "#3d4889", "#3d4889", "☆ symbol printed on the card."),
    ("card-rarity-shiny", "#a3c838", "#a3c838", "✵ symbol printed on the card."),
    ("card-rarity-crown", "#a9882c", "#a9882c", "♕ symbol printed on the card; also the Crown body's symbol colour."),
    ("card-crown-body-1", "#f3da5c", "#f3da5c", "Crown card body gradient, top."),
    ("card-crown-body-2", "#fae26c", "#fae26c", "Crown card body gradient, bottom."),
]

# type: (fill light, fill dark, on light, on dark, tint light, tint dark)
# Measured card body colours (edge, centre) and type-disc colours (disc, highlight, shade)
CARD_BODY = {
    "grass": ("#96c33e", "#a0ca38"), "fire": ("#e94e30", "#ec6832"), "water": ("#5ec0ec", "#25ade4"),
    "lightning": ("#fdd901", "#fedd00"), "psychic": ("#9a68a7", "#a863a4"), "fighting": ("#da8d0d", "#da890d"),
    "darkness": ("#0a4f56", "#012e2b"), "metal": ("#dbdbdb", "#ced4d4"), "dragon": ("#a28929", "#b59d34"),
    "colorless": ("#f1efec", "#e7e7ea"),
}
DISC = {
    "grass": ("#7ab944", "#cadd95", "#3e9c2c"), "fire": ("#dc633f", "#f7b092", "#be3823"), "water": ("#43b1e1", "#b7e0fa", "#0894c8"),
    "lightning": ("#f5cd2e", "#ffee8c", "#ddb404"), "psychic": ("#b083ab", "#dab8d4", "#925f8c"), "fighting": ("#ce7621", "#efb97e", "#b25707"),
    "darkness": ("#568398", "#afc8d4", "#2d6978"), "metal": ("#bfbcb0", "#e6e4de", "#98968c"), "dragon": ("#b4a833", "#e7e08b", "#968b1a"),
    "colorless": ("#d7d5d1", "#f6f4f0", "#b4b2ae"),
}
TYPES = {
    "grass":     ("#2f7d34", "#5cbf5f", "#ffffff", "#07210a", "#e3f2df", "#182a1a"),
    "fire":      ("#c8401c", "#ff7a52", "#ffffff", "#2b0b02", "#fbe6dd", "#33190f"),
    "water":     ("#1f6fc2", "#5fa8f5", "#ffffff", "#03192f", "#e0edfb", "#132538"),
    "lightning": ("#f2c318", "#f5cf3c", "#2b2200", "#2b2200", "#fbf3cf", "#2f2a0d"),
    "psychic":   ("#8a46b8", "#c08ae6", "#ffffff", "#200a30", "#efe5f8", "#271b33"),
    "fighting":  ("#a8541c", "#e08a4c", "#ffffff", "#2a1204", "#f6e7da", "#2e1f14"),
    "darkness":  ("#36404d", "#8b98aa", "#ffffff", "#0d1218", "#e2e6eb", "#1c232c"),
    "metal":     ("#8794a1", "#a7b3bf", "#111b24", "#111b24", "#eaeef2", "#212a33"),
    "dragon":    ("#a3841c", "#d6b54a", "#1c1600", "#1c1600", "#f3ecd5", "#2c2611"),
    "colorless": ("#e4e9ee", "#cfd8e0", "#1a2632", "#1a2632", "#f4f6f8", "#222b34"),
}

THEMES = [{"id": "light", "name": "Light"}, {"id": "dark", "name": "Dark"}]


def color_tokens():
    out = []
    for name, light, dark, usage in COLORS:
        out.append({"name": name, "value": {"light": light, "dark": dark}, "usage": usage})
    for t, (fl, fd, ol, od, tl, td) in TYPES.items():
        label = t.capitalize()
        out.append({"name": f"type-{t}", "value": {"light": fl, "dark": fd},
                    "usage": f"{label} identity: Energy badges, cost pips, the card frame's type band. Glyphs on it use `on-type-{t}`."})
        out.append({"name": f"on-type-{t}", "value": {"light": ol, "dark": od},
                    "usage": f"Glyphs and short labels on `type-{t}`."})
        out.append({"name": f"type-{t}-tint", "value": {"light": tl, "dark": td},
                    "usage": f"{label} filter chips and {label}-themed UI washes. Text on it uses `ink`."})
    for t, (edge, centre) in CARD_BODY.items():
        label = t.capitalize()
        ink = "`card-ink-light`" if t == "darkness" else "`card-ink`"
        out.append({"name": f"card-{t}", "value": {"light": centre, "dark": centre},
                    "usage": f"{label} card body, centre of the radial gradient (measured from an official render). Text on it uses {ink}."})
        out.append({"name": f"card-{t}-edge", "value": {"light": edge, "dark": edge},
                    "usage": f"{label} card body, edge of the radial gradient."})
    for t, (disc, hi, sh) in DISC.items():
        label = t.capitalize()
        out.append({"name": f"disc-{t}", "value": {"light": disc, "dark": disc}, "usage": f"{label} type disc on cards and Energy pips: base."})
        out.append({"name": f"disc-{t}-hi", "value": {"light": hi, "dark": hi}, "usage": f"{label} type disc: rim-light highlight at 35% 30%."})
        out.append({"name": f"disc-{t}-shade", "value": {"light": sh, "dark": sh}, "usage": f"{label} type disc: shade."})
    return out


TYPE = {
    "fonts": [
        {"family": "Cabin", "file": "fonts/Cabin-Variable.woff2", "weight": "400 700", "style": "normal"},
        {"family": "Cabin", "file": "fonts/Cabin-Variable-Italic.woff2", "weight": "400 700", "style": "italic"},
        {"family": "Jost", "file": "fonts/Jost-Variable.woff2", "weight": "100 900", "style": "normal"},
        {"family": "Jost", "file": "fonts/Jost-Variable-Italic.woff2", "weight": "100 900", "style": "italic"},
    ],
    # The original sets its UI and card text in Gill Sans Nova (Medium/Bold) and its HP, damage and
    # score numerals in Futura Heavy. Cabin is the closest open humanist sans; Jost the closest open geometric.
    "families": {
        "display": "Cabin, \"Gill Sans\", \"Gill Sans Nova\", Calibri, ui-sans-serif, system-ui, sans-serif",
        "text": "Cabin, \"Gill Sans\", \"Gill Sans Nova\", Calibri, ui-sans-serif, system-ui, sans-serif",
        "numeral": "Jost, Futura, \"Century Gothic\", ui-sans-serif, system-ui, sans-serif",
    },
    "groups": [
        {"name": "Display", "family": "display", "styles": [
            {"name": "display-xl", "fontSize": "44px", "lineHeight": "48px", "fontWeight": 700, "letterSpacing": "-0.01em", "sample": "Got it!", "usage": "Full-screen moments (Got it!, Ranked up!, win and loss): white on a diagonal section colour with a soft slate shadow."},
            {"name": "display-l", "fontSize": "36px", "lineHeight": "40px", "fontWeight": 700, "sample": "Battle", "usage": "Section hero titles; turn banners."},
            {"name": "display-m", "fontSize": "28px", "lineHeight": "32px", "fontWeight": 700, "sample": "Genetic Apex", "usage": "Set names on the pack screen."},
            {"name": "title", "fontSize": "21px", "lineHeight": "26px", "fontWeight": 700, "sample": "My Cards", "usage": "Screen titles (centred, with `gradient-rainbow` under them), dialog titles at 18px."},
        ]},
        {"name": "Numerals", "family": "numeral", "styles": [
            {"name": "numeral-xl", "fontSize": "28px", "lineHeight": "30px", "fontWeight": 800, "letterSpacing": "-0.01em", "sample": "210", "usage": "Floating HP numerals on board cards, in `hp-ink` with a 2px `board-rim` stroke."},
            {"name": "numeral-l", "fontSize": "22px", "lineHeight": "24px", "fontWeight": 800, "sample": "1,025", "usage": "Counts in panels (cards owned, 20/20), damage pop-ups (scaled up)."},
            {"name": "numeral-m", "fontSize": "15px", "lineHeight": "18px", "fontWeight": 700, "sample": "40 pts", "usage": "Pack Points, stamina timers, owned-count tabs."},
        ]},
        {"name": "Text", "family": "text", "styles": [
            {"name": "body", "fontSize": "15px", "lineHeight": "22px", "fontWeight": 500, "sample": "Draw 2 cards.", "usage": "Default UI and dialog body text (the original's 13pt reads as 15px on the web)."},
            {"name": "body-strong", "fontSize": "15px", "lineHeight": "22px", "fontWeight": 700, "sample": "2 cards left in deck", "usage": "Emphasis inside body text, list-row primary lines."},
            {"name": "label", "fontSize": "15px", "lineHeight": "20px", "fontWeight": 600, "letterSpacing": "0.005em", "sample": "Offering Rates", "usage": "Pill buttons (13–16px by size), tabs, chips, form labels, the player strip."},
            {"name": "caption", "fontSize": "12px", "lineHeight": "16px", "fontWeight": 600, "letterSpacing": "0.01em", "sample": "A1 · 036 · ◊◊◊", "usage": "Tile labels under icon tiles, set codes, counters. Never for anything the player must read to act."},
        ]},
        {"name": "Card (at 300px card width)", "family": "text", "styles": [
            {"name": "card-name", "fontSize": "20px", "lineHeight": "22px", "fontWeight": 700, "letterSpacing": "-0.005em", "sample": "Sproutling", "usage": "Card name: 6.6% of card width, cap top at 4.6% of card height, starting 18% in from the left edge."},
            {"name": "card-hp", "family": "numeral", "fontSize": "21px", "lineHeight": "22px", "fontWeight": 800, "letterSpacing": "-0.01em", "sample": "120", "usage": "HP number on cards: 6.9% of card width, right-aligned at 87.2%, with a 3.2% 'HP' label before it."},
            {"name": "attack-name", "fontSize": "15px", "lineHeight": "18px", "fontWeight": 700, "sample": "Leaf Flurry", "usage": "Attack names at 4.9% and Ability names at 5.0% of card width, starting at 30.5%."},
            {"name": "attack-damage", "family": "numeral", "fontSize": "19px", "lineHeight": "22px", "fontWeight": 800, "sample": "60+", "usage": "Attack damage: 6.2% of card width, right-aligned at 93.3%."},
            {"name": "card-text", "fontSize": "11.4px", "lineHeight": "14px", "fontWeight": 500, "sample": "Flip a coin. If heads, this attack does 30 more damage.", "usage": "Effect and rule text: 3.8% of card width, line height 1.22, in `card-ink`. Hidden below 220px wide."},
            {"name": "card-label", "fontSize": "6.6px", "lineHeight": "8px", "fontWeight": 600, "letterSpacing": "0.02em", "sample": "Weakness", "usage": "Stage pill, Weakness and Retreat labels, dex line: 2.1–2.2% of card width in `card-label`."},
        ]},
    ],
}

SPACING = [
    ("space-1", "4px", "Gaps between Energy pips and inside chips."),
    ("space-2", "8px", "Icon-to-label gap; padding inside compact controls."),
    ("space-3", "12px", "Padding inside list rows and chips; gap between hand cards when not fanned."),
    ("space-4", "16px", "Default panel padding and the phone screen gutter."),
    ("space-5", "20px", "Gap between Bench slots on phone."),
    ("space-6", "24px", "Section spacing inside a screen; tablet gutter."),
    ("space-8", "32px", "Gap between the two Active Spots; desktop gutter."),
    ("space-12", "48px", "Separation between major screen regions."),
    ("space-16", "64px", "Top padding of hero moments (pack picker, win screen)."),
]

RADIUS = [
    ("radius-xs", "4px", "Energy cost pips inside attack rows, focus-ring corners on pips."),
    ("radius-sm", "8px", "Chips, inputs, small buttons."),
    ("radius-md", "12px", "Buttons, list rows, board slots."),
    ("radius-lg", "18px", "Panels and sheets."),
    ("radius-xl", "28px", "Dialogs and the booster pack wrapper."),
    ("radius-card", "4.6%", "Card corners as a share of card width (≈14px on a 300px card), so corners scale with the card."),
    ("radius-pill", "999px", "Pill buttons, the tab bar, point pips, Energy badges."),
]

SHADOWS = [
    ("shadow-1", "0 1px 2px rgba(20, 32, 43, 0.08), 0 1px 1px rgba(20, 32, 43, 0.04)",
     "0 1px 2px rgba(0, 0, 0, 0.40)", "Resting panels and list rows on `ground`."),
    ("shadow-2", "0 6px 16px rgba(20, 32, 43, 0.12), 0 1px 3px rgba(20, 32, 43, 0.08)",
     "0 6px 16px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.40)", "Menus, popovers, the tab bar."),
    ("shadow-3", "0 18px 40px rgba(20, 32, 43, 0.20), 0 4px 10px rgba(20, 32, 43, 0.10)",
     "0 18px 40px rgba(0, 0, 0, 0.55), 0 4px 10px rgba(0, 0, 0, 0.45)", "Dialogs, the card being dragged, the inspected card."),
    ("shadow-card", "0 2px 6px rgba(20, 32, 43, 0.16), 0 0 0 1px rgba(20, 32, 43, 0.06)",
     "0 2px 6px rgba(0, 0, 0, 0.50), 0 0 0 1px rgba(255, 255, 255, 0.06)", "Every card at rest: in hand, on the board, in the binder."),
]

OTHER = {
    "duration": [
        ("dur-instant", "90ms", "Press feedback (scale-down on tap)."),
        ("dur-fast", "150ms", "Hover, selection, chip toggles, tab changes."),
        ("dur-base", "240ms", "Cards moving between zones, sheets opening."),
        ("dur-slow", "380ms", "Card flips, the Energy attach arc, screen transitions."),
        ("dur-reveal", "620ms", "A rare-card reveal beat; the pack cut."),
    ],
    "easing": [
        ("ease-out", "cubic-bezier(0.22, 1, 0.36, 1)", "Anything entering or responding to the player: the default."),
        ("ease-in-out", "cubic-bezier(0.65, 0, 0.35, 1)", "Things moving from one place on screen to another (card to Bench)."),
        ("ease-pop", "cubic-bezier(0.34, 1.56, 0.64, 1)", "Small overshoot for badges, points and damage numbers appearing. Never on large surfaces."),
        ("ease-in", "cubic-bezier(0.55, 0, 1, 0.45)", "Exits only: a KO'd card leaving, a dismissed toast."),
    ],
    "size": [
        ("size-tap", "44px", "Minimum touch target for any control."),
        ("size-card-hand", "88px", "Card width in the hand fan and on your Bench: 22.6% of a 390px phone."),
        ("size-card-board", "126px", "Your Active card width on phone (32% of 390px). The opponent's Active is 0.95× and foreshortened; their Bench cards 0.82×."),
        ("size-card-inspect", "320px", "Card width in the inspector on phone."),
        ("card-aspect", "63 / 88", "Every card face and slot. Matches a standard trading card."),
        ("size-energy-badge", "26px", "Attached-Energy badge diameter on board cards (about 7% of phone width); 20px inside attack rows."),
        ("size-energy-stand", "59px", "The Energy Zone stand (15% of phone width); its next-type badge is 20px."),
        ("size-icon-button", "53px", "Round icon buttons (back, close) on menu screens; 35px for the battle menu button."),
        ("size-tabbar", "49px", "Visual height of the bottom tab bar, before the home-indicator padding."),
    ],
    "gradient": [
        ("gradient-rainbow", "linear-gradient(90deg, #c8ee28, #e8f00b, #f8af50, #fa898e, #f681ae, #ec84d2)", "The 2px rule under screen titles (My Cards, Wonder Pick) and the thin Opening Results rule."),
        ("gradient-wall", "linear-gradient(100deg, #acd4f8, #5880e0)", "The upper 'wall' of the pack screen; it meets a `surface` 'floor' on a slightly diagonal line at about 42% of screen height."),
        ("gradient-sky", "linear-gradient(180deg, #d4e8fc, #f0f4f8)", "Wonder Pick, the pack tear screen and Opening Results backgrounds."),
        ("gradient-end-turn", "linear-gradient(90deg, #7f98ec, #4deffc)", "The 2px hairline border of the End Turn pill."),
        ("gradient-attack", "linear-gradient(100deg, #e8362a, #ff8a3c)", "The diagonal attack-name banner (an estimate; the original is red to orange)."),
        ("gradient-complete", "linear-gradient(90deg, #00dcb8, #80e4a8)", "Completed-mission rows."),
    ],
    "zIndex": [
        ("z-board", "0", "Board and slots."),
        ("z-hand", "10", "The hand fan."),
        ("z-tabbar", "20", "Bottom navigation."),
        ("z-drag", "50", "A card or Energy being dragged."),
        ("z-sheet", "100", "Sheets and the card inspector."),
        ("z-dialog", "200", "Dialogs and pack opening."),
        ("z-toast", "300", "Turn and KO banners."),
    ],
}


def build():
    tokens = {
        "name": TITLE,
        "version": 1,
        "meta": {"source": "Authored for the Fauxkemon replica; light-theme UI colours, card colours and card geometry are measured from official screenshots and card renders."},
        "color": {"themes": THEMES, "tokens": color_tokens()},
        "type": TYPE,
        "spacing": {"tokens": [{"name": n, "value": v, "usage": u} for n, v, u in SPACING]},
        "radius": {"tokens": [{"name": n, "value": v, "usage": u} for n, v, u in RADIUS]},
        "shadow": {"tokens": [{"name": n, "value": {"light": l, "dark": d}, "usage": u} for n, l, d, u in SHADOWS]},
    }
    for fam, rows in OTHER.items():
        tokens[fam] = {"tokens": [{"name": n, "value": v, "usage": u} for n, v, u in rows]}
    return tokens


def css(tokens):
    first, second = THEMES[0]["id"], THEMES[1]["id"]
    lines = [f"/* {TITLE} — generated from tokens.json */"]
    for font in tokens["type"]["fonts"]:
        lines.append(
            "@font-face { font-family: \"%s\"; src: url(\"%s\") format(\"woff2\"); font-weight: %s; font-style: %s; font-display: swap; }"
            % (font["family"], font["file"], font["weight"], font["style"]))
    lines.append(f':root, [data-theme="{first}"] {{')
    for t in tokens["color"]["tokens"]:
        lines.append(f"  --{t['name']}: {t['value'][first]};")
    for t in tokens["shadow"]["tokens"]:
        lines.append(f"  --{t['name']}: {t['value'][first]};")
    lines.append("}")
    lines.append(f'[data-theme="{second}"] {{')
    for t in tokens["color"]["tokens"]:
        lines.append(f"  --{t['name']}: {t['value'][second]};")
    for t in tokens["shadow"]["tokens"]:
        lines.append(f"  --{t['name']}: {t['value'][second]};")
    lines.append("}")
    lines.append(":root {")
    for fam in ["spacing", "radius", *OTHER.keys()]:
        for t in tokens[fam]["tokens"]:
            lines.append(f"  --{t['name']}: {t['value']};")
    for key, stack in tokens["type"]["families"].items():
        lines.append(f"  --font-{key}: {stack};")
    lines.append("}")
    for group in tokens["type"]["groups"]:
        for s in group["styles"]:
            fam = s.get("family", group["family"])
            decl = [f"font-family: var(--font-{fam})", f"font-size: {s['fontSize']}",
                    f"line-height: {s['lineHeight']}", f"font-weight: {s['fontWeight']}"]
            if "letterSpacing" in s:
                decl.append(f"letter-spacing: {s['letterSpacing']}")
            lines.append(f".{s['name']} {{ {'; '.join(decl)}; }}")
    return "\n".join(lines) + "\n"


# ---------- contrast checks ----------

def hex_rgba(h):
    h = h.lstrip("#")
    if len(h) in (3, 4):
        h = "".join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return r, g, b


def lum(h):
    def ch(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = hex_rgba(h)
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def checks():
    tints = [f"type-{t}-tint" for t in TYPES]
    pairs = []  # (fg, bg, min)
    for bg in ["surface", "ground", "surface-sunken", "surface-raised", "board", "board-opp", "board-band", "slot", *tints]:
        pairs.append(("ink", bg, 4.5))
    for bg in ["surface", "ground", "surface-sunken", "surface-raised", *tints]:
        pairs.append(("ink-muted", bg, 4.5))
    for bg in ["surface", "ground", "surface-raised"]:
        pairs += [("ink-subtle", bg, 4.5), ("line-strong", bg, 3.0), ("reward-ink", bg, 4.5), ("brand-ink", bg, 4.5), ("toggle-on", bg, 3.0), ("strip", bg, 3.0)]
    for bg in ["surface", "ground", "surface-sunken", "surface-raised", "board", "board-opp", "brand-tint", "field", "field-opp"]:
        pairs.append(("focus-ring", bg, 3.0))
    pairs += [("on-brand", "brand", 4.5), ("on-brand", "brand-strong", 4.5), ("on-reward", "reward", 4.5),
              ("on-danger", "danger", 4.5), ("on-success", "success", 4.5), ("ink-inverse", "ink", 4.5), ("ink-inverse", "strip", 4.5),
              ("ink", "brand-tint", 4.5), ("ink", "reward-tint", 4.5), ("hp-ink", "board", 3.0), ("hp-ink", "board-opp", 3.0),
              ("ink-inverse", "toggle-on", 3.0), ("glow", "board", 1.0)]
    for t in TYPES:
        pairs.append((f"on-type-{t}", f"type-{t}", 4.5))
    for r in ["rarity-diamond", "rarity-star", "rarity-crown", "rarity-shiny"]:
        for bg in ["surface", *tints]:
            pairs.append((r, bg, 3.0))
    pairs.append(("danger", "surface", 4.5))
    pairs.append(("success", "surface", 4.5))
    values = {t["name"]: t["value"] for t in color_tokens()}
    fails = []
    # Card text sits on the body centre lifted by the 22% white vignette the body carries behind text.
    for t in CARD_BODY:
        c = hex_rgba(values[f"card-{t}"]["light"])
        lifted = "#" + "".join(f"{round((x * 0.78 + 0.22) * 255):02x}" for x in c)
        ink = "card-ink-light" if t == "darkness" else "card-ink"
        r = ratio(values[ink]["light"], lifted)
        if r < 4.5:
            fails.append(f"{ink} on the {t} card body (lifted) = {r:.2f} (needs 4.5)")
    for t in CARD_BODY:
        r = ratio(values["card-ink"]["light"], values["card-pill"]["light"])
        if r < 4.5:
            fails.append(f"card-ink on card-pill = {r:.2f}")
    r = ratio(values["card-rule-ink"]["light"], values["card-ex-gold-2"]["light"])
    if r < 4.5:
        fails.append(f"card-rule-ink on card-ex-gold-2 = {r:.2f}")
    for theme in ("light", "dark"):
        for fg, bg, need in pairs:
            r = ratio(values[fg][theme][:7], values[bg][theme][:7])
            if r < need:
                fails.append(f"{theme}: {fg} on {bg} = {r:.2f} (needs {need})")
    # danger vs success lightness separation
    for theme in ("light", "dark"):
        r = ratio(values["danger"][theme], values["success"][theme])
        print(f"{theme}: danger vs success lightness ratio {r:.2f} (success is off the red–green axis)")
    return pairs, fails


if __name__ == "__main__":
    tok = build()
    names = [t["name"] for fam in ["color", "spacing", "radius", "shadow", *OTHER.keys()] for t in tok[fam]["tokens"]]
    dup = {n for n in names if names.count(n) > 1}
    bad = [n for n in names if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,63}", n)]
    assert not dup, dup
    assert not bad, bad
    (ROOT / "tokens.json").write_text(json.dumps(tok, ensure_ascii=False, indent=2) + "\n")
    (ROOT / "tokens.css").write_text(css(tok))
    pairs, fails = checks()
    print(f"{len(names)} tokens; {len(pairs)} contrast pairs × 2 themes checked")
    for f in fails:
        print("FAIL", f)
    sys.exit(1 if fails else 0)
