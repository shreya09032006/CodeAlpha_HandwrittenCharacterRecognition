"""Cut a photo of handwritten text (a word, a chit, an essay page) into one image per line,
ready for a line-level reader such as TrOCR. Uses classic OpenCV: no training needed."""
import cv2
import numpy as np

from ml import preprocess

TEXT_SIDE = 1800     # keep more resolution than for single letters, small writing needs it
MAX_LINES = 60


def _runs(profile: np.ndarray, thresh: float):
    """[(start, end)] of consecutive rows whose ink amount is above thresh."""
    on = profile > thresh
    out, start = [], None
    for i, v in enumerate(on):
        if v and start is None:
            start = i
        elif not v and start is not None:
            out.append([start, i]); start = None
    if start is not None:
        out.append([start, len(on)])
    return out


def _deskew_angle(mask: np.ndarray) -> float:
    """Tilt of the text lines in degrees (positive = counter-clockwise fix). 0 when it cannot tell."""
    if (mask > 0).sum() < 200:
        return 0.0
    f = 480.0 / max(mask.shape)
    small = cv2.resize(mask, None, fx=f, fy=f, interpolation=cv2.INTER_AREA) if f < 1 else mask
    cy, cx = small.shape[0] / 2, small.shape[1] / 2
    scores = []
    for a in np.arange(-8.0, 8.01, 0.5):
        r = cv2.warpAffine(small, cv2.getRotationMatrix2D((cx, cy), a, 1.0), (small.shape[1], small.shape[0]))
        scores.append((float(np.var((r > 0).sum(axis=1))), a))
    best = max(scores)
    # only trust a clear winner, otherwise leave the photo as it is
    return best[1] if best[0] > 1.05 * dict((a, v) for v, a in scores)[0.0] else 0.0


def _pitch(profile: np.ndarray, ch: float):
    """Distance between text lines from the repeating pattern of ink rows, or None when there is no clear rhythm."""
    x = profile - profile.mean()
    if not np.any(x):
        return None
    ac = np.correlate(x, x, "full")[len(x) - 1:]
    ac = ac / ac[0]
    lo, hi = int(ch * 1.0), min(int(ch * 6), len(ac) - 1)
    if hi <= lo:
        return None
    lag = lo + int(np.argmax(ac[lo:hi]))
    return lag if ac[lag] > 0.35 else None


def _valleys(profile: np.ndarray, y0: int, y1: int, pitch: int):
    """Row positions between y0 and y1 where one line of writing ends and the next begins."""
    k = max(2, int(pitch * 0.35))
    cands = [i for i in range(y0 + k, y1 - k) if profile[i] <= profile[i - k:i + k + 1].min()]
    cuts = []
    for i in sorted(cands, key=lambda i: profile[i]):
        if all(abs(i - c) >= 0.6 * pitch for c in cuts):
            cuts.append(i)
    return sorted(cuts)


def split_lines(data: bytes):
    """Returns [{"image": RGB uint8 array (dark text on white), "box": (x0,y0,x1,y1) as 0..1 fractions}]."""
    img = preprocess.decode(data, TEXT_SIDE)
    mask = preprocess.clean_text_mask(img)
    gray = preprocess.flat_gray(img)
    h, w = mask.shape
    angle = _deskew_angle(mask)
    if abs(angle) >= 0.5:                         # straighten a tilted page so lines can be told apart
        m = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
        mask = cv2.warpAffine(mask, m, (w, h))
        gray = cv2.warpAffine(gray, m, (w, h), borderMode=cv2.BORDER_REPLICATE)

    # typical character height decides how much to smooth and how big a gap separates two lines
    n, _, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    heights = stats[1:, cv2.CC_STAT_HEIGHT]
    heights = heights[(heights > 6) & (heights < h * 0.6)]
    if len(heights) == 0:
        raise preprocess.ImageError("No handwriting found. Try a dark pen on plain paper, in good light.")
    ch = float(np.median(heights))

    # join letters into word blobs so each row's ink is measured across the whole line
    wide = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_RECT, (max(3, int(ch * 1.5)), 1)))
    profile = cv2.GaussianBlur((wide > 0).sum(axis=1).astype(np.float32).reshape(-1, 1), (1, 0), ch * 0.25).ravel()
    runs = _runs(profile, max(2.0, 0.04 * profile.max()))

    merged = []                                   # glue runs split by tall letters (t, f, g, y)
    for r in runs:
        if merged and r[0] - merged[-1][1] < ch * 0.35:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    merged = [r for r in merged if r[1] - r[0] >= ch * 0.5]    # specks and ruled-paper remnants
    # lines written close together touch each other, so there is no blank row between them: cut at the valleys instead
    pitch = _pitch(profile, ch)
    if pitch:
        cut = []
        for y0, y1 in merged:
            if y1 - y0 > 1.6 * pitch:
                edges = [y0] + _valleys(profile, y0, y1, pitch) + [y1]
                cut += [[a, b] for a, b in zip(edges, edges[1:]) if b - a >= ch * 0.5]
            else:
                cut.append([y0, y1])
        merged = cut
    if not merged:
        raise preprocess.ImageError("No lines of text found in that image.")
    if len(merged) > MAX_LINES:
        raise preprocess.ImageError(f"That page has more than {MAX_LINES} lines. Photograph it in parts.")

    lines = []
    pad = int(ch * 0.45)
    for y0, y1 in merged:
        y0, y1 = max(0, y0 - pad), min(h, y1 + pad)
        cols = np.where(mask[y0:y1].sum(axis=0) > 0)[0]
        x0, x1 = max(0, cols.min() - pad), min(w, cols.max() + pad)
        crop = gray[y0:y1, x0:x1]
        lines.append({"image": cv2.cvtColor(crop, cv2.COLOR_GRAY2RGB), "box": (x0 / w, y0 / h, x1 / w, y1 / h)})
    return lines
