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

    const email = getField(body, ['email', 'email_address', 'user_email', 'billing_email']);
    const rawTelefone = getField(body, ['telefone', 'phone', 'celular', 'mobile', 'billing_phone', 'phone_number']);
    const telefone = rawTelefone.replace(/\D/g, '');
    
    // Tenta extrair nome completo ou primeiro/último nome
    let nome = getField(body, ['nome', 'name', 'full_name', 'billing_first_name', 'first_name']);
    const sobrenome = getField(body, ['sobrenome', 'last_name', 'billing_last_name']);
    if (nome && sobrenome && !nome.includes(sobrenome)) nome += ' ' + sobrenome;

    const valor = getField(body, ['valor', 'total', 'amount', 'order_total']);
    const pedidoId = getField(body, ['pedidoId', 'order_id', 'id', 'number', 'order_number']);

    // Identificar se é uma Cotação
    const rawStatus = getField(body, ['status']).toLowerCase();
    const isCotacao = rawStatus.includes('cotacao') || 
                      rawStatus.includes('quote') || 
                      rawStatus.includes('orcamento') ||
                      body.tipo === 'cotacao';

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

    if (!checkResults || checkResults.length === 0) {
      // Se não encontrar por celular, tenta por telefone fixo se foi passado telefone
      if (!email && telefone) {
        const { results: checkResults2 } = await d1Api.runQuery(
          `SELECT * FROM leads WHERE telefone = ? LIMIT 1`,
          [telefone]
        );
        if (checkResults2 && checkResults2.length > 0) {
          const lead = checkResults2[0];
          await updateLead(lead.id, isCotacao, itensFormatados, nome, telefone, valor, pedidoId);
          return NextResponse.json({ success: true, message: 'Lead de cotação/venda atualizado via telefone fixo.' });
        }
      }

      // Criar novo lead
      const leadId = Math.random().toString(36).substr(2, 9);
      const agora = new Date().toISOString();
      
      const leadStatus = isCotacao ? 'novo' : 'convertido';
      const leadTags = ['conversao-direta'];
      if (valor) leadTags.push(`valor-${valor}`);
      leadTags.push(isCotacao ? 'cotação' : 'venda');
      
      let observacao = '';
      if (isCotacao) {
        observacao = `[COTAÇÃO RECEBIDA] Produtos: ${itensFormatados}.${valor ? ` Valor estimado: R$ ${valor}.` : ''}${pedidoId ? ` ID Cotação: ${pedidoId}.` : ''}`;
      } else {
        observacao = `[CONVERSÃO DIRETA] Cadastro automático via venda.${valor ? ` Valor: R$ ${valor}.` : ''}${pedidoId ? ` Pedido: ${pedidoId}.` : ''}`;
      }

      await d1Api.saveLead({
        id: leadId,
        nome: nome || 'Cliente do Site',
        email: email || null,
        celular: telefone || null,
        status: leadStatus,
        tags: leadTags,
        origem: isCotacao ? 'Cotação (WooCommerce)' : 'Conversão Direta (Site)',
        dataCriacao: agora,
        dataUltimaAtividade: agora,
        dataUltimaConversao: isCotacao ? null : agora,
        totalConversoes: isCotacao ? 0 : 1,
        consentimentoLGPD: true,
        observacoes: observacao
      } as any);

      return NextResponse.json({ success: true, message: `Novo lead criado como ${isCotacao ? 'Cotação' : 'Venda'}.`, leadId });
    }

    // --- Atualizar o primeiro lead encontrado ---
    const lead = checkResults[0];
    await updateLead(lead.id, isCotacao, itensFormatados, nome, telefone, valor, pedidoId);

    return NextResponse.json({ success: true, message: `Lead existente atualizado (${isCotacao ? 'Cotação' : 'Venda'}).`, leadId: lead.id });

  } catch (error: any) {
    console.error('Erro na conversão:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

async function updateLead(leadId: string, isCotacao: boolean, itensFormatados: string, nome?: string, celular?: string, valor?: string, pedidoId?: string) {
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
    novaObs = `\n[COTAÇÃO] Cotação realizada em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}${pedidoId ? ` (Cotação ID: ${pedidoId})` : ''}. Produtos: ${itensFormatados}.${valor ? ` Valor: R$ ${valor}` : ''}`;
  } else {
    novaObs = `\n[CONVERSÃO] Compra realizada${pedidoId ? ` (Pedido: ${pedidoId})` : ''}${valor ? ` no valor de R$ ${valor}` : ''} em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
  }

  const observations = (data.observacoes || '') + novaObs;
  const totalConversoes = isCotacao ? (data.totalConversoes || 0) : (data.totalConversoes || 1) + 1;
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
    [finalStatus, now, isCotacao ? data.dataUltimaConversao : now, totalConversoes, JSON.stringify(mergedTags), observations, finalNome, finalCelular, leadId]
  );
}
