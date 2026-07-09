'use client';

import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { SystemLog } from '@/types/crm';
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getSystemLogs();
      setLogs(data);
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleToggleLog = async (log: SystemLog) => {
    if (expandedLogId === log.id) {
      setExpandedLogId(null);
      return;
    }
    
    setExpandedLogId(log.id);

    if (!log.isRead) {
      try {
        await api.markSystemLogAsRead(log.id);
        setLogs(prev => prev.map(l => l.id === log.id ? { ...l, isRead: true } : l));
        
        // Dispatch event to update sidebar badge
        window.dispatchEvent(new Event('logs-read'));
      } catch (e) {
        console.error('Erro ao marcar log como lido:', e);
      }
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertTriangle size={20} color="#ef4444" />;
      case 'warning': return <AlertCircle size={20} color="#f59e0b" />;
      case 'info': return <Info size={20} color="#3b82f6" />;
      default: return <Info size={20} color="#64748b" />;
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle color="#ef4444" size={28} />
            Logs do Sistema
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.4rem' }}>
            Monitoramento de erros e alertas técnicos dos serviços integrados.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {logs.some(log => !log.isRead) && (
            <button 
              onClick={async () => {
                setLoading(true);
                try {
                  await api.markAllSystemLogsAsRead();
                  setLogs(prev => prev.map(l => ({ ...l, isRead: true })));
                  window.dispatchEvent(new Event('logs-read'));
                } catch (e) {
                  console.error('Erro ao marcar todos como lidos:', e);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#ecfdf5',
                color: '#065f46',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
            >
              <CheckCircle2 size={16} />
              Marcar como lidos
            </button>
          )}

          <button 
            onClick={fetchLogs} 
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* LOGS LIST */}
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {logs.length === 0 && !loading ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={48} color="#22c55e" style={{ marginBottom: '0.5rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', margin: 0 }}>Tudo limpo!</h3>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>Nenhum erro ou alerta recente no sistema.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {logs.map((log) => {
              const isUnread = !log.isRead;
              const isExpanded = expandedLogId === log.id;
              
              return (
                <div 
                  key={log.id} 
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: isUnread ? 'rgba(239, 68, 68, 0.02)' : 'white',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <div 
                    onClick={() => handleToggleLog(log)}
                    style={{
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      {getLevelIcon(log.level)}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: 800, 
                          padding: '2px 8px', 
                          borderRadius: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          backgroundColor: log.level === 'error' ? '#fee2e2' : log.level === 'warning' ? '#fef3c7' : '#dbeafe',
                          color: log.level === 'error' ? '#b91c1c' : log.level === 'warning' ? '#b45309' : '#1d4ed8'
                        }}>
                          {log.level}
                        </span>
                        
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                          {log.source}
                        </span>

                        {isUnread && (
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                        )}
                      </div>
                      
                      <p style={{ 
                        margin: '0.4rem 0 0 0', 
                        fontSize: '0.875rem', 
                        color: isUnread ? '#0f172a' : '#475569',
                        fontWeight: isUnread ? 700 : 400,
                        lineHeight: '1.4',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: isExpanded ? 'block' : '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {log.message}
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {new Date(log.dataCriacao).toLocaleString('pt-BR')}
                      </span>
                      <div style={{ color: '#94a3b8' }}>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '0 1.5rem 1.25rem 3.5rem' }}>
                      <div style={{ 
                        background: '#0f172a', 
                        color: '#cbd5e1', 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        fontFamily: 'monospace', 
                        fontSize: '0.75rem', 
                        overflowX: 'auto', 
                        whiteSpace: 'pre-wrap',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                        border: '1px solid #1e293b',
                        lineHeight: '1.5'
                      }}>
                        {log.details || 'Nenhum detalhe adicional fornecido pelo sistema.'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
