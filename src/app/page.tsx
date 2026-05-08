'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Lead, Campaign, FilaEnvio } from '@/types/crm';
import { useRouter } from 'next/navigation';
import { getBrevoCreditsAction } from '@/app/actions/brevo';
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
  Calendar
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [greeting, setGreeting] = useState('Bem-vindo');
  
  interface DashboardStats {
    totalLeads: number;
    leadsHoje: number;
    totalCampaigns: number;
    enviadosHoje: number;
    pendentes: number;
    limiteRestante: number;
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
    leadsByStatus: { novo: 0, contatado: 0, convertido: 0, perdido: 0 }
  });

  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  
  const [period, setPeriod] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [rawData, setRawData] = useState<{ leads: Lead[], campaigns: Campaign[], queue: FilaEnvio[], sentToday: number, realCredits: number } | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');

    const fetchAll = async () => {
      const leads = await api.getLeads();
      const campaigns = await api.getCampaigns();
      const queue = await api.getQueue();
      const sentToday = await api.getSentTodayCount();
      const settings = await api.getSettings();
      const realCredits = await getBrevoCreditsAction(settings.brevoApiKey);
      setRawData({ leads, campaigns, queue, sentToday, realCredits });
    };

    fetchAll();
  }, []);

  useEffect(() => {
    if (!rawData) return;

    const { leads, campaigns, queue, sentToday, realCredits } = rawData;
    const now = new Date();
    let limitDate = new Date(0);
    let endDate = new Date(now);
    // Para períodos pré-definidos, o endDate é sempre o momento atual
    
    if (period === 'today') {
      limitDate = new Date();
      limitDate.setHours(0,0,0,0);
    } else if (period === '7d') {
      limitDate = new Date(now);
      limitDate.setDate(now.getDate() - 7);
    } else if (period === '30d') {
      limitDate = new Date(now);
      limitDate.setDate(now.getDate() - 30);
    } else if (period === 'month') {
      limitDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'custom') {
      if (customStartDate) {
        limitDate = new Date(customStartDate + 'T00:00:00');
      }
      if (customEndDate) {
        endDate = new Date(customEndDate + 'T23:59:59');
      }
    }

    const filteredLeads = leads.filter(l => {
      const d = new Date(l.dataCriacao);
      return d >= limitDate && d <= endDate;
    });
    const filteredCampaigns = campaigns.filter(c => {
      const d = new Date(c.dataCriacao);
      return d >= limitDate && d <= endDate;
    });

    const todayString = now.toISOString().split('T')[0];
    const leadsHoje = leads.filter(l => l.dataCriacao.startsWith(todayString)).length;

    const leadsByStatus = {
      novo: filteredLeads.filter(l => l.status === 'novo').length,
      contatado: filteredLeads.filter(l => l.status === 'contatado').length,
      convertido: filteredLeads.filter(l => l.status === 'convertido').length,
      perdido: filteredLeads.filter(l => l.status === 'perdido').length,
    };

    setStats({
      totalLeads: filteredLeads.length,
      leadsHoje: leadsHoje, // leadsHoje is absolute for today regardless of filter (or could be relative, but "hoje" is constant)
      totalCampaigns: filteredCampaigns.length,
      enviadosHoje: sentToday,
      pendentes: queue.filter(q => q.status === 'pendente' || (q.status === 'erro' && q.tentativa < 3)).length,
      limiteRestante: realCredits,
      leadsByStatus
    });

    setRecentLeads(filteredLeads.slice(0, 5));
    setRecentCampaigns(filteredCampaigns.slice(0, 4));
  }, [rawData, period, customStartDate, customEndDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'novo': return 'var(--primary)';
      case 'contatado': return '#3b82f6';
      case 'convertido': return 'var(--success)';
      case 'perdido': return 'var(--danger)';
      default: return '#cbd5e1';
    }
  };

  const getStatusPercent = (count: number) => {
    return stats.totalLeads > 0 ? Math.round((count / stats.totalLeads) * 100) : 0;
  };

  return (
    <div className="dashboard-wrapper">
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.025em' }}>{greeting}, Administrador 👋</h2>
          <p style={{ opacity: 0.6, fontSize: '1.05rem', marginTop: '0.25rem' }}>Aqui está o resumo do seu centro de comando hoje.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
              outline: 'none'
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
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'white', padding: '0.25rem 0.5rem', borderRadius: '50px', border: '1px solid var(--border)' }}>
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

          <div style={{ background: 'white', padding: '0.5rem 1rem', borderRadius: '50px', border: '1px solid var(--border)', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={16} />
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </header>

      {/* STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <StatCard 
          icon={<Users size={24} />} 
          title="Total de Leads" 
          value={stats.totalLeads} 
          color="var(--primary)" 
          bgColor="rgba(99, 102, 241, 0.1)" 
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
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* LEAD FUNNEL */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h4 style={{ fontWeight: 700, fontSize: '1.15rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
              Funil de Leads
            </h4>
            <span style={{ fontSize: '0.875rem', background: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '50px', fontWeight: 600, color: '#64748b' }}>Taxa de Conversão: {getStatusPercent(stats.leadsByStatus.convertido)}%</span>
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
          <div className="card" style={{ padding: '1.75rem', flex: 1 }}>
            <h4 style={{ fontWeight: 700, fontSize: '1.15rem', color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={20} style={{ color: 'var(--warning)' }} />
              Ações Rápidas
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* RECENT LEADS */}
        <div className="card" style={{ padding: '1.75rem' }}>
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
        <div className="card" style={{ padding: '1.75rem' }}>
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
                    {camp.status === 'enviado' ? <CheckCircle2 size={16} color="var(--success)" /> : <Clock size={16} color="var(--warning)" />}
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: camp.status === 'enviado' ? 'var(--success)' : 'var(--warning)', textTransform: 'capitalize' }}>
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

      <style jsx>{`
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px -5px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
}

function StatCard({ icon, title, value, color, bgColor, highlight = false }: any) {
  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', border: highlight ? `1px solid ${color}` : '1px solid var(--border)', background: highlight ? bgColor : 'var(--card)' }}>
      <div style={{ background: bgColor, width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>{title}</p>
        <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{value}</h3>
      </div>
    </div>
  );
}

