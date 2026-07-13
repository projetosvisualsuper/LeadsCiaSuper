'use client';
import { memo, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Trash2, Paperclip, UploadCloud } from 'lucide-react';

export default memo(function MediaNode({ id, data, isConnectable }: any) {
  const { setNodes, setEdges } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };
  const color = data.color || '#6366f1';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('chatId', 'bot_assets');
        
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        const result = await res.json();
        if (result.success && result.url) {
          setNodes((nds) => nds.map((n) => {
            if (n.id === id) {
              return { 
                ...n, 
                data: { 
                  ...n.data, 
                  fileName: file.name, 
                  fileUrl: result.url 
                } 
              };
            }
            return n;
          }));
        } else {
          // Em caso de erro R2 (ex: sem config), salva localmente os metadados simulados
          console.warn("Upload falhou ou bucket não configurado. Salvando apenas o nome do arquivo local.");
          setNodes((nds) => nds.map((n) => {
            if (n.id === id) {
              return { 
                ...n, 
                data: { 
                  ...n.data, 
                  fileName: file.name, 
                  fileUrl: `/uploads/${file.name}` 
                } 
              };
            }
            return n;
          }));
        }
      } catch (err) {
        console.error("Erro ao subir arquivo:", err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const currentFileName = data.fileName || '';
  const currentFileUrl = data.fileUrl || '';

  return (
    <div style={{ background: 'white', border: `1px solid ${color}`, borderRadius: '8px', minWidth: '240px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ background: color }} />
      <div style={{ background: color, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Paperclip size={16} />
          <strong style={{ fontSize: '12px' }}>{data.label || 'Enviar Arquivo'}</strong>
        </div>
        <button onClick={onDelete} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', padding: '4px' }}><Trash2 size={14} /></button>
      </div>
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {/* Upload Button */}
        <div 
          style={{ 
            padding: '16px', 
            border: currentFileName ? `1px solid ${color}` : '1px dashed var(--border)', 
            borderRadius: '4px', 
            textAlign: 'center', 
            cursor: 'pointer', 
            background: currentFileName ? `${color}10` : 'rgba(0,0,0,0.02)' 
          }} 
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud size={24} style={{ opacity: currentFileName ? 1 : 0.5, marginBottom: '8px', color: currentFileName ? color : 'inherit', margin: '0 auto 8px' }} />
          <p style={{ fontSize: '11px', color: currentFileName ? color : 'var(--secondary)', fontWeight: currentFileName ? 600 : 400, wordBreak: 'break-all', margin: 0 }}>
            {isUploading ? 'Enviando...' : (currentFileName ? currentFileName : 'Clique para enviar um arquivo')}
          </p>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileUpload}
          />
        </div>

        {/* Direct URL Input */}
        <div>
          <label style={{ fontSize: '10px', color: 'var(--secondary)', marginBottom: '2px', display: 'block' }}>Ou cole a URL do arquivo:</label>
          <input 
            type="text" 
            placeholder="https://exemplo.com/arquivo.pdf" 
            value={currentFileUrl}
            onChange={(e) => {
              const url = e.target.value;
              const name = url.split('/').pop() || 'arquivo';
              setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, fileUrl: url, fileName: name } } : n));
            }}
            style={{ width: '100%', padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }} 
          />
        </div>

        {/* Caption */}
        <div>
          <label style={{ fontSize: '10px', color: 'var(--secondary)', marginBottom: '2px', display: 'block' }}>Legenda (Opcional):</label>
          <input 
            type="text" 
            placeholder="Minha legenda..." 
            value={data.caption || ''}
            onChange={(e) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, caption: e.target.value } } : n))}
            style={{ width: '100%', padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }} 
          />
        </div>

      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{ background: color }} />
    </div>
  );
});
