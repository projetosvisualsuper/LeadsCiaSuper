export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

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
          'Authorization': `Basic ${basicAuth}`
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
        console.error('Falha ao atualizar token do Bling:', await refreshResponse.text());
      }
    } catch (tokenErr) {
      console.error('Erro de rede ao atualizar token do Bling:', tokenErr);
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
  // A situação pode vir como ID ou nome
  const statusName = (data.situacao?.nome || '').toString().toLowerCase() || (data.situacao?.id || '').toString();
  
  // Rastreamento
  let trackingCode = '';
  if (data.transporte?.volumes && Array.isArray(data.transporte.volumes)) {
    const volume = data.transporte.volumes[0];
    trackingCode = volume?.codigoRastreamento || volume?.rastreamento || '';
  }

  // Cliente
  const clientName = data.contato?.nome || 'Cliente';
  let clientPhone = data.contato?.celular || data.contato?.telefone || '';

  const isOpen = statusName.includes('aberto') || statusName.includes('andamento') || statusName === '6' || statusName === '18' || statusName === '1';
  const isFinalized = statusName.includes('atendido') || statusName.includes('enviado') || statusName.includes('finalizado') || statusName.includes('despachado') || statusName === '9' || statusName === '15' || statusName === '2';
  const isCanceled = statusName.includes('cancelado') || statusName === '12' || statusName === '3';

  // 4. Localizar o pedido correspondente no banco D1
  const pedidos = await d1Api.getPedidos();
  const pedidoLocal = pedidos.find(p => p.pedidoReferencia === orderNumber || p.id === orderNumber);

  if (isOpen) {
    if (pedidoLocal) {
      const updateText = `\n[BLING ATUALIZAÇÃO] Pedido aberto no Bling em ${new Date().toLocaleString('pt-BR')}.`;
      const novaObs = (pedidoLocal.observacao || '') + updateText;
      await d1Api.updatePedidoObservacao(pedidoLocal.id, novaObs);

      return { 
        success: true, 
        message: 'Pedido já existia. Apenas observações atualizadas.',
        pedido: pedidoLocal
      };
    } else {
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
        targetLeadId = Math.random().toString(36).substr(2, 9);
        const agora = new Date().toISOString();
        await d1Api.runQuery(
          `INSERT INTO leads (id, nome, celular, origem, dataCriacao, status) VALUES (?, ?, ?, 'Bling Mercos', ?, 'novo')`,
          [targetLeadId, clientName, cleanPhone || null, agora]
        );
      }

      const itensBling = data.itens ? (Array.isArray(data.itens) ? data.itens.map((i: any) => i.descricao || i.codigo).join(', ') : data.itens.toString()) : 'Produtos Mercos';
      const valorBling = parseFloat(data.total || '0');

      await d1Api.savePedido({
        leadId: targetLeadId,
        pedidoReferencia: orderNumber,
        itens: itensBling,
        valor: valorBling,
        origem: 'mercos'
      } as any);

      const todosPedidos = await d1Api.getPedidos();
      const recemCriado = todosPedidos.find(p => p.pedidoReferencia === orderNumber && p.origem === 'mercos');
      if (recemCriado) {
        await d1Api.updatePedidoStatus(recemCriado.id, 'em_atendimento');
      }

      return { 
        success: true, 
        message: 'Pedido criado com sucesso na aba Mercos com status Em Atendimento.',
        pedido: recemCriado
      };
    }
  }

  if (isFinalized) {
    if (pedidoLocal) {
      await d1Api.updatePedidoStatus(pedidoLocal.id, 'enviado');

      const trackText = trackingCode ? `\n[BLING RASTREIO] Código de Rastreamento: ${trackingCode}` : '';
      const novaObs = (pedidoLocal.observacao || '') + trackText;
      await d1Api.updatePedidoObservacao(pedidoLocal.id, novaObs);

      // Disparar mensagem de WhatsApp automática se ativado nas configurações
      if (settings.bling?.enabled) {
        try {
          const leadResult = await d1Api.runQuery(`SELECT nome, celular FROM leads WHERE id = ? LIMIT 1`, [pedidoLocal.leadId]);
          const targetLead = leadResult.results?.[0];
          
          if (targetLead && targetLead.celular) {
            const cleanPhone = targetLead.celular.replace(/\D/g, '');
            if (cleanPhone) {
              const msgText = `Olá, *${targetLead.nome}*! Seu pedido *#${orderNumber}* foi enviado com sucesso! 🚀\n\nVocê pode acompanhar a entrega e rastrear seu pedido através do nosso portal:\n🔗 https://portal.visualsuper.com.br\n\nObrigado pela confiança! 😊`;
              
              const { sendOmnichannelMessageAction } = await import('@/app/actions/chat');
              
              if (settings.bling.templateName) {
                await sendOmnichannelMessageAction(
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
                await sendOmnichannelMessageAction(
                  cleanPhone,
                  'whatsapp',
                  msgText
                );
              }
              console.error(`Notificação automática enviada com sucesso para ${targetLead.nome}`);
            }
          }
        } catch (msgErr) {
          console.error('Erro ao disparar notificação automática do Bling:', msgErr);
        }
      }

      await d1Api.saveSystemLog({
        level: 'info',
        source: 'Bling Integration',
        message: `Pedido #${orderNumber} atualizado para 'enviado'. Rastreamento: ${trackingCode || 'não informado'}.`,
        details: null
      });

      return { 
        success: true, 
        message: 'Status do pedido atualizado para Enviado e código de rastreio armazenado.',
        pedido: pedidoLocal
      };
    } else {
      return { 
        success: true, 
        message: 'Pedido não localizado no CRM para atualização de rastreamento.' 
      };
    }
  }

  if (isCanceled) {
    if (pedidoLocal) {
      await d1Api.updatePedidoStatus(pedidoLocal.id, 'cancelado');
      return { 
        success: true, 
        message: 'Status do pedido atualizado para Cancelado no CRM.',
        pedido: pedidoLocal
      };
    } else {
      return { 
        success: true, 
        message: 'Pedido cancelado no Bling, mas não localizado no CRM.' 
      };
    }
  }

  return { 
    success: true, 
    message: `Pedido recebido. Evento com status '${statusName}' ignorado (apenas status em aberto ou faturados são processados).` 
  };
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
