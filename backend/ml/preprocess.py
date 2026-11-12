"""Turn a photo or scan of ONE handwritten letter into what the EMNIST model expects:
a 28x28 float image, white strokes on black, upright, centred, with an EMNIST-like stroke width."""
import base64

import cv2
import numpy as np

MAX_SIDE = 1024      # work at a fixed scale so thresholds behave the same for every upload
BOX = 24             # EMNIST keeps a small border around the glyph
TARGET_STROKE = 2.4  # stroke width (in 28px space) that EMNIST glyphs have, roughly


class ImageError(ValueError):
    """The upload is unusable. The message is safe to show to the user."""


def decode(data: bytes) -> np.ndarray:
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)  # also applies EXIF rotation
    if img is None:
        raise ImageError("That file could not be read as an image.")
    h, w = img.shape[:2]
    k = MAX_SIDE / max(h, w)
    if k < 1:
        img = cv2.resize(img, (int(w * k), int(h * k)), interpolation=cv2.INTER_AREA)
    return img


def ink_mask(img_bgr: np.ndarray) -> np.ndarray:
    """255 where there is handwriting. Copes with shadows, uneven phone lighting and chalk-on-dark."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    if np.median(gray) < 110:                       # dark background -> make it dark-on-light
        gray = 255 - gray
    bg = cv2.GaussianBlur(gray, (0, 0), max(gray.shape) / 12)
    flat = cv2.divide(gray, bg, scale=255)           # evens out shadows and gradients
    flat = cv2.GaussianBlur(flat, (3, 3), 0)
    if (flat < 190).mean() < 0.0004:
        raise ImageError("No handwriting found. Try a dark pen on plain paper, in good light.")
    _, mask = cv2.threshold(flat, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    return cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))


def clean(mask: np.ndarray) -> np.ndarray:
    """Drop specks and long straight things touching the frame (table edges, page borders)."""
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if n <= 1:
        return mask
    H, W = mask.shape
    biggest = stats[1:, cv2.CC_STAT_AREA].max()
    keep = np.zeros(n, bool)
    for i in range(1, n):
        x, y, w, h, a = stats[i]
        if a < max(15, 0.01 * biggest):
            continue
        touches = x == 0 or y == 0 or x + w >= W or y + h >= H
        aspect = max(w, h) / max(1, min(w, h))
        if touches and aspect > 10:
            continue
        keep[i] = True
    out = np.where(keep[lab], 255, 0).astype(np.uint8)
    if not out.any():
        raise ImageError("No handwriting found. Try a dark pen on plain paper, in good light.")
    return out


def stroke_width(mask: np.ndarray) -> float:
    contours, _ = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    per = sum(cv2.arcLength(c, True) for c in contours)
    return 2.0 * float((mask > 0).sum()) / max(per, 1.0)


def to_emnist(mask: np.ndarray) -> np.ndarray:
    ys, xs = np.where(mask > 0)
    crop = mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    side = max(crop.shape)
    pad = side // 10 + 2
    crop = cv2.copyMakeBorder(crop, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
    # thicken or thin the strokes so they end up EMNIST-thick after downscaling
    px_per_out = side / BOX
    r = int(round((TARGET_STROKE * px_per_out - stroke_width(crop)) / 2))
    if r > 0:
        crop = cv2.dilate(crop, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))
    ys, xs = np.where(crop > 0)
    crop = crop[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = crop.shape
    k = BOX / max(h, w)
    small = cv2.resize(crop, (max(1, round(w * k)), max(1, round(h * k))), interpolation=cv2.INTER_AREA).astype(np.float32)
    small /= max(small.max(), 1.0)
    canvas = np.zeros((28, 28), np.float32)
    oy, ox = (28 - small.shape[0]) // 2, (28 - small.shape[1]) // 2
    canvas[oy:oy + small.shape[0], ox:ox + small.shape[1]] = small
    return canvas


def prepare_letter(data: bytes) -> np.ndarray:
    return to_emnist(clean(ink_mask(decode(data))))


def preview_png(x28: np.ndarray) -> str:
    """What the model actually saw, as a data URL (so users can tell why a photo failed)."""
    big = cv2.resize((x28 * 255).astype(np.uint8), (112, 112), interpolation=cv2.INTER_NEAREST)
    ok, buf = cv2.imencode(".png", big)
    return "data:image/png;base64," + base64.b64encode(buf.tobytes()).decode()
