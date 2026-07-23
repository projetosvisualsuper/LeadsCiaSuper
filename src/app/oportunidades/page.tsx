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
  Paperclip,
  Zap,
  Trash2,
  Archive,
  Download
} from 'lucide-react';
import Link from 'next/link';
import PipelineAutomationModal from '@/components/bots/PipelineAutomationModal';

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
          <div style={{ position: 'relative', width: 'fit-content', maxWidth: '100%' }}>
            <img 
              src={mediaUrl} 
              alt="Imagem" 
              style={{ maxWidth: '100%', maxHeight: '200px', display: 'block', borderRadius: '8px', cursor: 'pointer' }} 
              onClick={() => window.open(mediaUrl, '_blank')}
            />
            <a href={`${mediaUrl}?download=true`} download style={{ position: 'absolute', top: '8px', right: '8px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', borderRadius: '6px', textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} title="Baixar imagem">
              <Download size={16} />
            </a>
          </div>
        )}
        {isVideo && (
          <div style={{ position: 'relative', width: 'fit-content', maxWidth: '100%' }}>
            <video 
              src={mediaUrl} 
              controls 
              style={{ maxWidth: '100%', maxHeight: '200px', display: 'block', borderRadius: '8px' }} 
            />
            <a href={`${mediaUrl}?download=true`} download style={{ position: 'absolute', top: '8px', right: '8px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', borderRadius: '6px', textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} title="Baixar vídeo">
              <Download size={16} />
            </a>
          </div>
        )}
        {isAudio && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
            <audio src={mediaUrl} controls style={{ maxWidth: '100%', height: '36px' }} />
            <a href={`${mediaUrl}?download=true`} download style={{ color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', textDecoration: 'none', flexShrink: 0 }} title="Baixar áudio">
              <Download size={16} />
            </a>
          </div>
        )}
        {isFile && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%', maxWidth: '280px' }}>
            <a href={mediaUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', background: 'rgba(0,0,0,0.05)', padding: '0.5rem 0.75rem', borderRadius: '8px', flex: 1, minWidth: 0 }}>
              <Paperclip size={16} style={{ flexShrink: 0 }} /> <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Visualizar</span>
            </a>
            <a href={`${mediaUrl}?download=true`} download style={{ color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', textDecoration: 'none', flexShrink: 0 }} title="Baixar arquivo">
              <Download size={16} />
            </a>
          </div>
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
  const [connections, setConnections] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'novas' | 'atendidas' | 'ganhas' | 'perdidas' | 'cotacoes' | 'arquivadas'>('novas');
  const [showFinalizeModal, setShowFinalizeModal] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);

  // Filtros de busca e atribuição
  const [filterUser, setFilterUser] = useState<string>('todos');
  const [filterConnection, setFilterConnection] = useState<string>('todos');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

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

  const handleDeleteOpportunity = async (oppId: string) => {
    if (!confirm('Deseja realmente excluir esta oportunidade? Esta ação não pode ser desfeita.')) return;
    try {
      const res = await fetch(`/api/opportunities?id=${oppId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setOpportunities(prev => prev.filter(o => o.id !== oppId));
        alert('Oportunidade excluída com sucesso!');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Erro ao excluir: ${data.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao se conectar com o servidor.');
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then(data => setCurrentUser(data?.user || data))
      .catch(() => {});

    fetchOpportunities();
    api.getAllUserProfiles()
      .then(setSystemUsers)
      .catch(err => console.error('Erro ao carregar usuários:', err));

    fetch('/api/chats?type=connections')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Erro ao carregar conexões');
      })
      .then(setConnections)
      .catch(err => console.error('Erro ao carregar conexões:', err));

    const handleRefresh = () => {
      fetchOpportunities();
    };
    window.addEventListener('refresh-data', handleRefresh);
    return () => {
      window.removeEventListener('refresh-data', handleRefresh);
    };
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
    let label = safeStatus.replace('_', ' ');

    if (safeStatus === 'pendente') {
      bg = '#fee2e2'; color = '#b91c1c'; icon = <Clock size={12}/>;
    } else if (safeStatus === 'em_atendimento') {
      bg = '#dbeafe'; color = '#1d4ed8'; icon = <RefreshCw size={12}/>;
    } else if (safeStatus === 'ganha') {
      bg = '#d1fae5'; color = '#047857'; icon = <Check size={12}/>;
      label = 'Ganha';
    } else if (safeStatus === 'perdida') {
      bg = '#fee2e2'; color = '#b91c1c'; icon = <XCircle size={12}/>;
      label = 'Perdida';
    } else if (safeStatus === 'arquivada') {
      bg = '#f1f5f9'; color = '#475569'; icon = <Archive size={12}/>;
      label = 'Arquivada';
    } else if (safeStatus === 'finalizado') {
      bg = '#d1fae5'; color = '#047857'; icon = <Check size={12}/>;
      label = 'Finalizado';
    } else if (safeStatus === 'cancelado') {
      bg = '#f1f5f9'; color = '#475569'; icon = <XCircle size={12}/>;
    } else if (safeStatus === 'cotacao') {
      bg = '#fef3c7'; color = '#d97706'; icon = <Clock size={12}/>;
      label = 'Cotação';
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
        {label}
      </span>
    );
  };

  // Helper para abrir o WhatsApp Web em uma nova aba
  const getWhatsAppWebUrl = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://web.whatsapp.com/send?phone=${cleanPhone}`;
  };

  // Coletar origens/conexões únicas para usar no filtro
  const uniqueConnections = Array.from(new Set(
    opportunities
      .map(o => o.leadOrigem)
      .filter(Boolean)
  )) as string[];

  const baseFilteredOpps = opportunities.filter(opp => {
    // Filtro por Vendedor
    if (filterUser !== 'todos' && opp.assignedTo !== filterUser) {
      return false;
    }

    // Filtro por Conexão
    if (filterConnection !== 'todos' && opp.leadOrigem !== filterConnection) {
      return false;
    }

    // Filtro por Data
    if (filterStartDate && filterEndDate) {
      const oppDate = opp.dataCriacao.substring(0, 10);
      if (oppDate < filterStartDate || oppDate > filterEndDate) {
        return false;
      }
    } else if (filterDate && !opp.dataCriacao.startsWith(filterDate)) {
      return false;
    }

    return true;
  });

  const filteredOpportunities = baseFilteredOpps.filter(opp => {
    const status = opp.status || 'pendente';
    
    let tabMatch = false;
    if (activeTab === 'novas') {
      tabMatch = status === 'pendente';
    } else if (activeTab === 'atendidas') {
      tabMatch = status === 'em_atendimento';
    } else if (activeTab === 'ganhas') {
      tabMatch = status === 'ganha' || status === 'finalizado';
    } else if (activeTab === 'perdidas') {
      tabMatch = status === 'perdida' || status === 'cancelado';
    } else if (activeTab === 'arquivadas') {
      tabMatch = status === 'arquivada';
    } else if (activeTab === 'cotacoes') {
      tabMatch = status === 'cotacao';
    }

    return tabMatch;
  });

  // Calcular taxa de conversão das oportunidades (Ganhas / (Total - Arquivadas))
  const conversionEligibleOpps = baseFilteredOpps.filter(o => o.status !== 'arquivada');
  const totalOppsCount = conversionEligibleOpps.length;
  const ganhasOppsCount = conversionEligibleOpps.filter(o => o.status === 'ganha' || o.status === 'finalizado').length;
  const conversionRate = totalOppsCount > 0 ? ((ganhasOppsCount / totalOppsCount) * 100).toFixed(1) : '0.0';

  return (
    <div className="page-container-responsive" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'inherit' }}>
      
      {/* HEADER */}
      <div className="page-header-responsive" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', margin: 0 }}>
            <Briefcase size={28} color="var(--primary)" />
            Oportunidades de Leads
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Gerencie os leads qualificados encaminhados para atendimento humano comercial.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {currentUser?.role !== 'basico' && (
            <button 
              type="button"
              onClick={() => setIsAutomationModalOpen(true)}
              title="Configurar Automações"
              style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', cursor: 'pointer', padding: '0.5rem 1rem', color: '#1e40af', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <Zap size={16} /> Automações
            </button>
          )}
          <button 
            onClick={fetchOpportunities} 
            disabled={loading}
            className="btn desktop-only-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: loading ? 0.7 : 1 }}
          >
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem', 
        padding: '1.25rem', 
        background: 'white', 
        borderRadius: '12px', 
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        flexWrap: 'wrap',
        alignItems: 'flex-end'
      }}>
        {currentUser?.role !== 'basico' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '180px', flex: 1 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Vendedor / Responsável</label>
            <select 
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              style={{ 
                padding: '0.45rem 0.75rem', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                fontSize: '0.8rem', 
                background: 'white',
                outline: 'none',
                height: '36px'
              }}
            >
              <option value="todos">Todos os Vendedores</option>
              {systemUsers.map(u => (
                <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
              ))}
            </select>
          </div>
        )}

        {currentUser?.role !== 'basico' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '180px', flex: 1 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Conexão / Canal</label>
            <select 
              value={filterConnection}
              onChange={(e) => setFilterConnection(e.target.value)}
              style={{ 
                padding: '0.45rem 0.75rem', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                fontSize: '0.8rem', 
                background: 'white',
                outline: 'none',
                height: '36px'
              }}
            >
              <option value="todos">Todas as Conexões</option>
              {uniqueConnections.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1, minWidth: '250px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: '120px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>De (Data Início)</label>
            <input 
              type="date" 
              value={filterStartDate}
              onChange={(e) => {
                setFilterStartDate(e.target.value);
                setFilterDate('');
              }}
              style={{ 
                padding: '0.45rem 0.75rem', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                fontSize: '0.8rem', 
                background: 'white',
                outline: 'none',
                height: '36px',
                width: '100%'
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: '120px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Até (Data Fim)</label>
            <input 
              type="date" 
              value={filterEndDate}
              onChange={(e) => {
                setFilterEndDate(e.target.value);
                setFilterDate('');
              }}
              style={{ 
                padding: '0.45rem 0.75rem', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                fontSize: '0.8rem', 
                background: 'white',
                outline: 'none',
                height: '36px',
                width: '100%'
              }}
            />
          </div>
        </div>

        {(filterUser !== 'todos' || filterConnection !== 'todos' || filterDate || filterStartDate || filterEndDate) && (
          <button 
            onClick={() => {
              setFilterUser('todos');
              setFilterConnection('todos');
              setFilterDate('');
              setFilterStartDate('');
              setFilterEndDate('');
            }}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: '#ef444410',
              color: '#ef4444',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              height: '36px',
              transition: 'all 0.2s'
            }}
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* TABS */}
      <div className="tabs-responsive" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setActiveTab('novas')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'novas' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'novas' ? 'var(--primary)' : '#64748b',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Novas ({baseFilteredOpps.filter(o => !o.status || o.status === 'pendente').length})
          </button>
          <button 
            onClick={() => setActiveTab('cotacoes')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'cotacoes' ? '3px solid #eab308' : '3px solid transparent',
              color: activeTab === 'cotacoes' ? '#eab308' : '#64748b',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Cotações do Site ({baseFilteredOpps.filter(o => o.status === 'cotacao').length})
          </button>
          <button 
            onClick={() => setActiveTab('atendidas')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'atendidas' ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeTab === 'atendidas' ? '#3b82f6' : '#64748b',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Atendidas ({baseFilteredOpps.filter(o => o.status === 'em_atendimento').length})
          </button>
          <button 
            onClick={() => setActiveTab('ganhas')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'ganhas' ? '3px solid #10b981' : '3px solid transparent',
              color: activeTab === 'ganhas' ? '#10b981' : '#64748b',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Ganhas ({baseFilteredOpps.filter(o => o.status === 'ganha' || o.status === 'finalizado').length})
          </button>
          <button 
            onClick={() => setActiveTab('perdidas')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'perdidas' ? '3px solid #ef4444' : '3px solid transparent',
              color: activeTab === 'perdidas' ? '#ef4444' : '#64748b',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Perdidas ({baseFilteredOpps.filter(o => o.status === 'perdida' || o.status === 'cancelado').length})
          </button>
          <button 
            onClick={() => setActiveTab('arquivadas')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'arquivadas' ? '3px solid #64748b' : '3px solid transparent',
              color: activeTab === 'arquivadas' ? '#475569' : '#64748b',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Arquivadas ({baseFilteredOpps.filter(o => o.status === 'arquivada').length})
          </button>
        </div>

        {/* Taxa de Conversão */}
        <div style={{ 
          background: 'rgba(16, 185, 129, 0.1)', 
          color: '#047857', 
          padding: '0.5rem 1rem', 
          borderRadius: '10px', 
          fontSize: '0.85rem', 
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}>
          Taxa de Conversão: {conversionRate}%
        </div>
      </div>

      {/* LISTAGEM */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px' }}>
        {filteredOpportunities.length === 0 && !loading ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CheckCircle2 size={48} color="#34d399" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#334155', margin: 0 }}>Tudo limpo!</h3>
            <p style={{ marginTop: '0.5rem' }}>Nenhuma oportunidade nesta aba no momento.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredOpportunities.map((opp, index) => (
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
                  className="card-header-responsive"
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
                      {new Date(opp.dataCriacao).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {(currentUser?.role === 'admin' || currentUser?.role === 'master') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOpportunity(opp.id);
                          }}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#ef4444',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          title="Excluir Oportunidade"
                          className="hover-scale"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <div style={{ color: '#94a3b8' }}>
                        {expandedOppId === opp.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* DETALHES DO CARD (EXPANDIDO) */}
                {expandedOppId === opp.id && (
                  <div 
                    className="card-details-responsive"
                    style={{ 
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
                      <div className="card" style={{ padding: '1rem', backgroundColor: '#ffffff', fontSize: '0.9rem', color: '#475569', lineHeight: '1.5', height: '460px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                                {msg.isIncoming 
                                  ? opp.leadNome 
                                  : (msg.senderName && msg.senderName !== 'Você' && msg.senderName !== 'Sistema' && msg.senderName !== 'Sistema (IA)'
                                      ? msg.senderName 
                                      : (msg.connectionId && connections.find(c => c.id === msg.connectionId)?.name
                                          ? connections.find(c => c.id === msg.connectionId).name
                                          : (opp.assignedTo && systemUsers.find(u => u.uid === opp.assignedTo)?.displayName
                                              ? systemUsers.find(u => u.uid === opp.assignedTo).displayName
                                              : (opp.assignedTo && systemUsers.find(u => u.uid === opp.assignedTo)?.email
                                                  ? systemUsers.find(u => u.uid === opp.assignedTo).email
                                                  : 'Sistema (IA)'
                                                )
                                            )
                                        )
                                    )
                                }
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
                              href={`/atendimento?search=${encodeURIComponent(opp.leadCelular || opp.leadNome)}`}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                gap: '0.5rem',
                                background: 'var(--primary)', 
                                color: '#ffffff',
                                padding: '0.65rem 1rem', 
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
                                transition: 'transform 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <MessageSquare size={16} /> Conversa (Sistema)
                            </Link>
                            
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
                            onClick={() => setShowFinalizeModal(opp.id)} 
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', backgroundColor: (opp.status === 'finalizado' || opp.status === 'ganha' || opp.status === 'perdida') ? '#d1fae5' : '#ffffff', borderColor: (opp.status === 'finalizado' || opp.status === 'ganha' || opp.status === 'perdida') ? '#10b981' : '#cbd5e1' }}
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
      {showFinalizeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '400px', width: '90%', padding: '2rem', textAlign: 'center', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1.25rem', color: '#1e293b', marginBottom: '1rem' }}>Finalizar Oportunidade</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
              Como foi a conclusão do atendimento para esta oportunidade? Escolha uma opção para direcioná-la para a aba correspondente.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <button 
                className="btn" 
                style={{ flex: '1 1 100px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                onClick={async () => {
                  await handleStatusChange(showFinalizeModal, 'ganha');
                  setShowFinalizeModal(null);
                }}
              >
                🏆 Ganha
              </button>
              <button 
                className="btn" 
                style={{ flex: '1 1 100px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                onClick={async () => {
                  await handleStatusChange(showFinalizeModal, 'perdida');
                  setShowFinalizeModal(null);
                }}
              >
                ❌ Perdida
              </button>
              <button 
                className="btn" 
                style={{ flex: '1 1 100px', backgroundColor: '#64748b', color: '#ffffff', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                onClick={async () => {
                  await handleStatusChange(showFinalizeModal, 'arquivada');
                  setShowFinalizeModal(null);
                }}
              >
                📦 Arquivada
              </button>
            </div>
            <button 
              className="btn btn-outline" 
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', cursor: 'pointer' }}
              onClick={() => setShowFinalizeModal(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      <PipelineAutomationModal 
        isOpen={isAutomationModalOpen}
        onClose={() => setIsAutomationModalOpen(false)}
      />

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
          }
          .page-header-responsive button {
            flex: 1 !important;
            justify-content: center !important;
          }
          .tabs-responsive {
            flex-wrap: wrap !important;
            gap: 0.5rem !important;
          }
          .tabs-responsive button {
            padding: 0.5rem 0.75rem !important;
            font-size: 0.8rem !important;
            flex: 1 1 auto !important;
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
            gap: 0.5rem !important;
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
