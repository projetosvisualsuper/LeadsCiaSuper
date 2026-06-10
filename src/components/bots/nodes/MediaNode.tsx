'use client';
import { memo, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Trash2, Paperclip } from 'lucide-react';

export default memo(function MediaNode({ id, data, isConnectable }: any) {
  const { setNodes, setEdges } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };
  const color = data.color || '#6366f1';

  return (
    <div style={{ background: 'white', border: `1px solid ${color}`, borderRadius: '8px', minWidth: '220px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ background: color }} />
      <div style={{ background: color, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Paperclip size={16} />
          <strong style={{ fontSize: '12px' }}>{data.label || 'Enviar Arquivo'}</strong>
        </div>
        <button onClick={onDelete} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', padding: '4px' }}><Trash2 size={14} /></button>
      </div>
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
        <div 
          style={{ padding: '16px', border: fileName ? `1px solid ${color}` : '1px dashed var(--border)', borderRadius: '4px', width: '100%', textAlign: 'center', cursor: 'pointer', background: fileName ? `${color}10` : 'rgba(0,0,0,0.02)' }} 
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={24} style={{ opacity: fileName ? 1 : 0.5, marginBottom: '8px', color: fileName ? color : 'inherit' }} />
          <p style={{ fontSize: '11px', color: fileName ? color : 'var(--secondary)', fontWeight: fileName ? 600 : 400, wordBreak: 'break-all' }}>
            {fileName ? fileName : 'Clique para anexar um arquivo'}
          </p>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setFileName(e.target.files[0].name);
              }
            }}
          />
        </div>
        <input type="text" placeholder="Legenda (Opcional)" style={{ width: '100%', padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border)' }} />
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{ background: color }} />
    </div>
  );
});
