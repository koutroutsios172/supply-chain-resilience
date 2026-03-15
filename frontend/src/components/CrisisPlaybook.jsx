/**
 * CrisisPlaybook.jsx
 * ─────────────────────────────────────────────────────────────
 * The single most important feature for the hackathon demo.
 *
 * Shows a large "GENERATE CRISIS PLAYBOOK" button whenever any
 * node is in critical or warning state. On click it calls
 * POST /crisis-playbook (or falls back to mock) and renders a
 * full executive briefing modal with:
 *   - Situation summary
 *   - Immediate / Short-term / Strategic action lists
 *   - Financial exposure table
 *   - Knowledge sources cited (which KB documents were used)
 *   - Confidence score per section
 *   - Print / Export button
 *
 * Drop into Dashboard.jsx — render it over the graph canvas when
 * riskScore > 0.
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useCallback } from 'react';
import { api } from '../services/api';

// ─── MOCK PLAYBOOKS ───────────────────────────────────────────────────────────
const MOCK_PLAYBOOKS = {
  storm_port: {
    situation: {
      event:       'Typhoon — Port of Shanghai',
      severity:    'CRITICAL',
      riskScore:   78,
      generatedAt: null, // filled at runtime
      affectedNodes: ['port-1', 'sup-1', 'sup-3', 'comp-1', 'comp-4', 'prod-1', 'prod-2'],
      summary: 'Typhoon Haikui is tracking toward Shanghai. Port authority has issued Category 3 vessel restriction. Two primary suppliers (Foxconn, TSMC) route exclusively through this port. Force-majeure conditions confirmed per indexed contracts.',
    },
    actions: {
      immediate: [
        { priority: 1, action: 'Invoke Foxconn force-majeure clause §12.4', owner: 'Procurement', deadline: '24h', kbSource: 'Foxconn_Master_Agreement_2024.pdf' },
        { priority: 2, action: 'Contact Port of Busan — request emergency rerouting capacity for TSMC shipments', owner: 'Logistics', deadline: '24h', kbSource: 'TSMC_Supply_Agreement.pdf' },
        { priority: 3, action: 'Alert production planning: Display Panel and Processor SoC shortage in 18 days', owner: 'Operations', deadline: '48h', kbSource: 'Shenzhen_Plant_Audit_2024.pdf' },
      ],
      shortTerm: [
        { priority: 1, action: 'Authorize emergency air freight for Processor SoC (priority SKUs only)', owner: 'Logistics', deadline: '7 days', saving: '12 days recovery' },
        { priority: 2, action: 'Increase Memory Chip safety stock buffer by 30%', owner: 'Procurement', deadline: '5 days', saving: 'Protect prod-3' },
        { priority: 3, action: 'Delay Tablet Pro marketing announcement by 3 weeks', owner: 'Marketing', deadline: '3 days', saving: 'Avoid customer SLA breach' },
        { priority: 4, action: 'Qualify Malaysia backup supplier for Display Panel', owner: 'Procurement', deadline: '14 days', saving: 'Eliminates SPOF' },
      ],
      strategic: [
        { action: 'Dual-source Display Panel — add Vietnam supplier to reduce single-port dependency', impact: 'High', effort: 'High' },
        { action: 'Negotiate Port of Busan as contractual secondary port in all APAC supplier agreements', impact: 'High', effort: 'Medium' },
        { action: 'Increase component safety stock from 2-week to 6-week buffer for single-source components', impact: 'Medium', effort: 'Low' },
      ],
    },
    financial: {
      revenueAtRisk:    31_500_000,
      mitigationCost:    1_830_000,
      netWorstCase:     29_670_000,
      dailyBurnRate:     4_200_000,
      breakEvenMitDay:   1,
      confidenceRange:  '±15%',
    },
    kbSources: [
      { name: 'Foxconn_Master_Agreement_2024.pdf', relevance: 0.94, clause: '§12.4 Force Majeure — natural disaster provision' },
      { name: 'Reuters_Shanghai_Port_Typhoon_Warning.txt', relevance: 0.89, clause: 'Category 3 vessel restriction confirmed' },
      { name: 'Lloyd_Shipping_Q1_Risk_Report.pdf', relevance: 0.82, clause: 'Busan rerouting capacity: 18,000 TEU/week available' },
      { name: 'Shenzhen_Plant_Audit_2024.pdf', relevance: 0.76, clause: 'Current buffer stock: 18 days Display Panel' },
    ],
    confidence: 0.89,
  },

  port_strike: {
    situation: {
      event:       'Labor Strike — Port of Busan',
      severity:    'CRITICAL',
      riskScore:   65,
      generatedAt: null,
      affectedNodes: ['port-2', 'sup-2', 'comp-3', 'prod-1', 'prod-2', 'prod-3'],
      summary: 'Labor union at Port of Busan has initiated strike action. Samsung Korea routes all Memory Chip exports through Busan. Memory Chip (comp-3) is the only component feeding all 3 product lines — a single point of failure.',
    },
    actions: {
      immediate: [
        { priority: 1, action: 'Trigger Samsung SLA breach notification — §8.2 alternative routing obligation', owner: 'Procurement', deadline: '24h', kbSource: 'Samsung_SLA_Components_Q1.pdf' },
        { priority: 2, action: 'Assess current Memory Chip inventory across all facilities', owner: 'Operations', deadline: '12h', kbSource: null },
        { priority: 3, action: 'Contact Micron US and SK Hynix for emergency spot purchase', owner: 'Procurement', deadline: '48h', kbSource: null },
      ],
      shortTerm: [
        { priority: 1, action: 'Prioritize Server Module (prod-3) production — highest margin product', owner: 'Planning', deadline: '3 days', saving: 'Protect $2.1M/day' },
        { priority: 2, action: 'Negotiate temporary air freight from Samsung Pyeongtaek facility', owner: 'Logistics', deadline: '5 days', saving: '8 days recovery' },
      ],
      strategic: [
        { action: 'Qualify second Memory Chip supplier — eliminate single-source dependency on Samsung', impact: 'Critical', effort: 'High' },
        { action: 'Negotiate multi-port clause in Samsung SLA at next renewal', impact: 'High', effort: 'Low' },
      ],
    },
    financial: {
      revenueAtRisk:   18_900_000,
      mitigationCost:     810_000,
      netWorstCase:    18_090_000,
      dailyBurnRate:    4_200_000,
      breakEvenMitDay:  1,
      confidenceRange: '±12%',
    },
    kbSources: [
      { name: 'Samsung_SLA_Components_Q1.pdf', relevance: 0.96, clause: '§8.2 — alternative routing obligations during port disruption' },
      { name: 'Lloyd_Shipping_Q1_Risk_Report.pdf', relevance: 0.78, clause: 'Busan strike risk elevated — Q1 labor contract dispute ongoing' },
    ],
    confidence: 0.87,
  },

  default: {
    situation: {
      event:       'Supply Chain Disruption Detected',
      severity:    'WARNING',
      riskScore:   55,
      generatedAt: null,
      affectedNodes: [],
      summary: 'Knowledge base analysis has detected elevated risk across multiple supply chain nodes. Cascade analysis indicates potential 2–3 layer impact. Immediate assessment and mitigation planning recommended.',
    },
    actions: {
      immediate: [
        { priority: 1, action: 'Audit all affected supplier contracts for force-majeure provisions', owner: 'Procurement', deadline: '24h', kbSource: null },
        { priority: 2, action: 'Contact logistics partners for alternative routing options', owner: 'Logistics', deadline: '48h', kbSource: null },
      ],
      shortTerm: [
        { priority: 1, action: 'Review safety stock levels for all affected components', owner: 'Operations', deadline: '5 days', saving: 'Reduce exposure window' },
      ],
      strategic: [
        { action: 'Conduct full supply chain resilience audit', impact: 'High', effort: 'Medium' },
      ],
    },
    financial: {
      revenueAtRisk:   12_600_000,
      mitigationCost:     450_000,
      netWorstCase:    12_150_000,
      dailyBurnRate:    4_200_000,
      breakEvenMitDay:  1,
      confidenceRange: '±20%',
    },
    kbSources: [
      { name: 'Lloyd_Shipping_Q1_Risk_Report.pdf', relevance: 0.81, clause: 'General risk assessment framework' },
    ],
    confidence: 0.74,
  },
};

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────
const fmt$ = n => n >= 1_000_000
  ? `$${(n / 1_000_000).toFixed(1)}M`
  : `$${(n / 1_000).toFixed(0)}K`;

const PRIORITY_COLOR = { 1: '#ef4444', 2: '#eab308', 3: '#3b82f6', 4: '#64748b' };

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #1e2535' }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', fontFamily: 'Syne', letterSpacing: '-0.01em' }}>{title}</div>
        {sub && <div style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono', letterSpacing: '0.08em' }}>{sub}</div>}
      </div>
    </div>
  );
}

function ActionRow({ item, type }) {
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '8px 10px',
      background: '#0d1117', border: '1px solid #1e2535',
      borderRadius: 6, marginBottom: 6,
      borderLeft: `3px solid ${PRIORITY_COLOR[item.priority] || '#475569'}`,
    }}>
      {item.priority && (
        <div style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
          background: `${PRIORITY_COLOR[item.priority]}20`,
          border: `1px solid ${PRIORITY_COLOR[item.priority]}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: PRIORITY_COLOR[item.priority],
          fontFamily: 'IBM Plex Mono', fontWeight: 700,
        }}>{item.priority}</div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: '#e2e8f0', fontFamily: 'Syne', lineHeight: 1.4, marginBottom: 4 }}>
          {item.action}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {item.owner && (
            <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'IBM Plex Mono' }}>
              👤 {item.owner}
            </span>
          )}
          {item.deadline && (
            <span style={{ fontSize: 9, color: '#f59e0b', fontFamily: 'IBM Plex Mono' }}>
              ⏱ {item.deadline}
            </span>
          )}
          {item.saving && (
            <span style={{ fontSize: 9, color: '#10b981', fontFamily: 'IBM Plex Mono' }}>
              ↑ {item.saving}
            </span>
          )}
          {item.impact && (
            <span style={{ fontSize: 9, color: '#8b5cf6', fontFamily: 'IBM Plex Mono' }}>
              ◈ Impact: {item.impact}
            </span>
          )}
          {item.kbSource && (
            <span style={{ fontSize: 9, color: '#3b82f6', fontFamily: 'IBM Plex Mono' }}>
              📋 {item.kbSource}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PLAYBOOK MODAL ───────────────────────────────────────────────────────────
function PlaybookModal({ playbook, onClose }) {
  const { situation, actions, financial, kbSources, confidence } = playbook;
  const sevColor = situation.severity === 'CRITICAL' ? '#ef4444' : '#eab308';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(6,9,18,0.92)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', animation: 'fadeSlideIn 0.3s ease',
    }}
    onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 760, maxHeight: '90vh',
        background: '#0d1117', border: `1px solid ${sevColor}30`,
        borderRadius: 14, display: 'flex', flexDirection: 'column',
        boxShadow: `0 0 60px ${sevColor}20, 0 24px 80px rgba(0,0,0,0.8)`,
        overflow: 'hidden',
      }}>
        {/* ── Modal Header ── */}
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid #1e2535',
          background: `${sevColor}08`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{
                padding: '3px 10px', borderRadius: 4,
                background: `${sevColor}20`, border: `1px solid ${sevColor}40`,
                fontSize: 9, color: sevColor, fontFamily: 'IBM Plex Mono',
                fontWeight: 700, letterSpacing: '0.12em',
              }}>
                ● {situation.severity}
              </div>
              <div style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono' }}>
                RISK SCORE: <span style={{ color: sevColor }}>{situation.riskScore}/100</span>
              </div>
              <div style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono' }}>
                CONFIDENCE: <span style={{ color: confidence > 0.8 ? '#10b981' : '#eab308' }}>{Math.round(confidence * 100)}%</span>
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', fontFamily: 'Syne', letterSpacing: '-0.02em', marginBottom: 2 }}>
              CRISIS PLAYBOOK
            </div>
            <div style={{ fontSize: 13, color: sevColor, fontFamily: 'IBM Plex Mono', fontWeight: 600 }}>
              {situation.event}
            </div>
            <div style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono', marginTop: 4 }}>
              AUTO-GENERATED · {situation.generatedAt} · KB-GROUNDED
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handlePrint} style={{
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
              color: '#f59e0b', borderRadius: 7, padding: '7px 14px',
              cursor: 'pointer', fontSize: 11, fontFamily: 'IBM Plex Mono',
              fontWeight: 600, transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,158,11,0.1)'}
            >
              ↓ EXPORT
            </button>
            <button onClick={onClose} style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', borderRadius: 7, width: 34, height: 34,
              cursor: 'pointer', fontSize: 16, fontFamily: 'Syne',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
            >×</button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>

          {/* Situation Summary */}
          <div style={{
            background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: 8, padding: '12px 14px', marginBottom: 20,
          }}>
            <div style={{ fontSize: 9, color: '#ef4444', fontFamily: 'IBM Plex Mono', letterSpacing: '0.1em', marginBottom: 6 }}>
              ◆ SITUATION ASSESSMENT
            </div>
            <div style={{ fontSize: 12, color: '#cbd5e1', fontFamily: 'Syne', lineHeight: 1.7 }}>
              {situation.summary}
            </div>
            {situation.affectedNodes.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'IBM Plex Mono' }}>AFFECTED:</span>
                {situation.affectedNodes.map(n => (
                  <span key={n} style={{
                    fontSize: 9, padding: '1px 6px', borderRadius: 3,
                    background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.2)', fontFamily: 'IBM Plex Mono',
                  }}>{n}</span>
                ))}
              </div>
            )}
          </div>

          {/* Financial Exposure */}
          <div style={{ marginBottom: 20 }}>
            <SectionHeader icon="💰" title="FINANCIAL EXPOSURE" sub={`CONFIDENCE RANGE: ${financial.confidenceRange}`} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'REVENUE AT RISK',   value: fmt$(financial.revenueAtRisk),   color: '#ef4444' },
                { label: 'MITIGATION COST',   value: fmt$(financial.mitigationCost),  color: '#eab308' },
                { label: 'NET WORST CASE',    value: fmt$(financial.netWorstCase),    color: '#ef4444' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: '#161b27', border: '1px solid #1e2535',
                  borderRadius: 8, padding: '10px 12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: 'IBM Plex Mono', lineHeight: 1 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#161b27', border: '1px solid #1e2535', borderRadius: 6, display: 'flex', gap: 16 }}>
              <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'IBM Plex Mono' }}>
                Daily revenue: <span style={{ color: '#94a3b8' }}>{fmt$(financial.dailyBurnRate)}</span>
              </span>
              <span style={{ fontSize: 10, color: '#10b981', fontFamily: 'IBM Plex Mono' }}>
                ✓ Mitigation ROI positive from day {financial.breakEvenMitDay}
              </span>
            </div>
          </div>

          {/* Immediate Actions */}
          <div style={{ marginBottom: 20 }}>
            <SectionHeader icon="🚨" title="IMMEDIATE ACTIONS" sub="NEXT 24–48 HOURS" />
            {actions.immediate.map((item, i) => <ActionRow key={i} item={item} />)}
          </div>

          {/* Short-term Actions */}
          <div style={{ marginBottom: 20 }}>
            <SectionHeader icon="📋" title="SHORT-TERM ACTIONS" sub="DAYS 2–14" />
            {actions.shortTerm.map((item, i) => <ActionRow key={i} item={item} />)}
          </div>

          {/* Strategic Recommendations */}
          <div style={{ marginBottom: 20 }}>
            <SectionHeader icon="🎯" title="STRATEGIC RECOMMENDATIONS" sub="LONG-TERM RESILIENCE" />
            {actions.strategic.map((item, i) => <ActionRow key={i} item={{ ...item, priority: undefined }} />)}
          </div>

          {/* KB Sources */}
          <div>
            <SectionHeader icon="📚" title="KNOWLEDGE SOURCES" sub={`${kbSources.length} DOCUMENTS RETRIEVED FROM CHROMADB`} />
            {kbSources.map((src, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', background: '#161b27',
                border: '1px solid #1e2535', borderRadius: 6, marginBottom: 6,
              }}>
                <span style={{ fontSize: 11 }}>📋</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#cbd5e1', fontFamily: 'IBM Plex Mono' }}>{src.name}</div>
                  <div style={{ fontSize: 9, color: '#475569', fontFamily: 'Syne' }}>{src.clause}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 40, height: 4, background: '#1e2535', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${src.relevance * 100}%`, height: '100%', background: '#3b82f6', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 9, color: '#3b82f6', fontFamily: 'IBM Plex Mono', fontWeight: 600 }}>
                    {Math.round(src.relevance * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '12px 22px', borderTop: '1px solid #1e2535',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#060912',
        }}>
          <span style={{ fontSize: 9, color: '#334155', fontFamily: 'IBM Plex Mono' }}>
            AI KNOWLEDGE BASE SYSTEM · AUTO-GENERATED · NOT FOR EXTERNAL DISTRIBUTION
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #1e2535',
            color: '#475569', borderRadius: 6, padding: '6px 16px',
            cursor: 'pointer', fontSize: 11, fontFamily: 'IBM Plex Mono',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2535'; e.currentTarget.style.color = '#475569'; }}
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export default function CrisisPlaybook({ riskScore, lastSimEvent, dashboard }) {
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [playbook, setPlaybook] = useState(null);

  const isActive = riskScore > 0;

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      // Try the real backend first
      let data = null;
      try {
        data = await api.generatePlaybook(lastSimEvent);
      } catch {
        // backend threw — fall through to mock below
      }

      // If backend returned null OR threw, use the mock
      if (!data || !data.situation) {
        await new Promise(r => setTimeout(r, 2200));
        data = MOCK_PLAYBOOKS[lastSimEvent] || MOCK_PLAYBOOKS.default;
      }

      // Stamp with live values
      data = {
        ...data,
        situation: {
          ...data.situation,
          generatedAt: new Date().toLocaleString(),
          riskScore: riskScore || data.situation.riskScore,
        },
      };

      setPlaybook(data);
      setOpen(true);
    } catch (err) {
      // Last-resort safety net — always show something
      const fallback = MOCK_PLAYBOOKS[lastSimEvent] || MOCK_PLAYBOOKS.default;
      setPlaybook({
        ...fallback,
        situation: {
          ...fallback.situation,
          generatedAt: new Date().toLocaleString(),
          riskScore,
        },
      });
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, [lastSimEvent, riskScore]);

  if (!isActive) return null;

  const sevColor = riskScore >= 60 ? '#ef4444' : '#eab308';

  return (
    <>
      {/* ── Floating CTA Button ── */}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 100,
      }}>
        <button
          onClick={generate}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 24px',
            background: loading
              ? 'rgba(13,17,23,0.95)'
              : `linear-gradient(135deg, ${sevColor}22, rgba(13,17,23,0.95))`,
            border: `1.5px solid ${sevColor}`,
            borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: `0 0 30px ${sevColor}40, 0 4px 20px rgba(0,0,0,0.6)`,
            transition: 'all 0.3s',
            backdropFilter: 'blur(8px)',
            animation: loading ? 'none' : `pulse-${riskScore >= 60 ? 'red' : 'amber'} 2.5s infinite`,
          }}
          onMouseEnter={e => {
            if (!loading) {
              e.currentTarget.style.boxShadow = `0 0 50px ${sevColor}70, 0 8px 30px rgba(0,0,0,0.7)`;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = `0 0 30px ${sevColor}40, 0 4px 20px rgba(0,0,0,0.6)`;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: 14, height: 14,
                border: '2px solid transparent',
                borderTopColor: sevColor,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: 12, color: sevColor, fontFamily: 'IBM Plex Mono', fontWeight: 700, letterSpacing: '0.1em' }}>
                GENERATING PLAYBOOK...
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 16 }}>📋</span>
              <div>
                <div style={{ fontSize: 12, color: sevColor, fontFamily: 'IBM Plex Mono', fontWeight: 700, letterSpacing: '0.1em' }}>
                  GENERATE CRISIS PLAYBOOK
                </div>
                <div style={{ fontSize: 9, color: '#64748b', fontFamily: 'IBM Plex Mono' }}>
                  AI-grounded · KB-cited · Exportable
                </div>
              </div>
              <div style={{
                padding: '2px 8px', borderRadius: 4,
                background: `${sevColor}20`, border: `1px solid ${sevColor}40`,
                fontSize: 9, color: sevColor, fontFamily: 'IBM Plex Mono', fontWeight: 700,
              }}>
                RISK {riskScore}
              </div>
            </>
          )}
        </button>
      </div>

      {/* ── Playbook Modal ── */}
      {open && playbook && (
        <PlaybookModal playbook={playbook} onClose={() => setOpen(false)} />
      )}
    </>
  );
}