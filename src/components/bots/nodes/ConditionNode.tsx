'use client';

import { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { GitBranch, Trash2, StickyNote, MessageSquareText } from 'lucide-react';

export default memo(function ConditionNode({ id, data, isConnectable }: any) {
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
      border: '1px solid var(--warning)',
      borderRadius: '8px',
      minWidth: '200px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden'
    }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ background: 'var(--warning)', width: '10px', height: '10px' }} />
      
      <div style={{ background: '#f59e0b', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitBranch size={16} />
          <strong style={{ fontSize: '12px' }}>{data.label || 'Condição'}</strong>
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
          value={data.conditionType || 'Se a mensagem for igual a...'}
          onChange={(e) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, conditionType: e.target.value } } : n))}
          style={{
            width: '100%',
            padding: '6px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid var(--border)',
            outline: 'none',
          }}
        >
          <option value="Se a mensagem for igual a...">Se a mensagem for igual a...</option>
          <option value="Se contiver a palavra...">Se contiver a palavra...</option>
          <option value="Se for número...">Se for número...</option>
        </select>
        <input 
          type="text"
          placeholder="Valor..."
          value={data.conditionValue || ''}
          onChange={(e) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, conditionValue: e.target.value } } : n))}
          style={{
            width: '100%',
            padding: '6px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid var(--border)',
            outline: 'none',
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
