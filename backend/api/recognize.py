import os

import numpy as np
from flask import Blueprint, jsonify, request

import config
from api.history import remember
from ml import char_model, preprocess

bp = Blueprint("recognize", __name__, url_prefix="/api")


def read_upload() -> bytes:
    f = request.files.get("image")
    if f is None:
        raise preprocess.ImageError("Send the picture in a form field called 'image'.")
    if f.mimetype not in config.ALLOWED_TYPES:
        raise preprocess.ImageError("Only JPG, JPEG and PNG images are supported.")
    return f.read()


@bp.post("/recognize/character")
def character():
    try:
        data = read_upload()
        if os.getenv("INK_TTA", "1") == "0":
            views = [preprocess.prepare_letter(data)]
        else:
            views = preprocess.prepare_letter_variants(data)
        x = views[0]
        case = request.form.get("case", "auto")
        if case not in ("auto", "upper", "lower"):
            raise preprocess.ImageError("case must be auto, upper or lower.")
        result = char_model.predict_letter(np.stack(views), case)
    except preprocess.ImageError as e:
        return jsonify(error=str(e)), 400
    except char_model.ModelMissing as e:
        return jsonify(error=str(e)), 503
    result["preview"] = preprocess.preview_png(x)
    remember("character", f"{result['prediction']} ({result['case']})", result["prediction"], result["confidence"], image=data)
    return jsonify(result)


@bp.post("/recognize/word")
def word():
    """A word, a chit or a page of handwriting -> typed text. Every prediction comes from the TrOCR model."""
    try:
        from ml import line_split, trocr      # imported here so the letter feature works without the text reader
    except ImportError:
        return jsonify(error="The text reader is not installed on this server yet."), 503
    try:
        data = read_upload()
        lines = line_split.split_lines(data)
        preds = trocr.read_lines([l["image"] for l in lines])
    except preprocess.ImageError as e:
        return jsonify(error=str(e)), 400
    except trocr.ReaderUnavailable as e:
        return jsonify(error=str(e)), 503
    items = [{"text": t, "confidence": round(c, 4), "box": [round(v, 4) for v in l["box"]]}
             for l, (t, c) in zip(lines, preds) if t]
    if not items:
        return jsonify(error="The reader could not make out any text. Try a clearer, larger photo."), 400
    # weight each line's confidence by its length so one short stray line does not drag the score
    weight = sum(len(i["text"]) for i in items)
    overall = sum(i["confidence"] * len(i["text"]) for i in items) / weight
    text = "\n".join(i["text"] for i in items)
    remember("word", text.split("\n")[0][:80] + ("\u2026" if "\n" in text or len(text) > 80 else ""), text, overall, image=data)
    return jsonify(text=text, confidence=round(overall, 4), lines=items)
