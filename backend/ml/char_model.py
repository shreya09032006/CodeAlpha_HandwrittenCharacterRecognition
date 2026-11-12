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
                import tensorflow as tf
                _model = tf.keras.models.load_model(path, compile=False)
    return _model


def predict_letter(x28: np.ndarray) -> dict:
    probs = np.asarray(load()(x28[None, :, :, None], training=False))[0]
    letters = probs[LETTER_IDX]
    letters = letters / max(letters.sum(), 1e-9)          # share among the 52 letters only
    order = np.argsort(letters)[::-1]
    top = [{"label": LABELS[LETTER_IDX[i]], "prob": round(float(letters[i]), 4)} for i in order[:5]]

    best = top[0]["label"]
    twin = best.swapcase()
    twin_p = float(letters[list(LETTER_IDX).index(LABELS.index(twin))])
    # c/C, o/O, s/S, v/V, w/W, x/X, z/Z look the same. Say so instead of guessing.
    unsure_case = twin_p >= 0.35 * top[0]["prob"]
    return {
        "prediction": best,
        "case": "case unclear" if unsure_case else ("uppercase" if best.isupper() else "lowercase"),
        "confidence": top[0]["prob"],
        "top": top,
    }
