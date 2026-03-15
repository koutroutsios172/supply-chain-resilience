import { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';

const SUGGESTIONS = [
  'How does bad weather in Port Shanghai affect our products?',
  'What happens if the memory chip supply is disrupted?',
  'Which products are most at risk from a port strike?',
  'Show the critical path for Smartphone X1',
];

const TYPE_ICON  = { contract:'📋', news:'📰', report:'📊', technical:'⚙️', audit:'🔍', pdf:'📋', txt:'📰', default:'📄' };
const TYPE_COLOR = { contract:'#3b82f6', news:'#ec4899', report:'#f59e0b', technical:'#8b5cf6', audit:'#06b6d4' };

// ─── RAG SOURCES PANEL ────────────────────────────────────────────────────────
function RagSourcesPanel({ sources, graphPaths, isRetrieving }) {
  if (!isRetrieving && (!sources?.length)) return null;

  return (
    <div style={{
      background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.15)',
      borderRadius:8, padding:'10px 12px', marginBottom:8, animation:'fadeSlideIn 0.3s ease',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:'#3b82f6',
          animation: isRetrieving ? 'pulse-amber 1s infinite' : 'none' }} />
        <span style={{ fontSize:9, color:'#3b82f6', fontFamily:'IBM Plex Mono', fontWeight:600, letterSpacing:'0.1em' }}>
          {isRetrieving ? 'RETRIEVING FROM KNOWLEDGE BASE...' : `KNOWLEDGE RETRIEVED — ${sources.length} sources`}
        </span>
      </div>

      {isRetrieving ? (
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {['Querying ChromaDB vector store...', 'Ranking by semantic similarity...', 'Loading graph context...'].map((s,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:10, height:10, border:'1.5px solid transparent', borderTopColor:'#3b82f6', borderRadius:'50%', animation:`spin ${0.8+i*0.2}s linear infinite` }} />
              <span style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono' }}>{s}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Document sources */}
          <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom: graphPaths?.length ? 8 : 0 }}>
            {sources.map((src, i) => (
              <div key={i} style={{ background:'#0d1117', border:'1px solid #1e2535', borderRadius:6, padding:'7px 10px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                  <span style={{ fontSize:11 }}>{TYPE_ICON[src.type] || TYPE_ICON.default}</span>
                  <span style={{ fontSize:10, color:'#cbd5e1', fontFamily:'IBM Plex Mono', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{src.name}</span>
                  {/* Similarity score bar */}
                  <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                    <div style={{ width:36, height:4, background:'#1e2535', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ width:`${src.similarity*100}%`, height:'100%', background: TYPE_COLOR[src.type]||'#64748b', borderRadius:2 }} />
                    </div>
                    <span style={{ fontSize:9, color:TYPE_COLOR[src.type]||'#64748b', fontFamily:'IBM Plex Mono', fontWeight:600, minWidth:28 }}>
                      {(src.similarity*100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                {src.excerpt && (
                  <div style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono', lineHeight:1.5,
                    display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                    "{src.excerpt.slice(0,120)}..."
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Graph paths */}
          {graphPaths?.length > 0 && (
            <div>
              <div style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono', letterSpacing:'0.08em', marginBottom:5 }}>
                GRAPH TRAVERSAL PATHS
              </div>
              {graphPaths.map((path, i) => (
                <div key={i} style={{ fontSize:9, color:'#f59e0b', fontFamily:'IBM Plex Mono', marginBottom:3, padding:'3px 8px', background:'rgba(245,158,11,0.06)', borderRadius:4, border:'1px solid rgba(245,158,11,0.1)' }}>
                  {path.split('→').map((node, j, arr) => (
                    <span key={j}>
                      <span style={{ color: j===0?'#ec4899':j===arr.length-1?'#10b981':'#f59e0b' }}>{node.trim()}</span>
                      {j < arr.length-1 && <span style={{ color:'#334155', margin:'0 4px' }}>→</span>}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── CONFIDENCE BADGE ─────────────────────────────────────────────────────────
function ConfidenceBadge({ score, severity }) {
  if (score === undefined || score === null) return null;
  const pct = Math.round(score * 100);
  const isUncertain = severity === 'uncertain' || score < 0.65;
  const color = isUncertain ? '#64748b' : severity==='critical' ? '#ef4444' : severity==='warning' ? '#eab308' : '#10b981';
  const label = isUncertain ? 'LOW CONFIDENCE' : pct>=90 ? 'HIGH CONFIDENCE' : pct>=75 ? 'MODERATE' : 'UNCERTAIN';
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'3px 8px', borderRadius:5, background:`${color}12`, border:`1px solid ${color}30`, marginTop:4 }}>
      <div style={{ width:30, height:4, background:'#1e2535', borderRadius:2, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:2, boxShadow:`0 0 4px ${color}`, transition:'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize:9, color, fontFamily:'IBM Plex Mono', fontWeight:600, letterSpacing:'0.06em' }}>
        {pct}% — {label}
      </span>
    </div>
  );
}

// ─── FINANCIAL INLINE ─────────────────────────────────────────────────────────
function FinancialInline({ impact, recovery }) {
  if (!impact) return null;
  const fmt = n => n>=1e6 ? `$${(n/1e6).toFixed(1)}M` : `$${(n/1e3).toFixed(0)}K`;
  return (
    <div style={{ display:'flex', gap:8, marginTop:6, flexWrap:'wrap' }}>
      <span style={{ fontSize:10, color:'#ef4444', fontFamily:'IBM Plex Mono', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', padding:'2px 8px', borderRadius:4 }}>
        💰 {fmt(impact)} at risk
      </span>
      {recovery > 0 && (
        <span style={{ fontSize:10, color:'#eab308', fontFamily:'IBM Plex Mono', background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.2)', padding:'2px 8px', borderRadius:4 }}>
          ⏱ TTR: {recovery} days
        </span>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function QueryPanel({ onHighlightNodes }) {
  const [messages, setMessages] = useState([{
    role:'system',
    content:'AI Knowledge Base Engine ready. I retrieve from ChromaDB, reason across the graph, and return validated answers with confidence scores.',
  }]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [retrieving, setRetrieving] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const handleQuery = async (text) => {
    const q = (text || input).trim();
    if (!q) return;
    setInput('');
    setMessages(prev => [...prev, { role:'user', content:q }]);
    setLoading(true);

    // Show retrieval animation first
    setMessages(prev => [...prev, { role:'retrieving', id:'__retrieving__' }]);
    setRetrieving(true);
    await new Promise(r => setTimeout(r, 1100));

    try {
      const res = await api.query(q);
      setRetrieving(false);
      // Replace retrieving placeholder with actual response
      setMessages(prev => [
        ...prev.filter(m => m.id !== '__retrieving__'),
        {
          role:'assistant',
          content:res.explanation,
          affectedNodes:res.affectedNodes || res.affected_nodes,
          severity:res.severity,
          confidence:res.confidence,
          ragSources:res.ragSources,
          graphPaths:res.graphPaths,
          financialImpact:res.financialImpactUsd || res.financial_impact_usd,
          recoveryDays:res.estimatedRecoveryDays || res.estimated_recovery_days,
        },
      ]);
      const ids = res.affectedNodes || res.affected_nodes || [];
      if (ids.length && res.severity !== 'uncertain') onHighlightNodes?.(ids);
    } catch {
      setMessages(prev => [...prev.filter(m=>m.id!=='__retrieving__'), {
        role:'assistant', content:'Knowledge base query failed.', severity:'error', confidence:0,
      }]);
    }
    setLoading(false);
    setRetrieving(false);
  };

  const sevColor = { warning:'#eab308', critical:'#ef4444', error:'#ef4444', healthy:'#10b981', uncertain:'#64748b' };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Header */}
      <div className="panel-header">
        <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 6px #10b981' }} />
        <span style={{ fontSize:11, fontFamily:'IBM Plex Mono', fontWeight:600, color:'#94a3b8', letterSpacing:'0.08em' }}>
          AI QUERY ENGINE
        </span>
        <span style={{ marginLeft:'auto', fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono' }}>RAG + KG</span>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'10px 12px', display:'flex', flexDirection:'column', gap:10 }}>
        {messages.map((msg, i) => (
          <div key={i} className="animate-fade-slide">
            {msg.role === 'system' && (
              <div style={{ padding:'8px 12px', background:'rgba(6,182,212,0.06)', border:'1px solid rgba(6,182,212,0.15)', borderRadius:6, fontSize:11, color:'#94a3b8', fontFamily:'IBM Plex Mono', lineHeight:1.5 }}>
                <span style={{ color:'#06b6d4', marginRight:6 }}>KB »</span>{msg.content}
              </div>
            )}

            {msg.role === 'user' && (
              <div style={{ alignSelf:'flex-end', maxWidth:'90%', marginLeft:'auto' }}>
                <div style={{ fontSize:9, color:'#f59e0b', fontFamily:'IBM Plex Mono', marginBottom:3, textAlign:'right', letterSpacing:'0.05em' }}>YOU</div>
                <div className="message-user" style={{ padding:'8px 12px', fontSize:12, color:'#e2e8f0', lineHeight:1.5 }}>{msg.content}</div>
              </div>
            )}

            {msg.role === 'retrieving' && (
              <div style={{ maxWidth:'95%' }}>
                <RagSourcesPanel sources={[]} graphPaths={[]} isRetrieving={true} />
              </div>
            )}

            {msg.role === 'assistant' && (
              <div style={{ maxWidth:'95%' }}>
                <div style={{ fontSize:9, color:'#94a3b8', fontFamily:'IBM Plex Mono', marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ color:'#f59e0b' }}>◆</span> KB ENGINE
                  {msg.severity && (
                    <span style={{ padding:'1px 6px', borderRadius:3, fontSize:9, fontWeight:600, background:`${sevColor[msg.severity]}20`, color:sevColor[msg.severity], border:`1px solid ${sevColor[msg.severity]}40` }}>
                      {msg.severity?.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* RAG sources — shown ABOVE the answer */}
                {msg.ragSources?.length > 0 && (
                  <RagSourcesPanel sources={msg.ragSources} graphPaths={msg.graphPaths} isRetrieving={false} />
                )}

                <div className="message-ai" style={{ padding:'10px 12px', fontSize:12, color:'#cbd5e1', lineHeight:1.6, whiteSpace:'pre-line' }}>
                  {msg.content}
                </div>

                <ConfidenceBadge score={msg.confidence} severity={msg.severity} />
                <FinancialInline impact={msg.financialImpact} recovery={msg.recoveryDays} />

                {msg.affectedNodes?.length > 0 && (
                  <div style={{ marginTop:6, display:'flex', gap:4, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:9, color:'#64748b', fontFamily:'IBM Plex Mono' }}>NODES:</span>
                    {msg.affectedNodes.map(n => (
                      <span key={n} style={{ fontSize:9, padding:'1px 6px', borderRadius:3, background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.2)', fontFamily:'IBM Plex Mono' }}>{n}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div style={{ padding:'8px 12px', borderTop:'1px solid #1e2535' }}>
        <div style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono', marginBottom:5, letterSpacing:'0.08em' }}>TRY ASKING</div>
        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
          {SUGGESTIONS.slice(0,2).map((s,i) => (
            <button key={i} onClick={() => handleQuery(s)} disabled={loading} style={{
              background:'rgba(245,158,11,0.04)', border:'1px solid rgba(245,158,11,0.1)',
              borderRadius:5, padding:'5px 8px', textAlign:'left', fontSize:10, color:'#94a3b8',
              cursor:'pointer', transition:'all 0.2s', fontFamily:'Syne',
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={e=>{ if(!loading){ e.target.style.borderColor='rgba(245,158,11,0.3)'; e.target.style.color='#f59e0b'; }}}
            onMouseLeave={e=>{ e.target.style.borderColor='rgba(245,158,11,0.1)'; e.target.style.color='#94a3b8'; }}
            >↗ {s}</button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding:'10px 12px', borderTop:'1px solid #1e2535', display:'flex', gap:8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&handleQuery()}
          placeholder="Query the knowledge base..." disabled={loading}
          style={{ flex:1, background:'#161b27', border:'1px solid #1e2535', borderRadius:6, padding:'8px 12px', fontSize:12, color:'#e2e8f0', outline:'none', fontFamily:'Syne', transition:'border-color 0.2s' }}
          onFocus={e=>e.target.style.borderColor='rgba(245,158,11,0.5)'}
          onBlur={e=>e.target.style.borderColor='#1e2535'}
        />
        <button onClick={()=>handleQuery()} disabled={loading||!input.trim()} className="btn-primary"
          style={{ padding:'8px 14px', borderRadius:6, border:'none', cursor:loading||!input.trim()?'not-allowed':'pointer', fontSize:12, opacity:loading||!input.trim()?0.5:1 }}>
          ⌥
        </button>
      </div>
    </div>
  );
}
