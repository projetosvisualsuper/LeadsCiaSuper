'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Segmentation, Lead, Campaign } from '@/types/crm';
import { 
  Users, 
  Trash2, 
  Plus, 
  Mail, 
  Calendar, 
  Info,
  X,
  Check,
  ChevronRight,
  Filter,
  Search
} from 'lucide-react';

export default function SegmentacoesPage() {
  const [segments, setSegments] = useState<Segmentation[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<Segmentation | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'current' | 'add'>('current');
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    leadIds: [] as string[]
  });

  // Custom Dialog States
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success' as 'success' | 'info' | 'error'
  });

  const loadData = async () => {
    setLoading(true);
    const [segsData, leadsData, campaignsData] = await Promise.all([
      api.getSegmentations(),
      api.getLeads(),
      api.getCampaigns()
    ]);
    setSegments(segsData);
    setLeads(leadsData);
    setCampaigns(campaignsData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if (!formData.nome) {
      setAlertDialog({
        isOpen: true,
        title: 'Campo Obrigatório',
        message: 'Por favor, dê um nome para a segmentação.',
        type: 'info'
      });
      return;
    }

    const segment: Segmentation = {
      id: selectedSegment?.id || Math.random().toString(36).substr(2, 9),
      nome: formData.nome,
      descricao: formData.descricao,
      leadIds: formData.leadIds,
      dataCriacao: selectedSegment?.dataCriacao || new Date().toISOString()
    };

    await api.saveSegmentation(segment);
    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Excluir Segmentação',
      message: 'Tem certeza que deseja excluir esta segmentação? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        await api.deleteSegmentation(id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        loadData();
      }
    });
  };

  const openCampaignModal = (segment: Segmentation) => {
    setSelectedSegment(segment);
    setIsCampaignModalOpen(true);
  };

  const handleAddToCampaign = async () => {
    if (!selectedCampaignId || !selectedSegment) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar Envio',
      message: `Deseja adicionar os ${selectedSegment.leadIds.length} leads desta segmentação à campanha selecionada?`,
      onConfirm: async () => {
        await api.generateQueueForCampaign(selectedCampaignId, selectedSegment.leadIds);
        
        const campaign = campaigns.find(c => c.id === selectedCampaignId);
        if (campaign) {
          await api.saveCampaign({
            ...campaign,
            status: 'em execução',
            totalLeads: (campaign.totalLeads || 0) + selectedSegment.leadIds.length,
            totalPendentes: (campaign.totalPendentes || 0) + selectedSegment.leadIds.length
          });
        }

        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setIsCampaignModalOpen(false);
        setSelectedCampaignId('');
        loadData();

        setAlertDialog({
          isOpen: true,
          title: 'Sucesso!',
          message: 'Leads adicionados com sucesso à fila de envio!',
          type: 'success'
        });
      }
    });
  };

  const uniqueTags = Array.from(new Set(leads.flatMap(l => l.tags || []))).filter(Boolean).sort();

  // Leads in the current segment
  const segmentLeads = leads.filter(lead => formData.leadIds.includes(lead.id));

  // Determine which list of leads to filter (current leads in segment or all leads to add)
  const baseLeads = activeTab === 'current' ? segmentLeads : leads;

  const modalFilteredLeads = baseLeads.filter(lead => {
    // Filter by search query (name, email, or tags)
    if (searchFilter) {
      const searchLower = searchFilter.toLowerCase();
      const matchName = lead.nome?.toLowerCase().includes(searchLower);
      const matchEmail = lead.email?.toLowerCase().includes(searchLower);
      const matchTag = lead.tags?.some(tag => tag.toLowerCase().includes(searchLower));
      if (!matchName && !matchEmail && !matchTag) return false;
    }
    
    // Filter by tag dropdown
    if (tagFilter && !lead.tags?.includes(tagFilter)) return false;
    
    // Filter by email checkbox
    if (emailFilter && !lead.email) return false;
    
    return true;
  });

  const selectAllFiltered = () => {
    const filteredIds = modalFilteredLeads.map(l => l.id);
    const currentIds = formData.leadIds;
    
    // Se todos os filtrados já estão selecionados, remove todos eles
    const allFilteredSelected = filteredIds.every(id => currentIds.includes(id));
    
    if (allFilteredSelected) {
      setFormData({ ...formData, leadIds: currentIds.filter(id => !filteredIds.includes(id)) });
    } else {
      // Adiciona apenas os que faltam
      const newIds = Array.from(new Set([...currentIds, ...filteredIds]));
      setFormData({ ...formData, leadIds: newIds });
    }
  };

  if (loading) {
    return (
      <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Segmentações</h2>
          <p style={{ opacity: 0.6 }}>Agrupe seus leads de forma estratégica para campanhas direcionadas.</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setSelectedSegment(null);
          setFormData({ nome: '', descricao: '', leadIds: [] });
          setSearchFilter('');
          setTagFilter('');
          setEmailFilter(false);
          setActiveTab('add');
          setIsModalOpen(true);
        }}>
          <Plus size={18} /> Criar Segmentação
        </button>
      </header>

      <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
        {segments.length === 0 ? (
          <div className="card" style={{ gridColumn: 'span 2', textAlign: 'center', padding: '4rem', opacity: 0.6 }}>
            <Filter size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p>Nenhuma segmentação criada ainda.</p>
            <p style={{ fontSize: '0.875rem' }}>Use segmentações para organizar leads por interesses, localização ou status.</p>
          </div>
        ) : (
          segments.map(segment => (
            <div key={segment.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{segment.nome}</h3>
                  <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>{segment.descricao || 'Sem descrição'}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '0.5rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                    onClick={() => handleDelete(segment.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', padding: '1rem', background: 'var(--background)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', opacity: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>Total de Leads</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{segment.leadIds.length}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', opacity: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>Criado em</p>
                  <p style={{ fontWeight: 500 }}>{new Date(segment.dataCriacao).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => openCampaignModal(segment)}>
                  <Mail size={18} /> Enviar Campanha
                </button>
                 <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => {
                    setSelectedSegment(segment);
                    setFormData({
                      nome: segment.nome,
                      descricao: segment.descricao || '',
                      leadIds: segment.leadIds
                    });
                    setSearchFilter('');
                    setTagFilter('');
                    setEmailFilter(false);
                    setActiveTab('current');
                    setIsModalOpen(true);
                 }}>
                   Editar
                 </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Criar/Editar Segmentação */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ 
            width: '950px', 
            maxWidth: '95vw', 
            maxHeight: '90vh', 
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem',
            overflow: 'hidden'
          }}>
            <button style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', opacity: 0.5 }} onClick={() => setIsModalOpen(false)}>
              <X size={24} />
            </button>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>{selectedSegment ? 'Editar Segmentação' : 'Nova Segmentação'}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Nome da Segmentação</label>
                <input 
                  type="text" 
                  className="btn-outline" 
                  style={{ width: '100%', height: '42px', padding: '0 1rem', background: 'var(--background)', borderRadius: 'var(--radius)' }} 
                  placeholder="Ex: Leads Quentes - Março"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Descrição (Opcional)</label>
                <textarea 
                  className="btn-outline" 
                  style={{ width: '100%', minHeight: '80px', padding: '0.75rem', background: 'var(--background)', borderRadius: 'var(--radius)' }} 
                  placeholder="Para que serve este grupo de leads?"
                  value={formData.descricao}
                  onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                  Selecionar Leads ({formData.leadIds.length} selecionados)
                </label>

                {/* Tabs */}
                {selectedSegment && (
                  <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
                    <button 
                      className={`btn ${activeTab === 'current' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ 
                        height: '36px', 
                        padding: '0 1rem', 
                        fontSize: '0.875rem', 
                        fontWeight: 600,
                        background: activeTab === 'current' ? 'var(--primary)' : 'transparent',
                        borderColor: activeTab === 'current' ? 'var(--primary)' : 'var(--border)'
                      }}
                      onClick={() => setActiveTab('current')}
                    >
                      Leads na Segmentação ({segmentLeads.length})
                    </button>
                    <button 
                      className={`btn ${activeTab === 'add' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ 
                        height: '36px', 
                        padding: '0 1rem', 
                        fontSize: '0.875rem', 
                        fontWeight: 600,
                        background: activeTab === 'add' ? 'var(--primary)' : 'transparent',
                        borderColor: activeTab === 'add' ? 'var(--primary)' : 'var(--border)'
                      }}
                      onClick={() => setActiveTab('add')}
                    >
                      Adicionar Novos Leads
                    </button>
                  </div>
                )}

                {/* Filters Row */}
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '0.75rem', 
                  alignItems: 'center', 
                  marginBottom: '1rem',
                  background: 'var(--accent)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ flex: '1 1 250px', position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                    <input 
                      type="text"
                      className="btn-outline"
                      style={{ 
                        width: '100%', 
                        height: '36px', 
                        padding: '0 0.75rem 0 2.25rem', 
                        fontSize: '0.875rem', 
                        background: 'var(--card)', 
                        borderRadius: '6px' 
                      }}
                      placeholder="Filtrar por nome, e-mail ou tag..."
                      value={searchFilter}
                      onChange={e => setSearchFilter(e.target.value)}
                    />
                  </div>

                  <div style={{ flex: '0 1 180px', minWidth: '150px' }}>
                    <select 
                      className="btn-outline" 
                      style={{ 
                        width: '100%', 
                        height: '36px', 
                        fontSize: '0.875rem', 
                        padding: '0 0.5rem', 
                        background: 'var(--card)', 
                        borderRadius: '6px' 
                      }}
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                    >
                      <option value="">Filtrar por Tag...</option>
                      {uniqueTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.35rem', 
                      fontSize: '0.875rem', 
                      cursor: 'pointer', 
                      whiteSpace: 'nowrap',
                      userSelect: 'none'
                    }}>
                      <input 
                        type="checkbox" 
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        checked={emailFilter} 
                        onChange={e => setEmailFilter(e.target.checked)} 
                      />
                      Somente com E-mail
                    </label>
                  </div>

                  <div style={{ marginLeft: 'auto' }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ 
                        height: '36px', 
                        fontSize: '0.875rem', 
                        padding: '0 1rem', 
                        background: 'var(--card)', 
                        borderColor: 'var(--border)' 
                      }}
                      onClick={selectAllFiltered}
                    >
                      {modalFilteredLeads.length > 0 && modalFilteredLeads.every(l => formData.leadIds.includes(l.id)) 
                        ? 'Desmarcar Filtrados' 
                        : 'Selecionar Filtrados'}
                    </button>
                  </div>
                </div>
                
                <div style={{ 
                  maxHeight: '350px', 
                  overflowY: 'auto', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius)',
                  background: 'var(--background)'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--accent)', zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', width: '40px' }}>
                          <input 
                            type="checkbox" 
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            checked={modalFilteredLeads.length > 0 && modalFilteredLeads.every(l => formData.leadIds.includes(l.id))}
                            onChange={selectAllFiltered}
                          />
                        </th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--secondary)' }}>NOME / E-MAIL / TAGS</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--secondary)', width: '200px' }}>ORIGEM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalFilteredLeads.map(lead => (
                        <tr key={lead.id} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <input 
                              type="checkbox" 
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              checked={formData.leadIds.includes(lead.id)}
                              onChange={() => {
                                if (formData.leadIds.includes(lead.id)) {
                                  setFormData({ ...formData, leadIds: formData.leadIds.filter(id => id !== lead.id) });
                                } else {
                                  setFormData({ ...formData, leadIds: [...formData.leadIds, lead.id] });
                                }
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--foreground)' }}>{lead.nome}</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.1rem' }}>{lead.email}</div>
                            {lead.tags && lead.tags.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.35rem' }}>
                                {lead.tags.map(t => (
                                  <span key={t} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', background: 'var(--accent)', color: 'var(--foreground)', borderRadius: '4px', border: '1px solid var(--border)', fontWeight: 500 }}>{t}</span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', opacity: 0.8 }}>{lead.origem}</td>
                        </tr>
                      ))}
                      {modalFilteredLeads.length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ padding: '3rem', textAlign: 'center', opacity: 0.5, fontSize: '0.875rem' }}>
                            {activeTab === 'current' 
                              ? 'Nenhum lead nesta segmentação corresponde aos filtros.' 
                              : 'Nenhum lead encontrado para adicionar.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>
                <Check size={18} /> Salvar Segmentação
              </button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar à Campanha */}
      {isCampaignModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1rem' }}>
          <div className="card" style={{ width: '450px', position: 'relative' }}>
            <button style={{ position: 'absolute', right: '1rem', top: '1rem', opacity: 0.5 }} onClick={() => setIsCampaignModalOpen(false)}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem' }}>Adicionar Segmento à Campanha</h3>
            <p style={{ fontSize: '0.875rem', opacity: 0.6, marginBottom: '1.5rem' }}>
              Escolha uma campanha existente para adicionar os <strong>{selectedSegment?.leadIds.length} leads</strong> de <strong>"{selectedSegment?.nome}"</strong> à fila de envio.
            </p>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Selecione a Campanha</label>
                <select 
                  className="btn-outline" 
                  style={{ width: '100%', height: '42px', padding: '0 1rem' }}
                  value={selectedCampaignId}
                  onChange={e => setSelectedCampaignId(e.target.value)}
                >
                  <option value="">Selecione uma campanha...</option>
                  {campaigns.map(campaign => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.nome} ({campaign.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1 }} 
                  disabled={!selectedCampaignId}
                  onClick={handleAddToCampaign}
                >
                  Confirmar e Adicionar
                </button>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsCampaignModalOpen(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO (CUSTOM DIALOG) */}
      {confirmDialog.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Info size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>{confirmDialog.title}</h3>
            <p style={{ opacity: 0.6, marginBottom: '2rem', lineHeight: '1.5' }}>{confirmDialog.message}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmDialog.onConfirm}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ALERTA (CUSTOM ALERT) */}
      {alertDialog.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '350px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ 
              background: alertDialog.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)', 
              color: alertDialog.type === 'success' ? 'var(--success)' : 'var(--primary)', 
              width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' 
            }}>
              {alertDialog.type === 'success' ? <Check size={32} /> : <Info size={32} />}
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>{alertDialog.title}</h3>
            <p style={{ opacity: 0.6, marginBottom: '2rem' }}>{alertDialog.message}</p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}>Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}
