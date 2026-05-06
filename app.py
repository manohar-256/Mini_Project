"""
Flask server for the AI-Powered Legal Assistant (Insurance RAG Chatbot).
"""

import os
from flask import Flask, render_template, request, jsonify, send_from_directory
from dotenv import load_dotenv

load_dotenv()

import rag_engine  # noqa: E402  (must come after load_dotenv)

app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "5000"))
DEBUG = os.getenv("FLASK_DEBUG", "true").lower() in {"1", "true", "yes", "on"}


# ── Startup: ingest PDFs automatically ─────────────────────────────────────────
def _initialize():
    """Load existing vector store, or re-ingest if PDFs have changed."""
    if rag_engine.load_vectorstore():
        # Check if any PDFs were added, removed, or modified
        if rag_engine._has_data_changed():
            print("📢 PDF changes detected — re-ingesting …")
            rag_engine.ingest()
    else:
        rag_engine.ingest()


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/")
def home():
    return render_template("home.html")


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/contact")
def contact():
    return render_template("contact.html")


@app.route("/contact/form")
def contact_form():
    return render_template("contact_form.html")


@app.route("/login")
def login():
    return render_template("login.html")


@app.route("/register")
def register():
    return render_template("create_login.html")


@app.route("/chat")
def chat_page():
    return render_template("index.html")


@app.route("/frontend/<path:filename>")
def frontend_asset(filename):
    return send_from_directory(FRONTEND_DIR, filename)


@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json(force=True)
    question = data.get("question", "").strip()

    if not question:
        return jsonify({"answer": "Please enter a question."}), 400

    answer = rag_engine.query(question)
    return jsonify({"answer": answer})


# ── Main ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    _initialize()
    app.run(debug=True, port=5001);
