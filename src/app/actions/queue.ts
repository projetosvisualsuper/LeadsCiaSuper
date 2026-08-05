'use server';

import { FilaEnvio, Campaign, Settings, Lead } from '@/types/crm';
import { sendEmailBrevoAction } from './brevo';
import { sendOmnichannelMessageAction } from './chat';
import { d1Api } from '@/services/d1';
import { isBusinessHours } from '@/lib/business-hours';

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
    const startTime = Date.now();
    const nowIso = new Date().toISOString();
    const MAX_RUN_TIME_MS = 22000; // 22 segundos (evita timeout de 30s do Cloudflare Workers)

    for (const item of pendingItems) {
      // Interromper de forma segura se estiver próximo do tempo limite de execução do servidor
      if (Date.now() - startTime > MAX_RUN_TIME_MS) {
        console.log(`[Queue] Tempo limite atingido (${Math.round((Date.now() - startTime)/1000)}s). Finalizando este lote com ${processedCount} itens processados.`);
        return {
          success: true,
          hasMore: true,
          processedCount,
          message: `Lote de ${processedCount} envios processado. Restam itens pendentes.`
        };
      }

      // Pular se tiver dataAgendada no futuro
      if (item.dataAgendada && item.dataAgendada > nowIso) {
        continue;
      }

      // Tratar Notificações Automáticas de Pedido (Bling)
      if (item.campanhaId === 'bling_notification') {
        if (!isBusinessHours()) {
          console.log('[Queue] Notificação do Bling ignorada neste ciclo: fora do horário comercial.');
          continue;
        }

        const { results: leadRes } = await d1Api.runQuery(`SELECT * FROM leads WHERE id = ? LIMIT 1`, [item.leadId]);
        const lead = leadRes?.[0];
        const targetPhone = lead?.celular || lead?.telefone || item.telefone;

        if (!targetPhone) {
          await d1Api.updateQueueItem(item.id, { status: 'erro', erro: 'Lead sem telefone cadastrado' });
          continue;
        }

        let customData: any = {};
        try {
          if (item.templateDataJson) customData = JSON.parse(item.templateDataJson);
        } catch (e) {}

        const msgText = customData.customMessage || `Olá, *${lead?.nome || 'Cliente'}*! Seu pedido *#${customData.orderNumber || ''}* foi enviado com sucesso! 🚀\n\nVocê pode acompanhar a entrega e rastrear seu pedido através do nosso portal:\n🔗 https://portal.visualsuper.com.br\n\nObrigado pela confiança! 😊`;

        const cleanPhone = targetPhone.replace(/\D/g, '');
        let result: any;

        if (settings.bling?.templateName) {
          result = await sendOmnichannelMessageAction(
            cleanPhone,
            'whatsapp',
            msgText,
            item.whatsappConnectionId,
            {
              name: settings.bling.templateName,
              language: settings.bling.templateLanguage || 'pt_BR',
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: lead?.nome || 'Cliente' },
                    { type: "text", text: customData.orderNumber || '' }
                  ]
                }
              ]
            }
          );
        } else {
          result = await sendOmnichannelMessageAction(cleanPhone, 'whatsapp', msgText, item.whatsappConnectionId);
        }

        if (result && result.success) {
          await d1Api.updateQueueItem(item.id, { status: 'enviado', dataEnvio: new Date().toISOString() });
          processedCount++;
          if (customData.pedidoId) {
            const formattedNow = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            await d1Api.executeRun(
              `UPDATE pedidos SET observacao = COALESCE(observacao, '') || ? WHERE id = ?`,
              [`\n[WHATSAPP NOTIFICAÇÃO AGENDADA ENVIADA] Mensagem de envio enviada com SUCESSO no horário comercial para +${cleanPhone} em ${formattedNow}.`, customData.pedidoId]
            );
          }
        } else {
          const tentativaAtual = (item.tentativa || 0) + 1;
          const status = tentativaAtual >= 3 ? 'erro' : 'pendente';
          await d1Api.updateQueueItem(item.id, { status, tentativa: tentativaAtual, erro: result?.error || 'Erro no envio' });
        }
        continue;
      }

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

      // Atualizar estatísticas da campanha com contagem real do banco
      try {
        const { results: qStats } = await d1Api.runQuery(
          `SELECT 
            SUM(CASE WHEN status = 'enviado' THEN 1 ELSE 0 END) as enviados,
            SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
            SUM(CASE WHEN status = 'erro' AND tentativa >= 3 THEN 1 ELSE 0 END) as erros
           FROM queue WHERE campanhaId = ?`,
          [campaign.id]
        );
        if (qStats && qStats.length > 0) {
          const enviados = Number(qStats[0].enviados || 0);
          const pendentes = Number(qStats[0].pendentes || 0);
          const erros = Number(qStats[0].erros || 0);
          
          await d1Api.updateCampaignStats(campaign.id, {
            totalEnviados: enviados,
            totalPendentes: pendentes,
            totalErro: erros,
            status: pendentes === 0 ? 'concluída' : 'em execução'
          });
        }
      } catch (statsErr) {
        console.error('Erro ao atualizar estatísticas da campanha:', statsErr);
      }

      // Intervalo entre envios seguro para entregabilidade e prevenção de bloqueios (1.2s para e-mail Brevo, 3.5s para WhatsApp)
      const delay = item.channel === 'whatsapp' ? 3500 : 1200;
      if (processedCount < pendingItems.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { 
      success: true, 
      hasMore: false,
      processedCount,
      message: `Processamento de ${processedCount} itens concluído com sucesso.` 
    };

  } catch (error: any) {
    console.error('Erro no processador de fila:', error);
    return { success: false, message: error.message };
  }
}

