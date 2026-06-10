'use client';

import { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { MessageSquare, Trash2, X, Mic, Paperclip, Link as LinkIcon, MousePointer2, AlertCircle, StickyNote, MessageSquareText } from 'lucide-react';

export default memo(function SendMessageNode({ id, data, isConnectable }: any) {
  const { setNodes, setEdges } = useReactFlow();
  const [buttons, setButtons] = useState<{id: number, text: string, type: 'action'|'url'}[]>([]);
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

  const addActionBtn = () => { if (buttons.length < 3) setButtons([...buttons, { id: Date.now(), text: 'Novo Botão', type: 'action' }]); };
  const addUrlBtn = () => { if (buttons.length < 3) setButtons([...buttons, { id: Date.now(), text: 'https://', type: 'url' }]); };

  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--primary)',
      borderRadius: '8px',
      minWidth: '280px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden'
    }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ background: 'var(--primary)', width: '10px', height: '10px' }} />
      
      {/* Header */}
      <div style={{ background: 'var(--primary)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={16} />
          <strong style={{ fontSize: '12px' }}>{data.label || 'Enviar Mensagem'}</strong>
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
      
      {/* Corpo da Mensagem */}
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
          <textarea 
            defaultValue={data.message} 
            placeholder="Escreva algo ou escolha um modelo..."
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '8px',
              fontSize: '12px',
              border: 'none',
              outline: 'none',
              resize: 'none'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 8px', background: 'rgba(0,0,0,0.02)', gap: '8px', borderTop: '1px solid var(--border)' }}>
            <button onClick={() => alert('A gravação de áudio será ativada assim que finalizarmos a configuração do banco de mídias (Cloudflare R2)!')} title="Gravar Áudio" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--secondary)', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color='var(--primary)'} onMouseOut={e => e.currentTarget.style.color='var(--secondary)'}><Mic size={16} /></button>
            <button onClick={() => alert('O envio de arquivos será ativado assim que finalizarmos a configuração do banco de mídias (Cloudflare R2)!')} title="Anexar Arquivo" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--secondary)', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color='var(--primary)'} onMouseOut={e => e.currentTarget.style.color='var(--secondary)'}><Paperclip size={16} /></button>
          </div>
        </div>

        {/* Botões de Ação / URL */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={addActionBtn} style={{ flex: 1, background: 'transparent', color: 'var(--primary)', border: '1px dashed var(--primary)', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <MousePointer2 size={12} /> + Botão de ação
          </button>
          <button onClick={addUrlBtn} style={{ flex: 1, background: 'transparent', color: '#3b82f6', border: '1px dashed #3b82f6', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <LinkIcon size={12} /> + Botão de URL
          </button>
        </div>

        {/* Lista de Botões Adicionados */}
        {buttons.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
            {buttons.map((btn, i) => (
              <div key={btn.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input 
                  defaultValue={btn.text} 
                  placeholder={btn.type === 'url' ? 'https://...' : 'Nome do botão'}
                  style={{ width: '100%', padding: '6px', fontSize: '11px', borderRadius: '4px', border: `1px solid ${btn.type === 'url' ? '#3b82f6' : 'var(--primary)'}`, outline: 'none' }} 
                />
                <button onClick={() => setButtons(buttons.filter(b => b.id !== btn.id))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}>
                  <X size={14} />
                </button>
                <Handle 
                  type="source" 
                  position={Position.Bottom} 
                  id={`btn-${btn.id}`} 
                  style={{ left: `${(i + 1) * (100 / (buttons.length + 1))}%`, background: btn.type === 'url' ? '#3b82f6' : 'var(--primary)', width: '8px', height: '8px' }} 
                  isConnectable={isConnectable} 
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer de Erro */}
      <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.05)', borderTop: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
          <AlertCircle size={12} /> Se o envio falhar (Conecte abaixo) 👇
        </span>
      </div>

      {/* Ponto de conexão de Sucesso e Falha */}
      <Handle type="source" position={Position.Bottom} id="success" isConnectable={isConnectable} style={{ background: 'var(--primary)', width: '10px', height: '10px', left: '70%' }} />
      <Handle type="source" position={Position.Bottom} id="fail" isConnectable={isConnectable} style={{ background: '#ef4444', width: '10px', height: '10px', left: '30%' }} />
    </div>
  );
});
