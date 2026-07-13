'use client';
import { memo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Trash2 } from 'lucide-react';

export default memo(function CustomCodeNode({ id, data, isConnectable }: any) {
  const { setNodes, setEdges } = useReactFlow();
  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };
  const color = data.color || '#0ea5e9';

  return (
    <div style={{ background: 'white', border: `1px solid ${color}`, borderRadius: '8px', minWidth: '250px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ background: color }} />
      <div style={{ background: color, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
        <strong style={{ fontSize: '12px' }}>{data.label}</strong>
        <button onClick={onDelete} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', padding: '4px' }}><Trash2 size={14} /></button>
      </div>
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ background: '#1e293b', borderRadius: '4px', padding: '8px', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '11px' }}>
          <textarea 
            value={data.code || 'async function run(lead) {\n  // seu código aqui\n  return true;\n}'}
            onChange={(e) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, code: e.target.value } } : n))}
            style={{ width: '100%', minHeight: '80px', background: 'transparent', border: 'none', color: 'inherit', resize: 'vertical', outline: 'none' }} 
            spellCheck="false"
          />
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{ background: color }} />
    </div>
  );
});
