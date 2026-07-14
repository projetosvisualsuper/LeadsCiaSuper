export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para converter um lead ou registrar uma cotação quando uma compra/cotação é realizada no site externo.
 * Aceita POST com JSON contendo dados do WooCommerce ou payload direto.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Dados recebidos no webhook de conversão/cotação:', JSON.stringify(body));
    
    // Função auxiliar para buscar campo em objetos aninhados (comum em WooCommerce/Zapier)
    const getField = (obj: any, keys: string[]): string => {
      for (const key of keys) {
        if (obj[key] && typeof obj[key] !== 'object') return String(obj[key]);
      }
      // Busca em objetos aninhados comuns
      const subObjs = ['billing', 'customer', 'data', 'shipping', 'user'];
      for (const sub of subObjs) {
        if (obj[sub] && typeof obj[sub] === 'object') {
          for (const key of keys) {
            if (obj[sub][key] && typeof obj[sub][key] !== 'object') return String(obj[sub][key]);
          }
        }
      }
      return '';
    };

    // Função para buscar valores dentro do array meta_data do WooCommerce
    const getMetaValue = (keyName: string): string => {
      if (body.meta_data && Array.isArray(body.meta_data)) {
        const found = body.meta_data.find((m: any) => m.key === keyName);
        return found ? String(found.value) : '';
      }
      return body[keyName] ? String(body[keyName]) : '';
    };

    // Função auxiliar para buscar campo priorizando getField e depois meta_data
    const getValue = (keys: string[]): string => {
      const val = getField(body, keys);
      if (val) return val;
      for (const key of keys) {
        const metaVal = getMetaValue(key);
        if (metaVal) return metaVal;
      }
      return '';
    };

    const email = getValue(['email', 'email_address', 'user_email', 'billing_email', 'your-email', 'your_email', 'ywraq_customer_email', 'customer_email', 'ywraq_billing_email']);
    const rawTelefone = getValue(['telefone', 'phone', 'celular', 'mobile', 'billing_phone', 'phone_number', 'your-phone', 'your_phone', 'telephone', 'ywraq_customer_phone', 'customer_phone', 'ywraq_billing_phone']);
    const telefone = rawTelefone.replace(/\D/g, '');
    
    // Tenta extrair nome completo ou primeiro/último nome
    let nome = getValue(['nome', 'name', 'full_name', 'billing_first_name', 'first_name', 'your-name', 'your_name', 'ywraq_customer_name', 'customer_name', 'ywraq_billing_name']);
    const sobrenome = getValue(['sobrenome', 'last_name', 'billing_last_name']);
    if (nome && sobrenome && !nome.includes(sobrenome)) nome += ' ' + sobrenome;

    const valor = getValue(['valor', 'total', 'amount', 'order_total']);
    const pedidoId = getValue(['pedidoId', 'order_id', 'id', 'number', 'order_number']);

    // Identificar se é uma Cotação (Suporta YITH WooCommerce Request a Quote)
    const isYithRaq = getMetaValue('ywraq_raq') === 'yes' || getMetaValue('ywraq_raq_status') !== '';
    const rawStatus = getField(body, ['status']).toLowerCase();
    const paymentMethod = getField(body, ['payment_method', 'payment_method_title']).toLowerCase();
    
    const isCotacao = isYithRaq ||
                      rawStatus.includes('cotacao') || 
                      rawStatus.includes('quote') || 
                      rawStatus.includes('orcamento') ||
                      paymentMethod.includes('cotacao') ||
                      paymentMethod.includes('quote') ||
                      paymentMethod.includes('orcamento') ||
                      body.tipo === 'cotacao';

    // Extrair mensagem/observação do cliente
    const mensagemCliente = getMetaValue('ywraq_customer_message') || getField(body, ['customer_note', 'note', 'message', 'mensagem']);

    // Extrair produtos do WooCommerce (line_items) ou campo produtos genérico
    let itensFormatados = '';
    if (body.line_items && Array.isArray(body.line_items)) {
      itensFormatados = body.line_items
        .map((item: any) => `${item.name} (Qtd: ${item.quantity || 1})`)
        .join(', ');
    } else if (body.produtos) {
      itensFormatados = typeof body.produtos === 'string' ? body.produtos : JSON.stringify(body.produtos);
    }

    if (!email && !telefone) {
      return NextResponse.json({ error: 'Identificador (email ou telefone) não encontrado no payload.' }, { status: 400 });
    }

    const { results: checkResults } = await d1Api.runQuery(
      email 
        ? `SELECT * FROM leads WHERE email = ? LIMIT 1`
        : `SELECT * FROM leads WHERE celular = ? LIMIT 1`,
      [email || telefone]
    );

    let finalLeadId = '';
    let actionMessage = '';

    if (!checkResults || checkResults.length === 0) {
      // Se não encontrar por celular, tenta por telefone fixo se foi passado telefone
      let foundByFixo = false;
      if (!email && telefone) {
        const { results: checkResults2 } = await d1Api.runQuery(
          `SELECT * FROM leads WHERE telefone = ? LIMIT 1`,
          [telefone]
        );
        if (checkResults2 && checkResults2.length > 0) {
          const lead = checkResults2[0];
          await updateLead(lead.id, isCotacao, itensFormatados, mensagemCliente, nome, telefone, valor, pedidoId);
          finalLeadId = lead.id;
          actionMessage = 'Lead de cotação/venda atualizado via telefone fixo.';
          foundByFixo = true;
        }
      }

      if (!foundByFixo) {
        // Criar novo lead
        finalLeadId = Math.random().toString(36).substr(2, 9);
        const agora = new Date().toISOString();
        
        const leadStatus = isCotacao ? 'novo' : 'convertido';
        const leadTags = ['conversao-direta'];
        if (valor) leadTags.push(`valor-${valor}`);
        leadTags.push(isCotacao ? 'cotação' : 'venda');
        
        let observacao = '';
        if (isCotacao) {
          observacao = `[COTAÇÃO RECEBIDA] Produtos: ${itensFormatados || 'Não informados'}.${valor ? ` Valor estimado: R$ ${valor}.` : ''}${pedidoId ? ` ID Cotação: ${pedidoId}.` : ''}${mensagemCliente ? ` Observação do Cliente: "${mensagemCliente}".` : ''}`;
        } else {
          observacao = `[CONVERSÃO DIRETA] Cadastro automático via venda.${itensFormatados ? ` Produtos: ${itensFormatados}.` : ''}${valor ? ` Valor: R$ ${valor}.` : ''}${pedidoId ? ` Pedido: ${pedidoId}.` : ''}${mensagemCliente ? ` Observação do Cliente: "${mensagemCliente}".` : ''}`;
        }

        await d1Api.saveLead({
          id: finalLeadId,
          nome: nome || 'Cliente do Site',
          email: email || null,
          celular: telefone || null,
          status: leadStatus,
          tags: leadTags,
          origem: isCotacao ? 'Cotação (WooCommerce)' : 'Conversão Direta (Site)',
          dataCriacao: agora,
          dataUltimaAtividade: agora,
          dataUltimaConversao: agora,
          totalConversoes: 1,
          consentimentoLGPD: true,
          observacoes: observacao
        } as any);

        actionMessage = `Novo lead criado como ${isCotacao ? 'Cotação' : 'Venda'}.`;
      }
    } else {
      // --- Atualizar o primeiro lead encontrado ---
      const lead = checkResults[0];
      await updateLead(lead.id, isCotacao, itensFormatados, mensagemCliente, nome, telefone, valor, pedidoId);
      finalLeadId = lead.id;
      actionMessage = `Lead existente atualizado (${isCotacao ? 'Cotação' : 'Venda'}).`;
    }

    // --- CRIAR OU ATUALIZAR O REGISTRO DO PEDIDO OU OPORTUNIDADE ---
    if (pedidoId || isCotacao || itensFormatados) {
      if (isCotacao) {
        // Se for cotação, cria/atualiza na tabela de oportunidades com status 'cotacao'
        const { results: existingOpps } = await d1Api.runQuery(
          `SELECT * FROM opportunities WHERE leadId = ? AND status = 'cotacao' LIMIT 1`,
          [finalLeadId]
        );

        const oppObs = `[COTAÇÃO DO SITE] Pedido/Cotação: ${pedidoId || 'N/A'}\nProdutos: ${itensFormatados || 'Não informados'}\nValor: R$ ${valor || '0.00'}\nObs do Cliente: ${mensagemCliente || 'Nenhuma'}`;

        if (existingOpps && existingOpps.length > 0) {
          const existingOpp = existingOpps[0];
          await d1Api.updateOpportunityObservacao(existingOpp.id, oppObs);
        } else {
          // Buscar primeiro usuário administrador ou master para ser o atendente padrão
          const { results: adminUsers } = await d1Api.runQuery(`SELECT uid FROM users WHERE role = 'admin' OR role = 'master' LIMIT 1`);
          const defaultAssignedTo = adminUsers && adminUsers.length > 0 ? adminUsers[0].uid : 'sistema';

          await d1Api.saveOpportunity({
            leadId: finalLeadId,
            assignedTo: defaultAssignedTo,
            status: 'cotacao',
            observacao: oppObs
          } as any);
        }
      } else {
        let mappedStatus = 'pendente';
        if (rawStatus) {
          if (['cancelled', 'canceled', 'failed', 'refunded'].includes(rawStatus)) {
            mappedStatus = 'cancelado';
          } else if (['completed'].includes(rawStatus)) {
            mappedStatus = 'finalizado';
          } else if (['processing'].includes(rawStatus)) {
            mappedStatus = 'em_atendimento';
          } else if (['pending', 'on-hold', 'pending-payment'].includes(rawStatus)) {
            mappedStatus = 'pendente';
          }
        }

        if (pedidoId) {
          const { results: existingPedidos } = await d1Api.runQuery(
            `SELECT * FROM pedidos WHERE pedidoReferencia = ? LIMIT 1`,
            [pedidoId]
          );

          if (existingPedidos && existingPedidos.length > 0) {
            const existingPedido = existingPedidos[0];
            await d1Api.updatePedidoStatus(existingPedido.id, mappedStatus);
            
            // Atualiza itens e valor se fornecidos
            await d1Api.executeRun(
              `UPDATE pedidos SET itens = ?, valor = ? WHERE id = ?`,
              [itensFormatados || existingPedido.itens, valor ? parseFloat(valor) : existingPedido.valor, existingPedido.id]
            );
          } else {
            await d1Api.savePedido({
              leadId: finalLeadId,
              pedidoReferencia: pedidoId,
              itens: itensFormatados || 'Produtos não informados',
              valor: valor ? parseFloat(valor) : undefined,
              status: mappedStatus
            } as any);
          }
        } else {
          await d1Api.savePedido({
            leadId: finalLeadId,
            pedidoReferencia: `P-${Math.floor(Math.random() * 10000)}`,
            itens: itensFormatados || 'Produtos não informados',
            valor: valor ? parseFloat(valor) : undefined,
            status: mappedStatus
          } as any);
        }
      }
    }

    return NextResponse.json({ success: true, message: actionMessage, leadId: finalLeadId });

  } catch (error: any) {
    console.error('Erro na conversão:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

async function updateLead(leadId: string, isCotacao: boolean, itensFormatados: string, mensagemCliente: string, nome?: string, celular?: string, valor?: string, pedidoId?: string) {
  const { results } = await d1Api.runQuery(`SELECT * FROM leads WHERE id = ? LIMIT 1`, [leadId]);
  if (!results || results.length === 0) return;
  const data = results[0];
  
  const existingTags = data.tags ? JSON.parse(data.tags) : [];
  const newTags = [];
  if (valor) newTags.push(`valor-${valor}`);
  newTags.push(isCotacao ? 'cotação' : 'venda');
  
  const filteredExisting = existingTags.filter((t: string) => t !== 'venda' && t !== 'cotação' && t !== 'compra-realizada');
  const mergedTags = [...filteredExisting, ...newTags];
  
  let novaObs = '';
  if (isCotacao) {
    novaObs = `\n[COTAÇÃO] Cotação realizada em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}${pedidoId ? ` (Cotação ID: ${pedidoId})` : ''}. Produtos: ${itensFormatados || 'Não informados'}.${valor ? ` Valor: R$ ${valor}` : ''}.${mensagemCliente ? ` Obs do Cliente: "${mensagemCliente}"` : ''}`;
  } else {
    novaObs = `\n[CONVERSÃO] Compra realizada${pedidoId ? ` (Pedido: ${pedidoId})` : ''}${itensFormatados ? `. Produtos: ${itensFormatados}` : ''}${valor ? `. Valor: R$ ${valor}` : ''}${mensagemCliente ? `. Obs do Cliente: "${mensagemCliente}"` : ''} em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
  }

  const observations = (data.observacoes || '') + novaObs;
  const totalConversoes = (data.totalConversoes || 0) + 1;
  const now = new Date().toISOString();

  let finalNome = data.nome;
  if (nome && (!data.nome || data.nome === 'Cliente do Site' || data.nome === 'Sem Nome' || data.nome === 'Sem nome')) {
    finalNome = nome;
  }
  
  let finalCelular = data.celular;
  if (celular && (!data.celular || data.celular === '-')) {
    finalCelular = celular;
  }

  // Se for cotação, mudamos o status do lead de volta para 'novo' para que os consultores vejam a notificação no painel
  const finalStatus = isCotacao ? 'novo' : 'convertido';

  await d1Api.executeRun(
    `UPDATE leads SET status = ?, dataUltimaAtividade = ?, dataUltimaConversao = ?, totalConversoes = ?, tags = ?, observacoes = ?, nome = ?, celular = ? WHERE id = ?`,
    [finalStatus, now, now, totalConversoes, JSON.stringify(mergedTags), observations, finalNome, finalCelular, leadId]
  );
}
