import os
from flask import Flask, request, jsonify, render_template_string
from langchain_huggingface import HuggingFaceEndpoint, HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

# --- CONFIGURATION ---
# Set your HuggingFace token as an environment variable:
HF_TOKEN = os.environ.get("HF_TOKEN")
if not HF_TOKEN:
    raise ValueError("HF_TOKEN environment variable not set. Please set it before running the server.")

# 2. PATHS
DB_FAISS_PATH = "vectorstore/db_faiss"

app = Flask(__name__)

# --- LOAD THE AI MODELS (Run once when server starts) ---
print("--- Loading Database & AI Model... ---")

qa_chain = None

try:
    # A. Load the Vector Database (The "Memory")
    embeddings = HuggingFaceEmbeddings(
        model_name='sentence-transformers/all-MiniLM-L6-v2',
        model_kwargs={'device': 'cpu'}
    )
    db = FAISS.load_local(DB_FAISS_PATH, embeddings, allow_dangerous_deserialization=True)

    # B. Load the LLM (The "Brain" - Mistral-7B)
    repo_id = "mistralai/Mistral-7B-Instruct-v0.3"

    llm = HuggingFaceEndpoint(
        repo_id=repo_id,
        max_new_tokens=512,  # Fixed: was incorrectly 'max_length'
        temperature=0.1,     # Keep it strictly factual (0.1 is safe, 0.9 is creative)
        huggingfacehub_api_token=HF_TOKEN
    )

    # C. Setup the QA Chain
    # This tells the AI: "Here are the rules. Use the context I give you."
    prompt_template = """
You are a legal assistant specializing in Indian Insurance Law. 
Use the following pieces of context to answer the question at the end. 
If the answer is not in the context, say "I do not have enough information in the provided documents."
Do not try to make up an answer.

Context:
{context}

Question: {question}

Answer:
"""
    PROMPT = PromptTemplate(
        template=prompt_template, input_variables=["context", "question"]
    )

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=db.as_retriever(search_kwargs={'k': 3}),  # Find top 3 relevant paragraphs
        return_source_documents=True,
        chain_type_kwargs={"prompt": PROMPT}
    )

    print("--- System Ready! ---")

except Exception as e:
    print(f"FATAL: Failed to load models: {e}")
    print("The /ask endpoint will return a 503 until this is resolved.")


# --- ROUTES ---

@app.route('/')
def home():
    return render_template_string('''
        <!DOCTYPE html>
        <html>
        <head>
            <title>PolicyGuard AI</title>
            <style>
                body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                #chat-box { border: 1px solid #ccc; height: 400px; overflow-y: scroll; padding: 10px; margin-bottom: 10px; }
                .user { color: blue; font-weight: bold; }
                .ai { color: green; }
                .error { color: red; font-style: italic; }
                .loading { color: orange; font-style: italic; display: none; }
            </style>
        </head>
        <body>
            <h1>PolicyGuard: Insurance Legal Assistant</h1>
            <div id="chat-box"></div>
            <input type="text" id="user-input" placeholder="Ask about Insurance Laws..." style="width: 70%; padding: 10px;">
            <button onclick="sendMessage()" style="padding: 10px;">Ask</button>
            <div id="loading" class="loading">Analyzing legal docs...</div>

            <script>
                async function sendMessage() {
                    const input = document.getElementById("user-input");
                    const chatBox = document.getElementById("chat-box");
                    const loading = document.getElementById("loading");
                    const question = input.value.trim();

                    if (!question) return;

                    // Show User Message (safely, without innerHTML to prevent XSS)
                    const userP = document.createElement("p");
                    userP.className = "user";
                    userP.textContent = "You: " + question;
                    chatBox.appendChild(userP);

                    input.value = "";
                    loading.style.display = "block";

                    try {
                        // Send to Python Backend
                        const response = await fetch("/ask", {
                            method: "POST",
                            headers: {"Content-Type": "application/json"},
                            body: JSON.stringify({query: question})
                        });

                        const data = await response.json();
                        loading.style.display = "none";

                        const aiP = document.createElement("p");

                        if (!response.ok) {
                            // Handle server-side errors gracefully
                            aiP.className = "error";
                            aiP.textContent = "Error: " + (data.error || "Something went wrong.");
                        } else {
                            aiP.className = "ai";
                            const label = document.createElement("strong");
                            label.textContent = "PolicyGuard: ";
                            aiP.appendChild(label);
                            aiP.appendChild(document.createTextNode(data.answer));
                        }

                        chatBox.appendChild(aiP);

                    } catch (err) {
                        loading.style.display = "none";
                        const errP = document.createElement("p");
                        errP.className = "error";
                        errP.textContent = "Network error: Could not reach the server.";
                        chatBox.appendChild(errP);
                    }

                    chatBox.scrollTop = chatBox.scrollHeight;
                }

                // Allow pressing Enter to submit
                document.getElementById("user-input").addEventListener("keydown", function(e) {
                    if (e.key === "Enter") sendMessage();
                });
            </script>
        </body>
        </html>
    ''')


@app.route('/ask', methods=['POST'])
def ask():
    # Guard against startup failure
    if qa_chain is None:
        return jsonify({"error": "AI model failed to load on startup. Check server logs."}), 503

    data = request.json
    query = data.get('query')

    if not query:
        return jsonify({"error": "No query provided"}), 400

    try:
        result = qa_chain.invoke({"query": query})
        return jsonify({"answer": result['result']})
    except Exception as e:
        return jsonify({"error": f"Failed to process query: {str(e)}"}), 500


if __name__ == '__main__':
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug_mode, port=5000)