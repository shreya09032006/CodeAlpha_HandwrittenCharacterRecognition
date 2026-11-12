"""Draw fake 'photos' of handwritten letters so the pipeline can be tested without any dataset."""
import cv2
import numpy as np

FONTS = [cv2.FONT_HERSHEY_SIMPLEX, cv2.FONT_HERSHEY_DUPLEX, cv2.FONT_HERSHEY_COMPLEX, cv2.FONT_HERSHEY_TRIPLEX, cv2.FONT_HERSHEY_SCRIPT_SIMPLEX]


def letter_photo(ch, rng, size=320, thick=None, font=None, shadow=True, noise=True, invert=False, off_center=False):
    img = np.full((size, size), 235, np.uint8)
    font = FONTS[rng.integers(len(FONTS))] if font is None else font
    scale = rng.uniform(4.0, 6.0) * size / 320
    thick = int(rng.integers(6, 18)) if thick is None else thick
    (w, h), base = cv2.getTextSize(ch, font, scale, thick)
    x = (size - w) // 2 + (int(rng.integers(-size // 6, size // 6)) if off_center else 0)
    y = (size + h) // 2 + (int(rng.integers(-size // 6, size // 6)) if off_center else 0)
    cv2.putText(img, ch, (x, y), font, scale, 30, thick, cv2.LINE_AA)
    if shadow:  # phone lighting: smooth gradient across the page
        gx = np.linspace(rng.uniform(0.6, 1.0), rng.uniform(0.85, 1.0), size)[None, :]
        img = (img * gx).astype(np.uint8)
    if noise:
        img = np.clip(img.astype(np.int16) + rng.normal(0, 6, img.shape), 0, 255).astype(np.uint8)
    if invert:
        img = 255 - img
    return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)


def encode(img, ext=".png"):
    ok, buf = cv2.imencode(ext, img)
    return buf.tobytes()
