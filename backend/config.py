import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

MAX_UPLOAD_MB = 10
ALLOWED_TYPES = {"image/jpeg", "image/png"}
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]


def model_path() -> Path:
    p = Path(os.getenv("MODEL_PATH", "models/emnist_cnn.keras"))
    return p if p.is_absolute() else BASE_DIR / p
