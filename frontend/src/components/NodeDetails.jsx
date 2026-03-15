const typeConfig = {
  supplier: { accent: '#3b82f6', icon: '🏭', label: 'SUPPLIER NODE' },
  component: { accent: '#8b5cf6', icon: '⚙️', label: 'COMPONENT NODE' },
  product: { accent: '#f59e0b', icon: '📦', label: 'PRODUCT NODE' },
  factory: { accent: '#06b6d4', icon: '🏗️', label: 'FACTORY NODE' },
  port: { accent: '#ec4899', icon: '⚓', label: 'PORT NODE' },
};

const statusMap = {
  healthy: { color: '#10b981', label: 'HEALTHY', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
  warning: { color: '#eab308', label: 'WARNING', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)' },
  critical: { color: '#ef4444', label: 'CRITICAL', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
};

function Row({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid #1e2535' }}>
      <span style={{ fontSize: 10, color: '#475569', fontFamily: 'IBM Plex Mono', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 11, color: valueColor || '#cbd5e1', fontFamily: 'Syne', fontWeight: 500, textAlign: 'right', maxWidth: '55%' }}>{value}</span>
    </div>
  );
}

function Tag({ label, color = '#64748b' }) {
  return (
    <span style={{
      fontSize: 9, padding: '2px 7px', borderRadius: 4,
      background: `${color}15`, color: color, border: `1px solid ${color}30`,
      fontFamily: 'IBM Plex Mono', fontWeight: 500, letterSpacing: '0.05em',
      display: 'inline-block', marginBottom: 4, marginRight: 4,
    }}>
      {label}
    </span>
  );
}

export default function NodeDetails({ node, onClose }) {
  if (!node) return null;
  const d = node.data;
  const nodeType = d.nodeType || 'supplier';
  const cfg = typeConfig[nodeType] || typeConfig.supplier;
  const status = statusMap[d.status] || statusMap.healthy;

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0, width: 300,
      background: '#0d1117', borderLeft: '1px solid #1e2535',
      zIndex: 1000, display: 'flex', flexDirection: 'column',
      boxShadow: '-4px 0 30px rgba(0,0,0,0.5)',
      animation: 'fadeSlideIn 0.25s ease',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px', borderBottom: '1px solid #1e2535',
        background: `${cfg.accent}08`,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 9, color: cfg.accent, fontFamily: 'IBM Plex Mono', letterSpacing: '0.12em', marginBottom: 6 }}>
            {cfg.icon} {cfg.label}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', fontFamily: 'Syne', lineHeight: 1.2 }}>
            {d.label}
          </div>
          <div style={{
            display: 'inline-block', marginTop: 8,
            fontSize: 9, padding: '2px 8px', borderRadius: 4,
            background: status.bg, color: status.color, border: `1px solid ${status.border}`,
            fontFamily: 'IBM Plex Mono', fontWeight: 600, letterSpacing: '0.08em',
          }}>
            ● {status.label}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#ef4444', borderRadius: 6, width: 28, height: 28,
          cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
        >×</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <div style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono', letterSpacing: '0.1em', marginBottom: 10 }}>
          NODE DETAILS
        </div>

        <Row label="NODE ID" value={node.id} />
        <Row label="TYPE" value={nodeType.toUpperCase()} valueColor={cfg.accent} />

        {d.region && <Row label="REGION" value={d.region} />}
        {d.location && <Row label="LOCATION" value={d.location} />}
        {d.capacity && <Row label="CAPACITY" value={d.capacity} valueColor={d.capacity === '95%' ? '#10b981' : '#eab308'} />}
        {d.throughput && <Row label="THROUGHPUT" value={d.throughput} />}
        {d.estimatedDelay !== undefined && <Row label="EST. DELAY" value={`${d.estimatedDelay || 0} days`} valueColor={d.estimatedDelay > 0 ? '#ef4444' : '#10b981'} />}
        {d.risk && <Row label="RISK LEVEL" value={d.risk.toUpperCase()} valueColor={d.risk === 'high' ? '#ef4444' : d.risk === 'medium' ? '#eab308' : '#10b981'} />}

        {/* Dependencies */}
        {d.components?.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono', letterSpacing: '0.1em', marginBottom: 8 }}>
              LINKED COMPONENTS
            </div>
            <div>{d.components.map(c => <Tag key={c} label={c} color="#8b5cf6" />)}</div>
          </div>
        )}

        {d.ports?.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono', letterSpacing: '0.1em', marginBottom: 8 }}>
              LINKED PORTS
            </div>
            <div>{d.ports.map(p => <Tag key={p} label={p} color="#ec4899" />)}</div>
          </div>
        )}

        {d.products?.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono', letterSpacing: '0.1em', marginBottom: 8 }}>
              DOWNSTREAM PRODUCTS
            </div>
            <div>{d.products.map(p => <Tag key={p} label={p} color="#f59e0b" />)}</div>
          </div>
        )}

        {d.suppliers?.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono', letterSpacing: '0.1em', marginBottom: 8 }}>
              CONNECTED SUPPLIERS
            </div>
            <div>{d.suppliers.map(s => <Tag key={s} label={s} color="#3b82f6" />)}</div>
          </div>
        )}

        {/* Risk analysis */}
        <div style={{
          marginTop: 16, padding: 12,
          background: 'rgba(22,27,39,0.8)',
          border: '1px solid #1e2535', borderRadius: 8,
        }}>
          <div style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono', letterSpacing: '0.1em', marginBottom: 8 }}>
            RISK ANALYSIS
          </div>
          <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'Syne', lineHeight: 1.6 }}>
            {d.status === 'critical'
              ? `This node is experiencing a critical disruption. Immediate mitigation required. Check upstream dependencies for cascade effects.`
              : d.status === 'warning'
              ? `This node shows elevated risk indicators. Monitor closely for potential escalation within 24–48 hours.`
              : `Operating within normal parameters. No immediate action required.`}
          </div>
        </div>
      </div>
    </div>
  );
}
