#!/usr/bin/env python3
"""Heuristic panel and button finder for a screenshot.

Method (heuristic; tune with flags):
 1. Downscale so the long side is <= 1000 px, convert to CIE Lab, Gaussian blur.
 2. Gradient magnitude (Sobel on L, a, b) under --flat is "flat" (uniform fill). A
    morphological open removes thin lines and text; holes from text are filled per component.
 3. Connected components of the flat mask. Components over --max-area of the image are
    "background". Others with area >= --min-area and rectangularity (area / bbox area, after
    hole filling) >= --min-fill are panels.
 4. Per box: x, y, w, h as % of W/H and in pt at --design-width (pt = px * design / W), the
    median fill colour, and a corner radius from the diagonal gap a to the first filled
    pixel at each corner: r = a / (1 - 1/sqrt(2)), averaged and capped at min(w, h)/2.
Accuracy is +-2-3 px, so sizes are measured with that error and radii are estimates;
shadows and gradients can merge or split panels. --crops saves each box as a PNG of at
most 400 px on its long side; no other image is written.
"""
import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402

VERSION = 1
CROP_LONG = 400


def corner_radius(mask):
    h, w = mask.shape
    gaps = []
    for ys, xs in ((range(h), range(w)), (range(h), range(w - 1, -1, -1)),
                   (range(h - 1, -1, -1), range(w)), (range(h - 1, -1, -1), range(w - 1, -1, -1))):
        ys, xs = list(ys), list(xs)
        for i in range(min(h, w) // 2):
            if mask[ys[i], xs[i]]:
                gaps.append(i)
                break
        else:
            gaps.append(min(h, w) // 2)
    r = float(np.mean(gaps)) / (1 - 1 / np.sqrt(2))
    return min(r, min(h, w) / 2)


def refine_edges(img, x, y, w, h, fill_bgr, tol=24, reach=8):
    """Grow each side outward while the middle 60% of the next pixel strip still matches the
    fill. Blur, gradient and the morphological open shrink a flat region by a few pixels per
    side; this recovers the true edge of a flat panel."""
    H, W = img.shape[:2]
    f = np.asarray(fill_bgr, np.float32)

    def ok(strip):
        return strip.size and float(np.abs(np.median(strip.reshape(-1, 3).astype(np.float32), axis=0) - f).sum()) <= tol

    def mid(a0, n):
        return a0 + int(n * 0.2), a0 + max(int(n * 0.2) + 1, int(n * 0.8))

    for _ in range(reach):
        y0, y1 = mid(y, h)
        x0, x1 = mid(x, w)
        grown = False
        if x > 0 and ok(img[y0:y1, x - 1]):
            x, w, grown = x - 1, w + 1, True
        if x + w < W and ok(img[y0:y1, x + w]):
            w, grown = w + 1, True
        if y > 0 and ok(img[y - 1, x0:x1]):
            y, h, grown = y - 1, h + 1, True
        if y + h < H and ok(img[y + h, x0:x1]):
            h, grown = h + 1, True
        if not grown:
            break
    return x, y, w, h


def find_boxes(bgr, flat, min_area, max_area, min_fill, design_w):
    H0, W0 = bgr.shape[:2]
    k = min(1.0, 1000 / max(H0, W0))
    small = cv2.resize(bgr, None, fx=k, fy=k, interpolation=cv2.INTER_AREA) if k < 1 else bgr
    H, W = small.shape[:2]
    lab = cv2.cvtColor(cv2.GaussianBlur(small, (0, 0), 1.2), cv2.COLOR_BGR2LAB).astype(np.float32)
    g = np.zeros((H, W), np.float32)
    for c in range(3):
        g += np.hypot(cv2.Sobel(lab[..., c], cv2.CV_32F, 1, 0), cv2.Sobel(lab[..., c], cv2.CV_32F, 0, 1))
    mask = (g < flat).astype(np.uint8)
    ks = max(3, int(W * 0.006)) | 1
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((ks, ks), np.uint8))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=4)
    pt = design_w / W
    boxes, bg = [], []
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        frac = area / (W * H)
        if frac < min_area:
            continue
        comp = (labels[y:y + h, x:x + w] == i).astype(np.uint8)
        cnts, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        filled = np.zeros_like(comp)
        cv2.drawContours(filled, cnts, -1, 1, -1)
        fill = float(filled.sum()) / (w * h)
        med = np.median(small[y:y + h, x:x + w][filled.astype(bool)], axis=0)
        rgb = med[::-1]
        if frac <= max_area and fill >= min_fill:
            x, y, w, h = refine_edges(small, x, y, w, h, med)
        rec = {"x_pct": round(100 * x / W, 1), "y_pct": round(100 * y / H, 1),
               "w_pct": round(100 * w / W, 1), "h_pct": round(100 * h / H, 1),
               "x_pt": round(x * pt, 1), "y_pt": round(y * pt, 1), "w_pt": round(w * pt, 1), "h_pt": round(h * pt, 1),
               "error_pt": round(3 * design_w / W0, 2),
               "area_pct": round(100 * frac, 1), "fill": round(fill, 2), "color": common.rgb_to_hex(rgb)}
        if frac > max_area:
            rec["kind"] = "background"
            bg.append(rec)
            continue
        if fill < min_fill:
            continue
        r = corner_radius(filled)
        rec.update(radius_px=round(r / k, 1), radius_pt=round(r * pt, 1), kind="panel", tag="measured",
                   method="flat-region components; sizes +-3 px, radius an estimate from the corner diagonal")
        rec["_px"] = (int(x / k), int(y / k), int(w / k), int(h / k))
        boxes.append(rec)
    boxes.sort(key=lambda b: (b["y_pct"], b["x_pct"]))
    return boxes, bg


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], epilog=__doc__.split("\n\n", 1)[1],
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image")
    ap.add_argument("--design-width", type=float, default=common.DESIGN_WIDTH,
                    help=f"design width in pt the capture maps to (default {common.DESIGN_WIDTH})")
    ap.add_argument("--flat", type=float, default=9.0, help="gradient threshold for flat (default 9)")
    ap.add_argument("--min-area", type=float, default=0.004, help="min box area, fraction of image (default 0.004)")
    ap.add_argument("--max-area", type=float, default=0.6, help="above this = background (default 0.6)")
    ap.add_argument("--min-fill", type=float, default=0.8, help="min rectangularity (default 0.8)")
    ap.add_argument("--crops", action="store_true", help="save box crops as PNG")
    common.add_common_args(ap)
    a = ap.parse_args(argv)
    if not Path(a.image).is_file():
        raise common.UsageError(f"input not found: {a.image}")

    params = {k: getattr(a, k) for k in ("design_width", "flat", "min_area", "max_area", "min_fill", "crops")}
    d, key = common.cache_dir(a.image, "layout", VERSION, params, a.out)
    env = common.load_cached(d, a.force)
    if env:
        common.report_cached(d)
        return env
    bgr = cv2.imread(a.image, cv2.IMREAD_COLOR)
    if bgr is None:
        raise common.UsageError(f"cannot read image {a.image}")
    H, W = bgr.shape[:2]
    boxes, bg = find_boxes(bgr, a.flat, a.min_area, a.max_area, a.min_fill, a.design_width)
    common.clean_dir(d, ("box_*.png",))
    for i, b in enumerate(boxes):
        x, y, w, h = b.pop("_px")
        if a.crops:
            crop = bgr[y:y + h, x:x + w]
            s = min(1.0, CROP_LONG / max(crop.shape[:2]))
            if s < 1:
                crop = cv2.resize(crop, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
            cv2.imwrite(str(d / f"box_{i:02d}.png"), crop)
    lines = [f"# layout: {Path(a.image).name} ({W}x{H}; pt = px*{a.design_width:g}/{W})",
             f"- {len(boxes)} panels, {len(bg)} background regions"]
    for b in boxes[:12]:
        lines.append(f"- ({b['x_pct']},{b['y_pct']})% {b['w_pct']}x{b['h_pct']}% = {b['w_pt']}x{b['h_pt']}pt r~{b['radius_pt']}pt {b['color']}")
    if len(boxes) > 12:
        lines.append(f"- {len(boxes) - 12} more in result.json")
    return common.finish(d, key, "layout", VERSION, params,
                         {"size": [W, H], "design_width_pt": a.design_width, "pt_per_px": round(a.design_width / W, 4),
                          "boxes": boxes, "background": bg}, "\n".join(lines) + "\n")


if __name__ == "__main__":
    common.run_main(main)
