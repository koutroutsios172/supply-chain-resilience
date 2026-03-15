/** v3 KnowledgeGapDetector.jsx */
import { useState, useMemo } from 'react';

const ALL_NODES = [
  { id: 'sup-1',  type: 'supplier',   label: 'Foxconn Taiwan',    docs: ['doc-1'],          region: 'Asia-Pacific' },
  { id: 'sup-2',  type: 'supplier',   label: 'Samsung Korea',     docs: ['doc-2'],          region: 'Asia-Pacific', docAge: 91 },
  { id: 'sup-3',  type: 'supplier',   label: 'TSMC Taiwan',       docs: ['doc-3'],          region: 'Asia-Pacific' },
  { id: 'sup-4',  type: 'supplier',   label: 'Murata Japan',      docs: ['doc-6'],          region: 'Asia-Pacific' },
  { id: 'comp-1', type: 'component',  label: 'Display Panel',     docs: ['doc-1'],          singleSource: true },
  { id: 'comp-2', type: 'component',  label: 'Battery Cell',      docs: ['doc-1'],          singleSource: false },
  { id: 'comp-3', type: 'component',  label: 'Memory Chip',       docs: ['doc-2'],          singleSource: true, docAge: 91 },
  { id: 'comp-4', type: 'component',  label: 'Processor SoC',     docs: ['doc-3'],          singleSource: true },
  { id: 'comp-5', type: 'component',  label: 'Capacitors',        docs: ['doc-6'],          singleSource: false },
  { id: 'prod-1', type: 'product',    label: 'Smartphone X1',     docs: [],                 singleSource: false },
  { id: 'prod-2', type: 'product',    label: 'Tablet Pro',        docs: [],                 singleSource: false },
  { id: 'prod-3', type: 'product',    label: 'Server Module',     docs: [],                 singleSource: false },
  { id: 'fact-1', type: 'factory',    label: 'Shenzhen Plant A',  docs: ['doc-7'],          region: 'Shenzhen, CN' },
  { id: 'fact-2', type: 'factory',    label: 'Taipei Plant B',    docs: [],                 region: 'Taipei, TW' },
  { id: 'port-1', type: 'port',       label: 'Port of Shanghai',  docs: ['doc-4', 'doc-5'], region: 'Shanghai, CN' },
  { id: 'port-2', type: 'port',       label: 'Port of Busan',     docs: ['doc-5'],          region: 'Busan, KR' },
  { id: 'port-3', type: 'port',       label: 'Port of Osaka',     docs: ['doc-5'],          region: 'Osaka, JP' },
];

const TYPE_COLOR = {
  supplier:  '#3b82f6',
  component: '#8b5cf6',
  product:   '#f59e0b',
  factory:   '#06b6d4',
  port:      '#ec4899',
};

const TYPE_ICON = {
  supplier:  '🏭',
  component: '⚙️',
  product:   '📦',
  factory:   '🔧',
  port:      '⚓',
};

const SUGGESTED_DOCS = {
  supplier:  'Master Supply Agreement / SLA / Vendor Contract',
  component: 'Component Specification Sheet / BOM Entry',
  product:   'Product BOM / Design Requirements Document',
  factory:   'Facility Audit Report / Capacity Assessment',
  port:      'Port Risk Assessment / Shipping Lane Report',
};

function analyzeGaps(extraDocs = []) {
  const gaps = [];
  ALL_NODES.forEach(node => {
    const effectiveDocs = [...node.docs, ...extraDocs.filter(d => d.nodes?.includes(node.id))];
    if (effectiveDocs.length === 0) {
      gaps.push({
        id:           `gap-ungrounded-${node.id}`,
        severity:     node.type === 'supplier' || node.singleSource ? 'critical' : 'warning',
        category:     'UNGROUNDED NODE',
        nodeId:       node.id,
        nodeType:     node.type,
        nodeLabel:    node.label,
        danger:       node.type === 'supplier'
          ? 'Any disruption at this supplier cannot be verified against contract terms. AI answers will be speculation.'
          : node.type === 'factory'
          ? 'No audit data means capacity and risk are unknown. Cascade predictions for this factory are unreliable.'
          : node.type === 'product'
          ? 'No BOM means the AI cannot trace which components affect this product. Impact analysis will be incomplete.'
          : 'No documentation means disruption analysis for this node has no grounding.',
        fix:          `Upload: ${SUGGESTED_DOCS[node.type]}`,
        confidenceGain: node.type === 'supplier' ? '+24%' : node.type === 'factory' ? '+18%' : '+12%',
      });
    }
    if (node.docAge && node.docAge >= 90) {
      gaps.push({
        id:           `gap-decay-${node.id}`,
        severity:     'warning',
        category:     'KNOWLEDGE DECAY',
        nodeId:       node.id,
        nodeType:     node.type,
        nodeLabel:    node.label,
        danger:       `Primary document is ${node.docAge} days old. Contract terms, pricing, and SLA conditions may have changed. AI confidence has dropped below 65%.`,
        fix:          'Re-ingest latest version of the contract/SLA via INGEST DOCS',
        confidenceGain: '+19%',
        daysOld:      node.docAge,
      });
    }
    if (node.singleSource && effectiveDocs.length < 2 && node.type === 'component') {
      gaps.push({
        id:           `gap-spof-${node.id}`,
        severity:     'warning',
        category:     'SPOF — NO BACKUP',
        nodeId:       node.id,
        nodeType:     node.type,
        nodeLabel:    node.label,
        danger:       'Single-source component with no backup supplier documented in KB. If primary supplier fails, AI has no alternate routing knowledge to recommend.',
        fix:          'Upload: Alternative Supplier Qualification Document',
        confidenceGain: '+15%',
      });
    }
  });
  const order = { critical: 0, warning: 1, info: 2 };
  return gaps.sort((a, b) => (order[a.severity] ?? 2) - (order[b.severity] ?? 2));
}

const SEV = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.2)',  label: 'CRITICAL', icon: '🔴' },
  warning:  { color: '#eab308', bg: 'rgba(234,179,8,0.07)',  border: 'rgba(234,179,8,0.2)',  label: 'WARNING',  icon: '🟡' },
  info:     { color: '#3b82f6', bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.2)', label: 'INFO',     icon: '🔵' },
};

function GapCard({ gap, onFix }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEV[gap.severity];
  const typeColor = TYPE_COLOR[gap.nodeType];
  return (
    <div style={{
      background: sev.bg, border: `1px solid ${sev.border}`,
      borderRadius: 8, marginBottom: 8, overflow: 'hidden',
      borderLeft: `3px solid ${sev.color}`,
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '9px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
          background: `${typeColor}18`, border: `1px solid ${typeColor}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13,
        }}>
          {TYPE_ICON[gap.nodeType]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 8, padding: '1px 6px', borderRadius: 3,
              background: `${sev.color}18`, color: sev.color,
              border: `1px solid ${sev.color}30`,
              fontFamily: 'IBM Plex Mono', fontWeight: 700, letterSpacing: '0.08em',
            }}>{sev.icon} {gap.category}</span>
            <span style={{ fontSize: 9, color: typeColor, fontFamily: 'IBM Plex Mono', fontWeight: 600 }}>{gap.nodeId}</span>
          </div>
          <div style={{ fontSize: 11, color: '#e2e8f0', fontFamily: 'Syne', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {gap.nodeLabel}
          </div>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '0 12px 12px 12px', borderTop: `1px solid ${sev.border}`, paddingTop: 10 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Syne', lineHeight: 1.6, marginBottom: 10 }}>
            <span style={{ color: sev.color, fontWeight: 600 }}>⚠ Risk: </span>
            {gap.danger}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
            borderRadius: 6, padding: '8px 10px',
          }}>
            <span style={{ fontSize: 11 }}>📄</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#f59e0b', fontFamily: 'IBM Plex Mono', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 2 }}>FIX REQUIRED</div>
              <div style={{ fontSize: 10, color: '#cbd5e1', fontFamily: 'Syne' }}>{gap.fix}</div>
            </div>
            <button
              onClick={() => onFix?.(gap)}
              style={{
                background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
                color: '#f59e0b', borderRadius: 5, padding: '5px 10px',
                cursor: 'pointer', fontSize: 9, fontFamily: 'IBM Plex Mono',
                fontWeight: 600, letterSpacing: '0.06em', flexShrink: 0,
              }}
            >
              → INGEST
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CoverageSummary({ gaps }) {
  const total     = ALL_NODES.length;
  const covered   = ALL_NODES.filter(n => n.docs.length > 0 && !n.docAge).length;
  const partial   = ALL_NODES.filter(n => n.docs.length > 0 && n.docAge).length;
  const uncovered = total - covered - partial;
  const pct       = Math.round((covered / total) * 100);
  return (
    <div style={{ padding: '12px', borderBottom: '1px solid #1e2535' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono', letterSpacing: '0.1em', marginBottom: 3 }}>KB COVERAGE SCORE</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: pct >= 80 ? '#10b981' : pct >= 60 ? '#eab308' : '#ef4444', fontFamily: 'IBM Plex Mono', lineHeight: 1 }}>
            {pct}<span style={{ fontSize: 14, color: '#475569' }}>%</span>
          </div>
        </div>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: '#1e2535', overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: `${(covered / total) * 100}%`, background: '#10b981' }} />
        <div style={{ width: `${(partial / total) * 100}%`, background: '#eab308' }} />
        <div style={{ width: `${(uncovered / total) * 100}%`, background: '#ef4444' }} />
      </div>
    </div>
  );
}

export default function KnowledgeGapDetector({ extraDocs = [], onNavigateToIngest }) {
  const [filter, setFilter] = useState('all');
  const gaps    = useMemo(() => analyzeGaps(extraDocs), [extraDocs]);
  const filtered = filter === 'all' ? gaps : gaps.filter(g => g.severity === filter);

  const handleFix = () => {
    onNavigateToIngest?.();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header">
        <span style={{ fontSize: 12 }}>🕳️</span>
        <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em' }}>
          KNOWLEDGE GAP DETECTOR
        </span>
      </div>
      <CoverageSummary gaps={gaps} />
      <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid #1e2535' }}>
        {[
          { key: 'all',      label: 'ALL',      count: gaps.length },
          { key: 'critical', label: 'CRITICAL', count: gaps.filter(g => g.severity === 'critical').length, color: '#ef4444' },
          { key: 'warning',  label: 'WARNINGS', count: gaps.filter(g => g.severity === 'warning').length,  color: '#eab308' },
        ].map(({ key, label, count, color }) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            flex: 1, padding: '4px 8px', borderRadius: 4, border: 'none',
            background: filter === key ? (color ? `${color}18` : 'rgba(245,158,11,0.1)') : 'transparent',
            color: filter === key ? (color || '#f59e0b') : '#475569',
            fontSize: 9, fontFamily: 'IBM Plex Mono', fontWeight: 600,
            cursor: 'pointer', letterSpacing: '0.06em',
          }}>
            {label} ({count})
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 16px' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 12, color: '#10b981', fontFamily: 'Syne', fontWeight: 600 }}>No gaps in this category</div>
          </div>
        ) : (
          filtered.map(gap => <GapCard key={gap.id} gap={gap} onFix={handleFix} />)
        )}
      </div>
      <div style={{ padding: '10px 12px', borderTop: '1px solid #1e2535' }}>
        <button
          onClick={onNavigateToIngest}
          style={{
            width: '100%', padding: '9px', borderRadius: 7,
            background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
            color: '#f59e0b', cursor: 'pointer', fontSize: 11,
            fontFamily: 'IBM Plex Mono', fontWeight: 600, letterSpacing: '0.08em',
          }}
        >
          ⊕ FIX GAPS — GO TO INGEST DOCS
        </button>
      </div>
    </div>
  );
}

