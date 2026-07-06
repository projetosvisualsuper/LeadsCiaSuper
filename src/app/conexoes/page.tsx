'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { WhatsappConnection, WhatsappConnectionType } from '@/types/crm';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  QrCode,
  Smartphone,
  ShieldCheck,
  Zap,
  MoreVertical,
  Pencil,
  LogOut,
  Upload
} from 'lucide-react';

export default function ConexoesPage() {
  const [connections, setConnections] = useState<WhatsappConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<WhatsappConnection>>({
    name: '',
    type: 'evolution_api',
    isDefault: false
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  const [activeTab, setActiveTab] = useState<'connections' | 'templates'>('connections');
  
  // Templates States
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateFormData, setTemplateFormData] = useState<any>({
    name: '',
    connectionId: '',
    category: 'MARKETING',
    language: 'pt_BR',
    content: ''
  });

  // Wizard States
  const [wizardStep, setWizardStep] = useState<number>(1); // 1 = Select type, 2 = Editor / WhatsApp select category, 3 = WhatsApp editor
  const [wizardType, setWizardType] = useState<'general' | 'whatsapp' | null>(null);
  const [wabaCategoryTab, setWabaCategoryTab] = useState<'MARKETING' | 'UTILITY'>('MARKETING');
  const [wabaSubtype, setWabaSubtype] = useState<string>('customizado');
  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'MEDIA'>('NONE');
  const [headerText, setHeaderText] = useState<string>('');
  const [headerMediaUrl, setHeaderMediaUrl] = useState<string>('');
  const [footerText, setFooterText] = useState<string>('');
  const [buttons, setButtons] = useState<any[]>([]);
  const [isMediaUploading, setIsMediaUploading] = useState<boolean>(false);

  const openTemplateModal = (tpl?: any) => {
    if (tpl) {
      setEditingId(tpl.id);
      setTemplateFormData({
        id: tpl.id,
        name: tpl.name,
        connectionId: tpl.connectionId,
        category: tpl.category,
        language: tpl.language,
        content: tpl.content,
        status: tpl.status,
        components: tpl.components || []
      });
      const isGeneral = tpl.category === 'GENERAL';
      setWizardType(isGeneral ? 'general' : 'whatsapp');
      setWizardStep(isGeneral ? 2 : 3);
      if (!isGeneral) {
        setWabaCategoryTab(tpl.category);
      }
      const headerObj = (tpl.components || []).find((c: any) => c.type === 'HEADER');
      if (headerObj) {
        setHeaderType(headerObj.format === 'TEXT' ? 'TEXT' : (headerObj.format ? 'MEDIA' : 'NONE'));
        setHeaderText(headerObj.text || '');
        setHeaderMediaUrl(headerObj.imageUrl || headerObj.mediaUrl || '');
      } else {
        setHeaderType('NONE');
        setHeaderText('');
        setHeaderMediaUrl('');
      }
      const footerObj = (tpl.components || []).find((c: any) => c.type === 'FOOTER');
      if (footerObj) {
        setFooterText(footerObj.text || '');
      } else {
        setFooterText('');
      }
      const buttonsObj = (tpl.components || []).find((c: any) => c.type === 'BUTTONS');
      if (buttonsObj && buttonsObj.buttons) {
        setButtons(buttonsObj.buttons);
      } else {
        setButtons([]);
      }
    } else {
      setEditingId(null);
      const nowStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '_') + '_' + new Date().toLocaleTimeString('pt-BR', { hour12: false }).substring(0, 5).replace(/:/g, '_');
      setTemplateFormData({
        name: `modelo_${nowStr}`,
        connectionId: '',
        category: 'GENERAL',
        language: 'pt_BR',
        content: '',
        status: 'LOCAL'
      });
      setWizardStep(1);
      setWizardType(null);
      setWabaCategoryTab('MARKETING');
      setWabaSubtype('customizado');
      setHeaderType('NONE');
      setHeaderText('');
      setHeaderMediaUrl('');
      setFooterText('');
      setButtons([]);
    }
    setShowTemplateModal(true);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // QR Code States
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{base64?: string, pairingCode?: string, loading: boolean, error?: string, mock?: boolean}>({ loading: false });

  // Test Message States
  const [showTestModal, setShowTestModal] = useState(false);
  const [testData, setTestData] = useState({ connectionId: '', phone: '', message: 'Olá! Este é um teste de conexão do Leads Cia Super. 🚀', loading: false });

  const fetchQrCode = async (connectionId: string) => {
    setShowQrModal(true);
    setQrCodeData({ loading: true });
    try {
      const connection = connections.find(c => c.id === connectionId);
      const instanceName = connection?.evolutionInstanceName || connection?.name || '';
      const res = await fetch(`/api/whatsapp/evolution/instance?connectionId=${connectionId}&instanceName=${encodeURIComponent(instanceName)}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar QR Code');
      
      if (data.connected) {
        setShowQrModal(false);
        showToast('WhatsApp já está conectado!', 'success');
        setConnections(prev => prev.map(c => c.id === connectionId ? { ...c, status: 'connected' } : c));
        // Force update in DB just in case
        api.updateWhatsappConnection(connectionId, { status: 'connected' }).catch(console.error);
        return;
      }

      setQrCodeData({ 
        base64: data.qrCodeBase64, 
        pairingCode: data.pairingCode,
        loading: false,
        mock: data.mock
      });
      loadConnections();
    } catch (err: any) {
      setQrCodeData({ loading: false, error: err.message });
    }
  };

  const handleTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestData(prev => ({ ...prev, loading: true }));
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'testConnection',
          phone: testData.phone.replace(/\D/g, ''),
          channel: 'whatsapp',
          message: testData.message,
          connectionId: testData.connectionId
        })
      });
      
      const result = await response.json();

      if (result.success) {
        showToast('Mensagem de teste enviada com sucesso!', 'success');
        setShowTestModal(false);
      } else {
        throw new Error(result.error || 'Falha ao enviar mensagem');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao enviar teste.', 'error');
    }
    setTestData(prev => ({ ...prev, loading: false }));
  };

  const loadConnections = async () => {
    setLoading(true);
    try {
      const data = await api.getWhatsappConnections();
      setConnections(data);
    } catch (error) {
      console.error('Erro ao carregar conexões:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadConnections();
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await api.getWhatsappTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  };

  const handleDisconnect = async (conn: WhatsappConnection) => {
    if (!confirm(`Tem certeza que deseja desconectar a instância ${conn.evolutionInstanceName || conn.name}? O WhatsApp vai ser deslogado.`)) return;
    
    try {
      const instanceName = conn.evolutionInstanceName || conn.name || '';
      const res = await fetch(`/api/whatsapp/evolution/instance?connectionId=${conn.id}&instanceName=${encodeURIComponent(instanceName)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao desconectar');
      
      showToast('Desconectado com sucesso', 'success');
      loadConnections();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleTestSend = (conn: WhatsappConnection) => {
    setTestData(prev => ({ ...prev, connectionId: conn.id }));
    setShowTestModal(true);
  };

  const handleEdit = (conn: WhatsappConnection) => {
    setEditingId(conn.id);
    setFormData({
      name: conn.name,
      type: conn.type,
      isDefault: conn.isDefault,
      evolutionInstanceName: conn.evolutionInstanceName,
      metaPhoneNumberId: conn.metaPhoneNumberId,
      metaAccessToken: conn.metaAccessToken
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (formData.name && formData.type) {
        
        const payload: any = {
          name: formData.name,
          type: formData.type as WhatsappConnectionType,
          isDefault: formData.isDefault || false,
          dataCriacao: new Date().toISOString()
        };

        if (!editingId) {
          payload.status = formData.type === 'meta_official' ? 'connected' : 'pending';
        }

        if (formData.evolutionInstanceName) payload.evolutionInstanceName = formData.evolutionInstanceName;
        if (formData.metaPhoneNumberId) payload.metaPhoneNumberId = formData.metaPhoneNumberId;
        if (formData.metaAccessToken) payload.metaAccessToken = formData.metaAccessToken;

        if (editingId) {
          await api.updateWhatsappConnection(editingId, payload);
          showToast('Conexão atualizada com sucesso!', 'success');
        } else {
          await api.createWhatsappConnection(payload);
          showToast('Conexão criada com sucesso!', 'success');
        }
        
        setShowModal(false);
        setEditingId(null);
        setFormData({ name: '', type: 'evolution_api', isDefault: false });
        loadConnections();
      }
    } catch (error: any) {
      console.error('Erro ao salvar conexão:', error);
      showToast(error.message || 'Erro ao criar conexão. Verifique os dados.', 'error');
    }
    setSaving(false);
  };

  const handleSaveTemplate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const id = editingId || Math.random().toString(36).substr(2, 9);

      const componentsArr: any[] = [];
      
      if (headerType !== 'NONE') {
        componentsArr.push({
          type: 'HEADER',
          format: headerType === 'TEXT' ? 'TEXT' : 'IMAGE',
          text: headerType === 'TEXT' ? headerText : undefined,
          mediaUrl: headerType === 'MEDIA' ? headerMediaUrl : undefined,
          imageUrl: headerType === 'MEDIA' ? headerMediaUrl : undefined
        });
      }

      if (footerText) {
        componentsArr.push({
          type: 'FOOTER',
          text: footerText
        });
      }

      if (buttons.length > 0) {
        componentsArr.push({
          type: 'BUTTONS',
          buttons: buttons.map(b => ({
            type: b.type,
            text: b.text,
            url: b.url || undefined,
            phone: b.phone || undefined
          }))
        });
      }

      const payload = {
        ...templateFormData,
        id,
        category: wizardType === 'general' ? 'GENERAL' : wabaCategoryTab,
        status: wizardType === 'general' ? 'LOCAL' : 'PENDING',
        components: componentsArr,
        dataCriacao: new Date().toISOString()
      };

      await api.saveWhatsappTemplate(payload);
      if (wizardType === 'whatsapp') {
        try {
          showToast('Enviando modelo para a Meta...', 'success');
          await api.submitTemplateToMeta(id);
          showToast('Modelo enviado para análise com sucesso!', 'success');
        } catch (metaErr: any) {
          console.error(metaErr);
          showToast(`Salvo localmente, mas erro na Meta: ${metaErr.message || metaErr}`, 'error');
        }
      } else {
        showToast('Modelo salvo com sucesso!', 'success');
      }
      setShowTemplateModal(false);
      setEditingId(null);
      loadTemplates();
    } catch (error: any) {
      console.error(error);
      showToast(`Erro ao salvar modelo: ${error.message || error}`, 'error');
    }
    setSaving(false);
  };

  const [syncingTemplates, setSyncingTemplates] = useState(false);

  const handleSyncTemplates = async () => {
    const metaConn = connections.find(c => c.type === 'meta_official');
    if (!metaConn) {
      showToast('Nenhuma conexão oficial do WhatsApp (Meta) encontrada para sincronizar.', 'error');
      return;
    }
    setSyncingTemplates(true);
    try {
      showToast('Sincronizando modelos com a Meta...', 'success');
      const res = await api.syncTemplatesFromMeta(metaConn.id);
      showToast(`Sincronização concluída! Importados: ${res.createdCount}, Atualizados: ${res.updatedCount}`, 'success');
      loadTemplates();
    } catch (error: any) {
      console.error(error);
      showToast(`Erro na sincronização: ${error.message || error}`, 'error');
    }
    setSyncingTemplates(false);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Deseja excluir este modelo?')) {
      await api.deleteWhatsappTemplate(id);
      loadTemplates();
      showToast('Modelo excluído.', 'success');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conexão? As mensagens antigas continuarão salvas, mas novas não chegarão por aqui.')) {
      await api.deleteWhatsappConnection(id);
      loadConnections();
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <MessageSquare className="color-primary" size={28} />
            Conexões WhatsApp
          </h2>
          <p style={{ opacity: 0.6, marginTop: '0.25rem' }}>
            Gerencie as instâncias de WhatsApp da empresa e dos vendedores.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {activeTab === 'templates' && connections.some(c => c.type === 'meta_official') && (
            <button 
              onClick={handleSyncTemplates}
              disabled={syncingTemplates}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '44px', padding: '0 1.5rem' }}
            >
              <RefreshCw size={18} style={{ animation: syncingTemplates ? 'spin 1s linear infinite' : 'none' }} />
              {syncingTemplates ? 'Sincronizando...' : 'Sincronizar com a Meta'}
            </button>
          )}
          <button 
            onClick={() => {
              if (activeTab === 'connections') {
                setEditingId(null);
                setFormData({ name: '', type: 'evolution_api', isDefault: false });
                setShowModal(true);
              } else {
                openTemplateModal();
              }
            }}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '44px', padding: '0 1.5rem' }}
          >
            <Plus size={18} />
            {activeTab === 'connections' ? 'Nova Conexão' : 'Cadastrar Modelo'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
        <button 
          onClick={() => setActiveTab('connections')}
          style={{ 
            padding: '1rem 0.5rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'connections' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'connections' ? 'var(--primary)' : 'inherit',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Conexões WhatsApp
        </button>
        <button 
          onClick={() => setActiveTab('templates')}
          style={{ 
            padding: '1rem 0.5rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'templates' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'templates' ? 'var(--primary)' : 'inherit',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Modelos de Mensagem (Templates)
        </button>
      </div>

      {activeTab === 'connections' ? (
        <>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
              <RefreshCw style={{ animation: 'spin 1s linear infinite', opacity: 0.4 }} size={32} />
            </div>
          ) : connections.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--background)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Smartphone style={{ opacity: 0.4 }} size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Nenhuma conexão encontrada</h3>
              <p style={{ opacity: 0.6, marginBottom: '2rem', maxWidth: '400px' }}>
                Adicione uma conexão da API Oficial da Meta ou da Evolution API para começar a receber mensagens.
              </p>
              <button 
                onClick={() => setShowModal(true)}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '44px' }}
              >
                <Plus size={18} />
                Adicionar Primeiro WhatsApp
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {connections.map((conn) => (
                <div key={conn.id} className="card" style={{ position: 'relative', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                  {conn.isDefault && (
                    <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--primary)', color: 'white', fontSize: '0.7rem', padding: '0.25rem 0.75rem', borderBottomLeftRadius: '8px', fontWeight: 600 }}>
                      Principal
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ 
                      width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: conn.type === 'meta_official' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: conn.type === 'meta_official' ? '#3b82f6' : '#10b981'
                    }}>
                      {conn.type === 'meta_official' ? <ShieldCheck size={24} /> : <Zap size={24} />}
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>{conn.name}</h3>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {conn.type === 'meta_official' ? 'API Oficial Meta' : 'Evolution API'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                      <span style={{ opacity: 0.6 }}>Status</span>
                      {conn.status === 'connected' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontWeight: 600 }}>
                          <CheckCircle2 size={16} /> Conectado
                        </span>
                      ) : conn.status === 'pending' || conn.status === 'qr_code_ready' ? (
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => fetchQrCode(conn.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <MessageSquare size={16} /> Gerar QR Code
                        </button>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444', fontWeight: 600 }}>
                          <XCircle size={16} /> Desconectado
                        </span>
                      )}
                    </div>
                    
                    {conn.type === 'evolution_api' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                        <span style={{ opacity: 0.6 }}>Instância</span>
                        <span style={{ fontFamily: 'monospace', background: 'var(--background)', padding: '2px 6px', borderRadius: '4px' }}>
                          {conn.evolutionInstanceName || 'N/A'}
                        </span>
                      </div>
                    )}
                    
                    {conn.type === 'meta_official' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                        <span style={{ opacity: 0.6 }}>ID do Telefone</span>
                        <span style={{ fontFamily: 'monospace', background: 'var(--background)', padding: '2px 6px', borderRadius: '4px' }}>
                          {conn.metaPhoneNumberId || 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                    {conn.type === 'evolution_api' && conn.status !== 'connected' && (
                      <button onClick={() => fetchQrCode(conn.id)} className="btn btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '36px', fontSize: '0.875rem' }}>
                        <QrCode size={16} /> Ver QR Code
                      </button>
                    )}
                    {conn.status === 'connected' && (
                      <button 
                        onClick={() => {
                          setTestData({ ...testData, connectionId: conn.id, phone: '' });
                          setShowTestModal(true);
                        }} 
                        className="btn btn-outline" 
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '36px', fontSize: '0.875rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                      >
                        <Zap size={16} /> Testar Envio
                      </button>
                    )}
                    {conn.status === 'connected' && (
                      <button 
                        onClick={() => handleDisconnect(conn)}
                        className="btn btn-outline" 
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '36px', fontSize: '0.875rem', borderColor: '#ef4444', color: '#ef4444' }}
                        title="Desconectar"
                      >
                        <LogOut size={16} /> Sair
                      </button>
                    )}
                    <button 
                      onClick={() => handleEdit(conn)}
                      className="btn-outline"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', padding: 0 }}
                      title="Editar conexão"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(conn.id)}
                      className="btn-outline"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', padding: 0, color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                      title="Excluir conexão"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'grid', gap: '2rem' }}>
          {/* Guia para o Usuário */}
          <div className="card" style={{ background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} /> Como configurar seus modelos na Meta?
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
               <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                 <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>1. Acesse o Business Suite</p>
                 <p>Vá em <a href="https://business.facebook.com/" target="_blank" style={{ color: 'var(--primary)', fontWeight: 600 }}>Gerenciador de Negócios</a> &gt; Configurações &gt; WhatsApp Manager.</p>
               </div>
               <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                 <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>2. Crie seu Template</p>
                 <p>Clique em "Modelos de Mensagem" e crie seu modelo. Use variáveis como <strong>{"{{1}}"}</strong> para o nome do cliente.</p>
               </div>
               <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                 <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>3. Cadastre aqui no CRM</p>
                 <p>Assim que a Meta aprovar, copie o <strong>Nome de Referência</strong> e cole no formulário abaixo.</p>
               </div>
            </div>
          </div>

          {/* Lista de Templates */}
          {templates.length === 0 ? (
             <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
               <p style={{ opacity: 0.5 }}>Nenhum modelo cadastrado. Use o botão acima para adicionar.</p>
             </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {templates.map(tpl => (
                <div key={tpl.id} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{tpl.name}</h4>
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                          {tpl.category} • {tpl.language}
                        </span>
                        {tpl.status === 'APPROVED' || tpl.status === 'approved' ? (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                            Aprovado
                          </span>
                        ) : tpl.status === 'PENDING' || tpl.status === 'pending' ? (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                            Pendente
                          </span>
                        ) : tpl.status === 'REJECTED' || tpl.status === 'rejected' ? (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                            Rejeitado
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', background: 'rgba(107, 114, 128, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                            Modelo Local
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => openTemplateModal(tpl)} className="btn-outline" style={{ width: '32px', height: '32px', padding: 0 }}><Pencil size={14}/></button>
                      <button onClick={() => handleDeleteTemplate(tpl.id)} className="btn-outline" style={{ width: '32px', height: '32px', padding: 0, color: 'var(--danger)' }}><Trash2 size={14}/></button>
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', whiteSpace: 'pre-wrap', border: '1px solid #e2e8f0' }}>
                    {tpl.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL NOVA CONEXÃO */}
      {showModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' 
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
                {editingId ? 'Editar Conexão' : 'Nova Conexão WhatsApp'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Nome de Identificação</label>
                <input 
                  type="text" 
                  required
                  className="btn-outline" 
                  style={{ width: '100%', height: '42px', padding: '0 1rem' }} 
                  placeholder="Ex: Vendas João, WhatsApp Principal..."
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Tipo de Integração</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <label style={{ 
                    border: formData.type === 'evolution_api' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: formData.type === 'evolution_api' ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                    borderRadius: '8px', padding: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', transition: 'all 0.2s'
                  }}>
                    <input 
                      type="radio" 
                      name="type" 
                      value="evolution_api" 
                      checked={formData.type === 'evolution_api'}
                      onChange={() => setFormData({...formData, type: 'evolution_api'})}
                      style={{ display: 'none' }}
                    />
                    <Zap size={20} style={{ color: formData.type === 'evolution_api' ? 'var(--primary)' : 'inherit', opacity: formData.type === 'evolution_api' ? 1 : 0.4 }} />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Evolution API</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '2px' }}>(Leitura de QR Code)</div>
                    </div>
                  </label>

                  <label style={{ 
                    border: formData.type === 'meta_official' ? '2px solid #3b82f6' : '1px solid var(--border)',
                    background: formData.type === 'meta_official' ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    borderRadius: '8px', padding: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', transition: 'all 0.2s'
                  }}>
                    <input 
                      type="radio" 
                      name="type" 
                      value="meta_official" 
                      checked={formData.type === 'meta_official'}
                      onChange={() => setFormData({...formData, type: 'meta_official'})}
                      style={{ display: 'none' }}
                    />
                    <ShieldCheck size={20} style={{ color: formData.type === 'meta_official' ? '#3b82f6' : 'inherit', opacity: formData.type === 'meta_official' ? 1 : 0.4 }} />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>API Oficial Meta</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '2px' }}>(Tokens Cloud API)</div>
                    </div>
                  </label>
                </div>
              </div>

              {formData.type === 'evolution_api' && (
                <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Nome da Instância (Evolution)</label>
                  <input 
                    type="text" 
                    required
                    className="btn-outline" 
                    style={{ width: '100%', height: '42px', padding: '0 1rem', fontFamily: 'monospace' }} 
                    placeholder="Ex: joao-vendas-01"
                    value={formData.evolutionInstanceName || ''}
                    onChange={e => setFormData({...formData, evolutionInstanceName: e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()})}
                  />
                  <p style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '0.5rem' }}>O nome da instância deve ter apenas letras, números e traços. Ex: suporte-01</p>
                </div>
              )}

              {formData.type === 'meta_official' && (
                <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>ID do Número de Telefone</label>
                    <input 
                      type="text" 
                      required
                      className="btn-outline" 
                      style={{ width: '100%', height: '42px', padding: '0 1rem', fontFamily: 'monospace' }} 
                      placeholder="Ex: 123456789012345"
                      value={formData.metaPhoneNumberId || ''}
                      onChange={e => setFormData({...formData, metaPhoneNumberId: e.target.value})}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Token de Acesso</label>
                    <textarea 
                      required
                      className="btn-outline" 
                      style={{ width: '100%', height: '80px', padding: '0.75rem 1rem', fontFamily: 'monospace', resize: 'none' }} 
                      placeholder="EAA..."
                      value={formData.metaAccessToken || ''}
                      onChange={e => setFormData({...formData, metaAccessToken: e.target.value})}
                    />
                  </div>
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  checked={formData.isDefault}
                  onChange={e => setFormData({...formData, isDefault: e.target.checked})}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Definir como número principal da empresa</span>
              </label>

              <div style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                  style={{ height: '42px' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ height: '42px' }}
                >
                  {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Conexão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL QR CODE EVOLUTION */}
      {showQrModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' 
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: 0, overflow: 'hidden', textAlign: 'center' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Escanear QR Code</h2>
              <button onClick={() => setShowQrModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
                <XCircle size={24} />
              </button>
            </div>
            
            <div style={{ padding: '2rem' }}>
              {qrCodeData.loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 0' }}>
                  <RefreshCw style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} size={40} />
                  <p style={{ opacity: 0.6, fontSize: '0.875rem' }}>Buscando QR Code na Evolution API...</p>
                </div>
              ) : qrCodeData.error ? (
                <div style={{ color: 'var(--danger)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                  <XCircle size={32} style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ fontWeight: 600 }}>{qrCodeData.error}</p>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Verifique se a URL da Evolution API está correta e se a instância existe.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {qrCodeData.mock && (
                    <div style={{ background: '#fef9c3', color: '#854d0e', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                      Modo Simulação: A API oficial não foi configurada.
                    </div>
                  )}
                  {qrCodeData.base64 ? (
                    <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                      <img 
                        src={qrCodeData.base64} 
                        alt="QR Code do WhatsApp" 
                        style={{ width: '250px', height: '250px', objectFit: 'contain' }} 
                      />
                    </div>
                  ) : qrCodeData.pairingCode ? (
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '1.5rem', border: '1px solid var(--border)', textAlign: 'center' }}>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>Código de Emparelhamento:</p>
                      <h2 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '4px', color: 'var(--primary)', margin: 0 }}>{qrCodeData.pairingCode}</h2>
                    </div>
                  ) : null}
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Conecte seu WhatsApp</h3>
                  <p style={{ fontSize: '0.875rem', opacity: 0.7, lineHeight: 1.5 }}>
                    1. Abra o WhatsApp no seu celular<br/>
                    2. Toque em Mais opções <MoreVertical size={12} style={{display:'inline'}}/> ou Configurações<br/>
                    3. Toque em <strong>Aparelhos conectados</strong><br/>
                    4. {qrCodeData.pairingCode ? 'Toque em "Conectar com número de telefone" e digite o código acima' : 'Aponte a câmera para esta tela'}
                  </p>
                </div>
              )}
            </div>
            
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--background)' }}>
               <button onClick={() => setShowQrModal(false)} className="btn btn-outline" style={{ width: '100%' }}>
                 Fechar
               </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TESTE DE ENVIO */}
      {showTestModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' 
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={18} />
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Teste Real de Conexão</h2>
              </div>
              <button onClick={() => setShowTestModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleTestMessage} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ fontSize: '0.875rem', opacity: 0.6, margin: 0 }}>
                Envie uma mensagem real para um número de WhatsApp para validar se a integração está ativa e configurada corretamente.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Número do WhatsApp (com DDD)</label>
                <input 
                  type="text" 
                  required
                  className="btn-outline" 
                  style={{ width: '100%', height: '44px', padding: '0 1rem' }} 
                  placeholder="Ex: 48999999999"
                  value={testData.phone}
                  onChange={e => setTestData({...testData, phone: e.target.value})}
                />
                <span style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '4px', display: 'block' }}>Não use espaços ou parênteses. Apenas números.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Mensagem de Teste</label>
                <textarea 
                  required
                  className="btn-outline" 
                  style={{ width: '100%', height: '100px', padding: '0.75rem 1rem', resize: 'none' }} 
                  value={testData.message}
                  onChange={e => setTestData({...testData, message: e.target.value})}
                />
              </div>

              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowTestModal(false)}
                  className="btn btn-outline"
                  style={{ flex: 1, height: '44px' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={testData.loading}
                  className="btn btn-primary"
                  style={{ flex: 2, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  {testData.loading ? (
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <>
                      <MessageSquare size={18} /> Enviar Teste Agora
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TEMPLATE (WIZARD KOMMO STYLE) */}
      {showTemplateModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' 
        }}>
          <div className="card" style={{ 
            width: '100%', 
            maxWidth: wizardStep === 1 ? '550px' : '1000px', 
            padding: 0, 
            display: 'flex', 
            flexDirection: 'column', 
            maxHeight: '90vh',
            transition: 'max-width 0.3s ease'
          }}>
            {/* Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)' }}>
              {wizardStep >= 2 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input 
                    type="text" 
                    value={templateFormData.name} 
                    onChange={e => setTemplateFormData({ ...templateFormData, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    style={{ border: 'none', background: 'transparent', fontSize: '1.25rem', fontWeight: 'bold', width: '350px', outline: 'none', borderBottom: '1px dashed var(--primary)' }}
                    title="Clique para editar o identificador do modelo"
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                    {wizardType === 'general' ? 'Modelo Geral' : 'WhatsApp Official'}
                  </span>
                </div>
              ) : (
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Selecione o tipo de modelo</h2>
              )}
              <button 
                onClick={() => setShowTemplateModal(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* Content Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {/* PASSO 1: Seleção de Tipo */}
              {wizardStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div 
                    onClick={() => {
                      setWizardType('general');
                      setTemplateFormData((prev: any) => ({ ...prev, category: 'GENERAL', status: 'LOCAL' }));
                      setWizardStep(2);
                    }}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.25rem',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(99, 102, 241, 0.02)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageSquare size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 4px 0' }}>Modelo geral</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>Automatize mensagens básicas em qualquer canal</p>
                    </div>
                  </div>

                  <div 
                    onClick={() => {
                      setWizardType('whatsapp');
                      setWizardStep(2);
                    }}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.25rem',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = 'rgba(16, 185, 129, 0.02)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 4px 0' }}>Modelo de WhatsApp</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>Inicie novos chats e envie transmissões no WhatsApp Oficial</p>
                    </div>
                  </div>
                </div>
              )}

              {/* PASSO 2 (Modelo Geral Editor) */}
              {wizardStep === 2 && wizardType === 'general' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
                  {/* Form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Anexo */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Anexo (opcional)</label>
                      <label style={{ 
                        border: '2px dashed var(--border)', 
                        borderRadius: '8px', 
                        padding: '1.5rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        cursor: 'pointer',
                        background: '#f8fafc'
                      }}>
                        <Upload size={24} style={{ color: '#64748b' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{isMediaUploading ? 'Carregando...' : 'Carregue ou arraste seu arquivo aqui'}</span>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setIsMediaUploading(true);
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setHeaderMediaUrl(event.target?.result as string);
                              setHeaderType('MEDIA');
                              setIsMediaUploading(false);
                            };
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </label>
                      {headerMediaUrl && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                          <img src={headerMediaUrl} style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                          <button type="button" onClick={() => { setHeaderMediaUrl(''); setHeaderType('NONE'); }} className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>Remover</button>
                        </div>
                      )}
                    </div>

                    {/* Corpo */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Texto</label>
                      <textarea
                        className="btn-outline"
                        style={{ width: '100%', height: '150px', padding: '1rem', resize: 'none' }}
                        placeholder="Digite o texto da sua mensagem aqui..."
                        value={templateFormData.content}
                        onChange={e => setTemplateFormData({ ...templateFormData, content: e.target.value })}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button 
                          type="button" 
                          onClick={() => setTemplateFormData((prev: any) => ({ ...prev, content: (prev.content || '') + ' {{nome}}' }))}
                          className="btn-outline" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          [-..] Nome do Lead
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setTemplateFormData((prev: any) => ({ ...prev, content: (prev.content || '') + ' 🚀' }))}
                          className="btn-outline" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          🚀
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setTemplateFormData((prev: any) => ({ ...prev, content: (prev.content || '') + ' 🔥' }))}
                          className="btn-outline" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          🔥
                        </button>
                      </div>
                    </div>

                    {/* Botões */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Botões (opcional)</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" onClick={() => {
                          if (buttons.length >= 3) {
                            alert('Máximo de 3 botões atingido.');
                            return;
                          }
                          setButtons([...buttons, { type: 'QUICK_REPLY', text: 'Resposta rápida' }]);
                        }} className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>+ Resposta rápida</button>
                        <button type="button" onClick={() => {
                          if (buttons.length >= 3) {
                            alert('Máximo de 3 botões atingido.');
                            return;
                          }
                          setButtons([...buttons, { type: 'URL', text: 'Comprar agora', url: 'https://' }]);
                        }} className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>+ Chamada para ação</button>
                      </div>

                      {buttons.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                          {buttons.map((btn, index) => (
                            <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{btn.type === 'QUICK_REPLY' ? 'Resp. Rápida' : 'Link/Ação'}</span>
                              <input 
                                type="text" 
                                value={btn.text} 
                                onChange={e => {
                                  const list = [...buttons];
                                  list[index].text = e.target.value;
                                  setButtons(list);
                                }}
                                placeholder="Texto do botão"
                                style={{ flex: 1, height: '32px', padding: '0 8px', borderRadius: '4px', border: '1px solid var(--border)' }}
                              />
                              {btn.type === 'URL' && (
                                <input 
                                  type="text" 
                                  value={btn.url || ''} 
                                  onChange={e => {
                                    const list = [...buttons];
                                    list[index].url = e.target.value;
                                    setButtons(list);
                                  }}
                                  placeholder="https://exemplo.com"
                                  style={{ flex: 1, height: '32px', padding: '0 8px', borderRadius: '4px', border: '1px solid var(--border)' }}
                                />
                              )}
                              <button type="button" onClick={() => setButtons(buttons.filter((_, i) => i !== index))} className="btn btn-outline" style={{ color: 'var(--danger)', padding: '0.2rem 0.5rem' }}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preview */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>Pré-visualização</div>
                    {/* Mockup Celular */}
                    <div style={{
                      width: '300px', height: '520px', background: '#0b141a', borderRadius: '32px', border: '10px solid #222e35',
                      display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative'
                    }}>
                      <div style={{ height: '20px', background: '#222e35', color: '#aebac1', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', padding: '0 1rem', alignItems: 'center' }}>
                        <span>15:16</span>
                        <span>📶 🔋</span>
                      </div>
                      <div style={{
                        flex: 1, backgroundImage: 'url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)',
                        backgroundSize: 'cover', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'
                      }}>
                        {/* Bubble */}
                        <div style={{
                          backgroundColor: '#202c33', color: '#e9edef', padding: '8px', borderRadius: '8px', width: '240px',
                          alignSelf: 'flex-start', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px'
                        }}>
                          {headerMediaUrl && (
                            <img src={headerMediaUrl} style={{ width: '100%', maxHeight: '110px', objectFit: 'cover', borderRadius: '6px' }} />
                          )}
                          <div style={{ whiteSpace: 'pre-wrap' }}>{templateFormData.content || 'Digite o texto...'}</div>
                          <div style={{ fontSize: '0.6rem', color: '#8696a0', alignSelf: 'flex-end' }}>15:16 ✓✓</div>
                        </div>
                        {/* Buttons in Mockup */}
                        {buttons.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '240px' }}>
                            {buttons.map((btn, i) => (
                              <div key={i} style={{ background: '#202c33', color: '#00a884', textAlign: 'center', padding: '6px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                                {btn.text || 'Botão'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PASSO 2 (WhatsApp Categoria Select) */}
              {wizardStep === 2 && wizardType === 'whatsapp' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
                  {/* Categorias */}
                  <div>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                      <button 
                        type="button" 
                        onClick={() => setWabaCategoryTab('MARKETING')} 
                        style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: wabaCategoryTab === 'MARKETING' ? '3px solid var(--primary)' : '3px solid transparent', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Marketing
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setWabaCategoryTab('UTILITY')} 
                        style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: wabaCategoryTab === 'UTILITY' ? '3px solid var(--primary)' : '3px solid transparent', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Utilidade
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <p style={{ fontSize: '0.85rem', opacity: 0.6, margin: 0 }}>
                        {wabaCategoryTab === 'MARKETING' 
                          ? 'Para mensagens promocionais, como ofertas especiais, descontos ou anúncios de novos produtos.'
                          : 'Para mensagens que mantêm os clientes informados, como atualizações de pedidos, alertas de transação ou lembretes.'
                        }
                      </p>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px', cursor: 'pointer' }}>
                        <input type="radio" checked={wabaSubtype === 'customizado'} onChange={() => setWabaSubtype('customizado')} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Customizado</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Compartilhe mensagens com cabeçalho de mídia, rodapés e botões de chamada rápida.</div>
                        </div>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px', opacity: 0.5, cursor: 'not-allowed' }}>
                        <input type="radio" disabled />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Carrossel</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Exiba seus produtos em cartões deslizantes de forma interativa.</div>
                        </div>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px', opacity: 0.5, cursor: 'not-allowed' }}>
                        <input type="radio" disabled />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Catálogo / Flows</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Conecte um catálogo de vendas do WhatsApp oficial para enviar ofertas nativas.</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Preview da Categoria */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                      width: '300px', height: '520px', background: '#0b141a', borderRadius: '32px', border: '10px solid #222e35',
                      display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative'
                    }}>
                      <div style={{ height: '20px', background: '#222e35', color: '#aebac1', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', padding: '0 1rem', alignItems: 'center' }}>
                        <span>15:16</span>
                        <span>📶 🔋</span>
                      </div>
                      <div style={{
                        flex: 1, backgroundImage: 'url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)',
                        backgroundSize: 'cover', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'
                      }}>
                        {/* Bubble */}
                        <div style={{
                          backgroundColor: '#202c33', color: '#e9edef', padding: '8px', borderRadius: '8px', maxWidth: '85%',
                          alignSelf: 'flex-start', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px'
                        }}>
                          <img src="https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=300&q=80" style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px' }} />
                          <div style={{ fontWeight: 'bold' }}>Olá, Maria! 👋</div>
                          <div>Descubra nossa nova coleção exclusiva!</div>
                          <div style={{ fontSize: '0.7rem', color: '#8696a0' }}>Use o cupom NOVOS10.</div>
                        </div>
                        <div style={{ background: '#202c33', color: '#00a884', textAlign: 'center', padding: '6px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, maxWidth: '85%' }}>
                          🔗 Comprar Agora
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PASSO 3 (WhatsApp Editor) */}
              {wizardStep === 3 && wizardType === 'whatsapp' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
                  {/* Editor Form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* WABA select */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Conexão WhatsApp Oficial</label>
                      <select
                        required
                        className="btn-outline"
                        style={{ width: '100%', height: '42px', padding: '0 1rem', background: '#ffffff' }}
                        value={templateFormData.connectionId}
                        onChange={e => setTemplateFormData({ ...templateFormData, connectionId: e.target.value })}
                      >
                        <option value="">Selecione uma conta...</option>
                        {connections.filter(c => c.type === 'meta_official').map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {/* Idioma */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Idioma</label>
                        <select
                          className="btn-outline"
                          style={{ width: '100%', height: '42px', padding: '0 1rem', background: '#ffffff' }}
                          value={templateFormData.language}
                          onChange={e => setTemplateFormData({ ...templateFormData, language: e.target.value })}
                        >
                          <option value="pt_BR">Português (Brasil)</option>
                          <option value="en_US">Inglês (EUA)</option>
                          <option value="es_ES">Espanhol (Espanha)</option>
                        </select>
                      </div>

                      {/* Cabeçalho */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Cabeçalho (Opcional)</label>
                        <select
                          className="btn-outline"
                          style={{ width: '100%', height: '42px', padding: '0 1rem', background: '#ffffff' }}
                          value={headerType}
                          onChange={e => {
                            setHeaderType(e.target.value as any);
                            setHeaderText('');
                            setHeaderMediaUrl('');
                          }}
                        >
                          <option value="NONE">Sem cabeçalho</option>
                          <option value="TEXT">Texto</option>
                          <option value="MEDIA">Mídia (Imagem)</option>
                        </select>
                      </div>
                    </div>

                    {headerType === 'TEXT' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Texto do Cabeçalho</label>
                        <input 
                          type="text"
                          className="btn-outline"
                          placeholder="Ex: Olá, cliente!"
                          value={headerText}
                          onChange={e => setHeaderText(e.target.value)}
                          style={{ width: '100%', height: '40px', padding: '0 1rem' }}
                        />
                      </div>
                    )}

                    {headerType === 'MEDIA' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Imagem do Cabeçalho</label>
                        <label style={{ 
                          border: '2px dashed var(--border)', 
                          borderRadius: '8px', 
                          padding: '1rem', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          cursor: 'pointer',
                          background: '#f8fafc'
                        }}>
                          <Upload size={20} style={{ color: '#64748b' }} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Fazer upload da imagem</span>
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setIsMediaUploading(true);
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setHeaderMediaUrl(event.target?.result as string);
                                setIsMediaUploading(false);
                              };
                              reader.readAsDataURL(file);
                            }
                          }} />
                        </label>
                        {headerMediaUrl && (
                          <img src={headerMediaUrl} style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '4px', marginTop: '0.5rem' }} />
                        )}
                      </div>
                    )}

                    {/* Corpo */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Corpo do texto</label>
                        <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{(templateFormData.content || '').length}/1024</span>
                      </div>
                      <textarea
                        className="btn-outline"
                        style={{ width: '100%', height: '120px', padding: '1rem', resize: 'none' }}
                        maxLength={1024}
                        placeholder="Digite o texto da sua mensagem aqui..."
                        value={templateFormData.content}
                        onChange={e => setTemplateFormData({ ...templateFormData, content: e.target.value })}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button type="button" onClick={() => setTemplateFormData((prev: any) => ({ ...prev, content: (prev.content || '') + ' {{1}}' }))} className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>{"{}"} Variável</button>
                        <button type="button" onClick={() => setTemplateFormData((prev: any) => ({ ...prev, content: `*${prev.content || ''}*` }))} className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem', fontWeight: 'bold' }}>B</button>
                        <button type="button" onClick={() => setTemplateFormData((prev: any) => ({ ...prev, content: `_${prev.content || ''}_` }))} className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem', fontStyle: 'italic' }}>I</button>
                        <button type="button" onClick={() => setTemplateFormData((prev: any) => ({ ...prev, content: (prev.content || '') + ' 😊' }))} className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>😊</button>
                      </div>
                    </div>

                    {/* Rodapé */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Rodapé (Opcional)</label>
                        <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{footerText.length}/60</span>
                      </div>
                      <input 
                        type="text"
                        className="btn-outline"
                        maxLength={60}
                        placeholder="Ex: Mensagem automática de vendas"
                        value={footerText}
                        onChange={e => setFooterText(e.target.value)}
                        style={{ width: '100%', height: '40px', padding: '0 1rem' }}
                      />
                    </div>

                    {/* Botões */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Botões (Opcional)</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" onClick={() => {
                          if (buttons.length >= 3) {
                            alert('Máximo de 3 botões.');
                            return;
                          }
                          setButtons([...buttons, { type: 'QUICK_REPLY', text: 'Responda aqui' }]);
                        }} className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>+ Resposta rápida</button>
                        <button type="button" onClick={() => {
                          if (buttons.length >= 3) {
                            alert('Máximo de 3 botões.');
                            return;
                          }
                          setButtons([...buttons, { type: 'URL', text: 'Link Externo', url: 'https://' }]);
                        }} className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>+ Chamada para ação</button>
                      </div>

                      {buttons.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                          {buttons.map((btn, index) => (
                            <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{btn.type === 'QUICK_REPLY' ? 'Resp. Rápida' : 'Link'}</span>
                              <input 
                                type="text" 
                                value={btn.text} 
                                onChange={e => {
                                  const list = [...buttons];
                                  list[index].text = e.target.value;
                                  setButtons(list);
                                }}
                                placeholder="Texto do botão"
                                style={{ flex: 1, height: '32px', padding: '0 8px', borderRadius: '4px', border: '1px solid var(--border)' }}
                              />
                              {btn.type === 'URL' && (
                                <input 
                                  type="text" 
                                  value={btn.url || ''} 
                                  onChange={e => {
                                    const list = [...buttons];
                                    list[index].url = e.target.value;
                                    setButtons(list);
                                  }}
                                  placeholder="https://exemplo.com"
                                  style={{ flex: 1, height: '32px', padding: '0 8px', borderRadius: '4px', border: '1px solid var(--border)' }}
                                />
                              )}
                              <button type="button" onClick={() => setButtons(buttons.filter((_, i) => i !== index))} className="btn btn-outline" style={{ color: 'var(--danger)', padding: '0.2rem 0.5rem' }}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Preview */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>Visualização do WhatsApp</div>
                    <div style={{
                      width: '300px', height: '520px', background: '#0b141a', borderRadius: '32px', border: '10px solid #222e35',
                      display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative'
                    }}>
                      <div style={{ height: '20px', background: '#222e35', color: '#aebac1', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', padding: '0 1rem', alignItems: 'center' }}>
                        <span>15:16</span>
                        <span>📶 🔋</span>
                      </div>
                      <div style={{
                        flex: 1, backgroundImage: 'url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)',
                        backgroundSize: 'cover', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'
                      }}>
                        {/* Bubble */}
                        <div style={{
                          backgroundColor: '#202c33', color: '#e9edef', padding: '8px', borderRadius: '8px', width: '240px',
                          alignSelf: 'flex-start', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px'
                        }}>
                          {headerType === 'TEXT' && headerText && (
                            <div style={{ fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2px', marginBottom: '2px' }}>{headerText}</div>
                          )}
                          {headerType === 'MEDIA' && headerMediaUrl && (
                            <img src={headerMediaUrl} style={{ width: '100%', maxHeight: '110px', objectFit: 'cover', borderRadius: '6px' }} />
                          )}
                          <div style={{ whiteSpace: 'pre-wrap' }}>{templateFormData.content || 'Digite o texto...'}</div>
                          {footerText && (
                            <div style={{ fontSize: '0.7rem', color: '#8696a0', marginTop: '2px' }}>{footerText}</div>
                          )}
                          <div style={{ fontSize: '0.6rem', color: '#8696a0', alignSelf: 'flex-end' }}>15:16 ✓✓</div>
                        </div>
                        {/* Buttons in Mockup */}
                        {buttons.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '240px' }}>
                            {buttons.map((btn, i) => (
                              <div key={i} style={{ background: '#202c33', color: '#00a884', textAlign: 'center', padding: '6px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                                {btn.text || 'Botão'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => {
                  if (wizardStep === 1) {
                    setShowTemplateModal(false);
                  } else {
                    setWizardStep(prev => prev - 1);
                  }
                }}
              >
                {wizardStep === 1 ? 'Cancelar' : 'Voltar'}
              </button>

              {wizardStep === 2 && wizardType === 'whatsapp' && (
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => setWizardStep(3)}
                >
                  Próximo
                </button>
              )}

              {((wizardStep === 2 && wizardType === 'general') || (wizardStep === 3 && wizardType === 'whatsapp')) && (
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  disabled={saving || !templateFormData.name}
                  onClick={() => handleSaveTemplate()}
                >
                  {saving ? 'Salvando...' : wizardType === 'general' ? 'Salvar Modelo' : 'Enviar para Análise'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          zIndex: 9999,
          animation: 'slideUp 0.3s ease-out'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{toast.message}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8, marginLeft: '0.5rem' }}>
            <XCircle size={16} />
          </button>
        </div>
      )}
      
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
