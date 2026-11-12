from dotenv import load_dotenv

load_dotenv()

from flask import Flask, jsonify
from flask_cors import CORS

import config
from api.recognize import bp as recognize_bp
from ml import char_model


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = config.MAX_UPLOAD_MB * 1024 * 1024
    CORS(app, origins=config.CORS_ORIGINS)
    app.register_blueprint(recognize_bp)

    @app.get("/api/health")
    def health():
        return jsonify(status="ok", character_model=char_model.is_ready())

    @app.errorhandler(413)
    def too_big(_):
        return jsonify(error=f"Image is larger than {config.MAX_UPLOAD_MB} MB."), 413

    @app.errorhandler(404)
    def not_found(_):
        return jsonify(error="Not found."), 404

    @app.errorhandler(500)
    def broken(_):
        return jsonify(error="Something went wrong on the server."), 500

    return app


app = create_app()

if __name__ == "__main__":
    import os
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True)
