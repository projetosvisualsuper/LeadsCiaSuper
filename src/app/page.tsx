'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Lead, Campaign, FilaEnvio, ChatSession, LandingPageInstance } from '@/types/crm';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Mail, 
  Send, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  PlusCircle,
  Upload,
  X,
  Zap,
  BarChart,
  ArrowRight,
  UserPlus,
  FileText,
  TrendingUp,
  Megaphone,
  CheckCircle2,
  Calendar,
  MessageSquare
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [greeting, setGreeting] = useState('Bem-vindo');
  const [errorMessage, setErrorMessage] = useState('');
  
  interface DashboardStats {
    totalLeads: number;
    leadsHoje: number;
    totalCampaigns: number;
    enviadosHoje: number;
    pendentes: number;
    limiteRestante: number;
    conversasPendentes: number;
    leadsByStatus: {
      novo: number;
      contatado: number;
      convertido: number;
      perdido: number;
    };
  }

  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    leadsHoje: 0,
    totalCampaigns: 0,
    enviadosHoje: 0,
    pendentes: 0,
    limiteRestante: 0,
    conversasPendentes: 0,
    leadsByStatus: { novo: 0, contatado: 0, convertido: 0, perdido: 0 }
  });

  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [isChannelsModalOpen, setIsChannelsModalOpen] = useState(false);
  
  // Novos estados para o Painel de Landing Pages e Filtros
  const [landingPages, setLandingPages] = useState<LandingPageInstance[]>([]);
  const [lpLeads, setLpLeads] = useState<Lead[]>([]);
  const [panelFilterLp, setPanelFilterLp] = useState('all');
  const [panelFilterChannel, setPanelFilterChannel] = useState('all');
  const [panelFilterStatus, setPanelFilterStatus] = useState('all');
  const [panelPeriod, setPanelPeriod] = useState('all');
  const [panelCustomStartDate, setPanelCustomStartDate] = useState('');
  const [panelCustomEndDate, setPanelCustomEndDate] = useState('');
  
  const [period, setPeriod] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Estados locais para armazenar contagens do painel de forma otimizada
  const [panelCounts, setPanelCounts] = useState({
    facebook: 0,
    instagram: 0,
    whatsapp: 0,
    whatsapp_widget: 0,
    youtube: 0,
    tiktok: 0,
    system: 0
  });

  // Filtro de tempo de resposta: 'all' | 'external' | 'internal'
  const [responseTimeFilter, setResponseTimeFilter] = useState<'all' | 'external' | 'internal'>('all');

  // Estado para métricas de tempo de resposta
  const [responseTimeStats, setResponseTimeStats] = useState({
    avgResponseMs: 0,         // Média em milissegundos
    chatsWithResponse: 0,     // Nº de chats com pelo menos 1 resposta
    chatsWithoutResponse: 0,  // Nº de chats sem nenhuma resposta
    oldestWaitingMs: 0,       // Tempo do lead mais antigo sem resposta
    oldestWaitingName: ''     // Nome do lead mais antigo sem resposta
  });

  // Carregar e monitorar Chats, LPs e Leads de LPs quando o Painel estiver aberto
  useEffect(() => {
    if (!isChannelsModalOpen) return;

    const fetchLPData = async () => {
      try {
        const latestChats = await api.getChats();
        setChats(latestChats);

        const lps = await api.getLandingPages();
        setLandingPages(lps);

        const lpSlugs = lps.map(lp => lp.slug).filter(Boolean);
        
        if (lpSlugs.length > 0) {
          const placeholders = lpSlugs.map(() => '?').join(',');
          const { results: filteredLps } = await api.runQuery(
            `SELECT * FROM leads WHERE origem IN (${placeholders}) LIMIT 100`,
            lpSlugs
          );
          setLpLeads(filteredLps || []);
        }

        const counts = await Promise.all([
          api.runQuery(`SELECT COUNT(id) as count FROM leads WHERE origem = 'Facebook Messenger'`),
          api.runQuery(`SELECT COUNT(id) as count FROM leads WHERE origem = 'Instagram Direct'`),
          api.runQuery(`SELECT COUNT(id) as count FROM leads WHERE origem = 'YouTube Comments'`),
          api.runQuery(`SELECT COUNT(id) as count FROM leads WHERE origem = 'TikTok Comments'`),
          api.runQuery(`SELECT COUNT(id) as count FROM leads WHERE origem LIKE 'WhatsApp%'`),
          api.runQuery(`SELECT COUNT(id) as count FROM leads WHERE origem LIKE 'Widget Externo%'`),
          lpSlugs.length > 0 
            ? api.runQuery(`SELECT COUNT(id) as count FROM leads WHERE origem IN (${lpSlugs.map(() => '?').join(',')})`, lpSlugs)
            : { results: [{ count: 0 }] }
        ]);

        setPanelCounts({
          facebook: counts[0].results?.[0]?.count || 0,
          instagram: counts[1].results?.[0]?.count || 0,
          youtube: counts[2].results?.[0]?.count || 0,
          tiktok: counts[3].results?.[0]?.count || 0,
          whatsapp: counts[4].results?.[0]?.count || 0,
          whatsapp_widget: counts[5].results?.[0]?.count || 0,
          system: counts[6].results?.[0]?.count || 0
        });

        // --- Calcular Tempo de Resposta ---
        let filterCond = '';
        if (responseTimeFilter === 'external') {
          filterCond = 'AND (c.isInternal IS NULL OR c.isInternal = 0)';
        } else if (responseTimeFilter === 'internal') {
          filterCond = 'AND c.isInternal = 1';
        }

        // Busca a primeira mensagem de saída (isIncoming=0) por chat
        const { results: responseData } = await api.runQuery(
          `SELECT m.chatId, MIN(m.timestamp) as firstResponseAt, c.dataCriacao as chatCreatedAt, c.leadName
           FROM messages m
           JOIN chats c ON c.id = m.chatId
           WHERE m.isIncoming = 0 ${filterCond}
           GROUP BY m.chatId`
        );

        // Chats sem nenhuma mensagem de saída (aguardando atendimento)
        const { results: noResponseData } = await api.runQuery(
          `SELECT c.id, c.leadName, c.dataCriacao
           FROM chats c
           WHERE c.status = 'active' ${filterCond}
           AND c.id NOT IN (
             SELECT DISTINCT chatId FROM messages WHERE isIncoming = 0
           )
           ORDER BY c.dataCriacao ASC`
        );

        const now = Date.now();
        let totalResponseMs = 0;
        let validResponses = 0;

        (responseData || []).forEach((row: any) => {
          const createdAt = new Date(row.chatCreatedAt).getTime();
          const respondedAt = new Date(row.firstResponseAt).getTime();
          if (!isNaN(createdAt) && !isNaN(respondedAt) && respondedAt >= createdAt) {
            totalResponseMs += respondedAt - createdAt;
            validResponses++;
          }
        });

        const avgMs = validResponses > 0 ? Math.round(totalResponseMs / validResponses) : 0;
        
        const oldestWaiting = noResponseData?.[0];
        const oldestWaitingMs = oldestWaiting
          ? now - new Date(oldestWaiting.dataCriacao).getTime()
          : 0;

        setResponseTimeStats({
          avgResponseMs: avgMs,
          chatsWithResponse: validResponses,
          chatsWithoutResponse: noResponseData?.length || 0,
          oldestWaitingMs: Math.max(0, oldestWaitingMs),
          oldestWaitingName: oldestWaiting?.leadName || ''
        });
      } catch (err: any) {
        console.error("Erro ao buscar dados de landing pages:", err);
        setErrorMessage("Erro de banco de dados D1: " + (err.message || String(err)));
      }
    };

    fetchLPData();
  }, [isChannelsModalOpen, responseTimeFilter]);

  // Carregar estatísticas com suporte a Cache (TTL de 2 minutos)
  const fetchAll = async (forceRefresh = false) => {
    setIsLoading(true);
    const cacheKey = `dashboard_cached_data_${period}_${customStartDate}_${customEndDate}`;
    
    if (typeof window !== 'undefined' && !forceRefresh) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { timestamp, stats: cachedStats, recentLeads: cachedLeads, recentCampaigns: cachedCamps } = JSON.parse(cached);
          if (Date.now() - timestamp < 2 * 60 * 1000) { // 2 minutos de TTL
            setStats(cachedStats);
            setRecentLeads(cachedLeads);
            setRecentCampaigns(cachedCamps);
            setTotalLeadsCount(cachedStats.totalLeads);
            setIsLoading(false);
            
            if (cachedStats.totalLeads === 0) {
              fetchAll(true);
            }
            return;
          }
        } catch (e) {
          console.error("Erro ao ler cache do dashboard:", e);
        }
      }
    }

    let initialStats = { 
      totalLeads: 0, 
      totalCampaigns: 0, 
      pendentes: 0, 
      leadsHoje: 0, 
      conversasPendentes: 0,
      leadsByStatus: { novo: 0, contatado: 0, convertido: 0, perdido: 0 },
      recentLeads: [] as Lead[], 
      recentCampaigns: [] as Campaign[] 
    };
    let sentToday = 0;
    let realCredits = 0;

    try {
      initialStats = await api.getDashboardStats(period, customStartDate, customEndDate);
    } catch (err: any) {
      console.error("Erro ao buscar stats iniciais:", err);
      setErrorMessage(err?.message || String(err));
    }

    try {
      sentToday = await api.getSentTodayCount();
    } catch (err) {
      console.error("Erro ao buscar envios de hoje:", err);
    }

    try {
      const settings = await api.getSettings();
      // Usando a rota Edge em vez da Server Action diretamente para evitar problemas de proxy
      const brevoRes = await fetch('/api/brevo/credits');
      if (brevoRes.ok) {
        const data = await brevoRes.json();
        realCredits = data.credits || 0;
        console.log("Brevo Credits Debug:", data.debug, data.raw);
      }
    } catch (err) {
      console.error("Erro ao buscar créditos brevo:", err);
    }

    const calculatedStats = {
      totalLeads: initialStats.totalLeads,
      totalCampaigns: initialStats.totalCampaigns,
      pendentes: initialStats.pendentes,
      leadsHoje: initialStats.leadsHoje,
      enviadosHoje: sentToday,
      limiteRestante: realCredits,
      conversasPendentes: initialStats.conversasPendentes,
      leadsByStatus: initialStats.leadsByStatus
    };

    setStats(calculatedStats);
    setRecentLeads(initialStats.recentLeads);
    setRecentCampaigns(initialStats.recentCampaigns);
    setTotalLeadsCount(initialStats.totalLeads);

    // Gravar no cache local
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          timestamp: Date.now(),
          stats: calculatedStats,
          recentLeads: initialStats.recentLeads,
          recentCampaigns: initialStats.recentCampaigns
        }));
      } catch (e) {
        console.error("Erro ao salvar cache:", e);
      }
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');

    fetchAll();
  }, [period, customStartDate, customEndDate]);

  // --- CÁLCULO DE ESTATÍSTICAS DOS CANAIS DE ENTRADA (MODAL) ---
  const channelsStats = (() => {
    const activeChatsCount = chats.length;
    const chatsUnreadCount = chats.filter(c => (c.unreadCount || 0) > 0).length;

    const channelChatCounts = {
      whatsapp: chats.filter(c => c.channel === 'whatsapp').length,
      instagram: chats.filter(c => c.channel === 'instagram').length,
      facebook: chats.filter(c => c.channel === 'facebook').length,
      youtube: chats.filter(c => c.channel === 'youtube').length,
      tiktok: chats.filter(c => c.channel === 'tiktok').length,
      system: chats.filter(c => c.channel === 'system').length,
    };

    const sourceCounts: Record<string, number> = {};
    let totalLeadsWithSource = 0;
    
    const currentLeadsList = recentLeads || [];
    currentLeadsList.forEach((l: Lead) => {
      const source = l.origem || 'Outros';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      totalLeadsWithSource++;
    });

    const sortedSources = Object.entries(sourceCounts)
      .map(([name, count]) => ({
        name,
        count,
        percent: totalLeadsWithSource > 0 ? (count / totalLeadsWithSource) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    while (sortedSources.length < 4) {
      sortedSources.push({
        name: sortedSources.length === 0 ? 'Sem dados' : 'Outros',
        count: 0,
        percent: 0
      });
    }

    return {
      activeChatsCount,
      chatsUnreadCount,
      channelChatCounts,
      sortedSources,
      totalLeadsWithSource
    };
  })();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'novo': return 'var(--primary)';
      case 'contatado': return '#3b82f6';
      case 'convertido': return 'var(--success)';
      case 'perdido': return 'var(--danger)';
      default: return '#cbd5e1';
    }
  };

  // Formata duração em milissegundos para string legível
  const formatDuration = (ms: number): string => {
    if (ms <= 0) return '–';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      const remH = hours % 24;
      return remH > 0 ? `${days}d ${remH}h` : `${days}d`;
    }
    if (hours > 0) {
      const remM = minutes % 60;
      return remM > 0 ? `${hours}h ${remM}min` : `${hours}h`;
    }
    if (minutes > 0) return `${minutes}min`;
    return `${totalSeconds}s`;
  };

  // Cor de urgência baseada no tempo de espera
  const getUrgencyColor = (ms: number): string => {
    const hours = ms / (1000 * 60 * 60);
    if (hours < 1) return '#10b981';   // verde: menos de 1h
    if (hours < 4) return '#f59e0b';   // amarelo: 1–4h
    if (hours < 24) return '#ef4444';  // vermelho: 4–24h
    return '#dc2626';                   // vermelho escuro: mais de 24h
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Placeholder to prevent undefined error if user clicks it
    setImportStatus('Funcionalidade de importação movida para a tela de Leads.');
  };

  const getStatusPercent = (count: number) => {
    return stats.totalLeads > 0 ? Math.round((count / stats.totalLeads) * 100) : 0;
  };

  return (
    <div className="dashboard-wrapper">
      {errorMessage && (
        <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '1rem', borderRadius: '12px', marginBottom: '2.5rem', fontWeight: 600 }}>
          Erro ao carregar dados do Firebase: {errorMessage}
        </div>
      )}
      <header style={{ 
        marginBottom: '2.5rem', 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'flex-end',
        gap: isMobile ? '1.25rem' : '0' 
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.025em', wordBreak: 'break-word' }}>{greeting}, Administrador 👋</h2>
          <p style={{ opacity: 0.6, fontSize: isMobile ? '0.95rem' : '1.05rem', marginTop: '0.25rem' }}>Aqui está o resumo do seu centro de comando hoje.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <select 
            value={period} 
            onChange={e => setPeriod(e.target.value)}
            style={{ 
              padding: '0.5rem 1rem', 
              borderRadius: '50px', 
              border: '1px solid var(--border)', 
              background: 'white', 
              fontSize: '0.875rem', 
              fontWeight: 600, 
              color: '#1e293b', 
              cursor: 'pointer',
              outline: 'none',
              flex: isMobile ? 1 : 'none'
            }}
          >
            <option value="all">Todo o período</option>
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="month">Este Mês</option>
            <option value="custom">Personalizado</option>
          </select>
          
          {period === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'white', padding: '0.25rem 0.5rem', borderRadius: '50px', border: '1px solid var(--border)', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
              <input 
                type="date" 
                value={customStartDate} 
                onChange={e => setCustomStartDate(e.target.value)}
                style={{ padding: '0.25rem', border: 'none', background: 'transparent', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', outline: 'none', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>até</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={e => setCustomEndDate(e.target.value)}
                style={{ padding: '0.25rem', border: 'none', background: 'transparent', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', outline: 'none', cursor: 'pointer' }}
              />
            </div>
          )}

          <div style={{ background: 'white', padding: '0.5rem 1rem', borderRadius: '50px', border: '1px solid var(--border)', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: isMobile ? 1 : 'none', justifyContent: 'center' }}>
            <Calendar size={16} />
            {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
        </div>
      </header>

      {/* STATS CARDS */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: isMobile ? '0.75rem' : '1.25rem', 
        marginBottom: '2.5rem' 
      }}>
        <StatCard 
          icon={<MessageSquare size={24} />} 
          title="Conversas Pendentes" 
          value={stats.conversasPendentes} 
          color="#ef4444" 
          bgColor="rgba(239, 68, 68, 0.1)" 
        />
        <StatCard 
          icon={<Zap size={24} />} 
          title="Leads Hoje" 
          value={`+${stats.leadsHoje}`} 
          color="var(--success)" 
          bgColor="rgba(16, 185, 129, 0.1)" 
          highlight
        />
        <StatCard 
          icon={<Mail size={24} />} 
          title="Campanhas Ativas" 
          value={stats.totalCampaigns} 
          color="#8b5cf6" 
          bgColor="rgba(139, 92, 246, 0.1)" 
        />
        <StatCard 
          icon={<Clock size={24} />} 
          title="Fila Pendente" 
          value={stats.pendentes} 
          color="var(--warning)" 
          bgColor="rgba(245, 158, 11, 0.1)" 
        />
        <StatCard 
          icon={<Send size={24} />} 
          title="Créditos Brevo" 
          value={stats.limiteRestante} 
          color="#ec4899" 
          bgColor="rgba(236, 72, 153, 0.1)" 
        />
        <div onClick={() => setIsChannelsModalOpen(true)} style={{ cursor: 'pointer' }}>
          <StatCard 
            icon={<Megaphone size={24} />} 
            title="Canais de Entrada" 
            value="Ver Painel" 
            color="#06b6d4" 
            bgColor="rgba(6, 182, 212, 0.1)" 
            highlight
          />
        </div>
      </div>

      <div className="grid" style={{ 
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
        gap: '1.5rem', 
        marginBottom: '1.5rem' 
      }}>
        {/* LEAD FUNNEL */}
        <div className="card" style={{ padding: isMobile ? '1.25rem 1rem' : '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h4 style={{ fontWeight: 700, fontSize: '1.15rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
              Funil de Leads
            </h4>
            <span style={{ fontSize: '0.875rem', background: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '50px', fontWeight: 600, color: '#64748b' }}>Taxa: {getStatusPercent(stats.leadsByStatus.convertido)}%</span>
          </div>

          <div style={{ display: 'grid', gap: '1.25rem' }}>
            {[
              { label: 'Novos', count: stats.leadsByStatus.novo, id: 'novo' },
              { label: 'Em Contato', count: stats.leadsByStatus.contatado, id: 'contatado' },
              { label: 'Convertidos', count: stats.leadsByStatus.convertido, id: 'convertido' },
              { label: 'Perdidos', count: stats.leadsByStatus.perdido, id: 'perdido' }
            ].map(status => (
              <div key={status.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9375rem', fontWeight: 600 }}>
                  <span style={{ color: '#475569' }}>{status.label}</span>
                  <span style={{ color: '#1e293b' }}>{status.count} <span style={{ opacity: 0.5, fontSize: '0.75rem', fontWeight: 500 }}>({getStatusPercent(status.count)}%)</span></span>
                </div>
                <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      background: getStatusColor(status.id), 
                      width: `${getStatusPercent(status.count)}%`,
                      borderRadius: '4px',
                      transition: 'width 1s ease-out'
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QUICK ACTIONS & CAMPAIGNS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: isMobile ? '1.25rem 1rem' : '1.75rem', flex: 1 }}>
            <h4 style={{ fontWeight: 700, fontSize: '1.15rem', color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={20} style={{ color: 'var(--warning)' }} />
              Ações Rápidas
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
              <button 
                onClick={() => router.push('/campanhas')}
                style={{ padding: '1.25rem', background: 'linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%)', color: 'white', borderRadius: '16px', textAlign: 'left', cursor: 'pointer', border: 'none', transition: 'transform 0.2s', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' }}
                className="hover-lift"
              >
                <Megaphone size={24} style={{ marginBottom: '0.75rem' }} />
                <h5 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Nova Campanha</h5>
                <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Crie um disparo de e-mail</p>
              </button>

              <button 
                onClick={() => setIsImportModalOpen(true)}
                style={{ padding: '1.25rem', background: '#f8fafc', color: '#1e293b', borderRadius: '16px', textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.2s' }}
                className="hover-lift"
              >
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', marginBottom: '0.75rem' }}>
                  <UserPlus size={20} />
                </div>
                <h5 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Importar Leads</h5>
                <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Faça upload via arquivo CSV</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ 
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
        gap: '1.5rem' 
      }}>
        {/* RECENT LEADS */}
        <div className="card" style={{ padding: isMobile ? '1.25rem 1rem' : '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h4 style={{ fontWeight: 700, fontSize: '1.15rem', color: '#1e293b' }}>Leads Mais Recentes</h4>
            <button onClick={() => router.push('/leads')} style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              Ver todos <ArrowRight size={16} />
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentLeads.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem 0' }}>Nenhum lead capturado ainda.</p>
            ) : (
              recentLeads.map(lead => (
                <div key={lead.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {lead.nome ? lead.nome[0].toUpperCase() : lead.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#1e293b' }}>{lead.nome || 'Sem Nome'}</p>
                      <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>{lead.email}</p>
                    </div>
                  </div>
                  <span className={`badge badge-${lead.status}`}>
                    {lead.status.toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RECENT CAMPAIGNS */}
        <div className="card" style={{ padding: isMobile ? '1.25rem 1rem' : '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h4 style={{ fontWeight: 700, fontSize: '1.15rem', color: '#1e293b' }}>Últimas Campanhas</h4>
            <button onClick={() => router.push('/campanhas')} style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              Ver todas <ArrowRight size={16} />
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentCampaigns.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem 0' }}>Nenhuma campanha criada ainda.</p>
            ) : (
              recentCampaigns.map(camp => (
                <div key={camp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Megaphone size={18} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#1e293b' }}>{camp.nome}</p>
                      <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>{new Date(camp.dataCriacao).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {camp.status === 'concluída' ? <CheckCircle2 size={16} color="var(--success)" /> : <Clock size={16} color="var(--warning)" />}
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: camp.status === 'concluída' ? 'var(--success)' : 'var(--warning)', textTransform: 'capitalize' }}>
                      {camp.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isImportModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', position: 'relative', padding: '2.5rem' }}>
            <button style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', opacity: 0.5, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setIsImportModalOpen(false)}>
              <X size={24} />
            </button>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: 800, fontSize: '1.5rem', color: '#1e293b' }}>Importar Leads</h3>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', marginBottom: '2rem' }}>
              O arquivo CSV deve conter as colunas: <strong>nome, email e telefone</strong>.
            </p>
            
            <div 
              style={{ border: '2px dashed var(--primary)', borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(99, 102, 241, 0.03)', transition: 'background 0.2s' }} 
              onClick={() => document.getElementById('csv-file')?.click()}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.03)'}
            >
              <Upload size={40} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
              <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>{importStatus ? 'Status da Importação:' : 'Clique para selecionar o arquivo'}</p>
              <p style={{ fontSize: '0.875rem', color: importStatus.includes('sucesso') ? 'var(--success)' : '#64748b' }}>
                {importStatus || 'Apenas arquivos .csv são suportados'}
              </p>
              <input 
                id="csv-file" 
                type="file" 
                accept=".csv" 
                hidden 
                onChange={handleCSVImport}
              />
            </div>
          </div>
        </div>
      )}

      {isChannelsModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: '#0b0f19', color: '#f8fafc', zIndex: 1000, padding: '2.5rem', display: 'flex', flexDirection: 'column', overflowY: 'auto', fontFamily: "'Inter', sans-serif" }}>
          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #1e293b', paddingBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc' }}>
                <Megaphone size={22} style={{ color: '#06b6d4' }} />
                Painel de Canais & LPs
              </h3>
              <p style={{ opacity: 0.5, fontSize: '0.8125rem', marginTop: '0.25rem' }}>Estatísticas em tempo real, leads de landing pages e fontes de tráfego.</p>
            </div>

            {/* Filters and Close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {/* LP Filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Página de Captura</span>
                  <select 
                    value={panelFilterLp}
                    onChange={e => setPanelFilterLp(e.target.value)}
                    style={{ background: '#111827', color: '#f8fafc', border: '1px solid #1e293b', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8125rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="all">Todas as LPs</option>
                    {landingPages.map(lp => (
                      <option key={lp.id} value={lp.slug}>{lp.config?.titulo || lp.slug} (/{lp.slug})</option>
                    ))}
                  </select>
                </div>

                {/* Channel Filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Canal de Tráfego</span>
                  <select 
                    value={panelFilterChannel}
                    onChange={e => setPanelFilterChannel(e.target.value)}
                    style={{ background: '#111827', color: '#f8fafc', border: '1px solid #1e293b', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8125rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="all">Todos os Canais</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Messenger/Facebook</option>
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">Tiktok</option>
                    <option value="system">Sistema/Site</option>
                  </select>
                </div>

                {/* Lead Status Filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Status do Lead</span>
                  <select 
                    value={panelFilterStatus}
                    onChange={e => setPanelFilterStatus(e.target.value)}
                    style={{ background: '#111827', color: '#f8fafc', border: '1px solid #1e293b', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8125rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="all">Todos os Status</option>
                    <option value="novo">Novo</option>
                    <option value="contatado">Contatado</option>
                    <option value="convertido">Convertido</option>
                    <option value="perdido">Perdido</option>
                  </select>
                </div>

                {/* Period Filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Período</span>
                  <select 
                    value={panelPeriod}
                    onChange={e => setPanelPeriod(e.target.value)}
                    style={{ background: '#111827', color: '#f8fafc', border: '1px solid #1e293b', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8125rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="all">Todo o período</option>
                    <option value="today">Hoje</option>
                    <option value="7d">Últimos 7 dias</option>
                    <option value="30d">Últimos 30 dias</option>
                    <option value="month">Este Mês</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>

                {panelPeriod === 'custom' && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#111827', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid #1e293b', alignSelf: 'flex-end', height: '35px' }}>
                    <input 
                      type="date" 
                      value={panelCustomStartDate} 
                      onChange={e => setPanelCustomStartDate(e.target.value)}
                      style={{ padding: '0.25rem', border: 'none', background: 'transparent', fontSize: '0.8125rem', fontWeight: 600, color: '#f8fafc', outline: 'none', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>até</span>
                    <input 
                      type="date" 
                      value={panelCustomEndDate} 
                      onChange={e => setPanelCustomEndDate(e.target.value)}
                      style={{ padding: '0.25rem', border: 'none', background: 'transparent', fontSize: '0.8125rem', fontWeight: 600, color: '#f8fafc', outline: 'none', cursor: 'pointer' }}
                    />
                  </div>
                )}
              </div>

              <button 
                style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s', alignSelf: 'flex-end', height: '38px', marginTop: 'auto' }}
                onClick={() => setIsChannelsModalOpen(false)}
                onMouseOver={e => e.currentTarget.style.background = '#dc2626'}
                onMouseOut={e => e.currentTarget.style.background = '#ef4444'}
              >
                <X size={18} /> Fechar Painel
              </button>
            </div>
          </div>

          {/* Filtering Logic applied to counts */}
          {(() => {
            const filteredChats = chats.filter(c => {
              if (panelFilterChannel !== 'all' && c.channel !== panelFilterChannel) return false;
              
              if (panelPeriod !== 'all') {
                const timestamp = c.lastTimestamp || c.dataCriacao;
                if (!timestamp) return true;
                const d = new Date(timestamp);
                const now = new Date();
                let limitDate = new Date(0);
                let endDate = new Date(now);
                
                if (panelPeriod === 'today') {
                  limitDate = new Date();
                  limitDate.setHours(0,0,0,0);
                } else if (panelPeriod === '7d') {
                  limitDate = new Date(now);
                  limitDate.setDate(now.getDate() - 7);
                } else if (panelPeriod === '30d') {
                  limitDate = new Date(now);
                  limitDate.setDate(now.getDate() - 30);
                } else if (panelPeriod === 'month') {
                  limitDate = new Date(now.getFullYear(), now.getMonth(), 1);
                } else if (panelPeriod === 'custom') {
                  if (panelCustomStartDate) limitDate = new Date(panelCustomStartDate + 'T00:00:00');
                  if (panelCustomEndDate) endDate = new Date(panelCustomEndDate + 'T23:59:59');
                }
                
                if (d < limitDate || d > endDate) return false;
              }
              return true;
            });

            const filteredLpLeads = lpLeads.filter(l => {
              if (panelFilterLp !== 'all' && l.origem !== panelFilterLp) return false;
              if (panelFilterStatus !== 'all' && l.status !== panelFilterStatus) return false;
              
              if (panelPeriod !== 'all') {
                const d = new Date(l.dataCriacao);
                const now = new Date();
                let limitDate = new Date(0);
                let endDate = new Date(now);
                
                if (panelPeriod === 'today') {
                  limitDate = new Date();
                  limitDate.setHours(0,0,0,0);
                } else if (panelPeriod === '7d') {
                  limitDate = new Date(now);
                  limitDate.setDate(now.getDate() - 7);
                } else if (panelPeriod === '30d') {
                  limitDate = new Date(now);
                  limitDate.setDate(now.getDate() - 30);
                } else if (panelPeriod === 'month') {
                  limitDate = new Date(now.getFullYear(), now.getMonth(), 1);
                } else if (panelPeriod === 'custom') {
                  if (panelCustomStartDate) limitDate = new Date(panelCustomStartDate + 'T00:00:00');
                  if (panelCustomEndDate) endDate = new Date(panelCustomEndDate + 'T23:59:59');
                }
                
                if (d < limitDate || d > endDate) return false;
              }
              return true;
            });

            const unreadCount = filteredChats.filter(c => (c.unreadCount || 0) > 0).length;

            const channelLeadCounts = {
              facebook: panelCounts.facebook,
              instagram: panelCounts.instagram,
              whatsapp: panelCounts.whatsapp,
              whatsapp_widget: panelCounts.whatsapp_widget,
              youtube: panelCounts.youtube,
              tiktok: panelCounts.tiktok,
              system: panelCounts.system
            };

            const totalLeadsCalculated = channelLeadCounts.facebook + channelLeadCounts.instagram + channelLeadCounts.whatsapp + channelLeadCounts.whatsapp_widget + channelLeadCounts.youtube + channelLeadCounts.tiktok + channelLeadCounts.system;

            // Fontes de Leads a partir de todas as fontes de entrada do painel
            const allSources = [
              { name: 'Messenger', count: channelLeadCounts.facebook },
              { name: 'Instagram', count: channelLeadCounts.instagram },
              { name: 'WhatsApp', count: channelLeadCounts.whatsapp },
              { name: 'Botão WhatsApp', count: channelLeadCounts.whatsapp_widget },
              { name: 'YouTube', count: channelLeadCounts.youtube },
              { name: 'TikTok', count: channelLeadCounts.tiktok },
              { name: 'Landing Pages', count: channelLeadCounts.system }
            ];

            const sortedSources = allSources
              .map(item => ({
                name: item.name,
                count: item.count,
                percent: totalLeadsCalculated > 0 ? (item.count / totalLeadsCalculated) : 0
              }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 4);

            while (sortedSources.length < 4) {
              sortedSources.push({
                name: sortedSources.length === 0 ? 'Sem dados' : 'Outros',
                count: 0,
                percent: 0
              });
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1 }}>
                {/* Stats cards and radial rings grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '2rem' }}>
                  
                  {/* Col 1: Mensagens Recebidas / Canais */}
                  <div style={{ background: '#111827', borderRadius: '16px', border: '1px solid #1f2937', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                      <div>
                        <h5 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>Leads por Canal / Origem</h5>
                        <p style={{ fontSize: '0.625rem', color: '#6b7280', marginTop: '0.25rem' }}>Canal: {panelFilterChannel === 'all' ? 'Todos' : panelFilterChannel.toUpperCase()}</p>
                      </div>
                      <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981', lineHeight: '1' }}>{totalLeadsCalculated}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                      {[
                        { label: 'Messenger', count: channelLeadCounts.facebook, color: '#3b82f6', icon: '💬', code: 'facebook' },
                        { label: 'Instagram', count: channelLeadCounts.instagram, color: '#ec4899', icon: '📸', code: 'instagram' },
                        { label: 'WhatsApp (Atendimento)', count: channelLeadCounts.whatsapp, color: '#10b981', icon: '🟢', code: 'whatsapp' },
                        { label: 'Botão WhatsApp (Site)', count: channelLeadCounts.whatsapp_widget, color: '#25d366', icon: '📲', code: 'whatsapp_widget' },
                        { label: 'YouTube / Comentários', count: channelLeadCounts.youtube, color: '#ef4444', icon: '🔴', code: 'youtube' },
                        { label: 'Tiktok', count: channelLeadCounts.tiktok, color: '#f43f5e', icon: '🎵', code: 'tiktok' },
                        { label: 'Sistema / Captura', count: channelLeadCounts.system, color: '#6366f1', icon: '🌐', code: 'system' }
                      ].map((ch, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => router.push(`/leads?canal=${ch.code}`)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            padding: '0.5rem', 
                            margin: '0 -0.5rem',
                            borderRadius: '8px',
                            borderBottom: '1px solid #1f2937', 
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          className="channel-item-hover"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1rem' }}>{ch.icon}</span>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#e5e7eb' }}>{ch.label}</span>
                          </div>
                          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: ch.color }}>{ch.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Col 2: Conversas / Métricas Rápidas */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div style={{ background: '#111827', borderRadius: '16px', border: '1px solid #1f2937', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <h5 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '0.5rem' }}>Conversas Ativas</h5>
                      <p style={{ fontSize: '2.25rem', fontWeight: 800, color: '#38bdf8', lineHeight: '1' }}>{filteredChats.length}</p>
                    </div>

                    <div style={{ background: '#111827', borderRadius: '16px', border: '1px solid #1f2937', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <h5 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#ef4444', marginBottom: '0.5rem' }}>Mensagens não lidas</h5>
                      <p style={{ fontSize: '2.25rem', fontWeight: 800, color: '#ef4444', lineHeight: '1' }}>{unreadCount}</p>
                    </div>

                    {/* Tempo Médio de Resposta */}
                    <div style={{
                      background: responseTimeStats.avgResponseMs === 0 ? '#111827' : 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 100%)',
                      borderRadius: '16px',
                      border: `1px solid ${responseTimeStats.avgResponseMs === 0 ? '#1f2937' : 'rgba(16,185,129,0.3)'}`,
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.9rem' }}>⚡</span>
                          <h5 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.05em', margin: 0 }}>Tempo Médio de Resposta</h5>
                        </div>
                        <select 
                          value={responseTimeFilter}
                          onChange={(e) => setResponseTimeFilter(e.target.value as any)}
                          style={{
                            background: '#1f2937',
                            border: '1px solid #374151',
                            color: '#f3f4f6',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            padding: '2px 6px',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="all">Todos</option>
                          <option value="external">Externos</option>
                          <option value="internal">Internos</option>
                        </select>
                      </div>
                      <p style={{ fontSize: '1.75rem', fontWeight: 800, color: responseTimeStats.avgResponseMs === 0 ? '#6b7280' : '#10b981', lineHeight: '1.1' }}>
                        {formatDuration(responseTimeStats.avgResponseMs)}
                      </p>
                      <p style={{ fontSize: '0.6875rem', color: '#6b7280', marginTop: '0.4rem' }}>
                        {responseTimeStats.chatsWithResponse > 0
                          ? `Baseado em ${responseTimeStats.chatsWithResponse} conversa${responseTimeStats.chatsWithResponse !== 1 ? 's' : ''}`
                          : 'Sem dados ainda'}
                      </p>
                    </div>

                    {/* Aguardando Atendimento */}
                    <div style={{
                      background: responseTimeStats.chatsWithoutResponse === 0 ? '#111827' : 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.04) 100%)',
                      borderRadius: '16px',
                      border: `1px solid ${responseTimeStats.chatsWithoutResponse === 0 ? '#1f2937' : 'rgba(239,68,68,0.35)'}`,
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: responseTimeStats.chatsWithoutResponse > 0 ? 'pointer' : 'default'
                    }}
                    onClick={() => responseTimeStats.chatsWithoutResponse > 0 && router.push('/atendimento')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.9rem' }}>🕐</span>
                        <h5 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: responseTimeStats.chatsWithoutResponse > 0 ? '#ef4444' : '#9ca3af', letterSpacing: '0.05em' }}>Aguardando 1º Contato</h5>
                      </div>
                      <p style={{ fontSize: '1.75rem', fontWeight: 800, color: responseTimeStats.chatsWithoutResponse === 0 ? '#10b981' : '#ef4444', lineHeight: '1.1' }}>
                        {responseTimeStats.chatsWithoutResponse === 0 ? '✓ Ok' : responseTimeStats.chatsWithoutResponse}
                      </p>
                      {responseTimeStats.chatsWithoutResponse > 0 && responseTimeStats.oldestWaitingName && (
                        <div style={{ marginTop: '0.4rem' }}>
                          <p style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>
                            Mais antigo: <span style={{ color: getUrgencyColor(responseTimeStats.oldestWaitingMs), fontWeight: 700 }}>{responseTimeStats.oldestWaitingName}</span>
                          </p>
                          <p style={{ fontSize: '0.6875rem', color: getUrgencyColor(responseTimeStats.oldestWaitingMs), fontWeight: 600 }}>
                            Aguardando há {formatDuration(responseTimeStats.oldestWaitingMs)}
                          </p>
                        </div>
                      )}
                      {responseTimeStats.chatsWithoutResponse === 0 && (
                        <p style={{ fontSize: '0.6875rem', color: '#10b981', marginTop: '0.4rem' }}>Todos atendidos!</p>
                      )}
                    </div>

                    <div style={{ background: '#111827', borderRadius: '16px', border: '1px solid #1f2937', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <h5 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '0.25rem' }}>Leads Filtrados de LPs</h5>
                      <p style={{ fontSize: '2.25rem', fontWeight: 800, color: '#10b981', lineHeight: '1' }}>{filteredLpLeads.length}</p>
                    </div>

                    <div style={{ background: '#111827', borderRadius: '16px', border: '1px solid #1f2937', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <h5 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '0.25rem' }}>LPs Ativas</h5>
                      <p style={{ fontSize: '2.25rem', fontWeight: 800, color: '#c084fc', lineHeight: '1' }}>{landingPages.length}</p>
                    </div>
                  </div>

                  {/* Col 3: Fontes de Lead (Radial Rings) */}
                  <div style={{ background: '#111827', borderRadius: '16px', border: '1px solid #1f2937', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    <h5 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '1rem' }}>Desempenho por Fontes de Entrada</h5>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flex: 1 }}>
                      {/* SVG Concentric Rings */}
                      <div style={{ position: 'relative', width: '160px', height: '160px' }}>
                        <svg width="160" height="160" viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)' }}>
                          {[
                            { radius: 90, color: '#c084fc', data: sortedSources[0] },
                            { radius: 75, color: '#4ade80', data: sortedSources[1] },
                            { radius: 60, color: '#38bdf8', data: sortedSources[2] },
                            { radius: 45, color: '#fbbf24', data: sortedSources[3] }
                          ].map((ring, idx) => {
                            const circumference = 2 * Math.PI * ring.radius;
                            const strokeDashoffset = circumference - (ring.data ? ring.data.percent : 0) * circumference;
                            return (
                              <g key={idx}>
                                <circle
                                  cx="110"
                                  cy="110"
                                  r={ring.radius}
                                  fill="none"
                                  stroke="#1f2937"
                                  strokeWidth="10"
                                />
                                <circle
                                  cx="110"
                                  cy="110"
                                  r={ring.radius}
                                  fill="none"
                                  stroke={ring.color}
                                  strokeWidth="10"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={strokeDashoffset}
                                  strokeLinecap="round"
                                  style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                                />
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      {/* Labels / Legend */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                        {[
                          { color: '#c084fc', data: sortedSources[0] },
                          { color: '#4ade80', data: sortedSources[1] },
                          { color: '#38bdf8', data: sortedSources[2] },
                          { color: '#fbbf24', data: sortedSources[3] }
                        ].map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                            <div style={{ overflow: 'hidden', width: '100%' }}>
                              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f3f4f6', textTransform: 'uppercase', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {item.data?.name || 'Sem dados'}
                              </p>
                              <p style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>
                                {item.data?.count || 0} leads ({item.data ? Math.round(item.data.percent * 100) : 0}%)
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Leads captured by Landing Pages */}
                <div style={{ background: '#111827', borderRadius: '16px', border: '1px solid #1f2937', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                        Leads de Páginas de Captura ({filteredLpLeads.length})
                      </h4>
                      <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: '0.25rem' }}>Filtro atual: {panelFilterLp === 'all' ? 'Todas as LPs' : `/${panelFilterLp}`} | Status: {panelFilterStatus === 'all' ? 'Todos' : panelFilterStatus.toUpperCase()}</p>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    {filteredLpLeads.length === 0 ? (
                      <p style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', fontSize: '0.9375rem' }}>Nenhum lead encontrado com os filtros selecionados.</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e5e7eb' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #1f2937', textAlign: 'left' }}>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Nome</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>E-mail</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>WhatsApp/Celular</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Página de Origem</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Status</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Data Cadastro</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Aguardando há</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredLpLeads.map((lead) => {
                            const waitMs = Date.now() - new Date(lead.dataCriacao).getTime();
                            const urgencyColor = lead.status === 'novo' ? getUrgencyColor(waitMs) : '#6b7280';
                            const waitLabel = lead.status === 'novo' ? formatDuration(waitMs) : '–';
                            return (
                            <tr key={lead.id} style={{ borderBottom: '1px solid #1f2937', fontSize: '0.875rem' }} onMouseOver={e => e.currentTarget.style.background = '#1f2937'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: '1rem', fontWeight: 600, color: '#f3f4f6' }}>{lead.nome}</td>
                              <td style={{ padding: '1rem', color: '#9ca3af' }}>{lead.email}</td>
                              <td style={{ padding: '1rem' }}>{lead.celular || lead.telefone || '-'}</td>
                              <td style={{ padding: '1rem', color: '#38bdf8', fontWeight: 500 }}>
                                <span style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '6px' }}>
                                  /{lead.origem}
                                </span>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <span className={`badge badge-${lead.status}`} style={{ textTransform: 'uppercase', fontSize: '0.6875rem', fontWeight: 700 }}>
                                  {lead.status}
                                </span>
                              </td>
                              <td style={{ padding: '1rem', color: '#9ca3af' }}>
                                {new Date(lead.dataCriacao).toLocaleDateString('pt-BR')} {new Date(lead.dataCriacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td style={{ padding: '1rem' }}>
                                {lead.status === 'novo' ? (
                                  <span style={{
                                    background: `${urgencyColor}20`,
                                    color: urgencyColor,
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '20px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    border: `1px solid ${urgencyColor}40`
                                  }}>
                                    ⏱ {waitLabel}
                                  </span>
                                ) : (
                                  <span style={{ color: '#4b5563', fontSize: '0.8rem' }}>–</span>
                                )}
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <style jsx>{`
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px -5px rgba(0,0,0,0.1);
        }
        .channel-item-hover:hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
          transform: translateX(4px);
        }
      `}</style>
    </div>
  );
}

function StatCard({ icon, title, value, color, bgColor, highlight = false }: any) {
  return (
    <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: highlight ? `1px solid ${color}` : '1px solid var(--border)', background: highlight ? bgColor : 'var(--card)', minWidth: 0 }}>
      <div style={{ background: bgColor, width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: color, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0, overflow: 'hidden' }}>
        <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</p>
        <h3 style={{ fontSize: value === 'Ver Painel' ? '1.1rem' : '1.4rem', fontWeight: 800, color: '#1e293b', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</h3>
      </div>
    </div>
  );
}

