# ============================================================
#  PolicyGuard AI  —  ingest.py  (Bug-Fixed Version)
# ============================================================
#
# Run this ONCE before starting app.py:
#     python ingest.py
#
# It reads every PDF in the  data/  folder, splits the text
# into chunks, converts them to vectors (embeddings) and saves
# the resulting FAISS vector-database to  vectorstore/db_faiss
# ============================================================

# ── BUG FIX 1 ──────────────────────────────────────────────
# TF env-vars must come before ANY tensorflow/keras import.
# (sentence-transformers can pull in keras indirectly.)
import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_USE_LEGACY_KERAS']    = '1'

# ── Imports ─────────────────────────────────────────────────
from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
from langchain_text_splitters             import RecursiveCharacterTextSplitter
from langchain_huggingface                import HuggingFaceEmbeddings
from langchain_community.vectorstores     import FAISS

# ── CONFIGURATION ───────────────────────────────────────────
DATA_PATH      = "data/"            # Folder that contains your PDF files
DB_FAISS_PATH  = "vectorstore/db_faiss"   # Where the vector DB will be saved

# ── MAIN FUNCTION ───────────────────────────────────────────
def create_vector_db():
    print("=" * 50)
    print("   PolicyGuard — Ingestion Script")
    print("=" * 50)

    # 1. Check that the data folder exists
    if not os.path.exists(DATA_PATH):
        print(f"\nERROR: '{DATA_PATH}' folder not found.")
        print("Please create it and add your PDF files, then run this script again.")
        return

    # 2. Load all PDFs
    print(f"\n[1/4] Loading PDFs from '{DATA_PATH}'…")
    loader = DirectoryLoader(
        DATA_PATH,
        glob='*.pdf',
        loader_cls=PyPDFLoader,
        show_progress=True          # shows a progress bar per file
    )
    documents = loader.load()

    if not documents:
        print("\nERROR: No PDF pages were loaded.")
        print("Make sure your PDF files are inside the 'data/' folder and are not empty.")
        return

    print(f"  ✓ Loaded {len(documents)} page(s) from PDF(s).")

    # 3. Split into smaller chunks
    # chunk_size=500 chars keeps chunks short enough for the LLM context window.
    # chunk_overlap=50 chars prevents important sentences from being cut in half.
    print("\n[2/4] Splitting text into chunks…")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    texts = text_splitter.split_documents(documents)
    print(f"  ✓ Created {len(texts)} chunk(s).")

    # 4. Create embeddings  (text → numbers the DB can compare)
    print("\n[3/4] Creating embeddings (this may take a minute)…")
    embeddings = HuggingFaceEmbeddings(
        model_name='sentence-transformers/all-MiniLM-L6-v2',
        model_kwargs={'device': 'cpu'}
    )

    # 5. Build and save the FAISS vector database
    print("\n[4/4] Building FAISS vector database and saving…")
    os.makedirs(os.path.dirname(DB_FAISS_PATH), exist_ok=True)   # create folder if needed
    db = FAISS.from_documents(texts, embeddings)
    db.save_local(DB_FAISS_PATH)

    print(f"\n  ✓ Success! Vector database saved to '{DB_FAISS_PATH}'")
    print("\nYou can now start the web server:  python app.py")
    print("=" * 50)


# ── ENTRY POINT ─────────────────────────────────────────────
if __name__ == "__main__":
    create_vector_db()