import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── MOCK KNOWLEDGE BASE DOCUMENTS ───────────────────────────────────────────
export const MOCK_KB_DOCUMENTS = [
  { id: 'doc-1', name: 'Foxconn_Master_Agreement_2024.pdf',    type: 'contract',  nodes: ['sup-1','comp-1','comp-2'], vectors: 142, date: '2024-01-15', status: 'indexed' },
  { id: 'doc-2', name: 'Samsung_SLA_Components_Q1.pdf',        type: 'contract',  nodes: ['sup-2','comp-3'],          vectors: 98,  date: '2024-02-03', status: 'indexed' },
  { id: 'doc-3', name: 'TSMC_Supply_Agreement_Confidential.pdf', type: 'contract', nodes: ['sup-3','comp-4'],         vectors: 211, date: '2024-01-28', status: 'indexed' },
  { id: 'doc-4', name: 'Reuters_Shanghai_Port_Typhoon_Warning.txt', type: 'news', nodes: ['port-1'],                  vectors: 34,  date: '2024-03-08', status: 'indexed' },
  { id: 'doc-5', name: 'Lloyd_Shipping_Q1_Risk_Report.pdf',    type: 'report',    nodes: ['port-1','port-2','port-3'], vectors: 187, date: '2024-03-01', status: 'indexed' },
  { id: 'doc-6', name: 'Murata_Capacitor_Spec_Sheet.pdf',      type: 'technical', nodes: ['sup-4','comp-5'],          vectors: 76,  date: '2024-02-20', status: 'indexed' },
  { id: 'doc-7', name: 'Shenzhen_Plant_Audit_2024.pdf',        type: 'audit',     nodes: ['fact-1'],                  vectors: 129, date: '2024-03-05', status: 'indexed' },
];

export const MOCK_KB_HEALTH = {
  totalVectors:     877,
  totalDocuments:   7,
  totalNodes:       17,
  totalRelationships: 24,
  lastIngestion:    new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  staleNodes:       1,
  confidenceDecay:  ['sup-2'],
  indexingStatus:   'healthy',
  chromaStatus:     'connected',
  embeddingModel:   'text-embedding-3-small',
  ragLatencyMs:     340,
  queriesLast24h:   47,
  avgConfidence:    0.81,
  knowledgeSources: {
    contracts: 3,
    news:      1,
    reports:   1,
    technical: 1,
    audits:    1,
  },
};

// ─── MOCK GRAPH DATA ──────────────────────────────────────────────────────────
const MOCK_GRAPH = {
  nodes: [
    { id: 'sup-1',  type: 'supplier',   data: { label: 'Foxconn Taiwan',    status: 'healthy', region: 'Asia-Pacific', risk: 'low',    components: ['comp-1','comp-2'], ports: ['port-1'], kbDocs: ['doc-1'] } },
    { id: 'sup-2',  type: 'supplier',   data: { label: 'Samsung Korea',     status: 'healthy', region: 'Asia-Pacific', risk: 'low',    components: ['comp-3'],          ports: ['port-2'], kbDocs: ['doc-2'] } },
    { id: 'sup-3',  type: 'supplier',   data: { label: 'TSMC Taiwan',       status: 'healthy', region: 'Asia-Pacific', risk: 'medium', components: ['comp-4'],          ports: ['port-1'], kbDocs: ['doc-3'] } },
    { id: 'sup-4',  type: 'supplier',   data: { label: 'Murata Japan',      status: 'healthy', region: 'Asia-Pacific', risk: 'low',    components: ['comp-5'],          ports: ['port-3'], kbDocs: ['doc-6'] } },
    { id: 'comp-1', type: 'component',  data: { label: 'Display Panel',     status: 'healthy', kbDocs: ['doc-1'] } },
    { id: 'comp-2', type: 'component',  data: { label: 'Battery Cell',      status: 'healthy', kbDocs: ['doc-1'] } },
    { id: 'comp-3', type: 'component',  data: { label: 'Memory Chip',       status: 'healthy', kbDocs: ['doc-2'] } },
    { id: 'comp-4', type: 'component',  data: { label: 'Processor SoC',     status: 'healthy', kbDocs: ['doc-3'] } },
    { id: 'comp-5', type: 'component',  data: { label: 'Capacitors',        status: 'healthy', kbDocs: ['doc-6'] } },
    { id: 'prod-1', type: 'product',    data: { label: 'Smartphone X1',     status: 'healthy', estimatedDelay: 0 } },
    { id: 'prod-2', type: 'product',    data: { label: 'Tablet Pro',        status: 'healthy', estimatedDelay: 0 } },
    { id: 'prod-3', type: 'product',    data: { label: 'Server Module',     status: 'healthy', estimatedDelay: 0 } },
    { id: 'fact-1', type: 'factory',    data: { label: 'Shenzhen Plant A',  status: 'healthy', location: 'Shenzhen, CN', capacity: '95%', kbDocs: ['doc-7'] } },
    { id: 'fact-2', type: 'factory',    data: { label: 'Taipei Plant B',    status: 'healthy', location: 'Taipei, TW',   capacity: '88%' } },
    { id: 'port-1', type: 'port',       data: { label: 'Port of Shanghai',  status: 'healthy', location: 'Shanghai, CN', throughput: '42M TEU/yr', kbDocs: ['doc-4','doc-5'] } },
    { id: 'port-2', type: 'port',       data: { label: 'Port of Busan',     status: 'healthy', location: 'Busan, KR',    throughput: '22M TEU/yr', kbDocs: ['doc-5'] } },
    { id: 'port-3', type: 'port',       data: { label: 'Port of Osaka',     status: 'healthy', location: 'Osaka, JP',    throughput: '9M TEU/yr',  kbDocs: ['doc-5'] } },
  ],
  edges: [
    { id:'e-s1-c1',  source:'sup-1',  target:'comp-1', animated:false },
    { id:'e-s1-c2',  source:'sup-1',  target:'comp-2', animated:false },
    { id:'e-s2-c3',  source:'sup-2',  target:'comp-3', animated:false },
    { id:'e-s3-c4',  source:'sup-3',  target:'comp-4', animated:false },
    { id:'e-s4-c5',  source:'sup-4',  target:'comp-5', animated:false },
    { id:'e-c1-p1',  source:'comp-1', target:'prod-1', animated:false },
    { id:'e-c1-p2',  source:'comp-1', target:'prod-2', animated:false },
    { id:'e-c2-p1',  source:'comp-2', target:'prod-1', animated:false },
    { id:'e-c3-p1',  source:'comp-3', target:'prod-1', animated:false },
    { id:'e-c3-p2',  source:'comp-3', target:'prod-2', animated:false },
    { id:'e-c3-p3',  source:'comp-3', target:'prod-3', animated:false },
    { id:'e-c4-p1',  source:'comp-4', target:'prod-1', animated:false },
    { id:'e-c4-p2',  source:'comp-4', target:'prod-2', animated:false },
    { id:'e-c4-p3',  source:'comp-4', target:'prod-3', animated:false },
    { id:'e-c5-p2',  source:'comp-5', target:'prod-2', animated:false },
    { id:'e-c5-p3',  source:'comp-5', target:'prod-3', animated:false },
    { id:'e-s1-po1', source:'sup-1',  target:'port-1', animated:false },
    { id:'e-s3-po1', source:'sup-3',  target:'port-1', animated:false },
    { id:'e-s2-po2', source:'sup-2',  target:'port-2', animated:false },
    { id:'e-s4-po3', source:'sup-4',  target:'port-3', animated:false },
    { id:'e-po1-f1', source:'port-1', target:'fact-1', animated:false },
    { id:'e-po1-f2', source:'port-1', target:'fact-2', animated:false },
    { id:'e-po2-f1', source:'port-2', target:'fact-1', animated:false },
    { id:'e-po3-f2', source:'port-3', target:'fact-2', animated:false },
  ],
};

const MOCK_DASHBOARD = {
  totalSuppliers: 4, affectedComponents: 0, affectedProducts: 0,
  estimatedDelay: '0 days', riskScore: 12,
  lastUpdated: new Date().toISOString(),
};

// ─── MOCK RAG SOURCES ─────────────────────────────────────────────────────────
const buildRagSources = (nodeIds = []) => {
  const relevant = MOCK_KB_DOCUMENTS.filter(d =>
    d.nodes.some(n => nodeIds.includes(n)) || nodeIds.length === 0
  );
  return relevant.slice(0, 4).map(d => ({
    docId:      d.id,
    name:       d.name,
    type:       d.type,
    similarity: parseFloat((0.75 + Math.random() * 0.22).toFixed(2)),
    excerpt:    getMockExcerpt(d.id),
    nodes:      d.nodes,
  }));
};

const getMockExcerpt = (docId) => {
  const excerpts = {
    'doc-1': 'Force majeure clause §12.4: In the event of typhoon or natural disaster affecting Taiwan Strait shipping lanes, delivery timelines extend by 14–21 days...',
    'doc-2': 'Memory NAND supply commitment: Samsung guarantees 98.5% SLA uptime. Port of Busan is designated primary export terminal for all component shipments...',
    'doc-3': 'TSMC Advanced Packaging: All N3E node processors route through Port of Shanghai. Alternative routing via Kaohsiung Port adds 6-day transit penalty...',
    'doc-4': 'REUTERS 08/03/2024: Typhoon Haikui forecast to make landfall near Shanghai. Port authority has issued Category 3 vessel restriction order effective 72 hours...',
    'doc-5': 'Q1 2024 Risk Assessment: Port of Shanghai rated ELEVATED risk due to seasonal typhoon exposure. Recommended cargo insurance uplift of 12% for Q2 bookings...',
    'doc-6': 'Murata Electronics: MLCC capacitor lead times extended to 18 weeks due to ceramic substrate shortages in Japan. Port of Osaka operating at 94% capacity...',
    'doc-7': 'Shenzhen Plant A Audit 2024: ISO 9001 compliant. Fire suppression systems upgraded. Current capacity utilisation 95%. Flood risk: LOW per updated topography survey...',
  };
  return excerpts[docId] || 'Document excerpt not available.';
};

// ─── MOCK QUERY RESPONSES WITH RAG SOURCES ────────────────────────────────────
const MOCK_QUERIES = {
  shanghai: {
    explanation: `Critical path analysis for Port of Shanghai disruption:\n\n• 2 suppliers (Foxconn, TSMC) route exclusively through Shanghai\n• Force majeure clause in Foxconn contract extends delivery by 14–21 days\n• Estimated component shortage onset: 18–22 days\n• Affected products: Smartphone X1, Tablet Pro (Display Panel + Processor SoC)\n\nRecommended mitigation: Reroute via Port of Busan (+6 day transit per TSMC SLA §7.2), activate Malaysia backup supplier.`,
    affectedNodes:  ['port-1','sup-1','sup-3','comp-1','comp-4','prod-1','prod-2'],
    riskLevels:     { 'port-1':'critical','sup-1':'warning','sup-3':'warning','comp-1':'warning','comp-4':'warning','prod-1':'warning','prod-2':'warning' },
    severity:       'critical',
    confidence:     0.91,
    ragSources:     buildRagSources(['port-1','sup-1','sup-3']),
    graphPaths:     ['port-1 → sup-1 → comp-1 → prod-1', 'port-1 → sup-3 → comp-4 → prod-2'],
    estimatedRecoveryDays: 18,
    financialImpactUsd:    31_500_000,
  },
  memory: {
    explanation: `Memory Chip supply chain analysis:\n\n• Samsung Korea is sole supplier of Memory Chips (comp-3)\n• comp-3 feeds ALL 3 products: Smartphone X1, Tablet Pro, Server Module\n• Port of Busan SLA guarantees 98.5% uptime — currently nominal\n• Single-source dependency is the critical risk factor\n\nRecommendation: Qualify Micron or SK Hynix as secondary supplier to eliminate SPOF.`,
    affectedNodes:  ['sup-2','comp-3','prod-1','prod-2','prod-3'],
    riskLevels:     { 'sup-2':'warning','comp-3':'warning','prod-1':'warning','prod-2':'warning','prod-3':'warning' },
    severity:       'warning',
    confidence:     0.87,
    ragSources:     buildRagSources(['sup-2','comp-3']),
    graphPaths:     ['sup-2 → comp-3 → prod-1', 'sup-2 → comp-3 → prod-2', 'sup-2 → comp-3 → prod-3'],
    estimatedRecoveryDays: 12,
    financialImpactUsd:    18_900_000,
  },
  default: (q) => ({
    explanation: `Knowledge base query: "${q}"\n\nRetrieved ${Math.floor(Math.random()*3)+2} relevant documents from ChromaDB. Based on current graph topology and contract terms, this scenario cascades through 2–3 dependency layers.\n\nPrimary risk vector: port logistics → component availability → production scheduling. No single-source failure points detected in current query scope.`,
    affectedNodes:  ['port-1','sup-1','comp-1'],
    riskLevels:     { 'port-1':'warning','sup-1':'warning','comp-1':'warning' },
    severity:       'warning',
    confidence:     0.74,
    ragSources:     buildRagSources(['port-1','sup-1']),
    graphPaths:     ['port-1 → sup-1 → comp-1 → prod-1'],
    estimatedRecoveryDays: 10,
    financialImpactUsd:    12_600_000,
  }),
};

// ─── MOCK SUGGESTIONS ─────────────────────────────────────────────────────────
const MOCK_SUGGESTIONS = {
  storm_port: [
    {
      id: 'sug-1', rank: 1, type: 'REROUTE',
      title: 'Reroute Foxconn & TSMC via Port of Busan',
      summary: 'AI detected incoming typhoon. Shift APAC shipments to Busan immediately. Samsung SLA §8.2 guarantees 18k TEU/week capacity without penalty.',
      brokenPath: 'Foxconn → port-1 (Shanghai) → fact-1',
      newPath:    'Foxconn → port-2 (Busan) → fact-1',
      newEdges: [
        { id: 'sug-e-1', source: 'sup-1', target: 'port-2', animated: true, label: '⚡ NEW ROUTE', style: { stroke: '#00e5ff', strokeWidth: 3, strokeDasharray: '6 4' }, labelStyle: { fill: '#000000', fontWeight: 900, fontSize: 10, fontFamily: 'IBM Plex Mono' }, labelBgStyle: { fill: '#00e5ff', fillOpacity: 1, rx: 6, ry: 6 } },
        { id: 'sug-e-2', source: 'sup-3', target: 'port-2', animated: true, label: '⚡ NEW ROUTE', style: { stroke: '#00e5ff', strokeWidth: 3, strokeDasharray: '6 4' }, labelStyle: { fill: '#000000', fontWeight: 900, fontSize: 10, fontFamily: 'IBM Plex Mono' }, labelBgStyle: { fill: '#00e5ff', fillOpacity: 1, rx: 6, ry: 6 } },
        { id: 'sug-e-3', source: 'port-2', target: 'fact-1', animated: true, style: { stroke: '#00e5ff', strokeWidth: 3, strokeDasharray: '6 4' } }
      ],
      removedEdges: ['e-s1-po1', 'e-s3-po1', 'e-po1-f1', 'e-po1-f2'],
      timeDelta: +6, costDelta: -2_100_000, newRiskScore: 41, riskReduction: 37,
      kbSource: 'Samsung_SLA_Components_Q1.pdf',
      kbClause: '§8.2 — Busan port guaranteed capacity: 18,000 TEU/week. Force Majeure pre-approved.',
      confidence: 0.94, affectedNodes: ['sup-1', 'sup-3', 'port-2'],
      pros: ['Saves $2.1M in delay penalties', 'Carbon Footprint (CO2e) optimized route'],
      cons: ['Adds 6 transit days vs original route'],
    },
    {
      id: 'sug-2', rank: 2, type: 'AIR_FREIGHT',
      title: 'Emergency Air Freight for Processor SoC',
      summary: 'Air freight TSMC Processor SoC directly to Shenzhen Plant A. Protects critical Smartphone X1 launch window.',
      brokenPath: 'sup-3 (TSMC) → port-1 → fact-1',
      newPath:    'sup-3 (TSMC) → ✈ air freight → fact-1 (14 days saved)',
      newEdges: [
        { id: 'sug-e-5', source: 'sup-3', target: 'fact-1', animated: true, label: '✈ AIR FREIGHT', style: { stroke: '#f59e0b', strokeWidth: 3, strokeDasharray: '4 2' }, labelStyle: { fill: '#000000', fontWeight: 900, fontSize: 10, fontFamily: 'IBM Plex Mono' }, labelBgStyle: { fill: '#f59e0b', fillOpacity: 1, rx: 6, ry: 6 } },
      ],
      removedEdges: ['e-s3-po1'],
      timeDelta: -14, costDelta: +340_000, newRiskScore: 52, riskReduction: 26,
      kbSource: 'TSMC_Supply_Agreement_Confidential.pdf',
      kbClause: '§6.3 — Emergency air freight clause activated automatically above Category 2 disruption.',
      confidence: 0.88, affectedNodes: ['sup-3', 'comp-4', 'fact-1'],
      pros: ['Recovers 14 days of critical path delay', 'Protects flagship product revenue stream'],
      cons: ['Adds $340K premium freight cost', 'High CO2e emissions penalty'],
    },
  ],
  port_strike: [
    {
      id: 'sug-3', rank: 1, type: 'REROUTE',
      title: 'Reroute Samsung Memory Chips via Port of Osaka',
      summary: 'AI identified ongoing labor action at Busan. Immediate dynamic rerouting to Osaka to maintain 98.5% SLA uptime.',
      brokenPath: 'sup-2 (Samsung) → port-2 (Busan) → fact-1',
      newPath:    'sup-2 (Samsung) → port-3 (Osaka) → fact-1',
      newEdges: [
        { id: 'sug-e-6', source: 'sup-2', target: 'port-3', animated: true, label: '⚡ NEW ROUTE', style: { stroke: '#00e5ff', strokeWidth: 3, strokeDasharray: '6 4' }, labelStyle: { fill: '#000000', fontWeight: 900, fontSize: 10, fontFamily: 'IBM Plex Mono' }, labelBgStyle: { fill: '#00e5ff', fillOpacity: 1, rx: 6, ry: 6 } },
        { id: 'sug-e-7', source: 'port-3', target: 'fact-1', animated: true, style: { stroke: '#00e5ff', strokeWidth: 3, strokeDasharray: '6 4' } }
      ],
      removedEdges: ['e-s2-po2', 'e-po2-f1'],
      timeDelta: +4, costDelta: -1_800_000, newRiskScore: 38, riskReduction: 27,
      kbSource: 'Lloyd_Shipping_Q1_Risk_Report.pdf',
      kbClause: 'Page 12: Port of Osaka (9M TEU/yr) cleared for overflow contingency routing.',
      confidence: 0.89, affectedNodes: ['sup-2', 'port-3', 'comp-3'],
      pros: ['Negligible 4-day transit impact', 'Pre-negotiated port tariffs'],
      cons: ['Osaka terminal adds mild inland logistics friction'],
    },
    {
      id: 'sug-4', rank: 2, type: 'SPOT_PURCHASE',
      title: 'Emergency Spot Purchase — Micron US',
      summary: 'Bypass Busan port and Samsung entirely. Spot purchase Memory Chips to feed components directly.',
      brokenPath: 'sup-2 (Samsung Korea) → port-2 → comp-3',
      newPath:    'Micron US (Spot) → 🛒 → comp-3',
      newEdges: [
        { id: 'sug-e-8', source: 'sup-4', target: 'comp-3', animated: true, label: '🛒 SPOT MARKET', style: { stroke: '#8b5cf6', strokeWidth: 3, strokeDasharray: '4 4' }, labelStyle: { fill: '#ffffff', fontWeight: 900, fontSize: 10, fontFamily: 'IBM Plex Mono' }, labelBgStyle: { fill: '#8b5cf6', fillOpacity: 1, rx: 6, ry: 6 } }
      ],
      removedEdges: ['e-s2-c3'],
      timeDelta: +8, costDelta: +620_000, newRiskScore: 44, riskReduction: 21,
      kbSource: null,
      kbClause: 'Out of contract — Spot market activation authorized by CFO protocols.',
      confidence: 0.61, affectedNodes: ['comp-3'],
      pros: ['Eliminates Port of Busan dependency entirely'],
      cons: ['+$620K premium on spot market', 'No contractual SLA guarantees'],
    },
  ],
  supplier_delay: [
    {
      id: 'sug-5', rank: 1, type: 'AIR_FREIGHT',
      title: 'Activate TSMC Kaohsiung Secondary Node',
      summary: 'Equipment failure detected at primary TSMC node. AI recommends shifting 60% workload to Kaohsiung backup facility.',
      brokenPath: 'sup-3 (TSMC main) → comp-4 → products',
      newPath:    'sup-3 (Kaohsiung Backup) → ✈ → comp-4 → products',
      newEdges: [
        { id: 'sug-e-9', source: 'sup-3', target: 'comp-4', animated: true, label: '✈ BACKUP NODE', style: { stroke: '#f59e0b', strokeWidth: 3, strokeDasharray: '6 4' }, labelStyle: { fill: '#000000', fontWeight: 900, fontSize: 10, fontFamily: 'IBM Plex Mono' }, labelBgStyle: { fill: '#f59e0b', fillOpacity: 1, rx: 6, ry: 6 } },
      ],
      removedEdges: ['e-s3-c4'],
      timeDelta: -10, costDelta: +280_000, newRiskScore: 29, riskReduction: 26,
      kbSource: 'TSMC_Supply_Agreement_Confidential.pdf',
      kbClause: '§4.2 — Kaohsiung facility designated as active-active contingency site.',
      confidence: 0.92, affectedNodes: ['sup-3', 'comp-4'],
      pros: ['Saves 10 days of production downtime', 'Maintains IP security protocols'],
      cons: ['Kaohsiung yields are 4% lower', 'Adds $280k in expedited setup costs'],
    },
  ],
  shipping_disruption: [
    {
      id: 'sug-6', rank: 1, type: 'REROUTE',
      title: 'Execute Cape of Good Hope Logistics Pivot',
      summary: 'Suez bottleneck detected. AI dynamically reroutes all EMEA-bound shipments around the Cape to prevent cascading stockouts.',
      brokenPath: 'All ports → Suez Canal → EMEA',
      newPath:    'All ports → Cape of Good Hope → EMEA (+14 days)',
      newEdges: [], // Global disruption, δεν φαινεται στο τοπικο Asia-Pacific γραφημα
      removedEdges: [],
      timeDelta: +14, costDelta: -8_200_000, newRiskScore: 58, riskReduction: 38,
      kbSource: 'Lloyd_Shipping_Q1_Risk_Report.pdf',
      kbClause: 'Section 4.1 — Cape routing contingency automatically activated for Level 4 geopolitical events.',
      confidence: 0.95, affectedNodes: ['port-1', 'port-2', 'port-3'],
      pros: ['Massive $8.2M protection against late-delivery penalties', 'Guarantees inventory arrival'],
      cons: ['Absorbs 14 extra transit days globally', 'Significant CO2e increase per vessel'],
    },
    {
      id: 'sug-7', rank: 2, type: 'AIR_FREIGHT',
      title: 'Trans-Eurasian Rail & Air Bridge',
      summary: 'Bypass ocean freight completely for high-margin components (Smartphone X1) via direct rail-to-air bridge.',
      brokenPath: 'Ocean Freight → EMEA',
      newPath:    'Factories → 🚂 Rail to Hub → ✈ Air to EMEA',
      newEdges: [
        { id: 'sug-e-10', source: 'fact-1', target: 'prod-1', animated: true, label: '🚂 RAIL/AIR BRIDGE', style: { stroke: '#00e5ff', strokeWidth: 3, strokeDasharray: '8 4' }, labelStyle: { fill: '#000000', fontWeight: 900, fontSize: 10, fontFamily: 'IBM Plex Mono' }, labelBgStyle: { fill: '#00e5ff', fillOpacity: 1, rx: 6, ry: 6 } }
      ],
      removedEdges: [],
      timeDelta: -5, costDelta: +1_400_000, newRiskScore: 65, riskReduction: 31,
      kbSource: 'Foxconn_Master_Agreement_2024.pdf',
      kbClause: 'Logistics Addendum 2: Priority Rail/Air routing authorized for flagship SKUs.',
      confidence: 0.74, affectedNodes: ['fact-1', 'prod-1'],
      pros: ['Protects Smartphone X1 launch', 'Bypasses global ocean choke-points'],
      cons: ['Extremely high logistics cost', 'Only scalable for 15% of total volume'],
    }
  ],
  default: [],
};

// ─── DISRUPTION SIMULATION ────────────────────────────────────────────────────
function applyDisruption(graph, eventType) {
  const nodes = JSON.parse(JSON.stringify(graph.nodes));
  const edges = JSON.parse(JSON.stringify(graph.edges));
  let message = '', affectedNodeIds = [];
  let dashboard = { ...MOCK_DASHBOARD };

  const mark = (ids, status, edgeColor) => {
    nodes.forEach(n => { if (ids.includes(n.id)) n.data.status = status; });
    edges.forEach(e => { if (ids.includes(e.source)||ids.includes(e.target)) { e.animated=true; e.style={stroke:edgeColor}; } });
  };

  switch (eventType) {
    case 'storm_port':
      affectedNodeIds = ['port-1','sup-1','sup-3','comp-1','comp-4','prod-1','prod-2','fact-1','fact-2'];
      mark(['port-1','fact-1','fact-2'], 'critical', '#ef4444');
      mark(['sup-1','sup-3','comp-1','comp-4','prod-1','prod-2'], 'warning', '#eab308');
      message = '🌩️ Typhoon alert at Port of Shanghai — KB retrieved Foxconn force-majeure clause §12.4. Component shortage expected in 18–22 days.';
      dashboard = { totalSuppliers:4, affectedComponents:2, affectedProducts:2, estimatedDelay:'18–22 days', riskScore:78, lastUpdated:new Date().toISOString() };
      break;
    case 'port_strike':
      affectedNodeIds = ['port-2','sup-2','comp-3','prod-1','prod-2','prod-3','fact-1'];
      mark(['port-2','sup-2','comp-3'], 'critical', '#ef4444');
      mark(['prod-1','prod-2','prod-3'], 'warning', '#eab308');
      message = '⚠️ Labor strike at Port of Busan — Samsung SLA breach triggered. Memory chip shortage affects all 3 product lines.';
      dashboard = { totalSuppliers:4, affectedComponents:1, affectedProducts:3, estimatedDelay:'10–15 days', riskScore:65, lastUpdated:new Date().toISOString() };
      break;
    case 'supplier_delay':
      affectedNodeIds = ['sup-3','comp-4','prod-1','prod-2','prod-3'];
      mark(['sup-3'], 'critical', '#ef4444');
      mark(['comp-4','prod-1','prod-2','prod-3'], 'warning', '#eab308');
      message = '🔧 TSMC equipment failure — KB cross-referenced N3E processor specs. Processor SoC shortage hits all products in 21 days.';
      dashboard = { totalSuppliers:4, affectedComponents:1, affectedProducts:3, estimatedDelay:'21 days', riskScore:55, lastUpdated:new Date().toISOString() };
      break;
    case 'shipping_disruption':
      affectedNodeIds = nodes.map(n=>n.id);
      nodes.forEach(n => { n.data.status = n.type==='factory'?'warning':'critical'; });
      edges.forEach(e => { e.animated=true; e.style={stroke:'#ef4444'}; });
      message = '🚢 Suez Canal closure — global KB alert. All 3 ports, 4 suppliers, 5 components affected. 14–30 day disruption across all product lines.';
      dashboard = { totalSuppliers:4, affectedComponents:5, affectedProducts:3, estimatedDelay:'14–30 days', riskScore:96, lastUpdated:new Date().toISOString() };
      break;
    case 'reset':
      nodes.forEach(n => { n.data.status='healthy'; });
      edges.forEach(e => { e.animated=false; e.style={}; });
      message = '✅ Knowledge base restored to nominal state. All node risk scores reset.';
      break;
  }
  return { nodes, edges, message, affectedNodeIds, dashboard };
}

// ─── MOCK INGESTION ───────────────────────────────────────────────────────────
const MOCK_INGEST_RESULTS = {
  'pdf':  (name) => ({ docId:`doc-${Date.now()}`, name, vectors:Math.floor(80+Math.random()*180), nodesExtracted:Math.floor(1+Math.random()*4), relationshipsFound:Math.floor(2+Math.random()*6), status:'indexed', processingMs:1800+Math.floor(Math.random()*1200) }),
  'txt':  (name) => ({ docId:`doc-${Date.now()}`, name, vectors:Math.floor(20+Math.random()*60),  nodesExtracted:Math.floor(1+Math.random()*2), relationshipsFound:Math.floor(1+Math.random()*3), status:'indexed', processingMs:400+Math.floor(Math.random()*400) }),
  'default': (name) => ({ docId:`doc-${Date.now()}`, name, vectors:Math.floor(40+Math.random()*100), nodesExtracted:1, relationshipsFound:2, status:'indexed', processingMs:900 }),
};

// ─── STATE ────────────────────────────────────────────────────────────────────
let currentGraph     = JSON.parse(JSON.stringify(MOCK_GRAPH));
let currentDashboard = { ...MOCK_DASHBOARD };
let kbDocuments      = [...MOCK_KB_DOCUMENTS];
let kbHealth         = { ...MOCK_KB_HEALTH };

// ─── PUBLIC API ───────────────────────────────────────────────────────────────
export const api = {
  async getGraph() {
    try { return (await client.get('/graph')).data; } catch { return currentGraph; }
  },

  async getDashboard() {
    try { return (await client.get('/dashboard')).data; } catch { return currentDashboard; }
  },

  async getKBHealth() {
    try { return (await client.get('/kb/health')).data; }
    catch {
      return { ...kbHealth, lastIngestion: new Date(Date.now()-2*60*1000).toISOString(), totalDocuments: kbDocuments.length, totalVectors: kbDocuments.reduce((s,d)=>s+d.vectors,0) };
    }
  },

  async getKBDocuments() {
    try { return (await client.get('/kb/documents')).data; } catch { return kbDocuments; }
  },

  async query(text, contextNodes = []) {
    try {
      const res = await client.post('/query', { query:text, context_nodes:contextNodes });
      return res.data;
    } catch {
      await new Promise(r => setTimeout(r,1400));
      const lower = text.toLowerCase();
      if (lower.includes('shanghai')||lower.includes('storm')||lower.includes('typhoon')||lower.includes('weather')) return MOCK_QUERIES.shanghai;
      if (lower.includes('memory')||lower.includes('samsung')||lower.includes('chip'))  return MOCK_QUERIES.memory;
      return MOCK_QUERIES.default(text);
    }
  },

  async simulateEvent(eventType) {
    try {
      const res = await client.post('/simulate-event', { event:eventType });
      return res.data;
    } catch {
      await new Promise(r => setTimeout(r,600));
      const result = applyDisruption(currentGraph, eventType);
      currentGraph     = { nodes:result.nodes, edges:result.edges };
      currentDashboard = result.dashboard || currentDashboard;
      return result;
    }
  },

  async ingestDocument(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await client.post('/kb/ingest', formData, { headers:{'Content-Type':'multipart/form-data'} });
      return res.data;
    } catch {
      await new Promise(r => setTimeout(r,2200));
      const ext    = file.name.split('.').pop().toLowerCase();
      const result = (MOCK_INGEST_RESULTS[ext] || MOCK_INGEST_RESULTS.default)(file.name);
      const newDoc = { id:result.docId, name:file.name, type:ext==='pdf'?'contract':'news', nodes:['sup-1'], vectors:result.vectors, date:new Date().toISOString().split('T')[0], status:'indexed' };
      kbDocuments  = [newDoc, ...kbDocuments];
      kbHealth     = { ...kbHealth, totalDocuments:kbDocuments.length, totalVectors:kbDocuments.reduce((s,d)=>s+d.vectors,0), lastIngestion:new Date().toISOString() };
      return result;
    }
  },

  async generatePlaybook(lastSimEvent) {
    try {
      const res = await client.post('/crisis-playbook', {
        event: lastSimEvent,
        graph_state: currentGraph,
      });
      return res.data;
    } catch {
      await new Promise(r => setTimeout(r, 2000));
      return null; // CrisisPlaybook.jsx handles its own mock
    }
  },

  // NEW — Alternative Path Suggestions
  async getSuggestions(eventType) {
    try {
      const res = await client.post('/suggestions', { event: eventType });
      return res.data;
    } catch {
      await new Promise(r => setTimeout(r, 800));
      return MOCK_SUGGESTIONS[eventType] || MOCK_SUGGESTIONS.default;
    }
  },
};

export { MOCK_GRAPH, MOCK_DASHBOARD };