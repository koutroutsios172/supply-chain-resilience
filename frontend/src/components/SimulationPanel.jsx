import { useState } from 'react';

const EVENTS = [
  {
    id: 'storm_port',
    label: 'Storm at Port',
    icon: '🌩️',
    description: 'Typhoon disrupts Port of Shanghai',
    severity: 'critical',
    affected: 'port-1, sup-1, sup-3',
  },
  {
    id: 'port_strike',
    label: 'Port Strike',
    icon: '⚠️',
    description: 'Labor action at Port of Busan',
    severity: 'critical',
    affected: 'port-2, sup-2',
  },
  {
    id: 'supplier_delay',
    label: 'Supplier Delay',
    icon: '🔧',
    description: 'TSMC production halt (21 days)',
    severity: 'warning',
    affected: 'sup-3, comp-4',
  },
  {
    id: 'shipping_disruption',
    label: 'Shipping Disruption',
    icon: '🚢',
    description: 'Global route closure (Suez Canal)',
    severity: 'critical',
    affected: 'All ports',
  },
];

const severityStyle = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
  warning: { color: '#eab308', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.25)' },
};

export default function SimulationPanel({ onSimulate, loading }) {
  const [activeEvent, setActiveEvent] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const handleSimulate = async (event) => {
    setActiveEvent(event.id);
    const result = await onSimulate(event.id);
    if (result) setLastResult({ ...result, eventLabel: event.label });
  };

  const handleReset = async () => {
    setActiveEvent('reset');
    const result = await onSimulate('reset');
    if (result) setLastResult(null);
    setTimeout(() => setActiveEvent(null), 500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="panel-header">
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444', animation: 'pulse-red 2s infinite' }} />
        <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em' }}>
          DISRUPTION SIMULATOR
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono' }}>LIVE</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {/* Event Buttons */}
        <div style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono', letterSpacing: '0.1em', marginBottom: 10 }}>
          SELECT DISRUPTION EVENT
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {EVENTS.map(event => {
            const sev = severityStyle[event.severity];
            const isActive = activeEvent === event.id;
            return (
              <button
                key={event.id}
                onClick={() => handleSimulate(event)}
                disabled={loading}
                style={{
                  background: isActive ? sev.bg : 'rgba(22,27,39,0.8)',
                  border: `1px solid ${isActive ? sev.border : '#1e2535'}`,
                  borderRadius: 8, padding: '10px 12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  textAlign: 'left', transition: 'all 0.2s',
                  opacity: loading && activeEvent !== event.id ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = sev.border; e.currentTarget.style.background = sev.bg; }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = '#1e2535'; e.currentTarget.style.background = 'rgba(22,27,39,0.8)'; }}}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{event.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', fontFamily: 'Syne' }}>
                    {event.label}
                  </span>
                  {isActive && loading && (
                    <div style={{
                      marginLeft: 'auto', width: 12, height: 12,
                      border: '2px solid transparent',
                      borderTopColor: sev.color,
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }} />
                  )}
                  <span style={{
                    marginLeft: 'auto', fontSize: 9, fontFamily: 'IBM Plex Mono',
                    color: sev.color, background: sev.bg,
                    border: `1px solid ${sev.border}`,
                    padding: '1px 6px', borderRadius: 3, fontWeight: 600,
                    letterSpacing: '0.05em',
                  }}>
                    {event.severity.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'IBM Plex Mono', marginBottom: 4 }}>
                  {event.description}
                </div>
                <div style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono' }}>
                  ↳ {event.affected}
                </div>
              </button>
            );
          })}
        </div>

        {/* Last Result */}
        {lastResult?.message && (
          <div style={{
            marginTop: 12, padding: '10px 12px',
            background: 'rgba(245,158,11,0.05)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 8, animation: 'fadeSlideIn 0.3s ease',
          }}>
            <div style={{ fontSize: 9, color: '#f59e0b', fontFamily: 'IBM Plex Mono', marginBottom: 6, letterSpacing: '0.08em' }}>
              ◆ SIMULATION OUTPUT
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontFamily: 'Syne' }}>
              {lastResult.message}
            </div>
          </div>
        )}

        {/* Separator */}
        <div style={{ borderTop: '1px solid #1e2535', margin: '16px 0' }} />

        {/* Reset Button */}
        <button
          onClick={handleReset}
          disabled={loading}
          style={{
            width: '100%', padding: '10px',
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 12, color: '#10b981', fontFamily: 'Syne', fontWeight: 600,
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.12)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(16,185,129,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          ✓ Reset All — Restore Nominal State
        </button>
      </div>
    </div>
  );
}
