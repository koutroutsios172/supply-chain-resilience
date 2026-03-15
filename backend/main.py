import os
import shutil
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn

from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import Chroma
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import BaseModel, Field
from typing import List

load_dotenv()

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

CHROMA_PATH = "./chroma_db"

@app.get("/")
def home():
    return {"status": "Online", "mode": "Knowledge Graph Extractor"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Μόνο αρχεία PDF επιτρέπονται.")

    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        loader = PyPDFLoader(temp_path)
        pages = loader.load()

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        docs = text_splitter.split_documents(pages)

        vectorstore = Chroma.from_documents(
            documents=docs,
            embedding=OpenAIEmbeddings(),
            persist_directory=CHROMA_PATH
        )

        content_for_graph = " ".join([p.page_content for p in pages[:3]])

        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        
        graph_prompt = PromptTemplate.from_template("""
        Analyze the following supply chain text and extract a knowledge graph.
        Identify key entities (Organizations, Ports, Locations, Events) and their relationships.
        
        Return ONLY a JSON list of objects with "source", "target", and "type".
        Example: [{"source": "Company A", "target": "Port B", "type": "SHIPS_TO"}]
        
        Text: {text}
        """)

        chain = graph_prompt | llm
        response = chain.invoke({"text": content_for_graph})
        
        raw_json = response.content.replace('```json', '').replace('```', '').strip()
        graph_data = json.loads(raw_json)

        return {
            "message": "File processed and stored successfully",
            "filename": file.filename,
            "graph_data": graph_data
        }

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

class RiskAssessment(BaseModel):
    affected_nodes: List[str] = Field(description="IDs of nodes affected")
    confidence: float = Field(description="0.0 to 1.0")
    explanation: str            

simple_cache = {}

@app.post("/ask")
async def ask_question(data: dict):
    query = data.get("query")
    if query in simple_cache:
        return simple_cache[query]
    if not query:
        raise HTTPException(status_code=400, detail="No query provided")
    
    try:
        db = Chroma(persist_directory=CHROMA_PATH, embedding_function=OpenAIEmbeddings())
        
        docs = db.similarity_search(query, k=3)
        context = "\n\n".join([d.page_content for d in docs])

        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        structured_llm = llm.with_structured_output(RiskAssessment)
        
        result = structured_llm.invoke(f"Context: {context}\n\nQuestion: {query}")
        status = "VERIFIED" if result.confidence > 0.65 else "UNCERTAIN"
        return {
            "answer": result.explanation,
            "nodes": result.affected_nodes,
            "confidence": result.confidence,
            "status": status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))            

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)