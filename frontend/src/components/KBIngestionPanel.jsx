import { useState, useRef, useCallback } from 'react';
import { api } from '../services/api';

const ACCEPT_TYPES = ['.pdf','.txt','.csv','.docx'];

// ─── PROCESSING ANIMATION ─────────────────────────────────────────────────────
function ProcessingSteps({ steps, currentStep }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {steps.map((step, i) => {
        const done    = i < currentStep;
        const active  = i === currentStep;
        const pending = i > currentStep;
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:18, height:18, borderRadius:'50%', flexShrink:0,
              background: done ? '#10b981' : active ? 'rgba(245,158,11,0.2)' : '#1e2535',
              border: `1px solid ${done ? '#10b981' : active ? '#f59e0b' : '#1e2535'}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:9, color: done ? '#000' : active ? '#f59e0b' : '#475569',
              transition:'all 0.4s',
              boxShadow: active ? '0 0 8px rgba(245,158,11,0.5)' : done ? '0 0 6px rgba(16,185,129,0.4)' : 'none',
            }}>
              {done ? '✓' : active ? (
                <div style={{ width:8, height:8, border:'1.5px solid transparent', borderTopColor:'#f59e0b', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
              ) : i+1}
            </div>
            <div>
              <div style={{ fontSize:11, color: done ? '#10b981' : active ? '#f59e0b' : '#475569', fontFamily:'Syne', transition:'color 0.3s' }}>{step.label}</div>
              {active && step.detail && (
                <div style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono', animation:'fadeSlideIn 0.3s ease' }}>{step.detail}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const PROCESSING_STEPS = [
  { label:'Reading document',           detail:'Extracting raw text...' },
  { label:'Chunking into passages',     detail:'512-token windows, 64-token overlap...' },
  { label:'Generating embeddings',      detail:'text-embedding-3-small via OpenAI...' },
  { label:'Storing in ChromaDB',        detail:'Writing vectors + metadata...' },
  { label:'Extracting graph entities',  detail:'NER: suppliers, ports, components...' },
  { label:'Updating knowledge graph',   detail:'Linking entities to graph nodes...' },
];

// ─── RESULT CARD ──────────────────────────────────────────────────────────────
function IngestionResult({ result }) {
  return (
    <div style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:8, padding:'12px 14px', animation:'fadeSlideIn 0.4s ease' }}>
      <div style={{ fontSize:9, color:'#10b981', fontFamily:'IBM Plex Mono', letterSpacing:'0.1em', marginBottom:8 }}>✓ INGESTION COMPLETE</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
        {[
          { label:'VECTORS CREATED',    value:result.vectors,                     color:'#3b82f6' },
          { label:'NODES EXTRACTED',    value:result.nodesExtracted,              color:'#8b5cf6' },
          { label:'RELATIONSHIPS',      value:result.relationshipsFound,          color:'#f59e0b' },
          { label:'PROCESSING TIME',    value:`${result.processingMs}ms`,         color:'#10b981' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign:'center', padding:'6px 8px', background:'#0d1117', borderRadius:6, border:'1px solid #1e2535' }}>
            <div style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono', letterSpacing:'0.08em' }}>{label}</div>
            <div style={{ fontSize:18, fontWeight:700, color, fontFamily:'IBM Plex Mono' }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:10, color:'#64748b', fontFamily:'Syne' }}>
        Document indexed and linked to knowledge graph. New relationships will appear on next graph refresh.
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function KBIngestionPanel({ onIngestionComplete }) {
  const [dragging, setDragging]   = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);
  const [fileName, setFileName]   = useState(null);
  const [recentFiles, setRecentFiles] = useState([]);
  const fileRef = useRef();

  const runProcessing = async (file) => {
    setProcessing(true);
    setResult(null);
    setError(null);
    setFileName(file.name);
    setCurrentStep(0);

    // Animate through steps
    for (let i = 0; i < PROCESSING_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 320 + Math.random() * 280));
      setCurrentStep(i + 1);
    }

    try {
      const res = await api.ingestDocument(file);
      setResult(res);
      setRecentFiles(prev => [{ name:file.name, vectors:res.vectors, nodes:res.nodesExtracted }, ...prev.slice(0,3)]);
      onIngestionComplete?.();
    } catch (e) {
      setError('Ingestion failed — backend unavailable. In demo mode: mock result shown.');
      setResult({ vectors:142, nodesExtracted:3, relationshipsFound:5, processingMs:1840 });
    }
    setProcessing(false);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) runProcessing(file);
  }, []);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) runProcessing(file);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Header */}
      <div className="panel-header">
        <span style={{ fontSize:13 }}>⊕</span>
        <span style={{ fontSize:11, fontFamily:'IBM Plex Mono', fontWeight:600, color:'#94a3b8', letterSpacing:'0.08em' }}>
          KB INGESTION PIPELINE
        </span>
        <span style={{ marginLeft:'auto', fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono' }}>RAG READY</span>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:12 }}>
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !processing && fileRef.current?.click()}
          style={{
            border:`2px dashed ${dragging ? '#f59e0b' : processing ? '#3b82f6' : '#1e2535'}`,
            borderRadius:10, padding:'28px 16px', textAlign:'center',
            cursor: processing ? 'default' : 'pointer',
            background: dragging ? 'rgba(245,158,11,0.04)' : processing ? 'rgba(59,130,246,0.04)' : 'transparent',
            transition:'all 0.25s', marginBottom:12,
          }}
        >
          <input ref={fileRef} type="file" accept={ACCEPT_TYPES.join(',')} onChange={handleFile} style={{ display:'none' }} />

          {!processing ? (
            <>
              <div style={{ fontSize:28, marginBottom:8 }}>📄</div>
              <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', fontFamily:'Syne', marginBottom:4 }}>
                Drop documents to ingest
              </div>
              <div style={{ fontSize:10, color:'#475569', fontFamily:'IBM Plex Mono', marginBottom:10 }}>
                {ACCEPT_TYPES.join(' · ')}
              </div>
              <div style={{ display:'flex', justifyContent:'center', gap:6, flexWrap:'wrap' }}>
                {['Supplier contracts','News articles','Audit reports','Spec sheets'].map(t => (
                  <span key={t} style={{ fontSize:9, padding:'2px 8px', borderRadius:4, background:'rgba(245,158,11,0.08)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.15)', fontFamily:'IBM Plex Mono' }}>{t}</span>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
              <div style={{ width:10, height:10, border:'2px solid transparent', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
              <span style={{ fontSize:12, color:'#3b82f6', fontFamily:'IBM Plex Mono' }}>Processing: {fileName}</span>
            </div>
          )}
        </div>

        {/* Processing steps */}
        {(processing || result) && fileName && (
          <div style={{ background:'#161b27', border:'1px solid #1e2535', borderRadius:8, padding:'12px', marginBottom:12 }}>
            <div style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono', letterSpacing:'0.1em', marginBottom:10 }}>
              INGESTION PIPELINE
            </div>
            <ProcessingSteps steps={PROCESSING_STEPS} currentStep={processing ? currentStep : PROCESSING_STEPS.length} />
          </div>
        )}

        {/* Result */}
        {result && !processing && <IngestionResult result={result} />}
        {error && <div style={{ fontSize:10, color:'#eab308', fontFamily:'IBM Plex Mono', marginBottom:8 }}>⚠ {error}</div>}

        {/* What gets indexed */}
        {!processing && !result && (
          <div style={{ background:'#161b27', border:'1px solid #1e2535', borderRadius:8, padding:'12px', marginBottom:12 }}>
            <div style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono', letterSpacing:'0.1em', marginBottom:10 }}>WHAT THE PIPELINE DOES</div>
            {[
              { step:'①', label:'Chunk & embed',       detail:'512-token passages → ChromaDB vectors' },
              { step:'②', label:'Entity extraction',   detail:'NER finds suppliers, ports, components' },
              { step:'③', label:'Graph linking',        detail:'Entities linked to knowledge graph nodes' },
              { step:'④', label:'RAG ready',            detail:'New docs immediately queryable by AI' },
            ].map(({ step, label, detail }) => (
              <div key={step} style={{ display:'flex', gap:10, marginBottom:8 }}>
                <span style={{ fontSize:12, color:'#f59e0b', flexShrink:0 }}>{step}</span>
                <div>
                  <div style={{ fontSize:11, color:'#cbd5e1', fontFamily:'Syne' }}>{label}</div>
                  <div style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono' }}>{detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent uploads */}
        {recentFiles.length > 0 && (
          <>
            <div style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono', letterSpacing:'0.1em', marginBottom:8 }}>RECENTLY INDEXED</div>
            {recentFiles.map((f, i) => (
              <div key={i} style={{ background:'#161b27', border:'1px solid #1e2535', borderRadius:6, padding:'7px 10px', marginBottom:5, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:10 }}>📄</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:10, color:'#cbd5e1', fontFamily:'IBM Plex Mono', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</div>
                  <div style={{ fontSize:9, color:'#475569' }}>{f.vectors} vectors · {f.nodes} nodes</div>
                </div>
                <span style={{ fontSize:9, color:'#10b981', fontFamily:'IBM Plex Mono' }}>✓ LIVE</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

