"""Turn a photo or scan of ONE handwritten letter into what the EMNIST model expects:
a 28x28 float image, white strokes on black, upright, centred, with an EMNIST-like stroke width."""
import base64
import os

import cv2
import numpy as np

MAX_SIDE = 1024      # work at a fixed scale so thresholds behave the same for every upload
BOX = 24             # EMNIST keeps a small border around the glyph
TARGET_STROKE = 2.4  # stroke width (in 28px space) that EMNIST glyphs have, roughly
SOFTEN = 0.0         # Gaussian blur (sigma, in 28px space) applied last; EMNIST letters are soft, not razor sharp


class ImageError(ValueError):
    """The upload is unusable. The message is safe to show to the user."""


def decode(data: bytes, max_side: int = MAX_SIDE) -> np.ndarray:
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)  # also applies EXIF rotation
    if img is None:
        raise ImageError("That file could not be read as an image.")
    h, w = img.shape[:2]
    k = max_side / max(h, w)
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


def flat_gray(img_bgr: np.ndarray) -> np.ndarray:
    """Shadow-free grayscale, dark ink on a white page. This is what a text reader should see."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    if np.median(gray) < 110:
        gray = 255 - gray
    bg = cv2.GaussianBlur(gray, (0, 0), max(gray.shape) / 12)
    return cv2.divide(gray, bg, scale=255)


def clean_text_mask(img_bgr: np.ndarray) -> np.ndarray:
    """Ink mask for text pages. Drops ruled lines so notebook paper does not look like one giant line."""
    mask = ink_mask(img_bgr)
    h, w = mask.shape
    rules = cv2.morphologyEx(mask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (max(40, w // 4), 1)))
    mask = cv2.subtract(mask, cv2.dilate(rules, np.ones((3, 1), np.uint8)))
    return cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))


def clean(mask: np.ndarray, flat: np.ndarray = None) -> np.ndarray:
    """Keep the letter, drop everything else: specks, table edges, page borders, and soft shadow bands.

    Pen ink is the DARKEST and THINNEST thing in the photo; a shadow or paper edge is lighter and usually much bigger.
    So: first throw away blobs that are clearly lighter than the ink, then pick the letter from what is left
    (big and central), then keep only pieces close to it (dot of an i, a lifted pen)."""
    n, lab, stats, cent = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if n <= 1:
        return mask
    H, W = mask.shape
    area = stats[:, cv2.CC_STAT_AREA]
    margin = 0.05 * min(H, W)
    diag = float(np.hypot(H, W))

    def near_frame(i):
        x, y, w, h = stats[i][:4]
        return x <= margin or y <= margin or x + w >= W - margin or y + h >= H - margin

    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 3)
    thick = np.zeros(n)
    dark = np.zeros(n)
    for i in range(1, n):
        x, y, w, h = stats[i][:4]
        sel = lab[y:y + h, x:x + w] == i
        thick[i] = dist[y:y + h, x:x + w][sel].max()
        if flat is not None:
            dark[i] = 255.0 - np.percentile(flat[y:y + h, x:x + w][sel], 20)   # darkness of the blob's darkest part

    big = [i for i in range(1, n) if area[i] >= max(15, 0.01 * area[1:].max())]
    alive = np.zeros(n, bool)
    alive[big] = True

    # stage 1: clearly lighter than the ink -> shadow. The ink reference is the darkest solid blob that is not
    # glued to the frame (a letter normally sits inside the photo; shadows and edges sit on its border).
    if flat is not None and big:
        inner = [i for i in big if not near_frame(i)] or big
        solid = [i for i in inner if area[i] >= 0.05 * max(area[j] for j in inner)]
        ref = max(dark[i] for i in solid)
        ref_area = max(area[i] for i in solid)
        for i in big:
            ratio = dark[i] / ref if ref > 0 else 1.0
            # a faint piece inside the photo (the thin leg of an R) can belong to the letter; shadows sit on the photo's edge or are huge
            shadow_sized = area[i] >= 0.6 * ref_area or near_frame(i)
            if (ratio < 0.65 and shadow_sized) or (near_frame(i) and ratio < 0.9 and max(stats[i][2] / W, stats[i][3] / H) > 0.3):
                alive[i] = False
        if not alive.any():
            alive[big] = True

    # stage 2: the letter = big AND central among what is left
    ids = [i for i in range(1, n) if alive[i]]
    centrality = np.exp(-((np.hypot(cent[:, 0] - W / 2, cent[:, 1] - H / 2) / (0.35 * diag)) ** 2))
    main = max(ids, key=lambda i: area[i] * centrality[i])

    # stage 3: remove blobs far thicker than the pen, and thin straight lines along the frame
    for i in ids:
        if i == main:
            continue
        x, y, w, h = stats[i][:4]
        if thick[i] > 2.2 * thick[main]:
            alive[i] = False
        elif near_frame(i) and max(w, h) / max(1, min(w, h)) > 8 and max(w / W, h / H) > 0.5:
            alive[i] = False                                          # long thin strip near the photo's edge: paper edge

    # stage 4: one letter = the main blob plus pieces close to it (measured pixel to pixel, so an L-shaped shadow whose
    # bounding box happens to cover the letter is still recognised as far away). Far-away leftovers are not the letter.
    group = {main}
    grew = True
    while grew:
        grew = False
        gm = np.isin(lab, list(group))
        ys, xs = np.where(gm)
        g = 0.25 * max(xs.max() - xs.min(), ys.max() - ys.min())
        d_to_group = cv2.distanceTransform((~gm).astype(np.uint8), cv2.DIST_L2, 3)
        for i in range(1, n):
            if i in group or not alive[i]:
                continue
            x, y, w, h = stats[i][:4]
            if d_to_group[y:y + h, x:x + w][lab[y:y + h, x:x + w] == i].min() <= g:
                group.add(i)
                grew = True
    keep = np.array([i in group for i in range(n)])
    out = np.where(keep[lab], 255, 0).astype(np.uint8)
    if not out.any():
        raise ImageError("No handwriting found. Try a dark pen on plain paper, in good light.")
    return out


def stroke_width(mask: np.ndarray) -> float:
    contours, _ = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    per = sum(cv2.arcLength(c, True) for c in contours)
    return 2.0 * float((mask > 0).sum()) / max(per, 1.0)


def to_emnist(mask: np.ndarray, stroke: float = None, soften: float = None) -> np.ndarray:
    ys, xs = np.where(mask > 0)
    crop = mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    side = max(crop.shape)
    pad = side // 10 + 2
    crop = cv2.copyMakeBorder(crop, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
    # thicken or thin the strokes so they end up EMNIST-thick after downscaling
    px_per_out = side / BOX
    stroke = float(os.getenv("INK_STROKE", TARGET_STROKE)) if stroke is None else stroke   # tunable in backend/.env
    r = int(round((stroke * px_per_out - stroke_width(crop)) / 2))
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
    soften = float(os.getenv("INK_SOFTEN", SOFTEN)) if soften is None else soften
    if soften > 0:
        canvas = cv2.GaussianBlur(canvas, (0, 0), soften)
        canvas /= max(float(canvas.max()), 1e-6)
    return canvas


def prepare_letter(data: bytes) -> np.ndarray:
    img = decode(data)
    return to_emnist(clean(ink_mask(img), flat_gray(img)))


# (pen stroke width, horizontal stretch, softness). One photo, several renderings: the model's answers get averaged,
# so a single unlucky thickness or width cannot decide the result.
VARIANTS = [(2.4, 1.0, 0.0), (3.2, 1.0, 0.0), (4.0, 1.0, 0.5), (2.8, 1.3, 0.0), (3.6, 1.3, 0.5), (3.2, 0.85, 0.0)]


def prepare_letter_variants(data: bytes):
    """The same letter rendered several ways, list of 28x28 arrays. The first one is the plain rendering."""
    img = decode(data)
    mask = clean(ink_mask(img), flat_gray(img))
    out = []
    for stroke, stretch, soften in VARIANTS:
        m = mask
        if stretch != 1.0:
            m = cv2.resize(mask, (max(1, int(mask.shape[1] * stretch)), mask.shape[0]), interpolation=cv2.INTER_LINEAR)
            m = np.where(m > 127, 255, 0).astype(np.uint8)
        out.append(to_emnist(m, stroke, soften))
    return out


def preview_png(x28: np.ndarray) -> str:
    """What the model actually saw, as a data URL (so users can tell why a photo failed)."""
    big = cv2.resize((x28 * 255).astype(np.uint8), (112, 112), interpolation=cv2.INTER_NEAREST)
    ok, buf = cv2.imencode(".png", big)
    return "data:image/png;base64," + base64.b64encode(buf.tobytes()).decode()
