"""Saved scans for the History and Insights pages.
SQLite for now: no setup, one file (backend/data/inklens.db). Every query is limited to one user's rows."""
import base64
import json
import os
import sqlite3
import uuid
from collections import Counter
from contextlib import contextmanager
from datetime import datetime, time, timedelta, timezone
from pathlib import Path

import cv2
import numpy as np

import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, mode TEXT NOT NULL, created_at TEXT NOT NULL,
  snippet TEXT, result_text TEXT, confidence REAL, image_url TEXT, data TEXT);
CREATE INDEX IF NOT EXISTS scans_user ON scans (user_id, created_at);
"""
FMT = "%Y-%m-%dT%H:%M:%SZ"


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _path() -> Path:
    p = Path(os.getenv("DB_PATH", "data/inklens.db"))
    return p if p.is_absolute() else config.BASE_DIR / p


@contextmanager
def _db():
    p = _path()
    p.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(p, timeout=10)
    c.row_factory = sqlite3.Row
    try:
        c.executescript(SCHEMA)
        with c:                                   # commits on success
            yield c
    finally:
        c.close()


def thumbnail(data: bytes, side: int = 240):
    """A small JPEG of the upload, as a data URL, so History can show what was scanned. None if it cannot be made."""
    try:
        img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            return None
        f = side / max(img.shape[:2])
        if f < 1:
            img = cv2.resize(img, None, fx=f, fy=f, interpolation=cv2.INTER_AREA)
        ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 70])
        return "data:image/jpeg;base64," + base64.b64encode(buf).decode() if ok else None
    except Exception:
        return None


def save(user_id, mode, snippet, result_text, confidence, image=None, data=None, scan_id=None, created_at=None):
    scan_id = scan_id or uuid.uuid4().hex[:12]
    with _db() as c:
        c.execute("INSERT INTO scans VALUES (?,?,?,?,?,?,?,?,?)",
                  (scan_id, user_id, mode, created_at or _utcnow().strftime(FMT), snippet, result_text,
                   float(confidence), thumbnail(image) if image else None, json.dumps(data) if data else None))
    return scan_id


def history(user_id, limit=200):
    with _db() as c:
        rows = c.execute("SELECT id, mode, created_at, snippet, result_text, confidence, image_url FROM scans "
                         "WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?", (user_id, limit)).fetchall()
    return [dict(r) for r in rows]


def clear(user_id):
    """Delete every saved scan of this user. Returns how many were removed."""
    with _db() as c:
        return c.execute("DELETE FROM scans WHERE user_id = ?", (user_id,)).rowcount


def get(user_id, scan_id):
    with _db() as c:
        r = c.execute("SELECT * FROM scans WHERE user_id = ? AND id = ?", (user_id, scan_id)).fetchone()
    if r is None:
        return None
    r = dict(r)
    r["data"] = json.loads(r["data"]) if r["data"] else {}
    return r


def analytics(user_id, tz_minutes=0, days=7, now=None):
    """The last `days` days (days change at midnight in the user's own time zone) in the shape the Insights page draws."""
    now = now or _utcnow()
    today = (now + timedelta(minutes=tz_minutes)).date()
    day_list = [today - timedelta(days=i) for i in range(days - 1, -1, -1)]
    since = datetime.combine(day_list[0], time.min) - timedelta(minutes=tz_minutes)
    with _db() as c:
        rows = c.execute("SELECT mode, created_at, confidence, data FROM scans WHERE user_id = ? AND created_at >= ?",
                         (user_id, since.strftime(FMT))).fetchall()
    per = {d: {"character": 0, "word": 0, "essay": 0, "conf": []} for d in day_list}
    issues = Counter()
    for r in rows:
        d = (datetime.strptime(r["created_at"], FMT) + timedelta(minutes=tz_minutes)).date()
        if d not in per or r["mode"] not in ("character", "word", "essay"):
            continue
        per[d][r["mode"]] += 1
        per[d]["conf"].append(r["confidence"])
        if r["mode"] == "essay" and r["data"]:
            for f in json.loads(r["data"]).get("feedback", []):
                issues[str(f.get("type", "style")).capitalize()] += 1
    return {
        "scans": [{"day": d.strftime("%a"), "character": v["character"], "word": v["word"], "essay": v["essay"]} for d, v in per.items()],
        "confidence": [{"day": d.strftime("%a"), "value": round(100 * sum(v["conf"]) / len(v["conf"]))} for d, v in per.items() if v["conf"]],
        "issues": [{"type": t, "count": n} for t, n in issues.most_common()],
    }
