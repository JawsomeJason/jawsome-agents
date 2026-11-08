"""Unit checks for the math in the measuring scripts. Run through units.test.mjs."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "skills" / "reference-measure" / "scripts"))
import common  # noqa: E402
import keyframes  # noqa: E402
import timing  # noqa: E402


class Colour(unittest.TestCase):
    def test_ciede2000_reference_pairs(self):
        self.assertAlmostEqual(common.ciede2000((50, 2.6772, -79.7751), (50, 0, -82.7485)), 2.0425, places=3)
        self.assertAlmostEqual(common.ciede2000((50, 2.5, 0), (50, 0, -2.5)), 4.3065, places=3)
        self.assertAlmostEqual(common.ciede2000((60.2574, -34.0099, 36.2677), (60.4626, -34.1751, 39.4387)), 1.2644, places=3)

    def test_token_shapes_and_verdicts(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "t.json"
            p.write_text(json.dumps({"color": {"ground": {"$value": {"light": "#e4eaf4", "dark": "#000"}},
                                               "scrim": "rgba(12, 22, 32, 0.6)", "grad": "linear-gradient(red, blue)"},
                                     "font": {"body": "Sans"}}))
            toks = common.load_tokens(str(p), "light")
            self.assertEqual([t["name"] for t in toks], ["color.ground", "color.scrim"])
            self.assertEqual(common.nearest_token((228, 234, 244), toks)["verdict"], "exact")
            n = common.nearest_token((200, 40, 40), toks)
            self.assertEqual(n["verdict"], "none")
            self.assertEqual(n["runner_up"]["token"], "color.ground")
            p.write_text(json.dumps([{"name": "a", "value": "#fff"}]))
            self.assertEqual(common.load_tokens(str(p))[0]["hex"], "#ffffff")


class Cache(unittest.TestCase):
    def test_key_follows_bytes_and_params_not_order(self):
        with tempfile.TemporaryDirectory() as d:
            a, b = Path(d) / "a.bin", Path(d) / "renamed.bin"
            a.write_bytes(b"x")
            b.write_bytes(b"x")
            k1 = common.cache_key([a], "s", 1, {"p": 1, "q": 2})
            k2 = common.cache_key([b], "s", 1, {"q": 2, "p": 1})
            self.assertEqual((k1["inputs_sha12"], k1["params_sha8"]), (k2["inputs_sha12"], k2["params_sha8"]))
            self.assertNotEqual(k1["params_sha8"], common.cache_key([a], "s", 1, {"p": 2})["params_sha8"])


class Sheets(unittest.TestCase):
    def test_one_sheet_per_batch_within_cap(self):
        (s,) = keyframes.plan_sheets(24, 1920 / 1080, 1200, 120)
        self.assertEqual(s["count"], 24)
        w = s["cols"] * (s["tile_w"] + keyframes.PAD) + keyframes.PAD
        h = s["rows"] * (s["tile_h"] + keyframes.LABEL_H + keyframes.PAD) + keyframes.PAD
        self.assertLessEqual(max(w, h), 1200)

    def test_large_batch_splits_evenly(self):
        plans = keyframes.plan_sheets(200, 1080 / 1920, 1200, 160)
        self.assertGreater(len(plans), 1)
        self.assertEqual(sum(p["count"] for p in plans), 200)
        self.assertLessEqual(max(p["count"] for p in plans) - min(p["count"] for p in plans), 1)
        for p in plans:
            self.assertGreaterEqual(max(p["tile_w"], p["tile_h"]), 160)


class Motion(unittest.TestCase):
    def test_ease_out_cubic_with_true_duration(self):
        ts = np.arange(60) / 60
        p = 1 - (1 - np.clip((np.arange(60) - 10) / 24, 0, 1)) ** 3
        r = timing.analyse(ts, None, p)
        self.assertEqual(r["best_fit"]["name"], "ease-out-cubic")
        self.assertLessEqual(abs(r["best_fit"]["duration_ms"] - 400), r["frame_ms"])
        self.assertLess(r["duration_ms"], 400)  # 2% settling cuts the slow tail
        self.assertEqual((r["timing_tag"], r["fit_tag"]), ("measured", "estimate"))

    def test_spring_with_overshoot(self):
        ts = np.arange(70) / 60
        p = np.where(np.arange(70) < 10, 0.0, timing.spring(np.maximum(0, ts - 10 / 60), 300, 0.4))
        r = timing.analyse(ts, None, p)
        b = r["best_fit"]
        self.assertEqual(b["name"], "spring")
        self.assertLess(abs(b["stiffness"] - 300), 15)
        self.assertLess(abs(b["damping_ratio"] - 0.4), 0.03)
        self.assertLess(abs(r["overshoot_pct"] - 25.4), 1.5)

    def test_diff_only_is_a_lower_bound(self):
        ts = np.arange(40) / 30
        d = np.where((np.arange(40) > 10) & (np.arange(40) <= 19), 20.0, 0.2)
        r = timing.analyse(ts, d, None)
        self.assertEqual(r["duration_ms"], 300.0)
        self.assertIn("lower bound", " ".join(r["warnings"]))

    def test_few_samples_flagged(self):
        ts = np.arange(12) / 30
        r = timing.analyse(ts, None, np.clip((np.arange(12) - 3) / 5, 0, 1))
        self.assertIn("cannot be told apart", " ".join(r["warnings"]))


if __name__ == "__main__":
    unittest.main()
