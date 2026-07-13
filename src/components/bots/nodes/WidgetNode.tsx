'use client';
import { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Trash2, Settings } from 'lucide-react';

export default memo(function WidgetNode({ id, data, isConnectable }: any) {
  const { setNodes, setEdges } = useReactFlow();
  const [isOpen, setIsOpen] = useState(false);
  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };
  const color = data.color || '#3b82f6';

  return (
    <div style={{ background: 'white', border: `1px solid ${color}`, borderRadius: '8px', minWidth: '200px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ background: color }} />
      <div style={{ background: color, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
        <strong style={{ fontSize: '12px' }}>{data.label}</strong>
        <button onClick={onDelete} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', padding: '4px' }}><Trash2 size={14} /></button>
      </div>
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <select 
          value={data.widgetType || 'Selecionar Widget'}
          onChange={(e) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, widgetType: e.target.value } } : n))}
          style={{ width: '100%', padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }}
        >
          <option value="Selecionar Widget">Selecionar Widget</option>
          <option value="RD Station CRM">RD Station CRM</option>
          <option value="Mercado Pago (Cobrança)">Mercado Pago (Cobrança)</option>
          <option value="Google Sheets (Enviar)">Google Sheets (Enviar)</option>
        </select>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          style={{ background: isOpen ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0,0,0,0.05)', color: isOpen ? 'var(--primary)' : 'inherit', border: isOpen ? '1px solid var(--primary)' : '1px solid var(--border)', padding: '6px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
        >
          <Settings size={14} />
          {isOpen ? 'Fechar Configuração' : 'Configurar Widget'}
        </button>

        {isOpen && (
          <div style={{ marginTop: '4px', padding: '8px', background: 'rgba(0,0,0,0.02)', borderRadius: '4px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--secondary)', marginBottom: '2px', display: 'block' }}>Webhook URL</label>
              <input 
                type="text" 
                placeholder="https://api.exemplo.com/hook" 
                value={data.webhookUrl || ''}
                onChange={(e) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, webhookUrl: e.target.value } } : n))}
                style={{ width: '100%', padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }} 
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--secondary)', marginBottom: '2px', display: 'block' }}>Token / API Key (Opcional)</label>
              <input 
                type="password" 
                placeholder="••••••••••••" 
                value={data.apiKey || ''}
                onChange={(e) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, apiKey: e.target.value } } : n))}
                style={{ width: '100%', padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }} 
              />
            </div>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{ background: color }} />
    </div>
  );
});
