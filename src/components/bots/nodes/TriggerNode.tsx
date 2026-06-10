'use client';
import { memo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Trash2, Zap } from 'lucide-react';

export default memo(function TriggerNode({ id, data, isConnectable }: any) {
  const { setNodes, setEdges } = useReactFlow();
  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };
  const color = data.color || '#eab308';

  return (
    <div style={{ background: 'white', border: `2px solid ${color}`, borderRadius: '8px', minWidth: '250px', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)', overflow: 'hidden' }}>
      <div style={{ background: color, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={16} fill="currentColor" />
          <strong style={{ fontSize: '13px' }}>{data.label || 'Gatilho de Início'}</strong>
        </div>
        <button onClick={onDelete} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', padding: '4px' }}><Trash2 size={14} /></button>
      </div>
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{ fontSize: '11px', color: 'var(--secondary)' }}>Disparar este bot quando o lead enviar:</p>
        <select style={{ width: '100%', padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)', fontWeight: 600 }}>
          <option>Palavra-chave Exata</option>
          <option>Contém a Palavra</option>
          <option>Inicia com</option>
          <option>Qualquer Mensagem</option>
        </select>
        <input type="text" placeholder='Ex: "x" ou "z"' style={{ width: '100%', padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)' }} />
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{ background: color, width: '12px', height: '12px', border: '2px solid white' }} />
    </div>
  );
});
