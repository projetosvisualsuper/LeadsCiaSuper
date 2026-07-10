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
          // Atualiza o lead e também a atribuição de chat/oportunidade
          await d1Api.executeRun(`UPDATE chats SET assignedTo = ? WHERE leadId = ?`, [auto.atribuirUsuarioId, lead.id]);
          await d1Api.executeRun(`UPDATE opportunities SET assignedTo = ? WHERE leadId = ?`, [auto.atribuirUsuarioId, lead.id]);
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

      while (currentNode && !visited.has(currentNode.id)) {
        visited.add(currentNode.id);

        // 1. Executar a ação do nó atual
        if (currentNode.type === 'sendMessage') {
          const messageText = (currentNode.data?.message || '')
            .replace('[Contato: Primeiro nome]', lead.nome.split(' ')[0])
            .replace('[Contato: Nome completo]', lead.nome);

          const phone = lead.celular || lead.telefone;
          if (phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            // Determinar o canal de envio (whatsapp por padrão)
            const channel = lead.origem === 'instagram' ? 'instagram' : lead.origem === 'facebook' ? 'facebook' : 'whatsapp';
            
            await sendOmnichannelMessageAction(
              cleanPhone,
              channel as any,
              messageText,
              connectionId
            );

            // Gravar a mensagem no histórico do banco de dados (para aparecer no CRM)
            let formattedPhone = cleanPhone;
            if (!formattedPhone.startsWith('55') && (formattedPhone.length === 10 || formattedPhone.length === 11)) {
              formattedPhone = '55' + formattedPhone;
            }
            const chatId = channel === 'whatsapp' ? `whatsapp_${formattedPhone}` : `${channel}_${lead.id}`;
            
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

            // Se configurado para deixar sem resposta, marcamos o chat correspondente como não respondido
            if (deixarSemResposta) {
              await d1Api.executeRun(`UPDATE chats SET unreadCount = unreadCount + 1 WHERE leadId = ?`, [lead.id]);
            }
          }
        } else if (currentNode.type === 'media') {
          // Lógica de envio de arquivo (se houver mídia configurada no nó)
          const fileUrl = currentNode.data?.fileUrl;
          const phone = lead.celular || lead.telefone;
          if (fileUrl && phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            await sendOmnichannelMessageAction(
              cleanPhone,
              'whatsapp',
              `Arquivo enviado: ${currentNode.data?.fileName || 'mídia'}`,
              connectionId,
              undefined,
              fileUrl,
              'application/pdf'
            );

            // Gravar a mensagem de mídia no histórico do banco de dados
            let formattedPhone = cleanPhone;
            if (!formattedPhone.startsWith('55') && (formattedPhone.length === 10 || formattedPhone.length === 11)) {
              formattedPhone = '55' + formattedPhone;
            }
            const chatId = `whatsapp_${formattedPhone}`;

            await d1Api.sendMessage({
              id: Math.random().toString(36).substr(2, 9),
              chatId: chatId,
              senderId: 'system_bot',
              senderName: 'Atendente Virtual',
              content: `Arquivo enviado: ${currentNode.data?.fileName || 'mídia'}`,
              timestamp: new Date().toISOString(),
              type: 'file',
              status: 'sent',
              isIncoming: false,
              channel: 'whatsapp',
              leadId: lead.id,
              leadName: lead.nome,
              mediaUrl: fileUrl,
              connectionId: connectionId || null
            });
          }
        } else if (currentNode.type === 'roundRobin') {
          const options = currentNode.data?.options || [];
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
            
            await d1Api.executeRun(
              `INSERT OR REPLACE INTO settings (key, valueJson) VALUES (?, ?)`,
              [stateKey, JSON.stringify(nextIndex)]
            );
            
            const targetHandleId = `opt-${chosenOption.id}`;
            const branchEdge = edges.find((e: any) => e.source === currentNode.id && e.sourceHandle === targetHandleId);
            
            if (branchEdge) {
              currentNode = nodes.find((n: any) => n.id === branchEdge.target);
              continue;
            }
          }
        } else if (currentNode.type === 'action') {
          const actionType = currentNode.data?.actionType || '';
          
          if (actionType === 'Mudar usuário resp.') {
            const targetUserId = currentNode.data?.targetUserId;
            if (targetUserId) {
              await d1Api.executeRun(`UPDATE leads SET assignedTo = ?, dataUltimaAtividade = ? WHERE id = ?`, [targetUserId, new Date().toISOString(), lead.id]);
              await d1Api.executeRun(`UPDATE chats SET assignedTo = ? WHERE leadId = ?`, [targetUserId, lead.id]);
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
        if (edge) {
          currentNode = nodes.find((n: any) => n.id === edge.target);
        } else {
          break; // Sem mais conexões, para a execução do bot
        }
      }
    } catch (e) {
      console.error(`Erro ao executar o Salesbot ${botId}:`, e);
    }
  }
};
