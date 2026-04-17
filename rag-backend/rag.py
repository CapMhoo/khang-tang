import os
from dotenv import load_dotenv

from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from groq import Groq


load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env.local'))

# Check API key
if not os.getenv("GROQ_API_KEY"):
    raise ValueError("GROQ_API_KEY is not set")


VECTOR_STORE_PATH = "vector_store"


embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)


vector_store = FAISS.load_local(
    VECTOR_STORE_PATH,
    embeddings,
    allow_dangerous_deserialization=True
)

# Retriever
retriever = vector_store.as_retriever(search_kwargs={"k": 3})

# Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def ask_question(question):
    docs = retriever.invoke(question)

    context = "\n\n".join([d.page_content for d in docs])

    prompt = f"""
You are an assistant for the KhangTang system.

Only answer using the context below.

If the user asks in Thai, answer in Thai. Otherwise, answer in English.

If the answer is not in the context, say you do not know and recommend contacting BMA officials.

If the question can be answered in steps (e.g., how to register), answer in clear chronological steps.

You can answer which areas in Bangkok allow vendors to sell, but NOT capacity or availability.

PLEASE BEAWARE OF ANSWERING, I SEE SOME CHINESE CHARACTERS, MAKE SURE TO ANSWER IN THAI OR ENGLISH ONLY.

IF asked which area still has an available slots : answer: "Please Contact the BMA for further Information"
ELSE IF : Asked for permitted area, answer the 5 permitted zones.

Please refer to the BMA as 'หน่วยงานกรุงเทพมหานคร(BMA)' when answering in thai
Also question : 'เอกสารที่ต้องใช้' or any questions related to the document please refer the how to use the app.pdf

The following questions maybe asked : 1. ใช้แอปยังไง 2. ลงทะเบียนยังไง please refer to how to register initially and how to register and sell for their respected zones.
Context:
{context}

Question:
{question}
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    return response.choices[0].message.content
    