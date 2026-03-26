"""
Flask server for the AI-Powered Legal Assistant (Insurance RAG Chatbot).
"""

import os
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

load_dotenv()

import rag_engine  # noqa: E402  (must come after load_dotenv)

app = Flask(__name__)


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
def index():
    return render_template("index.html")


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
    app.run(debug=True, host="0.0.0.0", port=5000)
