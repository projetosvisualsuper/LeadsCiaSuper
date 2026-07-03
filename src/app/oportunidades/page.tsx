'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Opportunity, ChatMessage } from '@/types/crm';
import { 
  Briefcase, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  CheckCircle2, 
  User, 
  Phone, 
  Clock, 
  Check, 
  XCircle, 
  MessageSquare, 
  Eye, 
  Send,
  ExternalLink,
  Info,
  Paperclip
} from 'lucide-react';
import Link from 'next/link';

const renderMessageContent = (msg: ChatMessage, leadNome: string) => {
  const isImage = msg.type === 'image';
  const isVideo = msg.type === 'video';
  const isAudio = msg.type === 'audio';
  const isFile = msg.type === 'file';

  const mediaUrl = msg.mediaUrl || (msg.content.startsWith('http') ? msg.content : undefined);

  if (mediaUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {isImage && (
          <img 
            src={mediaUrl} 
            alt="Imagem" 
            style={{ maxWidth: '100%', maxHeight: '200px', display: 'block', borderRadius: '8px', cursor: 'pointer' }} 
            onClick={() => window.open(mediaUrl, '_blank')}
          />
        )}
        {isVideo && (
          <video 
            src={mediaUrl} 
            controls 
            style={{ maxWidth: '100%', maxHeight: '200px', display: 'block', borderRadius: '8px' }} 
          />
        )}
        {isAudio && (
          <audio src={mediaUrl} controls style={{ maxWidth: '100%', height: '36px' }} />
        )}
        {isFile && (
          <a href={mediaUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', background: 'rgba(0,0,0,0.05)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
            <Paperclip size={16} /> <span>Abrir Documento</span>
          </a>
        )}
        {msg.content && !['📷 Imagem', '🎥 Vídeo', '🎵 Áudio', '📄 Documento', 'imagem', 'video', 'audio', 'documento'].includes(msg.content.toLowerCase()) && !msg.content.startsWith('http') && (
          <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
        )}
      </div>
    );
  }

  return <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>;
};

export default function OportunidadesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOppId, setExpandedOppId] = useState<string | null>(null);
  const [observacoesInput, setObservacoesInput] = useState<Record<string, string>>({});
  const [savingObs, setSavingObs] = useState<string | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/opportunities');
      if (res.ok) {
        const data = await res.json();
        setOpportunities(data);
      }
    } catch (err) {
      console.error('Erro ao buscar oportunidades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
    api.getAllUserProfiles()
      .then(setSystemUsers)
      .catch(err => console.error('Erro ao carregar usuários:', err));
  }, []);

  const handleToggleOpportunity = async (opp: Opportunity) => {
    if (expandedOppId === opp.id) {
      setExpandedOppId(null);
      return;
    }
    
    setExpandedOppId(opp.id);
    setObservacoesInput(prev => ({ ...prev, [opp.id]: opp.observacao || '' }));

    // Marcar como lido se ainda não estiver
    if (!opp.isRead) {
      try {
        await fetch('/api/opportunities', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: opp.id, markRead: true })
        });
        setOpportunities(prev => prev.map(o => o.id === opp.id ? { ...o, isRead: true } : o));
        
        // Disparar evento para atualizar o badge do sidebar
        window.dispatchEvent(new Event('oportunidades-read'));
      } catch (e) {
        console.error('Erro ao marcar oportunidade como lido:', e);
      }
    }

    // Buscar histórico do chat (IA/Conversa de entrada)
    const phone = opp.leadCelular || '';
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      // Tentar encontrar o chat correspondente
      const chatId = `whatsapp_${cleanPhone}`;
      setLoadingChatId(opp.id);
      try {
        const res = await fetch(`/api/chats?chatId=${chatId}`);
        if (res.ok) {
          const messages = await res.json();
          setChatHistories(prev => ({ ...prev, [opp.id]: messages }));
        }
      } catch (err) {
        console.error('Erro ao buscar histórico do chat:', err);
      } finally {
        setLoadingChatId(null);
      }
    }
  };

  const handleSaveObservacao = async (oppId: string) => {
    const obs = observacoesInput[oppId] || '';
    setSavingObs(oppId);
    try {
      const res = await fetch('/api/opportunities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: oppId, observacao: obs })
      });
      if (res.ok) {
        setOpportunities(prev => prev.map(o => o.id === oppId ? { ...o, observacao: obs } : o));
        alert('Observação salva com sucesso!');
      } else {
        alert('Erro ao salvar observação.');
      }
    } catch (err) {
      console.error('Erro ao salvar observação:', err);
      alert('Erro ao salvar observação.');
    } finally {
      setSavingObs(null);
    }
  };

  const handleStatusChange = async (oppId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/opportunities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: oppId, status: newStatus })
      });
      if (res.ok) {
        setOpportunities(prev => prev.map(o => o.id === oppId ? { ...o, status: newStatus as any } : o));
      } else {
        alert('Erro ao atualizar status.');
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert('Erro ao atualizar status.');
    }
  };

  const getStatusBadge = (status: string) => {
    const safeStatus = status || 'pendente';
    let bg = '#f1f5f9';
    let color = '#475569';
    let icon = null;

    if (safeStatus === 'pendente') {
      bg = '#fee2e2'; color = '#b91c1c'; icon = <Clock size={12}/>;
    } else if (safeStatus === 'em_atendimento') {
      bg = '#dbeafe'; color = '#1d4ed8'; icon = <RefreshCw size={12}/>;
    } else if (safeStatus === 'finalizado') {
      bg = '#d1fae5'; color = '#047857'; icon = <Check size={12}/>;
    } else if (safeStatus === 'cancelado') {
      bg = '#f1f5f9'; color = '#475569'; icon = <XCircle size={12}/>;
    }

    return (
      <span style={{
        padding: '4px 8px',
        backgroundColor: bg,
        color: color,
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        textTransform: 'uppercase'
      }}>
        {icon}
        {safeStatus.replace('_', ' ')}
      </span>
    );
  };

  // Helper para abrir o WhatsApp Web em uma nova aba
  const getWhatsAppWebUrl = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://web.whatsapp.com/send?phone=${cleanPhone}`;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'inherit' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', margin: 0 }}>
            <Briefcase size={28} color="var(--primary)" />
            Oportunidades de Leads
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Gerencie os leads qualificados encaminhados para atendimento humano comercial.
          </p>
        </div>
        <button 
          onClick={fetchOpportunities} 
          disabled={loading}
          className="btn"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: loading ? 0.7 : 1 }}
        >
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {/* LISTAGEM */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px' }}>
        {opportunities.length === 0 && !loading ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CheckCircle2 size={48} color="#34d399" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#334155', margin: 0 }}>Tudo limpo!</h3>
            <p style={{ marginTop: '0.5rem' }}>Nenhuma oportunidade ou encaminhamento pendente no momento.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {opportunities.map((opp, index) => (
              <div 
                key={opp.id} 
                style={{
                  borderBottom: index < opportunities.length - 1 ? '1px solid #f1f5f9' : 'none',
                  backgroundColor: !opp.isRead ? '#f5f3ff' : '#ffffff',
                  transition: 'background-color 0.2s ease'
                }}
              >
                {/* HEADER DO CARD */}
                <div 
                  style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
                  onClick={() => handleToggleOpportunity(opp)}
                  onMouseEnter={(e) => {
                    if (opp.isRead) (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (opp.isRead) (e.currentTarget as HTMLElement).style.backgroundColor = '#ffffff';
                  }}
                >
                  <div style={{
                    flexShrink: 0,
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: !opp.isRead ? '#e0e7ff' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: !opp.isRead ? 'var(--primary)' : '#64748b'
                  }}>
                    <Briefcase size={20} />
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      {getStatusBadge(opp.status)}
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b' }}>
                        Lead: {opp.leadNome || 'Desconhecido'}
                      </span>
                      {!opp.isRead && (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', marginLeft: '0.5rem' }} />
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <User size={14} opacity={0.6} />
                        Origem: {opp.leadOrigem || 'Web/API'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Phone size={14} opacity={0.6} />
                        {opp.leadCelular || 'Sem celular'}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {new Date(opp.dataCriacao).toLocaleString('pt-BR')}
                    </span>
                    <div style={{ color: '#94a3b8' }}>
                      {expandedOppId === opp.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* DETALHES DO CARD (EXPANDIDO) */}
                {expandedOppId === opp.id && (
                  <div style={{ 
                    padding: '1.5rem', 
                    borderTop: '1px solid #f1f5f9',
                    backgroundColor: '#f8fafc',
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 0.8fr',
                    gap: '2rem'
                  }}>
                    
                    {/* Histórico da Conversa com IA */}
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <MessageSquare size={16} /> Histórico do Atendimento (IA)
                      </h4>
                      <div className="card" style={{ padding: '1rem', backgroundColor: '#ffffff', fontSize: '0.9rem', color: '#475569', lineHeight: '1.5', height: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {loadingChatId === opp.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
                          </div>
                        ) : !chatHistories[opp.id] || chatHistories[opp.id].length === 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                            <Info size={16} style={{ marginRight: '0.25rem' }} /> Sem mensagens anteriores registradas.
                          </div>
                        ) : (
                          chatHistories[opp.id].map((msg) => (
                            <div 
                              key={msg.id}
                              style={{
                                alignSelf: msg.isIncoming ? 'flex-start' : 'flex-end',
                                backgroundColor: msg.isIncoming ? '#f1f5f9' : 'rgba(99, 102, 241, 0.1)',
                                color: '#1e293b',
                                padding: '0.6rem 0.85rem',
                                borderRadius: '12px',
                                borderBottomLeftRadius: msg.isIncoming ? '4px' : '12px',
                                borderBottomRightRadius: msg.isIncoming ? '12px' : '4px',
                                maxWidth: '80%',
                                fontSize: '0.85rem',
                                position: 'relative'
                              }}
                            >
                              <span style={{ display: 'block', fontWeight: 600, fontSize: '0.75rem', color: msg.isIncoming ? '#475569' : 'var(--primary)', marginBottom: '0.15rem' }}>
                                {msg.isIncoming ? opp.leadNome : 'Sistema (IA)'}
                              </span>
                              {renderMessageContent(msg, opp.leadNome || 'Lead')}
                              <span style={{ display: 'block', textAlign: 'right', fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Contato, Mudar Status & Observações */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      
                      {/* WhatsApp Web Button */}
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <Phone size={16} /> Falar com o Lead
                        </h4>
                        {opp.leadCelular ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <a 
                              href={getWhatsAppWebUrl(opp.leadCelular)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                gap: '0.5rem',
                                background: '#25D366', 
                                color: '#ffffff',
                                padding: '0.65rem 1rem', 
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)',
                                transition: 'transform 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <Send size={16} /> Conversar no WhatsApp Web <ExternalLink size={14} />
                            </a>
                            
                            <Link 
                              href={`/leads?search=${opp.leadCelular || opp.leadNome}`} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                gap: '0.5rem',
                                background: '#ffffff', 
                                color: '#0ea5e9',
                                border: '1px solid #0ea5e9',
                                padding: '0.65rem 1rem', 
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                            >
                              Abrir Lead &rarr;
                            </Link>
                          </div>
                        ) : (
                          <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '8px', color: '#b91c1c', fontSize: '0.85rem' }}>
                            Número de telefone não cadastrado para este lead.
                          </div>
                        )}
                      </div>

                      {/* Mudar Status */}
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Mudar Status
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button 
                            className="btn-outline"
                            onClick={() => handleStatusChange(opp.id, 'pendente')} 
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', backgroundColor: opp.status === 'pendente' ? '#fee2e2' : '#ffffff', borderColor: opp.status === 'pendente' ? '#ef4444' : '#cbd5e1' }}
                          >
                            Pendente
                          </button>
                          <button 
                            className="btn-outline"
                            onClick={() => handleStatusChange(opp.id, 'em_atendimento')} 
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', backgroundColor: opp.status === 'em_atendimento' ? '#dbeafe' : '#ffffff', borderColor: opp.status === 'em_atendimento' ? '#3b82f6' : '#cbd5e1' }}
                          >
                            Em Atendimento
                          </button>
                          <button 
                            className="btn-outline"
                            onClick={() => handleStatusChange(opp.id, 'finalizado')} 
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', backgroundColor: opp.status === 'finalizado' ? '#d1fae5' : '#ffffff', borderColor: opp.status === 'finalizado' ? '#10b981' : '#cbd5e1' }}
                          >
                            Finalizado
                          </button>
                          <button 
                            className="btn-outline"
                            onClick={() => handleStatusChange(opp.id, 'cancelado')} 
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', backgroundColor: opp.status === 'cancelado' ? '#f1f5f9' : '#ffffff', borderColor: opp.status === 'cancelado' ? '#94a3b8' : '#cbd5e1' }}
                          >
                            Cancelado
                          </button>
                        </div>
                      </div>

                      {/* Repassar Oportunidade */}
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Repassar Oportunidade
                        </h4>
                        <select
                          value={opp.assignedTo}
                          onChange={async (e) => {
                            const newSellerId = e.target.value;
                            if (!newSellerId) return;
                            if (confirm('Deseja realmente repassar esta oportunidade para outro vendedor?')) {
                              try {
                                const res = await fetch('/api/opportunities', {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: opp.id, assignedTo: newSellerId })
                                });
                                if (res.ok) {
                                  alert('Oportunidade repassada com sucesso!');
                                  fetchOpportunities();
                                } else {
                                  alert('Erro ao repassar oportunidade.');
                                }
                              } catch (err) {
                                console.error(err);
                                alert('Erro de conexão ao repassar oportunidade.');
                              }
                            }
                          }}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', backgroundColor: '#ffffff' }}
                        >
                          {systemUsers
                            .filter(u => u.status === 'approved')
                            .map(u => (
                              <option key={u.uid} value={u.uid}>
                                {u.name || u.email} ({u.role === 'admin' ? 'Master' : u.role === 'editor' ? 'Intermediário' : 'Básico'})
                              </option>
                            ))
                          }
                        </select>
                      </div>

                      {/* Observações */}
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Observações Internas
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <textarea
                            className="btn-outline"
                            style={{ 
                              width: '100%', 
                              height: '80px', 
                              padding: '0.5rem', 
                              fontSize: '0.85rem', 
                              borderRadius: '8px',
                              resize: 'vertical',
                              backgroundColor: '#ffffff'
                            }}
                            placeholder="Adicione notas ou acompanhamento sobre o lead..."
                            value={observacoesInput[opp.id] || ''}
                            onChange={(e) => setObservacoesInput(prev => ({ ...prev, [opp.id]: e.target.value }))}
                          />
                          <button
                            className="btn-outline"
                            onClick={() => handleSaveObservacao(opp.id)}
                            disabled={savingObs === opp.id}
                            style={{ 
                              alignSelf: 'flex-end', 
                              padding: '0.4rem 1rem', 
                              fontSize: '0.8rem', 
                              backgroundColor: '#0ea5e9', 
                              color: '#ffffff', 
                              borderColor: '#0ea5e9',
                              fontWeight: '600'
                            }}
                          >
                            {savingObs === opp.id ? 'Salvando...' : 'Salvar Observação'}
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
