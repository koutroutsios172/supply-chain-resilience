export default function ConfidenceBadge({ score, severity }) {
  if (score === undefined || score === null) return null;

  const pct = Math.round(score * 100);

  // Colour logic: high confidence + critical = red (real alert)
  //               low confidence = grey (uncertain, don't panic)
  const isUncertain = severity === 'uncertain' || score < 0.65;
  const color = isUncertain
    ? '#64748b'
    : severity === 'critical' ? '#ef4444'
    : severity === 'warning'  ? '#eab308'
    : '#10b981';

  const label = isUncertain
    ? 'LOW CONFIDENCE — treat as advisory only'
    : pct >= 90 ? 'HIGH CONFIDENCE'
    : pct >= 75 ? 'MODERATE CONFIDENCE'
    : 'ELEVATED UNCERTAINTY';

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 8px', borderRadius: 5,
      background: `${color}12`,
      border: `1px solid ${color}30`,
      marginTop: 4,
    }}>
      {/* Mini confidence bar */}
      <div style={{
        width: 36, height: 4, background: '#1e2535', borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: 2,
          boxShadow: `0 0 4px ${color}`,
          transition: 'width 0.5s ease',
        }} />
      </div>

      <span style={{
        fontSize: 9, color, fontFamily: 'IBM Plex Mono',
        fontWeight: 600, letterSpacing: '0.08em',
      }}>
        {pct}% — {label}
      </span>

      {isUncertain && (
        <span style={{ fontSize: 10, color: '#64748b' }} title="Low confidence: no nodes highlighted">
          ⚠
        </span>
      )}
    </div>
  );
}
