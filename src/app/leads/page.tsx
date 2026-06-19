'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/services/api';
import { Lead, LeadStatus, Segmentation, LandingPageInstance } from '@/types/crm';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Trash2, 
  Tag as TagIcon,
  UserPlus,
  X,
  Eye,
  Info,
  Download,
  Upload,
  Check,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  MessageCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx';

const WhatsAppIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill={color} width={size} height={size} style={{ display: 'inline-block', verticalAlign: 'middle', marginTop: '-2px' }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

const parseObservationsToCards = (observationsText: string) => {
  if (!observationsText) return [];
  
  // Encontrar todas as ocorrências de marcas como [RECONVERSÃO], [CONVERSÃO], [COTAÇÃO], etc.
  const regex = /(\[(?:RECONVERSÃO|CONVERSÃO|CONVERSÃO DIRETA|COTAÇÃO|COTAÇÃO RECEBIDA)\])/g;
  const parts = observationsText.split(regex);
  
  const cards = [];
  // O split vai resultar em: [texto_antes, marca, texto_depois, marca, texto_depois, ...]
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i];
    const content = parts[i + 1] ? parts[i + 1].trim() : '';
    if (content) {
      cards.push({ title, content });
    }
  }
  
  // Se não foi possível separar em cards estruturados, retorna o texto completo como um card genérico
  if (cards.length === 0) {
    cards.push({ title: '[REGISTRO]', content: observationsText });
  }
  
  return cards;
};

function LeadsContent() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPageInstance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: keyof Lead; direction: 'asc' | 'desc' } | null>({ key: 'dataUltimaConversao', direction: 'desc' });
  
  // Filtros
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    origem: '',
    estado: '',
    canal: ''
  });

  useEffect(() => {
    const fetchLPs = async () => {
      try {
        const lps = await api.getLandingPages();
        setLandingPages(lps);
      } catch (err) {
        console.error("Erro LPs leads:", err);
      }
    };
    fetchLPs();
  }, []);

  useEffect(() => {
    const canal = searchParams.get('canal');
    const status = searchParams.get('status');
    const origem = searchParams.get('origem');
    if (canal || status || origem) {
      setFilters(prev => ({
        ...prev,
        canal: canal || '',
        status: status || '',
        origem: origem || ''
      }));
    }
  }, [searchParams]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [importAnalysis, setImportAnalysis] = useState<{
    total: number;
    toCreate: any[];
    toUpdate: { lead: Lead; updates: any }[];
    loading: boolean;
  }>({ total: 0, toCreate: [], toUpdate: [], loading: false });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onResolve: () => void;
    loading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onResolve: () => {},
    loading: false
  });
  
  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    celular: '',
    origem: 'Manual',
    status: 'novo' as LeadStatus,
    tags: '',
    observacoes: '',
    empresa: '',
    cidade: '',
    estado: ''
  });

  // Segmentação State
  const [isSegmentModalOpen, setIsSegmentModalOpen] = useState(false);
  const [segmentData, setSegmentData] = useState({
    nome: '',
    descricao: ''
  });

  const refreshLeads = async () => {
    try {
      const data = await api.getLeads(50000); // Aumentado para suportar todos os leads sem sobrecarregar
      setLeads(data);
    } catch (error) {
      console.error("Erro ao recarregar leads:", error);
    }
  };

  useEffect(() => {
    refreshLeads();
  }, []);

  const handleSave = async () => {
    const lead: Lead = {
      id: editingLead?.id || Math.random().toString(36).substr(2, 9),
      nome: formData.nome,
      email: formData.email,
      telefone: formData.telefone,
      celular: formData.celular,
      origem: formData.origem,
      dataCriacao: editingLead?.dataCriacao || new Date().toISOString(),
      status: formData.status,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      consentimentoLGPD: true,
      observacoes: formData.observacoes,
      empresa: formData.empresa,
      cidade: formData.cidade,
      estado: formData.estado
    };
    
    await api.saveLead(lead);
    await refreshLeads();
    closeModal();
  };

  const openModal = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        nome: lead.nome,
        email: lead.email,
        telefone: lead.telefone || '',
        celular: lead.celular || '',
        origem: lead.origem,
        status: lead.status,
        tags: lead.tags.join(', '),
        observacoes: lead.observacoes || '',
        empresa: lead.empresa || '',
        cidade: lead.cidade || '',
        estado: lead.estado || ''
      });
    } else {
      setEditingLead(null);
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        celular: '',
        origem: 'Manual',
        status: 'novo',
        tags: '',
        observacoes: '',
        empresa: '',
        cidade: '',
        estado: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLead(null);
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Lead',
      message: 'Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.',
      onResolve: async () => {
        try {
          await api.deleteLead(id);
          await refreshLeads();
        } catch (error) {
          alert('Não foi possível excluir o lead. Verifique sua conexão ou permissões.');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleBulkDelete = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir em Massa',
      message: `Tem certeza que deseja excluir os ${selectedLeads.length} leads selecionados?`,
      onResolve: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          await api.deleteLeadsBulk(selectedLeads);
          setSelectedLeads([]);
          await refreshLeads();
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        }
      }
    });
  };

  const handleBulkStatus = async (status: LeadStatus) => {
    for (const id of selectedLeads) {
      const lead = leads.find(l => l.id === id);
      if (lead) {
        await api.saveLead({ ...lead, status });
      }
    }
    setSelectedLeads([]);
    await refreshLeads();
  };

  const handleCreateSegment = async () => {
    if (!segmentData.nome) return;

    const segment: Segmentation = {
      id: Math.random().toString(36).substr(2, 9),
      nome: segmentData.nome,
      descricao: segmentData.descricao,
      leadIds: selectedLeads,
      dataCriacao: new Date().toISOString()
    };

    await api.saveSegmentation(segment);
    setIsSegmentModalOpen(false);
    setSelectedLeads([]);
    setSegmentData({ nome: '', descricao: '' });
    alert('Segmentação criada com sucesso!');
  };

  const handleExportLeads = () => {
    if (leads.length === 0) return;
    
    // Header do CSV
    const headers = ['id', 'nome', 'email', 'telefone', 'empresa', 'cidade', 'estado', 'origem', 'dataCriacao', 'status', 'tags', 'observacoes'];
    
    // Instrução para o Excel reconhecer o separador ponto-e-vírgula automaticamente
    let csvContent = 'sep=;\n';
    csvContent += headers.join(';') + '\n';
    
    // Linhas do CSV
    csvContent += leads.map(lead => [
      lead.id,
      `"${lead.nome}"`,
      lead.email,
      `"${lead.telefone || ''}"`,
      `"${lead.empresa || ''}"`,
      `"${lead.cidade || ''}"`,
      `"${lead.estado || ''}"`,
      `"${lead.origem}"`,
      lead.dataCriacao,
      lead.status,
      `"${lead.tags.join(', ')}"`,
      `"${(lead.observacoes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ].join(';')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `backup_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportAnalysis(prev => ({ ...prev, loading: true }));
    setIsImportPreviewOpen(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const toCreate: any[] = [];
      const toUpdate: { lead: Lead; updates: any }[] = [];

      for (const row of jsonData) {
        // Busca inteligente de colunas (case-insensitive e parcial)
        const findValue = (keywords: string[]) => {
          // Prioriza a ordem das keywords (ex: busca 'contato' em todas as colunas antes de buscar 'nome')
          for (const kw of keywords) {
            const key = Object.keys(row).find(k => k.toLowerCase().includes(kw.toLowerCase()));
            if (key) return row[key]?.toString().trim();
          }
          return '';
        };

        const email = findValue(['email', 'e-mail', 'correio']);
        const nome = findValue(['contato', 'contact', 'name', 'nome']); // Prioriza 'contato' sobre 'nome'
        const rawTelefone = findValue(['celular', 'mobile', 'whatsapp', 'phone', 'telefone', 'fone']); // Remove 'contato' daqui
        const telefone = rawTelefone.replace(/\D/g, ''); // Remove tudo o que não for número
        const empresa = findValue(['empresa', 'company', 'companhia', 'organização', 'organization']);
        const cidade = findValue(['cidade', 'city']);
        const estado = findValue(['estado', 'state', 'uf']);
        const observacoes = findValue(['obs', 'notas', 'notes', 'comentário']);

        // Busca lead existente por qualquer um dos critérios
        const existingLead = leads.find(l => 
          (email && l.email?.toLowerCase() === email.toString().toLowerCase()) ||
          (nome && l.nome?.toLowerCase() === nome.toString().toLowerCase()) ||
          (telefone && (l.telefone === telefone.toString() || l.celular === telefone.toString())) ||
          (empresa && l.empresa?.toLowerCase() === empresa.toString().toLowerCase())
        );

        const leadData = {
          nome: nome || email.split('@')[0] || 'Lead Importado',
          email: email,
          telefone: telefone,
          celular: telefone,
          empresa: empresa,
          cidade: cidade,
          estado: estado,
          origem: 'Importação Kommo',
          tags: ['importado-kommo'],
          observacoes: observacoes
        };

        if (existingLead) {
          toUpdate.push({ lead: existingLead, updates: leadData });
        } else {
          toCreate.push(leadData);
        }
      }

      setImportAnalysis({
        total: jsonData.length,
        toCreate,
        toUpdate,
        loading: false
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    setImportAnalysis(prev => ({ ...prev, loading: true }));
    
    try {
      const allLeadsToProcess: Lead[] = [
        ...importAnalysis.toCreate.map(data => ({
          ...data,
          id: Math.random().toString(36).substr(2, 9),
          dataCriacao: new Date().toISOString(),
          status: 'novo' as LeadStatus,
          consentimentoLGPD: true,
          tags: data.tags || []
        })),
        ...importAnalysis.toUpdate.map(item => ({
          ...item.lead,
          ...item.updates
        }))
      ];

      await api.saveLeadsBulk(allLeadsToProcess);

      alert('Importação concluída com sucesso!');
      setIsImportPreviewOpen(false);
      refreshLeads();
    } catch (error) {
      console.error(error);
      alert('Erro durante a importação.');
    } finally {
      setImportAnalysis(prev => ({ ...prev, loading: false }));
    }
  };

  const handleWhatsAppClick = (telefone: string) => {
    if (!telefone) return;
    const cleanNumber = telefone.replace(/\D/g, '');
    const lead = leads.find(l => (l.celular || l.telefone)?.replace(/\D/g, '') === cleanNumber);
    const nameParam = lead ? `&name=${encodeURIComponent(lead.nome)}` : '';
    // Redireciona para a central de atendimento com o filtro do número e o nome
    window.location.href = `/atendimento?search=${cleanNumber}${nameParam}`;
  };

  const filteredLeads = leads.filter(lead => {
    // Busca inteligente (Nome, Empresa, E-mail ou Contato)
    const matchesSearch = 
      (lead.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.empresa || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.telefone || '').includes(searchTerm) ||
      (lead.celular || '').includes(searchTerm);

    // Filtros
    const matchesStatus = !filters.status || lead.status === filters.status;
    const matchesOrigem = !filters.origem || lead.origem === filters.origem;
    const matchesEstado = !filters.estado || lead.estado === filters.estado;

    // Filtro por canal de entrada
    let matchesCanal = true;
    if (filters.canal) {
      const orig = (lead.origem || '').toLowerCase();
      const tags = (lead.tags || []).map(t => t.toLowerCase());
      
      if (filters.canal === 'whatsapp') {
        matchesCanal = (orig.includes('whatsapp') && !orig.includes('widget')) || (tags.includes('whatsapp') && !tags.includes('widget'));
      } else if (filters.canal === 'whatsapp_widget') {
        matchesCanal = orig.includes('widget') || tags.includes('widget');
      } else if (filters.canal === 'instagram') {
        matchesCanal = orig.includes('instagram') || tags.includes('instagram');
      } else if (filters.canal === 'facebook') {
        matchesCanal = orig.includes('facebook') || orig.includes('messenger') || tags.includes('facebook') || tags.includes('messenger');
      } else if (filters.canal === 'youtube') {
        matchesCanal = orig.includes('youtube');
      } else if (filters.canal === 'tiktok') {
        matchesCanal = orig.includes('tiktok');
      } else if (filters.canal === 'system') {
        const lpSlugs = landingPages.map(lp => lp.slug).filter(Boolean);
        matchesCanal = lpSlugs.includes(lead.origem);
      }
    }

    return matchesSearch && matchesStatus && matchesOrigem && matchesEstado && matchesCanal;
  });

  // Sorting Logic
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const { key, direction } = sortConfig;
    let aValue = a[key] || '';
    let bValue = b[key] || '';

    if (key === 'tags') {
      aValue = a.tags?.[0] || '';
      bValue = b.tags?.[0] || '';
    }

    if (aValue < bValue) {
      return direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Pagination Logic
  const totalPages = Math.ceil(sortedLeads.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLeads = sortedLeads.slice(indexOfFirstItem, indexOfLastItem);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const toggleSelect = (id: string) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id));
    }
  };

  // Pegar valores únicos para os filtros
  const uniqueOrigens = Array.from(new Set(leads.map(l => l.origem))).filter(Boolean);
  const uniqueEstados = Array.from(new Set(leads.map(l => l.estado))).filter(Boolean);

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* HEADER FIXO */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 50, 
        background: 'var(--background)', 
        paddingTop: '1rem',
        borderBottom: '1px solid var(--border)',
        marginBottom: '1.5rem'
      }}>
        <header className="leads-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Gerenciamento de Leads</h2>
            <p style={{ opacity: 0.6 }}>Total de {leads.length} leads cadastrados.</p>
          </div>
          <div className="leads-header-actions" style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={handleExportLeads}>
              <Download size={18} /> Exportar Backup
            </button>
            <button className="btn btn-outline" onClick={() => setIsImportPreviewOpen(true)}>
              <Upload size={18} /> Importar Excel
            </button>
            <button className="btn btn-primary" onClick={() => openModal()}>
              <UserPlus size={18} /> Novo Lead
            </button>
          </div>
        </header>

        <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
              <input 
                type="text" 
                placeholder="Buscar por nome, empresa ou contato..." 
                className="btn-outline"
                style={{ width: '100%', paddingLeft: '2.5rem', borderRadius: 'var(--radius)', height: '42px', border: '1px solid var(--border)' }}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Volta para pag 1 ao buscar
                }}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <button 
                className={`btn ${Object.values(filters).some(v => v) ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              >
                <Filter size={18} /> Filtros
                {Object.values(filters).some(v => v) && (
                  <span style={{ 
                    marginLeft: '0.5rem', 
                    background: 'white', 
                    color: 'var(--primary)', 
                    borderRadius: '50%', 
                    width: '20px', 
                    height: '20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '0.7rem',
                    fontWeight: 'bold'
                  }}>
                    {Object.values(filters).filter(v => v).length}
                  </span>
                )}
              </button>

              {isFilterMenuOpen && (
                <div className="card" style={{ 
                  position: 'absolute', 
                  right: 0, 
                  top: '100%', 
                  marginTop: '0.5rem', 
                  width: '280px', 
                  zIndex: 60, 
                  padding: '1.5rem',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ fontWeight: 600 }}>Filtros Avançados</h4>
                    <button 
                      style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 500 }}
                      onClick={() => {
                        setFilters({ status: '', origem: '', estado: '', canal: '' });
                        setIsFilterMenuOpen(false);
                      }}
                    >
                      Limpar
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', opacity: 0.6 }}>Canal de Entrada</label>
                      <select 
                        className="btn-outline" 
                        style={{ width: '100%', height: '36px', padding: '0 0.5rem', fontSize: '0.875rem' }}
                        value={filters.canal}
                        onChange={(e) => setFilters({ ...filters, canal: e.target.value })}
                      >
                        <option value="">Todos</option>
                        <option value="whatsapp">WhatsApp (Atendimento)</option>
                        <option value="whatsapp_widget">Botão WhatsApp (Site)</option>
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Messenger / Facebook</option>
                        <option value="youtube">YouTube / Comentários</option>
                        <option value="tiktok">TikTok</option>
                        <option value="system">Sistema / Captura (LPs)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', opacity: 0.6 }}>Status</label>
                      <select 
                        className="btn-outline" 
                        style={{ width: '100%', height: '36px', padding: '0 0.5rem', fontSize: '0.875rem' }}
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      >
                        <option value="">Todos</option>
                        <option value="novo">Novo</option>
                        <option value="contatado">Contatado</option>
                        <option value="convertido">Convertido</option>
                        <option value="perdido">Perdido</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', opacity: 0.6 }}>Origem</label>
                      <select 
                        className="btn-outline" 
                        style={{ width: '100%', height: '36px', padding: '0 0.5rem', fontSize: '0.875rem' }}
                        value={filters.origem}
                        onChange={(e) => setFilters({ ...filters, origem: e.target.value })}
                      >
                        <option value="">Todas</option>
                        {uniqueOrigens.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', opacity: 0.6 }}>Estado (UF)</label>
                      <select 
                        className="btn-outline" 
                        style={{ width: '100%', height: '36px', padding: '0 0.5rem', fontSize: '0.875rem' }}
                        value={filters.estado}
                        onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
                      >
                        <option value="">Todos</option>
                        {uniqueEstados.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                  </div>

                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '1.5rem', height: '36px' }}
                    onClick={() => setIsFilterMenuOpen(false)}
                  >
                    Aplicar Filtros
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedLeads.length > 0 && (
        <div className="card selected-leads-panel" style={{ marginBottom: '1.5rem', padding: '0.75rem 1.5rem', background: 'var(--primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{selectedLeads.length} leads selecionados</span>
          <div className="selected-leads-actions" style={{ display: 'flex', gap: '1rem' }}>
            {selectedLeads.length === 1 && (
              <button 
                className="btn" 
                style={{ background: '#25D366', color: 'white' }} 
                onClick={() => {
                  const lead = leads.find(l => l.id === selectedLeads[0]);
                  if (lead) handleWhatsAppClick(lead.celular || lead.telefone || '');
                }}
              >
                <WhatsAppIcon size={18} /> Falar no WhatsApp
              </button>
            )}
            <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }} onClick={() => setIsSegmentModalOpen(true)}>
               Criar Segmento
            </button>
            <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }} onClick={() => handleBulkStatus('contatado')}>
              Mudar p/ Contatado
            </button>
            <button className="btn" style={{ background: 'rgba(239, 68, 68, 0.8)', color: 'white' }} onClick={handleBulkDelete}>
              <Trash2 size={16} /> Excluir
            </button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input type="checkbox" checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0} onChange={selectAll} />
              </th>
              {[
                { label: 'Nome', key: 'nome' },
                { label: 'E-mail', key: 'email' },
                { label: 'Celular', key: 'celular' },
                { label: 'Empresa', key: 'empresa' },
                { label: 'Última Conversão', key: 'dataUltimaConversao' },
                { label: 'Status', key: 'status' },
                { label: 'Tags', key: 'tags' }
              ].map((col) => (
                <th 
                  key={col.key}
                  onClick={() => {
                    let direction: 'asc' | 'desc' = 'asc';
                    if (sortConfig && sortConfig.key === col.key && sortConfig.direction === 'asc') {
                      direction = 'desc';
                    }
                    setSortConfig({ key: col.key as keyof Lead, direction });
                  }}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {col.label}
                    {sortConfig?.key === col.key ? (
                      sortConfig.direction === 'asc' ? <ArrowUp size={14} opacity={0.7} /> : <ArrowDown size={14} opacity={0.7} />
                    ) : (
                      <ArrowUpDown size={14} opacity={0.3} />
                    )}
                  </div>
                </th>
              ))}
              <th style={{ width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {currentLeads.map(lead => (
              <tr key={lead.id}>
                <td>
                  <input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={() => toggleSelect(lead.id)} />
                </td>
                <td style={{ fontWeight: 500 }}>{lead.nome}</td>
                <td style={{ opacity: 0.8 }}>{lead.email}</td>
                <td>{lead.celular || lead.telefone || '-'}</td>
                <td>{lead.empresa || '-'}</td>
                <td>{lead.dataUltimaConversao ? new Date(lead.dataUltimaConversao).toLocaleDateString('pt-BR') : new Date(lead.dataCriacao!).toLocaleDateString('pt-BR')}</td>
                <td>
                  <span className={`badge badge-${lead.status}`}>
                    {lead.status.toUpperCase()}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {lead.tags && lead.tags.length > 0 && (
                      <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'var(--accent)', border: '1px solid var(--border)' }}>
                        {lead.tags[lead.tags.length - 1]}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(lead.celular || lead.telefone) && (
                      <button style={{ color: '#25D366', display: 'flex', alignItems: 'center' }} onClick={() => handleWhatsAppClick(lead.celular || lead.telefone || '')} title="WhatsApp"><WhatsAppIcon size={18} /></button>
                    )}
                    <button style={{ opacity: 0.6, color: 'var(--primary)' }} onClick={() => { setViewingLead(lead); setIsDetailsOpen(true); }} title="Ver Detalhes"><Eye size={18} /></button>
                    <button style={{ opacity: 0.4 }} onClick={() => openModal(lead)} title="Editar"><TagIcon size={18} /></button>
                    <button style={{ opacity: 0.4, color: 'var(--danger)' }} onClick={() => handleDelete(lead.id)} title="Excluir"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINAÇÃO */}
      <div className="pagination-container" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: '1.5rem',
        padding: '1rem',
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ opacity: 0.6, fontSize: '0.875rem' }}>
          Exibindo {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredLeads.length)} de {filteredLeads.length} leads
        </div>
        <div className="pagination-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-outline" 
            disabled={currentPage === 1}
            onClick={() => goToPage(1)}
            style={{ padding: '0.5rem 1rem' }}
          >
            Primeira
          </button>
          <button 
            className="btn btn-outline" 
            disabled={currentPage === 1}
            onClick={() => goToPage(currentPage - 1)}
            style={{ padding: '0.5rem 1rem' }}
          >
            Anterior
          </button>
          
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = currentPage <= 3 ? i + 1 : currentPage + i - 2;
              if (pageNum > totalPages) pageNum = totalPages - (Math.min(5, totalPages) - i - 1);
              if (pageNum <= 0) pageNum = i + 1;
              
              if (pageNum > totalPages || pageNum <= 0) return null;

              return (
                <button 
                  key={pageNum}
                  className={`btn ${currentPage === pageNum ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => goToPage(pageNum)}
                  style={{ minWidth: '40px', padding: '0.5rem' }}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button 
            className="btn btn-outline" 
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => goToPage(currentPage + 1)}
            style={{ padding: '0.5rem 1rem' }}
          >
            Próximo
          </button>
          <button 
            className="btn btn-outline" 
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => goToPage(totalPages)}
            style={{ padding: '0.5rem 1rem' }}
          >
            Última
          </button>
        </div>
      </div>

      {/* MODAL DE DETALHES COMPLETO */}
      {isDetailsOpen && viewingLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: '1rem' }}>
          <div className="card" style={{ width: '1000px', maxWidth: '95%', position: 'relative', padding: 0, overflow: 'hidden' }}>
            <div style={{ background: 'var(--primary)', padding: '1.5rem', color: 'white' }}>
              <button style={{ position: 'absolute', right: '1rem', top: '1rem', color: 'white', opacity: 0.8 }} onClick={() => setIsDetailsOpen(false)}>
                <X size={24} />
              </button>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {viewingLead.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{viewingLead.nome}</h3>
                  <p style={{ opacity: 0.8 }}>ID: {viewingLead.id}</p>
                </div>
              </div>
            </div>

            <div style={{ padding: '2rem', display: 'grid', gap: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Seção Dados Principais */}
              <section>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <Info size={18} /> Dados do Lead
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>E-mail Principal</p>
                    <p style={{ fontWeight: 500 }}>{viewingLead.email}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Celular / WhatsApp</p>
                    <p style={{ fontWeight: 500 }}>{viewingLead.celular || 'Não informado'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Telefone Fixo</p>
                    <p style={{ fontWeight: 500 }}>{viewingLead.telefone || 'Não informado'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Empresa</p>
                    <p style={{ fontWeight: 500 }}>{viewingLead.empresa || 'Não informado'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Data de Cadastro</p>
                    <p style={{ fontWeight: 500 }}>{new Date(viewingLead.dataCriacao).toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Total de Conversões</p>
                    <p style={{ fontWeight: 600, color: 'var(--primary)' }}>{viewingLead.totalConversoes || 1}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Última Conversão</p>
                    <p style={{ fontWeight: 500 }}>{viewingLead.dataUltimaConversao ? new Date(viewingLead.dataUltimaConversao).toLocaleString('pt-BR') : new Date(viewingLead.dataCriacao).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </section>

              {/* Seção UTMs e Rastreamento */}
              <section style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 600 }}>
                  📍 Rastreamento de Marketing
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Origem Principal</p>
                    <p style={{ fontWeight: 600, color: 'var(--primary)' }}>{viewingLead.origem}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>UTM Source</p>
                    <p style={{ color: viewingLead.utm_source ? 'var(--primary)' : 'inherit' }}>{viewingLead.utm_source || '---'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>UTM Medium</p>
                    <p>{viewingLead.utm_medium || '---'}</p>
                  </div>
                  <div style={{ gridColumn: 'span 3' }}>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>UTM Campaign</p>
                    <p>{viewingLead.utm_campaign || '---'}</p>
                  </div>
                </div>
              </section>

              {/* Seção Status e Obs */}
              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontWeight: 600 }}>Status do Funil</h4>
                  <span className={`badge badge-${viewingLead.status}`} style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
                    {viewingLead.status.toUpperCase()}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.75rem' }}>Observações e Notas de Conversão</p>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {parseObservationsToCards(viewingLead.observacoes || '').map((card, idx) => {
                    const isQuote = card.title.includes('COTAÇÃO');
                    const isConversion = card.title.includes('CONVERSÃO');
                    const isReconversion = card.title.includes('RECONVERSÃO');
                    
                    let cardBg = '#f8fafc';
                    let borderColor = 'var(--border)';
                    let titleColor = 'var(--primary)';
                    
                    if (isQuote) {
                      cardBg = 'rgba(245, 158, 11, 0.05)';
                      borderColor = 'rgba(245, 158, 11, 0.2)';
                      titleColor = '#d97706';
                    } else if (isConversion) {
                      cardBg = 'rgba(16, 185, 129, 0.05)';
                      borderColor = 'rgba(16, 185, 129, 0.2)';
                      titleColor = 'var(--success)';
                    } else if (isReconversion) {
                      cardBg = 'rgba(99, 102, 241, 0.05)';
                      borderColor = 'rgba(99, 102, 241, 0.2)';
                      titleColor = 'var(--primary)';
                    }

                    return (
                      <div key={idx} style={{ background: cardBg, border: `1px solid ${borderColor}`, padding: '1rem', borderRadius: '10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: titleColor, textTransform: 'uppercase', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: titleColor }}></span>
                          {card.title.replace(/[\[\]]/g, '')}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: '1.4' }}>
                          {card.content}
                        </div>
                      </div>
                    );
                  })}
                  {(!viewingLead.observacoes) && (
                    <p style={{ fontStyle: 'italic', color: '#94a3b8', textAlign: 'center', margin: '1rem 0' }}>Nenhuma observação registrada para este lead.</p>
                  )}
                </div>
              </section>
            </div>

            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
              <button className="btn btn-outline" onClick={() => setIsDetailsOpen(false)}>Fechar Detalhes</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '500px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
             <button style={{ position: 'absolute', right: '1rem', top: '1rem', opacity: 0.5 }} onClick={closeModal}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem' }}>{editingLead ? 'Editar Lead' : 'Novo Lead'}</h3>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Nome Completo</label>
                <input 
                  type="text" className="btn-outline" style={{ width: '100%', height: '40px', padding: '0 0.75rem' }} 
                  value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>E-mail</label>
                <input 
                  type="email" className="btn-outline" style={{ width: '100%', height: '40px', padding: '0 0.75rem' }} 
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Celular (WhatsApp)</label>
                  <input 
                    type="text" className="btn-outline" style={{ width: '100%', height: '40px', padding: '0 0.75rem' }} 
                    value={formData.celular} onChange={e => setFormData({...formData, celular: e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Telefone Fixo</label>
                  <input 
                    type="text" className="btn-outline" style={{ width: '100%', height: '40px', padding: '0 0.75rem' }} 
                    value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Status</label>
                <select 
                  className="btn-outline" style={{ width: '100%', height: '40px', padding: '0 0.75rem' }} 
                  value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as LeadStatus})}
                >
                  <option value="novo">Novo</option>
                  <option value="contatado">Contatado</option>
                  <option value="convertido">Convertido</option>
                  <option value="perdido">Perdido</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Empresa</label>
                <input 
                  type="text" className="btn-outline" style={{ width: '100%', height: '40px', padding: '0 0.75rem' }} 
                  value={formData.empresa} onChange={e => setFormData({...formData, empresa: e.target.value})}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Cidade</label>
                  <input 
                    type="text" className="btn-outline" style={{ width: '100%', height: '40px', padding: '0 0.75rem' }} 
                    value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Estado (UF)</label>
                  <input 
                    type="text" className="btn-outline" style={{ width: '100%', height: '40px', padding: '0 0.75rem' }} 
                    value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Tags (separadas por vírgula)</label>
                <input 
                  type="text" className="btn-outline" style={{ width: '100%', height: '40px', padding: '0 0.75rem' }} 
                  value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Observações</label>
                <textarea 
                  className="btn-outline" style={{ width: '100%', minHeight: '80px', padding: '0.75rem' }} 
                  value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>
                  <Check size={18} /> Salvar Lead
                </button>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={closeModal}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div className="card" style={{ width: '400px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', textAlign: 'center' }}>
            <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>
              <Trash2 size={48} style={{ margin: '0 auto' }} />
            </div>
            <h3 style={{ marginBottom: '1rem' }}>{confirmModal.title}</h3>
            <p style={{ opacity: 0.7, marginBottom: '2rem', fontSize: '1rem' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn" 
                style={{ flex: 1, background: 'var(--danger)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} 
                onClick={confirmModal.onResolve}
                disabled={confirmModal.loading}
              >
                {confirmModal.loading ? (
                  <>
                    <Loader2 size={18} className="spin" /> Excluindo...
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
              <button 
                className="btn btn-outline" 
                style={{ flex: 1 }} 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {isImportPreviewOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '500px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: 0 }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileSpreadsheet size={24} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0 }}>Importação Inteligente</h3>
              </div>
              <button style={{ opacity: 0.5 }} onClick={() => setIsImportPreviewOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '2rem' }}>
              {!importAnalysis.total && !importAnalysis.loading ? (
                <div style={{ textAlign: 'center' }}>
                  <div 
                    style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: '3rem 2rem', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                    onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    onClick={() => document.getElementById('import-excel-file')?.click()}
                  >
                    <Upload size={48} style={{ color: 'var(--primary)', marginBottom: '1rem', margin: '0 auto' }} />
                    <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Clique para selecionar a planilha do Kommo</p>
                    <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>Formatos suportados: .xlsx, .xls</p>
                    <input 
                      id="import-excel-file" 
                      type="file" 
                      accept=".xlsx, .xls" 
                      hidden 
                      onChange={handleImportExcel}
                    />
                  </div>
                </div>
              ) : importAnalysis.loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Loader2 size={48} className="spin" style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
                  <p style={{ fontWeight: 600 }}>Processando dados...</p>
                  <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>Isso pode levar alguns segundos dependendo do tamanho da planilha.</p>
                </div>
              ) : (
                <div>
                  <div style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                    <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Resumo da Importação</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.25rem' }}>Novos Leads</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>+ {importAnalysis.toCreate.length}</p>
                      </div>
                      <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.25rem' }}>Existentes (Atualizar)</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{importAnalysis.toUpdate.length}</p>
                      </div>
                    </div>
                    <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={16} />
                      Total de <strong>{importAnalysis.total}</strong> leads analisados na planilha.
                    </div>
                  </div>

                  <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '1rem', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: '#92400e', marginBottom: '1.5rem' }}>
                    <strong>Aviso de Inteligência:</strong> O sistema identificou duplicatas comparando Nome, E-mail, Telefone e Empresa. Os dados existentes serão mantidos e novos campos serão preenchidos.
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-primary" style={{ flex: 2, height: '48px' }} onClick={confirmImport}>
                      Confirmar e Processar Agora
                    </button>
                    <button className="btn btn-outline" style={{ flex: 1, height: '48px' }} onClick={() => {
                      setImportAnalysis({ total: 0, toCreate: [], toUpdate: [], loading: false });
                    }}>
                      Trocar Arquivo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {isSegmentModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '400px', position: 'relative' }}>
            <button style={{ position: 'absolute', right: '1rem', top: '1rem', opacity: 0.5 }} onClick={() => setIsSegmentModalOpen(false)}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem' }}>Criar Nova Segmentação</h3>
            <p style={{ fontSize: '0.875rem', opacity: 0.6, marginBottom: '1.5rem' }}>
              Você está criando um grupo com os <strong>{selectedLeads.length} leads</strong> selecionados.
            </p>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Nome da Segmentação</label>
                <input 
                  type="text" className="btn-outline" style={{ width: '100%', height: '40px', padding: '0 0.75rem' }} 
                  placeholder="Ex: Clientes VIP"
                  value={segmentData.nome} onChange={e => setSegmentData({...segmentData, nome: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Descrição (Opcional)</label>
                <input 
                  type="text" className="btn-outline" style={{ width: '100%', height: '40px', padding: '0 0.75rem' }} 
                  value={segmentData.descricao} onChange={e => setSegmentData({...segmentData, descricao: e.target.value})}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreateSegment} disabled={!segmentData.nome}>
                  <Check size={18} /> Criar Segmento
                </button>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsSegmentModalOpen(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <LeadsContent />
    </Suspense>
  );
}
