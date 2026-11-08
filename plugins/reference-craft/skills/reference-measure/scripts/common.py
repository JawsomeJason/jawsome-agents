#!/usr/bin/env python3
"""Shared helpers for the measuring scripts, and a cache CLI for steps run by hand.

Cache layout (idempotency):
    <out>/<input-stem>-<sha12>/<step>-v<VERSION>-<params8>/result.json
<sha12> is the first 12 hex digits of sha256(input bytes), <params8> the first 8 of
sha256(parameters as sorted-key JSON), and <out> defaults to .reference-measure in the
working directory. A run whose result.json exists is skipped unless --force is given.
result.json is written last and atomically, so a run cut off halfway leaves no result.

CLI:
    common.py lookup --input F [--input F...] --step NAME --version N [--params JSON] [--out ROOT] [--force]
    common.py commit (same key flags) --result FILE
lookup prints {status, dir, file, key} as JSON; commit wraps --result in the result envelope.
Standard library only, so the cache works even where the measuring libraries are missing.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

DEFAULT_OUT = ".reference-measure"
DESIGN_WIDTH = 390


class UsageError(Exception):
    """A bad argument or unreadable input: exit 2 with one line on stderr."""


# --------------------------------------------------------------- CLI helpers
def add_common_args(p: argparse.ArgumentParser, tokens: bool = False) -> None:
    p.add_argument("--out", default=None, help=f"cache root (default ./{DEFAULT_OUT})")
    p.add_argument("--force", action="store_true", help="recompute even if result.json exists")
    if tokens:
        p.add_argument("--tokens", default=None,
                       help="design tokens JSON: {name: hex}, [{name, value}] or nested groups with value/$value leaves")
        p.add_argument("--theme", default="light", help="token theme to compare against when values are per theme (default light)")
        p.add_argument("--match", type=float, default=3.0, help="largest CIEDE2000 still called a match (default 3)")


def run_main(main) -> None:
    """Run a script's main; a UsageError exits 2 with one line on stderr."""
    try:
        main()
    except UsageError as e:
        print(f"{Path(sys.argv[0]).stem}: {e}", file=sys.stderr)
        sys.exit(2)


# ------------------------------------------------------------ hashing/cache
def file_hash(path: str | Path, n: int = 12) -> str:
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(1 << 20), b""):
                h.update(chunk)
    except OSError as e:
        raise UsageError(f"cannot read {path}: {e.strerror}") from None
    return h.hexdigest()[:n]


def _norm(o):
    return json.loads(json.dumps(o, default=str))


def params_hash(params: dict) -> str:
    return hashlib.sha256(json.dumps(_norm(params), sort_keys=True, separators=(",", ":")).encode()).hexdigest()[:8]


def cache_key(inputs: list, step: str, version: int, params: dict) -> dict:
    files = [{"path": str(p), "sha12": file_hash(p)} for p in inputs]
    sha = files[0]["sha12"] if len(files) == 1 else hashlib.sha256("\n".join(f["sha12"] for f in files).encode()).hexdigest()[:12]
    stem = re.sub(r"[^\w.-]+", "_", Path(inputs[0]).stem)
    ph = params_hash(params)
    return {"files": files, "inputs_sha12": sha, "params_sha8": ph, "folder": f"{stem}-{sha}/{step}-v{version}-{ph}"}


def cache_dir(inputs, step: str, version: int, params: dict, out: str | None = None) -> tuple[Path, dict]:
    inputs = [inputs] if isinstance(inputs, (str, Path)) else list(inputs)
    key = cache_key(inputs, step, version, params)
    d = Path(out or DEFAULT_OUT) / key["folder"]
    d.mkdir(parents=True, exist_ok=True)
    return d, key


def write_json_atomic(path: str | Path, obj) -> None:
    path = Path(path)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=path.name + ".", suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(obj, f, indent=1)
        os.replace(tmp, path)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def write_text_atomic(path: str | Path, text: str) -> None:
    path = Path(path)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=path.name + ".", suffix=".tmp")
    with os.fdopen(fd, "w") as f:
        f.write(text)
    os.replace(tmp, path)


def load_cached(d: Path, force: bool):
    """Return the cached envelope if result.json exists and --force is off, else None."""
    r = d / "result.json"
    if force or not r.exists():
        return None
    try:
        return json.loads(r.read_text())
    except (OSError, ValueError):
        return None


def finish(d: Path, key: dict, step: str, version: int, params: dict, result: dict, summary_md: str) -> dict:
    """Write summary.md, then result.json last and atomically; print the summary."""
    env = {"step": step, "version": version, "inputs": key["files"], "params": _norm(params), "result": _norm(result)}
    write_text_atomic(d / "summary.md", summary_md)
    write_json_atomic(d / "result.json", env)
    print(summary_md.rstrip())
    print(f"result: {d / 'result.json'}")
    return env


def report_cached(d: Path) -> None:
    print(f"[cached] {d / 'result.json'} (pass --force to recompute)")
    s = d / "summary.md"
    if s.exists():
        print(s.read_text().rstrip())
    print(f"result: {d / 'result.json'}")


def clean_dir(d: Path, patterns=("*",), keep=("result.json", "summary.md")) -> None:
    """Remove stale outputs from an earlier incomplete or forced run."""
    for pat in patterns:
        for f in d.glob(pat):
            if f.is_file() and f.name not in keep:
                f.unlink()


# ------------------------------------------------------------- media CLI
def need(tool: str) -> str:
    path = shutil.which(tool)
    if not path:
        raise UsageError(f"{tool} is not on PATH; install a media CLI that provides it, or follow the by-hand procedure in references/video.md")
    return path


def run(cmd, **kw) -> subprocess.CompletedProcess:
    need(cmd[0])
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def probe(path: str | Path) -> dict:
    """Duration, displayed (post-rotation) size, rotation, frame rate, codec."""
    r = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(path)])
    if r.returncode:
        raise UsageError(f"cannot probe {path}: {r.stderr.strip()[:200]}")
    j = json.loads(r.stdout)
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in j["streams"] if s["codec_type"] == "audio"), None)
    info = {"duration": float(j["format"].get("duration", 0) or 0), "has_audio": a is not None, "has_video": v is not None}
    if v:
        rot = 0
        for sd in v.get("side_data_list", []) or []:
            if "rotation" in sd:
                rot = int(round(float(sd["rotation"])))
        rot = int(v.get("tags", {}).get("rotate", rot) or rot)
        w, h = int(v["width"]), int(v["height"])
        if abs(rot) % 180 == 90:
            w, h = h, w
        num, _, den = (v.get("avg_frame_rate") or "0/1").partition("/")
        fps = float(num) / float(den or 1) if float(den or 1) else 0.0
        info.update(codec=v["codec_name"], width=w, height=h, rotation=rot,
                    coded_width=int(v["width"]), coded_height=int(v["height"]), fps=round(fps, 3))
    return info


def ensure_decodable(path: str | Path, workdir: Path) -> Path:
    """Return a path the decoder reads. If one test frame fails (a codec with no decoder),
    transcode once to H.264 (long side <= 960, rotation baked in) inside workdir."""
    path = Path(path)
    r = run(["ffmpeg", "-v", "error", "-i", str(path), "-frames:v", "1", "-f", "null", "-"])
    if r.returncode == 0 and "error" not in r.stderr.lower():
        return path
    dst = workdir / "transcoded.mp4"
    if not dst.exists():
        print(f"[warn] direct decode failed ({r.stderr.strip()[:120]}); transcoding to H.264", file=sys.stderr)
        t = run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-vf",
                 "scale='if(gt(iw,ih),960,-2)':'if(gt(iw,ih),-2,960)'", "-c:v", "libx264",
                 "-preset", "veryfast", "-crf", "24", "-c:a", "aac", str(dst) + ".part.mp4"])
        if t.returncode:
            raise UsageError(f"transcode failed: {t.stderr.strip()[:300]}")
        os.replace(str(dst) + ".part.mp4", dst)
    return dst


def parse_roi(s: str) -> tuple[float, float, float, float]:
    try:
        x, y, w, h = [float(v) for v in s.split(",")]
    except ValueError:
        raise argparse.ArgumentTypeError("expected x,y,w,h fractions") from None
    if not (0 <= x < 1 and 0 <= y < 1 and 0 < w <= 1 and 0 < h <= 1 and x + w <= 1.0001 and y + h <= 1.0001):
        raise argparse.ArgumentTypeError("x,y,w,h must be fractions inside 0..1")
    return x, y, w, h


# ------------------------------------------------------------------ colour
def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def rgb_to_hex(rgb) -> str:
    return "#%02x%02x%02x" % tuple(int(round(max(0, min(255, float(c))))) for c in rgb[:3])


def rgb_to_lab(rgb) -> tuple[float, float, float]:
    """sRGB (0-255) -> CIE L*a*b* (D65)."""
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(float(c)) for c in rgb[:3])
    x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
    y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
    z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883

    def f(t):
        return t ** (1 / 3) if t > 216 / 24389 else (24389 / 27 * t + 16) / 116
    fx, fy, fz = f(x), f(y), f(z)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)


def ciede2000(lab1, lab2) -> float:
    """CIEDE2000 colour difference (Sharma, Wu and Dalal reference formulation)."""
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2
    C1, C2 = math.hypot(a1, b1), math.hypot(a2, b2)
    Cb = (C1 + C2) / 2
    G = 0.5 * (1 - math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = math.hypot(a1p, b1), math.hypot(a2p, b2)
    h1p = math.degrees(math.atan2(b1, a1p)) % 360 if C1p else 0.0
    h2p = math.degrees(math.atan2(b2, a2p)) % 360 if C2p else 0.0
    dLp, dCp = L2 - L1, C2p - C1p
    if C1p * C2p == 0:
        dhp = 0.0
    else:
        dhp = h2p - h1p
        if dhp > 180:
            dhp -= 360
        elif dhp < -180:
            dhp += 360
    dHp = 2 * math.sqrt(C1p * C2p) * math.sin(math.radians(dhp / 2))
    Lbp, Cbp = (L1 + L2) / 2, (C1p + C2p) / 2
    if C1p * C2p == 0:
        hbp = h1p + h2p
    elif abs(h1p - h2p) <= 180:
        hbp = (h1p + h2p) / 2
    else:
        hbp = (h1p + h2p + 360) / 2 if h1p + h2p < 360 else (h1p + h2p - 360) / 2
    T = (1 - 0.17 * math.cos(math.radians(hbp - 30)) + 0.24 * math.cos(math.radians(2 * hbp))
         + 0.32 * math.cos(math.radians(3 * hbp + 6)) - 0.20 * math.cos(math.radians(4 * hbp - 63)))
    dth = 30 * math.exp(-(((hbp - 275) / 25) ** 2))
    Rc = 2 * math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7))
    Sl = 1 + 0.015 * (Lbp - 50) ** 2 / math.sqrt(20 + (Lbp - 50) ** 2)
    Sc, Sh = 1 + 0.045 * Cbp, 1 + 0.015 * Cbp * T
    Rt = -math.sin(math.radians(2 * dth)) * Rc
    return math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh))


_HEX = re.compile(r"^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})([0-9a-fA-F]{2})?$")
_RGB_FN = re.compile(r"^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)", re.I)


def _color_value(v, theme):
    if isinstance(v, dict):
        v = v.get(theme) or next(iter(v.values()), None)
    if not isinstance(v, str):
        return None
    m = _RGB_FN.match(v.strip())
    if m:
        return tuple(int(c) for c in m.groups())
    m = _HEX.match(v.strip())
    return hex_to_rgb(m.group(1)) if m else None


def load_tokens(path: str | None, theme: str = "light") -> list[dict]:
    """[{name, hex, lab}] for every solid colour token. Reads a flat {name: hex} map, an array
    of {name, value}, or nested groups whose leaves are hex strings or {value | $value}; group
    names join with dots. Alpha is ignored and non-colour values (gradients, fonts) skipped."""
    if not path:
        return []
    try:
        data = json.loads(Path(path).read_text())
    except (OSError, ValueError) as e:
        raise UsageError(f"cannot read tokens {path}: {e}") from None
    out = []

    def add(name, value):
        rgb = _color_value(value, theme)
        if rgb:
            out.append({"name": name, "hex": rgb_to_hex(rgb), "lab": rgb_to_lab(rgb)})

    def walk(node, path):
        if isinstance(node, list):
            for t in node:
                if isinstance(t, dict) and "name" in t:
                    add(t["name"], t.get("value", t.get("$value")))
        elif isinstance(node, str):
            add(".".join(path), node)
        elif isinstance(node, dict):
            if "$value" in node or "value" in node:
                add(".".join(path), node.get("$value", node.get("value")))
                return
            for k, v in node.items():
                if not k.startswith("$"):
                    walk(v, path + [k])

    walk(data, [])
    return out


def nearest_token(rgb, tokens: list[dict], match: float = 3.0) -> dict:
    """Nearest token by CIEDE2000, the runner-up, and a verdict: exact (dE <= 1), match
    (<= match), near (<= 2 x match) or none."""
    if not tokens:
        return {"token": None, "token_hex": None, "delta_e": None, "runner_up": None, "verdict": "no-tokens"}
    lab = rgb_to_lab(rgb)
    ranked = sorted(((ciede2000(lab, t["lab"]), t) for t in tokens), key=lambda x: x[0])
    de, best = ranked[0]
    verdict = "exact" if de <= 1 else "match" if de <= match else "near" if de <= 2 * match else "none"
    runner = {"token": ranked[1][1]["name"], "delta_e": round(ranked[1][0], 2)} if len(ranked) > 1 else None
    return {"token": best["name"], "token_hex": best["hex"], "delta_e": round(de, 2), "runner_up": runner, "verdict": verdict}


# --------------------------------------------------------------------- CLI
def _cli(argv=None):
    ap = argparse.ArgumentParser(prog="common.py", description="Cache slots for steps run by hand.")
    ap.add_argument("command", choices=["lookup", "commit"])
    ap.add_argument("--input", action="append", required=True)
    ap.add_argument("--step", required=True)
    ap.add_argument("--version", type=int, required=True)
    ap.add_argument("--params", default="{}")
    ap.add_argument("--result", default=None, help="JSON file to commit (commit only)")
    add_common_args(ap)
    a = ap.parse_args(argv)
    if not re.match(r"^[a-z][a-z0-9-]*$", a.step):
        raise UsageError("--step must be a lowercase name such as keyframes")
    try:
        params = json.loads(a.params)
    except ValueError as e:
        raise UsageError(f"--params is not JSON: {e}") from None
    for p in a.input:
        if not Path(p).is_file():
            raise UsageError(f"input not found: {p}")
    d, key = cache_dir(a.input, a.step, a.version, params, a.out)
    f = d / "result.json"
    if a.command == "lookup":
        status = "hit" if load_cached(d, a.force) is not None else "miss"
        print(json.dumps({"status": status, "dir": str(d), "file": str(f), "key": key}))
        return
    if not a.result:
        raise UsageError("commit needs --result FILE")
    try:
        result = json.loads(Path(a.result).read_text())
    except (OSError, ValueError) as e:
        raise UsageError(f"cannot read {a.result}: {e}") from None
    write_json_atomic(f, {"step": a.step, "version": a.version, "inputs": key["files"], "params": _norm(params), "result": result})
    print(f)


if __name__ == "__main__":
    run_main(_cli)
