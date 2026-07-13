'use client';
import { memo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Trash2 } from 'lucide-react';

export default memo(function ListMessageNode({ id, data, isConnectable }: any) {
  const { setNodes, setEdges } = useReactFlow();
  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };
  const color = data.color || '#22c55e';

  return (
    <div style={{ background: 'white', border: `1px solid ${color}`, borderRadius: '8px', minWidth: '220px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ background: color }} />
      <div style={{ background: color, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
        <strong style={{ fontSize: '12px' }}>{data.label}</strong>
        <button onClick={onDelete} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', padding: '4px' }}><Trash2 size={14} /></button>
      </div>
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <input 
          type="text" 
          placeholder="Título do Menu" 
          value={data.title || ''}
          onChange={(e) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, title: e.target.value } } : n))}
          style={{ width: '100%', padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)', fontWeight: 600, outline: 'none' }} 
        />
        <div style={{ background: 'rgba(0,0,0,0.02)', padding: '8px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {(data.options || ['Opção 1', 'Opção 2']).map((opt: string, idx: number) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input 
                type="text" 
                placeholder={`Opção ${idx + 1}`} 
                value={opt}
                onChange={(e) => {
                  const newOpts = [...(data.options || ['Opção 1', 'Opção 2'])];
                  newOpts[idx] = e.target.value;
                  setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, options: newOpts } } : n));
                }}
                style={{ flex: 1, padding: '5px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }} 
              />
              <button 
                onClick={() => {
                  const newOpts = (data.options || ['Opção 1', 'Opção 2']).filter((_: any, i: number) => i !== idx);
                  setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, options: newOpts } } : n));
                }}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
              >
                &times;
              </button>
            </div>
          ))}
          <button 
            onClick={() => {
              const newOpts = [...(data.options || ['Opção 1', 'Opção 2']), 'Nova Opção'];
              setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, options: newOpts } } : n));
            }}
            style={{ color: color, fontSize: '11px', textAlign: 'left', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0 0 0' }}
          >
            + Add Opção
          </button>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{ background: color }} />
    </div>
  );
});
