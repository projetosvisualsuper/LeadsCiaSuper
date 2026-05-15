'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Settings } from '@/types/crm';
import { testBrevoConnectionAction } from '@/app/actions/brevo';
import { 
  Save, 
  Key, 
  User, 
  Globe,
  Bell,
  Lock,
  MapPin,
  Share2,
  ExternalLink,
  MessageCircle,
  Trash2,
  Plus,
  MessageSquare,
  Eye,
  EyeOff
} from 'lucide-react';

export default function ConfigPage() {
  const [settings, setSettings] = useState<Partial<Settings>>({
    brevoApiKey: '',
    remetenteNome: '',
    remetenteEmail: '',
    limiteDiario: 300,
    notificacoes: {
      novosLeads: true,
      novasMensagens: true
    },
    autoresponder: {
      enabled: false,
      message: 'Olá! Recebemos sua mensagem. Um de nossos especialistas já vai te atender.'
    },
    landingPage: {
      titulo: '',
      subtitulo: '',
      destaque: '',
      descricao: '',
      beneficios: [],
      formTitulo: '',
      formSubtitulo: '',
      botaoTexto: '',
      botaoColor: '',
      formColor: '',
      logoUrl: '',
      backgroundUrl: '',
      ogLogoUrl: '',
      faviconUrl: ''
    },
    empresa: {
      website: '',
      endereco: '',
      facebook: '',
      instagram: '',
      linkedin: '',
      youtube: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showBrevoKey, setShowBrevoKey] = useState(false);
  const [showEvolutionKey, setShowEvolutionKey] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const data = await api.getSettings();
      setSettings({
        ...data,
        notificacoes: {
          novosLeads: data.notificacoes?.novosLeads ?? true,
          novasMensagens: data.notificacoes?.novasMensagens ?? true
        },
        autoresponder: {
          enabled: data.autoresponder?.enabled ?? false,
          message: data.autoresponder?.message || 'Olá! Recebemos sua mensagem. Um de nossos especialistas já vai te atender.'
        }
      });
      setLoading(false);
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      await api.saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar as configurações. Por favor, verifique se todos os campos estão corretos.');
    }
  };

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const compressed = await compressImage(file, 300, 300, 0.5);
    setSettings(prev => ({ 
      ...prev, 
      landingPage: { ...prev.landingPage!, logoUrl: compressed }
    }));
  };

  const handleOGLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Redução agressiva para caber no limite do Firestore
    const compressed = await compressImage(file, 800, 450, 0.4);
    setSettings(prev => ({ 
      ...prev, 
      landingPage: { ...prev.landingPage!, ogLogoUrl: compressed }
    }));
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Favicon deve ser bem pequeno
    const compressed = await compressImage(file, 64, 64, 0.8);
    setSettings(prev => ({ 
      ...prev, 
      landingPage: { ...prev.landingPage!, faviconUrl: compressed }
    }));
  };

  const toggleNotification = (key: keyof Settings['notificacoes']) => {
    setSettings({
      ...settings,
      notificacoes: {
        ...settings.notificacoes,
        [key]: !settings.notificacoes?.[key]
      }
    });
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div style={{ width: '100%', maxWidth: '1600px' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Configurações do Sistema</h2>
        <p style={{ opacity: 0.6 }}>Gerencie suas integrações e preferências de envio.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {/* API BREVO */}
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', paddingBottom: '3rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: '1 1 300px', maxWidth: '350px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Globe className="color-primary" size={20} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Integração API (Brevo)</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>Configure a chave da API do Brevo para permitir disparos de campanhas de e-mail marketing e defina o limite diário de envios.</p>
          </div>
          
          <div className="card" style={{ flex: '2 1 500px', margin: 0, display: 'grid', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>API Key</label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                <input 
                  type={showBrevoKey ? "text" : "password"} 
                  className="btn-outline" 
                  style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '2.5rem', height: '42px' }} 
                  placeholder="xkeysib-..."
                  value={settings.brevoApiKey}
                  onChange={e => setSettings({...settings, brevoApiKey: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowBrevoKey(!showBrevoKey)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 0 }}
                >
                  {showBrevoKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ fontSize: '0.75rem', height: '32px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  onClick={async () => {
                    const result = await testBrevoConnectionAction(settings.brevoApiKey || '');
                    alert(result.message);
                  }}
                >
                  Testar Conexão
                </button>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Teste sua chave antes de salvar as alterações.
                </p>
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Limite Diário de Envios</label>
              <input 
                type="number" 
                className="btn-outline" 
                style={{ width: '100%', height: '42px', padding: '0 1rem' }} 
                value={settings.limiteDiario}
                onChange={e => setSettings({...settings, limiteDiario: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
        </section>

        {/* GOOGLE TAG MANAGER */}
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', paddingBottom: '3rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: '1 1 300px', maxWidth: '350px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Globe className="color-primary" size={20} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Google Tag Manager</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>
              Integre suas páginas de captura com o GTM para monitorar conversões no Google Ads e Analytics.
            </p>
          </div>
          
          <div className="card" style={{ flex: '2 1 500px', margin: 0, display: 'grid', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>GTM ID</label>
              <div style={{ position: 'relative' }}>
                <Globe size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                <input 
                   type="text" 
                   className="btn-outline" 
                   style={{ width: '100%', paddingLeft: '2.5rem', height: '42px' }} 
                   placeholder="GTM-XXXXXXX"
                   value={settings.gtmId || ''}
                   onChange={e => setSettings({...settings, gtmId: e.target.value})}
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                O script será carregado automaticamente em todas as suas landing pages e links da bio.
              </p>
            </div>
          </div>
        </section>

        {/* INFORMAÇÕES DA EMPRESA (RODAPÉ) */}
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', paddingBottom: '3rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: '1 1 300px', maxWidth: '350px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <MapPin className="color-primary" size={20} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Informações da Empresa</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>Personalize logotipos, cores, textos de rodapé (LGPD) e informações de contato que aparecerão nas suas Landing Pages e e-mails.</p>
          </div>
          
          <div className="card" style={{ flex: '2 1 500px', margin: 0, display: 'grid', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Logotipo da Empresa (Aparecerá no Topo dos E-mails)
              </label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleLogoUpload}
                  style={{ fontSize: '0.875rem' }}
                />
                {settings.landingPage?.logoUrl && settings.landingPage.logoUrl !== 'none' && (
                  <button 
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', height: '32px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    onClick={() => setSettings(prev => ({ ...prev, landingPage: { ...prev.landingPage, logoUrl: '' } }))}
                  >
                    Remover Logo
                  </button>
                )}
              </div>
              {settings.landingPage?.logoUrl && settings.landingPage.logoUrl.startsWith('data:image') && (
                <div style={{ marginTop: '0.5rem' }}>
                  <img src={settings.landingPage.logoUrl} alt="Logo" style={{ maxHeight: '40px', objectFit: 'contain' }} />
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Logotipo de Compartilhamento (WhatsApp / Social Media)
              </label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleOGLogoUpload}
                  style={{ fontSize: '0.875rem' }}
                />
                {settings.landingPage?.ogLogoUrl && (
                  <button 
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', height: '32px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    onClick={() => setSettings(prev => ({ ...prev, landingPage: { ...prev.landingPage, ogLogoUrl: '' } }))}
                  >
                    Remover
                  </button>
                )}
              </div>
              {settings.landingPage?.ogLogoUrl && settings.landingPage.ogLogoUrl.startsWith('data:image') && (
                <div style={{ marginTop: '0.5rem' }}>
                  <img src={settings.landingPage.ogLogoUrl} alt="OG Logo" style={{ maxHeight: '60px', objectFit: 'contain', border: '1px solid var(--border)', padding: '5px', borderRadius: '5px' }} />
                </div>
              )}
              <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                Esta imagem aparecerá quando você compartilhar o link da sua página. Recomendado: 1200x630px.
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Favicon (Ícone da Aba do Navegador)
              </label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFaviconUpload}
                  style={{ fontSize: '0.875rem' }}
                />
                {settings.landingPage?.faviconUrl && (
                  <button 
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', height: '32px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    onClick={() => setSettings(prev => ({ ...prev, landingPage: { ...prev.landingPage, faviconUrl: '' } }))}
                  >
                    Remover
                  </button>
                )}
              </div>
              {settings.landingPage?.faviconUrl && settings.landingPage.faviconUrl.startsWith('data:image') && (
                <div style={{ marginTop: '0.5rem' }}>
                  <img src={settings.landingPage.faviconUrl} alt="Favicon" style={{ width: '32px', height: '32px', objectFit: 'contain', border: '1px solid var(--border)', padding: '2px', borderRadius: '4px' }} />
                </div>
              )}
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Cor de Fundo do Topo (Atrás da Logo)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="color" 
                  style={{ width: '50px', height: '42px', padding: '0', cursor: 'pointer', border: 'none' }} 
                  value={settings.landingPage?.headerColor || '#ffffff'}
                  onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, headerColor: e.target.value}})}
                />
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Escolha a cor que combine com a sua versão da logomarca</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                  Texto de Rodapé (Informação sobre uso de dados / LGPD)
                </label>
                <textarea 
                  className="btn-outline" 
                  style={{ width: '100%', height: '80px', padding: '0.75rem', fontSize: '0.875rem' }} 
                  placeholder="Ex: Nós respeitamos sua privacidade e utilizamos seus dados apenas para as finalidades informadas."
                  value={settings.landingPage?.footerText || ''}
                  onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, footerText: e.target.value}})}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                  URL da Página de Política de Privacidade
                </label>
                <input 
                  type="text" 
                  className="btn-outline" 
                  style={{ width: '100%', height: '42px', padding: '0 1rem' }} 
                  placeholder="https://suaempresa.com.br/politica-de-privacidade"
                  value={settings.landingPage?.privacyPolicyUrl || ''}
                  onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, privacyPolicyUrl: e.target.value}})}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Nome do Remetente</label>
                <input 
                  type="text" 
                  className="btn-outline" 
                  style={{ width: '100%', height: '42px', padding: '0 1rem' }} 
                  value={settings.remetenteNome}
                  onChange={e => setSettings({...settings, remetenteNome: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>E-mail do Remetente</label>
                <input 
                  type="email" 
                  className="btn-outline" 
                  style={{ width: '100%', height: '42px', padding: '0 1rem' }} 
                  value={settings.remetenteEmail}
                  onChange={e => setSettings({...settings, remetenteEmail: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Endereço Completo (Aparecerá no E-mail)</label>
              <input 
                type="text" 
                className="btn-outline" 
                style={{ width: '100%', height: '42px', padding: '0 1rem' }} 
                placeholder="Ex: Rua Exemplo, 123 - Cidade, Estado"
                value={settings.empresa?.endereco}
                onChange={e => setSettings({...settings, empresa: {...settings.empresa, endereco: e.target.value}})}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Website URL</label>
              <div style={{ position: 'relative' }}>
                <ExternalLink size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                <input 
                  type="text" 
                  className="btn-outline" 
                  style={{ width: '100%', paddingLeft: '2.5rem', height: '42px' }} 
                  placeholder="www.suaempresa.com.br"
                  value={settings.empresa?.website}
                  onChange={e => setSettings({...settings, empresa: {...settings.empresa, website: e.target.value}})}
                />
              </div>
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                <Share2 size={16} /> Redes Sociais (Links)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input 
                  className="btn-outline text-sm" 
                  style={{ height: '38px', padding: '0 0.75rem' }} 
                  placeholder="Instagram Link"
                  value={settings.empresa?.instagram}
                  onChange={e => setSettings({...settings, empresa: {...settings.empresa, instagram: e.target.value}})}
                />
                <input 
                  className="btn-outline text-sm" 
                  style={{ height: '38px', padding: '0 0.75rem' }} 
                  placeholder="Facebook Link"
                  value={settings.empresa?.facebook}
                  onChange={e => setSettings({...settings, empresa: {...settings.empresa, facebook: e.target.value}})}
                />
                <input 
                  className="btn-outline text-sm" 
                  style={{ height: '38px', padding: '0 0.75rem' }} 
                  placeholder="LinkedIn Link"
                  value={settings.empresa?.linkedin}
                  onChange={e => setSettings({...settings, empresa: {...settings.empresa, linkedin: e.target.value}})}
                />
                <input 
                  className="btn-outline text-sm" 
                  style={{ height: '38px', padding: '0 0.75rem' }} 
                  placeholder="YouTube Link"
                  value={settings.empresa?.youtube}
                  onChange={e => setSettings({...settings, empresa: {...settings.empresa, youtube: e.target.value}})}
                />
              </div>
            </div>
          </div>
        </section>

        {/* CONFIGURAÇÕES GERAIS DO SISTEMA */}
        <section style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <header style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.5rem', borderRadius: '8px' }}>
              <Globe size={20} />
            </div>
            <div>
              <h3 style={{ fontWeight: 800 }}>Configurações do Sistema</h3>
              <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>Defina o endereço base e configurações globais</p>
            </div>
          </header>
          
          <div style={{ padding: '2rem', display: 'grid', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>URL Base do Sistema (Domínio de Produção)</label>
              <input 
                type="text" 
                className="btn-outline" 
                style={{ width: '100%', height: '42px', padding: '0 1rem' }} 
                placeholder="Ex: https://crm.seudominio.com.br"
                value={settings.appUrl || ''}
                onChange={e => setSettings({ ...settings, appUrl: e.target.value })}
              />
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                Importante: Use este campo para definir o domínio real do seu CRM. Isso garante que integrações com Google e Meta funcionem corretamente.
              </p>
            </div>
          </div>
        </section>

        {/* OMNICHANNEL & CANAIS */}
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', paddingBottom: '3rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: '1 1 300px', maxWidth: '350px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Share2 className="color-primary" size={20} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Omnichannel (Meta)</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>Conecte seus tokens de acesso da Meta (Instagram/Facebook) e configure seu servidor próprio da Evolution API.</p>
          </div>
          
          <div className="card" style={{ flex: '2 1 500px', margin: 0, display: 'grid', gap: '1.25rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.1)', marginBottom: '0.5rem' }}>
               <p style={{ fontSize: '0.85rem', color: '#4338ca', lineHeight: 1.5 }}>
                 <strong>Configuração Meta:</strong> Use esta seção para conectar suas páginas do Facebook e perfis do Instagram. O Token de Acesso permite que o sistema responda mensagens automaticamente.
               </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Token de Acesso - Facebook Messenger</label>
              <textarea 
                className="btn-outline" 
                style={{ width: '100%', height: '80px', padding: '0.75rem', fontSize: '0.8rem', fontFamily: 'monospace' }} 
                placeholder="Cole aqui o token do Messenger..."
                value={settings.omnichannel?.messengerAccessToken || ''}
                onChange={e => setSettings({
                  ...settings, 
                  omnichannel: { ...settings.omnichannel, messengerAccessToken: e.target.value }
                })}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Token de Acesso - Instagram</label>
              <textarea 
                className="btn-outline" 
                style={{ width: '100%', height: '80px', padding: '0.75rem', fontSize: '0.8rem', fontFamily: 'monospace' }} 
                placeholder="Cole aqui o token do Instagram..."
                value={settings.omnichannel?.instagramAccessToken || ''}
                onChange={e => setSettings({
                  ...settings, 
                  omnichannel: { ...settings.omnichannel, instagramAccessToken: e.target.value }
                })}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Token de Verificação (Webhook)</label>
              <input 
                type="text" 
                className="btn-outline" 
                style={{ width: '100%', height: '42px', padding: '0 1rem' }} 
                placeholder="Padrão: gerency_leads_token"
                value={settings.omnichannel?.metaVerifyToken || 'gerency_leads_token'}
                onChange={e => setSettings({
                  ...settings, 
                  omnichannel: { ...settings.omnichannel, metaVerifyToken: e.target.value }
                })}
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />

            <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
               <p style={{ fontSize: '0.85rem', color: '#047857', lineHeight: 1.5 }}>
                 <strong>Evolution API (WhatsApp):</strong> Informe os dados do seu servidor para conectar múltiplos números via QR Code.
               </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>URL Base do Servidor</label>
              <input 
                type="text" 
                className="btn-outline" 
                style={{ width: '100%', height: '42px', padding: '0 1rem', fontFamily: 'monospace' }} 
                placeholder="Ex: https://api.seudominio.com.br"
                value={settings.omnichannel?.evolutionApiUrl || ''}
                onChange={e => setSettings({
                  ...settings, 
                  omnichannel: { ...settings.omnichannel, evolutionApiUrl: e.target.value }
                })}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Global API Key</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showEvolutionKey ? "text" : "password"} 
                  className="btn-outline" 
                  style={{ width: '100%', height: '42px', padding: '0 2.5rem 0 1rem', fontFamily: 'monospace' }} 
                  placeholder="Sua Global API Key da Evolution"
                  value={settings.omnichannel?.evolutionApiKey || ''}
                  onChange={e => setSettings({
                    ...settings, 
                    omnichannel: { ...settings.omnichannel, evolutionApiKey: e.target.value }
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowEvolutionKey(!showEvolutionKey)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 0 }}
                >
                  {showEvolutionKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />

            <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.1)' }}>
               <p style={{ fontSize: '0.85rem', color: '#000', lineHeight: 1.5 }}>
                 <strong>TikTok Business API:</strong> Conecte sua conta Business para receber e responder mensagens diretas.
               </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>TikTok App ID</label>
                <input 
                  type="text" 
                  className="btn-outline" 
                  style={{ width: '100%', height: '42px', padding: '0 1rem' }} 
                  value={settings.omnichannel?.tiktokAppId || ''}
                  onChange={e => setSettings({
                    ...settings, 
                    omnichannel: { ...settings.omnichannel, tiktokAppId: e.target.value }
                  })}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>TikTok Access Token</label>
                <input 
                  type="password" 
                  className="btn-outline" 
                  style={{ width: '100%', height: '42px', padding: '0 1rem' }} 
                  value={settings.omnichannel?.tiktokAccessToken || ''}
                  onChange={e => setSettings({
                    ...settings, 
                    omnichannel: { ...settings.omnichannel, tiktokAccessToken: e.target.value }
                  })}
                />
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />

            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
               <p style={{ fontSize: '0.85rem', color: '#ef4444', lineHeight: 1.5 }}>
                 <strong>YouTube API (Comentários):</strong> Integre comentários de vídeos como mensagens no Inbox.
               </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>YouTube API Key (Busca de Comentários)</label>
                <input 
                  type="password" 
                  className="btn-outline" 
                  style={{ width: '100%', height: '42px', padding: '0 1rem' }} 
                  value={settings.omnichannel?.youtubeApiKey || ''}
                  onChange={e => setSettings({
                    ...settings, 
                    omnichannel: { ...settings.omnichannel, youtubeApiKey: e.target.value }
                  })}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>YouTube Channel ID</label>
                <input 
                  type="text" 
                  className="btn-outline" 
                  style={{ width: '100%', height: '42px', padding: '0 1rem' }} 
                  value={settings.omnichannel?.youtubeChannelId || ''}
                  onChange={e => setSettings({
                    ...settings, 
                    omnichannel: { ...settings.omnichannel, youtubeChannelId: e.target.value }
                  })}
                />
              </div>
            </div>

            <div style={{ padding: '1rem', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '0.5rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>Configuração para RESPOSTAS (OAuth2)</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.75rem', fontWeight: 500 }}>Google Client ID</label>
                  <input 
                    type="text" 
                    className="btn-outline" 
                    style={{ width: '100%', height: '36px', padding: '0 0.75rem', fontSize: '0.8rem' }} 
                    value={settings.omnichannel?.youtubeClientId || ''}
                    onChange={e => setSettings({
                      ...settings, 
                      omnichannel: { ...settings.omnichannel, youtubeClientId: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.75rem', fontWeight: 500 }}>Google Client Secret</label>
                  <input 
                    type="password" 
                    className="btn-outline" 
                    style={{ width: '100%', height: '36px', padding: '0 0.75rem', fontSize: '0.8rem' }} 
                    value={settings.omnichannel?.youtubeClientSecret || ''}
                    onChange={e => setSettings({
                      ...settings, 
                      omnichannel: { ...settings.omnichannel, youtubeClientSecret: e.target.value }
                    })}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button 
                  className="btn btn-primary"
                  style={{ height: '36px', fontSize: '0.8rem' }}
                  onClick={async () => {
                    if (!settings.omnichannel?.youtubeClientId || !settings.omnichannel?.youtubeClientSecret) {
                      alert('Por favor, insira o Client ID e Client Secret primeiro.');
                      return;
                    }
                    // Salvar primeiro para garantir que os IDs estão no banco
                    await api.saveSettings(settings);
                    window.location.href = '/api/auth/youtube';
                  }}
                >
                  <Globe size={14} /> Conectar Canal do YouTube
                </button>
                {settings.omnichannel?.youtubeRefreshToken && (
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>✓ Conectado</span>
                )}
              </div>
              <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem' }}>
                Redirect URI para o Google Cloud: <code style={{ background: '#e2e8f0', padding: '2px 4px', borderRadius: '4px' }}>{typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback/youtube` : '.../api/auth/callback/youtube'}</code>
              </p>
            </div>
          </div>
        </section>

        {/* NOTIFICAÇÕES */}
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', paddingBottom: '3rem', borderBottom: '1px solid transparent' }}>
          <div style={{ flex: '1 1 300px', maxWidth: '350px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Bell className="color-primary" size={20} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Notificações</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>Escolha quais alertas o sistema deve exibir para você durante o uso.</p>
          </div>
          
          <div className="card" style={{ flex: '2 1 500px', margin: 0, display: 'grid', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--background)', border: '1px solid var(--border)' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Alerta de Novo Lead</p>
                <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Notificação visual imediata ao receber contatos.</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.notificacoes?.novosLeads || false}
                onChange={() => toggleNotification('novosLeads')}
                style={{ width: '40px', height: '20px', cursor: 'pointer' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--background)', border: '1px solid var(--border)' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Alerta de Novas Mensagens</p>
                <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Som e notificação push ao receber mensagens no chat.</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.notificacoes?.novasMensagens !== false}
                onChange={() => setSettings(prev => ({
                  ...prev, 
                  notificacoes: { ...prev.notificacoes, novasMensagens: !(prev.notificacoes?.novasMensagens !== false) }
                }))}
                style={{ width: '40px', height: '20px', cursor: 'pointer' }}
              />
            </label>
          </div>
        </section>

        {/* AUTORESPONDER E ROBÔS */}
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', paddingBottom: '3rem', borderBottom: '1px solid transparent' }}>
          <div style={{ flex: '1 1 300px', maxWidth: '350px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <MessageSquare className="color-primary" size={20} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Bot e Automacão</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>Configure a saudação automática para os novos contatos.</p>
          </div>
          
          <div className="card" style={{ flex: '2 1 500px', margin: 0, display: 'grid', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--background)', border: '1px solid var(--border)' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Ativar Mensagem de Boas-Vindas</p>
                <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Dispara o autoresponder para novos chats.</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.autoresponder?.enabled || false}
                onChange={() => setSettings(prev => ({
                  ...prev, 
                  autoresponder: { ...prev.autoresponder, enabled: !prev.autoresponder?.enabled, message: prev.autoresponder?.message || '' }
                }))}
                style={{ width: '40px', height: '20px', cursor: 'pointer' }}
              />
            </label>

            {settings.autoresponder?.enabled && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Texto da Mensagem</label>
                <textarea 
                  className="btn-outline" 
                  style={{ width: '100%', height: '80px', padding: '0.75rem', fontSize: '0.875rem', resize: 'vertical' }} 
                  placeholder="Ex: Olá! Em instantes nossa equipe irá te atender."
                  value={settings.autoresponder?.message || ''}
                  onChange={e => setSettings(prev => ({
                    ...prev, 
                    autoresponder: { ...prev.autoresponder, enabled: true, message: e.target.value }
                  }))}
                />
              </div>
            )}
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '4rem', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
          {saved && <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>Configurações aplicadas com sucesso!</span>}
          <button className="btn btn-primary" onClick={handleSave} style={{ height: '50px', padding: '0 2.5rem', fontSize: '1rem' }}>
            <Save size={20} /> Salvar Tudo
          </button>
        </div>
      </div>
    </div>
  );
}
