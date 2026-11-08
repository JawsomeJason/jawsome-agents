#!/usr/bin/env python3
"""Motion timing and easing for one transition.

Input is either a video with a region of interest (--roi x,y,w,h as fractions of the
displayed frame) over [--start, --end] seconds, or --csv with columns t (or frame with
--fps) and progress and/or diff, from any other tool.

From video, each frame inside the ROI is shrunk to 128 px and greyed, then:
  diff      mean absolute grey difference to the previous frame,
  progress  <f - f_first, f_last - f_first> / |f_last - f_first|^2, the projection onto the
            total change: 0 at the start, 1 at the end, above 1 on overshoot.
Pick a window that starts and ends at rest.

Timing (measured, +-1 frame): onset is the last sample inside the 2% band around the start
value and settle the first sample after which progress stays inside the 2% band around
the end value. With diff alone, onset/settle use a threshold of max(4 x noise floor, 10%
of peak), which cuts slow tails short, so that duration is a lower bound.

Fits (estimates): linear, ease-in/out/in-out cubic, ease-out quint, ease-out expo, the four
CSS keyword curves, each with its own fitted duration and sub-frame start, and a damped
spring at mass 1 (stiffness k, damping c, damping ratio, response 2*pi/sqrt(k)).
--track adds the centroid of per-frame change (fractions of the frame) for the path.
"""
import argparse
import csv
import math
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402

VERSION = 1


def read_roi_frames(src, info, roi, start, end, max_side=128):
    W, H = info["width"], info["height"]
    x, y, w, h = roi
    cx, cy = int(round(x * W)), int(round(y * H))
    cw, ch = max(2, int(round(w * W))), max(2, int(round(h * H)))
    cw, ch = min(cw, W - cx), min(ch, H - cy)
    k = min(1.0, max_side / max(cw, ch))
    sw, sh = max(2, int(cw * k)), max(2, int(ch * k))
    vf = f"crop={cw}:{ch}:{cx}:{cy},scale={sw}:{sh}:flags=area,format=gray,showinfo"
    cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-ss", f"{start}", "-i", str(src)]
    if end is not None:
        cmd += ["-t", f"{end - start}"]
    cmd += ["-an", "-vf", vf, "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "gray", "-"]
    common.need("ffmpeg")
    p = subprocess.run(cmd, capture_output=True)
    if p.returncode:
        raise common.UsageError("frame read failed: " + p.stderr.decode()[-300:])
    raw = np.frombuffer(p.stdout, np.uint8)
    n = raw.size // (sw * sh)
    frames = raw[: n * sw * sh].reshape(n, sh, sw).astype(np.float32)
    ts = [float(m) for m in re.findall(r"pts_time:(-?[0-9.]+)", p.stderr.decode())][:n]
    if len(ts) != n:
        fps = info.get("fps") or 30.0
        ts = [i / fps for i in range(n)]
    return frames, np.array(ts) + start, (sw, sh)


# ---------------------------------------------------------------- easings
def cubic_bezier(x1, y1, x2, y2):
    def bez(a, b, t):
        return 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3

    def f(x):
        x = np.asarray(x, float)
        lo, hi = np.zeros_like(x), np.ones_like(x)
        for _ in range(40):
            mid = (lo + hi) / 2
            below = bez(x1, x2, mid) < x
            lo, hi = np.where(below, mid, lo), np.where(below, hi, mid)
        return bez(y1, y2, (lo + hi) / 2)
    return f


EASINGS = {
    "linear": lambda t: t,
    "ease-in-cubic": lambda t: t ** 3,
    "ease-out-cubic": lambda t: 1 - (1 - t) ** 3,
    "ease-in-out-cubic": lambda t: np.where(t < 0.5, 4 * t ** 3, 1 - (-2 * t + 2) ** 3 / 2),
    "ease-out-quint": lambda t: 1 - (1 - t) ** 5,
    "ease-out-expo": lambda t: np.where(t >= 1, 1.0, 1 - 2.0 ** (-10 * t)),
    "css-ease": cubic_bezier(0.25, 0.1, 0.25, 1),
    "css-ease-in": cubic_bezier(0.42, 0, 1, 1),
    "css-ease-out": cubic_bezier(0, 0, 0.58, 1),
    "css-ease-in-out": cubic_bezier(0.42, 0, 0.58, 1),
}


def spring(t, k, z):
    """Unit step response of a mass-1 spring with stiffness k and damping ratio z (t in s)."""
    w = math.sqrt(k)
    t = np.asarray(t, float)
    if z < 1:
        wd = w * math.sqrt(1 - z * z)
        return 1 - np.exp(-z * w * t) * (np.cos(wd * t) + z * w / wd * np.sin(wd * t))
    if z == 1:
        return 1 - np.exp(-w * t) * (1 + w * t)
    s = w * math.sqrt(z * z - 1)
    r1, r2 = -z * w + s, -z * w - s
    return 1 + (r2 * np.exp(r1 * t) - r1 * np.exp(r2 * t)) / (r1 - r2)


def _rmse(a, b):
    return float(np.sqrt(np.mean((np.asarray(a) - np.asarray(b)) ** 2)))


def fit_spring(ts, p):
    best = (1e9, 0.0, 0.0)
    for k in np.geomspace(20, 20000, 40):
        for z in np.linspace(0.15, 1.6, 30):
            e = _rmse(spring(ts, k, z), p)
            if e < best[0]:
                best = (e, float(k), float(z))
    e, k, z = best
    dk, dz = k * 0.1, 0.05
    for _ in range(60):
        for ak, az in ((dk, 0), (-dk, 0), (0, dz), (0, -dz)):
            k2, z2 = max(1.0, k + ak), max(0.05, z + az)
            e2 = _rmse(spring(ts, k2, z2), p)
            if e2 < e:
                e, k, z = e2, k2, z2
        dk *= 0.9
        dz *= 0.9
    w = math.sqrt(k)
    return {"name": "spring", "rmse": e, "stiffness": round(k, 1), "damping": round(2 * z * w, 2),
            "damping_ratio": round(z, 3), "response_s": round(2 * math.pi / w, 3)}


def fit_easing(fn, ts, p, t0, frame_s, guess):
    """Least squares over duration (0.3-2x the 2% settling time) and a sub-frame start,
    because the first moving frame was captured somewhere after the motion began."""
    best = (1e9, guess, 0.0)
    for d in guess * np.linspace(0.3, 2.0, 121):
        for s in np.linspace(0, frame_s, 5, endpoint=False):
            e = _rmse(fn(np.clip((ts - t0 - s) / d, 0, 1)), p)
            if e < best[0]:
                best = (e, float(d), float(s))
    return best


def analyse(ts, diff=None, progress=None, fps=None):
    ts = np.asarray(ts, float)
    if len(ts) < 2 or np.any(np.diff(ts) <= 0):
        raise common.UsageError("need at least two samples with increasing times")
    frame_s = 1 / fps if fps else float(np.median(np.diff(ts)))
    out = {"samples": int(len(ts)), "fps": round(1 / frame_s, 3), "frame_ms": round(frame_s * 1000, 2), "warnings": []}

    def timing(i0, i1, method):
        out.update(onset_s=round(float(ts[i0]), 4), settle_s=round(float(ts[i1]), 4),
                   duration_ms=round(float(ts[i1] - ts[i0]) * 1000, 1), duration_error_ms=out["frame_ms"],
                   timing_tag="measured", timing_method=method)

    if diff is not None:
        d = np.asarray(diff, float)
        srt = np.sort(d[1:])
        noise = float(np.median(srt[: max(1, len(srt) // 4)]))
        peak = float(d.max())
        thr = max(4 * noise, 0.1 * peak, 1e-6)
        out.update(noise=round(noise, 4), peak=round(peak, 4), threshold=round(thr, 4))
        act = np.where(d > thr)[0]
        if act.size and progress is None:
            # A diff compares a frame with the one before, so motion began one frame earlier.
            timing(max(0, int(act[0]) - 1), int(act[-1]), "frame differencing above max(4 x noise floor, 10% of peak); one-frame error bar")
            out["warnings"].append("diff-only timing cuts a slow tail short (an ease-out ends under the threshold), so the duration is a lower bound; add progress to fit it")
        elif not act.size and progress is None:
            out["warnings"].append("no motion above threshold")
    if progress is None:
        return out
    v = np.asarray(progress, float)
    if v[-1] == v[0]:
        out["warnings"].append("progress starts and ends at the same value; widen the window so it starts and ends at rest")
        return out
    p = (v - v[0]) / (v[-1] - v[0])
    i0 = 0
    while i0 + 1 < len(p) and abs(p[i0 + 1]) <= 0.02:
        i0 += 1
    i1 = len(p) - 1
    while i1 - 1 > i0 and abs(p[i1 - 1] - 1) <= 0.02:
        i1 -= 1
    timing(i0, i1, "progress leaves the 2% band around its start and settles into the 2% band around its end; one-frame error bar")
    if i1 - i0 < 3:
        out["warnings"].append("fewer than 4 samples in the motion; no easing fit")
        return out
    stop = min(len(p) - 1, i1 + math.ceil((i1 - i0) / 2))
    fts, fp, t0 = ts[i0: stop + 1], p[i0: stop + 1], float(ts[i0])
    guess = float(ts[i1] - t0)
    fits = []
    for name, fn in EASINGS.items():
        e, dur, s = fit_easing(fn, fts, fp, t0, frame_s, guess)
        fits.append({"name": name, "rmse": e, "duration_ms": round(dur * 1000, 1), "start_s": round(t0 + s, 4)})
    fits.append(fit_spring(fts - t0, fp))
    fits.sort(key=lambda f: f["rmse"])
    for f in fits:
        f["rmse"] = round(f["rmse"], 4)
    moving = i1 - i0 + 1
    out.update(fits=fits, best_fit=fits[0], overshoot_pct=round(max(0.0, float(p.max()) - 1) * 100, 1),
               fit_samples=int(len(fp)), fit_tag="estimate",
               fit_method="least-squares fit of normalized progress with a fitted duration per easing; names are candidates, not the source curve")
    if moving < 8:
        out["warnings"].append(f"only {moving} samples in the motion: easings this close cannot be told apart, so treat the curve as a guess")
    if fits[1]["rmse"] - fits[0]["rmse"] < 0.01:
        out["warnings"].append(f"best fits {fits[0]['name']} and {fits[1]['name']} differ by under 0.01 rmse: ambiguous")
    return out


def progress_of(frames):
    base, tot = frames[0], frames[-1] - frames[0]
    den = float((tot * tot).sum())
    if den <= 0:
        return None
    return [float(((f - base) * tot).sum()) / den for f in frames]


def track_centroid(frames, ts, rel_w, rel_h, roi, i0, i1):
    x0, y0, w, h = roi
    pts = []
    for i in range(max(1, i0), i1 + 1):
        df = np.abs(frames[i] - frames[i - 1])
        df[df < 4] = 0
        s = df.sum()
        if s <= 0:
            continue
        ys, xs = np.mgrid[0: df.shape[0], 0: df.shape[1]]
        cx = float((df * xs).sum() / s + 0.5) / rel_w
        cy = float((df * ys).sum() / s + 0.5) / rel_h
        pts.append({"t": round(float(ts[i]), 4), "x": round(x0 + cx * w, 4), "y": round(y0 + cy * h, 4)})
    return pts


def read_csv(path, fps):
    try:
        with open(path, newline="") as f:
            rows = [r for r in csv.DictReader(line for line in f if line.strip() and not line.startswith("#"))]
    except OSError as e:
        raise common.UsageError(f"cannot read {path}: {e.strerror}") from None
    if not rows:
        raise common.UsageError("CSV has no rows")
    cols = {k.strip().lower(): k for k in rows[0]}
    try:
        num = {c: [float(r[k]) for r in rows] for c, k in cols.items()}
    except (TypeError, ValueError):
        raise common.UsageError("every CSV cell must be a number") from None
    if "t" in num:
        ts = num["t"]
    elif "frame" in num and fps:
        ts = [f / fps for f in num["frame"]]
    else:
        raise common.UsageError("CSV needs a t column, or a frame column with --fps")
    if "diff" not in num and "progress" not in num:
        raise common.UsageError("CSV needs a progress or diff column")
    return ts, num.get("diff"), num.get("progress")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], epilog=__doc__.split("\n\n", 1)[1],
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", nargs="?", help="video file (or use --csv)")
    ap.add_argument("--csv", default=None, help="per-frame samples instead of a video")
    ap.add_argument("--fps", type=float, default=None, help="frame rate for a CSV frame column")
    ap.add_argument("--roi", type=common.parse_roi, default=(0, 0, 1, 1), help="x,y,w,h fractions (default whole frame)")
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--end", type=float, default=None, help="default: end of video")
    ap.add_argument("--track", action="store_true", help="also report the centroid of change against time")
    common.add_common_args(ap)
    a = ap.parse_args(argv)
    src_path = a.csv or a.video
    if not src_path or (a.csv and a.video):
        raise common.UsageError("pass a video or --csv, not both")
    if not Path(src_path).is_file():
        raise common.UsageError(f"input not found: {src_path}")

    params = {"csv": bool(a.csv), "fps": a.fps} if a.csv else {"roi": a.roi, "start": a.start, "end": a.end, "track": a.track}
    d, key = common.cache_dir(src_path, "timing", VERSION, params, a.out)
    env = common.load_cached(d, a.force)
    if env:
        common.report_cached(d)
        return env
    if a.csv:
        ts, diff, prog = read_csv(a.csv, a.fps)
        r = analyse(ts, diff, prog, a.fps)
    else:
        info = common.probe(a.video)
        if not info["has_video"]:
            raise common.UsageError("no video stream")
        src = common.ensure_decodable(a.video, d)
        frames, ts, (sw, sh) = read_roi_frames(src, info, a.roi, a.start, a.end)
        if len(frames) < 4:
            raise common.UsageError("fewer than 4 frames in the window")
        dd = np.zeros(len(frames))
        dd[1:] = np.abs(frames[1:] - frames[:-1]).mean(axis=(1, 2))
        r = analyse(ts, dd, progress_of(frames), info.get("fps") or None)
        r["roi"] = list(a.roi)
        if a.track and "onset_s" in r:
            i0 = int(np.searchsorted(ts, r["onset_s"]))
            i1 = int(np.searchsorted(ts, r["settle_s"]))
            tr = track_centroid(frames, ts, sw, sh, a.roi, i0, i1)
            r["track"] = tr[:: max(1, len(tr) // 120)]
            if len(tr) >= 2:
                r["track_displacement"] = {"dx": round(tr[-1]["x"] - tr[0]["x"], 4), "dy": round(tr[-1]["y"] - tr[0]["y"], 4),
                                           "dt_ms": round((tr[-1]["t"] - tr[0]["t"]) * 1000, 1)}
    lines = [f"# timing: {Path(src_path).name}" + ("" if a.csv else f" roi={a.roi} t={a.start}-{a.end}"),
             f"- {r['samples']} samples at {r['fps']} fps (one frame = {r['frame_ms']} ms)"]
    if "onset_s" in r:
        lines.append(f"- onset {r['onset_s']}s, settle {r['settle_s']}s, duration {r['duration_ms']} +- {r['duration_error_ms']} ms")
    if "best_fit" in r:
        b = r["best_fit"]
        extra = f"k={b['stiffness']}, zeta={b['damping_ratio']}" if b["name"] == "spring" else f"fitted duration {b['duration_ms']} ms"
        lines.append(f"- best fit {b['name']} ({extra}), rmse {b['rmse']}, overshoot {r['overshoot_pct']}%; next {r['fits'][1]['name']} {r['fits'][1]['rmse']}")
    lines += [f"! {w}" for w in r["warnings"]]
    return common.finish(d, key, "timing", VERSION, params, r, "\n".join(lines) + "\n")


if __name__ == "__main__":
    common.run_main(main)
