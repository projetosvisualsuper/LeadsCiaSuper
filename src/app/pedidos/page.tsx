'use client';

export const runtime = 'edge';

import { useState, useEffect, Suspense } from 'react';
import { api } from '@/services/api';
import { Pedido } from '@/types/crm';
import { ShoppingBag, ChevronDown, ChevronUp, RefreshCw, CheckCircle2, User, Phone, Package, DollarSign, Clock, Check, XCircle, Trash2, Search } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function PedidosContent() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPedidoId, setExpandedPedidoId] = useState<string | null>(null);
  const [observacoesInput, setObservacoesInput] = useState<Record<string, string>>({});
  const [savingObs, setSavingObs] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'site' | 'mercos'>('site');
  const [celularInput, setCelularInput] = useState<Record<string, string>>({});
  const [sendingNotification, setSendingNotification] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const searchParams = useSearchParams();
  const leadIdParam = searchParams.get('leadId') || '';
  const pedidoIdParam = searchParams.get('pedidoId') || '';

  useEffect(() => {
    if (pedidos.length > 0) {
      if (pedidoIdParam) {
        const found = pedidos.find(p => p.id === pedidoIdParam);
        if (found) {
          setActiveTab(found.origem === 'mercos' ? 'mercos' : 'site');
          setExpandedPedidoId(found.id);
          setObservacoesInput(prev => ({ ...prev, [found.id]: found.observacao || '' }));
          setCelularInput(prev => ({ ...prev, [found.id]: found.leadCelular || '' }));
          
          if (!found.isRead) {
            api.markPedidoAsRead(found.id).then(() => {
              setPedidos(prev => prev.map(p => p.id === found.id ? { ...p, isRead: true } : p));
              window.dispatchEvent(new Event('pedidos-read'));
            }).catch(console.error);
          }
        }
      } else if (leadIdParam) {
        const leadOrders = pedidos.filter(p => p.leadId === leadIdParam);
        if (leadOrders.length > 0) {
          const hasMercos = leadOrders.some(p => p.origem === 'mercos');
          const hasSite = leadOrders.some(p => p.origem !== 'mercos');
          if (hasMercos && !hasSite) {
            setActiveTab('mercos');
          }
        }
      }
    }
  }, [pedidos, pedidoIdParam, leadIdParam]);

  const handleSaveObservacao = async (pedidoId: string) => {
    const obs = observacoesInput[pedidoId] || '';
    setSavingObs(pedidoId);
    try {
      await api.updatePedidoObservacao(pedidoId, obs);
      setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, observacao: obs } : p));
      alert('Observação salva com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar observação:', err);
      alert('Erro ao salvar observação.');
    } finally {
      setSavingObs(null);
    }
  };

  const handleDeletePedido = async (pedidoId: string) => {
    if (!confirm('Deseja realmente excluir este pedido? Esta ação não pode ser desfeita.')) return;
    try {
      await api.deletePedido(pedidoId);
      setPedidos(prev => prev.filter(p => p.id !== pedidoId));
      if (expandedPedidoId === pedidoId) setExpandedPedidoId(null);
    } catch (err) {
      console.error('Erro ao excluir pedido:', err);
      alert('Erro ao excluir pedido.');
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      await api.markAllPedidosAsRead(activeTab);
      setPedidos(prev => prev.map(p => {
        const matchesTab = activeTab === 'mercos' ? p.origem === 'mercos' : p.origem !== 'mercos';
        if (matchesTab && !p.isRead) {
          return { ...p, isRead: true };
        }
        return p;
      }));
      window.dispatchEvent(new Event('pedidos-read'));
    } catch (err) {
      console.error('Erro ao marcar todos como lidos:', err);
      alert('Erro ao marcar os pedidos como lidos.');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const data = await api.getPedidos();
      setPedidos(data);
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchPedidos();
    api.getAllUserProfiles()
      .then(setSystemUsers)
      .catch(err => console.error('Erro ao carregar usuários:', err));

    const handleRefresh = () => {
      fetchPedidos();
    };
    window.addEventListener('refresh-data', handleRefresh);
    return () => {
      window.removeEventListener('refresh-data', handleRefresh);
    };
  }, []);

  const handleTogglePedido = async (pedido: Pedido) => {
    if (expandedPedidoId === pedido.id) {
      setExpandedPedidoId(null);
      return;
    }
    
    setExpandedPedidoId(pedido.id);
    setObservacoesInput(prev => ({ ...prev, [pedido.id]: pedido.observacao || '' }));
    setCelularInput(prev => ({ ...prev, [pedido.id]: pedido.leadCelular || '' }));

    if (!pedido.isRead) {
      try {
        await api.markPedidoAsRead(pedido.id);
        setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, isRead: true } : p));
        
        // Disparar evento para atualizar o badge do sidebar
        window.dispatchEvent(new Event('pedidos-read'));
      } catch (e) {
        console.error('Erro ao marcar pedido como lido:', e);
      }
    }
  };

  const handleSendNotification = async (pedidoId: string) => {
    const cel = celularInput[pedidoId] || '';
    if (!cel.trim()) {
      alert('Digite um número de telefone válido.');
      return;
    }
    setSendingNotification(pedidoId);
    try {
      const res = await fetch('/api/pedidos/resend-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId, celular: cel })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar notificação');
      }
      alert('Notificação enviada com sucesso!');
      fetchPedidos();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao enviar notificação.');
    } finally {
      setSendingNotification(null);
    }
  };

  const [syncingStatus, setSyncingStatus] = useState<string | null>(null);

  const handleStatusChange = async (pedidoId: string, newStatus: string) => {
    setSyncingStatus(pedidoId);
    try {
      const res = await fetch('/api/pedidos/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId, status: newStatus })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao sincronizar pedido');
      }

      setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, status: newStatus as any } : p));
      
      if (data.wooError) {
        alert('O status foi atualizado no CRM, mas houve um erro ao enviar para a loja WooCommerce. Verifique os logs do sistema.');
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert('Erro ao atualizar o status do pedido.');
    } finally {
      setSyncingStatus(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const safeStatus = status || 'pendente';
    let bg = '#f1f5f9';
    let color = '#475569';
    let icon = null;

    if (safeStatus === 'pendente') {
      bg = '#fef3c7'; color = '#b45309'; icon = <Clock size={12}/>;
    } else if (safeStatus === 'em_atendimento') {
      bg = '#dbeafe'; color = '#1d4ed8'; icon = <RefreshCw size={12}/>;
    } else if (safeStatus === 'finalizado') {
      bg = '#d1fae5'; color = '#047857'; icon = <Check size={12}/>;
    } else if (safeStatus === 'cancelado') {
      bg = '#fee2e2'; color = '#b91c1c'; icon = <XCircle size={12}/>;
    } else if (safeStatus === 'enviado') {
      bg = '#e0f2fe'; color = '#0369a1'; icon = <Package size={12}/>;
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

  const filteredPedidos = pedidos.filter(p => {
    if (leadIdParam && p.leadId !== leadIdParam) {
      return false;
    }
    if (activeTab === 'mercos') {
      if (p.origem !== 'mercos') return false;
    } else {
      if (p.origem === 'mercos') return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const refMatch = p.pedidoReferencia?.toLowerCase().includes(term);
      const nameMatch = p.leadNome?.toLowerCase().includes(term);
      const phoneMatch = p.leadCelular?.toLowerCase().includes(term);
      const storeNumMatch = p.numeroLojaVirtual?.toLowerCase().includes(term);
      const itemsMatch = p.itens?.toLowerCase().includes(term);
      
      return refMatch || nameMatch || phoneMatch || storeNumMatch || itemsMatch;
    }

    return true;
  });

  const unreadCount = filteredPedidos.filter(p => !p.isRead).length;

  return (
    <div className="page-container-responsive" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'inherit' }}>
      
      {/* HEADER */}
      <div className="page-header-responsive" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', margin: 0 }}>
            <ShoppingBag size={28} color="#059669" />
            {activeTab === 'site' ? 'Pedidos do Site' : 'Pedidos do Mercos'}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {activeTab === 'site' 
              ? 'Gerencie cotações e compras recebidas através do site ou integrações.' 
              : 'Gerencie pedidos recebidos diretamente da integração com o Mercos/Bling.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={markingAllRead || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: markingAllRead || loading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!markingAllRead && !loading) {
                  e.currentTarget.style.backgroundColor = '#e2e8f0';
                }
              }}
              onMouseLeave={(e) => {
                if (!markingAllRead && !loading) {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                }
              }}
            >
              <Check size={16} />
              Marcar todos como lidos ({unreadCount})
            </button>
          )}
          <button 
            onClick={fetchPedidos} 
            disabled={loading}
            className="btn desktop-only-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: loading ? 0.7 : 1 }}
          >
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {leadIdParam && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#e0f2fe',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#0369a1',
          fontSize: '0.9rem'
        }}>
          <span>
            Exibindo pedidos do lead: <strong>{pedidos.find(p => p.leadId === leadIdParam)?.leadNome || 'Carregando...'}</strong>
          </span>
          <Link href="/pedidos" style={{ color: '#0284c7', fontWeight: 'bold', textDecoration: 'underline' }}>
            Ver todos os pedidos
          </Link>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="nav-tabs-responsive" style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', marginBottom: '1.5rem', width: 'fit-content' }}>
        <button 
          onClick={() => setActiveTab('site')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            background: activeTab === 'site' ? '#ffffff' : 'transparent',
            color: activeTab === 'site' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'site' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          Pedidos do Site
        </button>
        <button 
          onClick={() => setActiveTab('mercos')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            background: activeTab === 'mercos' ? '#ffffff' : 'transparent',
            color: activeTab === 'mercos' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'mercos' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          Pedidos Mercos
        </button>
      </div>

      {/* Barra de Pesquisa */}
      <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
        <input
          type="text"
          placeholder="Buscar por referência, nome do lead, celular, item ou loja..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '0.6rem 1rem 0.6rem 2.5rem',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            fontSize: '0.9rem',
            background: 'white',
            outline: 'none',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        />
        <Search 
          size={18} 
          style={{ 
            position: 'absolute', 
            left: '0.75rem', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: '#94a3b8' 
          }} 
        />
      </div>

      {/* LISTAGEM */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px' }}>
        {filteredPedidos.length === 0 && !loading ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CheckCircle2 size={48} color="#34d399" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#334155', margin: 0 }}>Tudo limpo!</h3>
            <p style={{ marginTop: '0.5rem' }}>Nenhum pedido ou cotação pendente no momento.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredPedidos.map((pedido, index) => (
              <div 
                key={pedido.id} 
                style={{
                  borderBottom: index < filteredPedidos.length - 1 ? '1px solid #f1f5f9' : 'none',
                  backgroundColor: !pedido.isRead ? '#f0fdf4' : '#ffffff',
                  transition: 'background-color 0.2s ease'
                }}
              >
                {/* HEADER DO CARD */}
                <div 
                  className="card-header-responsive"
                  style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
                  onClick={() => handleTogglePedido(pedido)}
                  onMouseEnter={(e) => {
                    if (pedido.isRead) (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (pedido.isRead) (e.currentTarget as HTMLElement).style.backgroundColor = '#ffffff';
                  }}
                >
                  <div style={{
                    flexShrink: 0,
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: !pedido.isRead ? '#d1fae5' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: !pedido.isRead ? '#059669' : '#64748b'
                  }}>
                    <ShoppingBag size={20} />
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      {getStatusBadge(pedido.status)}
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b' }}>
                        Ref: {pedido.pedidoReferencia || 'N/A'}
                        {pedido.numeroLojaVirtual && (
                          <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b', marginLeft: '0.5rem' }}>
                            (Loja: {pedido.numeroLojaVirtual})
                          </span>
                        )}
                      </span>
                      {!pedido.isRead && (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', marginLeft: '0.5rem' }} />
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <User size={14} opacity={0.6} />
                        {pedido.leadNome || 'Lead Desconhecido'}
                      </span>
                      {pedido.valor ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '600', color: '#059669' }}>
                          <DollarSign size={14} />
                          {Number(pedido.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  
                  <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {new Date(pedido.dataCriacao).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                    </span>
                    <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePedido(pedido.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#94a3b8',
                          padding: '4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#ef4444';
                          e.currentTarget.style.backgroundColor = '#fee2e2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#94a3b8';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                      {expandedPedidoId === pedido.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* DETALHES DO CARD (EXPANDIDO) */}
                {expandedPedidoId === pedido.id && (
                  <div 
                    className="card-details-responsive"
                    style={{ 
                    padding: '1.5rem', 
                    borderTop: '1px solid #f1f5f9',
                    backgroundColor: '#f8fafc',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '2rem'
                  }}>
                    
                    {/* Produtos */}
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <Package size={16} /> Produtos Solicitados
                      </h4>
                      <div className="card" style={{ padding: '1rem', backgroundColor: '#ffffff', fontSize: '0.9rem', color: '#475569', lineHeight: '1.5', minHeight: '100px' }}>
                        {pedido.itens ? (
                          <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                            {pedido.itens.split(',').map((item, idx) => (
                              <li key={idx} style={{ marginBottom: '0.25rem' }}>{item.trim()}</li>
                            ))}
                          </ul>
                        ) : 'Itens não informados.'}
                      </div>
                    </div>

                    {/* Contato & Ações */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <Phone size={16} /> Contato
                        </h4>
                        <div className="card" style={{ padding: '1rem', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e293b' }}>
                            {pedido.leadCelular || 'Sem número de telefone'}
                          </span>
                          <Link href={`/leads?search=${pedido.leadCelular || pedido.leadNome}`} style={{ fontSize: '0.8rem', color: '#0ea5e9', fontWeight: 'bold', textDecoration: 'none' }}>
                            Abrir Lead &rarr;
                          </Link>
                        </div>
                      </div>

                      {/* Notificação de Envio (WhatsApp) */}
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <Phone size={16} /> Notificação de Envio (WhatsApp)
                        </h4>
                        <div className="card" style={{ padding: '1rem', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="text"
                              placeholder="WhatsApp (DDD + Número)"
                              value={celularInput[pedido.id] || ''}
                              onChange={(e) => setCelularInput(prev => ({ ...prev, [pedido.id]: e.target.value }))}
                              style={{
                                flex: 1,
                                padding: '0.4rem 0.75rem',
                                fontSize: '0.85rem',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                outline: 'none'
                              }}
                            />
                            <button
                              onClick={() => handleSendNotification(pedido.id)}
                              disabled={sendingNotification === pedido.id}
                              style={{
                                padding: '0.4rem 1rem',
                                fontSize: '0.8rem',
                                backgroundColor: '#059669',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                opacity: sendingNotification === pedido.id ? 0.7 : 1
                              }}
                            >
                              {sendingNotification === pedido.id ? 'Enviando...' : 'Reenviar Notificação'}
                            </button>
                          </div>
                          
                          {/* Histórico Simplificado de Notificações */}
                          {(() => {
                            const obsLines = (pedido.observacao || '').split('\n');
                            const notifLogs = obsLines.filter(line => line.includes('[WHATSAPP NOTIFICAÇÃO'));
                            if (notifLogs.length > 0) {
                              return (
                                <div style={{ fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', maxHeight: '100px', overflowY: 'auto' }}>
                                  <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#475569' }}>Últimos Disparos:</strong>
                                  {notifLogs.map((log, idx) => {
                                    const isSuccess = log.includes('[WHATSAPP NOTIFICAÇÃO]') && !log.includes('FALHA') && !log.includes('IGNORADA');
                                    const isFail = log.includes('FALHA');
                                    let logColor = '#475569';
                                    if (isSuccess) logColor = '#047857';
                                    else if (isFail) logColor = '#b91c1c';
                                    
                                    return (
                                      <div key={idx} style={{ color: logColor, marginBottom: '2px' }}>
                                        • {log.replace(/\[WHATSAPP NOTIFICAÇÃO.*?\]\s*/, '')}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }
                            return (
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                Nenhum disparo de notificação registrado para este pedido.
                              </div>
                            );
                          })()}
                        </div>
                      </div>



                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Mudar Status
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button 
                            className="btn-outline"
                            onClick={() => handleStatusChange(pedido.id, 'pendente')} 
                            disabled={syncingStatus === pedido.id}
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', backgroundColor: pedido.status === 'pendente' ? '#fef3c7' : '#ffffff', borderColor: pedido.status === 'pendente' ? '#f59e0b' : '#cbd5e1', opacity: syncingStatus === pedido.id ? 0.5 : 1 }}
                          >
                            Pendente
                          </button>
                          <button 
                            className="btn-outline"
                            onClick={() => handleStatusChange(pedido.id, 'em_atendimento')} 
                            disabled={syncingStatus === pedido.id}
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', backgroundColor: pedido.status === 'em_atendimento' ? '#dbeafe' : '#ffffff', borderColor: pedido.status === 'em_atendimento' ? '#3b82f6' : '#cbd5e1', opacity: syncingStatus === pedido.id ? 0.5 : 1 }}
                          >
                            Em Atendimento
                          </button>
                          <button 
                            className="btn-outline"
                            onClick={() => handleStatusChange(pedido.id, 'finalizado')} 
                            disabled={syncingStatus === pedido.id}
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', backgroundColor: pedido.status === 'finalizado' ? '#d1fae5' : '#ffffff', borderColor: pedido.status === 'finalizado' ? '#10b981' : '#cbd5e1', opacity: syncingStatus === pedido.id ? 0.5 : 1 }}
                          >
                            Finalizado
                          </button>
                          <button 
                            className="btn-outline"
                            onClick={() => handleStatusChange(pedido.id, 'enviado')} 
                            disabled={syncingStatus === pedido.id}
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', backgroundColor: pedido.status === 'enviado' ? '#e0f2fe' : '#ffffff', borderColor: pedido.status === 'enviado' ? '#0ea5e9' : '#cbd5e1', opacity: syncingStatus === pedido.id ? 0.5 : 1 }}
                          >
                            Enviado
                          </button>
                          <button 
                            className="btn-outline"
                            onClick={() => handleStatusChange(pedido.id, 'cancelado')} 
                            disabled={syncingStatus === pedido.id}
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', backgroundColor: pedido.status === 'cancelado' ? '#fee2e2' : '#ffffff', borderColor: pedido.status === 'cancelado' ? '#ef4444' : '#cbd5e1', opacity: syncingStatus === pedido.id ? 0.5 : 1 }}
                          >
                            Cancelado
                          </button>
                          {syncingStatus === pedido.id && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '0.5rem' }}>
                              <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                              Sincronizando...
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                            placeholder="Adicione observações internas sobre este pedido..."
                            value={observacoesInput[pedido.id] || ''}
                            onChange={(e) => setObservacoesInput(prev => ({ ...prev, [pedido.id]: e.target.value }))}
                          />
                          <button
                            className="btn-outline"
                            onClick={() => handleSaveObservacao(pedido.id)}
                            disabled={savingObs === pedido.id}
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
                            {savingObs === pedido.id ? 'Salvando...' : 'Salvar Observação'}
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
        @media (max-width: 768px) {
          .page-container-responsive {
            padding: 1rem !important;
          }
          .page-header-responsive {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 1rem !important;
          }
          .page-header-responsive > div {
            width: 100% !important;
          }
          .page-header-responsive > div:last-child {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 0.5rem !important;
            width: 100% !important;
          }
          .page-header-responsive button {
            flex: 1 !important;
            justify-content: center !important;
            padding: 0.5rem 0.75rem !important;
            font-size: 0.8rem !important;
          }
          .nav-tabs-responsive {
            width: 100% !important;
            display: flex !important;
          }
          .nav-tabs-responsive button {
            flex: 1 !important;
            padding: 0.5rem !important;
            font-size: 0.8rem !important;
            text-align: center !important;
          }
          .card-header-responsive {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.75rem !important;
            padding: 1rem !important;
          }
          .card-header-responsive > div {
            width: 100% !important;
          }
          .card-header-responsive > div:nth-child(2) {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.5rem !important;
          }
          .card-header-responsive > div:nth-child(2) > div {
            flex-wrap: wrap !important;
            gap: 0.5rem 1rem !important;
          }
          .card-header-responsive > div:last-child {
            display: flex !important;
            flex-direction: row-reverse !important;
            justify-content: space-between !important;
            align-items: center !important;
            text-align: left !important;
            border-top: 1px solid #f1f5f9 !important;
            padding-top: 0.5rem !important;
            margin-top: 0.25rem !important;
          }
          .card-details-responsive {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
            padding: 1rem !important;
          }
        }
      `}} />
    </div>
  );
}

export default function PedidosPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Carregando...</div>}>
      <PedidosContent />
    </Suspense>
  );
}
