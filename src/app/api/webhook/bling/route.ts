export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

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

    const isOpen = statusName.includes('aberto');
    const isFinalized = statusName.includes('atendido') || statusName.includes('enviado') || statusName.includes('finalizado') || statusName.includes('despachado');

    // 1. Localizar o pedido correspondente no banco D1
    const pedidos = await d1Api.getPedidos();
    const pedidoLocal = pedidos.find(p => p.pedidoReferencia === orderNumber || p.id === orderNumber);

    if (isOpen) {
      if (pedidoLocal) {
        // Se o pedido já existe (por exemplo, na aba do site), apenas atualizamos informações necessárias
        const updateText = `\n[BLING ATUALIZAÇÃO] Pedido aberto no Bling em ${new Date().toLocaleString('pt-BR')}.`;
        const novaObs = (pedidoLocal.observacao || '') + updateText;
        await d1Api.updatePedidoObservacao(pedidoLocal.id, novaObs);

        return NextResponse.json({ 
          success: true, 
          message: 'Pedido já existia. Apenas informações necessárias foram atualizadas.' 
        });
      } else {
        // Se não existe, criamos o pedido sob a aba de "Pedidos Mercos" com status "em_atendimento"
        const cleanPhone = clientPhone.replace(/\D/g, '');
        let targetLeadId = '';

        // Tentar localizar lead pelo celular
        if (cleanPhone) {
          const { results } = await d1Api.runQuery(
            `SELECT id FROM leads WHERE celular = ? OR telefone = ? LIMIT 1`,
            [cleanPhone, cleanPhone]
          );
          if (results && results.length > 0) {
            targetLeadId = results[0].id;
          }
        }

        // Se não achou lead, criamos um novo lead
        if (!targetLeadId) {
          targetLeadId = Math.random().toString(36).substr(2, 9);
          const agora = new Date().toISOString();
          await d1Api.runQuery(
            `INSERT INTO leads (id, nome, celular, origem, dataCriacao, status) VALUES (?, ?, ?, 'Bling Mercos', ?, 'novo')`,
            [targetLeadId, clientName, cleanPhone || null, agora]
          );
        }

        // Criar o Pedido com origem 'mercos'
        const itensBling = data.itens ? (Array.isArray(data.itens) ? data.itens.map((i: any) => i.descricao || i.codigo).join(', ') : data.itens.toString()) : 'Produtos Mercos';
        const valorBling = parseFloat(data.total || data.valorTotal || data.valor || '0');

        await d1Api.savePedido({
          leadId: targetLeadId,
          pedidoReferencia: orderNumber,
          itens: itensBling,
          valor: valorBling,
          origem: 'mercos'
        } as any);

        // Buscar o pedido recém-criado para atualizar o status para 'em_atendimento'
        const todosPedidos = await d1Api.getPedidos();
        const recemCriado = todosPedidos.find(p => p.pedidoReferencia === orderNumber && p.origem === 'mercos');
        if (recemCriado) {
          await d1Api.updatePedidoStatus(recemCriado.id, 'em_atendimento');
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Pedido criado com sucesso na aba Mercos com status Em Atendimento.' 
        });
      }
    }

    if (isFinalized) {
      if (pedidoLocal) {
        // Atualiza o status do pedido localmente para 'enviado' (mantendo a origem original)
        await d1Api.updatePedidoStatus(pedidoLocal.id, 'enviado');

        // Salva o código de rastreamento na observação
        const trackText = trackingCode ? `\n[BLING RASTREIO] Código de Rastreamento: ${trackingCode}` : '';
        const novaObs = (pedidoLocal.observacao || '') + trackText;
        await d1Api.updatePedidoObservacao(pedidoLocal.id, novaObs);

        // Registrar no Log do sistema
        await d1Api.saveSystemLog({
          id: Math.random().toString(36).substr(2, 9),
          servico: 'Bling Integration',
          mensagem: `Pedido #${orderNumber} atualizado para 'enviado'. Rastreamento: ${trackingCode || 'não informado'}.`,
          dataCriacao: new Date().toISOString(),
          isRead: false,
          severidade: 'info'
        } as any);

        return NextResponse.json({ 
          success: true, 
          message: 'Status do pedido atualizado para Enviado e código de rastreio armazenado com sucesso.' 
        });
      } else {
        return NextResponse.json({ 
          success: true, 
          message: 'Pedido não localizado para atualização de rastreamento.' 
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Webhook recebido. Evento '${statusName}' ignorado.` 
    });

  } catch (error: any) {
    console.error('Erro na integração do Bling:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
