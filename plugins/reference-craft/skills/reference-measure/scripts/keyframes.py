#!/usr/bin/env python3
"""Scene-change keyframes for a screen recording, and one contact sheet per batch.

Finds where the picture changes substantially (the media CLI's scene score above
--threshold, at least --min-gap seconds apart) and saves each keyframe as a small JPEG
(long side --long-side, default 540). --start/--end restrict detection to a sub-range: use
them with a lower threshold and --min-gap 0 to re-detect one segment densely instead of
viewing more frames. Rotation metadata is honoured; sizes are post-rotation.

--sheet writes the whole batch onto as few contact sheets as keep every tile at least
--min-tile px on its long side, with each sheet's long side at most --sheet-long px
(default 1200), each tile labelled "#index time". `frame` is round(t * avg fps), an
estimate for variable-frame-rate sources.
"""
import argparse
import math
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402

VERSION = 1
PAD, LABEL_H = 4, 16


def detect(src: Path, d: Path, info: dict, threshold: float, min_gap: float, long_side: int, start, end):
    w, h = info["width"], info["height"]
    scale = f"scale={long_side}:-2" if w >= h else f"scale=-2:{long_side}"
    meta = d / "scene_meta.txt"
    expr = f"eq(n,0)+gt(scene,{threshold})*(isnan(prev_selected_t)+gte(t-prev_selected_t,{min_gap}))"
    vf = f"{scale},select='{expr}',metadata=print:file={meta},showinfo"
    cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-y"]
    if start is not None:
        cmd += ["-ss", f"{start}"]
    if end is not None:
        cmd += ["-to", f"{end}"]
    cmd += ["-i", str(src), "-an", "-vf", vf, "-fps_mode", "vfr", "-q:v", "4", "-start_number", "0", str(d / "kf_%05d.jpg")]
    r = common.run(cmd)
    if r.returncode:
        raise common.UsageError("scene detection failed: " + r.stderr[-300:])
    offset = start or 0.0
    times = [float(m) + offset for m in re.findall(r"pts_time:([0-9.]+)", r.stderr)]
    scores, cur = [], None
    for line in meta.read_text().splitlines():
        if line.startswith("frame:"):
            if cur is not None:
                scores.append(cur)
            cur = 0.0
        elif "scene_score=" in line:
            cur = float(line.split("=")[1])
    if cur is not None:
        scores.append(cur)
    meta.unlink()
    files = sorted(d.glob("kf_*.jpg"))
    n = min(len(files), len(times))
    fps = info.get("fps") or 30.0
    return [{"index": i, "t_seconds": round(times[i], 3), "frame": int(round(times[i] * fps)),
             "path": files[i].name, "diff_score": round(scores[i] if i < len(scores) else 0.0, 4)}
            for i in range(n)]


def plan_sheets(n: int, aspect: float, sheet_long: int = 1200, min_tile: int = 120) -> list[dict]:
    """Columns, rows and tile width for each sheet. Picks the column count that gives the
    largest tiles within sheet_long, and splits the batch evenly only when one sheet would
    shrink tiles under min_tile on their long side."""
    def layout(k):
        best = None
        for cols in range(1, k + 1):
            rows = math.ceil(k / cols)
            by_w = (sheet_long - PAD * (cols + 1)) / cols
            by_h = (sheet_long - PAD * (rows + 1) - rows * LABEL_H) / (rows * aspect)
            tw = int(min(by_w, by_h))
            if tw > 0 and (best is None or tw > best[2]):
                best = (cols, rows, tw)
        return best

    def long_side(lay):
        return max(lay[2], int(lay[2] * aspect))

    per = n
    while per > 1 and long_side(layout(per)) < min_tile:
        per -= 1
    per = math.ceil(n / math.ceil(n / per)) if n else 0
    out, s = [], 0
    while s < n:
        k = min(per, n - s)
        cols, rows, tw = layout(k)
        out.append({"first": s, "count": k, "cols": cols, "rows": rows, "tile_w": tw, "tile_h": int(tw * aspect)})
        s += k
    return out


def make_sheets(d: Path, kfs: list, sheet_long: int, min_tile: int) -> list[dict]:
    from PIL import Image, ImageDraw, ImageFont
    for old in d.glob("sheet_*.jpg"):
        old.unlink()
    if not kfs:
        return []
    with Image.open(d / kfs[0]["path"]) as im0:
        aspect = im0.height / im0.width
    try:
        font = ImageFont.load_default(size=12)
    except TypeError:
        font = ImageFont.load_default()
    sheets = []
    for i, p in enumerate(plan_sheets(len(kfs), aspect, sheet_long, min_tile)):
        tw, th, cols = p["tile_w"], p["tile_h"], p["cols"]
        W = cols * (tw + PAD) + PAD
        H = p["rows"] * (th + LABEL_H + PAD) + PAD
        sheet = Image.new("RGB", (W, H), (24, 24, 24))
        dr = ImageDraw.Draw(sheet)
        for j, k in enumerate(kfs[p["first"]: p["first"] + p["count"]]):
            with Image.open(d / k["path"]) as im:
                t = im.convert("RGB").resize((tw, th), Image.LANCZOS)
            x = PAD + (j % cols) * (tw + PAD)
            y = PAD + (j // cols) * (th + LABEL_H + PAD)
            sheet.paste(t, (x, y))
            dr.text((x + 2, y + th + 1), f"#{k['index']} {k['t_seconds']:.2f}s", fill=(235, 235, 235), font=font)
        name = f"sheet_{i + 1:02d}.jpg"
        sheet.save(d / name, quality=80)
        sheets.append({"path": name, "width": W, "height": H, "cols": cols, "rows": p["rows"], "tile_w": tw,
                       "tile_h": th, "first_index": kfs[p["first"]]["index"], "count": p["count"]})
    return sheets


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], epilog=__doc__.split("\n\n", 1)[1],
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("-t", "--threshold", type=float, default=0.2, help="scene score 0-1 (default 0.2; lower finds more)")
    ap.add_argument("--min-gap", type=float, default=0.5, help="min seconds between keyframes (default 0.5)")
    ap.add_argument("--long-side", type=int, default=540, help="keyframe JPEG long side in px (default 540)")
    ap.add_argument("--start", type=float, default=None, help="detect from this time (s)")
    ap.add_argument("--end", type=float, default=None, help="detect up to this time (s)")
    ap.add_argument("--sheet", action="store_true", help="also write contact sheets for the batch")
    ap.add_argument("--sheet-long", type=int, default=1200, help="contact sheet long side cap in px (default 1200)")
    ap.add_argument("--min-tile", type=int, default=120, help="smallest tile long side before splitting sheets (default 120)")
    common.add_common_args(ap)
    a = ap.parse_args(argv)
    if not Path(a.video).is_file():
        raise common.UsageError(f"input not found: {a.video}")

    t0 = time.time()
    params = {"threshold": a.threshold, "min_gap": a.min_gap, "long_side": a.long_side, "start": a.start, "end": a.end}
    d, key = common.cache_dir(a.video, "keyframes", VERSION, params, a.out)
    env = common.load_cached(d, a.force)
    if env:
        common.report_cached(d)
    else:
        common.clean_dir(d, ("kf_*.jpg", "sheet_*.jpg", "*.tmp", "scene_meta.txt"))
        info = common.probe(a.video)
        if not info["has_video"]:
            raise common.UsageError("no video stream")
        src = common.ensure_decodable(a.video, d)
        kfs = detect(src, d, info, a.threshold, a.min_gap, a.long_side, a.start, a.end)
        dt = time.time() - t0
        summary = (f"# keyframes: {Path(a.video).name}\n"
                   f"- {len(kfs)} keyframes over {info['duration']:.1f}s "
                   f"({info['codec']} {info['width']}x{info['height']} displayed, rotation {info['rotation']}, ~{info['fps']} fps)\n"
                   f"- threshold {a.threshold}, min gap {a.min_gap}s, range {a.start}-{a.end}, runtime {dt:.1f}s\n")
        env = common.finish(d, key, "keyframes", VERSION, params, {
            "video": {k: info[k] for k in ("codec", "width", "height", "rotation", "fps", "duration")},
            "count": len(kfs), "frame_error_ms": round(1000 / (info["fps"] or 30), 2),
            "tag": "measured", "method": f"scene score above {a.threshold}, min gap {a.min_gap}s",
            "keyframes": kfs}, summary)
    if a.sheet:
        sheets = make_sheets(d, env["result"]["keyframes"], a.sheet_long, a.min_tile)
        common.write_json_atomic(d / "sheets.json", sheets)
        sizes = ", ".join("%dx%d" % (s["width"], s["height"]) for s in sheets)
        print(f"sheets: {len(sheets)} ({sizes}) in {d}")
    return env


if __name__ == "__main__":
    common.run_main(main)
