import { useEffect, useState } from 'react';

function RiskGauge({ score }) {
  const angle = (score / 100) * 180;
  const r = 36;
  const cx = 50, cy = 50;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const startX = cx + r * Math.cos(toRad(180));
  const startY = cy + r * Math.sin(toRad(180));
  const endAngle = 180 + angle;
  const endX = cx + r * Math.cos(toRad(endAngle));
  const endY = cy + r * Math.sin(toRad(endAngle));
  const large = angle > 180 ? 1 : 0;
  const color = score < 30 ? '#10b981' : score < 60 ? '#eab308' : '#ef4444';

  return (
    <svg width="100" height="60" viewBox="0 0 100 60">
      <path d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`} fill="none" stroke="#1e2535" strokeWidth="6" strokeLinecap="round" />
      {score > 0 && (
        <path d={`M ${startX},${startY} A ${r},${r} 0 ${large},1 ${endX},${endY}`} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      )}
      <text x="50" y="52" textAnchor="middle" fill={color} fontSize="14" fontFamily="IBM Plex Mono" fontWeight="600">{score}</text>
    </svg>
  );
}

function Metric({ label, value, sub, color = '#94a3b8', accent }) {
  return (
    <div className="metric-card">
      <div style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent || color, fontFamily: 'IBM Plex Mono', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontFamily: 'Syne' }}>{sub}</div>}
    </div>
  );
}

export default function RiskDashboard({ data, loading }) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [data]);

  if (!data) return null;

  const riskScore = data.riskScore || 0;
  const riskColor = riskScore < 30 ? '#10b981' : riskScore < 60 ? '#eab308' : '#ef4444';
  const riskLabel = riskScore < 30 ? 'LOW' : riskScore < 60 ? 'ELEVATED' : 'CRITICAL';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="panel-header">
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: riskColor, boxShadow: `0 0 6px ${riskColor}` }} />
        <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em' }}>
          RISK DASHBOARD
        </span>
        {loading && (
          <div style={{ marginLeft: 'auto', width: 10, height: 10, border: '2px solid transparent', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {/* Risk Score */}
        <div style={{
          background: `${riskColor}08`, border: `1px solid ${riskColor}20`,
          borderRadius: 8, padding: '12px', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 12,
          transition: 'all 0.3s',
          boxShadow: pulse ? `0 0 20px ${riskColor}30` : 'none',
        }}>
          <RiskGauge score={riskScore} />
          <div>
            <div style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono', letterSpacing: '0.1em', marginBottom: 4 }}>COMPOSITE RISK</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: riskColor, fontFamily: 'IBM Plex Mono' }}>{riskLabel}</div>
            <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'Syne', marginTop: 2 }}>Score: {riskScore}/100</div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <Metric label="TOTAL SUPPLIERS" value={data.totalSuppliers} sub="active" accent="#3b82f6" />
          <Metric label="AFFECTED COMPS" value={data.affectedComponents}
            accent={data.affectedComponents > 0 ? '#eab308' : '#10b981'}
            sub={data.affectedComponents > 0 ? 'disrupted' : 'nominal'} />
          <Metric label="AFFECTED PRODS" value={data.affectedProducts}
            accent={data.affectedProducts > 0 ? '#ef4444' : '#10b981'}
            sub={data.affectedProducts > 0 ? 'at risk' : 'on track'} />
          <Metric label="EST. DELAY" value={data.estimatedDelay}
            accent={data.estimatedDelay !== '0 days' ? '#eab308' : '#10b981'}
            sub="production impact" />
        </div>

        {/* Status Breakdown */}
        <div style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono', letterSpacing: '0.1em', marginBottom: 8 }}>
          NETWORK STATUS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: 'Healthy Nodes', value: 18 - data.affectedComponents - data.affectedProducts, color: '#10b981', total: 18 },
            { label: 'Warning Nodes', value: data.affectedComponents, color: '#eab308', total: 18 },
            { label: 'Critical Nodes', value: data.affectedProducts, color: '#ef4444', total: 18 },
          ].map(({ label, value, color, total }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'Syne', minWidth: 100 }}>{label}</span>
              <div style={{ flex: 1, background: '#1e2535', borderRadius: 2, height: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${(value / total) * 100}%`, height: '100%',
                  background: color, borderRadius: 2,
                  boxShadow: `0 0 4px ${color}`,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{ fontSize: 10, color, fontFamily: 'IBM Plex Mono', minWidth: 20 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Timestamp */}
        <div style={{ marginTop: 12, fontSize: 9, color: '#334155', fontFamily: 'IBM Plex Mono', borderTop: '1px solid #1e2535', paddingTop: 8 }}>
          LAST SYNC: {new Date(data.lastUpdated).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
