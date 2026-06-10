'use client';

import { memo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Network, Trash2 } from 'lucide-react';

export default memo(function ConditionNode({ id, data, isConnectable }: any) {
  const { setNodes, setEdges } = useReactFlow();

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--warning)',
      borderRadius: '8px',
      minWidth: '200px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden'
    }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ background: 'var(--warning)', width: '10px', height: '10px' }} />
      
      <div style={{ background: 'var(--warning)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Network size={16} />
          <strong style={{ fontSize: '12px' }}>{data.label || 'Condição'}</strong>
        </div>
        <button onClick={onDelete} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', padding: '4px' }}>
          <Trash2 size={14} />
        </button>
      </div>
      
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <select 
          style={{
            width: '100%',
            padding: '6px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid var(--border)',
          }}
        >
          <option>Se a mensagem for igual a...</option>
          <option>Se contiver a palavra...</option>
          <option>Se for número...</option>
        </select>
        <input 
          type="text"
          placeholder="Valor..."
          style={{
            width: '100%',
            padding: '6px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid var(--border)',
          }}
        />
      </div>

      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%', background: 'var(--success)', width: '10px', height: '10px' }} isConnectable={isConnectable} />
      <div style={{ position: 'absolute', bottom: '-20px', left: '30%', transform: 'translateX(-50%)', fontSize: '10px', color: 'var(--success)', fontWeight: 'bold' }}>Sim</div>

      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%', background: 'var(--danger)', width: '10px', height: '10px' }} isConnectable={isConnectable} />
      <div style={{ position: 'absolute', bottom: '-20px', left: '70%', transform: 'translateX(-50%)', fontSize: '10px', color: 'var(--danger)', fontWeight: 'bold' }}>Não</div>
    </div>
  );
});
