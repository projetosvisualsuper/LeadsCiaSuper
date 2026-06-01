export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para converter um lead quando uma compra é realizada no site externo.
 * Aceita POST com JSON contendo email ou telefone.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Dados recebidos no webhook:', JSON.stringify(body));
    
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
          await updateLead(lead.id, nome, telefone, valor, pedidoId);
          return NextResponse.json({ success: true, message: 'Lead atualizado via telefone fixo.' });
        }
      }

      // Criar novo lead como convertido
      const leadId = Math.random().toString(36).substr(2, 9);
      const agora = new Date().toISOString();
      await d1Api.saveLead({
        id: leadId,
        nome: nome || 'Cliente do Site',
        email: email || null,
        celular: telefone || null,
        status: 'convertido',
        tags: ['compra-realizada', 'conversao-direta'],
        origem: 'Conversão Direta (Site)',
        dataCriacao: agora,
        dataUltimaAtividade: agora,
        dataUltimaConversao: agora,
        totalConversoes: 1,
        consentimentoLGPD: true,
        observacoes: `[CONVERSÃO DIRETA] Cadastro automático via venda.${valor ? ` Valor: R$ ${valor}.` : ''}${pedidoId ? ` Pedido: ${pedidoId}.` : ''}`
      } as any);

      return NextResponse.json({ success: true, message: 'Novo lead criado e convertido.', leadId });
    }

    // Atualizar o primeiro lead encontrado
    const lead = checkResults[0];
    await updateLead(lead.id, nome, telefone, valor, pedidoId);

    return NextResponse.json({ success: true, message: 'Lead existente convertido.', leadId: lead.id });

  } catch (error: any) {
    console.error('Erro na conversão:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

async function updateLead(leadId: string, nome?: string, celular?: string, valor?: string, pedidoId?: string) {
  const { results } = await d1Api.runQuery(`SELECT * FROM leads WHERE id = ? LIMIT 1`, [leadId]);
  if (!results || results.length === 0) return;
  const data = results[0];
  
  const existingTags = data.tags ? JSON.parse(data.tags) : [];
  const newTags = ['compra-realizada'];
  if (valor) newTags.push(`valor-${valor}`);
  const mergedTags = Array.from(new Set([...existingTags, ...newTags]));
  
  const novaObs = `\n[CONVERSÃO] Compra realizada${pedidoId ? ` (Pedido: ${pedidoId})` : ''}${valor ? ` no valor de R$ ${valor}` : ''} em ${new Date().toLocaleString('pt-BR')}`;
  const observations = (data.observacoes || '') + novaObs;
  const totalConversoes = (data.totalConversoes || 1) + 1;
  const now = new Date().toISOString();

  let finalNome = data.nome;
  if (nome && (!data.nome || data.nome === 'Cliente do Site' || data.nome === 'Sem Nome' || data.nome === 'Sem nome')) {
    finalNome = nome;
  }
  
  let finalCelular = data.celular;
  if (celular && (!data.celular || data.celular === '-')) {
    finalCelular = celular;
  }

  await d1Api.executeRun(
    `UPDATE leads SET status = 'convertido', dataUltimaAtividade = ?, dataUltimaConversao = ?, totalConversoes = ?, tags = ?, observacoes = ?, nome = ?, celular = ? WHERE id = ?`,
    [now, now, totalConversoes, JSON.stringify(mergedTags), observations, finalNome, finalCelular, leadId]
  );
}
