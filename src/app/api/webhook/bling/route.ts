export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';
import { sendOmnichannelMessageAction } from '@/app/actions/chat';

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
        // Converter form data para objeto plano
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

    // LOG PARA DEBUG
    console.error('### WEBHOOK RECEBIDO DO BLING ###');
    console.error(JSON.stringify(body, null, 2));

    // Extrair dados do Bling (Suporta V3 e V2 estruturado)
    const event = body.event || '';
    const data = body.data || body.retorno || body;

    // Obter dados principais do pedido
    const orderNumber = (data.numero || data.numeroPedido || '').toString();
    const statusName = (data.situacao?.nome || data.situacao?.descricao || data.status || '').toString().toLowerCase();
    
    // Rastreamento
    let trackingCode = '';
    if (data.transporte?.volumes && Array.isArray(data.transporte.volumes)) {
      const volume = data.transporte.volumes[0];
      trackingCode = volume?.codigoRastreamento || volume?.rastreamento || '';
    } else if (data.codigoRastreamento || data.rastreio) {
      trackingCode = data.codigoRastreamento || data.rastreio || '';
    }

    // Cliente
    const clientName = data.cliente?.nome || data.cliente?.razaoSocial || 'Cliente';
    let clientPhone = data.cliente?.celular || data.cliente?.fone || data.cliente?.telefone || '';

    // Se não tiver número de pedido ou status, não prossegue
    if (!orderNumber) {
      return NextResponse.json({ error: 'Número do pedido não identificado' }, { status: 400 });
    }

    // Verificar se o status recebido é de finalização/envio
    // Bling V3 padrão para despachado/finalizado é 'Atendido'
    const isFinalized = statusName.includes('atendido') || statusName.includes('enviado') || statusName.includes('finalizado') || statusName.includes('despachado');

    if (!isFinalized) {
      return NextResponse.json({ success: true, message: `Ignorado. Status '${statusName}' não indica envio.` });
    }

    // 1. Localizar o pedido correspondente no banco D1
    const pedidos = await d1Api.getPedidos();
    const pedidoLocal = pedidos.find(p => p.pedidoReferencia === orderNumber || p.id === orderNumber);

    let targetLeadId = '';
    let pedidoIdLocal = '';

    if (pedidoLocal) {
      pedidoIdLocal = pedidoLocal.id;
      targetLeadId = pedidoLocal.leadId;

      // Atualiza o status do pedido localmente para 'enviado'
      await d1Api.updatePedidoStatus(pedidoIdLocal, 'enviado');

      // Salva o código de rastreamento na observação
      const trackText = trackingCode ? `\n[BLING RASTREIO] Código de Rastreamento: ${trackingCode}` : '';
      const novaObs = (pedidoLocal.observacao || '') + trackText;
      await d1Api.updatePedidoObservacao(pedidoIdLocal, novaObs);
    }

    // 2. Tentar achar o celular do cliente se não recebido pelo webhook
    if (!clientPhone && targetLeadId) {
      const { results } = await d1Api.runQuery(`SELECT celular, telefone FROM leads WHERE id = ? LIMIT 1`, [targetLeadId]);
      if (results && results.length > 0) {
        clientPhone = results[0].celular || results[0].telefone || '';
      }
    }

    // Limpar o número de telefone
    const cleanPhone = clientPhone.replace(/\D/g, '');

    if (!cleanPhone) {
      return NextResponse.json({ 
        success: true, 
        message: 'Pedido atualizado para Enviado, mas o cliente não possui telefone configurado para envio de notificação.' 
      });
    }

    // 3. Carregar configurações do Bling no CRM para envio do WhatsApp
    const settings = await d1Api.getSettings();
    const blingConfig = settings.bling;

    // Se estiver explicitamente desativado, encerra com sucesso
    if (blingConfig && blingConfig.enabled === false) {
      return NextResponse.json({ 
        success: true, 
        message: 'Pedido atualizado para Enviado. Notificações do Bling estão desativadas nas configurações.' 
      });
    }

    // 4. Disparar a notificação
    const templateName = blingConfig?.templateName;
    const templateLanguage = blingConfig?.templateLanguage || 'pt_BR';

    let responseWhatsapp;
    if (templateName) {
      // Enviar usando template oficial homologado da Meta
      responseWhatsapp = await sendOmnichannelMessageAction(
        cleanPhone,
        'whatsapp',
        '',
        undefined,
        {
          name: templateName,
          language: templateLanguage,
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: clientName },
                { type: 'text', text: orderNumber },
                { type: 'text', text: trackingCode || 'Verificar com atendimento' }
              ]
            }
          ]
        }
      );
    } else {
      // Enviar mensagem de texto padrão
      const defaultText = `Olá *${clientName}*! Seu pedido *#${orderNumber}* foi postado e já está a caminho! 🚚\n\n*Código de Rastreamento:* ${trackingCode || 'Disponível em breve'}\n\nAcompanhe a entrega com carinho!`;
      responseWhatsapp = await sendOmnichannelMessageAction(
        cleanPhone,
        'whatsapp',
        defaultText
      );
    }

    // Registrar no Log do sistema
    await d1Api.saveSystemLog({
      id: Math.random().toString(36).substr(2, 9),
      servico: 'Bling Integration',
      mensagem: `Pedido #${orderNumber} atualizado para 'enviado'. WhatsApp enviado para ${cleanPhone}. Resposta: ${JSON.stringify(responseWhatsapp)}`,
      dataCriacao: new Date().toISOString(),
      isRead: false,
      severidade: responseWhatsapp.success ? 'info' : 'erro'
    } as any);

    return NextResponse.json({ 
      success: true, 
      message: 'Status atualizado para Enviado e notificação enviada com sucesso.',
      whatsapp: responseWhatsapp 
    });

  } catch (error: any) {
    console.error('Erro na integração do Bling:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
