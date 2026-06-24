'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Campaign, Lead } from '@/types/crm';
import { 
  Plus, 
  Send, 
  FileText, 
  Search,
  CheckCircle2,
  Clock,
  Play,
  Wand2,
  Eye,
  Code,
  Type,
  X,
  Smartphone,
  Monitor,
  Trash2,
  MailOpen,
  MousePointerClick,
  BarChart3,
  Edit2,
  Copy
} from 'lucide-react';

export default function CampanhasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [processMessage, setProcessMessage] = useState('');
  const [viewMode, setViewMode] = useState<'normal' | 'html'>('normal');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);
  const [selectedCampaignHtml, setSelectedCampaignHtml] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [whatsappConnections, setWhatsappConnections] = useState<any[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<any[]>([]);
  const [segmentations, setSegmentations] = useState<any[]>([]);
  
  // Custom Delete Confirm State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    campaignId: string;
    campaignNome: string;
  }>({
    isOpen: false,
    campaignId: '',
    campaignNome: ''
  });
  
  // Alert Modal State
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  // Modal de Relatório
  const [reportModal, setReportModal] = useState<Campaign | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [newCampaign, setNewCampaign] = useState({
    id: '',
    nome: '',
    assunto: '',
    preheader: '',
    conteudoHtml: '',
    textoSimples: '',
    bannerImg: '',
    botaoTexto: '',
    botaoLink: '',
    channel: 'email' as 'email' | 'whatsapp',
    whatsappConnectionId: '',
    whatsappTemplateId: '',
    segmentId: '',
    tipoEnvio: 'imediato' as 'imediato' | 'agendado',
    dataAgendada: ''
  });

  useEffect(() => {
    const loadData = async () => {
      setCampaigns(await api.getCampaigns());
      setWhatsappConnections(await api.getWhatsappConnections());
      setWhatsappTemplates(await api.getWhatsappTemplates());
      setSegmentations(await api.getSegmentations());
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isPreviewOpen && !selectedCampaignHtml) {
      if (viewMode === 'html' && newCampaign.conteudoHtml) {
        setPreviewHtml(newCampaign.conteudoHtml);
      } else {
        generateProfessionalHTML(
          newCampaign.textoSimples || 'Digite seu texto para visualizar...', 
          newCampaign.assunto || 'Assunto Exemplo', 
          newCampaign.bannerImg,
          undefined,
          newCampaign.botaoTexto,
          newCampaign.botaoLink
        ).then(setPreviewHtml);
      }
    }
  }, [isPreviewOpen, selectedCampaignHtml, viewMode, newCampaign]);

  const generateProfessionalHTML = async (text: string, subject: string, bannerImg?: string, campaignId?: string, botaoTexto?: string, botaoLink?: string, preheader?: string) => {
    const settings = await api.getSettings();
    const brandName = settings.landingPage?.titulo || 'Leads Cia Super';
    const senderName = settings.remetenteNome || brandName;
    const brandColor = settings.landingPage?.formColor || '#4f46e5';
    const websiteUrl = (settings.empresa?.website || '').startsWith('http') ? (settings.empresa?.website || '') : 'https://' + (settings.empresa?.website || 'www.visualsuper.com.br');
    
    // O websiteUrl é o site público da empresa (ex: visualsuper.com.br). 
    // Mas a API de imagens roda NO CRM. Então precisamos da URL de onde o CRM está rodando.
    const systemUrl = typeof window !== 'undefined' ? window.location.origin : websiteUrl;
    
    let logoUrl = settings.landingPage?.logoUrl;
    
    let finalLogo = null;
    if (logoUrl) {
      if (logoUrl.startsWith('data:image')) {
        finalLogo = campaignId ? `${systemUrl}/api/img/logo` : logoUrl; // Endpoint dinâmico no CRM ou base64 na prévia
      } else if (!logoUrl.startsWith('http')) {
        finalLogo = systemUrl + (logoUrl.startsWith('/') ? '' : '/') + logoUrl;
      } else {
        finalLogo = logoUrl;
      }
    }
    
    let finalBanner = null;
    if (bannerImg) {
      if (bannerImg.startsWith('data:image')) {
        // Se temos um ID de campanha (salvamento), usamos a API. Se não (preview), mantemos base64 para aparecer na hora.
        finalBanner = campaignId ? `${systemUrl}/api/img/banner/${campaignId}` : bannerImg;
      } else if (!bannerImg.startsWith('http')) {
        finalBanner = systemUrl + (bannerImg.startsWith('/') ? '' : '/') + bannerImg;
      } else {
        finalBanner = bannerImg;
      }
    }

    const paragraphs = text.split('\n').filter(p => p.trim() !== '');
    const bodyContent = paragraphs.map(p => `
      <tr><td style="padding-bottom:15px; font-family:Arial,sans-serif; font-size:16px; line-height:1.5; color:#374151;">${p}</td></tr>
    `).join('');

    const empresa = settings.empresa || { website: 'www.visualsuper.com.br', endereco: '' };
    const headerColor = settings.landingPage?.headerColor || '#ffffff';
    
    // Configurar o link de rastreamento se for uma campanha salva (tem ID)
    const finalBotaoLink = campaignId 
      ? `${systemUrl}/api/track?type=click&campaignId=${campaignId}&url=${encodeURIComponent(botaoLink || websiteUrl)}`
      : (botaoLink || websiteUrl);

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>${subject}</title>
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; max-width: 100%; }
  
  @media screen and (max-width: 600px) {
    .container { width: 100% !important; max-width: 100% !important; }
    .wrapper { padding: 10px !important; }
    .content-area { padding: 25px 15px !important; }
    .header-area { padding: 20px 15px !important; }
    .footer-area { padding: 20px 15px !important; }
    .responsive-btn { padding: 12px 20px !important; font-size: 14px !important; display: block !important; width: 100% !important; box-sizing: border-box !important; }
  }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif;">
${preheader ? `<div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #f3f4f6; opacity: 0;">${preheader}</div>` : ''}
<div class="wrapper" style="background-color:#f3f4f6; padding:20px; font-family:Arial,sans-serif; width:100%; box-sizing: border-box;">
  <table class="container" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background-color:#ffffff; border-radius:8px; overflow:hidden; border-top: 6px solid ${brandColor}; margin: 0 auto;">
    ${finalLogo ? `
    <tr>
      <td class="header-area" align="center" style="padding:30px 20px; background-color:${headerColor};">
        <img src="${finalLogo}" alt="${brandName}" width="180" style="display:block; border:0; max-width: 100%;">
      </td>
    </tr>` : `<tr><td class="header-area" align="center" style="padding:20px; font-size:24px; font-weight:bold; color:${brandColor}; background-color:${headerColor};">${brandName}</td></tr>`}
    
    ${finalBanner ? `
    <tr>
      <td align="center">
        <img src="${finalBanner}" alt="Banner" width="600" style="width:100%; display:block; border:0; max-width: 100%;">
      </td>
    </tr>` : ''}

    <tr>
      <td class="content-area" style="padding:40px 30px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          ${bodyContent}
          <tr>
            <td align="center" style="padding:30px 0;">
              <a href="${finalBotaoLink}" class="responsive-btn" style="background-color:${brandColor}; color:#ffffff; padding:15px 35px; text-decoration:none; border-radius:50px; font-weight:bold; display:inline-block;">${botaoTexto || 'Acesse os detalhes agora'}</a>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #e5e7eb; padding-top:20px; font-weight:bold; color:#111827;">
              Conte com a ${senderName}! 💙
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td class="footer-area" align="center" style="padding:30px; background-color:#f9fafb; font-size:12px; color:#6b7280; line-height:1.5;">
        <p style="margin-bottom:10px;"><strong>NOSSAS REDES SOCIAIS</strong></p>
        <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom:20px;" align="center">
          <tr>
            <td style="padding:0 10px;"><a href="${empresa.facebook || '#'}"><img src="https://cdn-icons-png.flaticon.com/32/733/733547.png" width="24" alt="Facebook"></a></td>
            <td style="padding:0 10px;"><a href="${empresa.instagram || '#'}"><img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" width="24" alt="Instagram"></a></td>
            <td style="padding:0 10px;"><a href="${empresa.linkedin || '#'}"><img src="https://cdn-icons-png.flaticon.com/32/145/145807.png" width="24" alt="LinkedIn"></a></td>
          </tr>
        </table>
        <p style="margin: 0;">${empresa.endereco}</p>
        <p style="margin-top:15px; margin-bottom: 0;">Enviado por <a href="${websiteUrl}" style="color:${brandColor}; text-decoration:none;">${empresa.website}</a></p>
        <p style="font-size:10px; margin-top:20px; margin-bottom: 0;">Para parar de receber, <a href="#" style="color:#6b7280;">clique aqui</a>.</p>
      </td>
    </tr>
  </table>
</div>
${campaignId ? `<img src="${systemUrl}/api/track?type=open&campaignId=${campaignId}" width="1" height="1" alt="" style="display:none;" />` : ''}
</body>
</html>
    `.trim();
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      alert("A imagem de destaque é muito grande! Por favor, use uma de até 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewCampaign(prev => ({ ...prev, bannerImg: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateIA = () => {
    if (!newCampaign.assunto) {
      alert("Por favor, digite um assunto primeiro para que a IA possa se basear nele.");
      return;
    }

    setIsGeneratingIA(true);
    
    // Simulação de IA (Gera um texto persuasivo baseado no assunto)
    setTimeout(async () => {
      const subject = newCampaign.assunto;
      const settings = await api.getSettings();
      const aiText = `Olá {{nome}},\n\nEstou entrando em contato pois percebi seu interesse em "${subject}".\n\nNa ${settings.landingPage?.titulo || 'nossa empresa'}, focamos em entregar o melhor resultado para nossos clientes...`;
      
      setNewCampaign(prev => ({ ...prev, textoSimples: aiText }));
      setIsGeneratingIA(false);
    }, 1500);
  };

  const handleConvertToHTML = async () => {
    const html = await generateProfessionalHTML(
      newCampaign.textoSimples, 
      newCampaign.assunto, 
      newCampaign.bannerImg, 
      newCampaign.id || editingId || Math.random().toString(36).substr(2, 9), 
      newCampaign.botaoTexto, 
      newCampaign.botaoLink, 
      newCampaign.preheader
    );
    setNewCampaign(prev => ({ ...prev, conteudoHtml: html }));
    setViewMode('html');
  };

  const injectTrackingToHTML = (html: string, campaignId: string, systemUrl: string) => {
    let finalHtml = html;

    // 1. Atualizar IDs de campanhas antigas/duplicadas nos links de rastreamento existentes
    finalHtml = finalHtml.replace(/(\/api\/track\?[^"'\s>]*campaignId=)[^&"'\s>]+/gi, `$1${campaignId}`);

    // 2. Envelopar links externos em links de rastreamento de cliques (evitando os já rastreados)
    finalHtml = finalHtml.replace(/href=(["'])(https?:\/\/[^"'\s>]+)\1/gi, (match, quote, url) => {
      if (url.includes('/api/track')) {
        return match;
      }
      return `href=${quote}${systemUrl}/api/track?type=click&campaignId=${campaignId}&url=${encodeURIComponent(url)}${quote}`;
    });

    // 3. Inserir pixel de abertura se não existir
    if (!finalHtml.includes('/api/track?type=open') && !finalHtml.includes('/api/track?type=open'.replace(/\?/g, '%3F'))) {
      const pixelTag = `<img src="${systemUrl}/api/track?type=open&campaignId=${campaignId}" width="1" height="1" alt="" style="display:none;" />`;
      if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${pixelTag}</body>`);
      } else {
        finalHtml = finalHtml + pixelTag;
      }
    }

    return finalHtml;
  };

  const handleCreate = async () => {
    const isEditing = !!editingId;
    const newCampaignId = newCampaign.id || editingId || Math.random().toString(36).substr(2, 9);
    
    // Se o HTML estiver vazio mas o texto não, gera um automático antes de salvar
    let finalHtml = newCampaign.conteudoHtml;
    if (!finalHtml && newCampaign.textoSimples) {
      finalHtml = await generateProfessionalHTML(newCampaign.textoSimples, newCampaign.assunto, newCampaign.bannerImg, newCampaignId, newCampaign.botaoTexto, newCampaign.botaoLink, newCampaign.preheader);
    } else if (finalHtml && newCampaign.bannerImg && newCampaign.bannerImg.startsWith('data:image')) {
      // Se o usuário clicou em "Transformar em HTML" antes, o HTML tem o base64 chumbado. Precisamos regenerar com a URL da API.
      finalHtml = await generateProfessionalHTML(newCampaign.textoSimples, newCampaign.assunto, newCampaign.bannerImg, newCampaignId, newCampaign.botaoTexto, newCampaign.botaoLink, newCampaign.preheader);
    }

    // Injeta/atualiza o rastreamento no HTML final (seja gerado ou colado manualmente)
    if (finalHtml) {
      const settings = await api.getSettings();
      const websiteUrl = (settings.empresa?.website || '').startsWith('http') ? (settings.empresa?.website || '') : 'https://' + (settings.empresa?.website || 'www.visualsuper.com.br');
      const systemUrl = typeof window !== 'undefined' ? window.location.origin : websiteUrl;
      finalHtml = injectTrackingToHTML(finalHtml, newCampaignId, systemUrl);
    }

    const existingCampaign = isEditing ? campaigns.find(c => c.id === editingId) : null;

    const campaign: Campaign = {
      ...existingCampaign,
      id: newCampaignId,
      ...newCampaign,
      conteudoHtml: finalHtml,
      dataCriacao: existingCampaign?.dataCriacao || new Date().toISOString(),
      dataAgendada: newCampaign.tipoEnvio === 'agendado' ? newCampaign.dataAgendada : undefined,
      status: newCampaign.tipoEnvio === 'agendado' ? 'agendada' : (existingCampaign?.status || 'rascunho'),
      totalLeads: existingCampaign?.totalLeads || 0,
      totalEnviados: existingCampaign?.totalEnviados || 0,
      totalPendentes: existingCampaign?.totalPendentes || 0,
      totalErro: existingCampaign?.totalErro || 0,
      totalAbertos: existingCampaign?.totalAbertos || 0,
      totalCliques: existingCampaign?.totalCliques || 0,
      whatsappTemplateId: newCampaign.whatsappTemplateId
    } as Campaign;
    
    await api.saveCampaign(campaign);
    setCampaigns(await api.getCampaigns());
    setIsCreating(false);
    setEditingId(null);
    setNewCampaign({ 
      id: '',
      nome: '', 
      assunto: '', 
      preheader: '', 
      conteudoHtml: '', 
      textoSimples: '', 
      bannerImg: '', 
      botaoTexto: '', 
      botaoLink: '', 
      channel: 'email',
      whatsappConnectionId: '',
      whatsappTemplateId: '',
      segmentId: '',
      tipoEnvio: 'imediato', 
      dataAgendada: '' 
    });
  };

  const handleEdit = (campaign: Campaign) => {
    setNewCampaign({
      id: campaign.id,
      nome: campaign.nome,
      assunto: campaign.assunto,
      preheader: campaign.preheader || '',
      conteudoHtml: campaign.conteudoHtml,
      textoSimples: campaign.textoSimples || '',
      bannerImg: campaign.bannerImg || '',
      botaoTexto: campaign.botaoTexto || '',
      botaoLink: campaign.botaoLink || '',
      channel: campaign.channel || 'email',
      whatsappConnectionId: campaign.whatsappConnectionId || '',
      whatsappTemplateId: campaign.whatsappTemplateId || '',
      segmentId: campaign.segmentId || '',
      tipoEnvio: campaign.status === 'agendada' ? 'agendado' : 'imediato',
      dataAgendada: campaign.dataAgendada || ''
    });
    setEditingId(campaign.id);
    setViewMode(campaign.conteudoHtml && !campaign.textoSimples ? 'html' : 'normal');
    setIsCreating(true);
    // Scroll para o topo para ver o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleDuplicate = (campaign: Campaign) => {
    setNewCampaign({
      id: Math.random().toString(36).substr(2, 9),
      nome: `${campaign.nome} (Cópia)`,
      assunto: campaign.assunto,
      preheader: campaign.preheader || '',
      conteudoHtml: campaign.conteudoHtml || '',
      textoSimples: campaign.textoSimples || '',
      bannerImg: campaign.bannerImg || '',
      botaoTexto: campaign.botaoTexto || '',
      botaoLink: campaign.botaoLink || '',
      channel: campaign.channel || 'email',
      whatsappConnectionId: campaign.whatsappConnectionId || '',
      whatsappTemplateId: campaign.whatsappTemplateId || '',
      segmentId: campaign.segmentId || '',
      tipoEnvio: 'imediato',
      dataAgendada: ''
    });
    setEditingId(null);
    setViewMode(campaign.conteudoHtml && !campaign.textoSimples ? 'html' : 'normal');
    setIsCreating(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startCampaign = async (campaign: Campaign) => {
    const allLeads = await api.getLeads();
    let leads = allLeads;
    
    if (campaign.segmentId) {
      const segment = segmentations.find(s => s.id === campaign.segmentId);
      if (segment) {
        leads = allLeads.filter(l => segment.leadIds.includes(l.id));
      }
    }

    const queue = await api.generateQueueForCampaign(campaign.id, leads.map(l => l.id));
    
    const updatedCampaign: Campaign = {
      ...campaign,
      status: 'em execução',
      totalLeads: leads.length,
      totalPendentes: leads.length
    };
    
    await api.saveCampaign(updatedCampaign);
    setCampaigns(await api.getCampaigns());
    
    // Iniciar processamento automaticamente
    handleProcessQueue();
    
    setAlertModal({
      isOpen: true,
      title: 'Disparo Iniciado',
      message: `Sucesso! Fila de envio gerada com ${queue.length} mensagens. O processamento começou.`
    });
  };

  const handleDeleteCampaign = (id: string, nome: string) => {
    setDeleteConfirm({
      isOpen: true,
      campaignId: id,
      campaignNome: nome
    });
  };

  const confirmDeleteCampaign = async () => {
    const { campaignId } = deleteConfirm;
    await api.deleteCampaign(campaignId);
    setCampaigns(await api.getCampaigns());
    setDeleteConfirm({ isOpen: false, campaignId: '', campaignNome: '' });
  };

  const handleProcessQueue = async () => {
    setIsProcessingQueue(true);
    setProcessMessage('Iniciando processamento...');
    try {
      const response = await fetch('/api/queue/process', { method: 'POST' });
      const result = await response.json();
      setProcessMessage(result.message);
      
      // Atualizar a lista de campanhas para refletir envios
      setCampaigns(await api.getCampaigns());
      
      // Esconder a mensagem após alguns segundos se foi sucesso
      if (result.success) {
        setTimeout(() => {
          setIsProcessingQueue(false);
          setProcessMessage('');
        }, 5000);
      } else {
        setTimeout(() => {
          setIsProcessingQueue(false);
          setProcessMessage('');
        }, 5000);
      }
    } catch (error: any) {
      alert('Erro ao processar fila: ' + error.message);
      setIsProcessingQueue(false);
      setProcessMessage('');
    }
  };

  return (
    <div>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Gerenciamento de Campanhas</h2>
          <p style={{ opacity: 0.6 }}>Crie e monitore seus envios em massa via E-mail e WhatsApp.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isProcessingQueue && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--success)', color: 'white', padding: '0.5rem 1rem', borderRadius: '50px', fontSize: '0.875rem' }}>
              <div style={{ width: '14px', height: '14px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              {processMessage || 'Processando...'}
            </div>
          )}
          <button 
            className="btn btn-outline" 
            onClick={handleProcessQueue}
            disabled={isProcessingQueue}
            style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
          >
            <Clock size={18} /> {isProcessingQueue ? 'Processando...' : 'Processar Fila'}
          </button>
          <button className="btn btn-primary" onClick={() => {
            setNewCampaign({
              id: Math.random().toString(36).substr(2, 9),
              nome: '',
              assunto: '',
              preheader: '',
              conteudoHtml: '',
              textoSimples: '',
              bannerImg: '',
              botaoTexto: '',
              botaoLink: '',
              channel: 'email',
              whatsappConnectionId: '',
              whatsappTemplateId: '',
              segmentId: '',
              tipoEnvio: 'imediato',
              dataAgendada: ''
            });
            setEditingId(null);
            setIsCreating(true);
          }}>
            <Plus size={18} /> Nova Campanha
          </button>
        </div>
      </header>

      {isCreating && (
        <div className="card" style={{ marginBottom: '2.5rem', border: '2px solid var(--primary)' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem' }}>{editingId ? 'Editar Campanha' : 'Nova Campanha Profissional'}</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="btn-group" style={{ display: 'flex', background: 'var(--accent)', padding: '4px', borderRadius: '8px' }}>
                <button 
                  className={`btn ${newCampaign.channel === 'email' ? 'btn-primary' : ''}`} 
                  style={{ height: '32px', fontSize: '0.8rem', padding: '0 1rem' }}
                  onClick={() => setNewCampaign({...newCampaign, channel: 'email'})}
                >
                  <Send size={14} /> E-mail
                </button>
                <button 
                  className={`btn ${newCampaign.channel === 'whatsapp' ? 'btn-primary' : ''}`} 
                  style={{ height: '32px', fontSize: '0.8rem', padding: '0 1rem' }}
                  onClick={() => setNewCampaign({...newCampaign, channel: 'whatsapp'})}
                >
                  <Smartphone size={14} /> WhatsApp
                </button>
              </div>
              <div className="btn-group" style={{ display: 'flex', background: 'var(--accent)', padding: '4px', borderRadius: '8px' }}>
                 <button 
                   className={`btn ${viewMode === 'normal' ? 'btn-primary' : ''}`} 
                   style={{ height: '32px', fontSize: '0.8rem', padding: '0 1rem' }}
                   onClick={() => setViewMode('normal')}
                 >
                   <Type size={14} /> Normal
                 </button>
                 <button 
                   className={`btn ${viewMode === 'html' ? 'btn-primary' : ''}`} 
                   style={{ height: '32px', fontSize: '0.8rem', padding: '0 1rem' }}
                   onClick={() => setViewMode('html')}
                   disabled={newCampaign.channel === 'whatsapp'}
                 >
                   <Code size={14} /> HTML
                 </button>
              </div>
            </div>
          </header>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Identificação da Campanha</label>
                <input 
                  type="text" 
                  className="btn-outline" 
                  style={{ width: '100%', height: '42px', padding: '0 1rem' }} 
                  placeholder="Ex: Oferta Black Friday"
                  value={newCampaign.nome}
                  onChange={e => setNewCampaign({...newCampaign, nome: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Público Alvo (Segmentação)</label>
                <select 
                  className="btn-outline" 
                  style={{ width: '100%', height: '42px', padding: '0 1rem', background: 'white' }}
                  value={newCampaign.segmentId}
                  onChange={e => setNewCampaign({...newCampaign, segmentId: e.target.value})}
                >
                  <option value="">Todos os Leads</option>
                  {segmentations.map(seg => (
                    <option key={seg.id} value={seg.id}>{seg.nome} ({seg.leadIds?.length || 0} leads)</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>{newCampaign.channel === 'email' ? 'Assunto do E-mail' : 'Título da Campanha'}</label>
                <input 
                  type="text" 
                  className="btn-outline" 
                  style={{ width: '100%', height: '42px', padding: '0 1rem' }} 
                  placeholder={newCampaign.channel === 'email' ? "Ex: Você não pode perder essa!" : "Ex: Promoção Exclusiva WhatsApp"}
                  value={newCampaign.assunto}
                  onChange={e => setNewCampaign({...newCampaign, assunto: e.target.value})}
                />
              </div>
            </div>

            {newCampaign.channel === 'whatsapp' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Conexão WhatsApp</label>
                  <select 
                    required
                    className="btn-outline" 
                    style={{ width: '100%', height: '44px', padding: '0 1rem' }}
                    value={newCampaign.whatsappConnectionId}
                    onChange={(e) => setNewCampaign({...newCampaign, whatsappConnectionId: e.target.value})}
                  >
                    <option value="">Selecione uma conexão...</option>
                    {whatsappConnections.map(conn => (
                      <option key={conn.id} value={conn.id}>{conn.name} ({conn.type === 'meta_official' ? 'Meta' : 'Evolution'})</option>
                    ))}
                  </select>
                </div>
                {whatsappConnections.find(c => c.id === newCampaign.whatsappConnectionId)?.type === 'meta_official' && (
                  <div>
                    <label className="label">Modelo (Template)</label>
                    <select 
                      required
                      className="btn-outline" 
                      style={{ width: '100%', height: '44px', padding: '0 1rem' }}
                      value={newCampaign.whatsappTemplateId}
                      onChange={(e) => {
                        const tplId = e.target.value;
                        const tpl = whatsappTemplates.find(t => t.id === tplId);
                        setNewCampaign({
                          ...newCampaign, 
                          whatsappTemplateId: tplId,
                          textoSimples: tpl?.content || newCampaign.textoSimples
                        });
                      }}
                    >
                      <option value="">Selecione um modelo aprovado...</option>
                      {whatsappTemplates.filter(t => t.connectionId === newCampaign.whatsappConnectionId).map(tpl => (
                        <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Preheader (Opcional)</label>
                <input 
                  type="text" 
                  className="btn-outline" 
                  style={{ width: '100%', height: '42px', padding: '0 1rem' }} 
                  placeholder="Texto curto que aparece após o assunto"
                  value={newCampaign.preheader}
                  onChange={e => setNewCampaign({...newCampaign, preheader: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Imagem de Destaque (Banner)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="file" 
                    accept="image/*"
                    id="banner-upload"
                    style={{ display: 'none' }} 
                    onChange={handleBannerUpload}
                  />
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: 1, height: '42px', display: 'flex', gap: '0.5rem', justifyContent: 'center', background: newCampaign.bannerImg ? 'rgba(16, 185, 129, 0.1)' : 'transparent' }}
                    onClick={() => document.getElementById('banner-upload')?.click()}
                  >
                    <Plus size={16} /> {newCampaign.bannerImg ? 'Trocar Imagem' : 'Escolher Banner'}
                  </button>
                  {newCampaign.bannerImg && (
                    <div style={{ width: '42px', height: '42px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <img src={newCampaign.bannerImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Tipo de Envio</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', background: newCampaign.tipoEnvio === 'imediato' ? 'rgba(99, 102, 241, 0.05)' : 'transparent', borderColor: newCampaign.tipoEnvio === 'imediato' ? 'var(--primary)' : 'var(--border)' }}>
                    <input type="radio" name="tipoEnvio" checked={newCampaign.tipoEnvio === 'imediato'} onChange={() => setNewCampaign({...newCampaign, tipoEnvio: 'imediato'})} />
                    <span style={{ fontSize: '0.875rem' }}>Enviar Agora</span>
                  </label>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', background: newCampaign.tipoEnvio === 'agendado' ? 'rgba(99, 102, 241, 0.05)' : 'transparent', borderColor: newCampaign.tipoEnvio === 'agendado' ? 'var(--primary)' : 'var(--border)' }}>
                    <input type="radio" name="tipoEnvio" checked={newCampaign.tipoEnvio === 'agendado'} onChange={() => setNewCampaign({...newCampaign, tipoEnvio: 'agendado'})} />
                    <span style={{ fontSize: '0.875rem' }}>Agendar</span>
                  </label>
                </div>
              </div>
              {newCampaign.tipoEnvio === 'agendado' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Data e Hora do Início</label>
                  <input 
                    type="datetime-local" 
                    className="btn-outline" 
                    style={{ width: '100%', height: '42px', padding: '0 1rem' }} 
                    value={newCampaign.dataAgendada}
                    onChange={e => setNewCampaign({...newCampaign, dataAgendada: e.target.value})}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Texto do Botão (CTA)</label>
                <input 
                  type="text" 
                  className="btn-outline" 
                  style={{ width: '100%', height: '42px', padding: '0 1rem' }} 
                  placeholder="Ex: Acesse os detalhes agora"
                  value={newCampaign.botaoTexto || ''}
                  onChange={e => setNewCampaign({...newCampaign, botaoTexto: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Link do Botão (URL)</label>
                <input 
                  type="url" 
                  className="btn-outline" 
                  style={{ width: '100%', height: '42px', padding: '0 1rem' }} 
                  placeholder="https://suaempresa.com.br/oferta"
                  value={newCampaign.botaoLink || ''}
                  onChange={e => setNewCampaign({...newCampaign, botaoLink: e.target.value})}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Conteúdo da Mensagem</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ height: '32px', fontSize: '0.75rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                    onClick={handleGenerateIA}
                    disabled={isGeneratingIA}
                  >
                    <Wand2 size={14} /> {isGeneratingIA ? 'Gerando...' : 'Gerar com IA'}
                  </button>
                  {viewMode === 'normal' && (
                    <button 
                      className="btn btn-outline" 
                      style={{ height: '32px', fontSize: '0.75rem' }}
                      onClick={handleConvertToHTML}
                    >
                      <Code size={14} /> Transformar em HTML
                    </button>
                  )}
                  <button 
                    className="btn btn-outline" 
                    style={{ height: '32px', fontSize: '0.75rem' }}
                    onClick={() => setIsPreviewOpen(true)}
                  >
                    <Eye size={14} /> Visualizar
                  </button>
                </div>
              </div>

              {viewMode === 'normal' ? (
                <textarea 
                  className="btn-outline" 
                  style={{ width: '100%', minHeight: '250px', padding: '1.25rem', fontSize: '1rem', lineHeight: '1.6' }} 
                  placeholder="Seja pessoal usando {{nome}}..."
                  value={newCampaign.textoSimples}
                  onChange={e => setNewCampaign({...newCampaign, textoSimples: e.target.value})}
                />
              ) : (
                <textarea 
                  className="btn-outline" 
                  style={{ width: '100%', minHeight: '250px', padding: '1.25rem', fontSize: '0.875rem', fontFamily: 'monospace', background: '#f8fafc' }} 
                  value={newCampaign.conteudoHtml}
                  onChange={e => setNewCampaign({...newCampaign, conteudoHtml: e.target.value})}
                />
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={handleCreate} style={{ padding: '0 2rem' }}>{editingId ? 'Salvar Alterações' : 'Salvar Campanha'}</button>
              <button className="btn btn-outline" onClick={() => { setIsCreating(false); setEditingId(null); setNewCampaign({ id: '', nome: '', assunto: '', preheader: '', conteudoHtml: '', textoSimples: '', bannerImg: '', botaoTexto: '', botaoLink: '', channel: 'email', whatsappConnectionId: '', whatsappTemplateId: '', segmentId: '', tipoEnvio: 'imediato', dataAgendada: '' }); }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Campanhas */}
      <div className="grid grid-cols-2">
        {campaigns.length === 0 && !isCreating && <p style={{ gridColumn: 'span 2', textAlign: 'center', opacity: 0.5, padding: '3rem' }}>Nenhuma campanha criada ainda.</p>}
        {campaigns.map(campaign => (
          <div key={campaign.id} className="card">
            {/* ... o resto do card mantido como original ... */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: campaign.channel === 'whatsapp' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)', color: campaign.channel === 'whatsapp' ? '#22c55e' : 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   {campaign.channel === 'whatsapp' ? <Smartphone size={24} /> : <Send size={24} />}
                </div>
                <div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{campaign.nome}</h4>
                  <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>{campaign.channel === 'email' ? 'Assunto: ' : 'Mensagem: '}{campaign.assunto}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ width: '38px', height: '38px', padding: 0 }}
                  title="Editar Campanha"
                  onClick={() => handleEdit(campaign)}
                  disabled={campaign.status !== 'rascunho' && campaign.status !== 'agendada'}
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ width: '38px', height: '38px', padding: 0 }}
                  title="Duplicar Campanha"
                  onClick={() => handleDuplicate(campaign)}
                >
                  <Copy size={18} />
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ width: '38px', height: '38px', padding: 0 }}
                  title={campaign.channel === 'whatsapp' ? "Visualizar Mensagem" : "Visualizar E-mail"}
                  onClick={() => {
                    if (campaign.channel === 'whatsapp') {
                      alert(`Mensagem do WhatsApp:\n\n${campaign.textoSimples || campaign.assunto}`);
                    } else {
                      setSelectedCampaignHtml(campaign.conteudoHtml);
                      setIsPreviewOpen(true);
                    }
                  }}
                >
                  <Eye size={18} />
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ width: '38px', height: '38px', padding: 0, color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                  title="Excluir Campanha"
                  onClick={() => handleDeleteCampaign(campaign.id, campaign.nome)}
                >
                  <Trash2 size={18} />
                </button>
                <span className={`badge ${
                  campaign.status === 'concluída' ? 'badge-convertido' : 
                  campaign.status === 'em execução' ? 'badge-contatado' : 'badge-novo'
                }`}>
                  {campaign.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                <span>Progresso</span>
                <span>{campaign.totalEnviados} / {campaign.totalLeads}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--accent)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                <div style={{ 
                   width: `${(campaign.totalEnviados / (campaign.totalLeads || 1)) * 100}%`, 
                   height: '100%', 
                   background: 'var(--primary)',
                   transition: 'width 1s ease-in-out'
                }} />
              </div>

              {/* MÉTRICAS DE ENGAJAMENTO */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', background: 'var(--accent)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>
                    <MailOpen size={14} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>Abertos</span>
                  </div>
                  <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{campaign.totalAbertos || 0}</p>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(0,0,0,0.05)', borderRight: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#8b5cf6', marginBottom: '0.25rem' }}>
                    <MousePointerClick size={14} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>Cliques</span>
                  </div>
                  <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{campaign.totalCliques || 0}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--success)', marginBottom: '0.25rem' }}>
                    <BarChart3 size={14} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>Taxa CTR</span>
                  </div>
                  <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                    {campaign.totalAbertos && campaign.totalAbertos > 0 
                      ? ((campaign.totalCliques || 0) / campaign.totalAbertos * 100).toFixed(1)
                      : '0.0'}%
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Pendentes</p>
                    <p style={{ fontWeight: 'bold' }}>{campaign.totalPendentes}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Erros</p>
                    <p style={{ fontWeight: 'bold', color: 'var(--danger)' }}>{campaign.totalErro}</p>
                  </div>
                </div>
                
                {campaign.status === 'rascunho' ? (
                  <button className="btn btn-primary" onClick={() => startCampaign(campaign)}>
                    <Play size={16} /> Iniciar Envio
                  </button>
                ) : (
                  <button className="btn btn-outline" onClick={() => setReportModal(campaign)}>
                    Ver Relatório
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE PREVIEW */}
      {isPreviewOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="card" style={{ width: '90%', maxWidth: '900px', height: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <header style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Eye className="color-primary" />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Pré-visualização do E-mail</h3>
                  <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Assim é como seus leads verão a mensagem.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <button className="btn btn-outline" style={{ width: '40px', padding: 0 }}><Smartphone size={18} /></button>
                 <button className="btn btn-outline" style={{ width: '40px', padding: 0 }}><Monitor size={18} /></button>
                 <button className="btn btn-outline" style={{ width: '40px', padding: 0, marginLeft: '1rem' }} onClick={() => {
                   setIsPreviewOpen(false);
                   setSelectedCampaignHtml(null);
                 }}><X size={18} /></button>
              </div>
            </header>
            
            <div style={{ flex: 1, background: '#f1f5f9', padding: '2rem', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
              <div 
                style={{ width: '100%', maxWidth: '600px' }}
                dangerouslySetInnerHTML={{ 
                  __html: selectedCampaignHtml 
                    ? selectedCampaignHtml 
                    : previewHtml || '<div style="text-align:center; padding: 20px;">Carregando visualização...</div>'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div className="card" style={{ width: '400px', textAlign: 'center' }}>
            <div style={{ color: 'var(--success)', marginBottom: '1rem' }}>
              <CheckCircle2 size={48} style={{ margin: '0 auto' }} />
            </div>
            <h3 style={{ marginBottom: '1rem' }}>{alertModal.title}</h3>
            <p style={{ opacity: 0.7, marginBottom: '2rem' }}>{alertModal.message}</p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}>Entendido</button>
          </div>
        </div>
      )}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (SYSTEM MODAL) */}
      {deleteConfirm.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Trash2 size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#0f172a' }}>Deseja excluir esta campanha?</h3>
            <p style={{ opacity: 0.6, marginBottom: '2rem', lineHeight: '1.5' }}>
              Você está prestes a excluir a campanha <strong style={{ color: '#0f172a' }}>"{deleteConfirm.campaignNome}"</strong>. 
              Esta ação é permanente e removerá todos os dados de envio vinculados a ela.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button 
                className="btn btn-outline" 
                style={{ height: '48px' }}
                onClick={() => setDeleteConfirm({ isOpen: false, campaignId: '', campaignNome: '' })}
              >
                Cancelar
              </button>
              <button 
                className="btn" 
                style={{ height: '48px', background: 'var(--danger)', color: 'white' }}
                onClick={confirmDeleteCampaign}
              >
                Sim, Excluir Campaign
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE RELATÓRIO DE CAMPANHA */}
      {reportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Relatório da Campanha</h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>{reportModal.nome}</p>
              </div>
              <button 
                className="btn btn-outline" 
                style={{ width: '36px', height: '36px', padding: 0 }}
                onClick={() => setReportModal(null)}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                  <MailOpen size={16} /> <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Aberturas Únicas</span>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>{reportModal.totalAbertos || 0}</p>
              </div>
              
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6', marginBottom: '0.5rem' }}>
                  <MousePointerClick size={16} /> <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Cliques no Link</span>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>{reportModal.totalCliques || 0}</p>
              </div>

              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', marginBottom: '0.5rem' }}>
                  <BarChart3 size={16} /> <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Taxa de Clique (CTR)</span>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
                  {reportModal.totalAbertos && reportModal.totalAbertos > 0 
                    ? ((reportModal.totalCliques || 0) / reportModal.totalAbertos * 100).toFixed(1)
                    : '0.0'}%
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-dark)', marginBottom: '0.5rem' }}>
                  <Send size={16} /> <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Total Enviado</span>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>{reportModal.totalEnviados}</p>
              </div>
            </div>

            {reportModal.totalErro > 0 && (
              <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '0.875rem' }}>
                <strong>Atenção:</strong> Houveram {reportModal.totalErro} erros no envio desta campanha. Verifique os logs de erro ou seu limite de e-mails diário.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
