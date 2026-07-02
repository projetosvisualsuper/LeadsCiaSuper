'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { PopupConfig, PopupTrigger, PopupTemplate, LandingPageInstance } from '@/types/crm';
import { 
  Plus, 
  Trash2, 
  Edit, 
  ToggleLeft, 
  ToggleRight, 
  MousePointer2, 
  Timer, 
  ArrowDownCircle,
  Eye,
  X,
  Image as ImageIcon,
  Save,
  Globe,
  Layout,
  Type,
  Ticket,
  PanelLeft,
  Upload,
  CreditCard,
  PanelRight,
  FormInput,
  Code,
  Copy,
  Check
} from 'lucide-react';

export default function PopupsPage() {
  const [popups, setPopups] = useState<PopupConfig[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPageInstance[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<PopupConfig | null>(null);
  const [selectedPopup, setSelectedPopup] = useState<PopupConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompressing, setIsCompressing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<PopupConfig>>({
    name: '',
    templateId: 'simple',
    title: '',
    subtitle: '',
    imageUrl: '',
    buttonText: 'Quero aproveitar!',
    buttonLink: '',
    couponCode: '',
    trigger: 'timer',
    triggerValue: 5,
    isActive: true,
    pages: [],
    theme: {
      backgroundColor: '#ffffff',
      textColor: '#1e293b',
      buttonColor: '#3b82f6',
      buttonTextColor: '#ffffff',
      overlayColor: 'rgba(0,0,0,0.5)'
    }
  });

  const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/webp', quality));
        };
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file, 800, 600, 0.6);
      setFormData(prev => ({ ...prev, imageUrl: compressed }));
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      alert('Erro ao processar imagem. Tente outro arquivo.');
    } finally {
      setIsCompressing(false);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const [popupsData, lpData] = await Promise.all([
        api.getPopups(),
        api.getLandingPages()
      ]);
      setPopups(popupsData);
      setLandingPages(lpData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const openModal = (popup?: PopupConfig) => {
    if (popup) {
      setEditingPopup(popup);
      setFormData({ ...popup });
    } else {
      setEditingPopup(null);
      setFormData({
        name: '',
        templateId: 'simple',
        title: '',
        subtitle: '',
        imageUrl: '',
        buttonText: 'Quero aproveitar!',
        buttonLink: '',
        couponCode: '',
        trigger: 'timer',
        triggerValue: 5,
        isActive: true,
        pages: [],
        theme: {
          backgroundColor: '#ffffff',
          textColor: '#1e293b',
          buttonColor: '#3b82f6',
          buttonTextColor: '#ffffff',
          overlayColor: 'rgba(0,0,0,0.5)'
        }
      });
    }
    setIsModalOpen(true);
  };

  const openIntegrationModal = (popup: PopupConfig) => {
    setSelectedPopup(popup);
    setIsIntegrationModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.title || !formData.buttonText) {
      alert('Preencha os campos obrigatórios (Nome, Título e Texto do Botão)');
      return;
    }

    const popup: PopupConfig = {
      id: editingPopup?.id || Math.random().toString(36).substr(2, 9),
      name: formData.name!,
      templateId: (formData.templateId as PopupTemplate) || 'simple',
      title: formData.title!,
      subtitle: formData.subtitle || '',
      imageUrl: formData.imageUrl || '',
      buttonText: formData.buttonText!,
      buttonLink: formData.buttonLink || '',
      couponCode: formData.couponCode || '',
      trigger: formData.trigger as PopupTrigger,
      triggerValue: Number(formData.triggerValue) || 0,
      isActive: formData.isActive ?? true,
      dataCriacao: editingPopup?.dataCriacao || new Date().toISOString(),
      pages: (formData.pages || [])
        .map(p => p.trim())
        .filter(p => p !== ''),
      theme: formData.theme as any
    };

    await api.savePopup(popup);
    setIsModalOpen(false);
    refreshData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este pop-up?')) {
      await api.deletePopup(id);
      refreshData();
    }
  };

  const toggleActive = async (popup: PopupConfig) => {
    const updated = { ...popup, isActive: !popup.isActive };
    await api.savePopup(updated);
    refreshData();
  };

  const getTriggerText = (popup: PopupConfig) => {
    switch (popup.trigger) {
      case 'timer': return `Após ${popup.triggerValue}s`;
      case 'exit-intent': return 'Intenção de Saída';
      case 'scroll': return `${popup.triggerValue}% de Rolagem`;
      default: return '';
    }
  };

  const getTemplateIcon = (template: PopupTemplate) => {
    switch (template) {
      case 'simple': return <Type size={18} />;
      case 'image-left': return <PanelLeft size={18} />;
      case 'image-right': return <PanelRight size={18} />;
      case 'image-top': return <Layout size={18} />;
      case 'lead-form': return <Edit size={18} />;
      case 'coupon': return <Ticket size={18} />;
      case 'horizontal-banner': return <CreditCard size={18} />;
      case 'image-form-left': return <FormInput size={18} />;
      case 'image-form-right': return <FormInput size={18} />;
      default: return <Layout size={18} />;
    }
  };

  const getIntegrationCode = (id: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `<script src="${baseUrl}/api/popup/${id}"></script>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && popups.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid var(--accent)', borderTopColor: 'var(--primary)', borderRadius: '50%' }}></div>
      </div>
    );
  }

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Pop-ups Inteligentes</h2>
          <p style={{ opacity: 0.6 }}>Escolha entre diversos modelos profissionais de conversão.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={20} /> Novo Pop-up
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {popups.map(popup => (
          <div key={popup.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{popup.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6, fontSize: '0.875rem' }}>
                  {getTemplateIcon(popup.templateId || 'simple')} 
                  <span>{popup.templateId || 'simple'}</span>
                </div>
              </div>
              <button 
                onClick={() => toggleActive(popup)}
                style={{ color: popup.isActive ? 'var(--success)' : 'var(--danger)', opacity: 0.8 }}
              >
                {popup.isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
              </button>
            </div>

            <div style={{ 
              background: 'var(--background)', 
              borderRadius: 'var(--radius)', 
              padding: '1rem', 
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 'bold', opacity: 0.4, textTransform: 'uppercase' }}>Preview do Título</p>
              <p style={{ fontWeight: 600, color: popup.theme?.textColor }}>{popup.title}</p>
              {popup.subtitle && <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>{popup.subtitle}</p>}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge" style={{ fontSize: '0.75rem' }}>{getTriggerText(popup)}</span>
              <span className="badge" style={{ fontSize: '0.75rem' }}><Globe size={14} /> {(!popup.pages || popup.pages.length === 0 || (popup.pages.length === 1 && popup.pages[0] === '')) ? 'Todas as Páginas' : 'Páginas Customizadas'}</span>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', color: 'var(--primary)' }} onClick={() => openIntegrationModal(popup)}>
                <Code size={16} /> Código
              </button>
              <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem' }} onClick={() => openModal(popup)}>
                <Edit size={16} /> Editar
              </button>
              <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', color: 'var(--danger)' }} onClick={() => handleDelete(popup.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE INTEGRAÇÃO */}
      {isIntegrationModalOpen && selectedPopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div className="card" style={{ width: '600px', maxWidth: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>Instalação em Sites Externos</h3>
              <button onClick={() => setIsIntegrationModalOpen(false)}><X size={24} /></button>
            </div>
            
            <p style={{ marginBottom: '1rem', opacity: 0.7 }}>Copie o código abaixo e cole no seu site (antes da tag <code>&lt;/body&gt;</code>) para exibir este pop-up.</p>
            
            <div style={{ background: '#1e293b', color: '#f8fafc', padding: '1.5rem', borderRadius: '12px', position: 'relative', marginBottom: '1.5rem', fontFamily: 'monospace', fontSize: '0.875rem', overflowX: 'auto' }}>
              <code>{getIntegrationCode(selectedPopup.id)}</code>
              <button 
                onClick={() => copyToClipboard(getIntegrationCode(selectedPopup.id))}
                style={{ position: 'absolute', right: '10px', top: '10px', background: 'rgba(255,255,255,0.1)', padding: '5px', borderRadius: '5px' }}
              >
                {copied ? <Check size={18} color="var(--success)" /> : <Copy size={18} />}
              </button>
            </div>
            
            <div style={{ padding: '1rem', borderRadius: '8px', background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', fontSize: '0.875rem' }}>
              <strong>Dica:</strong> Você pode usar este código em sites WordPress, Wix, HTML puro ou qualquer outra plataforma.
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-primary" onClick={() => setIsIntegrationModalOpen(false)}>Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '1200px', maxWidth: '95vw', maxHeight: '95vh', overflowY: 'auto', padding: 0 }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
              <h3 style={{ fontWeight: 'bold' }}>{editingPopup ? 'Editar Pop-up' : 'Novo Pop-up'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>

            <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '3rem' }}>
              {/* Coluna 1: Configurações */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Nome Interno</label>
                    <input 
                      type="text" className="btn-outline" style={{ width: '100%' }} 
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: Promoção de Natal"
                    />
                  </div>
                  <div>
                    <label className="label">Modelo (Template)</label>
                    <select 
                      className="btn-outline" style={{ width: '100%' }}
                      value={formData.templateId} onChange={e => setFormData({...formData, templateId: e.target.value as PopupTemplate})}
                    >
                      <option value="simple">Simples (Texto + CTA)</option>
                      <option value="image-top">Imagem no Topo</option>
                      <option value="image-left">Imagem à Esquerda</option>
                      <option value="image-right">Imagem à Direita</option>
                      <option value="lead-form">Formulário (Central)</option>
                      <option value="image-form-left">Imagem Esq + Formulário</option>
                      <option value="image-form-right">Formulário + Imagem Dir</option>
                      <option value="horizontal-banner">Banner Horizontal</option>
                      <option value="coupon">Cupom de Desconto</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Gatilho (Trigger)</label>
                    <select 
                      className="btn-outline" style={{ width: '100%' }}
                      value={formData.trigger} onChange={e => setFormData({...formData, trigger: e.target.value as PopupTrigger})}
                    >
                      <option value="timer">Tempo na página</option>
                      <option value="exit-intent">Intenção de saída</option>
                      <option value="scroll">Porcentagem de rolagem</option>
                    </select>
                  </div>
                  {(formData.trigger === 'timer' || formData.trigger === 'scroll') && (
                    <div>
                      <label className="label">{formData.trigger === 'timer' ? 'Segundos' : 'Porcentagem (%)'}</label>
                      <input 
                        type="number" className="btn-outline" style={{ width: '100%' }}
                        value={formData.triggerValue} onChange={e => setFormData({...formData, triggerValue: Number(e.target.value)})}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="label">Título do Pop-up</label>
                  <input 
                    type="text" className="btn-outline" style={{ width: '100%' }} 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div>
                  <label className="label">Subtítulo / Descrição</label>
                  <textarea 
                    className="btn-outline" style={{ width: '100%', height: '80px', padding: '0.75rem' }} 
                    value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Texto do Botão</label>
                    <input 
                      type="text" className="btn-outline" style={{ width: '100%' }} 
                      value={formData.buttonText} onChange={e => setFormData({...formData, buttonText: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="label">Link do Botão</label>
                    <input 
                      type="text" className="btn-outline" style={{ width: '100%' }} 
                      value={formData.buttonLink} onChange={e => setFormData({...formData, buttonLink: e.target.value || ''})}
                    />
                  </div>
                </div>

                <div style={{ background: 'rgba(251, 191, 36, 0.05)', padding: '1.25rem', borderRadius: '8px', border: '1px dashed #fbbf24' }}>
                   <div style={{ display: 'grid', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block', color: '#b45309', fontWeight: 600 }}>Código do Cupom</label>
                        <input 
                          className="btn-outline" style={{ width: '100%', height: '42px', padding: '0 1rem', background: 'white', textTransform: 'uppercase', fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '1px' }}
                          placeholder="EX: PROMO10"
                          value={formData.couponCode || ''}
                          onChange={e => setFormData({...formData, couponCode: e.target.value.toUpperCase()})}
                        />
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input 
                          type="checkbox" 
                          style={{ width: '18px', height: '18px' }}
                          checked={formData.theme?.sendCouponEmail || false}
                          onChange={e => setFormData({
                            ...formData, 
                            theme: {
                              ...formData.theme,
                              sendCouponEmail: e.target.checked
                            }
                          })}
                        />
                        <span>Enviar código automaticamente por e-mail</span>
                      </label>
                   </div>
                </div>

                {formData.templateId !== 'simple' && formData.templateId !== 'lead-form' && (
                  <div>
                    <label className="label">Imagem do Pop-up</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <label className="btn btn-outline" style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <Upload size={18} /> {isCompressing ? 'Processando...' : 'Fazer Upload'}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                      </label>
                      {formData.imageUrl && <img src={formData.imageUrl} style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />}
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">Onde exibir o pop-up?</label>
                  <select 
                    className="btn-outline" style={{ width: '100%', marginBottom: '1rem', background: 'white' }}
                    value={!formData.pages || formData.pages.length === 0 || (formData.pages.length === 1 && formData.pages[0] === '') ? 'all' : 'custom'} 
                    onChange={e => {
                      if (e.target.value === 'all') {
                        setFormData({ ...formData, pages: [] });
                      } else {
                        setFormData({ ...formData, pages: [''] });
                      }
                    }}
                  >
                    <option value="all">Todas as páginas (onde o script estiver instalado)</option>
                    <option value="custom">Páginas específicas (URLs ou caminhos indicados)</option>
                  </select>
                  
                  {formData.pages && formData.pages.length > 0 && (
                    <div>
                      <label className="label">URLs ou Caminhos Permitidos (um por linha)</label>
                      <textarea 
                        className="btn-outline" 
                        style={{ width: '100%', height: '100px', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.875rem', background: 'white' }} 
                        value={formData.pages.join('\n')}
                        onChange={e => {
                          const lines = e.target.value.split('\n');
                          setFormData({ ...formData, pages: lines });
                        }}
                        placeholder="Ex:&#10;/contato&#10;https://meusite.com/produtos&#10;/servicos"
                      />
                      <p style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.25rem' }}>
                        O pop-up só será exibido se a URL do site de destino contiver alguma das regras informadas. Ex: <code>/contato</code> ou <code>https://meusite.com/produtos</code>.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna 2: Preview & Estilo */}
              <div style={{ background: 'var(--background)', borderRadius: 'var(--radius)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h4 style={{ fontWeight: 'bold' }}>Preview em Tempo Real</h4>
                
                <div style={{ 
                  background: formData.theme?.overlayColor || 'rgba(0,0,0,0.5)', 
                  padding: '2.5rem', 
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: formData.templateId === 'horizontal-banner' ? 'flex-end' : 'center',
                  justifyContent: 'center',
                  minHeight: '450px'
                }}>
                  <div style={{ 
                    background: formData.theme?.backgroundColor || '#ffffff', 
                    color: formData.theme?.textColor || '#1e293b',
                    width: '100%',
                    maxWidth: ['image-left', 'image-right', 'image-form-left', 'image-form-right'].includes(formData.templateId!) ? '100%' : '320px',
                    borderRadius: formData.templateId === 'horizontal-banner' ? 0 : '20px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: ['image-left', 'image-form-left', 'horizontal-banner'].includes(formData.templateId!) ? 'row' : (['image-right', 'image-form-right'].includes(formData.templateId!) ? 'row-reverse' : 'column'),
                    position: 'relative',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                  }}>
                    {formData.imageUrl && ['image-left', 'image-right', 'image-form-left', 'image-form-right', 'horizontal-banner'].includes(formData.templateId!) && (
                      <div style={{ width: formData.templateId === 'horizontal-banner' ? '120px' : '45%', flexShrink: 0 }}>
                        <img src={formData.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}

                    <div style={{ padding: '1.75rem', flex: 1, textAlign: ['image-left', 'image-right', 'horizontal-banner'].includes(formData.templateId!) ? 'left' : 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      {formData.templateId === 'image-top' && formData.imageUrl && <img src={formData.imageUrl} style={{ width: 'calc(100% + 3.5rem)', margin: '-1.75rem -1.75rem 1.25rem', height: '120px', objectFit: 'cover' }} />}
                      
                      {(formData.templateId === 'coupon' || formData.couponCode) && <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎁</div>}
                      
                      <h5 style={{ fontWeight: '800', fontSize: '1.2rem', marginBottom: '0.5rem', lineHeight: 1.2 }}>{formData.title || 'Título'}</h5>
                      <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1.5rem', lineHeight: 1.4 }}>{formData.subtitle || 'Descrição'}</p>
                      
                      {['lead-form', 'image-form-left', 'image-form-right'].includes(formData.templateId!) && (
                        <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '1.25rem' }}>
                          <input disabled placeholder="Seu Nome" style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }} />
                          <input disabled placeholder="Seu E-mail" style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }} />
                          <input disabled placeholder="Seu WhatsApp" style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }} />
                        </div>
                      )}

                      {formData.couponCode && (
                        <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '2px dashed #e2e8f0', marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 900, color: formData.theme?.buttonColor, textAlign: 'center' }}>
                          {formData.couponCode}
                        </div>
                      )}

                      <button style={{ background: formData.theme?.buttonColor, color: formData.theme?.buttonTextColor, width: formData.templateId === 'horizontal-banner' ? 'fit-content' : '100%', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: 'bold', border: 'none', fontSize: '0.95rem' }}>
                        {formData.buttonText}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label className="label">Cor de Fundo</label>
                    <input type="color" style={{ width: '100%', height: '42px', cursor: 'pointer' }} value={formData.theme?.backgroundColor} onChange={e => setFormData({...formData, theme: {...formData.theme!, backgroundColor: e.target.value}})} />
                  </div>
                  <div>
                    <label className="label">Cor do Texto</label>
                    <input type="color" style={{ width: '100%', height: '42px', cursor: 'pointer' }} value={formData.theme?.textColor} onChange={e => setFormData({...formData, theme: {...formData.theme!, textColor: e.target.value}})} />
                  </div>
                  <div>
                    <label className="label">Cor do Botão</label>
                    <input type="color" style={{ width: '100%', height: '42px', cursor: 'pointer' }} value={formData.theme?.buttonColor} onChange={e => setFormData({...formData, theme: {...formData.theme!, buttonColor: e.target.value}})} />
                  </div>
                  <div>
                    <label className="label">Texto do Botão</label>
                    <input type="color" style={{ width: '100%', height: '42px', cursor: 'pointer' }} value={formData.theme?.buttonTextColor} onChange={e => setFormData({...formData, theme: {...formData.theme!, buttonTextColor: e.target.value}})} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', position: 'sticky', bottom: 0, background: 'white', zIndex: 10 }}>
              <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} style={{ height: '45px', padding: '0 2rem' }}><Save size={20} /> Salvar Pop-up</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .label { display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: #475569; }
      `}</style>
    </div>
  );
}
