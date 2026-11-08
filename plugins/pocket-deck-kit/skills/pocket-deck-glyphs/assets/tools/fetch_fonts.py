"""Fetch the bundled fonts when they are missing.

Installs `@fontsource-variable/cabin` and `@fontsource-variable/jost` into a temp dir with npm, then copies
the latin `wght` normal and italic woff2 files and each package's LICENSE into fonts/ under fixed
names. Does nothing when every target file already exists.

python3 tools/fetch_fonts.py
"""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "fonts"

PACKAGES = {
    "@fontsource-variable/cabin": {
        "files/cabin-latin-wght-normal.woff2": "Cabin-Variable.woff2",
        "files/cabin-latin-wght-italic.woff2": "Cabin-Variable-Italic.woff2",
        "LICENSE": "LICENSE-Cabin.txt",
    },
    "@fontsource-variable/jost": {
        "files/jost-latin-wght-normal.woff2": "Jost-Variable.woff2",
        "files/jost-latin-wght-italic.woff2": "Jost-Variable-Italic.woff2",
        "LICENSE": "LICENSE-Jost.txt",
    },
}


def missing():
    return [t for files in PACKAGES.values() for t in files.values() if not (FONTS / t).exists()]


def fetch():
    FONTS.mkdir(parents=True, exist_ok=True)
    if not missing():
        return []
    copied = []
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["npm", "install", "--silent", "--no-audit", "--no-fund", "--prefix", tmp, *PACKAGES], check=True, cwd=tmp)
        for pkg, files in PACKAGES.items():
            base = Path(tmp) / "node_modules" / pkg
            for src, dst in files.items():
                target = FONTS / dst
                if target.exists():
                    continue
                source = base / src
                if not source.exists():
                    sys.exit(f"fetch_fonts: {source} not found in {pkg}")
                shutil.copy(source, target)
                copied.append(dst)
    return copied


if __name__ == "__main__":
    got = fetch()
    print("fonts:", "copied " + ", ".join(got) if got else "all present")
