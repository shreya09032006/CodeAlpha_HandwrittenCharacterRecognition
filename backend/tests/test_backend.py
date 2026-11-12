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

    def test_missing_field(self):
        self.assertEqual(self.post(b"x", field="file").status_code, 400)

    def test_blank_is_400(self):
        blank = encode(np.full((300, 300, 3), 230, np.uint8))
        self.assertEqual(self.post(blank).status_code, 400)

    def test_no_model_is_503_with_clear_message(self):
        r = self.post(encode(letter_photo("A", RNG)))
        self.assertEqual(r.status_code, 503)
        self.assertIn("not been trained", r.get_json()["error"])

    def test_stubs_are_501(self):
        self.assertEqual(self.client.post("/api/recognize/word").status_code, 501)
        self.assertEqual(self.client.post("/api/essays").status_code, 501)

    def test_cors_header_for_frontend(self):
        r = self.client.get("/api/health", headers={"Origin": "http://localhost:5173"})
        self.assertEqual(r.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173")


if __name__ == "__main__":
    unittest.main(verbosity=2)
