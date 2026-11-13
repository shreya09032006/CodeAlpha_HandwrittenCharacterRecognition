import logging

from flask import Blueprint, jsonify, request

import auth
import store

log = logging.getLogger("inklens.history")
bp = Blueprint("history", __name__, url_prefix="/api")


def current_user():
    return auth.user_id(request)


def remember(mode, snippet, result_text, confidence, image=None, data=None, scan_id=None):
    """Save a finished scan for the signed-in user. A storage problem must never break the scan itself."""
    try:
        uid = current_user()
        if uid:
            return store.save(uid, mode, snippet, result_text, confidence, image, data, scan_id)
    except Exception as e:
        log.warning("could not save the scan: %s", e)
    return None


@bp.get("/history")
def history():
    uid = current_user()
    if not uid:
        return jsonify(error="Sign in to see your history."), 401
    return jsonify(store.history(uid))


@bp.delete("/history")
def clear_history():
    uid = current_user()
    if not uid:
        return jsonify(error="Sign in first."), 401
    return jsonify(deleted=store.clear(uid))


@bp.get("/analytics")
def analytics():
    uid = current_user()
    if not uid:
        return jsonify(error="Sign in to see your insights."), 401
    try:
        tz = max(-840, min(840, int(request.args.get("tz", 0))))
    except ValueError:
        tz = 0
    return jsonify(store.analytics(uid, tz))
