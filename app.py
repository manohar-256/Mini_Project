# ============================================================
#  PolicyGuard AI  —  app.py  (Bug-Fixed Version)
# ============================================================
#
# HOW TO RUN:
#   1. Create a .env file in this folder containing:
#        HF_TOKEN=hf_your_actual_token_here
#   2. pip install langchain==0.1.20 langchain-community==0.0.38
#      langchain-huggingface==0.0.3 langchain-core==0.1.52
#      faiss-cpu==1.7.4 sentence-transformers==2.7.0
#      huggingface-hub==0.23.4 flask pypdf python-dotenv
#      tf-keras langchain-text-splitters
#   3. python ingest.py          (once, to build the vector DB)
#   4. python app.py             (starts the web server)
# ============================================================

# ── BUG FIX 1 ──────────────────────────────────────────────
# TF / Keras env-vars MUST be set before any tensorflow /
# keras import happens.  Moved them to the very top.
import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_USE_LEGACY_KERAS']    = '1'

# ── BUG FIX 2 ──────────────────────────────────────────────
# README says to add dotenv support but base file was missing it.
from dotenv import load_dotenv
load_dotenv()          # reads HF_TOKEN from .env automatically

# ── Standard imports ────────────────────────────────────────
from flask import Flask, request, jsonify, render_template_string

from langchain_huggingface  import HuggingFaceEndpoint, HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# ── BUG FIX 3 ──────────────────────────────────────────────
# RetrievalQA is deprecated in newer LangChain and can cause
# silent failures.  We now build the chain manually using the
# LCEL (LangChain Expression Language) pipe syntax instead.
from langchain_core.prompts         import PromptTemplate
from langchain_core.output_parsers  import StrOutputParser
from langchain_core.runnables       import RunnablePassthrough

# ── CONFIGURATION ───────────────────────────────────────────
HF_TOKEN = os.environ.get("HF_TOKEN")
if not HF_TOKEN:
    raise ValueError(
        "HF_TOKEN environment variable not set.\n"
        "Create a .env file with:  HF_TOKEN=hf_xxxx"
    )

DB_FAISS_PATH = "vectorstore/db_faiss"

app = Flask(__name__)

# ── LOAD MODELS (once at startup) ───────────────────────────
print("--- Loading Database & AI Model… ---")

qa_chain = None

try:
    # A. Vector Database
    embeddings = HuggingFaceEmbeddings(
        model_name='sentence-transformers/all-MiniLM-L6-v2',
        model_kwargs={'device': 'cpu'}
    )
    db = FAISS.load_local(
        DB_FAISS_PATH,
        embeddings,
        allow_dangerous_deserialization=True
    )
    retriever = db.as_retriever(search_kwargs={'k': 3})

    # ── BUG FIX 4 ──────────────────────────────────────────
    # Old code used 'huggingfacehub_api_token' kwarg which was
    # removed/renamed.  Correct approach: set the env variable
    # (already done via load_dotenv) and pass only model params.
    # Also added task="text-generation" which is now REQUIRED.
    llm = HuggingFaceEndpoint(
        repo_id="mistralai/Mistral-7B-Instruct-v0.3",
        task="text-generation",          # BUG FIX 4 – required param
        max_new_tokens=512,
        temperature=0.1,
        # huggingfacehub_api_token  ← REMOVED (caused auth errors)
        # The SDK now reads HUGGINGFACEHUB_API_TOKEN env var, so we
        # just set it below to keep everything in one place.
    )
    # Make sure the HF SDK finds the token via its expected env var name
    os.environ.setdefault("HUGGINGFACEHUB_API_TOKEN", HF_TOKEN)

    # B. Prompt Template
    prompt_template = """You are a legal assistant specialising in Indian Insurance Law.
Use ONLY the context below to answer the question.
If the answer is not in the context, say exactly:
"I do not have enough information in the provided documents."
Do not make up an answer.

Context:
{context}

Question: {question}

Answer:"""

    PROMPT = PromptTemplate(
        template=prompt_template,
        input_variables=["context", "question"]
    )

    # ── BUG FIX 5 ──────────────────────────────────────────
    # Build chain with LCEL instead of deprecated RetrievalQA.
    # This format_docs helper turns Document objects into plain text.
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    # LCEL pipeline:  question → retrieve docs → format → LLM → parse
    qa_chain = (
        {
            "context":  retriever | format_docs,
            "question": RunnablePassthrough()
        }
        | PROMPT
        | llm
        | StrOutputParser()
    )

    print("--- System Ready! ---")

except Exception as e:
    print(f"FATAL: Failed to load models: {e}")
    print("The /ask endpoint will return 503 until this is resolved.")


# ── HTML FRONTEND ────────────────────────────────────────────
FRONTEND_HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>PolicyGuard AI</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      padding: 24px 16px;
    }

    h1 {
      font-size: 1.8rem;
      font-weight: 700;
      color: #38bdf8;
      margin-bottom: 6px;
    }
    .subtitle { font-size: 0.9rem; color: #94a3b8; margin-bottom: 24px; }

    #chat-box {
      width: 100%;
      max-width: 760px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      height: 420px;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    .bubble {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 0.92rem;
      line-height: 1.5;
      word-break: break-word;
    }
    .bubble.user {
      align-self: flex-end;
      background: #0ea5e9;
      color: #fff;
      border-bottom-right-radius: 2px;
    }
    .bubble.ai {
      align-self: flex-start;
      background: #334155;
      color: #e2e8f0;
      border-bottom-left-radius: 2px;
    }
    .bubble.error {
      align-self: flex-start;
      background: #7f1d1d;
      color: #fca5a5;
      border-bottom-left-radius: 2px;
    }
    .bubble .label {
      font-weight: 700;
      font-size: 0.78rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 4px;
      opacity: 0.7;
    }

    #input-row {
      display: flex;
      gap: 8px;
      width: 100%;
      max-width: 760px;
    }
    #user-input {
      flex: 1;
      padding: 12px 16px;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 8px;
      color: #e2e8f0;
      font-size: 0.95rem;
      outline: none;
      transition: border-color .2s;
    }
    #user-input:focus { border-color: #38bdf8; }

    button {
      padding: 12px 22px;
      background: #0ea5e9;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: background .2s;
    }
    button:hover { background: #38bdf8; }
    button:disabled { background: #475569; cursor: not-allowed; }

    #loading {
      font-size: 0.85rem;
      color: #f59e0b;
      margin-top: 8px;
      display: none;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>⚖️ PolicyGuard AI</h1>
  <p class="subtitle">Your intelligent assistant for Indian Insurance Law</p>

  <div id="chat-box">
    <div class="bubble ai">
      <div class="label">PolicyGuard</div>
      Hello! Ask me anything about Indian insurance laws, policy terms, or claim procedures.
    </div>
  </div>

  <div id="input-row">
    <input type="text" id="user-input" placeholder="e.g. What are the claim settlement rules under IRDAI?"/>
    <button id="ask-btn" onclick="sendMessage()">Ask</button>
  </div>
  <div id="loading">⏳ Analysing legal documents…</div>

  <script>
    const chatBox  = document.getElementById("chat-box");
    const inputEl  = document.getElementById("user-input");
    const loadingEl= document.getElementById("loading");
    const askBtn   = document.getElementById("ask-btn");

    function addBubble(cls, label, text) {
      const wrap = document.createElement("div");
      wrap.className = "bubble " + cls;
      if (label) {
        const lbl = document.createElement("div");
        lbl.className = "label";
        lbl.textContent = label;
        wrap.appendChild(lbl);
      }
      wrap.appendChild(document.createTextNode(text));
      chatBox.appendChild(wrap);
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    async function sendMessage() {
      const question = inputEl.value.trim();
      if (!question) return;

      addBubble("user", "You", question);
      inputEl.value = "";
      loadingEl.style.display = "block";
      askBtn.disabled = true;

      try {
        const resp = await fetch("/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: question })
        });
        const data = await resp.json();
        loadingEl.style.display = "none";
        askBtn.disabled = false;

        if (!resp.ok) {
          addBubble("error", "Error", data.error || "Something went wrong.");
        } else {
          addBubble("ai", "PolicyGuard", data.answer);
        }
      } catch (err) {
        loadingEl.style.display = "none";
        askBtn.disabled = false;
        addBubble("error", "Network Error", "Could not reach the server. Is it running?");
      }
    }

    inputEl.addEventListener("keydown", e => { if (e.key === "Enter") sendMessage(); });
  </script>
</body>
</html>'''


# ── ROUTES ──────────────────────────────────────────────────

@app.route('/')
def home():
    return render_template_string(FRONTEND_HTML)


@app.route('/ask', methods=['POST'])
def ask():
    if qa_chain is None:
        return jsonify({
            "error": "AI model failed to load on startup. Check server logs."
        }), 503

    data  = request.json or {}
    query = data.get('query', '').strip()

    if not query:
        return jsonify({"error": "No query provided"}), 400

    try:
        # ── BUG FIX 6 ──────────────────────────────────────
        # Old code used  qa_chain.invoke({"query": query})
        # LCEL chain expects a plain string (the question),
        # not a dict, because RunnablePassthrough passes it through.
        answer = qa_chain.invoke(query)
        return jsonify({"answer": answer})
    except Exception as e:
        return jsonify({"error": f"Failed to process query: {str(e)}"}), 500


# ── ENTRY POINT ─────────────────────────────────────────────
if __name__ == '__main__':
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug_mode, port=5000)