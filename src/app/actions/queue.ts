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
    let processedCount = 0;

    for (const item of pendingItems) {
      const campaign = campaigns.find(c => c.id === item.campanhaId);
      if (!campaign) continue;

      // Buscar o lead específico do banco D1 por ID para performance ultra rápida sem estourar memória do D1
      const { results: leadRes } = await d1Api.runQuery(`SELECT * FROM leads WHERE id = ? LIMIT 1`, [item.leadId]);
      const lead = leadRes?.[0];
      if (!lead) continue;

      const tentativaAtual = (item.tentativa || 0) + 1;
      let sendResult: { success: boolean; message?: string } = { success: false };

      if (item.channel === 'email') {
        if (!settings.brevoApiKey) {
          sendResult = { success: false, message: 'API Key do Brevo não configurada.' };
        } else {
          const senderName = settings.remetenteNome || settings.empresa?.nome || 'Visual Super';
          const senderEmail = settings.remetenteEmail || 'contato@visualsuper.com.br';
          const targetEmail = lead.email || item.email || '';

          if (!targetEmail) {
            sendResult = { success: false, message: 'Lead sem e-mail cadastrado.' };
          } else {
            const result = await sendEmailBrevoAction({
              apiKey: settings.brevoApiKey,
              sender: { name: senderName, email: senderEmail },
              to: [{ email: targetEmail, name: lead.nome || 'Cliente' }],
              subject: campaign.assunto,
              htmlContent: campaign.conteudoHtml.replace(/\{\{nome\}\}/g, lead.nome || 'Cliente')
            });
            sendResult = { success: result.success, message: result.message };
          }
        }
      } else if (item.channel === 'whatsapp') {
        const targetPhone = lead.celular || lead.telefone || item.telefone;
        if (!targetPhone) {
          sendResult = { success: false, message: 'Lead sem telefone cadastrado.' };
        } else {
          // Montar o link de rastreamento com parâmetros UTM limpos e legíveis
          let message = (campaign.textoSimples || campaign.assunto || '').replace(/\{\{nome\}\}/g, lead.nome || 'Cliente');
          
          if (campaign.botaoTexto && campaign.botaoLink) {
            let systemUrl = typeof window !== 'undefined' ? window.location.origin : (settings.appUrl || 'https://leads.ciasuper.com.br');
            
            // Garantir UTMs claras e legíveis (utm_source=whatsapp, utm_medium=campanha, utm_campaign=nome_limpo)
            const cleanCampName = (campaign.nome || 'campanha').toLowerCase().replace(/[^a-z0-9]+/g, '_');
            let targetUrl = campaign.botaoLink;
            if (!targetUrl.includes('utm_source')) {
              const separator = targetUrl.includes('?') ? '&' : '?';
              targetUrl += `${separator}utm_source=whatsapp&utm_medium=campanha&utm_campaign=${encodeURIComponent(cleanCampName)}`;
            }

            const trackingLink = `${systemUrl}/api/track?type=click&campaignId=${campaign.id}&url=${encodeURIComponent(targetUrl)}`;
            message += `\n\n👉 *${campaign.botaoTexto}*\n${trackingLink}`;
          }

          const result = await sendOmnichannelMessageAction(
            targetPhone, 
            'whatsapp', 
            message,
            item.whatsappConnectionId || campaign.whatsappConnectionId,
            item.templateData,
            undefined
          );
          sendResult = { success: result.success, message: result.error };

          // Se enviou com sucesso no WhatsApp, abre/atualiza a conversa no módulo de Atendimento
          if (result.success) {
            try {
              let cleanPhone = targetPhone.replace(/\D/g, '');
              if (cleanPhone.length === 10 || cleanPhone.length === 11) cleanPhone = '55' + cleanPhone;
              const chatId = `whatsapp_${cleanPhone}`;

              await d1Api.saveChatSession({
                id: chatId,
                leadId: lead.id,
                leadName: lead.nome || 'Lead WhatsApp',
                leadAvatar: null,
                channel: 'whatsapp',
                connectionId: item.whatsappConnectionId || campaign.whatsappConnectionId || null,
                connectionName: 'WhatsApp Marketing',
                lastMessage: `[Campanha: ${campaign.nome}] ${campaign.assunto || 'Mensagem enviada'}`,
                lastTimestamp: new Date().toISOString(),
                unreadCount: 0,
                status: 'active',
                dataCriacao: new Date().toISOString(),
                isInternal: false
              });

              await d1Api.saveChatMessage({
                id: `msg_camp_${Math.random().toString(36).substr(2, 9)}`,
                chatId: chatId,
                leadId: lead.id,
                senderId: 'atendente_admin',
                senderName: 'Sistema (Campanha)',
                content: message,
                timestamp: new Date().toISOString(),
                isIncoming: false,
                channel: 'whatsapp'
              });
            } catch (chatErr) {
              console.error('Erro ao registrar conversa no Atendimento:', chatErr);
            }
          }
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

