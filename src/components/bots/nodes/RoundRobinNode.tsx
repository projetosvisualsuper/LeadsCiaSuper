'use client';

import { memo, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Trash2, Users } from 'lucide-react';
import { api } from '@/services/api';

export default memo(function RoundRobinNode({ id, data, isConnectable }: any) {
  const { setNodes, setEdges } = useReactFlow();
  const [users, setUsers] = useState<any[]>([]);
  const color = data.color || '#f59e0b';

  useEffect(() => {
    api.getAllUserProfiles()
      .then(res => setUsers(res || []))
      .catch(err => console.error('Erro ao carregar usuários no RoundRobinNode:', err));
  }, []);

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  const onToggle = (userId: string, checked: boolean) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        const currentList = Array.isArray(n.data?.userIds) ? (n.data.userIds as string[]) : [];
        const nextList = checked 
          ? [...currentList, userId] 
          : currentList.filter((uid: string) => uid !== userId);
        return { ...n, data: { ...n.data, userIds: nextList } };
      }
      return n;
    }));
  };

  const selectedUserIds: string[] = Array.isArray(data.userIds) ? data.userIds : [];

  return (
    <div style={{ background: 'white', border: `1px solid ${color}`, borderRadius: '8px', minWidth: '220px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ background: color, width: '10px', height: '10px' }} />
      <div style={{ background: color, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} />
          <strong style={{ fontSize: '12px' }}>{data.label || 'Round Robin'}</strong>
        </div>
        <button onClick={onDelete} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', padding: '4px' }}><Trash2 size={14} /></button>
      </div>
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>Distribuir lead entre usuários:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
          {users.length === 0 ? (
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>Carregando vendedores...</span>
          ) : (
            users.map(user => {
              const isChecked = selectedUserIds.includes(user.id);
              return (
                <label key={user.id} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#334155' }}>
                  <input 
                    type="checkbox" 
                    checked={isChecked} 
                    onChange={(e) => onToggle(user.id, e.target.checked)} 
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.nome || user.email}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{ background: color, width: '10px', height: '10px' }} />
    </div>
  );
});
