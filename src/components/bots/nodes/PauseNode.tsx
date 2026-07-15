'use client';

import { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Trash2, Pencil, X, Plus, Check } from 'lucide-react';

const CONDITION_OPTIONS = [
  { value: 'mensagem_recebida', label: 'Até a mensagem recebida' },
  { value: 'cronometro', label: 'Cronômetro' },
  { value: 'exceto_expediente', label: 'Exceto durante o expediente' },
  { value: 'video_aberto', label: 'Até o vídeo ser aberto' },
  { value: 'video_fechado', label: 'Até o vídeo ser fechado' },
];

export default memo(function PauseNode({ id, data, isConnectable }: any) {
  const { setNodes, setEdges } = useReactFlow();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  const conditions = data.conditions || [
    { id: 'default', type: 'mensagem_recebida', label: 'Até a mensagem recebida' }
  ];

  const addCondition = () => {
    const newId = Math.random().toString(36).substring(2, 9);
    const newCond = {
      id: newId,
      type: 'mensagem_recebida',
      label: 'Até a mensagem recebida'
    };
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, conditions: [...conditions, newCond] } }
          : n
      )
    );
  };

  const removeCondition = (condId: string) => {
    const updated = conditions.filter((c: any) => c.id !== condId);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, conditions: updated } } : n
      )
    );
    setEdges((eds) => eds.filter((e) => e.sourceHandle !== condId));
  };

  const selectOption = (condId: string, value: string) => {
    const option = CONDITION_OPTIONS.find((o) => o.value === value);
    if (!option) return;

    const updated = conditions.map((c: any) =>
      c.id === condId ? { ...c, type: value, label: option.label } : c
    );

    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, conditions: updated } } : n
      )
    );
    setOpenDropdownId(null);
  };

  return (
    <div style={{
      background: 'white',
      border: '1px solid #db2777',
      borderRadius: '8px',
      minWidth: '240px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      position: 'relative'
    }}>
      <Handle 
        type="target" 
        position={Position.Left} 
        isConnectable={isConnectable} 
        style={{ background: '#db2777', width: '10px', height: '10px', left: '-5px' }} 
      />
      
      <div style={{ background: '#db2777', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '4px',
            padding: '1px 6px',
            fontSize: '11px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {data.stepIndex || id}
          </div>
          <strong style={{ fontSize: '12px' }}>{data.label || 'Pausar'}</strong>
        </div>
        <button onClick={onDelete} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', padding: '4px' }}>
          <Trash2 size={14} />
        </button>
      </div>
      
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {conditions.map((cond: any) => (
          <div key={cond.id} style={{ position: 'relative' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '6px 10px',
              gap: '8px'
            }}>
              <button 
                onClick={() => setOpenDropdownId(openDropdownId === cond.id ? null : cond.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Pencil size={12} />
              </button>

              <span 
                onClick={() => setOpenDropdownId(openDropdownId === cond.id ? null : cond.id)}
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#1e293b',
                  cursor: 'pointer',
                  borderBottom: '1px dashed #64748b',
                  flex: 1,
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  paddingBottom: '1px'
                }}
              >
                {cond.label}
              </span>

              <button 
                onClick={() => removeCondition(cond.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={14} style={{ borderRadius: '50%', border: '1px solid #cbd5e1', padding: '1px' }} />
              </button>
            </div>

            {openDropdownId === cond.id && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                zIndex: 50,
                marginTop: '4px',
                overflow: 'hidden'
              }}>
                {CONDITION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => selectOption(cond.id, opt.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '11px',
                      textAlign: 'left',
                      background: cond.type === opt.value ? '#f1f5f9' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#1e293b',
                    }}
                  >
                    <span style={{ width: '12px', display: 'inline-flex', alignItems: 'center' }}>
                      {cond.type === opt.value && <Check size={12} style={{ color: '#db2777' }} />}
                    </span>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            <Handle 
              type="source" 
              position={Position.Right} 
              id={cond.id} 
              isConnectable={isConnectable} 
              style={{ background: '#db2777', width: '8px', height: '8px', right: '-4px' }} 
            />
          </div>
        ))}

        <button 
          onClick={addCondition}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 0',
            width: 'fit-content',
            transition: 'color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#db2777'}
          onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
        >
          <Plus size={14} /> Adicionar próxima condição
        </button>
      </div>
    </div>
  );
});

