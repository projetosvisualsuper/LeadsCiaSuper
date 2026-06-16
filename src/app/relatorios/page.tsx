'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/services/api';
import { FilaEnvio, Campaign } from '@/types/crm';
import { 
  BarChart3, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Users,
  DollarSign,
  Compass,
  MapPin,
  ListOrdered,
  Upload
} from 'lucide-react';

export default function RelatoriosPage() {
  // Tabs: 'crm' or 'envios'
  const [activeTab, setActiveTab] = useState<'crm' | 'envios'>('crm');
  
  // Stats & Monitor tab states
  const [queue, setQueue] = useState<FilaEnvio[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  
  // CRM Reports tab states
  const [reportsData, setReportsData] = useState<any>({
    statusData: [],
    sourceData: [],
    creationTimeline: [],
    conversionTimeline: [],
    utmSourceData: [],
    stateData: [],
    cityData: [],
    estimatedRevenue: 0
  });
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [period, setPeriod] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingMercos, setIsUploadingMercos] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    loadReports();
  }, [period, customStartDate, customEndDate]);

  const refreshData = async () => {
    try {
      const q = await api.getQueue();
      const c = await api.getCampaigns();
      setQueue(q || []);
      setCampaigns(c || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadReports = async () => {
    setIsLoadingReports(true);
    try {
      const data = await api.getCRMReports(period, customStartDate, customEndDate);
      if (data) {
        setReportsData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingReports(false);
    }
  };

  const handleProcessQueue = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setLog(['Iniciando processamento...']);
    
    try {
      const response = await fetch('/api/queue/process', { method: 'POST' });
      const result = await response.json();
      setLog(prev => [result.message, ...prev.slice(0, 9)]);
      refreshData();
    } catch (e: any) {
      setLog(prev => [`Erro: ${e.message}`, ...prev.slice(0, 9)]);
    }
    
    setIsProcessing(false);
  };

  const handleMercosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMercos(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/mercos/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await res.json();
      if (res.ok) {
        alert(`Sucesso! ${result.message}`);
        loadReports(); // recarregar estatísticas
      } else {
        alert(`Erro: ${result.error}`);
      }
    } catch (e: any) {
      alert(`Erro no upload: ${e.message}`);
    } finally {
      setIsUploadingMercos(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Process monitor stats
  const stats = {
    total: queue.length,
    enviados: queue.filter(q => q.status === 'enviado').length,
    pendentes: queue.filter(q => q.status === 'pendente').length,
    erros: queue.filter(q => q.status === 'erro').length
  };

  // Helper lists & funnel logic
  const funnelSteps = [
    { key: 'novo', label: 'Novos Leads', color: 'var(--primary)', desc: 'Primeiro contato ou cadastro recente' },
    { key: 'contatado', label: 'Em Contato', color: '#3b82f6', desc: 'Atendimento iniciado ou qualificado' },
    { key: 'convertido', label: 'Convertidos', color: 'var(--success)', desc: 'Clientes que realizaram compras/conversões' },
    { key: 'perdido', label: 'Perdidos', color: 'var(--danger)', desc: 'Leads descartados ou sem interesse' }
  ];

  const getStatusCount = (key: string) => {
    const found = reportsData.statusData?.find((s: any) => s.status === key);
    return found ? found.count : 0;
  };

  const totalLeads = reportsData.statusData?.reduce((acc: number, item: any) => acc + item.count, 0) || 0;
  const totalConverted = getStatusCount('convertido');
  const conversionRate = totalLeads > 0 ? ((totalConverted / totalLeads) * 100).toFixed(1) : '0';

  // SVG Chart Calculation Helpers
  const getMaxTimelineCount = () => {
    const maxCreation = reportsData.creationTimeline?.length > 0
      ? Math.max(...reportsData.creationTimeline.map((d: any) => d.count))
      : 0;
    const maxConversion = reportsData.conversionTimeline?.length > 0
      ? Math.max(...reportsData.conversionTimeline.map((d: any) => d.count))
      : 0;
    return Math.max(maxCreation, maxConversion, 1);
  };

  const maxVal = getMaxTimelineCount();

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header and Tab Selector */}
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.025em' }}>Módulo de Relatórios & Monitoramento</h2>
          <p style={{ opacity: 0.6, fontSize: '1rem', marginTop: '0.25rem' }}>Estatísticas completas e controle de envios em tempo real.</p>
        </div>
        
        {/* Tab Buttons and Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {activeTab === 'crm' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'white', padding: '0.25rem 0.75rem', borderRadius: '50px', border: '1px solid var(--border)' }}>
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
            </div>
          )}

          {activeTab === 'crm' && (
            <div>
              <input 
                type="file" 
                accept=".xls,.xlsx,.csv" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleMercosUpload}
              />
              <button 
                className="btn" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingMercos}
                style={{
                  background: '#fbbf24',
                  color: '#1e293b',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '50px',
                  border: 'none',
                  cursor: isUploadingMercos ? 'not-allowed' : 'pointer',
                  opacity: isUploadingMercos ? 0.7 : 1
                }}
              >
                {isUploadingMercos ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />}
                {isUploadingMercos ? 'Importando...' : 'Importar Vendas (Mercos)'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.35rem', borderRadius: '50px', border: '1px solid var(--border)' }}>
            <button 
              onClick={() => setActiveTab('crm')}
              style={{ 
                padding: '0.5rem 1.5rem', 
                borderRadius: '50px', 
                fontSize: '0.9rem', 
                fontWeight: 600, 
                transition: 'all 0.2s',
                background: activeTab === 'crm' ? 'white' : 'transparent',
                color: activeTab === 'crm' ? 'var(--primary)' : '#64748b',
                boxShadow: activeTab === 'crm' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <BarChart3 size={16} style={{ marginRight: '0.5rem', display: 'inline', verticalAlign: 'text-bottom' }} />
              Relatórios CRM
            </button>
            <button 
              onClick={() => setActiveTab('envios')}
              style={{ 
                padding: '0.5rem 1.5rem', 
                borderRadius: '50px', 
                fontSize: '0.9rem', 
                fontWeight: 600, 
                transition: 'all 0.2s',
                background: activeTab === 'envios' ? 'white' : 'transparent',
                color: activeTab === 'envios' ? 'var(--primary)' : '#64748b',
                boxShadow: activeTab === 'envios' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <Clock size={16} style={{ marginRight: '0.5rem', display: 'inline', verticalAlign: 'text-bottom' }} />
              Fila de Envios
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'crm' ? (
        /* ==================== TAB 1: CRM REPORTS ==================== */
        isLoadingReports ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '1rem' }}>
            <RefreshCw className="animate-spin" size={40} style={{ color: 'var(--primary)' }} />
            <p style={{ color: '#64748b', fontWeight: 500 }}>Carregando dados dos relatórios...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '5px solid var(--primary)' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '1rem', borderRadius: '12px' }}>
                  <Users size={24} />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>Total de Leads</p>
                  <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginTop: '0.25rem' }}>{totalLeads}</h3>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '5px solid var(--success)' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '1rem', borderRadius: '12px' }}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>Taxa de Conversão</p>
                  <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginTop: '0.25rem' }}>{conversionRate}%</h3>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '5px solid var(--warning)' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '1rem', borderRadius: '12px' }}>
                  <DollarSign size={24} />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>Faturamento Estimado</p>
                  <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginTop: '0.25rem' }}>
                    R$ {reportsData.estimatedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
              </div>
            </div>

            {/* Funnel & Source Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }} className="grid-cols-2">
              
              {/* Visual Funnel Card */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ListOrdered size={20} style={{ color: 'var(--primary)' }} /> Funil de Vendas do CRM
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, justifyContent: 'center' }}>
                  {funnelSteps.map((step, idx) => {
                    const count = getStatusCount(step.key);
                    const percentOfTotal = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                    
                    // Funnel visual width decreases slightly downwards to represent conversion filtering
                    const visualWidth = 100 - (idx * 12);

                    return (
                      <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ width: '130px', flexShrink: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{step.label}</p>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>{step.desc}</p>
                        </div>
                        <div style={{ flex: 1, height: '36px', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              background: `linear-gradient(90deg, ${step.color} 0%, rgba(99, 102, 241, 0.4) 100%)`, 
                              width: `${Math.max(percentOfTotal, percentOfTotal > 0 ? 5 : 0)}%`,
                              borderRadius: '8px',
                              transition: 'width 0.8s ease-out',
                              maxWidth: `${visualWidth}%`
                            }} 
                          />
                          <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>
                            {count} ({percentOfTotal.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lead Sources Card */}
              <div className="card">
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Compass size={20} style={{ color: '#06b6d4' }} /> Origem dos Leads
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '320px', overflowY: 'auto' }}>
                  {reportsData.sourceData?.length === 0 ? (
                    <p style={{ opacity: 0.5, textAlign: 'center', padding: '2rem 0' }}>Sem dados de origem cadastrados.</p>
                  ) : (
                    reportsData.sourceData.map((item: any, idx: number) => {
                      const percent = totalLeads > 0 ? (item.count / totalLeads) * 100 : 0;
                      return (
                        <div key={idx}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.875rem', fontWeight: 600 }}>
                            <span style={{ color: '#475569' }}>{item.origem || 'Desconhecido'}</span>
                            <span style={{ color: '#1e293b' }}>{item.count} ({percent.toFixed(0)}%)</span>
                          </div>
                          <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                height: '100%', 
                                background: 'linear-gradient(90deg, #06b6d4 0%, #3b82f6 100%)', 
                                width: `${percent}%` 
                              }} 
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Timelines / Activity over time (Using beautiful SVG Chart) */}
            <div className="card">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} style={{ color: 'var(--primary)' }} /> Linha do Tempo: Captação vs Conversão (Últimos dias)
              </h3>
              
              <div style={{ width: '100%', height: '240px', position: 'relative', marginTop: '1rem' }}>
                {reportsData.creationTimeline?.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                    Sem dados históricos suficientes para gerar o gráfico.
                  </div>
                ) : (
                  <svg viewBox="0 0 1000 240" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    {/* Gridlines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                      <line 
                        key={i} 
                        x1="40" 
                        y1={40 + ratio * 160} 
                        x2="980" 
                        y2={40 + ratio * 160} 
                        stroke="#e2e8f0" 
                        strokeWidth="1" 
                        strokeDasharray="4 4" 
                      />
                    ))}

                    {/* Chart Paths */}
                    {(() => {
                      const createPoints = (timeline: any[]) => {
                        const len = Math.max(timeline.length, 1);
                        return timeline.map((d: any, idx: number) => {
                          const x = 50 + (idx / (len - 1 || 1)) * 900;
                          const y = 200 - (d.count / maxVal) * 150;
                          return `${x},${y}`;
                        }).join(' ');
                      };

                      const pointsCreation = createPoints(reportsData.creationTimeline || []);
                      const pointsConversion = createPoints(reportsData.conversionTimeline || []);

                      return (
                        <>
                          {/* Creation Line */}
                          {pointsCreation && (
                            <>
                              <polyline 
                                fill="none" 
                                stroke="var(--primary)" 
                                strokeWidth="3" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                points={pointsCreation} 
                              />
                              {reportsData.creationTimeline.map((d: any, idx: number) => {
                                const len = reportsData.creationTimeline.length;
                                const x = 50 + (idx / (len - 1 || 1)) * 900;
                                const y = 200 - (d.count / maxVal) * 150;
                                return (
                                  <circle 
                                    key={`c-${idx}`} 
                                    cx={x} 
                                    cy={y} 
                                    r="4" 
                                    fill="white" 
                                    stroke="var(--primary)" 
                                    strokeWidth="2" 
                                  />
                                );
                              })}
                            </>
                          )}

                          {/* Conversion Line */}
                          {pointsConversion && (
                            <>
                              <polyline 
                                fill="none" 
                                stroke="var(--success)" 
                                strokeWidth="3" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                points={pointsConversion} 
                              />
                              {reportsData.conversionTimeline.map((d: any, idx: number) => {
                                const len = reportsData.conversionTimeline.length;
                                const x = 50 + (idx / (len - 1 || 1)) * 900;
                                const y = 200 - (d.count / maxVal) * 150;
                                return (
                                  <circle 
                                    key={`conv-${idx}`} 
                                    cx={x} 
                                    cy={y} 
                                    r="4" 
                                    fill="white" 
                                    stroke="var(--success)" 
                                    strokeWidth="2" 
                                  />
                                );
                              })}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </svg>
                )}
              </div>
              
              {/* Legend */}
              <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                  <span style={{ color: '#475569' }}>Novos Leads</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)' }}></div>
                  <span style={{ color: '#475569' }}>Conversões</span>
                </div>
              </div>
            </div>

            {/* Locations & UTM Analytics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="grid-cols-2">
              
              {/* UTM Channels Card */}
              <div className="card">
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Compass size={20} style={{ color: '#ec4899' }} /> Campanhas UTM de Tráfego
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {reportsData.utmSourceData?.length === 0 ? (
                    <p style={{ opacity: 0.5, textAlign: 'center', padding: '2rem 0' }}>Sem parâmetros UTM capturados ainda.</p>
                  ) : (
                    reportsData.utmSourceData.map((item: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem' }}>
                        <span style={{ fontWeight: 700, color: '#475569' }}>{item.utm_source}</span>
                        <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{item.count} leads</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Geographic Distribution Card */}
              <div className="card">
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={20} style={{ color: 'var(--danger)' }} /> Distribuição Geográfica (Estados)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {reportsData.stateData?.length === 0 ? (
                    <p style={{ opacity: 0.5, textAlign: 'center', padding: '2rem 0' }}>Nenhum lead com localização definida.</p>
                  ) : (
                    reportsData.stateData.map((item: any, idx: number) => {
                      const pct = totalLeads > 0 ? (item.count / totalLeads) * 100 : 0;
                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem' }}>
                          <span style={{ fontWeight: 700, color: '#475569' }}>{item.estado}</span>
                          <span style={{ fontWeight: 800, color: 'var(--foreground)' }}>{item.count} ({pct.toFixed(0)}%)</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

          </div>
        )
      ) : (
        /* ==================== TAB 2: DISPATCH QUEUE MONITOR ==================== */
        <div>
          {log.length > 0 && (
            <div className="card" style={{ marginBottom: '2rem', background: '#0f172a', color: '#10b981', fontFamily: 'monospace', fontSize: '0.875rem', padding: '1.5rem', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#64748b' }}>
                <span>Terminal de Envio</span>
                {isProcessing && <span className="animate-pulse" style={{ color: 'var(--success)' }}>● Ativo</span>}
              </div>
              {log.map((msg, i) => (
                <div key={i} style={{ opacity: 1 - (i * 0.1) }}>{`> ${msg}`}</div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }} className="grid-cols-4">
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.875rem', opacity: 0.6, fontWeight: 600 }}>Total na Fila</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem' }}>{stats.total}</h3>
            </div>
            <div className="card" style={{ textAlign: 'center', borderColor: 'var(--primary)' }}>
              <p style={{ fontSize: '0.875rem', opacity: 0.6, color: 'var(--primary)', fontWeight: 600 }}>Pendentes</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>{stats.pendentes}</h3>
            </div>
            <div className="card" style={{ textAlign: 'center', borderColor: 'var(--success)' }}>
              <p style={{ fontSize: '0.875rem', opacity: 0.6, color: 'var(--success)', fontWeight: 600 }}>Enviados</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.25rem' }}>{stats.enviados}</h3>
            </div>
            <div className="card" style={{ textAlign: 'center', borderColor: 'var(--danger)' }}>
              <p style={{ fontSize: '0.875rem', opacity: 0.6, color: 'var(--danger)', fontWeight: 600 }}>Erros</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.25rem' }}>{stats.erros}</h3>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h4 style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.1rem' }}>Fila de Processamento Recente</h4>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline" onClick={refreshData}>
                  <RefreshCw size={16} /> Atualizar Lista
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleProcessQueue}
                  disabled={isProcessing}
                >
                  {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                  {isProcessing ? 'Processando...' : 'Enviar Lote Agora'}
                </button>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Campanha</th>
                    <th>Status</th>
                    <th>Tentativa</th>
                    <th>Data Agendada</th>
                    <th>Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>Fila de envio vazia.</td>
                    </tr>
                  )}
                  {queue.slice().reverse().map(item => {
                    const campaign = campaigns.find(c => c.id === item.campanhaId);
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>{item.email || item.telefone}</td>
                        <td>{campaign?.nome || 'Campanha Excluída'}</td>
                        <td>
                          <span style={{ 
                            padding: '0.25rem 0.625rem', 
                            borderRadius: '50px', 
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: item.status === 'enviado' ? 'rgba(16, 185, 129, 0.1)' : item.status === 'erro' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: item.status === 'enviado' ? 'var(--success)' : item.status === 'erro' ? 'var(--danger)' : 'var(--warning)'
                          }}>
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        <td>{item.tentativa}</td>
                        <td style={{ fontSize: '0.75rem' }}>{new Date(item.dataAgendada).toLocaleString('pt-BR')}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 500 }}>{item.erroMensagem || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
