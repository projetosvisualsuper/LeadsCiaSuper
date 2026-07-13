'use client';
import { memo, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { api } from '@/services/api';

export default memo(function StartSalesbotNode({ id, data, isConnectable }: any) {
  const { setNodes, setEdges } = useReactFlow();
  const [bots, setBots] = useState<any[]>([]);

  useEffect(() => {
    api.getBots()
      .then(res => setBots(res || []))
      .catch(err => console.error('Erro ao carregar bots no StartSalesbotNode:', err));
  }, []);

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };
  const color = data.color || '#14b8a6';

  return (
    <div style={{ background: 'white', border: `1px solid ${color}`, borderRadius: '8px', minWidth: '220px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ background: color }} />
      <div style={{ background: color, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
        <strong style={{ fontSize: '12px' }}>{data.label || 'Iniciar Salesbot'}</strong>
        <button onClick={onDelete} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', padding: '4px' }}><Trash2 size={14} /></button>
      </div>
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <select 
          value={data.targetBotId || ''}
          onChange={(e) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, targetBotId: e.target.value } } : n))}
          style={{ width: '100%', padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }}
        >
          <option value="">Escolher Bot...</option>
          {bots.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--secondary)' }}>
          <input 
            type="checkbox" 
            checked={data.pauseCurrentFlow !== false}
            onChange={(e) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, pauseCurrentFlow: e.target.checked } } : n))}
          /> Pausar fluxo atual
        </label>
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{ background: color }} />
    </div>
  );
});
