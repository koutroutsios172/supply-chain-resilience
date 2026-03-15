# Supply Chain Resilience
## AI Knowledge Base System

> *"The AI that reads your supplier contracts, traces a crisis through your supply chain, and tells you exactly what to do — and what it will cost you — in 4 seconds."*

---

## 👋 Hey, if you're a judge reading this

Thank you for taking the time to look at our project before the presentation.

We built something we're genuinely proud of, and we want you to be able to try it yourself — not just watch a demo. This README is written specifically for you. No assumed knowledge, no frustration.

**You have two options depending on how much time you have:**

| Option | Time needed | What you get |
|---|---|---|
| 🟢 **Quick start** — recommended | 2 minutes | Full UI, every feature, realistic data — zero setup |
| 🔵 **Full stack** | 10 minutes | Live AI responses powered by GPT-4.1 |

Start with the quick start. It looks and feels identical to the live version.

---

## 🟢 Option 1 — Quick Start (no backend, no API key, 2 minutes)

The entire app runs in your browser with realistic mock data. Every single feature works — the AI query, the interactive graph, the simulations, the crisis playbook, the gap detector, the alert feed, everything. We built it this way on purpose so a demo never fails on a bad network.

```bash
# 1. Clone the project
git clone https://github.com/your-username/supply-chain-resilience
cd supply-chain-resilience

# 2. Go into the frontend folder
cd frontend

# 3. Install dependencies (takes about 30 seconds)
npm install

# 4. Start the app
npm run dev
```

Then open **http://localhost:5173** in your browser.

That's it. You're in.

> **Don't have Node.js?** Download it from [nodejs.org](https://nodejs.org) — click the big green "LTS" button, install it, restart your terminal, and come back here. Takes 3 minutes.

---

## 🔵 Option 2 — Full Stack with Live AI (10 minutes)

This runs the real FastAPI backend with ChromaDB and makes live calls to GPT-4.1. You'll need an OpenAI API key.

### Step 1 — Start the backend

```bash
# Go into the backend folder
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Create the database folder (first time only)
mkdir -p chroma_db

# Set your OpenAI API key
export OPENAI_API_KEY=sk-...

# Start the server
uvicorn kb_engine:app --reload --port 8001
```

You should see this — leave the terminal running:
```
INFO:     Uvicorn running on http://127.0.0.1:8001
INFO:     Application startup complete.
```

### Step 2 — Start the frontend

```bash
# Open a second terminal, go into the frontend folder
cd supply-chain-resilience/frontend

npm install  # skip if you already did this

VITE_API_URL=http://localhost:8001 npm run dev
```

Open **http://localhost:5173** — now running with live AI.

---

## 🐳 Option 3 — Docker

If you prefer containers:

```bash
docker-compose up --build
```

Frontend → **http://localhost:3000** · Backend → **http://localhost:8001**

---

## 🚀 What to try first

Once you're in, here's a 5-minute path through the features that matter most:

**1. Start with KB Gaps**
Click the "KB Gaps" tab in the right panel. You'll see the system's own coverage score — 59% — and a breakdown of exactly what the AI doesn't know. This is the idea no other team thought of: an AI that audits its own blind spots.

**2. Run a disruption**
Click "Simulate" → "Storm at Port of Shanghai". Watch the graph light up. The app automatically switches to the "Suggest" tab with 3 alternative supply paths, each one grounded in a real contract clause.

**3. Apply a suggestion**
On the Suggest tab, click **Apply** on Option 1 (Reroute via Busan). The graph physically redraws with new green edges. The risk score drops from 78 to 41 in real time.

**4. Open the Crisis Playbook**
A glowing button appears over the graph when a disruption is active — click it. Two seconds later you get a full executive briefing: immediate actions with owners and deadlines, financial exposure ($31.5M at risk, $1.83M to mitigate), and every action cited to the exact contract clause that authorises it.

**5. Ask the AI a question**
Go to "AI Query" and type:
> *How does a typhoon at Port Shanghai affect our products?*

Notice that the retrieved document sources appear **before** the answer — you can see exactly which contracts and reports the AI read before generating its response. That's the transparency most AI systems hide from you.

---

## 💡 What makes this different from a chatbot

Most teams at this hackathon built a chatbot with documents. We built something architecturally different:

**A knowledge graph, not a flat document store.**
Your supply chain is modelled as 17 nodes and 24 dependency edges — suppliers connect to components, components to products, factories to ports. When a crisis hits, the AI doesn't just search text. It traces the failure through the actual dependency chain.

**The system knows what it doesn't know.**
The KB Gap Detector scans the knowledge base and surfaces nodes with no document coverage, contracts whose age has pushed confidence below the threshold, and single-source dependencies with no backup. No other system in this hackathon will tell you its own uncertainty score.

**Every answer is cited.**
Every response references the exact document and clause it came from. If the AI's confidence is below 65%, it says "uncertain" instead of giving you a confident wrong answer.

**It acts without being asked.**
Alerts fire automatically when disruptions are detected. The suggest tab opens on its own. The crisis playbook button appears when risk is elevated. The system monitors, not just responds.

---

## 🏗️ How it's built

```
┌──────────────────┬──────────────────┬───────────────────────┐
│    INGEST        │    KNOWLEDGE     │     INTELLIGENCE       │
│                  │      STORE       │                        │
│  PDF contracts   │                  │  Natural language      │
│  News articles   │  ChromaDB        │  query engine          │
│  Shipping data   │  vector store    │                        │
│  Audit reports   │       +          │  Graph reasoning       │
│                  │  ReactFlow       │  across 17 nodes       │
│                  │  knowledge graph │                        │
│                  │                  │  Crisis playbook       │
│                  │  877 vectors     │  generator             │
│                  │  17 nodes        │                        │
│                  │  24 edges        │  Alternative path      │
│                  │                  │  suggestions           │
└──────────────────┴──────────────────┴───────────────────────┘
```

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, ReactFlow, TailwindCSS |
| Backend | FastAPI, Python 3.11 |
| AI Orchestration | LangChain |
| Vector Database | ChromaDB |
| Language Model | OpenAI GPT-4.1 |
| Embeddings | text-embedding-3-small |
| Deployment | Docker, docker-compose, nginx |

---

## ⚠️ Troubleshooting

We've tried to anticipate everything. If something goes wrong:

**`npm: command not found`**
Install Node.js from [nodejs.org](https://nodejs.org), restart your terminal, try again.

**`pip: command not found`**
Try `pip3` instead of `pip`.

**`Unable to open database file`**
Run `mkdir -p backend/chroma_db` from the project root, then restart the backend.

**`403 error` from OpenAI**
Your API key may not have access to `gpt-4.1`. Open `backend/kb_engine.py`, find `LLM_MODEL` near the top, and change it to `gpt-4o` or `gpt-4o-mini`. The quick start option doesn't need any of this.

**The page is blank**
Hard refresh: `Ctrl+Shift+R` on Windows, `Cmd+Shift+R` on Mac.

**Something else broke**
Just use Option 1 — the quick start with no backend. It shows every feature and looks identical. We built it to be judge-proof.

---

## 📁 Project structure

```
supply-chain-resilience/
│
├── backend/
│   ├── chroma_db/                         # Vector database (auto-created)
│   ├── ai_risk_engine.py                  # Risk scoring engine
│   ├── kb_engine.py                       # FastAPI + LangChain + ChromaDB
│   ├── main.py                            # Backend entry point
│   ├── requirements.txt                   # Python dependencies
│   ├── Dockerfile                         # Backend container
│   └── .env                              # Backend environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AlertFeed.jsx              # Proactive alert ticker + feed
│   │   │   ├── AlternativePathSuggestions.jsx  # Rerouting options + apply
│   │   │   ├── CollapsibleGraphView.jsx   # Collapsible graph wrapper
│   │   │   ├── ConfidenceBadge.jsx        # AI confidence indicator
│   │   │   ├── CrisisPlaybook.jsx         # Executive briefing generator
│   │   │   ├── FinancialImpactPanel.jsx   # Revenue at risk panel
│   │   │   ├── GraphView.jsx              # Interactive knowledge graph
│   │   │   ├── KBHealthPanel.jsx          # Database status & metrics
│   │   │   ├── KBIngestionPanel.jsx       # Document upload pipeline
│   │   │   ├── KnowledgeGapDetector.jsx   # KB coverage analysis
│   │   │   ├── NodeDetails.jsx            # Node info drawer
│   │   │   ├── QueryPanel.jsx             # AI query + RAG sources panel
│   │   │   ├── RiskDashboard.jsx          # Financial KPI dashboard
│   │   │   └── SimulationPanel.jsx        # Disruption scenario controls
│   │   ├── pages/
│   │   │   └── Dashboard.jsx              # Main layout + all state
│   │   ├── services/
│   │   │   ├── ai_risk_engine.py          # Risk engine (Python bridge)
│   │   │   └── api.js                     # API client + full mock fallback
│   │   ├── App.jsx                        # App root
│   │   ├── index.css                      # Global styles
│   │   └── main.jsx                       # React entry point
│   ├── index.html
│   ├── nginx.conf                         # Frontend static server config
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── Dockerfile                         # Frontend container
│
├── docker-compose.yml                     # Runs everything together
├── .env.example                           # Copy this to .env to get started
├── .gitignore
└── README.md                              # You are here
```

---

## 💬 One last thing

We'll be there during the presentation to walk you through everything. But if you explore on your own first, the two things that will show you what makes this system genuinely different are:

1. **The KB Gaps tab** — the AI telling you what it doesn't know
2. **Simulate → Suggest → Apply** — watching the graph change based on a contract-grounded decision

Everything else builds on those two ideas.

See you at the pitch.

---

*Built for the AI Knowledge Base System Hackathon — March 2026*
*Team: George Koutroutsios*
