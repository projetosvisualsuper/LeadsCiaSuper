'use client';

import { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { MessageSquare, Trash2, X } from 'lucide-react';

export default memo(function SendMessageNode({ id, data, isConnectable }: any) {
  const { setNodes, setEdges } = useReactFlow();
  const [buttons, setButtons] = useState<{id: number, text: string}[]>([]);

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--primary)',
      borderRadius: '8px',
      minWidth: '250px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden'
    }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ background: 'var(--primary)', width: '10px', height: '10px' }} />
      
      <div style={{ background: 'var(--primary)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={16} />
          <strong style={{ fontSize: '12px' }}>{data.label || 'Enviar Mensagem'}</strong>
        </div>
        <button onClick={onDelete} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', padding: '4px' }}>
          <Trash2 size={14} />
        </button>
      </div>
      
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <textarea 
          defaultValue={data.message} 
          placeholder="Digite a mensagem..."
          style={{
            width: '100%',
            minHeight: '60px',
            padding: '8px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid var(--border)',
            resize: 'none'
          }}
        />
        <button onClick={() => { if (buttons.length < 3) setButtons([...buttons, { id: Date.now(), text: 'Novo Botão' }]) }} style={{
          background: 'rgba(99, 102, 241, 0.1)',
          color: 'var(--primary)',
          border: '1px dashed var(--primary)',
          padding: '6px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer'
        }}>
          + Adicionar Botão {buttons.length >= 3 && '(Máx 3)'}
        </button>

        {buttons.map((btn, i) => (
          <div key={btn.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input 
              defaultValue={btn.text} 
              style={{ width: '100%', padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--primary)' }} 
            />
            <button onClick={() => setButtons(buttons.filter(b => b.id !== btn.id))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}>
              <X size={14} />
            </button>
            <Handle 
              type="source" 
              position={Position.Bottom} 
              id={`btn-${btn.id}`} 
              style={{ left: `${(i + 1) * (100 / (buttons.length + 1))}%`, background: 'var(--primary)', width: '8px', height: '8px' }} 
              isConnectable={isConnectable} 
            />
          </div>
        ))}
      </div>

      <Handle type="source" position={Position.Bottom} id="default" isConnectable={isConnectable} style={{ background: 'var(--primary)', width: '10px', height: '10px' }} />
    </div>
  );
});
