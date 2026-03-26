# AI-Powered Legal Assistant (Insurance RAG Chatbot)

An AI-powered legal assistant specializing in insurance law. It uses a **Retrieval-Augmented Generation (RAG)** pipeline to answer questions based exclusively on the content of uploaded PDF documents — no hallucinated answers.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Flask (Python) |
| **LLM** | Llama 3.3 70B via [Groq](https://groq.com/) (free tier) |
| **Embeddings** | `sentence-transformers/all-MiniLM-L6-v2` (runs locally) |
| **Vector Store** | FAISS (local, CPU) |
| **PDF Parsing** | PyPDF2 |
| **Frontend** | HTML, CSS, JavaScript |

## How It Works

1. **Ingest** — PDFs in the `data/` folder are parsed, chunked, and embedded into a FAISS vector store.
2. **Query** — User questions are embedded and matched against the most relevant document chunks.
3. **Answer** — The top-4 matching chunks are sent as context to the Groq LLM, which generates an answer strictly from the provided context.

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/manohar-256/Mini_Project.git
cd Mini_Project
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Add your Groq API key

```bash
cp .env.example .env
```

Edit `.env` and replace `your_groq_api_key_here` with your actual key from [console.groq.com](https://console.groq.com).

### 4. Add PDF documents

Place your insurance/legal PDF files in the `data/` folder. Sample PDFs are included for demonstration.

### 5. Run the app

```bash
python app.py
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

## Project Structure

```
├── app.py              # Flask server & routes
├── rag_engine.py       # RAG pipeline (ingest, embed, query)
├── data/               # PDF documents (source knowledge)
├── vectorstore/        # FAISS index (auto-generated, gitignored)
├── templates/
│   └── index.html      # Chat UI template
├── static/
│   ├── style.css       # Styling
│   └── script.js       # Frontend logic
├── requirements.txt    # Python dependencies
├── .env.example        # Environment variable template
└── .gitignore
```

## License

This project is for educational purposes.
