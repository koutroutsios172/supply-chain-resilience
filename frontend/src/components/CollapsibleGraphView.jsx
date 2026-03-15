import { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useViewport,
  ReactFlowProvider,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  healthy:  { border: '#10b981', bg: 'rgba(16,185,129,0.08)', glow: 'rgba(16,185,129,0.4)'  },
  warning:  { border: '#eab308', bg: 'rgba(234,179,8,0.08)',  glow: 'rgba(234,179,8,0.4)'   },
  critical: { border: '#ef4444', bg: 'rgba(239,68,68,0.10)',  glow: 'rgba(239,68,68,0.6)'   },
};
const TYPE_COLOR = {
  supplier: '#3b82f6', component: '#8b5cf6',
  product:  '#f59e0b', factory:   '#06b6d4', port: '#ec4899',
};
const REGIONS = ['APAC', 'EMEA', 'AMER'];
const REGION_Y  = { APAC: 60, EMEA: 300, AMER: 540 };

// ─── INDIVIDUAL SUPPLY NODE ───────────────────────────────────────────────────
function SupplyNode({ data, selected }) {
  const sc = STATUS_COLOR[data.status] || STATUS_COLOR.healthy;
  return (
    <div style={{
      background: sc.bg,
      border: `1px solid ${selected ? '#f59e0b' : sc.border}`,
      boxShadow: `0 0 12px ${sc.glow}`,
      borderRadius: 8, padding: '7px 11px', minWidth: 130,
      animation: data.status === 'critical' ? 'pulse-red 2s infinite' : 'none',
      transition: 'all 0.3s',
    }}>
      <Handle type="target" position={Position.Left}
        style={{ background: sc.border, width: 6, height: 6, border: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span style={{
          fontSize: 9, fontFamily: 'IBM Plex Mono', fontWeight: 600,
          color: TYPE_COLOR[data.nodeType] || '#94a3b8',
          background: `${TYPE_COLOR[data.nodeType] || '#94a3b8'}20`,
          padding: '1px 5px', borderRadius: 3, letterSpacing: '0.1em',
        }}>
          {(data.nodeType || 'NODE').toUpperCase().slice(0, 3)}
        </span>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: sc.border, boxShadow: `0 0 5px ${sc.glow}`, marginLeft: 'auto',
        }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', fontFamily: 'Syne' }}>
        {data.label}
      </div>
      <Handle type="source" position={Position.Right}
        style={{ background: sc.border, width: 6, height: 6, border: 'none' }} />
    </div>
  );
}

// ─── GROUP / CLUSTER NODE ─────────────────────────────────────────────────────
function GroupNode({ data }) {
  const worstStatus =
    data.children?.some(c => c.status === 'critical') ? 'critical'
    : data.children?.some(c => c.status === 'warning')  ? 'warning'
    : 'healthy';
  const sc = STATUS_COLOR[worstStatus];
  const critCount = data.children?.filter(c => c.status === 'critical').length || 0;
  const warnCount = data.children?.filter(c => c.status === 'warning').length  || 0;
  const okCount   = (data.children?.length || 0) - critCount - warnCount;

  return (
    <div
      onClick={data.onToggle}
      style={{
        background: sc.bg,
        border: `2px solid ${sc.border}`,
        boxShadow: `0 0 24px ${sc.glow}, inset 0 0 30px rgba(0,0,0,0.25)`,
        borderRadius: 12, padding: '12px 16px', minWidth: 190,
        cursor: 'pointer', transition: 'all 0.3s', position: 'relative', overflow: 'hidden',
      }}
    >
      {/* subtle grid texture */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage:
          'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 14px),' +
          'repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 14px)',
        pointerEvents: 'none',
      }} />

      <Handle type="target" position={Position.Left}
        style={{ background: sc.border, width: 8, height: 8, border: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          fontSize: 9, color: '#f59e0b', fontFamily: 'IBM Plex Mono',
          letterSpacing: '0.15em', fontWeight: 700,
        }}>◈ {data.region}</span>
        <span style={{
          marginLeft: 'auto', fontSize: 9, color: '#475569',
          fontFamily: 'IBM Plex Mono', border: '1px solid #1e2535',
          padding: '1px 6px', borderRadius: 3,
        }}>
          {data.expanded ? '− collapse' : '+ expand'}
        </span>
      </div>

      <div style={{
        fontSize: 24, fontWeight: 800, color: '#e2e8f0',
        fontFamily: 'IBM Plex Mono', lineHeight: 1, marginBottom: 8,
      }}>
        {data.children?.length}
        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginLeft: 5 }}>
          suppliers
        </span>
      </div>

      {/* status bar */}
      <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', gap: 2 }}>
        {okCount   > 0 && <div style={{ flex: okCount,   background: '#10b981', boxShadow: '0 0 4px rgba(16,185,129,0.7)' }} />}
        {warnCount > 0 && <div style={{ flex: warnCount, background: '#eab308' }} />}
        {critCount > 0 && <div style={{ flex: critCount, background: '#ef4444', animation: 'pulse-red 1.5s infinite' }} />}
      </div>

      {critCount > 0 && (
        <div style={{ marginTop: 6, fontSize: 10, color: '#ef4444',
          fontFamily: 'IBM Plex Mono', fontWeight: 600 }}>
          ● {critCount} CRITICAL
        </div>
      )}

      <Handle type="source" position={Position.Right}
        style={{ background: sc.border, width: 8, height: 8, border: 'none' }} />
    </div>
  );
}

const nodeTypes = { supplyNode: SupplyNode, groupNode: GroupNode };

// ─── MOCK LARGE DATASET ───────────────────────────────────────────────────────
// In production, replace with paginated API calls.
function generateLargeDataset(count = 90) {
  const statuses = ['healthy', 'healthy', 'healthy', 'warning', 'critical'];
  const suppliers = Array.from({ length: count }, (_, i) => ({
    id: `sup-${i}`,
    region: REGIONS[i % 3],
    data: {
      label: `Supplier ${i + 1}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      nodeType: 'supplier',
    },
  }));
  const components = Array.from({ length: 18 }, (_, i) => ({
    id: `comp-${i}`,
    data: { label: `Component ${i + 1}`, status: 'healthy', nodeType: 'component' },
  }));
  return { suppliers, components };
}

// ─── NODE / EDGE BUILDER ──────────────────────────────────────────────────────
function buildGraph(suppliers, components, expandedGroups, toggleGroup) {
  const nodes = [];
  const edges = [];

  REGIONS.forEach(region => {
    const regionSuppliers = suppliers.filter(s => s.region === region);
    const expanded = expandedGroups.has(region);

    if (!expanded) {
      // ── Collapsed group node ──
      nodes.push({
        id: `group-${region}`,
        type: 'groupNode',
        position: { x: 60, y: REGION_Y[region] },
        data: {
          region,
          children: regionSuppliers.map(s => s.data),
          expanded: false,
          onToggle: () => toggleGroup(region),
        },
      });
      // Connect group → first 3 visible components
      components.slice(0, 3).forEach(comp => {
        edges.push({
          id: `e-grp-${region}-${comp.id}`,
          source: `group-${region}`, target: comp.id,
          type: 'smoothstep',
          style: { stroke: '#1e2535', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#1e2535' },
        });
      });
    } else {
      // ── Expanded: individual supplier nodes ──
      regionSuppliers.forEach((s, i) => {
        nodes.push({
          id: s.id, type: 'supplyNode',
          position: { x: 60 + (i % 3) * 170, y: REGION_Y[region] + Math.floor(i / 3) * 75 },
          data: { ...s.data },
        });
        // Edge to a component
        const targetComp = `comp-${i % components.length}`;
        edges.push({
          id: `e-${s.id}-${targetComp}`,
          source: s.id, target: targetComp,
          type: 'smoothstep',
          style: { stroke: '#1e2535', strokeWidth: 1 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#1e2535' },
        });
      });
      // Collapse control header
      nodes.push({
        id: `group-${region}-ctrl`,
        type: 'groupNode',
        position: { x: 55, y: REGION_Y[region] - 75 },
        data: {
          region: `${region} ▾`,
          children: regionSuppliers.map(s => s.data),
          expanded: true,
          onToggle: () => toggleGroup(region),
        },
      });
    }
  });

  // VIRTUAL VIEWPORT: only render the first 12 components
  // In production: filter by viewport bounds using a spatial index.
  components.slice(0, 12).forEach((comp, i) => {
    nodes.push({
      id: comp.id, type: 'supplyNode',
      position: { x: 580, y: 60 + i * 68 },
      data: { ...comp.data },
    });
  });

  return { nodes, edges };
}

// ─── LOD INDICATOR ───────────────────────────────────────────────────────────
function LodIndicator() {
  const { zoom } = useViewport();
  const level = zoom < 0.4 ? 'OVERVIEW' : zoom < 0.7 ? 'REGION' : 'NODE DETAIL';
  const color = zoom < 0.4 ? '#f59e0b' : zoom < 0.7 ? '#06b6d4' : '#10b981';
  return (
    <div style={{
      position: 'absolute', bottom: 50, left: 16, zIndex: 10,
      background: 'rgba(13,17,23,0.9)', border: `1px solid ${color}40`,
      borderRadius: 6, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: 9, color, fontFamily: 'IBM Plex Mono',
        fontWeight: 600, letterSpacing: '0.1em' }}>
        LOD: {level}
      </span>
      <span style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono' }}>
        {(zoom * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ─── STATS OVERLAY ────────────────────────────────────────────────────────────
function StatsOverlay({ suppliers, expandedCount }) {
  const critical = suppliers.filter(s => s.data.status === 'critical').length;
  const warning  = suppliers.filter(s => s.data.status === 'warning').length;
  return (
    <div style={{
      position: 'absolute', top: 12, left: 12, zIndex: 10,
      background: 'rgba(13,17,23,0.92)', border: '1px solid #1e2535',
      borderRadius: 8, padding: '8px 14px', backdropFilter: 'blur(8px)',
      display: 'flex', gap: 16, alignItems: 'center',
    }}>
      {[
        { label: 'TOTAL NODES', value: suppliers.length, color: '#e2e8f0' },
        { label: 'CRITICAL',    value: critical,          color: '#ef4444'  },
        { label: 'WARNING',     value: warning,           color: '#eab308'  },
      ].map(({ label, value, color }) => (
        <div key={label}>
          <div style={{ fontSize: 9, color: '#475569', fontFamily: 'IBM Plex Mono',
            letterSpacing: '0.1em' }}>{label}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'IBM Plex Mono' }}>
            {value}
          </div>
        </div>
      ))}
      <div style={{ width: 1, height: 30, background: '#1e2535' }} />
      <div style={{ fontSize: 10, color: '#475569', fontFamily: 'IBM Plex Mono', maxWidth: 150 }}>
        {expandedCount === 0
          ? '▸ Click a region group to expand'
          : `${expandedCount} region(s) expanded`}
      </div>
    </div>
  );
}

// ─── INNER FLOW (needs ReactFlowProvider context) ─────────────────────────────
function InnerFlow({ onNodeClick }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // Generate data once
  const { suppliers, components } = useRef(generateLargeDataset(90)).current;

  const toggleGroup = useCallback((region) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(region) ? next.delete(region) : next.add(region);
      return next;
    });
  }, []);

  useEffect(() => {
    const { nodes: n, edges: e } = buildGraph(
      suppliers, components, expandedGroups, toggleGroup
    );
    setNodes(n);
    setEdges(e);
  }, [expandedGroups, toggleGroup]);

  return (
    <>
      <StatsOverlay suppliers={suppliers} expandedCount={expandedGroups.size} />
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onNodeClick?.(node)}
        nodeTypes={nodeTypes}
        fitView fitViewOptions={{ padding: 0.15 }}
        minZoom={0.15} maxZoom={2}
      >
        <Background color="#1e2535" gap={40} size={1} />
        <Controls style={{ bottom: 56, left: 16 }} />
        <MiniMap
          nodeColor={n =>
            n.type === 'groupNode'
              ? (n.data?.children?.some(c => c.status === 'critical') ? '#ef4444'
                : n.data?.children?.some(c => c.status === 'warning')  ? '#eab308' : '#10b981')
              : (STATUS_COLOR[n.data?.status]?.border || '#1e2535')
          }
          style={{ bottom: 40, right: 16 }}
          maskColor="rgba(6,9,18,0.85)"
        />
        <LodIndicator />
      </ReactFlow>
    </>
  );
}

// ─── PUBLIC EXPORT ────────────────────────────────────────────────────────────
export default function CollapsibleGraphView({ graphData, onNodeClick }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative',
      background: '#060912' }}>
      <ReactFlowProvider>
        <InnerFlow onNodeClick={onNodeClick} />
      </ReactFlowProvider>
    </div>
  );
}
