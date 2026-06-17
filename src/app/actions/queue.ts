'use server';

import { FilaEnvio, Campaign, Settings, Lead } from '@/types/crm';
import { sendEmailBrevoAction } from './brevo';
import { sendOmnichannelMessageAction } from './chat';
import { d1Api } from '@/services/d1';

/**
 * Processa a fila de e-mails e whatsapp no servidor.
 * Pode ser chamado via UI ou via Cron Job.
 */
export async function processQueueServerAction() {
  console.log('Iniciando processamento de fila no servidor...');

  try {
    // 1. Buscar Configurações
    const settings = await d1Api.getSettings();
    if (!settings || Object.keys(settings).length === 0) {
      return { success: false, message: 'Configurações não encontradas.' };
    }

    // 2. O processamento das campanhas agendadas pode ser feito
    // mas o getQueue e updateQueue não existem detalhadamente no d1Api,
    // então vamos fazer consultas diretas usando uma função raw se necessário.
    // Mas para manter simples, vamos assumir que apenas a UI gera a fila ao clicar em "Iniciar Envio".
    // Se quisermos agendamento automático, devemos usar runQuery via d1Api (não exportado).
    // Como d1Api é a interface, vamos precisar acessar os métodos existentes.

    const allQueue = await d1Api.getQueue();
    let pendingItems = allQueue.filter(q => q.status === 'pendente' || (q.status === 'erro' && (q.tentativa || 0) < 3));

    // Limite diário
    const dailyConfig = settings.limiteDiario || 280;
    pendingItems = pendingItems.slice(0, dailyConfig);

    if (pendingItems.length === 0) {
      return { success: true, message: 'Nenhum item pendente para processar.' };
    }

    console.log(`Processando ${pendingItems.length} itens na fila...`);

    const campaigns = await d1Api.getCampaigns();
    const leads = await d1Api.getLeads(10000);

    let processedCount = 0;

    for (const item of pendingItems) {
      const campaign = campaigns.find(c => c.id === item.campanhaId);
      if (!campaign) continue;

      const lead = leads.find(l => l.id === item.leadId);
      if (!lead) continue;

      const tentativaAtual = (item.tentativa || 0) + 1;
      let sendResult: { success: boolean; message?: string } = { success: false };

      if (item.channel === 'email') {
        if (!settings.brevoApiKey) {
          sendResult = { success: false, message: 'API Key do Brevo não configurada.' };
        } else {
          const result = await sendEmailBrevoAction({
            apiKey: settings.brevoApiKey,
            sender: { name: settings.remetenteNome || '', email: settings.remetenteEmail || '' },
            to: [{ email: lead.email || item.email || '', name: lead.nome }],
            subject: campaign.assunto,
            htmlContent: campaign.conteudoHtml.replace(/\{\{nome\}\}/g, lead.nome)
          });
          sendResult = { success: result.success, message: result.message };
        }
      } else if (item.channel === 'whatsapp') {
        const targetPhone = lead.celular || lead.telefone || item.telefone;
        if (!targetPhone) {
          sendResult = { success: false, message: 'Lead sem telefone cadastrado.' };
        } else {
          let message = (campaign.textoSimples || campaign.assunto || '').replace(/\{\{nome\}\}/g, lead.nome);
          
          if (campaign.botaoTexto && campaign.botaoLink) {
            let systemUrl = settings.appUrl || 'https://mkt.ciasuper.com.br';
            const trackingLink = `${systemUrl}/api/track?type=click&campaignId=${campaign.id}&url=${encodeURIComponent(campaign.botaoLink)}`;
            message += `\n\n👉 *${campaign.botaoTexto}*\n${trackingLink}`;
          }

          const result = await sendOmnichannelMessageAction(
            targetPhone, 
            'whatsapp', 
            message,
            item.whatsappConnectionId || campaign.whatsappConnectionId,
            item.templateData,
            undefined // Teste: removendo envio de mídia (campaign.bannerImg)
          );
          sendResult = { success: result.success, message: result.error };
        }
      }

      if (sendResult.success) {
        await d1Api.updateQueueItem(item.id, {
          status: 'enviado',
          tentativa: tentativaAtual,
          erroMensagem: ''
        });
        processedCount++;
      } else {
        await d1Api.updateQueueItem(item.id, {
          status: 'erro',
          tentativa: tentativaAtual,
          erroMensagem: sendResult.message || 'Erro desconhecido'
        });
      }

      // Atualizar estatísticas da campanha
      const campData = await d1Api.getCampaigns().then(cs => cs.find(c => c.id === campaign.id));
      if (campData) {
        const totalEnviados = sendResult.success ? (campData.totalEnviados + 1) : campData.totalEnviados;
        const totalPendentes = Math.max(0, campData.totalPendentes - 1);
        const totalErro = (!sendResult.success && tentativaAtual >= 3) ? (campData.totalErro + 1) : campData.totalErro;
        
        await d1Api.updateCampaignStats(campaign.id, {
          totalEnviados,
          totalPendentes,
          totalErro,
          status: totalPendentes === 0 ? 'concluída' : 'em execução'
        });
      }

      // Intervalo entre envios (5s para e-mail, talvez 10s para WhatsApp para evitar ban)
      const delay = item.channel === 'whatsapp' ? 10000 : 5000;
      if (processedCount < pendingItems.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { 
      success: true, 
      message: `Processamento concluído. Verifique os relatórios.` 
    };

  } catch (error: any) {
    console.error('Erro no processador de fila:', error);
    return { success: false, message: error.message };
  }
}

