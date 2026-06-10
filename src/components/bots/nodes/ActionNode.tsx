'use client';

import { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { PlaySquare, Trash2, StickyNote, MessageSquareText } from 'lucide-react';

export default memo(function ActionNode({ id, data, isConnectable }: any) {
  const { setNodes, setEdges } = useReactFlow();
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(data.note || '');

  const onNoteChange = (e: any) => {
    setNoteText(e.target.value);
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, note: e.target.value } } : n));
  };

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--success)',
      borderRadius: '8px',
      minWidth: '200px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden'
    }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ background: 'var(--success)', width: '10px', height: '10px' }} />
      
      <div style={{ background: '#10b981', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PlaySquare size={16} />
          <strong style={{ fontSize: '12px' }}>{data.label || 'Ação'}</strong>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => setShowNote(!showNote)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: noteText && !showNote ? '#fde047' : 'white', display: 'flex', padding: '4px' }} title={noteText && !showNote ? "Ver Nota" : "Adicionar Nota"}>
            {noteText && !showNote ? <MessageSquareText size={15} /> : <StickyNote size={14} />}
          </button>
          <button onClick={onDelete} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', padding: '4px' }} title="Excluir"><Trash2 size={14} /></button>
        </div>
      </div>
      
      {showNote && (
        <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', background: '#fffbeb' }}>
          <textarea value={noteText} onChange={onNoteChange} placeholder="Escreva uma nota interna para este bloco..." style={{ width: '100%', minHeight: '40px', fontSize: '11px', border: 'none', outline: 'none', background: 'transparent', resize: 'none' }} />
        </div>
      )}

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
          <option>Adicionar nota</option>
          <option>Adicionar tarefa</option>
          <option>Alterar o status da conversa</option>
          <option>Completar tarefas</option>
          <option>Criar lead</option>
          <option>Definir campo</option>
        </select>
      </div>

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{ background: 'var(--success)', width: '10px', height: '10px' }} />
    </div>
  );
});
