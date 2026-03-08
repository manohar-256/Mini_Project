Libraries to be installed (Run in Terminal):-
pip install langchain==0.1.20 langchain-community==0.0.38 langchain-huggingface==0.0.3 langchain-core==0.1.52 faiss-cpu==1.7.4 sentence-transformers==2.7.0 huggingface-hub==0.23.4 flask pypdf python-dotenv tf-keras langchain-text-splitters

First Run ingest.py script

How to get the Free API Key:
Go to HuggingFace.co and sign up.
Go to Settings -> Access Tokens.
Create a new token (Role: Read).
Copy this token (Starts with hf_...). You will need this in your Python code.

After getting the API Key, Run this on terminal:
$env:HF_TOKEN = "hf_your_actual_token_here"
python app.py
OR
create a .env file in your C:\Mini_Project\ folder:
HF_TOKEN=hf_your_actual_token_here
Then add these two lines to the top of app.py:
from dotenv import load_dotenv
load_dotenv()

Main problem occurs in app.py script, that's why specific versions need to mentioned in pip install. Check if the error is resolved otherwise try to debug the code. Currently, the minimal frontend code is also written app.py. But once the backend works properly, we can make seperate HTML/CSS/JS files and integrate app.py with the frontend later.


