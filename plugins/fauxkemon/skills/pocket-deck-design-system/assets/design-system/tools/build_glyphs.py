"""Write the original Energy and rarity glyphs as SVG assets and as CSS mask variables.

Glyphs are single-ink, 24x24, drawn for this system (not traced from any game's symbols).
Run: python3 tools/build_glyphs.py  -> project/assets/{Energy,Rarity}/*.svg, tools/glyphs.css
"""
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
INK = "#14202b"  # the `ink` token, light theme: the colour of the asset files

FILL = {
    # Energy types
    "grass": '<path d="M11 11h2v11h-2z"/><path d="M12 13.5C6.5 13.5 3.5 10 3.5 4.5 9 4.5 12 8 12 13.5Z"/><path d="M12 11.5c0-5.5 3-9 8.5-9 0 5.5-3 9-8.5 9Z"/>',
    "fire": '<path d="M12 1.5c1.2 4.4 6.5 6.6 6.5 12.6a6.5 6.5 0 0 1-13 0c0-3.6 2.6-5 3.1-8.1 1.8 1.6 2.2 3.6 2.4 5.2 1.4-2.2 1.9-5.6 1-9.7Z"/>',
    "water": '<path d="M12 1.8S4.8 10 4.8 15a7.2 7.2 0 0 0 14.4 0C19.2 10 12 1.8 12 1.8Zm-3.6 13.1a3.6 3.6 0 0 0 3.6 3.6v2a5.6 5.6 0 0 1-5.6-5.6Z" fill-rule="evenodd"/>',
    "lightning": '<path d="M14 1.5 4.5 13.5h6.2L9 22.5l10.5-12.8h-6.3Z"/>',
    "psychic": '<path d="M12 12m-1.6 0a1.6 1.6 0 1 0 3.2 0 3.2 3.2 0 1 0-6.4 0 4.8 4.8 0 1 0 9.6 0 6.4 6.4 0 1 0-12.8 0 8 8 0 1 0 16 0" fill="none" stroke="{ink}" stroke-width="2.2" stroke-linecap="round"/>',
    "fighting": '<path d="m12 1.5 2.4 6 6.4-1.4-3.9 5.4 4.6 4.5-6.4.7L13.9 23 12 17.2 10.1 23l-1.2-6.3-6.4-.7 4.6-4.5L3.2 6.1l6.4 1.4Z"/>',
    "darkness": '<path d="M14.5 2.2A9.8 9.8 0 1 0 21.8 15 7.8 7.8 0 1 1 14.5 2.2Z"/>',
    "metal": '<path d="M12 1.5 21.1 6.8v10.4L12 22.5l-9.1-5.3V6.8Zm0 6.6a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8Z" fill-rule="evenodd"/>',
    "dragon": '<path d="M3.5 6.6 12 2l8.5 4.6v3.6L12 5.6l-8.5 4.6Zm0 6.4L12 8.4l8.5 4.6v3.6L12 12l-8.5 4.6Zm0 6.4L12 14.8l8.5 4.6V23L12 18.4 3.5 23Z"/>',
    "colorless": '<path d="M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6Zm0 2.8a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" fill-rule="evenodd"/><circle cx="12" cy="12" r="2.6"/>',
    # Rarity tiers
    "diamond": '<path d="M12 2 20.5 12 12 22 3.5 12Z"/>',
    "star": '<path d="m12 1.8 3.1 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.6l-6.4 3.6 1.5-7.1-5.4-4.9 7.2-.8Z"/>',
    "crown": '<path d="m2.5 7.5 5 4.6L12 4l4.5 8.1 5-4.6-2.2 11.7H4.7Zm2.4 13.2h14.2V23H4.9Z"/>',
    "shiny": '<path d="M12 1.5c.9 6.4 3.1 8.6 10.5 10.5-7.4 1.9-9.6 4.1-10.5 10.5-.9-6.4-3.1-8.6-10.5-10.5C8.9 10.1 11.1 7.9 12 1.5Z"/>',
}

ENERGY = ["grass", "fire", "water", "lightning", "psychic", "fighting", "darkness", "metal", "dragon", "colorless"]
RARITY = ["diamond", "star", "crown", "shiny"]


def svg(name, ink):
    body = FILL[name].replace("{ink}", ink)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="{ink}">{body}</svg>'


def main():
    css = ["/* Glyph masks: original single-ink glyphs, applied with mask-image so they take any token colour. */",
           ":root {"]
    for group, names in (("Energy", ENERGY), ("Rarity", RARITY)):
        out = ROOT / "project" / "assets" / group
        out.mkdir(parents=True, exist_ok=True)
        for n in names:
            (out / f"{n}.svg").write_text(svg(n, INK) + "\n")
            uri = "data:image/svg+xml," + quote(svg(n, "#000").replace('"', "'"), safe=" =:/',")
            css.append(f'  --pd-glyph-{n}: url("{uri}");')
    css.append("}")
    (ROOT / "tools" / "glyphs.css").write_text("\n".join(css) + "\n")
    print("wrote", len(ENERGY) + len(RARITY), "glyphs")


if __name__ == "__main__":
    main()
