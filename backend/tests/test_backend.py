import io
import os
import sys
import unittest
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
os.environ.setdefault("MODEL_PATH", "/nonexistent/model.keras")

from ml import preprocess  # noqa: E402
from synth import encode, letter_photo  # noqa: E402

RNG = np.random.default_rng(1)


class PreprocessTests(unittest.TestCase):
    def check(self, x):
        self.assertEqual(x.shape, (28, 28))
        self.assertEqual(x.dtype, np.float32)
        self.assertAlmostEqual(float(x.max()), 1.0, places=3)
        ys, xs = np.where(x > 0.05)
        self.assertGreaterEqual(ys.min(), 1); self.assertLessEqual(ys.max(), 26)
        self.assertGreaterEqual(xs.min(), 1); self.assertLessEqual(xs.max(), 26)
        self.assertLess(abs((ys.min() + ys.max()) / 2 - 13.5), 2.5)   # centred
        self.assertLess(abs((xs.min() + xs.max()) / 2 - 13.5), 2.5)
        ink = (x > 0.5).mean()
        self.assertTrue(0.08 < ink < 0.55, f"stroke coverage {ink:.2f} looks wrong")

    def test_plain_letter(self):
        for ch in "AbgQ":
            self.check(preprocess.prepare_letter(encode(letter_photo(ch, RNG))))

    def test_off_centre_large_photo(self):
        img = letter_photo("R", RNG, size=1400, off_center=True)
        self.check(preprocess.prepare_letter(encode(img, ".jpg")))

    def test_light_on_dark(self):
        self.check(preprocess.prepare_letter(encode(letter_photo("K", RNG, invert=True))))

    def test_table_edge_is_ignored(self):
        img = letter_photo("S", RNG)
        cv2.line(img, (0, 6), (319, 6), (20, 20, 20), 8)           # dark edge along the top
        self.check(preprocess.prepare_letter(encode(img)))

    def test_wide_shadow_band_next_to_letter_is_ignored(self):
        # a soft dark band (paper edge / shadow) that does NOT touch the frame, like in a real phone photo
        img = letter_photo("O", RNG, font=cv2.FONT_HERSHEY_SIMPLEX, thick=9, shadow=False)
        h, w = img.shape[:2]
        band = np.zeros((h, w), np.uint8)
        pts = np.array([[30, 0], [75, 0], [110, h - 1], [30, h - 1]])      # tapered, 45px wide at top
        cv2.fillPoly(band, [pts], 255)
        img[band > 0] = (60, 60, 60)
        x = preprocess.prepare_letter(encode(img))
        self.check(x)
        cols = (x > 0.3).any(axis=0)
        self.assertTrue(cols[:3].sum() == 0 and cols[-3:].sum() == 0)       # glyph is centred, not stretched to a strip
        self.assertGreater(float((x > 0.5)[:, 10:18].mean()), 0.15)         # the hole of the O is open in the middle: no vertical bar glued on

    def test_stray_bar_far_below_letter_is_ignored(self):
        clean_img = letter_photo("Q", np.random.default_rng(5), font=cv2.FONT_HERSHEY_SIMPLEX, thick=8, shadow=False, noise=False)
        img = clean_img.copy()
        h, w = img.shape[:2]
        cv2.line(img, (20, h - 28), (w - 20, h - 28), (70, 70, 70), 7)       # paper edge near the bottom of the photo
        a = preprocess.prepare_letter(encode(clean_img))
        b = preprocess.prepare_letter(encode(img))
        self.check(b)
        self.assertLess(float(np.abs(a - b).mean()), 0.03)                   # same result as the photo without the bar

    def test_dot_of_i_and_separate_strokes_are_kept(self):
        img = np.full((320, 320, 3), 235, np.uint8)
        cv2.line(img, (160, 120), (160, 260), (30, 30, 30), 9)               # stem of an i
        cv2.circle(img, (160, 75), 8, (30, 30, 30), -1)                      # its dot, a separate blob
        x = preprocess.prepare_letter(encode(img))
        rows = (x > 0.4).any(axis=1)
        gaps = np.diff(np.where(rows)[0])
        self.assertTrue((gaps > 1).any(), "the dot of the i was dropped")
        h = np.full((320, 320, 3), 235, np.uint8)                            # an H drawn as three separate strokes
        cv2.line(h, (90, 80), (90, 240), (30, 30, 30), 9)
        cv2.line(h, (230, 80), (230, 240), (30, 30, 30), 9)
        cv2.line(h, (96, 160), (224, 160), (30, 30, 30), 9)
        y = preprocess.prepare_letter(encode(h))
        cols = (y > 0.4).any(axis=0)
        self.assertGreater(int(cols.sum()), 18)                              # both stems survived, so the H is wide

    def test_lighter_edge_shadows_along_the_frame_are_ignored(self):
        # like a real phone photo: a soft wedge along the bottom and a strip down the left side, both lighter than the pen
        base = letter_photo("B", np.random.default_rng(9), font=cv2.FONT_HERSHEY_SIMPLEX, thick=9, shadow=False, noise=False)
        img = base.copy()
        h, w = img.shape[:2]
        cv2.fillPoly(img, [np.array([[w // 3, h - 1], [w - 1, h - 1], [w - 1, h - 70]])], (120, 120, 120))
        cv2.fillPoly(img, [np.array([[0, 0], [10, 0], [10, h - 1], [0, h - 1], [60, h - 1]])], (120, 120, 120))
        a = preprocess.prepare_letter(encode(base))
        b = preprocess.prepare_letter(encode(img))
        self.check(b)
        self.assertLess(float(np.abs(a - b).mean()), 0.03)

    def test_huge_corner_shadow_bigger_than_the_letter_is_ignored(self):
        # a soft, ragged L-shaped shadow along two edges, several times the letter's area, like a real phone photo
        rng = np.random.default_rng(4)
        base = letter_photo("C", rng, font=cv2.FONT_HERSHEY_SIMPLEX, thick=7, shadow=False, noise=False).astype(np.float32)
        h, w = base.shape[:2]
        yy, xx = np.mgrid[0:h, 0:w]
        d = np.minimum(xx, h - 1 - yy).astype(np.float32)                    # distance to the left and bottom edges
        d = d + 6 * cv2.GaussianBlur(rng.normal(size=(h, w)).astype(np.float32), (0, 0), 8) * 8   # ragged border
        shade = 1.0 - 0.55 * np.clip(1 - d / 70, 0, 1)                       # up to 55% darker at the edges, fading inward
        img = np.clip(base * shade[..., None], 0, 255).astype(np.uint8)
        b = preprocess.prepare_letter(encode(img))
        a = preprocess.prepare_letter(encode(base.astype(np.uint8)))
        self.check(b)
        self.assertGreater(float(np.corrcoef(a.ravel(), b.ravel())[0, 1]), 0.8)   # still the same C, not an L glued to it

    def test_faint_thin_leg_of_a_letter_is_kept(self):
        # an R whose diagonal leg is drawn lightly and does not quite touch the stem
        img = np.full((320, 320, 3), 235, np.uint8)
        cv2.line(img, (110, 70), (110, 260), (25, 25, 25), 9)                      # stem
        cv2.ellipse(img, (140, 115), (40, 42), 0, -90, 90, (25, 25, 25), 9)        # bowl
        cv2.line(img, (122, 168), (205, 262), (105, 105, 105), 5)                  # faint leg, small gap to the stem
        x = preprocess.prepare_letter(encode(img))
        self.check(x)
        self.assertGreater(int((x[17:, 14:] > 0.4).sum()), 12)                     # ink survives in the lower-right: the leg

    def test_ink_settings_from_env_change_stroke_and_softness(self):
        data = encode(letter_photo("H", np.random.default_rng(3), font=cv2.FONT_HERSHEY_SIMPLEX, thick=9, shadow=False, noise=False))
        base = preprocess.prepare_letter(data)
        try:
            os.environ["INK_STROKE"], os.environ["INK_SOFTEN"] = "4.2", "0.7"
            tuned = preprocess.prepare_letter(data)
        finally:
            os.environ.pop("INK_STROKE", None); os.environ.pop("INK_SOFTEN", None)
        self.check(tuned)
        self.assertGreater(float((tuned > 0.1).mean()), float((base > 0.1).mean()))   # thicker and softer: more lit pixels
        self.assertTrue(np.allclose(base, preprocess.prepare_letter(data)))           # back to defaults once unset

    def test_thin_dark_strip_near_but_not_touching_the_edge_is_ignored(self):
        base = letter_photo("Q", np.random.default_rng(6), font=cv2.FONT_HERSHEY_SIMPLEX, thick=8, shadow=False, noise=False)
        img = base.copy()
        h, w = img.shape[:2]
        cv2.rectangle(img, (14, 0), (26, h - 1), (45, 45, 45), -1)            # dark strip down the left side, a few px from the edge
        a = preprocess.prepare_letter(encode(base))
        b = preprocess.prepare_letter(encode(img))
        self.check(b)
        self.assertLess(float(np.abs(a - b).mean()), 0.03)

    def test_variants_are_several_valid_renderings_of_one_letter(self):
        views = preprocess.prepare_letter_variants(encode(letter_photo("R", np.random.default_rng(8), font=cv2.FONT_HERSHEY_SIMPLEX, thick=8)))
        self.assertEqual(len(views), len(preprocess.VARIANTS))
        for v in views:
            self.check(v)
        self.assertTrue(np.allclose(views[0], preprocess.prepare_letter(encode(letter_photo("R", np.random.default_rng(8), font=cv2.FONT_HERSHEY_SIMPLEX, thick=8))), atol=1e-6))
        self.assertGreater(float(np.abs(views[0] - views[2]).mean()), 0.01)    # they really differ

    def test_thin_and_thick_pens_end_up_similar(self):
        thin = preprocess.prepare_letter(encode(letter_photo("H", RNG, thick=5, font=cv2.FONT_HERSHEY_SIMPLEX)))
        thick = preprocess.prepare_letter(encode(letter_photo("H", RNG, thick=22, font=cv2.FONT_HERSHEY_SIMPLEX)))
        self.assertLess(abs(float((thin > 0.5).mean()) - float((thick > 0.5).mean())), 0.15)

    def test_blank_page_rejected(self):
        blank = np.full((300, 300, 3), 230, np.uint8)
        with self.assertRaises(preprocess.ImageError):
            preprocess.prepare_letter(encode(blank))

    def test_garbage_rejected(self):
        with self.assertRaises(preprocess.ImageError):
            preprocess.prepare_letter(b"not an image")


class CaseSwitchTests(unittest.TestCase):
    def setUp(self):
        from ml import char_model
        from ml.labels import LABELS
        self.cm = char_model
        p = np.full(62, 1e-4, np.float32)
        p[LABELS.index("b")], p[LABELS.index("B")], p[LABELS.index("G")] = 0.70, 0.25, 0.04
        char_model._model = lambda x, training=False: p[None, :]

    def tearDown(self):
        self.cm._model = None

    def test_auto_follows_the_model(self):
        r = self.cm.predict_letter(np.zeros((28, 28), np.float32))
        self.assertEqual(r["prediction"], "b")

    def test_capital_switch_gives_capital(self):
        r = self.cm.predict_letter(np.zeros((28, 28), np.float32), "upper")
        self.assertEqual((r["prediction"], r["case"]), ("B", "uppercase"))
        self.assertTrue(all(t["label"].isupper() for t in r["top"]))

    def test_several_renderings_are_averaged(self):
        from ml.labels import LABELS
        a = np.full(62, 1e-4, np.float32); a[LABELS.index("F")] = 0.9
        b = np.full(62, 1e-4, np.float32); b[LABELS.index("E")] = 0.6; b[LABELS.index("F")] = 0.35
        c = np.full(62, 1e-4, np.float32); c[LABELS.index("E")] = 0.5; c[LABELS.index("F")] = 0.45
        self.cm._model = lambda x, training=False: np.stack([a, b, c])[:len(x)]
        r = self.cm.predict_letter(np.zeros((3, 28, 28), np.float32))
        self.assertEqual(r["prediction"], "F")                                  # (0.9+0.35+0.45)/3 beats E's (0+0.6+0.5)/3

    def test_small_switch_gives_small(self):
        r = self.cm.predict_letter(np.zeros((28, 28), np.float32), "lower")
        self.assertEqual((r["prediction"], r["case"]), ("b", "lowercase"))
        self.assertTrue(all(t["label"].islower() for t in r["top"]))


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from app import create_app
        cls.client = create_app().test_client()

    def post(self, data, name="a.png", mime="image/png", field="image"):
        return self.client.post("/api/recognize/character", data={field: (io.BytesIO(data), name, mime)}, content_type="multipart/form-data")

    def test_health(self):
        r = self.client.get("/api/health")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.get_json()["character_model"])

    def test_wrong_type(self):
        r = self.post(b"GIF89a", "a.gif", "image/gif")
        self.assertEqual(r.status_code, 400)
        self.assertIn("JPG", r.get_json()["error"])

    def test_bad_case_value_is_400(self):
        r = self.client.post("/api/recognize/character", data={"image": (io.BytesIO(encode(letter_photo("A", RNG))), "a.png", "image/png"), "case": "weird"}, content_type="multipart/form-data")
        self.assertEqual(r.status_code, 400)

    def test_missing_field(self):
        self.assertEqual(self.post(b"x", field="file").status_code, 400)

    def test_blank_is_400(self):
        blank = encode(np.full((300, 300, 3), 230, np.uint8))
        self.assertEqual(self.post(blank).status_code, 400)

    def test_no_model_is_503_with_clear_message(self):
        r = self.post(encode(letter_photo("A", RNG)))
        self.assertEqual(r.status_code, 503)
        self.assertIn("not been trained", r.get_json()["error"])

    def test_essay_stub_is_501(self):
        self.assertEqual(self.client.post("/api/essays").status_code, 501)

    def test_cors_header_for_frontend(self):
        r = self.client.get("/api/health", headers={"Origin": "http://localhost:5173"})
        self.assertEqual(r.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173")


if __name__ == "__main__":
    unittest.main(verbosity=2)
