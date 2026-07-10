'use client';

import { memo, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { PlaySquare, Trash2, StickyNote, MessageSquareText } from 'lucide-react';
import { api } from '@/services/api';

export default memo(function ActionNode({ id, data, isConnectable }: any) {
  const { setNodes, setEdges } = useReactFlow();
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(data.note || '');
  const [users, setUsers] = useState<any[]>([]);

  const actionType = data.actionType || 'Adicionar nota';

  useEffect(() => {
    if (actionType === 'Mudar usuário resp.') {
      api.getAllUserProfiles()
        .then(res => setUsers(res || []))
        .catch(err => console.error('Erro ao carregar usuários na ação:', err));
    }
  }, [actionType]);

  const onNoteChange = (e: any) => {
    setNoteText(e.target.value);
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, note: e.target.value } } : n));
  };

  const onActionTypeChange = (e: any) => {
    const val = e.target.value;
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, actionType: val } } : n));
  };

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  const options = [
    'Adicionar nota',
    'Adicionar tarefa',
    'Alterar o status da conversa',
    'Completar tarefas',
    'Criar lead',
    'Definir campo',
    'Enviar email',
    'Enviar um webhook',
    'Gerar formulário',
    'Gerenciar assinantes',
    'Gerenciar tags',
    'Meta Conversions API',
    'Mudar o status do lead',
    'Mudar usuário resp.'
  ];

  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--success)',
      borderRadius: '8px',
      minWidth: '220px',
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
          value={actionType}
          onChange={onActionTypeChange}
          style={{
            width: '100%',
            padding: '6px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid var(--border)',
            outline: 'none',
            color: '#1e293b',
            fontWeight: 500
          }}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>

        {/* Mudar usuário resp. */}
        {actionType === 'Mudar usuário resp.' && (
          <select
            value={data.targetUserId || ''}
            onChange={(e) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, targetUserId: e.target.value } } : n))}
            style={{ width: '100%', padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }}
          >
            <option value="">Selecione o usuário...</option>
            {users.map(u => (
              <option key={u.uid} value={u.uid}>{u.nome || u.name || u.email}</option>
            ))}
          </select>
        )}

        {/* Mudar o status do lead */}
        {actionType === 'Mudar o status do lead' && (
          <select
            value={data.targetStatus || 'novo'}
            onChange={(e) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, targetStatus: e.target.value } } : n))}
            style={{ width: '100%', padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }}
          >
            <option value="novo">Novo</option>
            <option value="contatado">Contatado / Em Atendimento</option>
            <option value="convertido">Convertido / Ganho</option>
            <option value="perdido">Perdido</option>
          </select>
        )}

        {/* Gerenciar tags */}
        {actionType === 'Gerenciar tags' && (
          <input
            type="text"
            placeholder="Tags (separadas por vírgula)..."
            value={data.tagsValue || ''}
            onChange={(e) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, tagsValue: e.target.value } } : n))}
            style={{ width: '100%', padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }}
          />
        )}

        {/* Enviar um webhook */}
        {actionType === 'Enviar um webhook' && (
          <input
            type="text"
            placeholder="URL do Webhook..."
            value={data.webhookUrl || ''}
            onChange={(e) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, webhookUrl: e.target.value } } : n))}
            style={{ width: '100%', padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }}
          />
        )}
      </div>

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{ background: 'var(--success)', width: '10px', height: '10px' }} />
    </div>
  );
});
