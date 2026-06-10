import { useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow } from '@xyflow/react';

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: any) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
  });

  const [showConfirm, setShowConfirm] = useState(false);

  const onEdgeClick = (evt: any) => {
    evt.stopPropagation();
    setShowConfirm(true);
  };

  const confirmDelete = (evt: any) => {
    evt.stopPropagation();
    setEdges((edges) => edges.filter((e) => e.id !== id));
  };

  const cancelDelete = (evt: any) => {
    evt.stopPropagation();
    setShowConfirm(false);
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: 2, stroke: '#94a3b8' }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
            opacity: 0.8,
            transition: 'opacity 0.2s',
          }}
          className="nodrag nopan custom-edge-btn"
          onMouseEnter={(e) => { if(!showConfirm) e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { if(!showConfirm) e.currentTarget.style.opacity = '0.8'; }}
        >
          {!showConfirm ? (
            <button
              style={{
                width: '20px',
                height: '20px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                fontSize: '12px'
              }}
              onClick={onEdgeClick}
              title="Desconectar ligação"
            >
              ×
            </button>
          ) : (
            <div style={{ background: 'var(--card)', padding: '8px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--border)', minWidth: '150px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--foreground)', textAlign: 'center' }}>Desconectar caminho?</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={cancelDelete} style={{ flex: 1, padding: '4px', background: 'transparent', color: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Não</button>
                <button onClick={confirmDelete} style={{ flex: 1, padding: '4px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Sim</button>
              </div>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
