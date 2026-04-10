from fastapi import FastAPI
from pydantic import BaseModel
from rag import ask_question

app = FastAPI()


class ChatRequest(BaseModel):
    question: str
    role: str | None = None


@app.get("/")
def root():
    return {"message": "KhangTang RAG chatbot API running"}


@app.post("/chat")
def chat(request: ChatRequest):

    answer = ask_question(request.question)

    return {
        "question": request.question,
        "answer": answer
    }