import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

// ─── MOCK SUGGESTIONS PER EVENT ───────────────────────────────────────────────
const MOCK_SUGGESTIONS = {
  storm_port: [
    {
      id: 'sug-1',
      rank: 1,
      type: 'REROUTE',
      title: 'Reroute Foxconn & TSMC via Port of Busan',
      summary: 'Shift all APAC shipments from Shanghai to Busan. Samsung SLA §8.2 guarantees available capacity.',
      brokenPath:  'Foxconn → port-1 (Shanghai) → fact-1',
      newPath:     'Foxconn → port-2 (Busan) → fact-1',
      newEdges: [
        { id: 'sug-e-1', source: 'sup-1', target: 'port-2', style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '6 3' }, animated: true, label: 'NEW ROUTE' },
        { id: 'sug-e-2', source: 'sup-3', target: 'port-2', style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '6 3' }, animated: true, label: 'NEW ROUTE' },
      ],
      removedEdges: ['e-s1-po1', 'e-s3-po1'],
      timeDelta:   +6,
      costDelta:   -2_100_000,
      newRiskScore: 41,
      riskReduction: 37,
      kbSource:    'Samsung_SLA_Components_Q1.pdf',
      kbClause:    '§8.2 — Busan port guaranteed capacity: 18,000 TEU/week',
      confidence:  0.91,
      affectedNodes: ['sup-1', 'sup-3', 'port-2'],
      pros: ['Maintains sea freight cost', 'No supplier change needed', 'SLA-backed capacity'],
      cons: ['Adds 6 transit days', 'Busan capacity may tighten under peak load'],
    },
    {
      id: 'sug-2',
      rank: 2,
      type: 'BACKUP_SUPPLIER',
      title: 'Activate Vietnam Electronics as Display Panel backup',
      summary: 'Qualify Vietnam Electronics (pre-identified) as secondary supplier for comp-1. Eliminates Foxconn SPOF.',
      brokenPath:  'sup-1 (Foxconn) → comp-1 → prod-1, prod-2',
      newPath:     'viet-sup-1 (Vietnam Electronics) → comp-1 → prod-1, prod-2',
      newEdges: [
        { id: 'sug-e-3', source: 'sup-4', target: 'comp-1', style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '6 3' }, animated: true, label: 'BACKUP' },
      ],
      removedEdges: [],
      timeDelta:   +12,
      costDelta:   -4_300_000,
      newRiskScore: 33,
      riskReduction: 45,
      kbSource:    'Foxconn_Master_Agreement_2024.pdf',
      kbClause:    '§9.1 — Approved backup suppliers: Vietnam Electronics (pre-qualified)',
      confidence:  0.78,
      affectedNodes: ['comp-1', 'prod-1', 'prod-2'],
      pros: ['Highest long-term savings', 'Eliminates Display Panel SPOF', 'Pre-qualified in contract'],
      cons: ['12-day onboarding lead time', 'Higher unit cost +8% vs Foxconn'],
    },
    {
      id: 'sug-3',
      rank: 3,
      type: 'AIR_FREIGHT',
      title: 'Emergency air freight for Processor SoC only',
      summary: 'Air freight TSMC Processor SoC to Shenzhen Plant A. Prevents prod-1 and prod-2 production halt. Other components via Busan.',
      brokenPath:  'sup-3 (TSMC) → port-1 → fact-1',
      newPath:     'sup-3 (TSMC) → ✈ air freight → fact-1 (14 days saved)',
      newEdges: [
        { id: 'sug-e-4', source: 'sup-3', target: 'fact-1', style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '4 2' }, animated: true, label: '✈ AIR' },
      ],
      removedEdges: [],
      timeDelta:   -14,
      costDelta:   +340_000,
      newRiskScore: 52,
      riskReduction: 26,
      kbSource:    'TSMC_Supply_Agreement_Confidential.pdf',
      kbClause:    '§6.3 — Emergency air freight clause activated above Category 2 disruption',
      confidence:  0.88,
      affectedNodes: ['sup-3', 'comp-4', 'fact-1'],
      pros: ['Saves 14 days on critical SoC', 'Protects Smartphone X1 launch schedule'],
      cons: ['Adds $340K freight cost', 'Only covers Processor SoC — Display Panel still delayed'],
    },
  ],

  port_strike: [
    {
      id: 'sug-4',
      rank: 1,
      type: 'REROUTE',
      title: 'Reroute Samsung Memory Chips via Port of Osaka',
      summary: 'Temporary rerouting of Memory Chip shipments from Busan to Osaka. Lloyd report confirms capacity available.',
      brokenPath:  'sup-2 (Samsung) → port-2 (Busan) → fact-1',
      newPath:     'sup-2 (Samsung) → port-3 (Osaka) → fact-2 → fact-1',
      newEdges: [
        { id: 'sug-e-5', source: 'sup-2', target: 'port-3', style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '6 3' }, animated: true, label: 'NEW ROUTE' },
      ],
      removedEdges: ['e-s2-po2'],
      timeDelta:   +4,
      costDelta:   -1_800_000,
      newRiskScore: 38,
      riskReduction: 27,
      kbSource:    'Lloyd_Shipping_Q1_Risk_Report.pdf',
      kbClause:    'Port of Osaka: 9M TEU/yr capacity — available contingency routing',
      confidence:  0.86,
      affectedNodes: ['sup-2', 'port-3', 'comp-3'],
      pros: ['Only 4 extra transit days', 'Protects all 3 product lines', 'No supplier change'],
      cons: ['Osaka port adds inland trucking cost', 'Requires Samsung logistics approval'],
    },
    {
      id: 'sug-5',
      rank: 2,
      type: 'SPOT_PURCHASE',
      title: 'Emergency spot purchase — Micron US Memory Chips',
      summary: 'Bypass Samsung Korea entirely. Purchase Memory Chips on spot market from Micron US. Ships from west coast port.',
      brokenPath:  'sup-2 (Samsung Korea) → comp-3 (Memory Chip)',
      newPath:     'Micron US (spot) → comp-3 → all products',
      newEdges: [],
      removedEdges: [],
      timeDelta:   +8,
      costDelta:   +620_000,
      newRiskScore: 44,
      riskReduction: 21,
      kbSource:    null,
      kbClause:    'No contract — spot market purchase. Add Micron SLA to KB to improve confidence.',
      confidence:  0.61,
      affectedNodes: ['comp-3'],
      pros: ['Eliminates Samsung dependency entirely', 'Qualifies new supplier relationship'],
      cons: ['8 days longer', '+$620K premium on spot market', 'No contractual SLA'],
    },
  ],

  supplier_delay: [
    {
      id: 'sug-6',
      rank: 1,
      type: 'AIR_FREIGHT',
      title: 'Air freight Processor SoC from TSMC Kaohsiung facility',
      summary: 'TSMC has a secondary facility in Kaohsiung. Air freight from there bypasses equipment failure at primary plant.',
      brokenPath:  'sup-3 (TSMC main) → comp-4 → products',
      newPath:     'sup-3 (TSMC Kaohsiung) → ✈ → comp-4 → products',
      newEdges: [
        { id: 'sug-e-6', source: 'sup-3', target: 'comp-4', style: { stroke: '#f59e0b', strokeWidth: 2 }, animated: true, label: '✈ KHH' },
      ],
      removedEdges: [],
      timeDelta:   -10,
      costDelta:   +280_000,
      newRiskScore: 29,
      riskReduction: 26,
      kbSource:    'TSMC_Supply_Agreement_Confidential.pdf',
      kbClause:    '§4.2 — Kaohsiung facility as contingency production site',
      confidence:  0.84,
      affectedNodes: ['sup-3', 'comp-4'],
      pros: ['Saves 10 days', 'Same supplier — no requalification needed', 'Contract-backed'],
      cons: ['Kaohsiung capacity: 60% of primary — may not cover full volume'],
    },
  ],

  shipping_disruption: [
    {
      id: 'sug-7',
      rank: 1,
      type: 'REROUTE',
      title: 'Cape of Good Hope routing for all EMEA shipments',
      summary: 'Reroute all Europe-bound shipments via Cape of Good Hope. Adds 14 days but avoids Suez entirely.',
      brokenPath:  'All ports → Suez Canal → EMEA',
      newPath:     'All ports → Cape of Good Hope → EMEA (+14 days)',
      newEdges: [],
      removedEdges: [],
      timeDelta:   +14,
      costDelta:   -8_200_000,
      newRiskScore: 58,
      riskReduction: 38,
      kbSource:    'Lloyd_Shipping_Q1_Risk_Report.pdf',
      kbClause:    'Section 4 — Cape routing contingency: standard practice during Suez closures',
      confidence:  0.93,
      affectedNodes: ['port-1', 'port-2', 'port-3'],
      pros: ['Proven contingency route', 'No supplier changes needed', 'Largest financial saving'],
      cons: ['14 extra transit days for all shipments', 'Higher fuel cost per vessel'],
    },
  ],

  default: [],
};

// ─── TYPE CONFIG ──────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  REROUTE:          { color: '#10b981', icon: '🔀', label: 'REROUTE'          },
  BACKUP_SUPPLIER:  { color: '#3b82f6', icon: '🏭', label: 'BACKUP SUPPLIER'  },
  AIR_FREIGHT:      { color: '#f59e0b', icon: '✈',  label: 'AIR FREIGHT'      },
  SPOT_PURCHASE:    { color: '#8b5cf6', icon: '🛒', label: 'SPOT PURCHASE'    },
};

const fmt$ = n => {
  const abs = Math.abs(n);
  const str = abs >= 1_000_000 ? `$${(abs / 1_000_000).toFixed(1)}M` : `$${(abs / 1_000).toFixed(0)}K`;
  return n < 0 ? `save ${str}` : `+${str} cost`;
};

const fmtDays = n => n === 0 ? 'no delay change' : n > 0 ? `+${n} days` : `${n} days (faster)`;

// ─── RANK BADGE ───────────────────────────────────────────────────────────────
function RankBadge({ rank }) {
  const colors = { 1: '#f59e0b', 2: '#94a3b8', 3: '#cd7c45' };
  const labels = { 1: '★ BEST', 2: '◆ ALT', 3: '◇ ALT' };
  return (
    <div style={{
      padding: '2px 7px', borderRadius: 4,
      background: `${colors[rank] || '#475569'}18`,
      border: `1px solid ${colors[rank] || '#475569'}35`,
      fontSize: 8, color: colors[rank] || '#475569',
      fontFamily: 'IBM Plex Mono', fontWeight: 700, letterSpacing: '0.08em',
    }}>
      {labels[rank] || `#${rank}`}
    </div>
  );
}

// ─── PATH DISPLAY ─────────────────────────────────────────────────────────────
function PathDisplay({ label, path, color, strikethrough }) {
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{ fontSize: 8, color: '#475569', fontFamily: 'IBM Plex Mono', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
      <div style={{
        fontSize: 10, color, fontFamily: 'IBM Plex Mono',
        padding: '4px 8px', background: `${color}08`,
        border: `1px solid ${color}20`, borderRadius: 5,
        textDecoration: strikethrough ? 'line-through' : 'none',
        opacity: strikethrough ? 0.6 : 1,
      }}>
        {path}
      </div>
    </div>
  );
}

// ─── METRIC CHIP ─────────────────────────────────────────────────────────────
function MetricChip({ label, value, positive }) {
  const color = positive === null ? '#64748b' : positive ? '#10b981' : '#ef4444';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '6px 8px', background: `${color}08`,
      border: `1px solid ${color}20`, borderRadius: 6, minWidth: 70,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'IBM Plex Mono' }}>{value}</div>
      <div style={{ fontSize: 8, color: '#475569', fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', textAlign: 'center' }}>{label}</div>
    </div>
  );
}

// ─── SUGGESTION CARD ─────────────────────────────────────────────────────────
function SuggestionCard({ suggestion, onApply, isApplied, isApplying }) {
  const [expanded, setExpanded] = useState(suggestion.rank === 1);
  const cfg = TYPE_CONFIG[suggestion.type] || { color: '#64748b', icon: '◆', label: suggestion.type };

  const costPositive = suggestion.costDelta < 0; // saving money is positive
  const timePositive = suggestion.timeDelta < 0; // less time is positive
  const confidenceColor = suggestion.confidence >= 0.8 ? '#10b981' : suggestion.confidence >= 0.65 ? '#eab308' : '#64748b';

  return (
    <div style={{
      border: `1px solid ${isApplied ? '#10b981' : cfg.color}30`,
      borderLeft: `3px solid ${isApplied ? '#10b981' : cfg.color}`,
      borderRadius: 8, marginBottom: 10, overflow: 'hidden',
      background: isApplied ? 'rgba(16,185,129,0.05)' : `${cfg.color}05`,
      transition: 'all 0.3s',
      boxShadow: isApplied ? '0 0 16px rgba(16,185,129,0.15)' : 'none',
    }}>
      {/* ── Card Header ── */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10 }}
      >
        {/* Type icon */}
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        }}>
          {isApplied ? '✓' : cfg.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badges row */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
            <RankBadge rank={suggestion.rank} />
            <span style={{
              fontSize: 8, padding: '1px 6px', borderRadius: 3,
              background: `${cfg.color}15`, color: cfg.color,
              border: `1px solid ${cfg.color}25`, fontFamily: 'IBM Plex Mono', fontWeight: 600,
            }}>{cfg.label}</span>
            {isApplied && (
              <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 3, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontFamily: 'IBM Plex Mono', fontWeight: 700 }}>
                ✓ APPLIED
              </span>
            )}
          </div>

          {/* Title */}
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', fontFamily: 'Syne', lineHeight: 1.3, marginBottom: 4 }}>
            {suggestion.title}
          </div>

          {/* Summary */}
          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Syne', lineHeight: 1.5 }}>
            {suggestion.summary}
          </div>
        </div>

        {/* Risk reduction badge */}
        <div style={{
          flexShrink: 0, textAlign: 'center', padding: '6px 8px',
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 6,
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981', fontFamily: 'IBM Plex Mono', lineHeight: 1 }}>
            -{suggestion.riskReduction}
          </div>
          <div style={{ fontSize: 7, color: '#475569', fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em' }}>RISK PTS</div>
        </div>
      </div>

      {/* ── Expanded Content ── */}
      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10, animation: 'fadeSlideIn 0.2s ease' }}>

          {/* Metrics row */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <MetricChip label="TIME DELTA"   value={fmtDays(suggestion.timeDelta)}         positive={timePositive} />
            <MetricChip label="COST IMPACT"  value={fmt$(suggestion.costDelta)}            positive={costPositive} />
            <MetricChip label="NEW RISK"     value={`${suggestion.newRiskScore}/100`}      positive={true} />
            <MetricChip label="CONFIDENCE"   value={`${Math.round(suggestion.confidence * 100)}%`} positive={suggestion.confidence >= 0.75 ? true : null} />
          </div>

          {/* Path comparison */}
          <PathDisplay label="CURRENT (BROKEN) PATH" path={suggestion.brokenPath} color="#ef4444" strikethrough={true} />
          <PathDisplay label="SUGGESTED NEW PATH"    path={suggestion.newPath}    color="#10b981" strikethrough={false} />

          {/* KB source */}
          {suggestion.kbSource ? (
            <div style={{ display: 'flex', gap: 8, padding: '7px 10px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 11 }}>📋</span>
              <div>
                <div style={{ fontSize: 9, color: '#3b82f6', fontFamily: 'IBM Plex Mono', fontWeight: 600, marginBottom: 2 }}>{suggestion.kbSource}</div>
                <div style={{ fontSize: 9, color: '#64748b', fontFamily: 'Syne' }}>{suggestion.kbClause}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, padding: '7px 10px', background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)', borderRadius: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 11 }}>⚠️</span>
              <div style={{ fontSize: 9, color: '#eab308', fontFamily: 'Syne' }}>{suggestion.kbClause}</div>
            </div>
          )}

          {/* Pros / cons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 8, color: '#10b981', fontFamily: 'IBM Plex Mono', letterSpacing: '0.08em', marginBottom: 5 }}>PROS</div>
              {suggestion.pros.map((p, i) => (
                <div key={i} style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'Syne', marginBottom: 3, display: 'flex', gap: 5 }}>
                  <span style={{ color: '#10b981' }}>✓</span> {p}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 8, color: '#ef4444', fontFamily: 'IBM Plex Mono', letterSpacing: '0.08em', marginBottom: 5 }}>CONS</div>
              {suggestion.cons.map((c, i) => (
                <div key={i} style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'Syne', marginBottom: 3, display: 'flex', gap: 5 }}>
                  <span style={{ color: '#ef4444' }}>✗</span> {c}
                </div>
              ))}
            </div>
          </div>

          {/* Apply button */}
          {!isApplied ? (
            <button
              onClick={() => onApply(suggestion)}
              disabled={isApplying}
              style={{
                width: '100%', padding: '10px',
                background: isApplying ? 'rgba(16,185,129,0.06)' : `linear-gradient(135deg, ${cfg.color}22, rgba(13,17,23,0.9))`,
                border: `1.5px solid ${cfg.color}`,
                borderRadius: 7, cursor: isApplying ? 'not-allowed' : 'pointer',
                color: cfg.color, fontFamily: 'IBM Plex Mono',
                fontWeight: 700, fontSize: 11, letterSpacing: '0.1em',
                transition: 'all 0.25s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onMouseEnter={e => { if (!isApplying) e.currentTarget.style.boxShadow = `0 0 20px ${cfg.color}35`; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              {isApplying ? (
                <>
                  <div style={{ width: 10, height: 10, border: '2px solid transparent', borderTopColor: cfg.color, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  APPLYING PATTERN CHANGE...
                </>
              ) : (
                <>
                  {cfg.icon} APPLY THIS SUGGESTION — REDRAW GRAPH
                </>
              )}
            </button>
          ) : (
            <div style={{
              width: '100%', padding: '10px', borderRadius: 7,
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)',
              color: '#10b981', fontFamily: 'IBM Plex Mono', fontWeight: 700,
              fontSize: 11, letterSpacing: '0.1em', textAlign: 'center',
            }}>
              ✓ PATTERN APPLIED — GRAPH UPDATED
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── APPLIED CONFIRMATION BANNER ─────────────────────────────────────────────
function AppliedBanner({ suggestion, onUndo }) {
  if (!suggestion) return null;
  return (
    <div style={{
      margin: '0 12px 10px', padding: '10px 12px',
      background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)',
      borderRadius: 8, animation: 'fadeSlideIn 0.4s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: '#10b981', fontFamily: 'IBM Plex Mono', fontWeight: 700, letterSpacing: '0.1em' }}>
          ✓ PATTERN CHANGE APPLIED
        </span>
        <button onClick={onUndo} style={{
          background: 'none', border: '1px solid #1e2535', borderRadius: 4,
          color: '#475569', cursor: 'pointer', fontSize: 8,
          fontFamily: 'IBM Plex Mono', padding: '2px 6px', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2535'; e.currentTarget.style.color = '#475569'; }}
        >
          ↩ UNDO
        </button>
      </div>
      <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Syne', lineHeight: 1.5 }}>
        <strong style={{ color: '#e2e8f0' }}>{suggestion.title}</strong>
        {' '}has been applied. Risk score: {suggestion.newRiskScore}/100.
        Graph redrawn with new supply path.
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AlternativePathSuggestions({ lastSimEvent, riskScore, onApplySuggestion, onUndoSuggestion }) {
  const [suggestions, setSuggestions]   = useState([]);
  const [loading, setLoading]           = useState(false);
  const [appliedId, setAppliedId]       = useState(null);
  const [applyingId, setApplyingId]     = useState(null);
  const [appliedSuggestion, setApplied] = useState(null);

  // Load suggestions when event changes
  useEffect(() => {
    if (!lastSimEvent || lastSimEvent === 'reset') {
      setSuggestions([]);
      setAppliedId(null);
      setApplied(null);
      return;
    }

    setLoading(true);
    setAppliedId(null);
    setApplied(null);

    const load = async () => {
      try {
        const res = await api.getSuggestions(lastSimEvent);
        setSuggestions(res);
      } catch {
        // fallback mock
        await new Promise(r => setTimeout(r, 800));
        setSuggestions(MOCK_SUGGESTIONS[lastSimEvent] || MOCK_SUGGESTIONS.default);
      }
      setLoading(false);
    };
    load();
  }, [lastSimEvent]);

  const handleApply = useCallback(async (suggestion) => {
    setApplyingId(suggestion.id);
    await new Promise(r => setTimeout(r, 1200)); // feel of real processing
    setApplyingId(null);
    setAppliedId(suggestion.id);
    setApplied(suggestion);
    onApplySuggestion?.(suggestion);
  }, [onApplySuggestion]);

  const handleUndo = useCallback(() => {
    setAppliedId(null);
    setApplied(null);
    onUndoSuggestion?.();
  }, [onUndoSuggestion]);

  // ── Idle state ──────────────────────────────────────────────────────────────
  if (!lastSimEvent || lastSimEvent === 'reset') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="panel-header">
          <span style={{ fontSize: 12 }}>🔀</span>
          <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em' }}>
            ALTERNATIVE PATH SUGGESTIONS
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', gap: 12 }}>
          <div style={{ fontSize: 32, opacity: 0.3 }}>🔀</div>
          <div style={{ fontSize: 12, color: '#475569', fontFamily: 'Syne', textAlign: 'center', lineHeight: 1.6 }}>
            Trigger a disruption scenario to see AI-suggested alternative supply chain patterns.
          </div>
          <div style={{ fontSize: 10, color: '#334155', fontFamily: 'IBM Plex Mono', textAlign: 'center' }}>
            Go to SIMULATE → pick a scenario
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="panel-header">
        <span style={{ fontSize: 12 }}>🔀</span>
        <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em' }}>
          ALTERNATIVE PATH SUGGESTIONS
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {!loading && suggestions.length > 0 && (
            <span style={{ fontSize: 9, color: '#f59e0b', fontFamily: 'IBM Plex Mono', fontWeight: 600 }}>
              {suggestions.length} OPTIONS FOUND
            </span>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, border: '2px solid transparent', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 11, color: '#10b981', fontFamily: 'IBM Plex Mono' }}>Analysing alternative paths...</span>
          </div>
          {['Scanning graph for alternative routes...', 'Querying KB for supplier contracts...', 'Ranking by cost / time / risk...'].map((s, i) => (
            <div key={i} style={{ fontSize: 9, color: '#334155', fontFamily: 'IBM Plex Mono', paddingLeft: 18 }}>{s}</div>
          ))}
        </div>
      )}

      {/* Suggestions list */}
      {!loading && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Applied banner */}
          <AppliedBanner suggestion={appliedSuggestion} onUndo={handleUndo} />

          {/* Context row */}
          <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #1e2535' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 5px #ef4444' }} />
            <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'IBM Plex Mono' }}>
              DISRUPTION: <span style={{ color: '#ef4444', fontWeight: 600 }}>{lastSimEvent.replace(/_/g, ' ').toUpperCase()}</span>
              <span style={{ color: '#475569' }}> · RISK {riskScore}/100 · {suggestions.length} alternatives ranked</span>
            </span>
          </div>

          <div style={{ padding: '10px 12px' }}>
            {suggestions.map(s => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                onApply={handleApply}
                isApplied={appliedId === s.id}
                isApplying={applyingId === s.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #1e2535' }}>
        <div style={{ fontSize: 9, color: '#334155', fontFamily: 'IBM Plex Mono' }}>
          KB-GROUNDED · GRAPH-AWARE · COST/TIME OPTIMISED
        </div>
      </div>
    </div>
  );
}
