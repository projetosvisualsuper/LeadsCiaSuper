'use client';

import { memo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Trash2 } from 'lucide-react';

export default memo(function PauseNode({ id, data, isConnectable }: any) {
  const { setNodes, setEdges } = useReactFlow();

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };
  return (
    <div style={{
      background: 'white',
      border: '1px solid #db2777',
      borderRadius: '8px',
      minWidth: '150px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden'
    }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ background: '#db2777', width: '10px', height: '10px' }} />
      
      <div style={{ background: '#db2777', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⏸️</span>
          <strong style={{ fontSize: '12px' }}>{data.label || 'Pausa'}</strong>
        </div>
        <button onClick={onDelete} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', padding: '4px' }}>
          <Trash2 size={14} />
        </button>
      </div>
      
      <div style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input 
          type="number"
          defaultValue={1}
          style={{
            width: '50px',
            padding: '6px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid var(--border)',
          }}
        />
        <select 
          style={{
            flex: 1,
            padding: '6px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid var(--border)',
          }}
        >
          <option>Minutos</option>
          <option>Horas</option>
          <option>Dias</option>
        </select>
      </div>

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{ background: '#db2777', width: '10px', height: '10px' }} />
    </div>
  );
});
