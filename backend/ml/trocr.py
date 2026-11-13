"""TrOCR: a transformer that reads one line of handwriting and predicts its text.
The model is downloaded from Hugging Face the first time it is used, then cached."""
import math
import os
import threading

_lock = threading.Lock()
_engine = None   # callable: list[RGB ndarray] -> list[(text, confidence)]

MODEL_NAME = lambda: os.getenv("TROCR_MODEL", "microsoft/trocr-small-handwritten")


class ReaderUnavailable(RuntimeError):
    """The text reader cannot run. The message is safe to show to the user."""


def set_engine(fn):
    """Swap in another reader (used by the tests so they run without downloading a model)."""
    global _engine
    _engine = fn


def _build():
    try:
        import torch
        from PIL import Image
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
    except ImportError as e:
        raise ReaderUnavailable("Text reading needs the 'torch' and 'transformers' packages. Run: pip install -r requirements.txt") from e
    try:
        name = MODEL_NAME()
        processor = TrOCRProcessor.from_pretrained(name)
        model = VisionEncoderDecoderModel.from_pretrained(name).eval()
    except Exception as e:  # network, disk, bad name
        raise ReaderUnavailable("The handwriting reader could not be loaded. Check the internet connection and try again.") from e

    def run(images, batch=8):
        out = []
        for i in range(0, len(images), batch):
            pix = processor(images=[Image.fromarray(a) for a in images[i:i + batch]], return_tensors="pt").pixel_values
            with torch.no_grad():
                g = model.generate(pix, num_beams=4, max_new_tokens=96, return_dict_in_generate=True, output_scores=True)
            texts = processor.batch_decode(g.sequences, skip_special_tokens=True)
            conf = torch.exp(g.sequences_scores).tolist()      # per-token average probability of the chosen text
            out += [(t.strip(), float(min(1.0, max(0.0, c if math.isfinite(c) else 0.0)))) for t, c in zip(texts, conf)]
        return out
    return run


def read_lines(images):
    global _engine
    if _engine is None:
        with _lock:
            if _engine is None:
                _engine = _build()
    return _engine(images)
