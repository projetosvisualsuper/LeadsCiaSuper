'use client';

import { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Octagon, Trash2, StickyNote, MessageSquareText } from 'lucide-react';

export default memo(function StopBotNode({ id, data, isConnectable }: any) {
  const { setNodes, setEdges } = useReactFlow();
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(data.note || '');

  const onNoteChange = (e: any) => {
    setNoteText(e.target.value);
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, note: e.target.value } } : n));
  };

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    // Remove edges that target this node
    setEdges((eds) => eds.filter((e) => e.target !== id));
  };

  return (
    <div style={{ background: 'white', border: '1px solid #ef4444', borderRadius: '8px', minWidth: '220px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ background: '#ef4444', width: '10px', height: '10px' }} />
      
      <div style={{ background: '#ef4444', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Octagon size={16} />
          <strong style={{ fontSize: '12px' }}>{data.label || 'Parar Bot'}</strong>
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
          <textarea value={noteText} onChange={onNoteChange} placeholder="Escreva uma nota interna..." style={{ width: '100%', minHeight: '40px', fontSize: '11px', border: 'none', outline: 'none', background: 'transparent', resize: 'none' }} />
        </div>
      )}

      <div style={{ padding: '12px', textAlign: 'center', color: 'var(--secondary)', fontSize: '12px' }}>
        A automação será encerrada neste ponto.
      </div>
    </div>
  );
});
