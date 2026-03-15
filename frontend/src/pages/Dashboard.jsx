/** Dashboard v6 — SVG icons throughout, professional buttons, refined layout */
import { useState, useEffect, useCallback } from 'react';
import GraphView                            from '../components/GraphView';
import QueryPanel                           from '../components/QueryPanel';
import SimulationPanel                      from '../components/SimulationPanel';
import RiskDashboard                        from '../components/RiskDashboard';
import NodeDetails                          from '../components/NodeDetails';
import KBHealthPanel                        from '../components/KBHealthPanel';
import KBIngestionPanel                     from '../components/KBIngestionPanel';
import AlertFeedPanel, { AlertTicker }      from '../components/AlertFeed';
import KnowledgeGapDetector                 from '../components/KnowledgeGapDetector';
import CrisisPlaybook                       from '../components/CrisisPlaybook';
import AlternativePathSuggestions           from '../components/AlternativePathSuggestions';
import { api, MOCK_GRAPH, MOCK_DASHBOARD }  from '../services/api';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:       '#060912',
  panel:    '#0b0f1a',
  surface:  '#111827',
  surfaceUp:'#161d2e',
  border:   '#1e2a3a',
  borderMid:'#2a3a52',
  amber:    '#f59e0b',
  amberSub: 'rgba(245,158,11,0.10)',
  amberHov: 'rgba(245,158,11,0.16)',
  text:     '#e2e8f0',
  textMid:  '#8fa3be',
  textDim:  '#3d5068',
  green:    '#10b981',
  red:      '#ef4444',
  blue:     '#3b82f6',
  purple:   '#8b5cf6',
  pink:     '#ec4899',
  mono:     '"IBM Plex Mono", monospace',
  sans:     '"Syne", sans-serif',
};

// ─── SVG icon library — all inline, 16×16 viewBox ────────────────────────────
const Icon = ({ name, size = 14, color = 'currentColor', strokeWidth = 1.6 }) => {
  const s = { width: size, height: size, display: 'block', flexShrink: 0 };
  const props = { viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', style: s };

  const paths = {
    // Tab icons
    query:    <svg {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h8M8 14h5"/></svg>,
    simulate: <svg {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    suggest:  <svg {...props}><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
    alerts:   <svg {...props}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    gaps:     <svg {...props}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6" strokeDasharray="2 1"/></svg>,
    health:   <svg {...props}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
    ingest:   <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    risk:     <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9.5 12l2 2 4-4"/></svg>,
    // Header icons
    logo:     <svg {...props} strokeWidth={2}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
    graph:    <svg {...props}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 4.51l-6.82 3.98"/></svg>,
    check:    <svg {...props}><polyline points="20 6 9 17 4 12"/></svg>,
    close:    <svg {...props} strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  };
  return paths[name] || null;
};

// ─── Tab groups ───────────────────────────────────────────────────────────────
const TAB_GROUPS = [
  {
    label: 'Intelligence',
    tabs: [
      { id: 'QUERY',    label: 'AI Query',  icon: 'query',    desc: 'Ask the knowledge base' },
      { id: 'SIMULATE', label: 'Simulate',  icon: 'simulate', desc: 'Run disruption scenarios' },
      { id: 'SUGGEST',  label: 'Suggest',   icon: 'suggest',  desc: 'Alternative supply paths' },
    ],
  },
  {
    label: 'Monitoring',
    tabs: [
      { id: 'ALERTS',  label: 'Alerts',     icon: 'alerts',  desc: 'Live alert feed',           badge: true },
      { id: 'GAPS',    label: 'KB Gaps',    icon: 'gaps',    desc: 'Knowledge coverage' },
      { id: 'HEALTH',  label: 'KB Health',  icon: 'health',  desc: 'Database metrics' },
      { id: 'INGEST',  label: 'Ingest',     icon: 'ingest',  desc: 'Upload documents' },
      { id: 'RISK',    label: 'Risk',       icon: 'risk',    desc: 'Financial exposure' },
    ],
  },
];

const ALL_TABS = TAB_GROUPS.flatMap(g => g.tabs);

// ─── Reusable components ──────────────────────────────────────────────────────

/** Metric column in the header */
const HeaderStat = ({ value, label, color }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '0 16px', borderLeft: `1px solid ${T.border}`, gap: 1,
  }}>
    <span style={{ fontSize: 16, fontWeight: 700, color, fontFamily: T.mono, lineHeight: 1 }}>{value}</span>
    <span style={{ fontSize: 8, color: T.textDim, fontFamily: T.mono, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</span>
  </div>
);

/** Individual tab button with SVG icon */
const TabBtn = ({ tab, isActive, onClick, badge, dotColor }) => {
  const [hov, setHov] = useState(false);
  const iconColor = isActive ? T.amber : hov ? T.textMid : T.textDim;

  return (
    <button
      onClick={onClick}
      title={tab.desc}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', flex: 1,
        padding: '10px 6px 8px',
        background: isActive ? T.amberSub : hov ? 'rgba(255,255,255,0.025)' : 'transparent',
        border: 'none',
        borderBottom: `2px solid ${isActive ? T.amber : 'transparent'}`,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        transition: 'background 0.12s',
        outline: 'none',
      }}
    >
      {/* SVG icon */}
      <Icon name={tab.icon} size={13} color={iconColor} strokeWidth={isActive ? 2 : 1.6} />

      {/* Label */}
      <span style={{
        fontSize: 8.5, fontFamily: T.mono, fontWeight: 600,
        color: isActive ? T.amber : hov ? T.textMid : T.textDim,
        letterSpacing: '0.04em', whiteSpace: 'nowrap',
        transition: 'color 0.12s',
      }}>
        {tab.label}
      </span>

      {/* Unread badge */}
      {badge > 0 && (
        <div style={{
          position: 'absolute', top: 5, right: 4,
          minWidth: 15, height: 15, borderRadius: 8,
          background: T.red, border: `1.5px solid ${T.panel}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 7.5, color: '#fff', fontFamily: T.mono, fontWeight: 700,
          padding: '0 3px',
        }}>
          {badge > 9 ? '9+' : badge}
        </div>
      )}

      {/* Applied dot */}
      {dotColor && (
        <div style={{
          position: 'absolute', top: 6, right: 5,
          width: 7, height: 7, borderRadius: '50%',
          background: dotColor, boxShadow: `0 0 6px ${dotColor}`,
        }} />
      )}
    </button>
  );
};

/** Breadcrumb bar beneath the tabs */
const Breadcrumb = ({ tab }) => (
  <div style={{
    height: 30,
    padding: '0 16px',
    borderBottom: `1px solid ${T.border}`,
    display: 'flex', alignItems: 'center', gap: 10,
    background: T.amberSub, flexShrink: 0,
  }}>
    <Icon name={tab.icon} size={11} color={T.amber} strokeWidth={2} />
    <span style={{ fontSize: 10, color: T.amber, fontFamily: T.mono, fontWeight: 700, letterSpacing: '0.1em' }}>
      {tab.label.toUpperCase()}
    </span>
    <span style={{ fontSize: 9, color: T.textDim, fontFamily: T.mono }}>—</span>
    <span style={{ fontSize: 9, color: T.textDim, fontFamily: T.mono }}>{tab.desc}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [graphData,         setGraphData]         = useState(MOCK_GRAPH);
  const [dashboard,         setDashboard]         = useState(MOCK_DASHBOARD);
  const [kbHealth,          setKbHealth]          = useState(null);
  const [ingestedDocs,      setIngestedDocs]      = useState([]);
  const [highlightedNodes,  setHighlightedNodes]  = useState([]);
  const [selectedNode,      setSelectedNode]      = useState(null);
  const [activeTab,         setActiveTab]         = useState('QUERY');
  const [simLoading,        setSimLoading]        = useState(false);
  const [notification,      setNotification]      = useState(null);
  const [lastSimEvent,      setLastSimEvent]      = useState(null);
  const [time,              setTime]              = useState(new Date());
  const [unreadAlerts,      setUnreadAlerts]      = useState(5);
  const [appliedSuggestion, setAppliedSuggestion] = useState(null);
  const [suggestionEdges,   setSuggestionEdges]   = useState([]);

  useEffect(() => {
    api.getGraph().then(setGraphData).catch(() => {});
    api.getDashboard().then(setDashboard).catch(() => {});
    api.getKBHealth().then(setKbHealth).catch(() => {});
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (activeTab === 'ALERTS') setUnreadAlerts(0); }, [activeTab]);
  useEffect(() => {
    if (lastSimEvent && lastSimEvent !== 'reset') setUnreadAlerts(n => n + 2);
  }, [lastSimEvent]);

  const showNotification = useCallback((msg, severity = 'info') => {
    setNotification({ msg, severity });
    setTimeout(() => setNotification(null), 5500);
  }, []);

  const handleSimulate = useCallback(async (eventId) => {
    setSimLoading(true);
    try {
      const result = await api.simulateEvent(eventId);
      if (result.nodes)           setGraphData({ nodes: result.nodes, edges: result.edges });
      if (result.dashboard)       setDashboard(result.dashboard);
      if (result.affectedNodeIds) setHighlightedNodes(result.affectedNodeIds);
      if (result.message)         showNotification(result.message, eventId === 'reset' ? 'success' : 'warning');
      setLastSimEvent(eventId === 'reset' ? null : eventId);
      if (eventId !== 'reset') setTimeout(() => setActiveTab('SUGGEST'), 800);
      return result;
    } catch { showNotification('Simulation failed', 'error'); }
    finally   { setSimLoading(false); }
  }, [showNotification]);

  const handleIngestionComplete = useCallback(async (newDoc) => {
    const h = await api.getKBHealth().catch(() => null);
    if (h) setKbHealth(h);
    if (newDoc) setIngestedDocs(prev => [newDoc, ...prev]);
    showNotification('Document indexed — knowledge base updated', 'success');
  }, [showNotification]);

  const handleApplySuggestion = useCallback((suggestion) => {
    if (suggestion.newEdges?.length > 0) {
      setGraphData(prev => ({
        nodes: prev.nodes,
        edges: [
          ...prev.edges.filter(e => !suggestion.removedEdges?.includes(e.id)),
          ...suggestion.newEdges,
        ],
      }));
    }
    setDashboard(prev => ({ ...prev, riskScore: suggestion.newRiskScore, lastUpdated: new Date().toISOString() }));
    setHighlightedNodes(suggestion.affectedNodes || []);
    setAppliedSuggestion(suggestion);
    setSuggestionEdges(suggestion.newEdges || []);
    showNotification(`Pattern applied: ${suggestion.title}. Risk: ${suggestion.newRiskScore}/100.`, 'success');
  }, [showNotification]);

  const handleUndoSuggestion = useCallback(() => {
    api.getGraph().then(setGraphData).catch(() => {});
    api.getDashboard().then(setDashboard).catch(() => {});
    setHighlightedNodes([]);
    setAppliedSuggestion(null);
    setSuggestionEdges([]);
    showNotification('Pattern undone. Graph restored.', 'info');
  }, [showNotification]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const riskScore  = dashboard?.riskScore || 0;
  const riskColor  = riskScore < 30 ? T.green : riskScore < 60 ? '#eab308' : T.red;
  const vectors    = kbHealth?.totalVectors?.toLocaleString?.() || '877';
  const docs       = kbHealth?.totalDocuments || 7;
  const activeTabObj = ALL_TABS.find(t => t.id === activeTab);

  const notifColor = { success: T.green, warning: T.amber, error: T.red, info: T.blue };

  const tickerAlert = lastSimEvent
    ? {
        type:   lastSimEvent === 'reset' ? 'resolved' : 'critical',
        title:  lastSimEvent === 'reset' ? 'All Clear' : 'Disruption Active',
        detail: lastSimEvent === 'reset'
          ? 'All nodes restored to nominal. Monitoring resumed.'
          : `Disruption active: ${lastSimEvent.replace(/_/g, ' ')}. KB analysis in progress.`,
        ts: Date.now(),
      }
    : {
        type: 'info', title: 'KB Monitoring Active',
        detail: `All 17 nodes nominal. ${vectors} vectors indexed. Last scan: 2 min ago.`,
        ts: Date.now() - 120000,
      };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: T.bg, overflow: 'hidden',
      fontFamily: T.sans,
    }}>

      {/* ══════════════════════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════════════════════ */}
      <header style={{
        height: 58,
        background: T.panel,
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center',
        padding: '0 20px', flexShrink: 0,
        gap: 0,
      }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, paddingRight: 20 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 22px rgba(245,158,11,0.30)',
            flexShrink: 0,
          }}>
            <Icon name="logo" size={16} color="#000" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.text, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Supply Chain Resilience
            </div>
            <div style={{ fontSize: 8, color: T.amber, fontFamily: T.mono, letterSpacing: '0.2em', fontWeight: 600, lineHeight: 1 }}>
              AI KNOWLEDGE BASE SYSTEM
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 34, background: T.border, marginRight: 20, flexShrink: 0 }} />

        {/* KB stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {[
            { dot: T.blue,   val: vectors, unit: 'vectors' },
            { dot: T.purple, val: docs,    unit: 'docs'    },
          ].map(({ dot, val, unit }) => (
            <div key={unit} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot, boxShadow: `0 0 7px ${dot}` }} />
              <span style={{ fontSize: 11, fontFamily: T.mono, color: T.textMid }}>
                <span style={{ color: dot, fontWeight: 700 }}>{val}</span>
                <span style={{ color: T.textDim }}> {unit}</span>
              </span>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Node type stats */}
        <HeaderStat value={4} label="Suppliers"  color={T.blue}   />
        <HeaderStat value={5} label="Components" color={T.purple} />
        <HeaderStat value={3} label="Products"   color={T.amber}  />
        <HeaderStat value={3} label="Ports"      color={T.pink}   />

        {/* Risk pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          margin: '0 16px',
          padding: '7px 14px',
          background: `${riskColor}14`,
          border: `1px solid ${riskColor}28`,
          borderRadius: 8,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: riskColor, boxShadow: `0 0 9px ${riskColor}` }} />
          <span style={{ fontSize: 11, fontFamily: T.mono, color: T.textMid, whiteSpace: 'nowrap' }}>
            Risk&nbsp;
            <span style={{ color: riskColor, fontWeight: 700, fontSize: 14 }}>{riskScore}</span>
            <span style={{ color: T.textDim }}>/100</span>
          </span>
        </div>

        {/* Clock */}
        <div style={{ padding: '0 0 0 16px', borderLeft: `1px solid ${T.border}`, textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.textDim, fontFamily: T.mono, lineHeight: 1.2 }}>
            {time.toLocaleTimeString()}
          </div>
          <div style={{ fontSize: 8, color: T.textDim, fontFamily: T.mono, opacity: 0.5 }}>UTC+0</div>
        </div>

        {/* Live badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginLeft: 16, padding: '6px 12px',
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 6,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: T.green, boxShadow: `0 0 7px ${T.green}`,
            animation: 'pulse-amber 2s infinite',
          }} />
          <span style={{ fontSize: 9, color: T.green, fontFamily: T.mono, fontWeight: 700, letterSpacing: '0.1em' }}>LIVE</span>
        </div>
      </header>

      {/* Alert ticker */}
      <AlertTicker alerts={[tickerAlert]} onOpenFeed={() => setActiveTab('ALERTS')} />

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Graph area ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, position: 'relative', background: T.bg }}>
          <GraphView
            graphData={graphData}
            highlightedNodes={highlightedNodes}
            onNodeClick={node => setSelectedNode(node)}
          />

          {/* Graph overlay badge */}
          <div style={{
            position: 'absolute', top: 16, left: 16, zIndex: 10,
            background: 'rgba(11,15,26,0.92)',
            border: `1px solid ${T.border}`,
            borderRadius: 9, padding: '8px 14px',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', gap: 9,
          }}>
            <Icon name="graph" size={12} color={T.amber} strokeWidth={1.8} />
            <span style={{ fontSize: 10, color: T.textMid, fontFamily: T.mono, letterSpacing: '0.1em' }}>
              KNOWLEDGE GRAPH
            </span>
            {appliedSuggestion && (
              <>
                <div style={{ width: 1, height: 14, background: T.border }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, boxShadow: `0 0 6px ${T.green}` }} />
                <span style={{ fontSize: 9, color: T.green, fontFamily: T.mono, letterSpacing: '0.08em' }}>
                  PATTERN APPLIED
                </span>
              </>
            )}
          </div>

          <CrisisPlaybook riskScore={riskScore} lastSimEvent={lastSimEvent} />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            RIGHT PANEL
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{
          width: 368,
          background: T.panel,
          borderLeft: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column',
          flexShrink: 0,
        }}>

          {/* ── Tab groups ─────────────────────────────────────────────── */}
          <div style={{ flexShrink: 0 }}>
            {TAB_GROUPS.map((group, gi) => (
              <div key={group.label}>

                {/* Group header label */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '5px 14px',
                  background: '#080c14',
                  borderBottom: `1px solid ${T.border}`,
                }}>
                  <span style={{
                    fontSize: 7.5, fontFamily: T.mono, fontWeight: 700,
                    color: T.textDim, letterSpacing: '0.2em', textTransform: 'uppercase',
                  }}>
                    {group.label}
                  </span>
                  <div style={{ flex: 1, height: 1, background: T.border }} />
                </div>

                {/* Tab row */}
                <div style={{ display: 'flex' }}>
                  {group.tabs.map(tab => (
                    <TabBtn
                      key={tab.id}
                      tab={tab}
                      isActive={activeTab === tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      badge={tab.badge && unreadAlerts > 0 ? unreadAlerts : 0}
                      dotColor={tab.id === 'SUGGEST' && appliedSuggestion ? T.green : null}
                    />
                  ))}
                </div>

                {/* Divider between groups */}
                {gi < TAB_GROUPS.length - 1 && (
                  <div style={{ height: 1, background: T.border }} />
                )}
              </div>
            ))}
            <div style={{ height: 1, background: T.border }} />
          </div>

          {/* ── Breadcrumb ─────────────────────────────────────────────── */}
          {activeTabObj && <Breadcrumb tab={activeTabObj} />}

          {/* ── Panel content ──────────────────────────────────────────── */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'QUERY'    && <QueryPanel onHighlightNodes={setHighlightedNodes} />}
            {activeTab === 'SIMULATE' && <SimulationPanel onSimulate={handleSimulate} loading={simLoading} />}
            {activeTab === 'SUGGEST'  && (
              <AlternativePathSuggestions
                lastSimEvent={lastSimEvent}
                riskScore={riskScore}
                onApplySuggestion={handleApplySuggestion}
                onUndoSuggestion={handleUndoSuggestion}
              />
            )}
            {activeTab === 'ALERTS'  && <AlertFeedPanel lastSimEvent={lastSimEvent} />}
            {activeTab === 'GAPS'    && <KnowledgeGapDetector extraDocs={ingestedDocs} onNavigateToIngest={() => setActiveTab('INGEST')} />}
            {activeTab === 'HEALTH'  && <KBHealthPanel />}
            {activeTab === 'INGEST'  && <KBIngestionPanel onIngestionComplete={handleIngestionComplete} />}
            {activeTab === 'RISK'    && <RiskDashboard data={dashboard} loading={simLoading} />}
          </div>
        </div>
      </div>

      {/* ── Status bar ────────────────────────────────────────────────────────── */}
      <div style={{
        height: 26,
        background: '#040709',
        borderTop: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 16, flexShrink: 0,
      }}>
        <span style={{ fontSize: 9, color: T.textDim, fontFamily: T.mono, opacity: 0.5 }}>
          SCR · AI Knowledge Base · v6.0
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: T.textDim, fontFamily: T.mono, opacity: 0.5 }}>
          ChromaDB · LangChain · GPT-4.1 · ReactFlow
        </span>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.green, boxShadow: `0 0 5px ${T.green}` }} />
        <span style={{ fontSize: 9, color: T.green, fontFamily: T.mono }}>ALL SYSTEMS NOMINAL</span>
      </div>

      {/* ── Toast notification ─────────────────────────────────────────────────── */}
      {notification && (
        <div style={{
          position: 'fixed', bottom: 36, left: '50%', transform: 'translateX(-50%)',
          background: T.panel,
          border: `1px solid ${notifColor[notification.severity]}30`,
          borderLeft: `3px solid ${notifColor[notification.severity]}`,
          borderRadius: 10, padding: '13px 18px 13px 16px',
          boxShadow: `0 10px 40px rgba(0,0,0,0.55), 0 0 28px ${notifColor[notification.severity]}12`,
          maxWidth: 480, zIndex: 2000,
          animation: 'fadeSlideIn 0.22s ease',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          {/* Severity icon */}
          <div style={{ marginTop: 1, flexShrink: 0 }}>
            <Icon
              name={notification.severity === 'success' ? 'check' : 'alerts'}
              size={14}
              color={notifColor[notification.severity]}
              strokeWidth={2}
            />
          </div>
          <span style={{ fontSize: 12, color: '#cbd5e1', fontFamily: T.sans, lineHeight: 1.55, flex: 1 }}>
            {notification.msg}
          </span>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: 'none', border: 'none',
              color: T.textDim, cursor: 'pointer',
              padding: '1px 0 0 6px', flexShrink: 0,
              display: 'flex', alignItems: 'center',
              opacity: 0.7,
            }}
          >
            <Icon name="close" size={14} color={T.textMid} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* ── Node details drawer ────────────────────────────────────────────────── */}
      {selectedNode && <NodeDetails node={selectedNode} onClose={() => setSelectedNode(null)} />}
    </div>
  );
}