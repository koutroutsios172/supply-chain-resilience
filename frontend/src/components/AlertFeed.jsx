/** v3 AlertFeed.jsx (ticker + alerts panel) */
import { useState, useEffect, useCallback, useRef } from 'react';

const ALERT_TYPES = {
  critical:    { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   icon: '🔴', label: 'CRITICAL'  },
  warning:     { color: '#eab308', bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.2)',   icon: '🟡', label: 'WARNING'   },
  info:        { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  icon: '🔵', label: 'INFO'      },
  resolved:    { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',  icon: '🟢', label: 'RESOLVED'  },
  decay:       { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)',  icon: '🟣', label: 'KB DECAY'  },
  signal:      { color: '#ec4899', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)',  icon: '📡', label: 'SIGNAL'    },
};

const INITIAL_ALERTS = [
  {
    id: 'a-001', type: 'decay',
    title: 'Knowledge Decay — Samsung Contract',
    detail: 'sup-2 (Samsung Korea) contract last updated 91 days ago. Confidence on comp-3 dropping to 64%. Re-ingest latest SLA to restore accuracy.',
    kbSource: 'Samsung_SLA_Components_Q1.pdf',
    nodeIds: ['sup-2', 'comp-3'],
    action: 'Upload updated Samsung SLA → INGEST DOCS',
    ts: Date.now() - 5 * 60 * 1000,
  },
];

const DISRUPTION_ALERTS = {
  storm_port: [
    { id: `a-${Date.now()}-1`, type: 'critical', title: 'CASCADE DETECTED — Port of Shanghai', detail: 'KB cross-reference: Foxconn §12.4 force-majeure triggered. Cascade path: port-1 → sup-1 → comp-1 → prod-1, prod-2. Estimated onset: 18 days.', kbSource: 'Foxconn_Master_Agreement_2024.pdf', nodeIds: ['port-1', 'sup-1', 'comp-1', 'prod-1', 'prod-2'], action: 'Generate Crisis Playbook', ts: Date.now() },
  ],
  reset: [
    { id: `a-${Date.now()}-6`, type: 'resolved', title: 'All Disruptions Cleared', detail: 'Supply chain restored to nominal state. KB confidence scores reset. All node statuses: HEALTHY. Monitoring resumed.', kbSource: null, nodeIds: [], action: null, ts: Date.now() },
  ],
};

const BACKGROUND_ALERTS = [
  { type: 'info', title: 'Routine Scan Complete', detail: 'KB scan: no new risks detected. 17 nodes nominal. Next scan in 45s.', kbSource: null, nodeIds: [], action: null },
];

function timeSince(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function AlertTicker({ alerts, onOpenFeed }) {
  const latest = alerts[0];
  if (!latest) return null;
  const cfg = ALERT_TYPES[latest.type] || ALERT_TYPES.info;
  return (
    <div
      onClick={onOpenFeed}
      style={{
        height: 28, background: '#0a0e18',
        borderBottom: `1px solid ${cfg.color}25`,
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 10,
        cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#0d1117'}
      onMouseLeave={e => e.currentTarget.style.background = '#0a0e18'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 6px ${cfg.color}`, animation: 'pulse-amber 2s infinite' }} />
        <span style={{ fontSize: 8, color: cfg.color, fontFamily: 'IBM Plex Mono', fontWeight: 700, letterSpacing: '0.12em' }}>
          {cfg.label}
        </span>
      </div>
      <div style={{ width: 1, height: 14, background: '#1e2535', flexShrink: 0 }} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'IBM Plex Mono', whiteSpace: 'nowrap' }}>
          <span style={{ color: cfg.color, fontWeight: 600 }}>{latest.title}:</span>
          {' '}{latest.detail.slice(0, 90)}...
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 8, color: '#334155', fontFamily: 'IBM Plex Mono' }}>{timeSince(latest.ts)}</span>
        <span style={{ fontSize: 8, color: '#475569', fontFamily: 'IBM Plex Mono', border: '1px solid #1e2535', padding: '1px 6px', borderRadius: 3 }}>
          {alerts.length} ALERTS ▸
        </span>
      </div>
    </div>
  );
}

function AlertCard({ alert, isNew }) {
  const cfg = ALERT_TYPES[alert.type] || ALERT_TYPES.info;
  return (
    <div style={{
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 8, padding: '10px 12px', marginBottom: 8,
      borderLeft: `3px solid ${cfg.color}`,
      animation: isNew ? 'fadeSlideIn 0.4s ease' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em' }}>
              {alert.title}
            </span>
            <span style={{
              fontSize: 8, padding: '1px 5px', borderRadius: 3,
              background: `${cfg.color}20`, color: cfg.color,
              border: `1px solid ${cfg.color}30`, fontFamily: 'IBM Plex Mono',
              fontWeight: 700, letterSpacing: '0.08em',
            }}>
              {cfg.label}
            </span>
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Syne', lineHeight: 1.5 }}>
            {alert.detail}
          </div>
        </div>
        <span style={{ fontSize: 9, color: '#334155', fontFamily: 'IBM Plex Mono', flexShrink: 0, marginTop: 2 }}>
          {timeSince(alert.ts)}
        </span>
      </div>
    </div>
  );
}

function FilterBar({ active, onChange, counts }) {
  const filters = ['all', 'critical', 'warning', 'signal', 'decay', 'info', 'resolved'];
  return (
    <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid #1e2535', flexWrap: 'wrap' }}>
      {filters.map(f => {
        const cfg = ALERT_TYPES[f];
        const isAll = f === 'all';
        const count = isAll ? Object.values(counts).reduce((a, b) => a + b, 0) : (counts[f] || 0);
        return (
          <button key={f} onClick={() => onChange(f)} style={{
            padding: '3px 8px', borderRadius: 4, border: 'none',
            background: active === f ? (cfg?.color ? `${cfg.color}20` : 'rgba(245,158,11,0.12)') : 'rgba(22,27,39,0.6)',
            color: active === f ? (cfg?.color || '#f59e0b') : '#475569',
            fontSize: 9, fontFamily: 'IBM Plex Mono', fontWeight: 600,
            cursor: 'pointer', letterSpacing: '0.06em',
          }}>
            {f.toUpperCase()} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function AlertFeedPanel({ lastSimEvent }) {
  const [alerts, setAlerts]         = useState(INITIAL_ALERTS);
  const [filter, setFilter]         = useState('all');
  const [newIds, setNewIds]         = useState(new Set());
  const [scanning, setScanning]     = useState(false);
  const bgTimerRef = useRef(null);

  const addAlerts = useCallback((newAlerts) => {
    const ids = new Set(newAlerts.map(a => a.id));
    setNewIds(ids);
    setAlerts(prev => [...newAlerts.map(a => ({ ...a, id: a.id + Date.now() })), ...prev].slice(0, 50));
    setTimeout(() => setNewIds(new Set()), 3000);
  }, []);

  useEffect(() => {
    if (!lastSimEvent) return;
    const triggered = DISRUPTION_ALERTS[lastSimEvent];
    if (triggered) addAlerts(triggered);
  }, [lastSimEvent, addAlerts]);

  useEffect(() => {
    bgTimerRef.current = setInterval(() => {
      setScanning(true);
      setTimeout(() => {
        setScanning(false);
        const pick = BACKGROUND_ALERTS[Math.floor(Math.random() * BACKGROUND_ALERTS.length)];
        addAlerts([{ ...pick, id: `bg-${Date.now()}`, ts: Date.now() }]);
      }, 1200);
    }, 45000);
    return () => clearInterval(bgTimerRef.current);
  }, [addAlerts]);

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.type === filter);
  const counts   = alerts.reduce((acc, a) => ({ ...acc, [a.type]: (acc[a.type] || 0) + 1 }), {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header">
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ec4899', boxShadow: '0 0 6px #ec4899', animation: 'pulse-amber 2s infinite' }} />
        <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em' }}>
          PROACTIVE ALERT FEED
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {scanning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, border: '1.5px solid transparent', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 8, color: '#3b82f6', fontFamily: 'IBM Plex Mono' }}>SCANNING</span>
            </div>
          )}
          <span style={{ fontSize: 9, color: '#334155', fontFamily: 'IBM Plex Mono' }}>{alerts.length} TOTAL</span>
        </div>
      </div>

      <FilterBar active={filter} onChange={setFilter} counts={counts} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#334155', fontFamily: 'IBM Plex Mono', fontSize: 11 }}>
            No alerts in this category
          </div>
        ) : (
          filtered.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isNew={newIds.has(alert.id)}
            />
          ))
        )}
      </div>

      <div style={{ padding: '8px 12px', borderTop: '1px solid #1e2535', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 4px #10b981' }} />
        <span style={{ fontSize: 9, color: '#334155', fontFamily: 'IBM Plex Mono' }}>
          MONITORING ACTIVE · SCAN EVERY 45s · KB-GROUNDED
        </span>
      </div>
    </div>
  );
}

