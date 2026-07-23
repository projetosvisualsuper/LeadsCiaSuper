import { d1Api } from './d1';
import { sendOmnichannelMessageAction } from '@/app/actions/chat';
import { Lead } from '@/types/crm';

export const runtime = 'edge';

interface AutomationConditions {
  tags?: string[];
  noTags?: string[];
  vendaMin?: number;
  vendaMax?: number;
  origem?: string[]; // Entry channels (whatsapp, instagram, bling, site, etc.)
  utms?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  };
}

export const automationEngine = {
  /**
   * Avalia e executa automações de pipeline para um lead e evento específicos.
   */
  processLeadAutomation: async (
    leadId: string,
    currentStage: string,
    eventType: 'quando_criado' | 'mensagem_entrada' | 'tempo_inatividade' | 'agendado',
    incomingMessage?: string
  ): Promise<void> => {
    try {
      // 1. Buscar o lead completo no D1
      const { results: leadResults } = await d1Api.runQuery(`SELECT * FROM leads WHERE id = ? LIMIT 1`, [leadId]);
      const lead = leadResults && leadResults.length > 0 ? leadResults[0] as Lead : null;
      if (!lead) return;

      // Se for mensagem de entrada, pula automações se o lead já tiver consultor atribuído em chat ou oportunidade ativa
      if (eventType === 'mensagem_entrada') {
        const { results: chatResults } = await d1Api.runQuery(
          `SELECT assignedTo FROM chats WHERE leadId = ? AND assignedTo IS NOT NULL AND assignedTo != '' LIMIT 1`,
          [leadId]
        );
        if (chatResults && chatResults.length > 0) {
          console.log(`[BOT] Lead ${leadId} já possui consultor no chat (${chatResults[0].assignedTo}). Ignorando automação.`);
          return;
        }

        const { results: oppResults } = await d1Api.runQuery(
          `SELECT assignedTo FROM opportunities WHERE leadId = ? AND assignedTo IS NOT NULL AND assignedTo != '' AND status != 'perdida' AND status != 'ganha' AND status != 'arquivada' LIMIT 1`,
          [leadId]
        );
        if (oppResults && oppResults.length > 0) {
          console.log(`[BOT] Lead ${leadId} já possui consultor na oportunidade (${oppResults[0].assignedTo}). Ignorando automação.`);
          return;
        }
      }

      // 2. Buscar todas as automações ativas para o canal atual e também para 'all_channels' (todos os canais)
      const automations = await d1Api.getPipelineAutomations(currentStage);
      const activeAutomations = automations.filter(a => a.ativo === 1 && a.tipoGatilho === eventType);

      if (currentStage !== 'all_channels') {
        try {
          const allChannelsAutos = await d1Api.getPipelineAutomations('all_channels');
          const activeAllChannelsAutos = allChannelsAutos.filter(a => a.ativo === 1 && a.tipoGatilho === eventType);
          activeAutomations.push(...activeAllChannelsAutos);
        } catch (e) {
          console.error('Erro ao buscar automações gerais para all_channels:', e);
        }
      }

      for (const auto of activeAutomations) {
        // 3. Avaliar as condições da automação
        let matches = true;
        try {
          const conds: AutomationConditions = JSON.parse(auto.condicoesJson || '{}');

          // Filtro por canal de entrada (origem)
          if (conds.origem && conds.origem.length > 0) {
            const leadOrigem = lead.origem ? lead.origem.toLowerCase() : '';
            const matchOrigem = conds.origem.some(o => leadOrigem.includes(o.toLowerCase()));
            if (!matchOrigem) matches = false;
          }

          // Filtro por tags
          if (matches && conds.tags && conds.tags.length > 0) {
            const leadTags = Array.isArray(lead.tags) ? lead.tags : [];
            const hasAllTags = conds.tags.every(t => leadTags.includes(t));
            if (!hasAllTags) matches = false;
          }

          // Filtro por "Sem tags" (noTags)
          if (matches && conds.noTags && conds.noTags.length > 0) {
            const leadTags = Array.isArray(lead.tags) ? lead.tags : [];
            const hasAnyForbiddenTag = conds.noTags.some(t => leadTags.includes(t));
            if (hasAnyForbiddenTag) matches = false;
          }

          // Filtro por Valor de Venda (faturamento)
          if (matches && (conds.vendaMin !== undefined || conds.vendaMax !== undefined)) {
            const faturamento = lead.faturamento || 0;
            if (conds.vendaMin !== undefined && faturamento < conds.vendaMin) matches = false;
            if (conds.vendaMax !== undefined && faturamento > conds.vendaMax) matches = false;
          }

          // Filtro por UTMs
          if (matches && conds.utms) {
            if (conds.utms.utm_source && lead.utm_source !== conds.utms.utm_source) matches = false;
            if (conds.utms.utm_medium && lead.utm_medium !== conds.utms.utm_medium) matches = false;
            if (conds.utms.utm_campaign && lead.utm_campaign !== conds.utms.utm_campaign) matches = false;
          }
        } catch (e) {
          console.error(`Erro ao analisar condições da automação ${auto.id}:`, e);
          matches = false;
        }

        // Se o lead não atende as condições, pula esta automação
        if (!matches) continue;

        // 4. Executar Ações Simples Diretas
        
        // Ação: Adicionar Tags
        if (auto.adicionarTags) {
          const tagsToAdd = auto.adicionarTags.split(',').map((t: string) => t.trim()).filter(Boolean);
          if (tagsToAdd.length > 0) {
            const currentTags = Array.isArray(lead.tags) ? lead.tags : [];
            const newTags = Array.from(new Set([...currentTags, ...tagsToAdd]));
            await d1Api.executeRun(`UPDATE leads SET tags = ? WHERE id = ?`, [JSON.stringify(newTags), lead.id]);
          }
        }

        // Ação: Atribuir Usuário
        if (auto.atribuirUsuarioId) {
          const targetUser = await d1Api.getUserProfile(auto.atribuirUsuarioId);
          if (targetUser && targetUser.absenceEnabled === 1) {
            console.log(`[AUTOMATION] Consultor ${auto.atribuirUsuarioId} está ausente. Não atribuindo lead.`);
          } else {
            // Atualiza o lead e também a atribuição de chat/oportunidade
            await d1Api.executeRun(`UPDATE chats SET assignedTo = ? WHERE leadId = ?`, [auto.atribuirUsuarioId, lead.id]);
            await d1Api.executeRun(`UPDATE opportunities SET assignedTo = ? WHERE leadId = ?`, [auto.atribuirUsuarioId, lead.id]);
            await d1Api.syncChatConnectionWithAssignedUser(lead.id, auto.atribuirUsuarioId);
          }
        }

        // Ação: Alterar Etapa do Lead
        if (auto.alterarEtapaPara) {
          await d1Api.executeRun(`UPDATE opportunities SET status = ? WHERE leadId = ?`, [auto.alterarEtapaPara, lead.id]);
        }

        if (auto.salesbotId) {
          await automationEngine.runSalesbot(
            auto.salesbotId,
            lead,
            auto.destinatarioTipo,
            auto.whatsappConnectionId || undefined,
            auto.deixarSemResposta === 1,
            incomingMessage
          );
        }
      }
    } catch (err) {
      console.error('Erro ao processar automações de pipeline:', err);
    }
  },

  /**
   * Executa a lógica de um robô/salesbot na API do banco de dados D1.
   */
  runSalesbot: async (
    botId: string,
    lead: Lead,
    destinatarioTipo: string,
    connectionId?: string,
    deixarSemResposta?: boolean,
    incomingMessage?: string
  ): Promise<void> => {
    try {
      const bot = await d1Api.getBotById(botId);
      if (!bot) return;

      const nodes = JSON.parse(bot.nodesJson || '[]');
      const edges = JSON.parse(bot.edgesJson || '[]');

      // Encontrar o nó inicial (geralmente tipo 'trigger')
      const triggerNode = nodes.find((n: any) => n.type === 'trigger');
      if (!triggerNode) return;

      // Validar canal de entrada se configurado no gatilho
      if (triggerNode.data) {
        const triggerChannel = triggerNode.data.channel || 'all';
        if (triggerChannel !== 'all') {
          const leadOrigem = (lead.origem || '').toLowerCase();
          const matchesChannel = leadOrigem.includes(triggerChannel.toLowerCase());
          if (!matchesChannel) {
            console.log(`[Salesbot] Canal do lead "${lead.origem}" não corresponde ao canal do gatilho "${triggerChannel}". Pulando bot "${bot.name}".`);
            return;
          }
        }
      }

      // Throttle: evitar que o bot rode novamente para o mesmo lead dentro de 5 minutos
      // Isso impede que respostas do lead re-disparem o bot antes de completar o fluxo
      const throttleKey = `bot_last_run_${botId}_${lead.id}`;
      const throttleQuery = await d1Api.runQuery(
        `SELECT valueJson FROM settings WHERE key = ? LIMIT 1`, 
        [throttleKey]
      );
      const now = Date.now();
      const THROTTLE_MS = 5 * 60 * 1000; // 5 minutos
      if (throttleQuery.results && throttleQuery.results.length > 0) {
        try {
          const lastRun = parseInt(JSON.parse(throttleQuery.results[0].valueJson), 10);
          if (now - lastRun < THROTTLE_MS) {
            console.log(`[BOT] Throttle: bot "${bot.name}" já rodou para lead "${lead.nome}" há menos de 5 minutos. Pulando.`);
            return;
          }
        } catch (e) { /* ignora erro de parse */ }
      }
      // Registrar esta execução
      await d1Api.executeRun(
        `INSERT OR REPLACE INTO settings (key, valueJson) VALUES (?, ?)`,
        [throttleKey, JSON.stringify(now)]
      );


      // Se houver uma mensagem recebida de entrada, valida a palavra-chave configurada no nó trigger
      if (incomingMessage && triggerNode.data) {
        const triggerType = triggerNode.data.triggerType || 'Palavra-chave Exata';
        const triggerValue = triggerNode.data.triggerValue || '';
        
        if (triggerType !== 'Qualquer Mensagem' && triggerValue.trim()) {
          const extractKeywords = (str: string): string[] => {
            const matches = [...str.matchAll(/"([^"]+)"/g)].map(m => m[1].trim());
            if (matches.length > 0) return matches;
            return str.split(/ou|,|;/i).map(s => s.replace(/"/g, '').trim()).filter(Boolean);
          };

          const keywords = extractKeywords(triggerValue);
          const text = incomingMessage.toLowerCase().trim();
          let matches = false;

          if (triggerType === 'Contém a Palavra') {
            matches = keywords.some(kw => text.includes(kw.toLowerCase()));
          } else if (triggerType === 'Inicia com') {
            matches = keywords.some(kw => text.startsWith(kw.toLowerCase()));
          } else { // Palavra-chave Exata
            matches = keywords.some(kw => text === kw.toLowerCase());
          }

          if (!matches) {
            console.log(`[Salesbot] Mensagem "${incomingMessage}" não corresponde ao gatilho do robô "${bot.name}" (Esperava: ${triggerType} "${triggerValue}").`);
            return; // Aborta execução se a palavra-chave não corresponder
          }
        }
      }

      // Executar sequencialmente a partir do nó inicial seguindo as arestas (edges)
      let currentNode = triggerNode;
      const visited = new Set<string>();

      console.log(`[BOT] Iniciando execução do bot "${bot.name}" para lead "${lead.nome}" | Nós: ${nodes.length} | Arestas: ${edges.length}`);
      console.log(`[BOT] Nó inicial: ${triggerNode.type} (${triggerNode.id})`);

      while (currentNode && !visited.has(currentNode.id)) {
        visited.add(currentNode.id);
        console.log(`[BOT] ▶ Executando nó: type=${currentNode.type} id=${currentNode.id}`);

        // 1. Executar a ação do nó atual
        if (currentNode.type === 'sendMessage') {
          const messageText = (currentNode.data?.message || '')
            .replace('[Contato: Primeiro nome]', lead.nome.split(' ')[0])
            .replace('[Contato: Nome completo]', lead.nome);

          const phone = lead.celular || lead.telefone;
          console.log(`[BOT] sendMessage: phone=${phone ? 'ok' : 'MISSING'} msgLen=${messageText.length} nodeId=${currentNode.id}`);
          if (phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            // Determinar o canal de envio (whatsapp por padrão)
            const channel = lead.origem === 'instagram' ? 'instagram' : lead.origem === 'facebook' ? 'facebook' : 'whatsapp';
            
            // Enviar mensagem via API (com proteção individual por nó)
            try {
              const sendResult = await sendOmnichannelMessageAction(
                cleanPhone,
                channel as any,
                messageText,
                connectionId
              );
              console.log(`[BOT] sendMessage resultado: ${JSON.stringify(sendResult)}`);
            } catch (sendErr: any) {
              console.error(`[BOT] sendMessage ERRO ao enviar (continuando fluxo): ${sendErr.message}`);
            }

            // Gravar a mensagem no histórico do banco de dados (para aparecer no CRM)
            let formattedPhone = cleanPhone;
            if (!formattedPhone.startsWith('55') && (formattedPhone.length === 10 || formattedPhone.length === 11)) {
              formattedPhone = '55' + formattedPhone;
            }
            const chatId = channel === 'whatsapp' ? `whatsapp_${formattedPhone}` : `${channel}_${lead.id}`;
            
            try {
              await d1Api.sendMessage({
                id: Math.random().toString(36).substr(2, 9),
                chatId: chatId,
                senderId: 'system_bot',
                senderName: 'Atendente Virtual',
                content: messageText,
                timestamp: new Date().toISOString(),
                type: 'text',
                status: 'sent',
                isIncoming: false,
                channel: channel,
                leadId: lead.id,
                leadName: lead.nome,
                connectionId: connectionId || null
              });
            } catch (dbErr: any) {
              console.error(`[BOT] sendMessage ERRO ao gravar no CRM: ${dbErr.message}`);
            }

            // Se configurado para deixar sem resposta, marcamos o chat correspondente como não respondido
            if (deixarSemResposta) {
              await d1Api.executeRun(`UPDATE chats SET unreadCount = unreadCount + 1 WHERE leadId = ?`, [lead.id]);
            }
          }
        } else if (currentNode.type === 'media') {
          // Lógica de envio de arquivo (se houver mídia configurada no nó)
          const fileUrl = currentNode.data?.fileUrl;
          const caption = currentNode.data?.caption || `Arquivo enviado: ${currentNode.data?.fileName || 'mídia'}`;
          const phone = lead.celular || lead.telefone;
          if (fileUrl && phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            const channel = lead.origem === 'instagram' ? 'instagram' : lead.origem === 'facebook' ? 'facebook' : 'whatsapp';
            try {
              await sendOmnichannelMessageAction(
                cleanPhone,
                channel as any,
                caption,
                connectionId,
                undefined,
                fileUrl,
                'application/pdf'
              );
            } catch (sendErr: any) {
              console.error(`[BOT] media ERRO ao enviar: ${sendErr.message}`);
            }

            // Gravar a mensagem de mídia no histórico do banco de dados
            let formattedPhone = cleanPhone;
            if (!formattedPhone.startsWith('55') && (formattedPhone.length === 10 || formattedPhone.length === 11)) {
              formattedPhone = '55' + formattedPhone;
            }
            const chatId = channel === 'whatsapp' ? `whatsapp_${formattedPhone}` : `${channel}_${lead.id}`;

            try {
              await d1Api.sendMessage({
                id: Math.random().toString(36).substr(2, 9),
                chatId: chatId,
                senderId: 'system_bot',
                senderName: 'Atendente Virtual',
                content: caption,
                timestamp: new Date().toISOString(),
                type: 'file',
                status: 'sent',
                isIncoming: false,
                channel: channel,
                leadId: lead.id,
                leadName: lead.nome,
                mediaUrl: fileUrl,
                connectionId: connectionId || null
              });
            } catch (dbErr: any) {
              console.error(`[BOT] media ERRO ao gravar no CRM: ${dbErr.message}`);
            }
          }
        } else if (currentNode.type === 'condition') {
          const conditionType = currentNode.data?.conditionType || 'Se a mensagem for igual a...';
          const conditionValue = (currentNode.data?.conditionValue || '').trim().toLowerCase();
          const incomingText = (incomingMessage || '').trim().toLowerCase();
          
          let isTrue = false;
          if (conditionType === 'Se a mensagem for igual a...') {
            isTrue = incomingText === conditionValue;
          } else if (conditionType === 'Se contiver a palavra...') {
            isTrue = incomingText.includes(conditionValue);
          } else if (conditionType === 'Se for número...') {
            isTrue = !isNaN(Number(incomingText)) && incomingText.length > 0;
          }
          
          const targetHandleId = isTrue ? 'true' : 'false';
          const branchEdge = edges.find((e: any) => e.source === currentNode.id && e.sourceHandle === targetHandleId);
          if (branchEdge) {
            console.log(`[BOT] Condition (${conditionType}) result: ${isTrue} -> Branching to node ${branchEdge.target}`);
            currentNode = nodes.find((n: any) => n.id === branchEdge.target);
            continue;
          } else {
            console.warn(`[BOT] Condition (${conditionType}) evaluated to ${isTrue} but no output edge for "${targetHandleId}" was found.`);
          }
        } else if (currentNode.type === 'pause') {
          const duration = parseInt(currentNode.data?.duration || '1', 10);
          const unit = currentNode.data?.unit || 'Minutos';
          let ms = 1000;
          if (unit === 'Segundos') ms = duration * 1000;
          else if (unit === 'Minutos') ms = duration * 60 * 1000;
          else if (unit === 'Horas') ms = duration * 60 * 60 * 1000;
          else if (unit === 'Dias') ms = duration * 24 * 60 * 60 * 1000;
          
          // Limita espera real de processamento na Edge para não dar timeout de requisição HTTP (max 3s)
          const executionDelay = Math.min(ms, 3000);
          console.log(`[BOT] Bloco de pausa alcançado. Pausando por ${duration} ${unit} (Execução simulada por ${executionDelay}ms).`);
          await new Promise(resolve => setTimeout(resolve, executionDelay));
        } else if (currentNode.type === 'reaction') {
          const emoji = currentNode.data?.emoji || '👍';
          const phone = lead.celular || lead.telefone;
          if (phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            const channel = lead.origem === 'instagram' ? 'instagram' : lead.origem === 'facebook' ? 'facebook' : 'whatsapp';
            try {
              await sendOmnichannelMessageAction(cleanPhone, channel as any, emoji, connectionId);
            } catch (err: any) {
              console.error(`[BOT] Reaction ERRO ao enviar: ${err.message}`);
            }
          }
        } else if (currentNode.type === 'comment') {
          const commentText = currentNode.data?.comment || '';
          if (commentText) {
            const channel = lead.origem === 'instagram' ? 'instagram' : lead.origem === 'facebook' ? 'facebook' : 'whatsapp';
            const phone = (lead.celular || lead.telefone || '').replace(/\D/g, '');
            let formattedPhone = phone;
            if (!formattedPhone.startsWith('55') && (formattedPhone.length === 10 || formattedPhone.length === 11)) {
              formattedPhone = '55' + formattedPhone;
            }
            const chatId = channel === 'whatsapp' ? `whatsapp_${formattedPhone}` : `${channel}_${lead.id}`;
            try {
              await d1Api.sendMessage({
                id: Math.random().toString(36).substr(2, 9),
                chatId: chatId,
                senderId: 'system_bot',
                senderName: 'Nota do Bot',
                content: commentText,
                timestamp: new Date().toISOString(),
                type: 'note',
                status: 'sent',
                isIncoming: false,
                channel: channel,
                leadId: lead.id,
                leadName: lead.nome,
                connectionId: connectionId || null
              });
            } catch (err: any) {
              console.error(`[BOT] Comment ERRO ao registrar nota: ${err.message}`);
            }
          }
        } else if (currentNode.type === 'internalMessage') {
          const internalMsgText = currentNode.data?.message || '';
          if (internalMsgText) {
            const channel = lead.origem === 'instagram' ? 'instagram' : lead.origem === 'facebook' ? 'facebook' : 'whatsapp';
            const phone = (lead.celular || lead.telefone || '').replace(/\D/g, '');
            let formattedPhone = phone;
            if (!formattedPhone.startsWith('55') && (formattedPhone.length === 10 || formattedPhone.length === 11)) {
              formattedPhone = '55' + formattedPhone;
            }
            const chatId = channel === 'whatsapp' ? `whatsapp_${formattedPhone}` : `${channel}_${lead.id}`;
            try {
              await d1Api.sendMessage({
                id: Math.random().toString(36).substr(2, 9),
                chatId: chatId,
                senderId: 'system_bot',
                senderName: 'Mensagem Interna',
                content: `[Mensagem Interna para ${currentNode.data?.target || 'Todos'}]: ${internalMsgText}`,
                timestamp: new Date().toISOString(),
                type: 'internal',
                status: 'sent',
                isIncoming: false,
                channel: channel,
                leadId: lead.id,
                leadName: lead.nome,
                connectionId: connectionId || null
              });
            } catch (err: any) {
              console.error(`[BOT] InternalMessage ERRO: ${err.message}`);
            }
          }
        } else if (currentNode.type === 'listMessage') {
          const title = currentNode.data?.title || 'Selecione uma opção:';
          const options = currentNode.data?.options || [];
          let listText = `*${title}*\n\n`;
          options.forEach((opt: string, idx: number) => {
            listText += `${idx + 1}️⃣ ${opt}\n`;
          });
          const phone = lead.celular || lead.telefone;
          if (phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            const channel = lead.origem === 'instagram' ? 'instagram' : lead.origem === 'facebook' ? 'facebook' : 'whatsapp';
            try {
              await sendOmnichannelMessageAction(cleanPhone, channel as any, listText, connectionId);
            } catch (err: any) {
              console.error(`[BOT] ListMessage ERRO: ${err.message}`);
            }
          }
        } else if (currentNode.type === 'subscribeMeta') {
          const campaign = currentNode.data?.campaign || 'Meta Campaign';
          console.log(`[BOT] Inscrevendo lead ${lead.nome} na campanha Meta: ${campaign}`);
          const currentTags = Array.isArray(lead.tags) ? lead.tags : (lead.tags ? JSON.parse(lead.tags) : []);
          const mergedTags = Array.from(new Set([...currentTags, `meta_${campaign.replace(/\s+/g, '_').toLowerCase()}`]));
          await d1Api.executeRun(`UPDATE leads SET tags = ? WHERE id = ?`, [JSON.stringify(mergedTags), lead.id]);
        } else if (currentNode.type === 'validation') {
          const validationType = currentNode.data?.validationType || 'Validar Email';
          const valText = incomingMessage || '';
          let isValid = false;

          if (validationType === 'Validar Email') {
            isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valText.trim());
          } else if (validationType === 'Validar Telefone (BR)') {
            const digits = valText.replace(/\D/g, '');
            isValid = digits.length >= 10 && digits.length <= 11;
          } else if (validationType === 'Validar CPF/CNPJ') {
            const digits = valText.replace(/\D/g, '');
            isValid = digits.length === 11 || digits.length === 14;
          } else if (validationType === 'Validar CEP') {
            const digits = valText.replace(/\D/g, '');
            isValid = digits.length === 8;
          }

          const targetHandleId = isValid ? 'true' : 'false';
          const branchEdge = edges.find((e: any) => e.source === currentNode.id && e.sourceHandle === targetHandleId);
          if (branchEdge) {
            console.log(`[BOT] Validation (${validationType}) result: ${isValid} -> Branching to node ${branchEdge.target}`);
            currentNode = nodes.find((n: any) => n.id === branchEdge.target);
            continue;
          } else {
            console.warn(`[BOT] Validation (${validationType}) evaluated to ${isValid} but no output edge for "${targetHandleId}" was found.`);
          }
        } else if (currentNode.type === 'startSalesbot') {
          const targetBotId = currentNode.data?.targetBotId;
          if (targetBotId && targetBotId !== botId) {
            console.log(`[BOT] Iniciando sub-bot ${targetBotId} a partir de ${botId}`);
            // Executa o bot de destino assincronamente
            automationEngine.runSalesbot(targetBotId, lead, destinatarioTipo, connectionId, deixarSemResposta, incomingMessage).catch(err => {
              console.error(`[BOT] Erro ao executar sub-bot ${targetBotId}:`, err);
            });
          }
        } else if (currentNode.type === 'customCode') {
          const code = currentNode.data?.code || '';
          if (code) {
            try {
              const userFunc = new Function('lead', `
                return (async () => {
                  ${code}
                })();
              `);
              await userFunc(lead);
              console.log(`[BOT] Código customizado executado com sucesso para o lead: ${lead.nome}`);
            } catch (err: any) {
              console.error('[BOT] Erro ao executar código customizado:', err.message);
            }
          }
        } else if (currentNode.type === 'widget') {
          const webhookUrl = currentNode.data?.webhookUrl;
          if (webhookUrl) {
            try {
              await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  event: 'bot_trigger',
                  botId,
                  lead,
                  widgetType: currentNode.data?.widgetType,
                  timestamp: new Date().toISOString()
                })
              });
              console.log(`[BOT] Widget webhook enviado com sucesso para ${webhookUrl}`);
            } catch (err: any) {
              console.error('[BOT] Erro ao disparar webhook do Widget:', err.message);
            }
          }
        } else if (currentNode.type === 'stopBot') {
          console.log('[BOT] Bloco de Parar Bot alcançado. Encerrando execução.');
          break;
        } else if (currentNode.type === 'roundRobin') {
          let options = currentNode.data?.options || [];

          // Compatibilidade retroativa: se o nó não tem options salvas,
          // reconstruir a partir das arestas com sourceHandle 'opt-X'
          if (options.length === 0) {
            const optEdges = edges.filter((e: any) => 
              e.source === currentNode.id && 
              e.sourceHandle && 
              e.sourceHandle.startsWith('opt-')
            );
            options = optEdges.map((e: any) => ({
              id: e.sourceHandle.replace('opt-', ''),
              label: 'Opção'
            }));
            console.log(`[BOT] RoundRobin: Reconstruindo ${options.length} opção(ões) a partir das arestas:`, JSON.stringify(options));
          }

          console.log(`[BOT] RoundRobin: ${options.length} opção(ões):`, JSON.stringify(options));
          
          const rrEdges = edges.filter((e: any) => e.source === currentNode.id);
          console.log(`[BOT] RoundRobin: ${rrEdges.length} aresta(s):`, JSON.stringify(rrEdges.map((e: any) => ({ target: e.target, sourceHandle: e.sourceHandle }))));

          if (options.length > 0) {
            const stateKey = `round_robin_last_index_${currentNode.id}`;
            const stateQuery = await d1Api.runQuery(`SELECT valueJson FROM settings WHERE key = ? LIMIT 1`, [stateKey]);
            
            let lastIndex = -1;
            if (stateQuery.results && stateQuery.results.length > 0) {
              try {
                lastIndex = parseInt(JSON.parse(stateQuery.results[0].valueJson), 10);
              } catch (e) {
                console.error(e);
              }
            }
            
            const nextIndex = (lastIndex + 1) % options.length;
            const chosenOption = options[nextIndex];
            
            console.log(`[BOT] RoundRobin: último=${lastIndex}, próximo=${nextIndex}, opção:`, JSON.stringify(chosenOption));

            await d1Api.executeRun(
              `INSERT OR REPLACE INTO settings (key, valueJson) VALUES (?, ?)`,
              [stateKey, JSON.stringify(nextIndex)]
            );
            
            const targetHandleId = `opt-${chosenOption.id}`;
            console.log(`[BOT] RoundRobin: buscando aresta com sourceHandle="${targetHandleId}"`);
            const branchEdge = edges.find((e: any) => e.source === currentNode.id && e.sourceHandle === targetHandleId);
            
            if (branchEdge) {
              console.log(`[BOT] RoundRobin: aresta encontrada → ${branchEdge.target}`);
              currentNode = nodes.find((n: any) => n.id === branchEdge.target);
              continue;
            } else {
              console.warn(`[BOT] RoundRobin: NENHUMA aresta para "${targetHandleId}"`);
            }
          } else {
            console.warn('[BOT] RoundRobin: nenhuma opção configurada no nó!');
          }
        } else if (currentNode.type === 'action') {
          const actionType = currentNode.data?.actionType || '';
          
           if (actionType === 'Mudar usuário resp.') {
            const targetUserId = currentNode.data?.targetUserId;
            if (targetUserId) {
              const targetUser = await d1Api.getUserProfile(targetUserId);
              if (targetUser && targetUser.absenceEnabled === 1) {
                console.log(`[BOT] Consultor ${targetUserId} está ausente. Não mudando usuário responsável.`);
              } else {
                await d1Api.executeRun(`UPDATE leads SET dataUltimaAtividade = ? WHERE id = ?`, [new Date().toISOString(), lead.id]);
                await d1Api.executeRun(`UPDATE chats SET assignedTo = ? WHERE leadId = ?`, [targetUserId, lead.id]);
                
                // Verifica se a oportunidade existe para este lead, se não, cria uma nova
                const { results: opps } = await d1Api.runQuery(`SELECT id FROM opportunities WHERE leadId = ? LIMIT 1`, [lead.id]);
                if (opps && opps.length > 0) {
                  await d1Api.executeRun(`UPDATE opportunities SET assignedTo = ? WHERE leadId = ?`, [targetUserId, lead.id]);
                } else {
                  await d1Api.saveOpportunity({ leadId: lead.id, assignedTo: targetUserId });
                }
                await d1Api.syncChatConnectionWithAssignedUser(lead.id, targetUserId);
              }
            }
          } else if (actionType === 'Mudar o status do lead') {
            const targetStatus = currentNode.data?.targetStatus;
            if (targetStatus) {
              await d1Api.executeRun(`UPDATE leads SET status = ?, dataUltimaAtividade = ? WHERE id = ?`, [targetStatus, new Date().toISOString(), lead.id]);
            }
          } else if (actionType === 'Gerenciar tags' && currentNode.data?.tagsValue) {
            const currentTags = Array.isArray(lead.tags) ? lead.tags : (lead.tags ? JSON.parse(lead.tags) : []);
            const newTagsToAdd = currentNode.data.tagsValue.split(',').map((t: string) => t.trim()).filter(Boolean);
            const mergedTags = Array.from(new Set([...currentTags, ...newTagsToAdd]));
            await d1Api.executeRun(`UPDATE leads SET tags = ? WHERE id = ?`, [JSON.stringify(mergedTags), lead.id]);
          } else {
            // Compatibilidade com lógica antiga baseada no label do nó
            const label = currentNode.data?.label || '';
            if (label.includes('Tag') || label.includes('tag')) {
              const currentTags = Array.isArray(lead.tags) ? lead.tags : [];
              const newTags = Array.from(new Set([...currentTags, 'bot_tag']));
              await d1Api.executeRun(`UPDATE leads SET tags = ? WHERE id = ?`, [JSON.stringify(newTags), lead.id]);
            }
          }
        }

        // 2. Encontrar o próximo nó conectado
        // Prioridade: handle 'success' > qualquer edge sem handle 'fail' > qualquer edge
        const allEdgesFromNode = edges.filter((e: any) => e.source === currentNode.id);
        const successEdge = allEdgesFromNode.find((e: any) => e.sourceHandle === 'success' || e.sourceHandle === null || e.sourceHandle === undefined);
        const nonFailEdge = allEdgesFromNode.find((e: any) => e.sourceHandle !== 'fail');
        const edge = successEdge || nonFailEdge || allEdgesFromNode[0];
        console.log(`[BOT] Transição: ${allEdgesFromNode.length} arestas do nó ${currentNode.id} | Usando aresta: ${edge ? `→ ${edge.target} (handle=${edge.sourceHandle})` : 'NENHUMA (fim do fluxo)'}`);
        if (edge) {
          currentNode = nodes.find((n: any) => n.id === edge.target);
        } else {
          console.log(`[BOT] FIM do fluxo no nó tipo=${currentNode.type}`);
          break; // Sem mais conexões, para a execução do bot
        }
      }
    } catch (e) {
      console.error(`Erro ao executar o Salesbot ${botId}:`, e);
    }
  }
};
