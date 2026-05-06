# RAG Engine — PDF ingestion + FAISS vector store + Groq LLM query pipeline.
# ── Imports ─────────────────────────────────────────────────
import os
import json
from pathlib import Path
from groq import Groq
from PyPDF2 import PdfReader
from langchain_text_splitters             import RecursiveCharacterTextSplitter
from langchain_huggingface                import HuggingFaceEmbeddings
from langchain_community.vectorstores     import FAISS

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
VECTORSTORE_DIR = os.path.join(BASE_DIR, "vectorstore")
MANIFEST_PATH = os.path.join(VECTORSTORE_DIR, "manifest.json")

# ── Embedding model ───────────────────────────────────────
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def _resolve_embedding_model_source() -> tuple[str, dict]:
    """Prefer a cached local Hugging Face snapshot when available."""
    cache_root = (
        Path.home()
        / ".cache"
        / "huggingface"
        / "hub"
        / "models--sentence-transformers--all-MiniLM-L6-v2"
        / "snapshots"
    )

    if cache_root.exists():
        snapshots = sorted(path for path in cache_root.iterdir() if path.is_dir())
        if snapshots:
            return str(snapshots[-1]), {"local_files_only": True}

    return EMBEDDING_MODEL_NAME, {}


EMBEDDING_MODEL_SOURCE, EMBEDDING_MODEL_KWARGS = _resolve_embedding_model_source()
embeddings = HuggingFaceEmbeddings(
    model_name=EMBEDDING_MODEL_SOURCE,
    model_kwargs=EMBEDDING_MODEL_KWARGS,
)

# ── Groq API ───────────────────────────────────────────────────────
GROQ_MODEL = "llama-3.3-70b-versatile"

# ── Global vector store reference ──────────────────────────────────────────────
vectorstore = None


# ═══════════════════════════════════════════════════════════════════════════════
#  PDF Ingestion
# ═══════════════════════════════════════════════════════════════════════════════

def _extract_text_from_pdfs(pdf_dir: str) -> str:
    """Read every PDF in *pdf_dir* and return concatenated text."""
    all_text = ""
    if not os.path.exists(pdf_dir):
        os.makedirs(pdf_dir, exist_ok=True)
        return all_text

    for filename in os.listdir(pdf_dir):
        if filename.lower().endswith(".pdf"):
            filepath = os.path.join(pdf_dir, filename)
            try:
                reader = PdfReader(filepath)
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        all_text += text + "\n"
                print(f"  ✓ Loaded: {filename} ({len(reader.pages)} pages)")
            except Exception as e:
                print(f"  ✗ Failed to read {filename}: {e}")
    return all_text


def _split_text(text: str):
    """Split raw text into overlapping chunks for embedding."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=200,
        length_function=len,
    )
    return splitter.split_text(text)


def _get_pdf_manifest(pdf_dir: str) -> dict:
    """Build a manifest of PDF files: {filename: {size, mtime}}."""
    manifest = {}
    if not os.path.exists(pdf_dir):
        return manifest
    for filename in sorted(os.listdir(pdf_dir)):
        if filename.lower().endswith(".pdf"):
            filepath = os.path.join(pdf_dir, filename)
            stat = os.stat(filepath)
            manifest[filename] = {
                "size": stat.st_size,
                "mtime": stat.st_mtime,
            }
    return manifest


def _has_data_changed() -> bool:
    """Compare current PDFs in data/ against the saved manifest."""
    current = _get_pdf_manifest(DATA_DIR)
    if not os.path.exists(MANIFEST_PATH):
        return True  # No manifest = never ingested
    try:
        with open(MANIFEST_PATH, "r") as f:
            saved = json.load(f)
    except (json.JSONDecodeError, OSError):
        return True
    return current != saved


def _save_manifest():
    """Save the current PDF manifest after successful ingestion."""
    os.makedirs(VECTORSTORE_DIR, exist_ok=True)
    manifest = _get_pdf_manifest(DATA_DIR)
    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)


def ingest():
    """
    Read all PDFs from data/, chunk the text, embed with MiniLM,
    and persist a FAISS index to vectorstore/.
    """
    global vectorstore

    print("\n📄 Ingesting PDFs from data/ …")
    raw_text = _extract_text_from_pdfs(DATA_DIR)

    if not raw_text.strip():
        print("⚠  No PDF text found. Place .pdf files in the data/ folder.")
        vectorstore = None
        return False

    chunks = _split_text(raw_text)
    print(f"  Split into {len(chunks)} chunks.")

    print("  Building FAISS index (this may take a moment the first time) …")
    vectorstore = FAISS.from_texts(chunks, embeddings)
    vectorstore.save_local(VECTORSTORE_DIR)
    _save_manifest()
    print("  ✓ Vector store saved.\n")
    return True


def load_vectorstore():
    """Load a previously persisted FAISS index (if exists)."""
    global vectorstore
    if os.path.exists(VECTORSTORE_DIR):
        try:
            vectorstore = FAISS.load_local(
                VECTORSTORE_DIR, embeddings, allow_dangerous_deserialization=True
            )
            print("✓ Loaded existing vector store.")
            return True
        except Exception as e:
            print(f"⚠ Could not load vector store: {e}")
    return False


# ═══════════════════════════════════════════════════════════════════════════════
#  Query
# ═══════════════════════════════════════════════════════════════════════════════

def _build_messages(question: str, context_chunks: list[str]) -> list[dict]:
    """Create the chat messages for Groq."""
    context = "\n\n".join(context_chunks)
    return [
        {
            "role": "system",
            "content": (
                "You are a helpful legal assistant specializing in insurance law. "
                "Answer the user's question using ONLY the context provided below. "
                "If the context does not contain enough information to answer, say so clearly. "
                "Along with fetching the data from the context as it is, apply logical reasoning and high level interpretation skills to better undertsand the user's question and provide best possible answers for a wide range of questions. "
                "Do not make up information.\n\n"
                f"### Context:\n{context}"
            ),
        },
        {
            "role": "user",
            "content": question,
        },
    ]


def _call_groq(messages: list[dict]) -> str:
    """Send messages to the Groq chat completions API (free tier)."""
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        return "Error: GROQ_API_KEY is not set. Please add it to your .env file."

    try:
        client = Groq(api_key=api_key)
        chat_completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.3,
            max_completion_tokens=512,
        )
        return chat_completion.choices[0].message.content.strip()

    except Exception as e:
        return f"Error contacting the AI model: {e}"


def query(question: str) -> str:
    """
    Embed the question, retrieve top-4 relevant chunks from FAISS,
    build messages, and call the Groq API.
    """
    if vectorstore is None:
        return (
            "No documents have been loaded yet. "
            "Please ensure PDF files are placed in the data/ folder and restart the server."
        )

    # Retrieve relevant chunks
    docs = vectorstore.similarity_search(question, k=4)
    context_chunks = [doc.page_content for doc in docs]

    if not context_chunks:
        return "I couldn't find relevant information in the loaded documents to answer your question."

    # Build messages and call LLM
    messages = _build_messages(question, context_chunks)
    return _call_groq(messages)
