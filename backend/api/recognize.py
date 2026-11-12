from flask import Blueprint, jsonify, request

import config
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
        x = preprocess.prepare_letter(read_upload())
        result = char_model.predict_letter(x)
    except preprocess.ImageError as e:
        return jsonify(error=str(e)), 400
    except char_model.ModelMissing as e:
        return jsonify(error=str(e)), 503
    result["preview"] = preprocess.preview_png(x)
    return jsonify(result)


@bp.post("/recognize/word")
def word():
    return jsonify(error="Word recognition is not available yet."), 501


@bp.post("/essays")
def essays():
    return jsonify(error="Essay correction is not available yet."), 501
