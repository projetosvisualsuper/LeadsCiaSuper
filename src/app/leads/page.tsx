'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Lead, LeadStatus, Segmentation } from '@/types/crm';
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
  Check
} from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  
  // Filtros
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    origem: '',
    estado: ''
  });
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onResolve: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onResolve: () => {}
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
    const data = await api.getLeads();
    setLeads(data);
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
        await api.deleteLead(id);
        await refreshLeads();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleBulkDelete = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir em Massa',
      message: `Tem certeza que deseja excluir os ${selectedLeads.length} leads selecionados?`,
      onResolve: async () => {
        for (const id of selectedLeads) {
          await api.deleteLead(id);
        }
        setSelectedLeads([]);
        await refreshLeads();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
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

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('Processando arquivo...');
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) return;

      const headerLine = lines[0];
      // Detectar o separador mais provável: Ponto-e-vírgula, Tabulação ou Vírgula
      let separator = ',';
      if (headerLine.includes(';')) separator = ';';
      else if (headerLine.includes('\t')) separator = '\t';
      
      const headers = headerLine.split(separator).map(h => h.trim().toLowerCase());
      
      // Encontrar índices únicos para cada campo
      const idxEmail = headers.findIndex(h => h.includes('email') || h.includes('e-mail'));
      const idxNome = headers.findIndex(h => h.includes('nome') || h.includes('name'));
      const idxTelefone = headers.findIndex(h => h.toLowerCase() === 'telefone');
      const idxCelular = headers.findIndex(h => h.includes('celular') || h.includes('mobile'));
      const idxEmpresa = headers.findIndex(h => h.includes('empresa') || h.includes('company') || h.includes('cargo'));
      const idxCidade = headers.findIndex(h => h.includes('cidade') || h.includes('city'));
      const idxEstado = headers.findIndex(h => h.includes('estado') || h.includes('state') || h.includes('uf'));

      let count = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const cols = line.split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
        
        const email = (idxEmail !== -1 && cols[idxEmail]) ? cols[idxEmail] : '';
        const nome = (idxNome !== -1 && idxNome !== idxEmail && cols[idxNome]) ? cols[idxNome] : (email ? 'Sem Nome' : '');
        const telefone = (idxTelefone !== -1 && idxTelefone !== idxEmail && cols[idxTelefone]) ? cols[idxTelefone] : '';
        const celular = (idxCelular !== -1 && idxCelular !== idxEmail && cols[idxCelular]) ? cols[idxCelular] : '';
        const empresa = (idxEmpresa !== -1 && idxEmpresa !== idxEmail && cols[idxEmpresa]) ? cols[idxEmpresa] : '';
        const cidade = (idxCidade !== -1 && cols[idxCidade]) ? cols[idxCidade] : '';
        const estado = (idxEstado !== -1 && cols[idxEstado]) ? cols[idxEstado] : '';

        if (email && email.includes('@') && email.length < 100) {
          await api.saveLead({
            id: Math.random().toString(36).substr(2, 9),
            nome: nome || 'Sem Nome',
            email: email,
            telefone: telefone,
            celular: celular,
            empresa: empresa,
            cidade: cidade,
            estado: estado,
            origem: 'Planilha RD/Massa',
            dataCriacao: new Date().toISOString(),
            status: 'novo',
            tags: ['importado-planilha'],
            consentimentoLGPD: true
          });
          count++;
        }
      }
      
      setImportStatus(`${count} leads importados com sucesso!`);
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportStatus('');
        refreshLeads();
      }, 2000);
    };
    reader.readAsText(file);
  };

  const filteredLeads = leads.filter(lead => {
    // Busca inteligente (Nome, Empresa, E-mail ou Contato)
    const matchesSearch = 
      lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.empresa || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.telefone || '').includes(searchTerm) ||
      (lead.celular || '').includes(searchTerm);

    // Filtros
    const matchesStatus = !filters.status || lead.status === filters.status;
    const matchesOrigem = !filters.origem || lead.origem === filters.origem;
    const matchesEstado = !filters.estado || lead.estado === filters.estado;

    return matchesSearch && matchesStatus && matchesOrigem && matchesEstado;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLeads = filteredLeads.slice(indexOfFirstItem, indexOfLastItem);

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
        <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Gerenciamento de Leads</h2>
            <p style={{ opacity: 0.6 }}>Total de {leads.length} leads cadastrados.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={handleExportLeads}>
              <Download size={18} /> Exportar Backup
            </button>
            <button className="btn btn-outline" onClick={() => setIsImportModalOpen(true)}>
              <Upload size={18} /> Importar Planilha
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
                      onClick={() => setFilters({ status: '', origem: '', estado: '' })}
                    >
                      Limpar
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: '1rem' }}>
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
        <div className="card" style={{ marginBottom: '1.5rem', padding: '0.75rem 1.5rem', background: 'var(--primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{selectedLeads.length} leads selecionados</span>
          <div style={{ display: 'flex', gap: '1rem' }}>
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
              <th>Nome</th>
              <th>E-mail</th>
              <th>Celular</th>
              <th>Empresa</th>
              <th>Origem</th>
              <th>Status</th>
              <th>Tags</th>
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
                <td>{lead.origem}</td>
                <td>
                  <span className={`badge badge-${lead.status}`}>
                    {lead.status.toUpperCase()}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {lead.tags.map(tag => (
                      <span key={tag} style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'var(--accent)', border: '1px solid var(--border)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
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
      <div style={{ 
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
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
        </div>
      </div>

      {/* MODAL DE DETALHES COMPLETO */}
      {isDetailsOpen && viewingLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: '1rem' }}>
          <div className="card" style={{ width: '600px', maxWidth: '100%', position: 'relative', padding: 0, overflow: 'hidden' }}>
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
                <p style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.5rem' }}>Observações e Notas</p>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontStyle: viewingLead.observacoes ? 'normal' : 'italic', color: viewingLead.observacoes ? 'inherit' : '#94a3b8' }}>
                  {viewingLead.observacoes || 'Nenhuma observação registrada para este lead.'}
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
          <div className="card" style={{ width: '500px', position: 'relative' }}>
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
          <div className="card" style={{ width: '400px', textAlign: 'center' }}>
            <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>
              <Trash2 size={48} style={{ margin: '0 auto' }} />
            </div>
            <h3 style={{ marginBottom: '1rem' }}>{confirmModal.title}</h3>
            <p style={{ opacity: 0.7, marginBottom: '2rem', fontSize: '1rem' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn" 
                style={{ flex: 1, background: 'var(--danger)', color: 'white' }} 
                onClick={confirmModal.onResolve}
              >
                Confirmar
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
      {isImportModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '400px', position: 'relative' }}>
            <button style={{ position: 'absolute', right: '1rem', top: '1rem', opacity: 0.5 }} onClick={() => setIsImportModalOpen(false)}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem' }}>Importar Leads em Massa</h3>
            <p style={{ fontSize: '0.875rem', opacity: 0.6, marginBottom: '1.5rem' }}>
              O arquivo deve ser um <strong>.CSV</strong> contendo as colunas: <strong>nome, email, telefone</strong> na primeira linha.
            </p>
            
            <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: '2rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => document.getElementById('bulk-csv-file')?.click()}>
              <Upload size={32} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
              <p>{importStatus || 'Clique para selecionar arquivo .csv'}</p>
              <input 
                id="bulk-csv-file" 
                type="file" 
                accept=".csv" 
                hidden 
                onChange={handleImportCSV}
              />
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
