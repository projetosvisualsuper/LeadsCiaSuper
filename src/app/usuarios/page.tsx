'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { UserProfile } from '@/types/crm';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Shield, 
  Search,
  Calendar,
  AlertCircle,
  Edit2,
  Save,
  X,
  Mail,
  Trash2
} from 'lucide-react';

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'editor' as any });
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await api.getAllUserProfiles();
    setUsers(data);
    setLoading(false);
  };

  const handleUpdateStatus = async (uid: string, status: 'approved' | 'rejected') => {
    if (confirm(`Deseja ${status === 'approved' ? 'APROVAR' : 'REJEITAR'} este usuário?`)) {
      await api.updateUserProfile(uid, { 
        status, 
        dataAprovacao: status === 'approved' ? new Date().toISOString() : undefined 
      });
      loadUsers();
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setLoading(true);
    try {
      await api.deleteUserProfile(userToDelete);
      await loadUsers();
      setUserToDelete(null);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao excluir usuário: ' + err.message);
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditForm({ name: user.name || '', role: user.role });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setLoading(true);
    try {
      await api.updateUserProfile(editingUser.uid, {
        name: editForm.name,
        role: editForm.role
      });
      setEditingUser(null);
      await loadUsers();
      alert('Usuário atualizado com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = users.filter(u => u.status === 'pending').length;

  return (
    <div>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Gerenciamento de Usuários</h2>
          <p style={{ opacity: 0.6 }}>Controle quem tem acesso ao painel administrativo.</p>
        </div>
        {pendingCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', padding: '0.5rem 1rem', borderRadius: '50px', fontSize: '0.875rem', fontWeight: 600 }}>
            <Clock size={16} />
            {pendingCount} solicitações pendentes
          </div>
        )}
      </header>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou e-mail..." 
            className="btn-outline" 
            style={{ width: '100%', paddingLeft: '3rem' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.25rem', fontWeight: 600, fontSize: '0.875rem', opacity: 0.7 }}>Usuário</th>
              <th style={{ padding: '1.25rem', fontWeight: 600, fontSize: '0.875rem', opacity: 0.7 }}>Nível</th>
              <th style={{ padding: '1.25rem', fontWeight: 600, fontSize: '0.875rem', opacity: 0.7 }}>Solicitação</th>
              <th style={{ padding: '1.25rem', fontWeight: 600, fontSize: '0.875rem', opacity: 0.7 }}>Status</th>
              <th style={{ padding: '1.25rem', fontWeight: 600, fontSize: '0.875rem', opacity: 0.7, textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}>Carregando usuários...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}>Nenhum usuário encontrado.</td></tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.uid} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="table-row">
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem' }}>
                        {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1rem' }}>{user.name || 'Sem Nome'}</div>
                        <div style={{ fontSize: '0.875rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Mail size={12} /> {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <Shield size={16} style={{ color: (user.role === 'master' || user.role === 'admin') ? 'var(--primary)' : '#64748b' }} />
                      <span>
                        {user.role === 'master' || user.role === 'admin' ? 'Master' : 
                         user.role === 'intermediario' || user.role === 'editor' ? 'Intermediário' : 'Básico'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={14} style={{ opacity: 0.5 }} />
                      {new Date(user.dataSolicitacao).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    <span className={`badge ${
                      user.status === 'approved' ? 'badge-convertido' : 
                      user.status === 'pending' ? 'badge-novo' : 'badge-perdido'
                    }`} style={{ fontSize: '0.75rem' }}>
                      {user.status === 'approved' ? 'APROVADO' : user.status === 'pending' ? 'PENDENTE' : 'RECUSADO'}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-outline" 
                        style={{ width: '32px', height: '32px', padding: 0 }}
                        title="Editar Usuário"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit2 size={14} />
                      </button>
                      
                      <button 
                        className="btn btn-outline" 
                        style={{ width: '32px', height: '32px', padding: 0, color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        title="Excluir Usuário"
                        onClick={() => setUserToDelete(user.uid)}
                      >
                        <Trash2 size={14} />
                      </button>

                      {user.status === 'pending' ? (
                        <>
                          <button 
                            className="btn btn-primary" 
                            style={{ height: '32px', padding: '0 0.75rem', fontSize: '0.75rem', background: 'var(--success)' }}
                            onClick={() => handleUpdateStatus(user.uid, 'approved')}
                          >
                            <CheckCircle2 size={14} /> Aprovar
                          </button>
                          <button 
                            className="btn" 
                            style={{ height: '32px', padding: '0 0.75rem', fontSize: '0.75rem', background: 'var(--danger)', color: 'white' }}
                            onClick={() => handleUpdateStatus(user.uid, 'rejected')}
                          >
                            <XCircle size={14} /> Recusar
                          </button>
                        </>
                      ) : (
                        <>
                          {user.status === 'approved' ? (
                             <button 
                             className="btn btn-outline" 
                             style={{ height: '32px', padding: '0 0.75rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                             onClick={() => handleUpdateStatus(user.uid, 'rejected')}
                           >
                             Desativar
                           </button>
                          ) : (
                            <button 
                            className="btn btn-outline" 
                            style={{ height: '32px', padding: '0 0.75rem', fontSize: '0.75rem', color: 'var(--success)', borderColor: 'var(--success)' }}
                            onClick={() => handleUpdateStatus(user.uid, 'approved')}
                          >
                            Ativar
                          </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.25rem', color: '#1e293b' }}>Editar Usuário</h3>
              <button onClick={() => setEditingUser(null)} style={{ opacity: 0.5, color: '#1e293b' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>Nome Completo</label>
                <input 
                  className="btn-outline"
                  style={{ width: '100%', color: '#1e293b' }}
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Ex: João Silva"
                />
              </div>

              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>Nível de Acesso</label>
                <select 
                  className="btn-outline"
                  style={{ width: '100%', height: '42px', color: '#1e293b' }}
                  value={editForm.role}
                  onChange={e => setEditForm({ ...editForm, role: e.target.value as any })}
                >
                  <option value="basico">Básico (Acesso a Leads e Chat)</option>
                  <option value="intermediario">Intermediário (Acesso a Marketing e Relatórios)</option>
                  <option value="master">Master (Acesso total + Gerenciar usuários)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveEdit}>
                  <Save size={18} /> Salvar
                </button>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditingUser(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {userToDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <AlertCircle size={24} />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: '1.25rem', color: '#1e293b', marginBottom: '0.5rem' }}>Excluir Usuário</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Tem certeza que deseja excluir este usuário do sistema? Esta ação não pode ser desfeita.
            </p>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setUserToDelete(null)}>
                Cancelar
              </button>
              <button className="btn" style={{ flex: 1, background: 'var(--danger)', color: 'white' }} onClick={handleDeleteUser}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .table-row:hover {
          background: #f8fafc;
        }
      `}</style>
    </div>
  );
}
