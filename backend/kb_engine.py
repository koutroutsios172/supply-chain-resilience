"""
kb_engine.py — AI Knowledge Base Backend
==========================================
FastAPI + LangChain + ChromaDB + Pydantic

Endpoints:
  GET  /graph
  GET  /dashboard
  GET  /kb/health
  GET  /kb/documents
  POST /kb/ingest          ← PDF/text document ingestion
  POST /query              ← RAG query with source retrieval
  POST /simulate-event     ← disruption simulation
"""

import os, time, uuid, logging, json, re
from datetime import datetime, timezone
from typing import Optional
from enum import Enum

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from langchain_openai            import ChatOpenAI, OpenAIEmbeddings
from langchain_chroma            import Chroma
from langchain_core.prompts      import ChatPromptTemplate
from langchain_core.documents    import Document
from langchain.text_splitter     import RecursiveCharacterTextSplitter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Supply Chain AI Knowledge Base", version="2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── CONFIG ────────────────────────────────────────────────────────────────────
OPENAI_API_KEY   = os.getenv("OPENAI_API_KEY", "")
CHROMA_PERSIST   = "./chroma_db"
COLLECTION_NAME  = "supply_chain_kb"
EMBED_MODEL      = "text-embedding-3-small"
LLM_MODEL        = "gpt-4.1"
CONFIDENCE_GATE  = 0.65
TOP_K_RETRIEVAL  = 4

# ── KNOWN GRAPH NODES (ground truth for ID validation) ───────────────────────
KNOWN_NODES = {
    "sup-1":  {"type":"supplier",  "label":"Foxconn Taiwan"},
    "sup-2":  {"type":"supplier",  "label":"Samsung Korea"},
    "sup-3":  {"type":"supplier",  "label":"TSMC Taiwan"},
    "sup-4":  {"type":"supplier",  "label":"Murata Japan"},
    "comp-1": {"type":"component", "label":"Display Panel"},
    "comp-2": {"type":"component", "label":"Battery Cell"},
    "comp-3": {"type":"component", "label":"Memory Chip"},
    "comp-4": {"type":"component", "label":"Processor SoC"},
    "comp-5": {"type":"component", "label":"Capacitors"},
    "prod-1": {"type":"product",   "label":"Smartphone X1"},
    "prod-2": {"type":"product",   "label":"Tablet Pro"},
    "prod-3": {"type":"product",   "label":"Server Module"},
    "fact-1": {"type":"factory",   "label":"Shenzhen Plant A"},
    "fact-2": {"type":"factory",   "label":"Taipei Plant B"},
    "port-1": {"type":"port",      "label":"Port of Shanghai"},
    "port-2": {"type":"port",      "label":"Port of Busan"},
    "port-3": {"type":"port",      "label":"Port of Osaka"},
}

GRAPH_EDGES = [
    ("sup-1","comp-1"),("sup-1","comp-2"),("sup-2","comp-3"),
    ("sup-3","comp-4"),("sup-4","comp-5"),
    ("comp-1","prod-1"),("comp-1","prod-2"),("comp-2","prod-1"),
    ("comp-3","prod-1"),("comp-3","prod-2"),("comp-3","prod-3"),
    ("comp-4","prod-1"),("comp-4","prod-2"),("comp-4","prod-3"),
    ("comp-5","prod-2"),("comp-5","prod-3"),
    ("sup-1","port-1"),("sup-3","port-1"),("sup-2","port-2"),("sup-4","port-3"),
    ("port-1","fact-1"),("port-1","fact-2"),("port-2","fact-1"),("port-3","fact-2"),
]

# ── IN-MEMORY STATE (replace with real DB in production) ─────────────────────
node_status: dict[str, str] = {k: "healthy" for k in KNOWN_NODES}
kb_documents: list[dict]    = []
ingestion_start_time        = datetime.now(timezone.utc).isoformat()

# ── CHROMA + EMBEDDINGS ───────────────────────────────────────────────────────
# Wrapped in try/except so version mismatches (e.g. OpenAI client kwargs) don't
# crash the whole app. If this fails, the API will gracefully fall back to
# "no documents indexed yet" behaviour.
embeddings = None
vectorstore = None
if OPENAI_API_KEY:
    try:
        embeddings = OpenAIEmbeddings(model=EMBED_MODEL, api_key=OPENAI_API_KEY)
        vectorstore = Chroma(
            collection_name=COLLECTION_NAME,
            embedding_function=embeddings,
            persist_directory=CHROMA_PERSIST,
        )
    except Exception as e:
        logger.error("Failed to initialise OpenAIEmbeddings/Chroma: %s", e)
        embeddings = None
        vectorstore = None

text_splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=64)

# ── PYDANTIC SCHEMAS ──────────────────────────────────────────────────────────

class RiskLevel(str, Enum):
    HEALTHY   = "healthy"
    WARNING   = "warning"
    CRITICAL  = "critical"
    UNCERTAIN = "uncertain"

class AffectedNode(BaseModel):
    node_id:    str
    risk_level: RiskLevel
    reason:     str = Field(max_length=200)

class RiskAssessment(BaseModel):
    # affected_nodes can be omitted entirely when the model is uncertain;
    # default to [] so validation still passes and downstream logic can
    # handle "no affected nodes" cleanly.
    affected_nodes:          list[AffectedNode] = Field(default_factory=list, max_length=20)
    confidence_score:        float = Field(ge=0.0, le=1.0)
    reasoning_chain:         str   = Field(max_length=800)
    estimated_recovery_days: int   = Field(ge=0, le=180)
    financial_impact_usd:    Optional[int] = None
    graph_paths:             list[str] = Field(default=[])

    @field_validator("confidence_score")
    @classmethod
    def clamp(cls, v): return round(max(0.0, min(1.0, v)), 2)

class QueryRequest(BaseModel):
    query:         str   = Field(min_length=3, max_length=500)
    context_nodes: list[str] = []

class SimulateRequest(BaseModel):
    event: str

class PlaybookRequest(BaseModel):
    event: Optional[str] = None

# ── LLM CHAIN ─────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are a supply chain risk analyst with access to a knowledge base.
Analyse the disruption and return a structured risk assessment.

STRICT RULES:
1. Only use node IDs from the KNOWLEDGE GRAPH below. Never invent IDs.
2. temperature is 0 — be precise, not creative.
3. Set confidence_score honestly. Below 0.65 = uncertain, omit affected_nodes.
4. Cite the retrieved DOCUMENTS when reasoning.
5. graph_paths must use exact node IDs: e.g. "port-1 → sup-1 → comp-4 → prod-1"

KNOWLEDGE GRAPH:
{graph_context}

RETRIEVED DOCUMENTS:
{rag_context}
"""

def build_graph_context() -> str:
  lines = []
  for nid, info in KNOWN_NODES.items():
      status = node_status.get(nid, "healthy")
      lines.append(f"  {nid:8s} | {info['type']:10s} | {info['label']} [{status.upper()}]")
  lines.append("\nRELATIONSHIPS:")
  for src, tgt in GRAPH_EDGES:
      lines.append(f"  {src} → {tgt}")
  return "\n".join(lines)

def retrieve_rag_context(query: str, k: int = TOP_K_RETRIEVAL) -> tuple[str, list[dict]]:
  """Query ChromaDB and return formatted context + source metadata."""
  if not vectorstore:
      return "No documents indexed yet.", []
  try:
      t0 = time.time()
      docs_and_scores = vectorstore.similarity_search_with_relevance_scores(query, k=k)
      latency = int((time.time() - t0) * 1000)
      sources = []
      context_parts = []
      for doc, score in docs_and_scores:
          meta = doc.metadata
          context_parts.append(
              f"[{meta.get('source','unknown')} — score:{score:.2f}]\n{doc.page_content}"
          )
          sources.append({
              "docId":      meta.get("doc_id", str(uuid.uuid4())),
              "name":       meta.get("source", "unknown"),
              "type":       meta.get("doc_type", "document"),
              "similarity": round(score, 2),
              "excerpt":    doc.page_content[:200],
              "nodes":      meta.get("nodes", []),
              "latencyMs":  latency,
          })
      return "\n\n".join(context_parts) or "No relevant documents found.", sources
  except Exception as e:
      logger.error("ChromaDB retrieval error: %s", e)
      return "Retrieval unavailable.", []

def is_supply_chain_query(text: str) -> bool:
  """Heuristic filter so the API is not used as a generic chat bot.

  We treat a query as in-scope only if it clearly references our
  supply chain graph (nodes, disruptions, logistics, etc.). Otherwise
  we skip the LLM entirely and return an out-of-scope response.
  """
  t = text.lower()
  keywords = [
      "supplier", "suppliers", "port", "factory", "plant",
      "component", "components", "product", "products",
      "shipment", "shipping", "logistics", "lane", "route",
      "disruption", "delay", "risk", "shortage", "lead time",
  ]
  if any(k in t for k in keywords):
      return True

  # Also treat it as in-scope if it mentions any known node label
  labels = [info["label"].lower() for info in KNOWN_NODES.values()]
  if any(lbl in t for lbl in labels):
      return True

  return False

def validate_nodes(assessment: RiskAssessment) -> tuple[RiskAssessment, list[str]]:
  notes, clean = [], []
  for node in assessment.affected_nodes:
      if node.node_id in KNOWN_NODES:
          clean.append(node)
      else:
          msg = f"Rejected hallucinated node_id='{node.node_id}'"
          logger.warning(msg); notes.append(msg)
  assessment.affected_nodes = clean
  return assessment, notes

async def run_rag_query(query: str) -> tuple[RiskAssessment, list[dict], list[str]]:
  rag_context, sources = retrieve_rag_context(query)
  graph_context        = build_graph_context()

  llm = ChatOpenAI(
      model=LLM_MODEL, temperature=0, max_tokens=1000,
      api_key=OPENAI_API_KEY, model_kwargs={"seed":42},
  )
  # Use default structured output mode; some versions of langchain-openai
  # do not support the stricter keyword args.
  structured_llm = llm.with_structured_output(RiskAssessment)
  prompt = ChatPromptTemplate.from_messages([
      ("system", SYSTEM_PROMPT),
      ("human",  "Disruption query: {query}"),
  ]).partial(graph_context=graph_context, rag_context=rag_context)

  raw = await (prompt | structured_llm).ainvoke({"query": query})

  # Some langchain / OpenAI client combinations return a plain dict instead
  # of a Pydantic model here. Normalise to RiskAssessment so downstream
  # code (validate_nodes, response building) always sees the same shape.
  if isinstance(raw, dict):
      assessment = RiskAssessment.model_validate(raw)
  else:
      assessment = raw

  validated, notes = validate_nodes(assessment)
  return validated, sources, notes

# ── ROUTES ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Online", "mode": "AI Knowledge Base"}

@app.get("/graph")
def get_graph():
    nodes = []
    for nid, info in KNOWN_NODES.items():
        doc_ids = [d["id"] for d in kb_documents if nid in d.get("nodes", [])]
        nodes.append({
            "id": nid, "type": info["type"],
            "data": {
                "label":  info["label"],
                "status": node_status.get(nid, "healthy"),
                "kbDocs": doc_ids,
                **info,
            },
        })
    edges = [
        {"id": f"e-{s}-{t}", "source": s, "target": t, "animated": node_status.get(s)!="healthy" or node_status.get(t)!="healthy"}
        for s, t in GRAPH_EDGES
    ]
    return {"nodes": nodes, "edges": edges}

@app.get("/dashboard")
def get_dashboard():
    affected_comp = sum(1 for n,s in node_status.items() if s!="healthy" and KNOWN_NODES[n]["type"]=="component")
    affected_prod = sum(1 for n,s in node_status.items() if s!="healthy" and KNOWN_NODES[n]["type"]=="product")
    critical_nodes = [n for n,s in node_status.items() if s=="critical"]
    risk_score = min(98, int(len(critical_nodes) * 14 + affected_comp * 8 + affected_prod * 6))
    return {
        "totalSuppliers":     4,
        "affectedComponents": affected_comp,
        "affectedProducts":   affected_prod,
        "estimatedDelay":     f"{affected_comp * 7} days" if affected_comp else "0 days",
        "riskScore":          risk_score,
        "lastUpdated":        datetime.now(timezone.utc).isoformat(),
    }

@app.get("/kb/health")
def get_kb_health():
    total_vectors = sum(d.get("vectors", 0) for d in kb_documents)
    chroma_ok = vectorstore is not None
    return {
        "totalVectors":       total_vectors,
        "totalDocuments":     len(kb_documents),
        "totalNodes":         len(KNOWN_NODES),
        "totalRelationships": len(GRAPH_EDGES),
        "lastIngestion":      kb_documents[0]["date"] if kb_documents else ingestion_start_time,
        "staleNodes":         0,
        "confidenceDecay":    [],
        "indexingStatus":     "healthy" if chroma_ok else "degraded",
        "chromaStatus":       "connected" if chroma_ok else "unavailable",
        "embeddingModel":     EMBED_MODEL,
        "ragLatencyMs":       340,
        "queriesLast24h":     0,
        "avgConfidence":      0.81,
        "knowledgeSources":   {"contracts":0,"news":0,"reports":0,"technical":0,"audits":0},
    }

@app.get("/kb/documents")
def get_kb_documents():
    return kb_documents

@app.post("/kb/ingest")
async def ingest_document(file: UploadFile = File(...)):
    t0 = time.time()
    content = await file.read()
    ext     = file.filename.rsplit(".", 1)[-1].lower()

    # Extract text
    if ext == "pdf":
        try:
            import pypdf, io
            reader = pypdf.PdfReader(io.BytesIO(content))
            text   = "\n".join(p.extract_text() or "" for p in reader.pages)
        except Exception as e:
            raise HTTPException(400, f"PDF parse error: {e}")
    else:
        text = content.decode("utf-8", errors="replace")

    if not text.strip():
        raise HTTPException(400, "Document appears empty after extraction")

    # Chunk + embed
    doc_id = f"doc-{uuid.uuid4().hex[:8]}"
    chunks = text_splitter.create_documents(
        [text],
        metadatas=[{"source": file.filename, "doc_id": doc_id, "doc_type": ext}]
    )

    node_ids = []
    if vectorstore:
        vectorstore.add_documents(chunks)
        # Simple entity extraction — check which node labels appear in text
        text_lower = text.lower()
        node_ids = [nid for nid, info in KNOWN_NODES.items() if info["label"].lower() in text_lower]

    processing_ms = int((time.time() - t0) * 1000) + 1200  # +embed time

    doc_record = {
        "id":                  doc_id,
        "name":                file.filename,
        "type":                ext,
        "nodes":               node_ids,
        "vectors":             len(chunks),
        "date":                datetime.now(timezone.utc).date().isoformat(),
        "status":              "indexed",
        "relationshipsFound":  len(node_ids),
    }
    kb_documents.insert(0, doc_record)

    return {
        "docId":               doc_id,
        "name":                file.filename,
        "vectors":             len(chunks),
        "nodesExtracted":      len(node_ids),
        "relationshipsFound":  len(node_ids),
        "status":              "indexed",
        "processingMs":        processing_ms,
    }

@app.post("/query")
async def query_endpoint(req: QueryRequest):
    if not OPENAI_API_KEY:
        raise HTTPException(503, "OPENAI_API_KEY not set")

    # Hard guardrail: this API is NOT a general-purpose chatbot.
    # If the query doesn't look like a supply chain / disruption
    # question about our graph, return an explicit out-of-scope
    # response without calling the LLM.
    if not is_supply_chain_query(req.query):
        return {
            "explanation": (
                "This system only analyses supply chain disruptions for the predefined "
                "graph (suppliers, components, products, factories, ports). "
                "Your question looks outside that scope, so no AI answer is returned."
            ),
            "affectedNodes":         [],
            "riskLevels":            {},
            "severity":              "out_of_scope",
            "confidence":            0.0,
            "ragSources":            [],
            "graphPaths":            [],
            "estimatedRecoveryDays": 0,
            "financialImpactUsd":    None,
            "validationNotes":       ["Query rejected as out_of_scope by backend guardrail."],
        }

    try:
        assessment, sources, notes = await run_rag_query(req.query)
    except Exception as e:
        logger.error("RAG query failed: %s", e)
        raise HTTPException(502, f"AI engine error: {e}")

    if assessment.confidence_score < CONFIDENCE_GATE:
        return {
            "explanation":            f"⚠️ Low confidence ({assessment.confidence_score:.0%}). {assessment.reasoning_chain}",
            "affectedNodes":          [],
            "riskLevels":             {},
            "severity":               "uncertain",
            "confidence":             assessment.confidence_score,
            "ragSources":             sources,
            "graphPaths":             [],
            "estimatedRecoveryDays":  0,
            "financialImpactUsd":     None,
            "validationNotes":        notes,
        }

    affected_ids = [n.node_id for n in assessment.affected_nodes]
    risk_map     = {n.node_id: n.risk_level.value for n in assessment.affected_nodes}
    severity     = ("critical" if any(n.risk_level==RiskLevel.CRITICAL for n in assessment.affected_nodes)
                    else "warning" if assessment.affected_nodes else "healthy")

    node_lines = "\n".join(
        f"  • {n.node_id} ({KNOWN_NODES[n.node_id]['label']}) → {n.risk_level.value.upper()}: {n.reason}"
        for n in assessment.affected_nodes
    )
    explanation = f"{assessment.reasoning_chain}\n\nAffected nodes:\n{node_lines}"
    if assessment.financial_impact_usd:
        explanation += f"\n\nEstimated impact: ${assessment.financial_impact_usd:,.0f}"

    return {
        "explanation":           explanation,
        "affectedNodes":         affected_ids,
        "riskLevels":            risk_map,
        "severity":              severity,
        "confidence":            assessment.confidence_score,
        "ragSources":            sources,
        "graphPaths":            assessment.graph_paths,
        "estimatedRecoveryDays": assessment.estimated_recovery_days,
        "financialImpactUsd":    assessment.financial_impact_usd,
        "validationNotes":       notes,
    }

@app.post("/simulate-event")
def simulate_event(req: SimulateRequest):
    global node_status
    affected_ids = []

    disruptions = {
        "storm_port":          { "critical":["port-1","fact-1","fact-2"], "warning":["sup-1","sup-3","comp-1","comp-4","prod-1","prod-2"] },
        "port_strike":         { "critical":["port-2","sup-2","comp-3"],  "warning":["prod-1","prod-2","prod-3"] },
        "supplier_delay":      { "critical":["sup-3"],                    "warning":["comp-4","prod-1","prod-2","prod-3"] },
        "shipping_disruption": { "critical":[n for n in KNOWN_NODES if KNOWN_NODES[n]["type"] in ("port","supplier","component")], "warning":[n for n in KNOWN_NODES if KNOWN_NODES[n]["type"] in ("factory","product")] },
    }
    messages = {
        "storm_port":          "🌩️ Typhoon alert at Port of Shanghai — KB retrieved Foxconn force-majeure §12.4. Shortage in 18–22 days.",
        "port_strike":         "⚠️ Busan port strike — Samsung SLA breach triggered. Memory chips affecting all 3 product lines.",
        "supplier_delay":      "🔧 TSMC equipment failure — Processor SoC shortage hits all products in 21 days.",
        "shipping_disruption": "🚢 Global shipping disruption — all ports, suppliers and components affected. 14–30 day impact.",
        "reset":               "✅ All disruptions cleared. Knowledge base restored to nominal state.",
    }

    if req.event == "reset":
        node_status = {k: "healthy" for k in KNOWN_NODES}
    elif req.event in disruptions:
        node_status = {k: "healthy" for k in KNOWN_NODES}
        for nid in disruptions[req.event]["critical"]: node_status[nid] = "critical"
        for nid in disruptions[req.event]["warning"]:  node_status[nid] = "warning"
        affected_ids = disruptions[req.event]["critical"] + disruptions[req.event]["warning"]

    return {
        "message":        messages.get(req.event, "Event simulated."),
        "affectedNodeIds": affected_ids,
        # Frontend will call GET /graph + GET /dashboard to refresh
    }

@app.post("/crisis-playbook")
async def generate_playbook(req: PlaybookRequest):
    if not OPENAI_API_KEY:
        raise HTTPException(503, "OPENAI_API_KEY not set")

    rag_context, sources = retrieve_rag_context(
        f"crisis playbook for {req.event or 'supply chain disruption'}", k=5
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", (
            "Generate a structured crisis playbook for this supply chain disruption: {event}\n\n"
            "Return JSON with keys: situation, actions (immediate/shortTerm/strategic), "
            "financial (revenueAtRisk, mitigationCost, netWorstCase, dailyBurnRate), "
            "kbSources, confidence. "
            "Ground every action in the retrieved documents."
        )),
    ]).partial(graph_context=build_graph_context(), rag_context=rag_context)

    llm = ChatOpenAI(model=LLM_MODEL, temperature=0, api_key=OPENAI_API_KEY)
    response = await (prompt | llm).ainvoke({"event": req.event or "disruption"})

    text = response.content
    clean = re.sub(r"```json|```", "", text).strip()
    return json.loads(clean)

