'use client';

import { 
  Globe, 
  Code, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  Zap,
  MessageCircle,
  Settings as SettingsIcon,
  Play,
  CheckCircle,
  AlertCircle,
  X,
  ChevronRight,
  Info,
  ShoppingBag
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Settings } from '@/types/crm';

const Instagram = (props: any) => (
  <svg viewBox="0 0 24 24" width={props.size || 24} height={props.size || 24} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const Facebook = (props: any) => (
  <svg viewBox="0 0 24 24" width={props.size || 24} height={props.size || 24} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Youtube = (props: any) => (
  <svg viewBox="0 0 24 24" width={props.size || 24} height={props.size || 24} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

interface PluginCard {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  color: string;
  icon: any;
  status: 'connected' | 'disconnected' | 'pending';
  features: string[];
}

export default function IntegracoesPage() {
  const [activeTab, setActiveTab] = useState<'plugins' | 'capture'>('plugins');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);
  const [publicLink, setPublicLink] = useState('');
  
  // Settings & DB states
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states matching settings.omnichannel fields
  const [formInstagram, setFormInstagram] = useState({ token: '', verifyToken: '' });
  const [formFacebook, setFormFacebook] = useState({ token: '', verifyToken: '' });
  const [formTikTok, setFormTikTok] = useState({ appId: '', token: '' });
  const [formYouTube, setFormYouTube] = useState({ apiKey: '', channelId: '', clientId: '', clientSecret: '' });
  const [formWhatsApp, setFormWhatsApp] = useState({ apiUrl: '', apiKey: '' });
  const [formBling, setFormBling] = useState({ enabled: true, templateName: '', templateLanguage: 'pt_BR' });

  useEffect(() => {
    setPublicLink(`${window.location.origin}/captura`);
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const data = await api.getSettings();
      if (data) {
        setSettings(data);
        
        // Populate form states
        const omni = data.omnichannel || {};
        setFormInstagram({
          token: omni.instagramAccessToken || '',
          verifyToken: omni.metaVerifyToken || 'gerency_leads_token'
        });
        setFormFacebook({
          token: omni.messengerAccessToken || '',
          verifyToken: omni.metaVerifyToken || 'gerency_leads_token'
        });
        setFormTikTok({
          appId: omni.tiktokAppId || '',
          token: omni.tiktokAccessToken || ''
        });
        setFormYouTube({
          apiKey: omni.youtubeApiKey || '',
          channelId: omni.youtubeChannelId || '',
          clientId: omni.youtubeClientId || '',
          clientSecret: omni.youtubeClientSecret || ''
        });
        setFormWhatsApp({
          apiUrl: omni.evolutionApiUrl || '',
          apiKey: omni.evolutionApiKey || ''
        });
        setFormBling({
          enabled: data.bling?.enabled !== false,
          templateName: data.bling?.templateName || '',
          templateLanguage: data.bling?.templateLanguage || 'pt_BR'
        });
      }
    } catch (e) {
      console.error('Erro ao carregar configurações de integração:', e);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveIntegration = async (pluginId: string) => {
    if (!settings) return;
    try {
      setSaveLoading(true);
      
      const updatedOmni = { ...(settings.omnichannel || {}) };
      let updatedBling = { ...(settings.bling || {}) };

      if (pluginId === 'instagram') {
        updatedOmni.instagramAccessToken = formInstagram.token;
        updatedOmni.metaVerifyToken = formInstagram.verifyToken;
      } else if (pluginId === 'facebook') {
        updatedOmni.messengerAccessToken = formFacebook.token;
        updatedOmni.metaVerifyToken = formFacebook.verifyToken;
      } else if (pluginId === 'tiktok') {
        updatedOmni.tiktokAppId = formTikTok.appId;
        updatedOmni.tiktokAccessToken = formTikTok.token;
      } else if (pluginId === 'youtube') {
        updatedOmni.youtubeApiKey = formYouTube.apiKey;
        updatedOmni.youtubeChannelId = formYouTube.channelId;
        updatedOmni.youtubeClientId = formYouTube.clientId;
        updatedOmni.youtubeClientSecret = formYouTube.clientSecret;
      } else if (pluginId === 'whatsapp') {
        updatedOmni.evolutionApiUrl = formWhatsApp.apiUrl;
        updatedOmni.evolutionApiKey = formWhatsApp.apiKey;
      } else if (pluginId === 'bling') {
        updatedBling = {
          enabled: formBling.enabled,
          templateName: formBling.templateName,
          templateLanguage: formBling.templateLanguage
        };
      }

      const updatedSettings = {
        ...settings,
        omnichannel: updatedOmni,
        bling: updatedBling
      };

      await api.saveSettings(updatedSettings);
      setSettings(updatedSettings);
      
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setActiveModal(null);
      }, 1500);
    } catch (e) {
      console.error('Erro ao salvar integração:', e);
      alert('Ocorreu um erro ao salvar as configurações.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleYouTubeConnect = async () => {
    if (!settings) return;
    if (!formYouTube.clientId || !formYouTube.clientSecret) {
      alert('Por favor, configure o Google Client ID e Client Secret antes de conectar.');
      return;
    }
    try {
      // Salva as credenciais antes de redirecionar para o OAuth
      const updatedSettings = {
        ...settings,
        omnichannel: {
          ...(settings.omnichannel || {}),
          youtubeClientId: formYouTube.clientId,
          youtubeClientSecret: formYouTube.clientSecret,
          youtubeApiKey: formYouTube.apiKey,
          youtubeChannelId: formYouTube.channelId
        }
      };
      await api.saveSettings(updatedSettings);
      window.location.href = '/api/auth/youtube';
    } catch (e) {
      console.error(e);
      alert('Erro ao iniciar conexão do YouTube.');
    }
  };

  // Embed codes for the capture tab
  const embedCode = `<iframe src="${publicLink}" width="100%" height="700px" frameborder="0" style="border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></iframe>`;
  const waCode = `<script>
  (function() {
    var frame = document.createElement('iframe');
    frame.src = "${typeof window !== 'undefined' ? window.location.origin : ''}/whatsapp-widget";
    frame.style.cssText = "position:fixed;bottom:15px;right:15px;width:90px;height:90px;border:none;z-index:999999;background:transparent;transition:all 0.3s ease;color-scheme:light;";
    frame.setAttribute('allowTransparency', 'true');
    document.body.appendChild(frame);

    window.addEventListener('message', function(e) {
      if (e.data.type === 'wa-widget-state') {
        frame.style.width = e.data.open ? '350px' : '90px';
        frame.style.height = e.data.open ? '650px' : '90px';
      }
    });
  })();
</script>`;

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const getStatusBadge = (status: 'connected' | 'disconnected' | 'pending') => {
    const styles: Record<string, React.CSSProperties> = {
      connected: { background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' },
      disconnected: { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' },
      pending: { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }
    };
    const labels = {
      connected: 'Conectado',
      disconnected: 'Não Instalado',
      pending: 'Pendente'
    };
    return (
      <span style={{ 
        fontSize: '0.75rem', 
        fontWeight: 600, 
        padding: '0.25rem 0.6rem', 
        borderRadius: '50px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        ...styles[status]
      }}>
        {status === 'connected' && <CheckCircle size={12} />}
        {status === 'pending' && <AlertCircle size={12} />}
        {labels[status]}
      </span>
    );
  };

  // Define details of the available plugins
  const plugins: PluginCard[] = [
    {
      id: 'instagram',
      name: 'Instagram',
      description: 'Centralize comentários, direct messages, menções e respostas a Stories.',
      longDescription: 'Automatize o atendimento e a captação de leads na maior rede social de engajamento do mundo. Com a API oficial integrada, você recebe todas as interações direto no inbox do GerencyLeads.',
      color: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
      icon: Instagram,
      status: settings?.omnichannel?.instagramAccessToken ? 'connected' : 'disconnected',
      features: [
        'Responda DMs de clientes no painel unificado',
        'Capture menções em Stories automaticamente',
        'Imagem da postagem anexada ao comentário',
        'Respostas automáticas inteligentes'
      ]
    },
    {
      id: 'facebook',
      name: 'Facebook Messenger',
      description: 'Conecte sua Página para gerenciar conversas do Messenger e anúncios de leads.',
      longDescription: 'Nunca perca um lead vindo do Facebook. Integre sua página comercial para centralizar mensagens diretas e comentários de postagens em uma única caixa de entrada.',
      color: '#1877F2',
      icon: Facebook,
      status: settings?.omnichannel?.messengerAccessToken ? 'connected' : 'disconnected',
      features: [
        'Sincronização instantânea com o Facebook Messenger',
        'Filtro de comentários de posts e anúncios orgânicos',
        'Tags automatizadas para leads vindos do Facebook',
        'Distribuição automática de leads na equipe'
      ]
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp (Evolution API)',
      description: 'Conexão avançada via Evolution API para atendimento multicanal.',
      longDescription: 'Configure seu servidor próprio da Evolution API para gerenciar instâncias de WhatsApp de forma estável, com suporte a mensagens, áudio e sincronização de avatares.',
      color: '#25D366',
      icon: MessageCircle,
      status: settings?.omnichannel?.evolutionApiUrl && settings?.omnichannel?.evolutionApiKey ? 'connected' : 'disconnected',
      features: [
        'Conexão estável com múltiplas instâncias de WhatsApp',
        'Recuperação automática de fotos de perfil (avatares)',
        'Envio e recebimento de áudio com player acelerador',
        'Suporte a webhooks de entrega e leitura'
      ]
    },
    {
      id: 'tiktok',
      name: 'TikTok Business',
      description: 'Capture e responda mensagens diretas de sua conta comercial do TikTok.',
      longDescription: 'Integre sua conta corporativa do TikTok para capturar prospects diretamente dos seus vídeos de sucesso e responder mensagens diretas sem precisar mudar de aplicativo.',
      color: '#000000',
      icon: Play,
      status: settings?.omnichannel?.tiktokAccessToken ? 'connected' : 'disconnected',
      features: [
        'Captação de leads vindos de vídeos e anúncios do TikTok',
        'Mensagens diretas unificadas no painel do CRM',
        'Histórico unificado de conversão do cliente',
        'Respostas automatizadas rápidas'
      ]
    },
    {
      id: 'youtube',
      name: 'YouTube',
      description: 'Importe comentários de seus vídeos para interagir e gerar oportunidades.',
      longDescription: 'Conecte seu canal do YouTube para monitorar comentários em seus vídeos informativos ou tutoriais, transformando dúvidas de espectadores em leads qualificados no CRM.',
      color: '#FF0000',
      icon: Youtube,
      status: settings?.omnichannel?.youtubeRefreshToken ? 'connected' : 'pending',
      features: [
        'Monitoramento automático de comentários de vídeos',
        'Integração com respostas via OAuth Google',
        'Filtro por canal e engajamento do lead',
        'Notificação instantânea para novos comentários'
      ]
    },
    {
      id: 'bling',
      name: 'Bling ERP',
      description: 'Envie notificações de rastreamento e altere status de pedidos automaticamente.',
      longDescription: 'Integre o Bling ERP para atualizar o status dos pedidos para Enviado e disparar o código de rastreio aos seus clientes via WhatsApp automaticamente quando o pedido for despachado.',
      color: '#f59e0b',
      icon: ShoppingBag,
      status: settings?.bling?.enabled ? 'connected' : 'disconnected',
      features: [
        'Sincronização automática do código de rastreamento',
        'Atualização automática de status de pedidos',
        'Disparo automático de WhatsApp ao faturar/despachar',
        'Suporte a templates da Meta e mensagens de texto padrão'
      ]
    }
  ];

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Header */}
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
            Plugins & Integrações
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.975rem', marginTop: '0.25rem' }}>
            Centralize e gerencie todas as conexões de canais e captura de leads do GerencyLeads.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
          <button 
            onClick={() => setActiveTab('plugins')}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              background: activeTab === 'plugins' ? '#ffffff' : 'transparent',
              color: activeTab === 'plugins' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'plugins' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Redes Sociais & Plugins
          </button>
          <button 
            onClick={() => setActiveTab('capture')}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              background: activeTab === 'capture' ? '#ffffff' : 'transparent',
              color: activeTab === 'capture' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'capture' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Formulários & Webhooks
          </button>
        </div>
      </header>

      {/* PLUGINS TAB */}
      {activeTab === 'plugins' && (
        <div>
          {loadingSettings ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: '#64748b' }}>
              Carregando conexões de plugins...
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {plugins.map((plugin) => {
                const IconComponent = plugin.icon;
                return (
                  <div 
                    key={plugin.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
                      overflow: 'hidden',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => setActiveModal(plugin.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)';
                    }}
                  >
                    {/* Header Banner */}
                    <div style={{ background: plugin.color, padding: '2rem 1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                      <IconComponent size={44} color="#ffffff" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
                    </div>

                    {/* Content */}
                    <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{plugin.name}</h3>
                        {getStatusBadge(plugin.status)}
                      </div>
                      
                      <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5, flex: 1 }}>
                        {plugin.description}
                      </p>

                      {/* Divider */}
                      <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '1.25rem 0' }} />

                      {/* Footer Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                          Clique para configurar
                        </span>
                        <button 
                          style={{
                            background: plugin.status === 'connected' ? '#f1f5f9' : '#3b82f6',
                            color: plugin.status === 'connected' ? '#0f172a' : '#ffffff',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'background 0.2s ease'
                          }}
                        >
                          {plugin.status === 'connected' ? <SettingsIcon size={14} /> : null}
                          {plugin.status === 'connected' ? 'Configurar' : 'Instalar'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CAPTURE TAB */}
      {activeTab === 'capture' && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          <section className="card" style={{ padding: '2rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Globe className="color-primary" size={24} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Link Público da Landing Page</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Use este link em suas campanhas, bio do Instagram ou botões de anúncios. Os leads caem direto no seu CRM.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <input 
                readOnly 
                type="text" 
                value={publicLink} 
                style={{ background: 'transparent', border: 'none', width: '100%', outline: 'none', color: '#1e293b', fontWeight: 600 }}
              />
              <button 
                onClick={() => copyToClipboard(publicLink, setCopiedLink)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedLink ? '#10b981' : '#64748b' }}
              >
                {copiedLink ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
            <a href="/captura" target="_blank" className="btn btn-outline" style={{ marginTop: '1.25rem', border: 'none', color: 'var(--primary)', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
               Visualizar Página <ExternalLink size={14} />
            </a>
          </section>

          <section className="card" style={{ padding: '2rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Code className="color-primary" size={24} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Código de Incorporação (Embed)</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Copie o código abaixo e cole no HTML do seu site para exibir o formulário dentro de qualquer página sua.
            </p>
            <div style={{ position: 'relative' }}>
              <pre style={{ 
                background: '#1e293b', 
                color: '#f8fafc', 
                padding: '1.5rem', 
                borderRadius: '12px', 
                fontSize: '0.875rem', 
                overflowX: 'auto',
                border: '1px solid #334155'
              }}>
                <code>{embedCode}</code>
              </pre>
              <button 
                onClick={() => copyToClipboard(embedCode, setCopiedEmbed)}
                style={{ 
                  position: 'absolute', 
                  right: '1rem', 
                  top: '1rem', 
                  background: 'rgba(255,255,255,0.1)', 
                  border: 'none',
                  padding: '0.5rem', 
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: copiedEmbed ? '#34d399' : '#94a3b8'
                }}
              >
                {copiedEmbed ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Info size={14} /> Dica: No Wordpress, use o bloco "HTML Personalizado" para colar este código.
            </p>
          </section>

          <section className="card" style={{ padding: '2rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #25D366', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <MessageCircle style={{ color: '#25D366' }} size={24} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Botão WhatsApp Global (Embed)</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Adicione o botão flutuante com atendentes em seu site oficial. O código abaixo cria o botão no canto da tela.
            </p>
            <div style={{ position: 'relative' }}>
              <pre style={{ 
                background: '#064e3b', 
                color: '#d1fae5', 
                padding: '1.5rem', 
                borderRadius: '12px', 
                fontSize: '0.875rem', 
                overflowX: 'auto',
                border: '1px solid #065f46'
              }}>
                <code>{waCode}</code>
              </pre>
              <button 
                onClick={() => copyToClipboard(waCode, setCopiedWa)}
                style={{ 
                  position: 'absolute', 
                  right: '1rem', 
                  top: '1rem', 
                  background: 'rgba(255,255,255,0.1)', 
                  border: 'none',
                  padding: '0.5rem', 
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: copiedWa ? '#34d399' : '#a7f3d0'
                }}
              >
                {copiedWa ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#047857', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Info size={14} /> Configure os atendentes em <strong>Configurações</strong> no menu lateral.
            </p>
          </section>

          <section className="card" style={{ padding: '2rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #6366f1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Zap className="color-primary" size={24} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Webhook de Conversão (Vendas)</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Marque automaticamente um lead como <strong>CONVERTIDO</strong> quando ele finalizar uma compra no seu site. 
              Envie um POST para a URL abaixo:
            </p>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
              <code style={{ fontSize: '0.85rem', color: '#4f46e5', fontWeight: 600 }}>{`${typeof window !== 'undefined' ? window.location.origin : ''}/api/leads/convert`}</code>
            </div>
            <details style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
               <summary style={{ fontWeight: 600, color: '#4f46e5' }}>Ver exemplo de JSON (Payload)</summary>
               <pre style={{ background: '#1e293b', color: '#f8fafc', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem', fontSize: '0.75rem' }}>
{`{
  "email": "cliente@email.com",
  "nome": "Nome do Cliente",
  "telefone": "48999999999",
  "valor": "199.90",
  "pedidoId": "12345"
}`}
               </pre>
            </details>
          </section>
        </div>
      )}

      {/* INTEGRATIONS MODALS (POPUP CONFIG) */}
      {activeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            border: '1px solid #e2e8f0',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            {(() => {
              const currentPlugin = plugins.find(p => p.id === activeModal);
              if (!currentPlugin) return null;
              const IconComp = currentPlugin.icon;
              
              return (
                <>
                  <div style={{
                    background: currentPlugin.color,
                    padding: '2rem 2.5rem',
                    color: '#ffffff',
                    position: 'relative'
                  }}>
                    <button 
                      onClick={() => setActiveModal(null)}
                      style={{
                        position: 'absolute',
                        right: '1.5rem',
                        top: '1.5rem',
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '0.4rem',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    >
                      <X size={18} />
                    </button>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <IconComp size={36} color="#ffffff" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1)' }} />
                      <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Instalar {currentPlugin.name}</h2>
                        <p style={{ opacity: 0.8, fontSize: '0.85rem', marginTop: '2px' }}>Preencha os dados abaixo para conectar o plugin.</p>
                      </div>
                    </div>
                  </div>

                  {/* Modal Body */}
                  <div style={{ padding: '2.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', marginBottom: '2rem' }}>
                      <div>
                        <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.5rem' }}>Sobre a Integração</h4>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>{currentPlugin.longDescription}</p>
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.5rem' }}>Recursos Inclusos</h4>
                        <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {currentPlugin.features.map((feat, idx) => (
                            <li key={idx} style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>{feat}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '2rem 0' }} />

                    {/* Dynamic Configurations Form */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <SettingsIcon size={16} /> Credenciais do Plugin
                      </h4>

                      {/* INSTAGRAM FORM */}
                      {activeModal === 'instagram' && (
                        <>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Meta Verify Token</label>
                            <input 
                              type="text" 
                              value={formInstagram.verifyToken} 
                              onChange={(e) => setFormInstagram({ ...formInstagram, verifyToken: e.target.value })}
                              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                              placeholder="Ex: gerency_leads_token"
                            />
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Este token é usado para verificar seu Webhook na plataforma de Desenvolvedores da Meta.</p>
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Instagram Access Token (Token de Acesso)</label>
                            <input 
                              type="password" 
                              value={formInstagram.token} 
                              onChange={(e) => setFormInstagram({ ...formInstagram, token: e.target.value })}
                              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                              placeholder="Insira o Token de Acesso da Graph API"
                            />
                          </div>
                        </>
                      )}

                      {/* FACEBOOK FORM */}
                      {activeModal === 'facebook' && (
                        <>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Meta Verify Token</label>
                            <input 
                              type="text" 
                              value={formFacebook.verifyToken} 
                              onChange={(e) => setFormFacebook({ ...formFacebook, verifyToken: e.target.value })}
                              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                              placeholder="Ex: gerency_leads_token"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Messenger Access Token (Página)</label>
                            <input 
                              type="password" 
                              value={formFacebook.token} 
                              onChange={(e) => setFormFacebook({ ...formFacebook, token: e.target.value })}
                              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                              placeholder="Insira o Token de Acesso da Página do Facebook"
                            />
                          </div>
                        </>
                      )}

                      {/* TIKTOK FORM */}
                      {activeModal === 'tiktok' && (
                        <>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>TikTok App ID</label>
                            <input 
                              type="text" 
                              value={formTikTok.appId} 
                              onChange={(e) => setFormTikTok({ ...formTikTok, appId: e.target.value })}
                              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                              placeholder="TikTok Developer Client/App ID"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>TikTok Access Token</label>
                            <input 
                              type="password" 
                              value={formTikTok.token} 
                              onChange={(e) => setFormTikTok({ ...formTikTok, token: e.target.value })}
                              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                              placeholder="Insira o Access Token"
                            />
                          </div>
                        </>
                      )}

                      {/* YOUTUBE FORM */}
                      {activeModal === 'youtube' && (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>YouTube API Key</label>
                              <input 
                                type="password" 
                                value={formYouTube.apiKey} 
                                onChange={(e) => setFormYouTube({ ...formYouTube, apiKey: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                                placeholder="Google Console API Key"
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Channel ID</label>
                              <input 
                                type="text" 
                                value={formYouTube.channelId} 
                                onChange={(e) => setFormYouTube({ ...formYouTube, channelId: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                                placeholder="Ex: UC..."
                              />
                            </div>
                          </div>

                          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '0.5rem' }}>
                            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>Configuração de Respostas Rápidas (Google OAuth2)</p>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                              <div>
                                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Google Client ID</label>
                                <input 
                                  type="text" 
                                  value={formYouTube.clientId} 
                                  onChange={(e) => setFormYouTube({ ...formYouTube, clientId: e.target.value })}
                                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.8rem' }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Google Client Secret</label>
                                <input 
                                  type="password" 
                                  value={formYouTube.clientSecret} 
                                  onChange={(e) => setFormYouTube({ ...formYouTube, clientSecret: e.target.value })}
                                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.8rem' }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <button 
                                type="button"
                                onClick={handleYouTubeConnect}
                                style={{
                                  background: '#ef4444',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '0.5rem 1rem',
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Globe size={14} /> Conectar Conta Google (OAuth)
                              </button>
                              {settings?.omnichannel?.youtubeRefreshToken && (
                                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>✓ Canal Conectado</span>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* WHATSAPP FORM */}
                      {activeModal === 'whatsapp' && (
                        <>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Evolution API URL</label>
                            <input 
                              type="text" 
                              value={formWhatsApp.apiUrl} 
                              onChange={(e) => setFormWhatsApp({ ...formWhatsApp, apiUrl: e.target.value })}
                              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                              placeholder="Ex: https://api.seudominio.com.br"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Global API Key</label>
                            <input 
                              type="password" 
                              value={formWhatsApp.apiKey} 
                              onChange={(e) => setFormWhatsApp({ ...formWhatsApp, apiKey: e.target.value })}
                              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                              placeholder="Insira a chave global da Evolution API"
                            />
                          </div>
                          <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '12px', border: '1px solid #bfdbfe', marginTop: '0.5rem' }}>
                            <p style={{ fontSize: '0.8rem', color: '#1d4ed8', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
                              💡 <strong>Importante:</strong> As conexões individuais de instância e QR Code de WhatsApp devem ser gerenciados no menu lateral <strong>Conexões</strong>. Este formulário define as credenciais base da sua API Global.
                            </p>
                          </div>
                        </>
                      )}

                      {/* BLING FORM */}
                      {activeModal === 'bling' && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input 
                              type="checkbox" 
                              id="bling-enabled"
                              checked={formBling.enabled} 
                              onChange={(e) => setFormBling({ ...formBling, enabled: e.target.checked })}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <label htmlFor="bling-enabled" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>Ativar Envio de Notificações</label>
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Nome do Modelo de WhatsApp da Meta (Opcional)</label>
                            <input 
                              type="text" 
                              value={formBling.templateName} 
                              onChange={(e) => setFormBling({ ...formBling, templateName: e.target.value })}
                              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                              placeholder="Ex: order_status_update (Deixe em branco para usar mensagem padrão)"
                            />
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Caso configurado, enviaremos este template oficial. Caso contrário, enviaremos uma mensagem de texto simples.</p>
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Idioma do Template</label>
                            <input 
                              type="text" 
                              value={formBling.templateLanguage} 
                              onChange={(e) => setFormBling({ ...formBling, templateLanguage: e.target.value })}
                              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                              placeholder="Ex: pt_BR"
                            />
                          </div>
                          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', marginTop: '0.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.825rem', fontWeight: 700, color: '#475569' }}>URL do Webhook para configurar no Bling</label>
                            <div style={{ display: 'flex', gap: '0.5rem', background: '#ffffff', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                              <input 
                                readOnly 
                                type="text" 
                                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/bling`} 
                                style={{ background: 'transparent', border: 'none', width: '100%', outline: 'none', color: '#1e293b', fontSize: '0.8rem', fontWeight: 600 }}
                              />
                              <button 
                                type="button"
                                onClick={() => copyToClipboard(`${window.location.origin}/api/webhook/bling`, setCopiedWa)} 
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                              >
                                <Copy size={16} />
                              </button>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px', lineHeight: 1.4 }}>
                              Copie esta URL e cole nas configurações de Webhooks do Bling para o evento de alteração de situação de vendas.
                            </p>
                          </div>
                        </>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                        <button 
                          type="button" 
                          onClick={() => setActiveModal(null)}
                          style={{
                            background: '#f1f5f9',
                            color: '#0f172a',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '10px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Cancelar
                        </button>
                        
                        <button 
                          type="button"
                          onClick={() => handleSaveIntegration(activeModal)}
                          disabled={saveLoading}
                          style={{
                            background: saveSuccess ? '#10b981' : '#3b82f6',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '10px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            minWidth: '120px',
                            justifyContent: 'center'
                          }}
                        >
                          {saveSuccess ? (
                            <>
                              <Check size={16} /> Salvo!
                            </>
                          ) : saveLoading ? (
                            'Salvando...'
                          ) : (
                            'Salvar Alterações'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
