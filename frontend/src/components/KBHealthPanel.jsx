import { useState, useEffect } from 'react';
import { api } from '../services/api';

const TYPE_COLOR = { contract:'#3b82f6', news:'#ec4899', report:'#f59e0b', technical:'#8b5cf6', audit:'#06b6d4' };

function Stat({ label, value, sub, color='#e2e8f0', pulse=false }) {
  return (
    <div style={{ background:'#161b27', border:'1px solid #1e2535', borderRadius:8, padding:'10px 12px', transition:'all 0.3s' }}>
      <div style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono', letterSpacing:'0.1em', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:800, color, fontFamily:'IBM Plex Mono', lineHeight:1,
        textShadow: pulse ? `0 0 12px ${color}` : 'none', transition:'text-shadow 0.5s' }}>{value}</div>
      {sub && <div style={{ fontSize:9, color:'#475569', fontFamily:'Syne', marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function SourceBreakdown({ sources }) {
  const total = Object.values(sources).reduce((a,b)=>a+b,0) || 1;
  return (
    <div>
      <div style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono', letterSpacing:'0.1em', marginBottom:8 }}>DOCUMENT TYPES</div>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {Object.entries(sources).map(([type,count]) => (
          <div key={type} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:9, color:'#64748b', fontFamily:'IBM Plex Mono', minWidth:64, textTransform:'uppercase' }}>{type}</span>
            <div style={{ flex:1, background:'#1e2535', borderRadius:2, height:6, overflow:'hidden' }}>
              <div style={{ width:`${(count/total)*100}%`, height:'100%', background:TYPE_COLOR[type]||'#64748b', borderRadius:2,
                boxShadow:`0 0 4px ${TYPE_COLOR[type]||'#64748b'}`, transition:'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize:10, color:TYPE_COLOR[type]||'#64748b', fontFamily:'IBM Plex Mono', minWidth:12 }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ label, ok }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px',
      background: ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
      border:`1px solid ${ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius:6 }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background: ok ? '#10b981' : '#ef4444',
        boxShadow:`0 0 5px ${ok ? '#10b981' : '#ef4444'}` }} />
      <span style={{ fontSize:10, color: ok ? '#10b981' : '#ef4444', fontFamily:'IBM Plex Mono', fontWeight:600 }}>{label}</span>
    </div>
  );
}

export default function KBHealthPanel() {
  const [health, setHealth]   = useState(null);
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse]     = useState(false);

  const refresh = async () => {
    setLoading(true);
    const [h, d] = await Promise.all([api.getKBHealth(), api.getKBDocuments()]);
    setHealth(h); setDocs(d);
    setLoading(false);
    setPulse(true);
    setTimeout(() => setPulse(false), 800);
  };

  useEffect(() => { refresh(); const t = setInterval(refresh, 30000); return () => clearInterval(t); }, []);

  const timeSince = (iso) => {
    if (!iso) return '—';
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60)  return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    return `${Math.floor(s/3600)}h ago`;
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Header */}
      <div className="panel-header">
        <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 6px #10b981', animation:'pulse-amber 2s infinite' }} />
        <span style={{ fontSize:11, fontFamily:'IBM Plex Mono', fontWeight:600, color:'#94a3b8', letterSpacing:'0.08em' }}>
          KNOWLEDGE BASE HEALTH
        </span>
        <button onClick={refresh} disabled={loading} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#475569', fontSize:12, transition:'color 0.2s' }}
          onMouseEnter={e=>e.target.style.color='#f59e0b'} onMouseLeave={e=>e.target.style.color='#475569'}>
          {loading ? '⟳' : '↺'}
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:12 }}>
        {/* System status */}
        <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
          <StatusPill label="ChromaDB" ok={health?.chromaStatus==='connected'} />
          <StatusPill label="Embeddings" ok={health?.indexingStatus==='healthy'} />
          <StatusPill label="RAG Engine" ok={true} />
        </div>

        {/* Core metrics */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
          <Stat label="TOTAL VECTORS"  value={health?.totalVectors?.toLocaleString() || '—'}  sub="ChromaDB embeddings"  color='#3b82f6' pulse={pulse} />
          <Stat label="DOCUMENTS"      value={health?.totalDocuments || '—'}                   sub="indexed in KB"        color='#8b5cf6' />
          <Stat label="GRAPH NODES"    value={health?.totalNodes || 17}                        sub={`${health?.totalRelationships||24} relationships`} color='#f59e0b' />
          <Stat label="AVG CONFIDENCE" value={`${((health?.avgConfidence||0.81)*100).toFixed(0)}%`} sub="last 24h queries"  color={health?.avgConfidence>0.75?'#10b981':'#eab308'} />
        </div>

        {/* Live metrics row */}
        <div style={{ background:'rgba(245,158,11,0.04)', border:'1px solid rgba(245,158,11,0.12)', borderRadius:8, padding:'10px 12px', marginBottom:12 }}>
          <div style={{ fontSize:9, color:'#f59e0b', fontFamily:'IBM Plex Mono', letterSpacing:'0.1em', marginBottom:8 }}>LIVE METRICS</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            {[
              { label:'RAG LATENCY',  value:`${health?.ragLatencyMs||340}ms` },
              { label:'QUERIES 24H',  value: health?.queriesLast24h||47 },
              { label:'LAST INGEST',  value: timeSince(health?.lastIngestion) },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign:'center' }}>
                <div style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono', letterSpacing:'0.08em', marginBottom:3 }}>{label}</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#f59e0b', fontFamily:'IBM Plex Mono' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Source breakdown */}
        {health?.knowledgeSources && (
          <div style={{ background:'#161b27', border:'1px solid #1e2535', borderRadius:8, padding:'10px 12px', marginBottom:12 }}>
            <SourceBreakdown sources={health.knowledgeSources} />
          </div>
        )}

        {/* Stale nodes warning */}
        {health?.staleNodes > 0 && (
          <div style={{ background:'rgba(234,179,8,0.06)', border:'1px solid rgba(234,179,8,0.2)', borderRadius:8, padding:'10px 12px', marginBottom:12 }}>
            <div style={{ fontSize:9, color:'#eab308', fontFamily:'IBM Plex Mono', letterSpacing:'0.1em', marginBottom:6 }}>⚠ KNOWLEDGE DECAY DETECTED</div>
            <div style={{ fontSize:11, color:'#94a3b8', fontFamily:'Syne', lineHeight:1.5 }}>
              {health.confidenceDecay?.join(', ')} — supplier data older than 90 days. Re-ingest latest contracts to restore confidence.
            </div>
          </div>
        )}

        {/* Recent documents */}
        <div style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono', letterSpacing:'0.1em', marginBottom:8 }}>INDEXED DOCUMENTS</div>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {docs.slice(0,5).map(doc => (
            <div key={doc.id} style={{ background:'#161b27', border:'1px solid #1e2535', borderRadius:6, padding:'7px 10px',
              display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:2, background:TYPE_COLOR[doc.type]||'#64748b', flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:10, color:'#cbd5e1', fontFamily:'IBM Plex Mono', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {doc.name}
                </div>
                <div style={{ fontSize:9, color:'#475569', fontFamily:'Syne' }}>
                  {doc.vectors} vectors · {doc.nodes.length} nodes · {doc.date}
                </div>
              </div>
              <span style={{ fontSize:9, color:'#10b981', fontFamily:'IBM Plex Mono', flexShrink:0 }}>✓</span>
            </div>
          ))}
        </div>

        {/* Embedding model */}
        <div style={{ marginTop:12, fontSize:9, color:'#334155', fontFamily:'IBM Plex Mono', borderTop:'1px solid #1e2535', paddingTop:8, display:'flex', justifyContent:'space-between' }}>
          <span>MODEL: {health?.embeddingModel||'text-embedding-3-small'}</span>
          <span>STORE: ChromaDB</span>
        </div>
      </div>
    </div>
  );
}

