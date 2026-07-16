export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

async function appendPedidoObservacao(pedidoId: string, text: string) {
  try {
    const { results } = await d1Api.runQuery(`SELECT observacao FROM pedidos WHERE id = ? LIMIT 1`, [pedidoId]);
    const currentObs = results?.[0]?.observacao || '';
    await d1Api.updatePedidoObservacao(pedidoId, currentObs + text);
  } catch (e) {
    console.error('Erro ao anexar observacao ao pedido:', e);
  }
}

// Função auxiliar para disparar a notificação de WhatsApp se configurado
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
async function processBlingOrder(orderId: string) {
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
          clientPhone = contactData.celular || contactData.telefone || '';
          clientEmail = contactData.email || '';
        }
      }
    } catch (contactErr) {
      console.error('Erro ao buscar detalhes do contato no Bling:', contactErr);
    }
  }

  if (!clientPhone) {
    clientPhone = data.contato?.celular || data.contato?.telefone || '';
  }

  const isOpen = statusName.includes('aberto') || statusName.includes('andamento') || statusName === '6' || statusName === '18' || statusName === '1' || statusName === '15';
  const isFinalized = statusName.includes('atendido') || statusName.includes('enviado') || statusName.includes('finalizado') || statusName.includes('despachado') || statusName === '9' || statusName === '2';
  const isCanceled = statusName.includes('cancelado') || statusName === '12' || statusName === '3';

  // 4. Localizar o pedido correspondente no banco D1
  const pedidos = await d1Api.getPedidos();
  const pedidoLocal = pedidos.find(p => p.pedidoReferencia === orderNumber || p.id === orderNumber);

  const prettyStatus = situationNome || statusNamesMap[statusName] || statusName;
  const formattedDate = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  // Mapear status para o CRM
  const isAndamento = statusName.includes('andamento') || statusName === '18' || statusName === '15';
  const isAtendido = statusName.includes('atendido') || statusName.includes('finalizado') || statusName === '9' || statusName === '2';

  let crmStatus = 'pendente';
  if (isCanceled) {
    crmStatus = 'cancelado';
  } else if (isFinalized) {
    crmStatus = isAtendido ? 'finalizado' : 'enviado';
  } else if (isOpen) {
    crmStatus = isAndamento ? 'em_atendimento' : 'pendente';
  }

  if (pedidoLocal) {
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
    const cleanPhone = clientPhone.replace(/\D/g, '');
    let targetLeadId = '';

    if (cleanPhone) {
      const { results } = await d1Api.runQuery(
        `SELECT id FROM leads WHERE celular = ? OR telefone = ? LIMIT 1`,
        [cleanPhone, cleanPhone]
      );
      if (results && results.length > 0) {
        targetLeadId = results[0].id;
      }
    }

    if (!targetLeadId) {
      const { results: nameResults } = await d1Api.runQuery(
        `SELECT id, celular, email FROM leads WHERE nome = ? LIMIT 1`,
        [clientName]
      );
      if (nameResults && nameResults.length > 0) {
        targetLeadId = nameResults[0].id;
        if (cleanPhone && !nameResults[0].celular) {
          await d1Api.executeRun(`UPDATE leads SET celular = ? WHERE id = ?`, [cleanPhone, targetLeadId]);
        }
        if (clientEmail && !nameResults[0].email) {
          await d1Api.executeRun(`UPDATE leads SET email = ? WHERE id = ?`, [clientEmail, targetLeadId]);
        }
      }
    }

    if (!targetLeadId) {
      targetLeadId = Math.random().toString(36).substr(2, 9);
      const agora = new Date().toISOString();
      await d1Api.runQuery(
        `INSERT INTO leads (id, nome, celular, email, origem, dataCriacao, status) VALUES (?, ?, ?, ?, 'Bling Mercos', ?, 'novo')`,
        [targetLeadId, clientName, cleanPhone || null, clientEmail || null, agora]
      );
    }

    const itensBling = data.itens ? (Array.isArray(data.itens) ? data.itens.map((i: any) => i.descricao || i.codigo).join(', ') : data.itens.toString()) : 'Produtos Mercos';
    const valorBling = parseFloat(data.total || '0');

    await d1Api.savePedido({
      leadId: targetLeadId,
      pedidoReferencia: orderNumber,
      itens: itensBling,
      valor: valorBling,
      origem: 'mercos',
      numeroLojaVirtual: numeroLojaVirtual,
      observacao: `[BLING CRIAÇÃO] Pedido criado com status "${prettyStatus}" no Bling em ${formattedDate}.`
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

    const result = await processBlingOrder(orderId.toString());
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Erro no webhook do Bling:', error);
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
