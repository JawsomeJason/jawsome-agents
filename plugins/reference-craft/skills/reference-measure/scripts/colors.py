#!/usr/bin/env python3
"""Colour sampling and dominant colours for a screenshot or frame.

Modes (combinable):
  --box name:x,y,w,h   median RGB of a box (fractions of W/H) -> hex, nearest token, CIEDE2000.
  --grid CxR           the median of every cell of a C-column by R-row grid (such as 4x8).
  --auto               k-means (fixed seed, k=--k) on a 160 px copy: dominant colours and share.
Each box also reports `spread`, the share of its pixels more than 12 levels from the median
in any channel: above 0.1, the box caught an edge, text or a gradient and should shrink. The nearest token is the minimum
CIEDE2000 over the solid colours in --tokens, with the runner-up and a verdict (exact <= 1,
match <= --match, near <= 2 x --match, else none). --crops saves each box as a PNG of at most
400 px on its long side; no other image is written. With no mode flag, --auto runs.
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402

VERSION = 1
OFF_LEVELS = 12
SPREAD_WARN = 0.1
CROP_LONG = 400


def parse_box(s):
    name, sep, rest = s.partition(":")
    if not sep or not name:
        raise argparse.ArgumentTypeError("expected name:x,y,w,h")
    return name, common.parse_roi(rest)


def box_pixels(arr, box):
    H, W = arr.shape[:2]
    x, y, w, h = box
    x0, y0 = int(x * W), int(y * H)
    x1, y1 = min(W, max(x0 + 1, int((x + w) * W))), min(H, max(y0 + 1, int((y + h) * H)))
    return arr[y0:y1, x0:x1], (x0, y0, x1 - x0, y1 - y0)


def describe(rgb, tokens, match):
    return {"hex": common.rgb_to_hex(rgb), "rgb": [int(round(float(c))) for c in rgb],
            **common.nearest_token(rgb, tokens, match)}


def kmeans(px, k, iters=25, seed=0):
    rng = np.random.default_rng(seed)
    px = px.astype(np.float32)
    cent = [px[rng.integers(len(px))]]
    for _ in range(1, k):  # k-means++ initialisation
        dist = np.min([((px - c) ** 2).sum(1) for c in cent], axis=0)
        s = dist.sum()
        cent.append(px[rng.choice(len(px), p=dist / s)] if s > 0 else px[rng.integers(len(px))])
    cent = np.array(cent)
    for _ in range(iters):
        lab = np.argmin(((px[:, None, :] - cent[None]) ** 2).sum(2), axis=1)
        new = np.array([px[lab == i].mean(0) if (lab == i).any() else cent[i] for i in range(k)])
        done = np.allclose(new, cent, atol=0.25)
        cent = new
        if done:
            break
    lab = np.argmin(((px[:, None, :] - cent[None]) ** 2).sum(2), axis=1)
    return cent, np.bincount(lab, minlength=k) / len(px)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], epilog=__doc__.split("\n\n", 1)[1],
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image")
    ap.add_argument("--box", action="append", default=[], type=parse_box, metavar="NAME:X,Y,W,H")
    ap.add_argument("--grid", default=None, metavar="CxR")
    ap.add_argument("--auto", action="store_true")
    ap.add_argument("--k", type=int, default=6, help="clusters for --auto (default 6)")
    ap.add_argument("--crops", action="store_true", help="save each box as a small PNG crop")
    common.add_common_args(ap, tokens=True)
    a = ap.parse_args(argv)
    if not (a.box or a.grid or a.auto):
        a.auto = True
    grid = None
    if a.grid:
        try:
            grid = tuple(int(v) for v in a.grid.lower().split("x"))
            assert len(grid) == 2 and min(grid) > 0
        except (ValueError, AssertionError):
            raise common.UsageError("--grid must be CxR, such as 4x8") from None
    for p in [a.image] + ([a.tokens] if a.tokens else []):
        if not Path(p).is_file():
            raise common.UsageError(f"input not found: {p}")

    inputs = [a.image] + ([a.tokens] if a.tokens else [])
    params = {"boxes": [[n, b] for n, b in a.box], "grid": a.grid, "auto": a.auto, "k": a.k,
              "crops": a.crops, "theme": a.theme, "match": a.match}
    d, key = common.cache_dir(inputs, "colors", VERSION, params, a.out)
    env = common.load_cached(d, a.force)
    if env:
        common.report_cached(d)
        return env
    tokens = common.load_tokens(a.tokens, a.theme)
    try:
        img = Image.open(a.image).convert("RGB")
    except OSError as e:
        raise common.UsageError(f"cannot read image {a.image}: {e}") from None
    arr = np.asarray(img)
    H, W = arr.shape[:2]
    common.clean_dir(d, ("crop_*.png",))
    out = {"size": [W, H], "token_count": len(tokens)}
    lines = [f"# colors: {Path(a.image).name} ({W}x{H}), {len(tokens)} tokens ({a.theme})"]

    def cell(name, box):
        px, rect = box_pixels(arr, box)
        flat = px.reshape(-1, 3).astype(float)
        med = np.median(flat, axis=0)
        spread = float((np.abs(flat - med).max(axis=1) > OFF_LEVELS).mean())
        warnings = []
        if rect[2] < 4 or rect[3] < 4:
            warnings.append("box under 4 px on a side: enlarge it inside the flat area")
        if spread > SPREAD_WARN:
            warnings.append(f"{spread:.0%} of pixels sit over {OFF_LEVELS} levels from the median: the box crosses an edge, text or gradient")
        r = {"name": name, "box": list(box), "rect_px": list(rect), "pixel_count": int(flat.shape[0]),
             "spread": round(spread, 3), "warnings": warnings, **describe(med, tokens, a.match),
             "tag": "measured", "method": f"median of {rect[2]}x{rect[3]} px box"}
        if a.crops:
            c = Image.fromarray(px)
            c.thumbnail((CROP_LONG, CROP_LONG))
            c.save(d / f"crop_{name}.png")
        lines.append(f"- {name}: {r['hex']} -> {r['token']} dE {r['delta_e']} ({r['verdict']})" + (" !" if warnings else ""))
        return r

    if a.box:
        out["boxes"] = [cell(n, b) for n, b in a.box]
    if grid:
        c, rows = grid
        out["grid"] = [cell(f"r{j}c{i}", (i / c, j / rows, 1 / c, 1 / rows)) for j in range(rows) for i in range(c)]
    if a.auto:
        small = img.copy()
        small.thumbnail((160, 160), Image.BILINEAR)
        cent, share = kmeans(np.asarray(small).reshape(-1, 3), a.k)
        out["auto"] = [{"share": round(float(share[i]), 3), **describe(cent[i], tokens, a.match), "tag": "estimate",
                        "method": f"k-means cluster centre, k={a.k}, on a 160 px copy"}
                       for i in np.argsort(-share) if share[i] > 0]
        lines.append("- dominant: " + ", ".join(f"{c['hex']} {c['share'] * 100:.0f}% ({c['token']} dE {c['delta_e']})" for c in out["auto"]))
    return common.finish(d, key, "colors", VERSION, params, out, "\n".join(lines) + "\n")


if __name__ == "__main__":
    common.run_main(main)
