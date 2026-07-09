'use client';

import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { 
  X, Plus, Trash2, Zap, Tag, DollarSign, ArrowRight, UserPlus, 
  HelpCircle, Clock, Check, MessageSquare, Play, HelpCircle as HelpIcon 
} from 'lucide-react';

interface PipelineAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PipelineAutomationModal({ isOpen, onClose }: PipelineAutomationModalProps) {
  const [automations, setAutomations] = useState<any[]>([]);
  const [bots, setBots] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all_channels'); // channel/connection filter
  const [editingAuto, setEditingAuto] = useState<any | null>(null);

  // Form states
  const [nome, setNome] = useState('');
  const [tipoGatilho, setTipoGatilho] = useState('quando_criado');
  const [salesbotId, setSalesbotId] = useState('');
  const [deixarSemResposta, setDeixarSemResposta] = useState(false);
  const [aplicarExistentes, setAplicarExistentes] = useState(false);
  
  // Condições states
  const [tagsFilter, setTagsFilter] = useState('');
  const [noTagsFilter, setNoTagsFilter] = useState('');
  const [vendaMin, setVendaMin] = useState<string>('');
  const [vendaMax, setVendaMax] = useState<string>('');
  const [origemFilter, setOrigemFilter] = useState<string[]>([]);
  
  // Destinatário e Instância states
  const [destinatarioTipo, setDestinatarioTipo] = useState('principal_canal_prim');
  const [whatsappConnectionId, setWhatsappConnectionId] = useState('any');

  // Ações simples states
  const [alterarEtapaPara, setAlterarEtapaPara] = useState('');
  const [adicionarTags, setAdicionarTags] = useState('');
  const [atribuirUsuarioId, setAtribuirUsuarioId] = useState('');

  const [pipelineStages, setPipelineStages] = useState<any[]>([
    { id: 'all_channels', name: 'Todos os Canais' }
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [autosData, botsData, usersData, connsData] = await Promise.all([
        api.getPipelineAutomations(),
        api.getBots(),
        api.getAllUserProfiles(),
        api.getWhatsappConnections()
      ]);
      setAutomations(autosData || []);
      setBots(botsData || []);
      setUsers(usersData || []);
      setConnections(connsData || []);
      
      const channels = [
        { id: 'all_channels', name: 'Todos os Canais' },
        ...(connsData || []).map((conn: any) => ({
          id: `whatsapp_${conn.id}`,
          name: conn.name || conn.evolutionInstanceName || 'WhatsApp'
        })),
        { id: 'instagram', name: 'Instagram' },
        { id: 'facebook', name: 'Facebook Messenger' },
        { id: 'youtube', name: 'YouTube' },
        { id: 'tiktok', name: 'TikTok' }
      ];
      setPipelineStages(channels);
    } catch (e) {
      console.error('Erro ao carregar dados de automação:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEdit = (auto: any) => {
    setEditingAuto(auto);
    setNome(auto.nome);
    setTipoGatilho(auto.tipoGatilho);
    setSalesbotId(auto.salesbotId || '');
    setDeixarSemResposta(auto.deixarSemResposta === 1);
    setAplicarExistentes(auto.aplicarExistentes === 1);
    setDestinatarioTipo(auto.destinatarioTipo || 'principal_canal_prim');
    setWhatsappConnectionId(auto.whatsappConnectionId || 'any');
    setAlterarEtapaPara(auto.alterarEtapaPara || '');
    setAdicionarTags(auto.adicionarTags || '');
    setAtribuirUsuarioId(auto.atribuirUsuarioId || '');

    try {
      const conds = JSON.parse(auto.condicoesJson || '{}');
      setTagsFilter(conds.tags ? conds.tags.join(', ') : '');
      setNoTagsFilter(conds.noTags ? conds.noTags.join(', ') : '');
      setVendaMin(conds.vendaMin !== undefined ? conds.vendaMin.toString() : '');
      setVendaMax(conds.vendaMax !== undefined ? conds.vendaMax.toString() : '');
      setOrigemFilter(conds.origem || []);
    } catch (e) {
      setTagsFilter('');
      setNoTagsFilter('');
      setVendaMin('');
      setVendaMax('');
      setOrigemFilter([]);
    }
  };

  const handleNew = () => {
    console.log("handleNew called, activeTab:", activeTab);
    setEditingAuto({ id: 'new', statusOrigem: activeTab });
    setNome('Nova Automação');
    setTipoGatilho('quando_criado');
    setSalesbotId('');
    setDeixarSemResposta(false);
    setAplicarExistentes(false);
    setDestinatarioTipo('principal_canal_prim');
    setWhatsappConnectionId('any');
    setAlterarEtapaPara('');
    setAdicionarTags('');
    setAtribuirUsuarioId('');
    setTagsFilter('');
    setNoTagsFilter('');
    setVendaMin('');
    setVendaMax('');
    setOrigemFilter([]);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      alert('Por favor, informe o nome da automação.');
      return;
    }

    const condicoes: any = {};
    if (tagsFilter.trim()) {
      condicoes.tags = tagsFilter.split(',').map(t => t.trim()).filter(Boolean);
    }
    if (noTagsFilter.trim()) {
      condicoes.noTags = noTagsFilter.split(',').map(t => t.trim()).filter(Boolean);
    }
    if (vendaMin.trim()) condicoes.vendaMin = parseFloat(vendaMin);
    if (vendaMax.trim()) condicoes.vendaMax = parseFloat(vendaMax);
    if (origemFilter.length > 0) condicoes.origem = origemFilter;

    const payload = {
      id: editingAuto.id === 'new' ? `auto_${Date.now()}` : editingAuto.id,
      statusOrigem: editingAuto.statusOrigem || activeTab,
      nome,
      tipoGatilho,
      condicoesJson: JSON.stringify(condicoes),
      gatilhoConfigJson: JSON.stringify({}),
      restricaoHorarioJson: JSON.stringify({ mode: 'sempre' }),
      destinatarioTipo,
      whatsappConnectionId,
      salesbotId: salesbotId || undefined,
      deixarSemResposta: deixarSemResposta ? 1 : 0,
      aplicarExistentes: aplicarExistentes ? 1 : 0,
      alterarEtapaPara: alterarEtapaPara || undefined,
      adicionarTags: adicionarTags || undefined,
      atribuirUsuarioId: atribuirUsuarioId || undefined,
      ativo: 1
    };

    try {
      await api.savePipelineAutomation(payload);
      setEditingAuto(null);
      loadData();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar automação.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta automação?')) return;
    try {
      await api.deletePipelineAutomation(id);
      setEditingAuto(null);
      loadData();
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir automação.');
    }
  };

  const handleOrigemToggle = (src: string) => {
    setOrigemFilter(prev => 
      prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]
    );
  };



  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#ffffff', width: '850px', height: '620px', maxWidth: '95%', maxHeight: '95%', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={20} color="var(--primary)" />
              Configurar Automações de Leads
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '4px 0 0 0' }}>Configure gatilhos e robôs automatizados por canal de entrada.</p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
            <X size={22} />
          </button>
        </div>

        {/* Main Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* Sidebar stages list */}
          <div style={{ width: '220px', borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
            <div style={{ padding: '1rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Canais de Entrada
            </div>
            {pipelineStages.map(stage => {
              const stageAutos = automations.filter(a => a.statusOrigem === stage.id);
              return (
                <button
                  key={stage.id}
                  onClick={() => { setActiveTab(stage.id); setEditingAuto(null); }}
                  style={{
                    padding: '0.85rem 1rem',
                    textAlign: 'left',
                    border: 'none',
                    background: activeTab === stage.id ? '#eff6ff' : 'transparent',
                    color: activeTab === stage.id ? '#1e40af' : '#475569',
                    fontWeight: activeTab === stage.id ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderLeft: activeTab === stage.id ? '4px solid #3b82f6' : '4px solid transparent'
                  }}
                >
                  <span style={{ fontSize: '0.875rem' }}>{stage.name}</span>
                  <span style={{ background: activeTab === stage.id ? '#bfdbfe' : '#e2e8f0', color: activeTab === stage.id ? '#1e40af' : '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem' }}>
                    {stageAutos.length}
                  </span>
                </button>
              );
            })}

            <div style={{ marginTop: 'auto', padding: '1rem' }}>
              <button 
                type="button"
                onClick={handleNew}
                style={{ 
                  width: '100%', 
                  background: 'var(--primary)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.6rem', 
                  borderRadius: '8px', 
                  fontWeight: 600, 
                  cursor: 'pointer', 
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
              >
                <Plus size={16} /> Nova Regra
              </button>
            </div>
          </div>

          {/* Configuration Canvas */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ffffff', overflowY: 'auto', padding: '1.5rem' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <span>Carregando automações...</span>
              </div>
            ) : editingAuto ? (
              /* Config Editor Form */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {editingAuto.id === 'new' ? 'Nova Automação' : 'Editando Automação'}
                  </span>
                  {editingAuto.id !== 'new' && (
                    <button 
                      onClick={() => handleDelete(editingAuto.id)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      <Trash2 size={14} /> Excluir
                    </button>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Nome da Automação</label>
                  <input 
                    type="text" 
                    value={nome} 
                    onChange={e => setNome(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} 
                    placeholder="Ex: Disparar robô de boas vindas"
                  />
                </div>

                {/* Conditions (Kommo conditions style) */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', background: '#f8fafc' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🔍 Condições do Lead (Para todos os leads com)</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Canal de entrada (Origem) */}
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Canal de Entrada (Origem):</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {['whatsapp', 'instagram', 'facebook', 'bling', 'site'].map(src => {
                          const active = origemFilter.includes(src);
                          return (
                            <button
                              key={src}
                              onClick={() => handleOrigemToggle(src)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                border: '1px solid ' + (active ? '#3b82f6' : '#cbd5e1'),
                                background: active ? '#eff6ff' : '#ffffff',
                                color: active ? '#1d4ed8' : '#475569',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              {src.toUpperCase()}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tags */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Possui as Tags (separadas por vírgula)</label>
                        <input 
                          type="text" 
                          value={tagsFilter} 
                          onChange={e => setTagsFilter(e.target.value)}
                          placeholder="tag1, tag2"
                          style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Sem as Tags (excluir leads com)</label>
                        <input 
                          type="text" 
                          value={noTagsFilter} 
                          onChange={e => setNoTagsFilter(e.target.value)}
                          placeholder="tag3, tag4"
                          style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>

                    {/* Faturamento/Venda */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Valor da Venda Mínimo (R$)</label>
                        <input 
                          type="number" 
                          value={vendaMin} 
                          onChange={e => setVendaMin(e.target.value)}
                          placeholder="0.00"
                          style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Valor da Venda Máximo (R$)</label>
                        <input 
                          type="number" 
                          value={vendaMax} 
                          onChange={e => setVendaMax(e.target.value)}
                          placeholder="9999.00"
                          style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gatilho e Agendamento */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Executar quando:</label>
                    <select
                      value={tipoGatilho}
                      onChange={e => setTipoGatilho(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                    >
                      <option value="quando_criado">Imediatamente ao entrar neste canal / Novo contato</option>
                      <option value="mensagem_entrada">Quando receber uma mensagem de entrada</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Conexão de WhatsApp específica:</label>
                    <select
                      value={whatsappConnectionId}
                      onChange={e => setWhatsappConnectionId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                    >
                      <option value="any">Qualquer conexão ativa</option>
                      {connections.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Destinatário */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Enviar para:</label>
                  <select
                    value={destinatarioTipo}
                    onChange={e => setDestinatarioTipo(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  >
                    <option value="todos_canais_sel">Todos os contatos - canais selecionados</option>
                    <option value="todos_canal_prim">Todos os contatos - canal primário</option>
                    <option value="principal_canais_sel">Contato principal - canais selecionados</option>
                    <option value="principal_canal_prim">Contato principal - canal primário</option>
                  </select>
                </div>

                {/* Ações Avançadas / Salesbot */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', background: '#f8fafc' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '8px' }}>🤖 Ação: Executar Robô (Salesbot)</span>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <select
                      value={salesbotId}
                      onChange={e => setSalesbotId(e.target.value)}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                    >
                      <option value="">Nenhum robô selecionado</option>
                      {bots.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <a 
                      href="/bots" 
                      target="_blank"
                      style={{ background: '#3b82f6', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}
                    >
                      + Criar Novo Bot
                    </a>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#475569', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={deixarSemResposta} 
                        onChange={e => setDeixarSemResposta(e.target.checked)}
                      />
                      Deixar mensagem sem resposta (marcar chat como não respondido)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#475569', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={aplicarExistentes} 
                        onChange={e => setAplicarExistentes(e.target.checked)}
                      />
                      Aplicar o gatilho a todos os leads já nesta etapa
                    </label>
                  </div>
                </div>

                {/* Ações Simples Diretas */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '8px' }}>⚡ Ações Adicionais Diretas (Opcional)</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Alterar etapa do lead para:</label>
                        <select
                          value={alterarEtapaPara}
                          onChange={e => setAlterarEtapaPara(e.target.value)}
                          style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        >
                          <option value="">Não alterar etapa</option>
                          {pipelineStages.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Atribuir lead ao usuário:</label>
                        <select
                          value={atribuirUsuarioId}
                          onChange={e => setAtribuirUsuarioId(e.target.value)}
                          style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        >
                          <option value="">Manter responsável atual</option>
                          {users.map(u => (
                            <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Adicionar Tags ao Lead:</label>
                      <input 
                        type="text" 
                        value={adicionarTags} 
                        onChange={e => setAdicionarTags(e.target.value)}
                        placeholder="tag_nova, cliente_bot"
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Save controls */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                  <button 
                    onClick={() => setEditingAuto(null)}
                    style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSave}
                    style={{ padding: '0.5rem 1.25rem', border: 'none', borderRadius: '8px', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
                  >
                    Salvar Automação
                  </button>
                </div>
              </div>
            ) : (
              /* Automations List for Active Stage */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                    Automações para Canal: {pipelineStages.find(s => s.id === activeTab)?.name}
                  </h3>
                  <button 
                    type="button"
                    onClick={handleNew}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 700 }}
                  >
                    + Criar Automação
                  </button>
                </div>

                {automations.filter(a => a.statusOrigem === activeTab).length === 0 ? (
                  <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <Zap size={32} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                    <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Sem Automações neste Canal</span>
                    <span style={{ fontSize: '0.8rem' }}>Adicione regras para disparar mensagens, mudar etapas ou designar responsáveis automaticamente.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {automations.filter(a => a.statusOrigem === activeTab).map(auto => {
                      const botName = bots.find(b => b.id === auto.salesbotId)?.name || 'Nenhum robô';
                      const isCreatedTrigger = auto.tipoGatilho === 'quando_criado';
                      
                      return (
                        <div 
                          key={auto.id} 
                          onClick={() => handleEdit(auto)}
                          style={{
                            padding: '1rem',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                          onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                        >
                          <div>
                            <span style={{ fontWeight: 600, display: 'block', fontSize: '0.9rem', color: '#1e293b' }}>{auto.nome}</span>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '6px', flexWrap: 'wrap' }}>
                              <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '8px', fontWeight: 600 }}>
                                Gatilho: {isCreatedTrigger ? 'Lead criado / Novo contato' : 'Mensagem recebida'}
                              </span>
                              {auto.salesbotId && (
                                <span style={{ background: '#ecfdf5', color: '#047857', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '8px', fontWeight: 600 }}>
                                  Robô: {botName}
                                </span>
                              )}
                              {auto.alterarEtapaPara && (
                                <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '8px', fontWeight: 600 }}>
                                  Mudar etapa: {auto.alterarEtapaPara}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ArrowRight size={18} color="#94a3b8" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
