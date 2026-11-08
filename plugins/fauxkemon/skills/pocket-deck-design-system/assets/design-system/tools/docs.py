"""Generate the skill's reference docs from the built project.

python3 tools/docs.py <references-dir>

Writes <references-dir>/tokens.md (one table per token family from project/tokens.json, light and dark
values, usage) and <references-dir>/components.md (every component README in group order). Run after
build.py so the READMEs and tokens.json are current.
"""
import json
import re
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
PROJECT = ROOT / "project"
sys.path.insert(0, str(TOOLS))

import content_compositions  # noqa: E402
import content_primitives  # noqa: E402
from build import tidy_md  # noqa: E402

GROUP_ORDER = ["Primitives", "Cards", "Board", "Navigation", "Collecting"]


def esc(s):
    return str(s).replace("|", "\\|")


def table(headers, rows):
    out = ["| " + " | ".join(headers) + " |", "| " + " | ".join("---" for _ in headers) + " |"]
    out += ["| " + " | ".join(esc(c) for c in r) + " |" for r in rows]
    return "\n".join(out)


def themed(v):
    return (f"`{v['light']}`", f"`{v['dark']}`") if isinstance(v, dict) else (f"`{v}`", f"`{v}`")


def tokens_md(t):
    parts = ["# Token reference", "",
             "Generated from `assets/design-system/project/tokens.json` by `tools/docs.py`. Use tokens only as `var(--name)`. "
             "Colour and shadow tokens list light / dark values; everything else is theme-independent. "
             "`card-*` and `disc-*` colours are the same in both themes because a card is a printed object.", ""]
    color = t["color"]["tokens"]
    families = [
        ("Ground, surfaces and board", ["ground", "surface", "scrim", "field", "board", "slot", "glow"]),
        ("Ink and lines", ["ink", "hp-ink", "line", "focus-ring"]),
        ("Brand, teal and status", ["brand", "on-brand", "progress", "toggle-on", "hp", "notice", "danger", "on-danger", "success", "on-success", "strip", "hero"]),
        ("Reward and points", ["reward", "on-reward", "coin-ink", "point-empty"]),
        ("Rarity (UI)", ["rarity"]),
        ("Card face", ["card"]),
        ("Types (UI)", ["type", "on-type"]),
        ("Energy discs", ["disc"]),
    ]

    def matches(name, prefixes):
        return any(name == p or name.startswith(p + "-") for p in prefixes)

    seen = set()
    parts += ["## Colour", ""]
    for title, pred in families:
        rows = []
        for tok in color:
            n = tok["name"]
            if n in seen or not matches(n, pred):
                continue
            seen.add(n)
            l, d = themed(tok["value"])
            rows.append((f"`{n}`", l, d, tok.get("usage", "")))
        if rows:
            parts += [f"### {title}", "", table(["Token", "Light", "Dark", "Use"], rows), ""]
    rest = [tok for tok in color if tok["name"] not in seen]
    if rest:
        rows = [(f"`{tok['name']}`", *themed(tok["value"]), tok.get("usage", "")) for tok in rest]
        parts += ["### Other", "", table(["Token", "Light", "Dark", "Use"], rows), ""]

    ty = t["type"]
    parts += ["## Type", "", "### Families", "",
              table(["Variable", "Stack"], [(f"`--font-{k}`", f"`{v}`") for k, v in ty["families"].items()]), "",
              "### Font files", "",
              table(["Family", "File", "Weights", "Style"], [(f["family"], f"`{f['file']}`", f["weight"], f["style"]) for f in ty["fonts"]]), ""]
    for g in ty["groups"]:
        rows = [(f"`{s['name']}`", s["fontSize"], s["lineHeight"], str(s["fontWeight"]), s.get("letterSpacing", "0"), s.get("usage", "")) for s in g["styles"]]
        parts += [f"### {g['name']}", "", table(["Style", "Size", "Line", "Weight", "Tracking", "Use"], rows), ""]

    for fam, title in (("spacing", "Spacing"), ("radius", "Radius"), ("size", "Size"), ("duration", "Duration"), ("easing", "Easing"), ("zIndex", "Stacking"), ("gradient", "Gradient")):
        rows = [(f"`{tok['name']}`", f"`{tok['value']}`", tok.get("usage", "")) for tok in t[fam]["tokens"]]
        parts += [f"## {title}", "", table(["Token", "Value", "Use"], rows), ""]
    rows = [(f"`{tok['name']}`", *themed(tok["value"]), tok.get("usage", "")) for tok in t["shadow"]["tokens"]]
    parts += ["## Shadow", "", table(["Token", "Light", "Dark", "Use"], rows), ""]
    return "\n".join(parts)


def group_of(preview):
    first = preview.split("\n", 1)[0]
    key = 'group="'
    i = first.find(key)
    return first[i + len(key):].split('"', 1)[0] if i >= 0 else "Other"


def components_md():
    allc = {**content_primitives.C, **content_compositions.C}
    by_group = {g: [] for g in GROUP_ORDER}
    for name, c in allc.items():
        by_group.setdefault(group_of(c["preview"]), []).append(name)
    parts = ["# Component reference", "",
             "Every component's contract, generated from the component READMEs by `tools/docs.py`. Markup lives in each "
             "`assets/design-system/project/components/<Name>/preview.html`; styles in `components/bundle.css`. "
             "Groups: Primitives know nothing about game state; Cards, Board, Navigation and Collecting compose them for one surface.", "",
             "## Contents", ""]
    for g in GROUP_ORDER:
        parts.append(f"- {g}: " + ", ".join(by_group.get(g, [])))
    parts.append("")
    for g in GROUP_ORDER:
        for name in by_group.get(g, []):
            readme = allc[name]["readme"].strip().split("\n")
            body = []
            for line in readme:
                if line.startswith("# "):
                    continue
                if line.startswith("## "):
                    line = "#" + line
                body.append(line)
            parts += [f"## {name} ({g})", "", f"Preview: `assets/design-system/project/components/{name}/preview.html`", "", *body, ""]
    return "\n".join(parts)


def finish(text):
    """Collapse double blank lines and end with one newline, as the formatter does."""
    text = re.sub(r"\n{3,}", "\n\n", tidy_md(text))
    return text.rstrip("\n") + "\n"


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    out = Path(sys.argv[1]).resolve()
    out.mkdir(parents=True, exist_ok=True)
    tokens = json.loads((PROJECT / "tokens.json").read_text())
    (out / "tokens.md").write_text(finish(tokens_md(tokens)))
    (out / "components.md").write_text(finish(components_md()))
    print("wrote", out / "tokens.md", out / "components.md")


if __name__ == "__main__":
    main()
