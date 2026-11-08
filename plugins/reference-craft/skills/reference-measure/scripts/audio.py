#!/usr/bin/env python3
"""Audio onsets, loudness and ducking for a video or audio file.

Extracts mono 44.1 kHz WAV once into the cache folder, then:
  onsets           librosa onset detection. --separate first splits the signal into harmonic
                   and percussive parts (median-filter HPSS) and detects on the percussive part,
                   so a music bed triggers fewer onsets and hides fewer effects.
  per onset        t_seconds; peak_dbfs in the window to the next onset (<= --window s);
                   decay_ms until the 5 ms RMS envelope falls 30 dB under its peak
                   (decay_truncated when it never does); loudness_m_lufs, the max momentary
                   (400 ms) loudness within 0.4 s; centroid_hz over the first ~93 ms; pitch_hz,
                   a median YIN f0 over the first 200 ms (null when quiet).
  loudness         integrated LUFS and LRA (EBU R128 through the media CLI).
  --window name:s,e  energy mean of momentary loudness in [s, e]; --baseline name gives each
                   window's ducking_db against that window.
  --align keyframes.json  nearest keyframe per onset, and the median signed offset (the
                   capture's audio/video skew) over onsets within ten frames of a keyframe.
"""
import argparse
import json
import re
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402

VERSION = 1
SR = 44100


def extract_wav(src, d):
    wav = d / "audio_mono44k.wav"
    if not wav.exists():
        tmp = d / "audio_mono44k.part.wav"
        r = common.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vn", "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", str(tmp)])
        if r.returncode:
            raise common.UsageError("audio extract failed: " + r.stderr[-300:])
        tmp.replace(wav)
    return wav


def ebur128(wav, d):
    meta = d / "ebur_meta.txt"
    r = common.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(wav), "-af",
                    f"ebur128=metadata=1:framelog=quiet,ametadata=mode=print:file={meta}", "-f", "null", "-"])
    txt = r.stderr
    integ = re.search(r"Integrated loudness:\s*\n\s*I:\s*(-?[0-9.]+|-inf) LUFS", txt)
    lra = re.search(r"LRA:\s*([0-9.]+) LU", txt)
    series, t = [], None
    if meta.exists():
        for line in meta.read_text().splitlines():
            m = re.search(r"pts_time:([0-9.]+)", line)
            if m:
                t = float(m.group(1))
            elif "lavfi.r128.M=" in line and t is not None:
                series.append((t, float(line.split("=")[1])))
        meta.unlink()
    return (float(integ.group(1)) if integ and integ.group(1) != "-inf" else None,
            float(lra.group(1)) if lra else None, np.array(series))


def db(x):
    return 20 * np.log10(max(float(x), 1e-10))


def window_lufs(mseries, start, end):
    if not len(mseries):
        return None
    sel = mseries[(mseries[:, 0] >= start) & (mseries[:, 0] <= end), 1]
    sel = sel[np.isfinite(sel) & (sel > -120)]
    if not len(sel):
        return None
    return round(float(10 * np.log10(np.mean(10 ** (sel / 10)))), 1)


def analyse(y, onsets, mseries, window):
    import librosa
    out = []
    env_hop = int(0.005 * SR)
    for i, t in enumerate(onsets):
        s = int(t * SR)
        nxt = onsets[i + 1] if i + 1 < len(onsets) else len(y) / SR
        e = min(int(min(nxt, t + window) * SR), len(y))
        seg = y[s:e]
        if len(seg) < 64:
            continue
        peak = float(np.abs(seg).max())
        n = len(seg) // env_hop
        rms = np.sqrt((seg[: n * env_hop].reshape(n, env_hop) ** 2).mean(1)) if n else np.array([peak])
        pk_i = int(rms.argmax())
        below = np.where(rms[pk_i:] < rms[pk_i] * 10 ** (-30 / 20))[0]
        decay_ms = (below[0] if below.size else len(rms) - pk_i) * 5.0
        c_seg = y[s: s + 4096]
        cen = float(librosa.feature.spectral_centroid(y=c_seg, sr=SR, n_fft=2048, hop_length=1024,
                                                      center=False).mean()) if len(c_seg) >= 2048 else None
        p_seg = y[s: s + int(0.2 * SR)]
        pitch = None
        if len(p_seg) >= 2048 and db(np.abs(p_seg).max()) > -50:
            pitch = float(np.median(librosa.yin(p_seg, fmin=50, fmax=2000, sr=SR, frame_length=2048)))
        lm = None
        if len(mseries):
            sel = mseries[(mseries[:, 0] >= t) & (mseries[:, 0] <= t + 0.4)]
            if len(sel):
                lm = float(sel[:, 1].max())
        out.append({"index": len(out), "t_seconds": round(float(t), 3), "peak_dbfs": round(db(peak), 1),
                    "decay_ms": round(float(decay_ms), 1), "decay_truncated": not bool(below.size),
                    "loudness_m_lufs": None if lm is None else round(lm, 1),
                    "centroid_hz": None if cen is None else round(cen, 0),
                    "pitch_hz": None if pitch is None else round(pitch, 1)})
    return out


def keyframe_list(path):
    try:
        kj = json.loads(Path(path).read_text())
    except (OSError, ValueError) as e:
        raise common.UsageError(f"cannot read keyframes {path}: {e}") from None
    if isinstance(kj, dict):
        kj = kj.get("keyframes") or kj.get("result", {}).get("keyframes")
    if not kj:
        raise common.UsageError(f"{path} holds no keyframes")
    return [{"index": k.get("index", i), "t": float(k.get("t_seconds", k.get("t")))} for i, k in enumerate(kj)]


def align(onsets, kfs, fps):
    kt = np.array([k["t"] for k in kfs])
    frame_ms = 1000 / fps
    rows = []
    for o in onsets:
        j = int(np.abs(kt - o["t_seconds"]).argmin())
        dt = round(float(kt[j] - o["t_seconds"]) * 1000, 1)
        rows.append({"onset": o["index"], "t_seconds": o["t_seconds"], "keyframe_index": kfs[j]["index"],
                     "keyframe_dt_ms": dt, "within_frame": abs(dt) <= frame_ms + 1e-6})
    near = [r["keyframe_dt_ms"] for r in rows if abs(r["keyframe_dt_ms"]) <= 10 * frame_ms]
    return {"fps": fps, "frame_ms": round(frame_ms, 2), "matched": sum(r["within_frame"] for r in rows),
            "median_offset_ms": round(float(np.median(near)), 1) if near else None, "tag": "measured",
            "method": "nearest keyframe per onset; offset is the median keyframe-minus-onset delay over onsets within ten frames",
            "matches": rows}


def parse_window(s):
    m = re.match(r"^([^:]+):([0-9.]+),([0-9.]+)$", s)
    if not m or float(m.group(3)) <= float(m.group(2)):
        raise argparse.ArgumentTypeError("expected name:start,end in seconds")
    return m.group(1), float(m.group(2)), float(m.group(3))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], epilog=__doc__.split("\n\n", 1)[1],
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("media")
    ap.add_argument("--separate", action="store_true", help="detect onsets on the percussive part (HPSS)")
    ap.add_argument("--window", action="append", default=[], type=parse_window, metavar="NAME:START,END")
    ap.add_argument("--baseline", default=None, help="window name that ducking is measured against")
    ap.add_argument("--align", default=None, metavar="KEYFRAMES_JSON", help="keyframes.py result.json or [{t_seconds}]")
    ap.add_argument("--fps", type=float, default=None, help="frame rate for --align (default: from the keyframes result, else 30)")
    ap.add_argument("--delta", type=float, default=0.07, help="onset peak-pick delta (default 0.07; higher = fewer)")
    ap.add_argument("--min-peak-dbfs", type=float, default=-60.0, help="drop onsets quieter than this (default -60)")
    ap.add_argument("--window-max", type=float, default=2.0, help="max analysis window per onset in s (default 2)")
    common.add_common_args(ap)
    a = ap.parse_args(argv)
    if not Path(a.media).is_file():
        raise common.UsageError(f"input not found: {a.media}")
    if a.baseline and a.baseline not in [w[0] for w in a.window]:
        raise common.UsageError(f"--baseline {a.baseline} names no --window")

    t0 = time.time()
    inputs = [a.media] + ([a.align] if a.align else [])
    params = {"separate": a.separate, "windows": a.window, "baseline": a.baseline, "align": bool(a.align), "fps": a.fps,
              "delta": a.delta, "min_peak_dbfs": a.min_peak_dbfs, "window_max": a.window_max}
    d, key = common.cache_dir(inputs, "audio", VERSION, params, a.out)
    env = common.load_cached(d, a.force)
    if env:
        common.report_cached(d)
        return env
    import librosa
    info = common.probe(a.media)
    if not info["has_audio"]:
        raise common.UsageError("no audio stream")
    wav = extract_wav(a.media, d)
    integ, lra, ms = ebur128(wav, d)
    y, _ = librosa.load(wav, sr=SR, mono=True)
    det = librosa.effects.percussive(y) if a.separate else y
    on = librosa.onset.onset_detect(y=det, sr=SR, units="time", delta=a.delta, backtrack=False)
    ons = [o for o in analyse(y, list(on), ms, a.window_max) if o["peak_dbfs"] >= a.min_peak_dbfs]
    for i, o in enumerate(ons):
        o["index"] = i
    windows = [{"name": n, "start": s, "end": e, "lufs": window_lufs(ms, s, e)} for n, s, e in a.window]
    base = next((w for w in windows if w["name"] == a.baseline), None)
    for w in windows:
        w["ducking_db"] = round(w["lufs"] - base["lufs"], 1) if base and w["lufs"] is not None and base["lufs"] is not None else None
    res = {"wav": wav.name, "duration_s": round(len(y) / SR, 3), "integrated_lufs": integ, "lra_lu": lra,
           "loudness_tag": "measured", "loudness_method": "EBU R128 integrated loudness; windows are the energy mean of momentary loudness",
           "windows": windows, "onset_count": len(ons), "onset_tag": "measured",
           "onset_method": "onset detection on the " + ("percussive part after HPSS" if a.separate else "full mix"),
           "onsets": ons}
    if a.align:
        kfs = keyframe_list(a.align)
        try:
            kj = json.loads(Path(a.align).read_text())
            kfps = kj.get("result", {}).get("video", {}).get("fps") if isinstance(kj, dict) else None
        except ValueError:
            kfps = None
        res["alignment"] = align(ons, kfs, a.fps or kfps or 30.0)
    dt = time.time() - t0
    summary = (f"# audio: {Path(a.media).name}\n- duration {res['duration_s']:.1f}s, integrated {integ} LUFS, LRA {lra} LU\n"
               f"- {len(ons)} onsets ({'percussive part' if a.separate else 'full mix'}, delta {a.delta}), runtime {dt:.1f}s\n")
    if ons:
        summary += "- first: " + "; ".join(f"{o['t_seconds']}s {o['peak_dbfs']}dBFS" for o in ons[:5]) + "\n"
    for w in windows:
        summary += f"- window {w['name']} {w['start']}-{w['end']}s: {w['lufs']} LUFS" + (f", {w['ducking_db']} dB vs baseline" if w["ducking_db"] is not None else "") + "\n"
    if a.align:
        al = res["alignment"]
        summary += f"- aligned: {al['matched']}/{len(ons)} onsets within one frame of a keyframe; median offset {al['median_offset_ms']} ms\n"
    return common.finish(d, key, "audio", VERSION, params, res, summary)


if __name__ == "__main__":
    common.run_main(main)
