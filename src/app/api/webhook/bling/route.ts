export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';
import { isBusinessHours, getNextBusinessHoursStart } from '@/lib/business-hours';

function parseBlingPhones(rawPhone: string, rawTelefone?: string): { celular: string; telefone: string } {
  const united = `${rawPhone || ''} / ${rawTelefone || ''}`;
  const normalized = united
    .replace(/\s+e\s+/gi, ' / ')
    .replace(/\s+ou\s+/gi, ' / ')
    .replace(/[,;|]/g, ' / ');

  const parts = normalized.split('/');
  const validNumbers: string[] = [];

  for (const part of parts) {
    const clean = part.replace(/\D/g, '');
    if (clean && clean.length >= 8) {
      validNumbers.push(clean);
    }
  }

  if (validNumbers.length === 0) {
    const fallback = united.replace(/\D/g, '');
    if (fallback.length >= 21) {
      return {
        celular: fallback.substring(0, 11),
        telefone: fallback.substring(11, 22)
      };
    }
    return { celular: fallback, telefone: '' };
  }

  const uniqueNumbers = Array.from(new Set(validNumbers));

  let celular = '';
  let telefone = '';

  if (uniqueNumbers.length > 0) {
    const cellIndex = uniqueNumbers.findIndex(num => num.length === 11 || (num.length === 10 && num[2] === '9'));
    if (cellIndex !== -1) {
      celular = uniqueNumbers[cellIndex];
      const otherNumbers = uniqueNumbers.filter((_, idx) => idx !== cellIndex);
      telefone = otherNumbers[0] || '';
    } else {
      celular = uniqueNumbers[0];
      telefone = uniqueNumbers[1] || '';
    }
  }

  return { celular, telefone };
}

async function appendPedidoObservacao(pedidoId: string, text: string) {
  try {
    const { results } = await d1Api.runQuery(`SELECT observacao FROM pedidos WHERE id = ? LIMIT 1`, [pedidoId]);
    const currentObs = results?.[0]?.observacao || '';
    await d1Api.updatePedidoObservacao(pedidoId, currentObs + text);
  } catch (e) {
    console.error('Erro ao anexar observacao ao pedido:', e);
  }
}

// Função auxiliar para disparar ou agendar a notificação de WhatsApp se configurado
async function sendBlingWhatsappNotification(pedidoId: string, leadId: string, orderNumber: string, settings: any) {
  const formattedDate = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  try {
    const leadResult = await d1Api.runQuery(`SELECT nome, celular FROM leads WHERE id = ? LIMIT 1`, [leadId]);
    const targetLead = leadResult.results?.[0];
    
    if (!targetLead || !targetLead.celular) {
      const logText = `\n[WHATSAPP NOTIFICAÇÃO IGNORADA] Cliente sem número de celular cadastrado em ${formattedDate}.`;
      await appendPedidoObservacao(pedidoId, logText);
      return;
    }

    const cleanPhone = targetLead.celular.replace(/\D/g, '');
    if (!cleanPhone) {
      const logText = `\n[WHATSAPP NOTIFICAÇÃO IGNORADA] Número de celular inválido em ${formattedDate}.`;
      await appendPedidoObservacao(pedidoId, logText);
      return;
    }

    const msgText = `Olá, *${targetLead.nome}*! Seu pedido *#${orderNumber}* foi enviado com sucesso! 🚀\n\nVocê pode acompanhar a entrega e rastrear seu pedido através do nosso portal:\n🔗 https://portal.visualsuper.com.br\n\nObrigado pela confiança! 😊`;

    // Se estiver fora do horário comercial, agendamos para o próximo horário comercial!
    if (!isBusinessHours()) {
      const nextStart = getNextBusinessHoursStart();
      const formattedNext = nextStart.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const queueId = `bling_noti_${pedidoId}_${Date.now()}`;
      
      const templateDataJson = JSON.stringify({
        pedidoId,
        leadId,
        orderNumber,
        customMessage: msgText
      });

      await d1Api.executeRun(
        `INSERT INTO queue (id, campanhaId, leadId, email, telefone, channel, status, tentativa, dataAgendada, prioridade, templateDataJson)
         VALUES (?, 'bling_notification', ?, null, ?, 'whatsapp', 'pendente', 0, ?, 1, ?)`,
        [queueId, leadId, cleanPhone, nextStart.toISOString(), templateDataJson]
      );

      const logText = `\n[WHATSAPP NOTIFICAÇÃO AGENDADA] Fora do horário comercial em ${formattedDate}. Disparo automático agendado para ${formattedNext}.`;
      await appendPedidoObservacao(pedidoId, logText);
      return;
    }
    
    const { sendOmnichannelMessageAction } = await import('@/app/actions/chat');
    
    let result: any;
    if (settings.bling?.templateName) {
      result = await sendOmnichannelMessageAction(
        cleanPhone,
        'whatsapp',
        msgText,
        undefined,
        {
          name: settings.bling.templateName,
          language: settings.bling.templateLanguage || 'pt_BR',
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: targetLead.nome },
                { type: "text", text: orderNumber }
              ]
            }
          ]
        }
      );
    } else {
      result = await sendOmnichannelMessageAction(
        cleanPhone,
        'whatsapp',
        msgText
      );
    }

    if (result && result.success) {
      const logText = `\n[WHATSAPP NOTIFICAÇÃO] Mensagem de envio automática enviada com sucesso para +${cleanPhone} em ${formattedDate}.`;
      await appendPedidoObservacao(pedidoId, logText);
      console.error(`Notificação automática enviada com sucesso para ${targetLead.nome}`);
    } else {
      const errorMsg = result?.error || 'Erro desconhecido';
      const logText = `\n[WHATSAPP NOTIFICAÇÃO FALHA] Falha no disparo automático para +${cleanPhone}: ${errorMsg} em ${formattedDate}.`;
      await appendPedidoObservacao(pedidoId, logText);
      console.error(`Falha ao disparar notificação automática do Bling para ${targetLead.nome}:`, errorMsg);
    }
  } catch (msgErr: any) {
    console.error('Erro ao disparar notificação automática do Bling:', msgErr);
    const logText = `\n[WHATSAPP NOTIFICAÇÃO FALHA] Erro interno: ${msgErr.message || msgErr} em ${formattedDate}.`;
    await appendPedidoObservacao(pedidoId, logText);
  }
}

async function getBlingSituationName(situationId: string, accessToken: string): Promise<string> {
  try {
    const res = await fetch('https://api.bling.com.br/Api/v3/situacoes/modulos/30', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    if (res.ok) {
      const payload = await res.json();
      const situations = payload.data || [];
      const found = situations.find((s: any) => (s.id || '').toString() === situationId.toString());
      if (found && found.nome) {
        return found.nome;
      }
    }
  } catch (err) {
    console.error('Erro ao buscar nome da situacao no Bling:', err);
  }
  return '';
}

// Função compartilhada para importar/atualizar o pedido a partir do ID do Bling
async function processBlingOrder(orderId: string, webhookTimestamp?: number) {
  // 1. Carregar credenciais e tokens do Bling nas configurações do CRM
  const settings = await d1Api.getSettings();
  let accessToken = settings?.bling?.accessToken || '';
  const refreshToken = settings?.bling?.refreshToken || '';
  const clientId = settings?.bling?.clientId || '';
  const clientSecret = settings?.bling?.clientSecret || '';
  const tokenExpiresAt = settings?.bling?.tokenExpiresAt || '';

  if (!accessToken) {
    throw new Error('Token de acesso do Bling não configurado no CRM.');
  }

  // 2. Renovar Token de Acesso se estiver expirado ou perto de expirar (menos de 5 minutos)
  if (refreshToken && clientId && clientSecret && (!tokenExpiresAt || new Date(tokenExpiresAt).getTime() - Date.now() < 300000)) {
    try {
      console.error('Bling Access Token expirado ou prestes a expirar. Atualizando...');
      const basicAuth = btoa(`${clientId}:${clientSecret}`);
      const refreshResponse = await fetch('https://api.bling.com.br/Api/v3/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
          'enable-jwt': '1'
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;
        const expiresIn = refreshData.expires_in || 3600;
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        // Salvar novos tokens
        const updatedSettings = {
          ...settings,
          bling: {
            ...(settings.bling || {}),
            accessToken: refreshData.access_token,
            refreshToken: refreshData.refresh_token || refreshToken,
            tokenExpiresAt: expiresAt
          }
        };
        await d1Api.saveSettings(updatedSettings);
        console.error('Bling Access Token renovado com sucesso.');
      } else {
        const errText = await refreshResponse.text();
        console.error('Falha ao atualizar token do Bling:', errText);
        throw new Error(`Falha ao renovar token de acesso do Bling: ${errText}`);
      }
    } catch (tokenErr: any) {
      console.error('Erro ao atualizar token do Bling:', tokenErr);
      throw tokenErr;
    }
  }

  // 3. Consultar dados completos do pedido via API REST do Bling
  console.error(`Buscando dados completos do pedido ID ${orderId} no Bling...`);
  const getRes = await fetch(`https://api.bling.com.br/Api/v3/pedidos/vendas/${orderId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!getRes.ok) {
    const errText = await getRes.text();
    throw new Error(`Erro na API do Bling: ${errText}`);
  }

  const orderPayload = await getRes.json();
  const data = orderPayload.data;

  if (!data) {
    throw new Error('Nenhum dado retornado da API do Bling');
  }

  // Obter dados do pedido de venda
  const orderNumber = (data.numero || data.id || '').toString();
  let numeroLojaVirtual = '';
  
  // Buscar no campo 'numeroLoja' retornado pela API v3 do Bling (com fallback)
  const rawNumeroLoja = data.numeroLoja || data.numeroPedidoLojaVirtual;
  if (rawNumeroLoja) {
    const virtualStoreOrder = rawNumeroLoja.toString();
    if (virtualStoreOrder.includes('_')) {
      numeroLojaVirtual = virtualStoreOrder.split('_')[0];
    } else {
      numeroLojaVirtual = virtualStoreOrder.trim();
    }
  }
  const statusNamesMap: Record<string, string> = {
    '6': 'Em aberto',
    '9': 'Atendido',
    '12': 'Cancelado',
    '15': 'Em andamento',
    '18': 'Em andamento',
    '1': 'Em aberto',
    '2': 'Atendido',
    '3': 'Cancelado',
    '739691': 'Despachado',
    '710514': 'Em andamento'
  };

  // A situação pode vir como ID ou nome. Se vier apenas como ID, tentamos buscar o nome associado via API.
  let situationNome = data.situacao?.nome || '';
  if (!situationNome && data.situacao?.id) {
    const fetchedNome = await getBlingSituationName(data.situacao.id.toString(), accessToken);
    if (fetchedNome) {
      situationNome = fetchedNome;
    }
  }

  // Fallback para mapeamento estático se a API retornar erro de escopo/privilégio
  if (!situationNome && data.situacao?.id) {
    const staticMapped = statusNamesMap[data.situacao.id.toString()];
    if (staticMapped) {
      situationNome = staticMapped;
    }
  }
  const statusName = situationNome ? situationNome.toString().toLowerCase() : (data.situacao?.id || '').toString();
  
  // Cliente
  const clientName = data.contato?.nome || 'Cliente';
  let clientPhone = '';
  let clientEmail = '';
  let rawBlingTelefone = '';
  let clientDocumento = 
    data.contato?.numeroDocumento || 
    data.contato?.cnpj || 
    data.contato?.cpf || 
    data.contato?.cnpjCpf || 
    data.contato?.documento || 
    '';

  if (data.contato?.id) {
    try {
      console.error(`Buscando detalhes do contato ID ${data.contato.id} no Bling...`);
      const contactRes = await fetch(`https://api.bling.com.br/Api/v3/contatos/${data.contato.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (contactRes.ok) {
        const contactPayload = await contactRes.json();
        const contactData = contactPayload.data;
        if (contactData) {
          clientPhone = contactData.celular || '';
          rawBlingTelefone = contactData.telefone || '';
          clientEmail = contactData.email || '';
          if (!clientDocumento) {
            clientDocumento = 
              contactData.numeroDocumento || 
              contactData.cnpj || 
              contactData.cpf || 
              contactData.cnpjCpf || 
              contactData.documento || 
              '';
          }
        }
      }
    } catch (contactErr) {
      console.error('Erro ao buscar detalhes do contato no Bling:', contactErr);
    }
  }

  if (!clientPhone) {
    clientPhone = data.contato?.celular || '';
    if (!rawBlingTelefone) {
      rawBlingTelefone = data.contato?.telefone || '';
    }
  }

  const parsedPhones = parseBlingPhones(clientPhone, rawBlingTelefone);
  const cleanPhone = parsedPhones.celular;
  const cleanTelefone = parsedPhones.telefone;
  const cleanDocumento = clientDocumento ? clientDocumento.toString().replace(/\D/g, '') : '';

  const statusNameNormalized = situationNome ? situationNome.toLowerCase().trim() : statusName.toLowerCase().trim();
  const statusId = (data.situacao?.id || '').toString();

  const prettyStatus = situationNome || statusNamesMap[statusId] || statusName || statusId;
  const formattedDate = webhookTimestamp 
    ? new Date(webhookTimestamp * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    : new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  // Mapear status para o CRM com base em palavras-chave robustas
  let crmStatus: 'pendente' | 'em_atendimento' | 'finalizado' | 'enviado' | 'cancelado' = 'pendente';
  if (
    statusNameNormalized.includes('cancel') || 
    statusId === '12' || 
    statusId === '3'
  ) {
    crmStatus = 'cancelado';
  } else if (
    statusNameNormalized.includes('enviado') || 
    statusNameNormalized.includes('despachado') || 
    statusNameNormalized.includes('transito') || 
    statusNameNormalized.includes('rastre') || 
    statusNameNormalized.includes('entrega') ||
    statusId === '739691'
  ) {
    crmStatus = 'enviado';
  } else if (
    statusNameNormalized.includes('atendido') || 
    statusNameNormalized.includes('finalizado') || 
    statusNameNormalized.includes('concluid') || 
    statusNameNormalized.includes('fechado') ||
    statusId === '9' || 
    statusId === '2'
  ) {
    crmStatus = 'finalizado';
  } else if (
    statusNameNormalized.includes('andamento') || 
    statusNameNormalized.includes('logistica') || 
    statusNameNormalized.includes('prd') || 
    statusNameNormalized.includes('separa') || 
    statusNameNormalized.includes('prepara') || 
    statusNameNormalized.includes('produ') || 
    statusNameNormalized.includes('fatur') || 
    statusNameNormalized.includes('embal') || 
    statusNameNormalized.includes('expedi') || 
    statusNameNormalized.includes('atendimento') || 
    statusId === '15' || 
    statusId === '18' || 
    statusId === '710514'
  ) {
    crmStatus = 'em_atendimento';
  } else {
    crmStatus = 'pendente';
  }

  // 4. Localizar o pedido correspondente no banco D1
  const pedidos = await d1Api.getPedidos();
  const pedidoLocal = pedidos.find(p => p.pedidoReferencia === orderNumber || p.id === orderNumber);

  if (pedidoLocal) {
    if (pedidoLocal.status === crmStatus) {
      return { 
        success: true, 
        message: `Pedido já está com o status ${crmStatus} no CRM. Nenhuma atualização necessária.`,
        pedido: pedidoLocal
      };
    }

    await d1Api.updatePedidoStatus(pedidoLocal.id, crmStatus);

    const updateText = `\n[BLING ATUALIZAÇÃO] Pedido alterado para "${prettyStatus}" no Bling em ${formattedDate}.`;
    const novaObs = (pedidoLocal.observacao || '') + updateText;
    await d1Api.updatePedidoObservacao(pedidoLocal.id, novaObs);

    if (crmStatus === 'enviado' && settings.bling?.enabled) {
      await sendBlingWhatsappNotification(pedidoLocal.id, pedidoLocal.leadId, orderNumber, settings);
    }

    return { 
      success: true, 
      message: `Pedido atualizado com status ${crmStatus} no CRM.`,
      pedido: { ...pedidoLocal, status: crmStatus, observacao: novaObs }
    };
  } else {
    // Pedido não existe, vamos criar o lead se necessário, e salvar o pedido
    let targetLeadId = '';

    // 1. Tentar localizar lead por CNPJ/CPF (documento)
    if (cleanDocumento) {
      const { results: docResults } = await d1Api.runQuery(
        `SELECT id, celular, telefone, email, documento FROM leads WHERE documento = ? OR REPLACE(REPLACE(REPLACE(documento, '.', ''), '-', ''), '/', '') = ? LIMIT 1`,
        [cleanDocumento, cleanDocumento]
      );
      if (docResults && docResults.length > 0) {
        targetLeadId = docResults[0].id;
      }
    }

    // 2. Tentar localizar por telefone se não encontrou por documento
    if (!targetLeadId && cleanPhone) {
      const { results } = await d1Api.runQuery(
        `SELECT id, documento FROM leads WHERE celular = ? OR telefone = ? OR celular = ? OR telefone = ? LIMIT 1`,
        [cleanPhone, cleanPhone, cleanTelefone, cleanTelefone]
      );
      if (results && results.length > 0) {
        targetLeadId = results[0].id;
      }
    }

    // 3. Tentar localizar por nome se ainda não encontrou
    if (!targetLeadId) {
      const { results: nameResults } = await d1Api.runQuery(
        `SELECT id, celular, telefone, email, documento FROM leads WHERE nome = ? LIMIT 1`,
        [clientName]
      );
      if (nameResults && nameResults.length > 0) {
        targetLeadId = nameResults[0].id;
      }
    }

    // Se encontrou lead existente, atualizar dados que estiverem em falta (incluindo CNPJ/CPF)
    if (targetLeadId) {
      if (cleanDocumento) {
        await d1Api.executeRun(`UPDATE leads SET documento = ? WHERE id = ? AND (documento IS NULL OR documento = '')`, [cleanDocumento, targetLeadId]);
      }
      if (cleanPhone) {
        await d1Api.executeRun(`UPDATE leads SET celular = ? WHERE id = ? AND (celular IS NULL OR celular = '')`, [cleanPhone, targetLeadId]);
      }
      if (cleanTelefone) {
        await d1Api.executeRun(`UPDATE leads SET telefone = ? WHERE id = ? AND (telefone IS NULL OR telefone = '')`, [cleanTelefone, targetLeadId]);
      }
      if (clientEmail) {
        await d1Api.executeRun(`UPDATE leads SET email = ? WHERE id = ? AND (email IS NULL OR email = '')`, [clientEmail, targetLeadId]);
      }
    } else {
      // Criar novo lead com CNPJ/CPF
      targetLeadId = Math.random().toString(36).substr(2, 9);
      const agora = new Date().toISOString();
      await d1Api.runQuery(
        `INSERT INTO leads (id, nome, celular, telefone, email, documento, origem, dataCriacao, status) VALUES (?, ?, ?, ?, ?, ?, 'Bling Mercos', ?, 'novo')`,
        [targetLeadId, clientName, cleanPhone || null, cleanTelefone || null, clientEmail || null, cleanDocumento || null, agora]
      );
    }

    const itensBling = data.itens ? (Array.isArray(data.itens) ? data.itens.map((i: any) => i.descricao || i.codigo).join(', ') : data.itens.toString()) : 'Produtos Mercos';
    const valorBling = parseFloat(data.total || '0');
    const docInfoStr = cleanDocumento ? ` (CNPJ/CPF: ${cleanDocumento})` : '';

    await d1Api.savePedido({
      leadId: targetLeadId,
      pedidoReferencia: orderNumber,
      itens: itensBling,
      valor: valorBling,
      origem: 'mercos',
      numeroLojaVirtual: numeroLojaVirtual,
      observacao: `[BLING CRIAÇÃO] Pedido criado com status "${prettyStatus}" no Bling em ${formattedDate}${docInfoStr}.`
    } as any);

    const todosPedidos = await d1Api.getPedidos();
    const recemCriado = todosPedidos.find(p => p.pedidoReferencia === orderNumber && p.origem === 'mercos');
    if (recemCriado) {
      await d1Api.updatePedidoStatus(recemCriado.id, crmStatus);
    }

    if (crmStatus === 'enviado' && settings.bling?.enabled && recemCriado) {
      await sendBlingWhatsappNotification(recemCriado.id, targetLeadId, orderNumber, settings);
    }

    return { 
      success: true, 
      message: `Pedido importado e criado com status ${crmStatus} na aba Mercos.`,
      pedido: recemCriado ? { ...recemCriado, status: crmStatus } : undefined
    };
  }
}

// Rota POST (Webhook padrão do Bling)
export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      body = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      const dataParam = formData.get('data') || formData.get('json');
      if (dataParam) {
        body = JSON.parse(dataParam.toString());
      } else {
        formData.forEach((value, key) => {
          body[key] = value.toString();
        });
      }
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch (e) {
        body = { rawText: text };
      }
    }

    console.error('### WEBHOOK RECEBIDO DO BLING ###');
    console.error(JSON.stringify(body, null, 2));

    let orderId = body.data?.id || body.id;

    // Suporte ao webhook legado (v1/v2) do Bling que envia retorno.pedidos[0].pedido
    if (!orderId && body.retorno?.pedidos && Array.isArray(body.retorno.pedidos)) {
      const firstOrder = body.retorno.pedidos[0]?.pedido;
      if (firstOrder) {
        orderId = firstOrder.id || firstOrder.numero;
      }
    }

    if (!orderId) {
      return NextResponse.json({ error: 'ID do pedido não identificado no payload' }, { status: 400 });
    }

    const result = await processBlingOrder(orderId.toString(), body.timestamp ? Number(body.timestamp) : undefined);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Erro no webhook do Bling:', error);
    try {
      await d1Api.saveSystemLog({
        level: 'error',
        source: 'Bling Webhook',
        message: `Erro ao processar webhook do Bling: ${error.message || error}`,
        details: JSON.stringify({ body })
      });
    } catch (logErr) {
      console.error('Erro ao salvar log de erro no D1:', logErr);
    }
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

// Rota GET (Para testes e sincronização manual via navegador)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    if (searchParams.get('test_situations') === 'true') {
      const settings = await d1Api.getSettings();
      const accessToken = settings?.bling?.accessToken;
      if (!accessToken) {
        return NextResponse.json({ error: 'Access token missing' });
      }
      
      const res = await fetch('https://api.bling.com.br/Api/v3/situacoes/modulos/30', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const data = await res.json();
      return NextResponse.json({
        status: res.status,
        ok: res.ok,
        data: data
      });
    }

    const orderId = searchParams.get('id') || searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ 
        error: 'ID do pedido não fornecido. Use ?id=CODIGO_DO_PEDIDO_BLING' 
      }, { status: 400 });
    }

    const result = await processBlingOrder(orderId);
    return NextResponse.json({
      manualSync: true,
      ...result
    });

  } catch (error: any) {
    console.error('Erro na sincronização manual do Bling:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
