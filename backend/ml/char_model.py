import threading

import numpy as np

import config
from .labels import LABELS, LETTER_IDX

_lock = threading.Lock()
_model = None


class ModelMissing(RuntimeError):
    pass


def is_ready() -> bool:
    return config.model_path().exists()


def _load_file(path):
    """Open the .keras file. A model trained with a newer Keras (e.g. on Colab) can fail to open on an older one
    because its saved settings contain options the old version does not know. The weights are still readable, so in
    that case we rebuild the same architecture from code and load just the weights into it."""
    import tensorflow as tf
    try:
        return tf.keras.models.load_model(path, compile=False)
    except Exception as first:
        from training.train_emnist import build_model
        model = build_model(62)
        try:
            model.load_weights(str(path))
        except Exception as second:
            raise RuntimeError(f"Could not open the letter model ({first}). Fallback also failed: {second}") from second
        return model


def load():
    """Load the Keras model once, on first use (TensorFlow is heavy, so the API boots without it)."""
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                path = config.model_path()
                if not path.exists():
                    raise ModelMissing(
                        "The letter model has not been trained yet. Run backend/training/train_emnist.py "
                        "and put emnist_cnn.keras in backend/models/."
                    )
                _model = _load_file(path)
    return _model


UPPER_IDX = np.arange(10, 36)   # A-Z
LOWER_IDX = np.arange(36, 62)   # a-z


def predict_letter(x28: np.ndarray, case: str = "auto") -> dict:
    """case: "auto" lets the model pick, "upper" / "lower" limits the answer to capitals / small letters
    (a photo of one letter carries no size information, so the user can tell us which they wrote)."""
    xs = np.asarray(x28, np.float32)
    xs = xs[None] if xs.ndim == 2 else xs                              # one rendering, or several of the same letter
    probs = np.asarray(load()(xs[..., None], training=False)).mean(axis=0)     # several renderings: average their answers
    idx = {"upper": UPPER_IDX, "lower": LOWER_IDX}.get(case, LETTER_IDX)
    letters = probs[idx]
    letters = letters / max(letters.sum(), 1e-9)          # share among the allowed letters only
    order = np.argsort(letters)[::-1]
    top = [{"label": LABELS[idx[i]], "prob": round(float(letters[i]), 4)} for i in order[:5]]

    best = top[0]["label"]
    if case in ("upper", "lower"):
        label = "uppercase" if case == "upper" else "lowercase"
    else:
        twin = best.swapcase()
        twin_p = float(probs[LABELS.index(twin)] / max(probs[LETTER_IDX].sum(), 1e-9))
        # c/C, o/O, s/S, v/V, w/W, x/X, z/Z look the same. Say so instead of guessing.
        unsure_case = twin_p >= 0.35 * top[0]["prob"]
        label = "case unclear" if unsure_case else ("uppercase" if best.isupper() else "lowercase")
    return {"prediction": best, "case": label, "confidence": top[0]["prob"], "top": top}
