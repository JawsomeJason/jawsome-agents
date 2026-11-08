"""Assemble the Pocket Deck project and render every preview in both themes.

python3 tools/build.py          # build files
python3 tools/build.py --render # build, then screenshot every preview (light + dark) into out/
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
PROJECT = ROOT / "project"
sys.path.insert(0, str(TOOLS))

import content_compositions  # noqa: E402
import content_primitives  # noqa: E402
import fetch_fonts  # noqa: E402


def tidy_md(text):
    """Match the plugin repo's Markdown formatter so synced files pass its check unchanged: a blank line
    after headings and closing fences, and tables either column-aligned (when the aligned table fits in
    80 columns) or compact with `---` rules."""
    lines = text.split("\n")
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("|"):
            block = []
            while i < len(lines) and lines[i].startswith("|"):
                block.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            n = max(len(r) for r in block)
            rows = [r + [""] * (n - len(r)) for r in block]
            body = [r for k, r in enumerate(rows) if k != 1]
            widths = [max(3, *(len(r[c]) for r in body)) for c in range(n)]
            if sum(widths) + 3 * (n - 1) + 4 <= 80:
                for k, r in enumerate(rows):
                    cells = ["-" * widths[c] if k == 1 else r[c].ljust(widths[c]) for c in range(n)]
                    out.append("| " + " | ".join(cells) + " |")
            else:
                for k, r in enumerate(rows):
                    cells = ["---" if k == 1 else r[c] for c in range(n)]
                    out.append("| " + " | ".join(cells) + " |")
            continue
        out.append(line)
        nxt = lines[i + 1].strip() if i + 1 < len(lines) else ""
        if line.startswith("#") and nxt:
            out.append("")
        if line.startswith("```"):
            # entering a fence: copy through its close
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                out.append(lines[i])
                i += 1
            if i < len(lines):
                out.append(lines[i])
                if i + 1 < len(lines) and lines[i + 1].strip():
                    out.append("")
        i += 1
    return "\n".join(out)


def build():
    got = fetch_fonts.fetch()
    if got:
        print("fonts: fetched", ", ".join(got))
    subprocess.run([sys.executable, str(TOOLS / "build_tokens.py")], check=True)
    subprocess.run([sys.executable, str(TOOLS / "build_glyphs.py")], check=True)
    comp = PROJECT / "components"
    comp.mkdir(exist_ok=True)
    bundle = (TOOLS / "glyphs.css").read_text() + "\n" + (TOOLS / "components.css").read_text()
    (comp / "bundle.css").write_text(bundle)
    shutil.copy(TOOLS / "bundle.js", comp / "bundle.js")
    allc = {**content_primitives.C, **content_compositions.C}
    for name, c in allc.items():
        d = comp / name
        d.mkdir(exist_ok=True)
        (d / "README.md").write_text(tidy_md(c["readme"]))
        (d / "preview.html").write_text(c["preview"])
    cover = comp / "Cover"
    cover.mkdir(exist_ok=True)
    shutil.copy(TOOLS / "cover.html", cover / "preview.html")
    for group, note in {
        "Energy": "This system's own single-ink Energy-type glyphs (24×24, ink `#14202b`). Components apply them as CSS masks so they take `on-type-*` colours; use these files only where a mask can't be used, such as exported images. They are not the original game's symbols.",
        "Rarity": "This system's own single-ink rarity glyphs (24×24, ink `#14202b`). RarityMark applies them as masks in `rarity-*` colours (and `card-rarity-*` on card faces).",
    }.items():
        (PROJECT / "assets" / group / "README.md").write_text(f"# {group}\n\n{note}\n")
    print("components:", len(allc), "+ Cover")
    return allc


HARNESS = """<!doctype html><html data-theme="{theme}"><head><meta charset="utf-8">
<link rel="stylesheet" href="../project/tokens.css"><link rel="stylesheet" href="../project/components/bundle.css">
<style>body{{margin:0;background:var(--surface);}}</style></head><body>{body}
<script src="../project/components/bundle.js"></script></body></html>"""


def render(names):
    from playwright.sync_api import sync_playwright
    out = ROOT / "out"
    out.mkdir(exist_ok=True)
    problems = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--allow-file-access-from-files"])
        page = browser.new_page(viewport={"width": 1000, "height": 600}, device_scale_factor=1)
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        for name in [*names, "Cover"]:
            src = (PROJECT / "components" / name / "preview.html").read_text()
            body = src.split("\n", 1)[1]
            for theme in ("light", "dark"):
                errors.clear()
                f = out / f"{name}-{theme}.html"
                f.write_text(HARNESS.format(theme=theme, body=body))
                page.goto(f.as_uri())
                page.wait_for_timeout(250)
                page.screenshot(path=str(out / f"{name}-{theme}.png"), full_page=True)
                if errors:
                    problems.append((name, theme, errors[:3]))
        browser.close()
    for pr in problems:
        print("ERROR", pr)
    print("rendered", len(names) + 1, "previews × 2 themes into", out)


if __name__ == "__main__":
    comps = build()
    if "--render" in sys.argv:
        render(list(comps))
