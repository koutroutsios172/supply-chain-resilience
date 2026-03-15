import { useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

// ─── NODE ICONS ───────────────────────────────────────────────────────────────
const NodeIcon = ({ type }) => {
  const icons = {
    supplier: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    ),
    component: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
      </svg>
    ),
    product: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      </svg>
    ),
    factory: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 20a2 2 0 002 2h16a2 2 0 002-2V8l-7 5V8l-7 5V4a2 2 0 00-2-2H4a2 2 0 00-2 2z"/>
      </svg>
    ),
    port: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22V8"/><path d="M5 12H2a10 10 0 0020 0h-3"/><path d="M12 8a4 4 0 100-8 4 4 0 000 8z"/>
      </svg>
    ),
  };
  return icons[type] || null;
};

// ─── STATUS COLORS ────────────────────────────────────────────────────────────
const statusConfig = {
  healthy: { border: '#10b981', bg: 'rgba(16,185,129,0.08)', dot: '#10b981', text: '#10b981', glow: 'rgba(16,185,129,0.4)' },
  warning: { border: '#eab308', bg: 'rgba(234,179,8,0.08)', dot: '#eab308', text: '#eab308', glow: 'rgba(234,179,8,0.4)' },
  critical: { border: '#ef4444', bg: 'rgba(239,68,68,0.1)', dot: '#ef4444', text: '#ef4444', glow: 'rgba(239,68,68,0.6)' },
};

const typeConfig = {
  supplier: { accent: '#3b82f6', label: 'SUP' },
  component: { accent: '#8b5cf6', label: 'CMP' },
  product: { accent: '#f59e0b', label: 'PRD' },
  factory: { accent: '#06b6d4', label: 'FAC' },
  port: { accent: '#ec4899', label: 'PRT' },
};

// ─── CUSTOM NODE ──────────────────────────────────────────────────────────────
function SupplyNode({ data, selected }) {
  const status = statusConfig[data.status] || statusConfig.healthy;
  const type = typeConfig[data.nodeType] || typeConfig.supplier;

  return (
    <div
      style={{
        background: status.bg,
        border: `1px solid ${selected ? '#f59e0b' : status.border}`,
        boxShadow: selected
          ? `0 0 0 2px rgba(245,158,11,0.5), 0 0 20px ${status.glow}`
          : `0 0 12px ${status.glow}`,
        borderRadius: 8,
        padding: '8px 12px',
        minWidth: 140,
        transition: 'all 0.3s ease',
        animation: data.status === 'critical' ? 'pulse-red 2s infinite' : 'none',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: status.border, width: 6, height: 6, border: 'none' }} />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div style={{ color: type.accent }}><NodeIcon type={data.nodeType} /></div>
        <span style={{
          fontSize: 9, fontFamily: 'IBM Plex Mono', fontWeight: 600,
          color: type.accent, letterSpacing: '0.1em', textTransform: 'uppercase',
          background: `${type.accent}20`, padding: '1px 5px', borderRadius: 3,
        }}>{type.label}</span>
        <div style={{
          width: 6, height: 6, borderRadius: '50%', background: status.dot,
          marginLeft: 'auto',
          boxShadow: `0 0 6px ${status.glow}`,
        }} />
      </div>

      <div style={{
        fontSize: 12, fontWeight: 600, color: '#e2e8f0',
        fontFamily: 'Syne', lineHeight: 1.3,
      }}>
        {data.label}
      </div>

      {data.status !== 'healthy' && (
        <div style={{
          marginTop: 4, fontSize: 9, fontFamily: 'IBM Plex Mono',
          color: status.text, textTransform: 'uppercase', letterSpacing: '0.08em',
          fontWeight: 500,
        }}>
          ● {data.status}
        </div>
      )}

      <Handle type="source" position={Position.Right} style={{ background: status.border, width: 6, height: 6, border: 'none' }} />
    </div>
  );
}

const nodeTypes = { supplyNode: SupplyNode };

// ─── LAYOUT POSITIONS ─────────────────────────────────────────────────────────
const POSITIONS = {
  'sup-1': { x: 60, y: 60 },
  'sup-2': { x: 60, y: 220 },
  'sup-3': { x: 60, y: 380 },
  'sup-4': { x: 60, y: 540 },
  'comp-1': { x: 290, y: 30 },
  'comp-2': { x: 290, y: 150 },
  'comp-3': { x: 290, y: 260 },
  'comp-4': { x: 290, y: 380 },
  'comp-5': { x: 290, y: 490 },
  'prod-1': { x: 520, y: 80 },
  'prod-2': { x: 520, y: 280 },
  'prod-3': { x: 520, y: 450 },
  'fact-1': { x: 750, y: 160 },
  'fact-2': { x: 750, y: 380 },
  'port-1': { x: 60, y: 700 },
  'port-2': { x: 290, y: 700 },
  'port-3': { x: 520, y: 700 },
};

function transformNodes(rawNodes) {
  return rawNodes.map(n => ({
    id: n.id,
    type: 'supplyNode',
    position: POSITIONS[n.id] || { x: 0, y: 0 },
    data: { ...n.data, nodeType: n.type, status: n.data.status || 'healthy' },
  }));
}

function transformEdges(rawEdges) {
  return rawEdges.map(e => ({
    ...e,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: e.style?.stroke || '#1e2535' },
    style: {
      stroke: e.style?.stroke || '#1e2535',
      strokeWidth: 1.5,
      ...e.style,
    },
    animated: e.animated || false,
  }));
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function GraphView({ graphData, highlightedNodes, onNodeClick }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!graphData?.nodes) return;
    const transformed = transformNodes(graphData.nodes).map(n => ({
      ...n,
      data: {
        ...n.data,
        selected: highlightedNodes?.includes(n.id),
      },
    }));
    setNodes(transformed);
    setEdges(transformEdges(graphData.edges || []));
  }, [graphData, highlightedNodes]);

  const handleNodeClick = useCallback((_, node) => {
    onNodeClick?.(node);
  }, [onNodeClick]);

  return (
    <div className="w-full h-full graph-grid-bg" style={{ position: 'relative' }}>
      {/* Legend */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 10,
        background: 'rgba(13,17,23,0.92)', border: '1px solid #1e2535',
        borderRadius: 8, padding: '10px 14px', backdropFilter: 'blur(8px)',
      }}>
        <div style={{ fontSize: 9, color: '#64748b', fontFamily: 'IBM Plex Mono', letterSpacing: '0.1em', marginBottom: 8 }}>NODE TYPES</div>
        {Object.entries(typeConfig).map(([type, cfg]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: cfg.accent }} />
            <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'IBM Plex Mono', textTransform: 'capitalize' }}>{type}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #1e2535', marginTop: 8, paddingTop: 8 }}>
          <div style={{ fontSize: 9, color: '#64748b', fontFamily: 'IBM Plex Mono', letterSpacing: '0.1em', marginBottom: 6 }}>STATUS</div>
          {Object.entries(statusConfig).map(([s, cfg]) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, boxShadow: `0 0 4px ${cfg.glow}` }} />
              <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'IBM Plex Mono', textTransform: 'capitalize' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#1e2535', strokeWidth: 1.5 },
        }}
      >
        <Background color="#1e2535" gap={40} size={1} />
        <Controls style={{ bottom: 40, left: 16 }} />
        <MiniMap
          nodeStrokeColor={(n) => statusConfig[n.data?.status]?.border || '#1e2535'}
          nodeColor={(n) => statusConfig[n.data?.status]?.bg || '#161b27'}
          style={{ bottom: 40, right: 16, width: 160, height: 100 }}
          maskColor="rgba(6,9,18,0.85)"
        />
      </ReactFlow>
    </div>
  );
}
