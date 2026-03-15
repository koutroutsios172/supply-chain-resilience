"""
JUDGE QUESTION 2 — AI HALLUCINATIONS
=============================================================
ai_risk_engine.py  (drop into your FastAPI backend)

Solves: "LLMs hallucinate. How do you guarantee the AI won't
turn the wrong factory red?"

Four layers of defence:
  1. STRUCTURED OUTPUT — Pydantic model + LangChain
     with_structured_output() forces the LLM to return
     machine-validated JSON. No free-text, no hallucinated IDs.

  2. NODE ID VALIDATION — every node_id in the LLM response
     is checked against the live ChromaDB/graph. Invalid IDs
     are stripped and logged before the response is sent.

  3. TEMPERATURE = 0 — deterministic sampling; the model
     cannot "be creative" about which nodes to highlight.

  4. CONFIDENCE SCORE — the LLM must justify its score
     (0.0–1.0). Scores below CONFIDENCE_THRESHOLD are
     returned as UNCERTAIN and the UI shows a grey
     "low confidence" badge instead of red nodes.

Usage:
  router = APIRouter()
  router.include_router(risk_router)
=============================================================
"""

import logging
from enum import Enum
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough

# ─── CONFIG ───────────────────────────────────────────────────────────────────
OPENAI_MODEL       = "gpt-4o-mini"       # swap for gpt-4o in prod
TEMPERATURE        = 0                   # ← deterministic; no creativity
MAX_TOKENS         = 800
CONFIDENCE_THRESHOLD = 0.65              # below this → return UNCERTAIN

logger = logging.getLogger(__name__)

# ─── PYDANTIC MODELS ──────────────────────────────────────────────────────────

class RiskLevel(str, Enum):
    HEALTHY  = "healthy"
    WARNING  = "warning"
    CRITICAL = "critical"
    UNCERTAIN = "uncertain"           # new: returned when confidence is low


class AffectedNode(BaseModel):
    """Single node affected by a disruption event."""
    node_id: str = Field(
        description="Exact node ID from the supply chain graph (e.g. 'port-1', 'sup-3')"
    )
    risk_level: RiskLevel = Field(
        description="Risk level to apply to this node"
    )
    reason: str = Field(
        description="One-sentence justification referencing specific graph data",
        max_length=200,
    )


class RiskAssessment(BaseModel):
    """
    Structured LLM output — the ONLY shape the model is allowed to return.
    Every field is validated before the response leaves the backend.
    """
    affected_nodes: list[AffectedNode] = Field(
        description="List of supply chain nodes affected by this disruption",
        max_length=20,       # hard cap: model cannot return 1,000 nodes
    )
    confidence_score: float = Field(
        ge=0.0, le=1.0,
        description="Model confidence in this assessment (0.0 = guess, 1.0 = certain)"
    )
    reasoning_chain: str = Field(
        description="Step-by-step reasoning that led to this assessment",
        max_length=600,
    )
    estimated_recovery_days: int = Field(
        ge=0, le=180,
        description="Estimated days until supply chain returns to nominal"
    )
    financial_impact_usd: Optional[int] = Field(
        default=None,
        ge=0,
        description="Estimated financial impact in USD (null if unknown)"
    )

    @field_validator("confidence_score")
    @classmethod
    def clamp_confidence(cls, v: float) -> float:
        return round(max(0.0, min(1.0, v)), 2)


# ─── REQUEST / RESPONSE SCHEMAS ───────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str = Field(min_length=3, max_length=500)
    context_nodes: list[str] = Field(
        default=[],
        description="Node IDs currently visible in the graph (for grounding)"
    )


class QueryResponse(BaseModel):
    explanation:     str
    affected_nodes:  list[str]           # validated IDs only
    risk_levels:     dict[str, str]      # node_id → risk level string
    confidence:      float
    severity:        str                 # healthy | warning | critical | uncertain
    reasoning_chain: str
    estimated_recovery_days: int
    financial_impact_usd:    Optional[int]
    validation_notes:        list[str]   # logged ID rejections, etc.


# ─── KNOWN NODE REGISTRY ─────────────────────────────────────────────────────
# In production this is pulled from ChromaDB / your graph database.
# This acts as the ground truth for ID validation.

KNOWN_NODES: dict[str, dict] = {
    "sup-1":  {"type": "supplier",   "label": "Foxconn Taiwan"},
    "sup-2":  {"type": "supplier",   "label": "Samsung Korea"},
    "sup-3":  {"type": "supplier",   "label": "TSMC Taiwan"},
    "sup-4":  {"type": "supplier",   "label": "Murata Japan"},
    "comp-1": {"type": "component",  "label": "Display Panel"},
    "comp-2": {"type": "component",  "label": "Battery Cell"},
    "comp-3": {"type": "component",  "label": "Memory Chip"},
    "comp-4": {"type": "component",  "label": "Processor SoC"},
    "comp-5": {"type": "component",  "label": "Capacitors"},
    "prod-1": {"type": "product",    "label": "Smartphone X1"},
    "prod-2": {"type": "product",    "label": "Tablet Pro"},
    "prod-3": {"type": "product",    "label": "Server Module"},
    "fact-1": {"type": "factory",    "label": "Shenzhen Plant A"},
    "fact-2": {"type": "factory",    "label": "Taipei Plant B"},
    "port-1": {"type": "port",       "label": "Port of Shanghai"},
    "port-2": {"type": "port",       "label": "Port of Busan"},
    "port-3": {"type": "port",       "label": "Port of Osaka"},
}


def get_valid_node_ids() -> set[str]:
    """Single source of truth for valid IDs. Replace with DB call in production."""
    return set(KNOWN_NODES.keys())


def build_node_context(node_ids: list[str] | None = None) -> str:
    """Serialise the graph into a prompt-friendly string."""
    nodes = KNOWN_NODES if not node_ids else {
        k: v for k, v in KNOWN_NODES.items() if k in node_ids
    }
    lines = ["SUPPLY CHAIN KNOWLEDGE GRAPH (ground truth):"]
    for nid, info in nodes.items():
        lines.append(f"  {nid} | {info['type']:10s} | {info['label']}")
    return "\n".join(lines)


# ─── PROMPT ───────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are a supply chain risk analyst. Your ONLY job is to analyse
disruption scenarios and return a structured risk assessment.

RULES — you MUST follow all of these:
1. You may ONLY reference node IDs that appear in the KNOWLEDGE GRAPH
   section below. If you are unsure of an ID, omit that node entirely.
2. Never invent, guess, or paraphrase node IDs.
3. Set confidence_score honestly: if the query is ambiguous or you lack
   data, set it below 0.65 and explain in reasoning_chain.
4. Keep reasons factual and cite the specific node IDs.
5. Estimate financial_impact_usd only when you have clear grounds to do so;
   otherwise set it to null.

{node_context}
"""

HUMAN_PROMPT = """\
Disruption query: {query}
"""

# ─── LLM CHAIN FACTORY ────────────────────────────────────────────────────────

def build_risk_chain(node_ids: list[str] | None = None):
    """
    Returns a LangChain runnable that:
      - uses temperature=0 (deterministic)
      - returns only a RiskAssessment (structured output)
      - is grounded with the node context
    """
    llm = ChatOpenAI(
        model=OPENAI_MODEL,
        temperature=TEMPERATURE,          # ← key anti-hallucination lever
        max_tokens=MAX_TOKENS,
        model_kwargs={"seed": 42},        # extra determinism when supported
    )

    # Force structured output — the model cannot return free text
    structured_llm = llm.with_structured_output(
        RiskAssessment,
        method="function_calling",        # most reliable structured mode
        strict=True,                      # OpenAI strict mode = schema enforced
    )

    node_context = build_node_context(node_ids)

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human",  HUMAN_PROMPT),
    ]).partial(node_context=node_context)

    return prompt | structured_llm


# ─── VALIDATION LAYER ─────────────────────────────────────────────────────────

def validate_and_sanitise(
    assessment: RiskAssessment,
    valid_ids: set[str],
) -> tuple[RiskAssessment, list[str]]:
    """
    Layer 2 defence: strip any node IDs that slipped through structured output
    but are not in the known graph. Logs every rejection.
    """
    notes: list[str] = []
    clean_nodes: list[AffectedNode] = []

    for node in assessment.affected_nodes:
        if node.node_id in valid_ids:
            clean_nodes.append(node)
        else:
            msg = (
                f"REJECTED hallucinated node_id='{node.node_id}' "
                f"(not in graph). Stripped from response."
            )
            logger.warning(msg)
            notes.append(msg)

    assessment.affected_nodes = clean_nodes
    return assessment, notes


# ─── ROUTER ───────────────────────────────────────────────────────────────────

risk_router = APIRouter(prefix="/query", tags=["AI Risk Engine"])


@risk_router.post("", response_model=QueryResponse)
async def query_risk(req: QueryRequest) -> QueryResponse:
    """
    Natural language disruption query → validated risk assessment.

    Anti-hallucination measures applied:
      • temperature=0
      • with_structured_output (Pydantic enforced)
      • strict=True (OpenAI schema enforcement)
      • post-generation ID validation against known graph
      • confidence threshold gate
    """
    valid_ids = get_valid_node_ids()

    # Honour caller-supplied context or use full graph
    context_ids = req.context_nodes if req.context_nodes else None

    try:
        chain = build_risk_chain(context_ids)
        raw: RiskAssessment = await chain.ainvoke({"query": req.query})
    except Exception as e:
        logger.error("LLM call failed: %s", e)
        raise HTTPException(status_code=502, detail=f"LLM unavailable: {e}")

    # ── Validation gate ──────────────────────────────────────────────────────
    assessment, notes = validate_and_sanitise(raw, valid_ids)

    # ── Confidence threshold: downgrade to UNCERTAIN if too low ──────────────
    if assessment.confidence_score < CONFIDENCE_THRESHOLD:
        logger.info(
            "Confidence %.2f below threshold %.2f — marking UNCERTAIN",
            assessment.confidence_score, CONFIDENCE_THRESHOLD,
        )
        # Don't highlight any nodes; just explain the uncertainty
        return QueryResponse(
            explanation=(
                f"⚠️ Low-confidence assessment ({assessment.confidence_score:.0%}). "
                f"The AI could not determine affected nodes with sufficient certainty.\n\n"
                f"Reasoning: {assessment.reasoning_chain}"
            ),
            affected_nodes=[],
            risk_levels={},
            confidence=assessment.confidence_score,
            severity="uncertain",
            reasoning_chain=assessment.reasoning_chain,
            estimated_recovery_days=0,
            financial_impact_usd=None,
            validation_notes=notes + ["Response suppressed: confidence below threshold"],
        )

    # ── Build final response ──────────────────────────────────────────────────
    affected_ids  = [n.node_id for n in assessment.affected_nodes]
    risk_map      = {n.node_id: n.risk_level.value for n in assessment.affected_nodes}

    # Overall severity = worst node risk level
    severity = "healthy"
    if any(n.risk_level == RiskLevel.CRITICAL for n in assessment.affected_nodes):
        severity = "critical"
    elif any(n.risk_level == RiskLevel.WARNING for n in assessment.affected_nodes):
        severity = "warning"

    # Build human-readable explanation
    node_lines = "\n".join(
        f"  • {n.node_id} ({KNOWN_NODES.get(n.node_id, {}).get('label', n.node_id)}) "
        f"→ {n.risk_level.value.upper()}: {n.reason}"
        for n in assessment.affected_nodes
    )
    explanation = (
        f"{assessment.reasoning_chain}\n\n"
        f"Affected nodes ({len(affected_ids)}):\n{node_lines}"
    )
    if assessment.financial_impact_usd:
        explanation += (
            f"\n\nEstimated financial impact: "
            f"${assessment.financial_impact_usd:,.0f}"
        )

    return QueryResponse(
        explanation=explanation,
        affected_nodes=affected_ids,
        risk_levels=risk_map,
        confidence=assessment.confidence_score,
        severity=severity,
        reasoning_chain=assessment.reasoning_chain,
        estimated_recovery_days=assessment.estimated_recovery_days,
        financial_impact_usd=assessment.financial_impact_usd,
        validation_notes=notes,
    )


# ─── WIRING INTO MAIN APP ─────────────────────────────────────────────────────
"""
In your main.py:

    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from ai_risk_engine import risk_router

    app = FastAPI()
    app.add_middleware(CORSMiddleware, allow_origins=["*"],
                       allow_methods=["*"], allow_headers=["*"])
    app.include_router(risk_router)
"""
