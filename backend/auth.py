"""Who is asking? With Supabase sign-in switched on, the browser sends its access token and we ask Supabase whose it is.
Without Supabase settings there is only one user ("local"), which is what you want when running on your own computer."""
import os
import time

import requests

_cache: dict = {}          # token -> (user id, valid until), so each page load does not call Supabase again


def enabled() -> bool:
    return bool(os.getenv("SUPABASE_URL", "").strip() and os.getenv("SUPABASE_ANON_KEY", "").strip())


def user_id(req):
    """The user's id, or None when sign-in is required and the visitor is not signed in."""
    if not enabled():
        return "local"
    header = req.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        return None
    token = header[7:].strip()
    hit = _cache.get(token)
    if hit and hit[1] > time.time():
        return hit[0]
    try:
        r = requests.get(os.getenv("SUPABASE_URL").rstrip("/") + "/auth/v1/user", timeout=8,
                         headers={"apikey": os.getenv("SUPABASE_ANON_KEY"), "Authorization": f"Bearer {token}"})
        uid = r.json().get("id") if r.status_code == 200 else None
    except (requests.RequestException, ValueError):
        return None
    if uid:
        if len(_cache) > 500:
            _cache.clear()
        _cache[token] = (uid, time.time() + 120)
    return uid
