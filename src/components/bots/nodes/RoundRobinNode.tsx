'use client';

import { memo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Trash2, RefreshCw, X, PlusCircle } from 'lucide-react';

export default memo(function RoundRobinNode({ id, data, isConnectable }: any) {
  const { setNodes, setEdges } = useReactFlow();
  const color = data.color || '#f59e0b';

  const options = data.options || [
    { id: '1', label: 'Opção' },
    { id: '2', label: 'Opção' }
  ];

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  const onAddOption = () => {
    const newOpt = { id: Math.random().toString(36).substr(2, 9), label: 'Opção' };
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        return { ...n, data: { ...n.data, options: [...options, newOpt] } };
      }
      return n;
    }));
  };

  const onDeleteOption = (optId: string) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        const nextOpts = options.filter((o: any) => o.id !== optId);
        return { ...n, data: { ...n.data, options: nextOpts } };
      }
      return n;
    }));
    // Remover também as conexões ligadas àquela opção removida
    setEdges((eds) => eds.filter((e) => !(e.source === id && e.sourceHandle === `opt-${optId}`)));
  };

  return (
    <div style={{ background: 'white', border: `1px solid ${color}`, borderRadius: '8px', minWidth: '240px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ background: color, width: '10px', height: '10px' }} />
      
      <div style={{ background: color, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={14} />
          <strong style={{ fontSize: '12px' }}>{data.label || 'Round Robin'}</strong>
        </div>
        <button onClick={onDelete} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', padding: '4px' }}><Trash2 size={14} /></button>
      </div>

      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {/* Opções de Fila Sequencial */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {options.map((opt: any) => (
            <div 
              key={opt.id} 
              style={{ 
                position: 'relative', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                background: '#f8fafc', 
                border: '1px solid #cbd5e1', 
                borderRadius: '6px', 
                padding: '6px 8px', 
                height: '32px' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={12} color="#64748b" />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>{opt.label}</span>
              </div>
              
              {options.length > 1 && (
                <button 
                  onClick={() => onDeleteOption(opt.id)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}
                  onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                >
                  <X size={12} />
                </button>
              )}

              {/* Handle específico da opção alinhado à direita da linha correspondente */}
              <Handle 
                type="source" 
                position={Position.Right} 
                id={`opt-${opt.id}`} 
                style={{ 
                  right: '-6px', 
                  background: color, 
                  width: '8px', 
                  height: '8px', 
                  border: '1.5px solid white' 
                }} 
                isConnectable={isConnectable} 
              />
            </div>
          ))}
        </div>

        {/* Adicionar outra opção */}
        <button 
          onClick={onAddOption} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px', 
            background: 'transparent', 
            border: 'none', 
            color: color, 
            fontSize: '11px', 
            fontWeight: 600, 
            cursor: 'pointer', 
            padding: '4px 0',
            width: 'fit-content'
          }}
        >
          <PlusCircle size={12} /> Adicionar outra opção
        </button>

        {/* Descritivos de Ajuda */}
        <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '4px', paddingTop: '8px' }}>
          <p style={{ fontSize: '9px', color: '#64748b', lineHeight: '1.3' }}>
            Quando uma opção é adicionada ou removida, a fila é redefinida e começa do início.
          </p>
          <p style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px', lineHeight: '1.3' }}>
            Round Robin é uma etapa do Salesbot que permite organizar a execução das etapas em uma sequência circular.
          </p>
        </div>

      </div>
    </div>
  );
});
