import { NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export const runtime = 'edge';

// Rota POST para vincular manualmente um pedido a outro lead existente ou atualizar o nome do lead
export async function POST(request: Request) {
  try {
    const { pedidoId, leadId, newLeadName } = await request.json();

    if (!pedidoId) {
      return NextResponse.json({ error: 'ID do pedido é obrigatório' }, { status: 400 });
    }

    if (leadId) {
      // 1. Re-vincular o pedido ao novo leadId
      await d1Api.updatePedidoLeadId(pedidoId, leadId);

      // Se passou um novo nome de lead, atualizar também na tabela de leads
      if (newLeadName && newLeadName.trim()) {
        await d1Api.executeRun(`UPDATE leads SET nome = ? WHERE id = ?`, [newLeadName.trim(), leadId]);
      }

      return NextResponse.json({
        success: true,
        message: 'Pedido re-vinculado com sucesso!'
      });
    }

    if (newLeadName && newLeadName.trim()) {
      // Se não passou leadId mas alterou o nome, descobre o leadId do pedido e atualiza
      const { results } = await d1Api.runQuery(`SELECT leadId FROM pedidos WHERE id = ? LIMIT 1`, [pedidoId]);
      if (results && results.length > 0 && results[0].leadId) {
        const currentLeadId = results[0].leadId;
        
        // Verifica quantos pedidos esse lead possui
        const { results: countRes } = await d1Api.runQuery(`SELECT COUNT(id) as total FROM pedidos WHERE leadId = ?`, [currentLeadId]);
        const totalPedidos = countRes && countRes.length > 0 ? countRes[0].total : 1;

        if (totalPedidos > 1) {
          // Se o lead tem mais de 1 pedido, criamos um novo lead para não afetar os outros pedidos
          const newLeadId = Math.random().toString(36).substr(2, 9);
          const agora = new Date().toISOString();
          await d1Api.executeRun(
            `INSERT INTO leads (id, nome, dataCriacao, status, origem) VALUES (?, ?, ?, 'novo', 'Manual CRM')`,
            [newLeadId, newLeadName.trim(), agora]
          );
          // Vincular apenas este pedido ao novo lead
          await d1Api.updatePedidoLeadId(pedidoId, newLeadId);
          
          return NextResponse.json({
            success: true,
            message: 'Novo cliente criado e vinculado apenas a este pedido!'
          });
        } else {
          // Se só tem 1 pedido, podemos apenas atualizar o nome do lead atual com segurança
          await d1Api.executeRun(`UPDATE leads SET nome = ? WHERE id = ?`, [newLeadName.trim(), currentLeadId]);
          return NextResponse.json({
            success: true,
            message: 'Nome do cliente atualizado com sucesso!'
          });
        }
      }
    }

    return NextResponse.json({ error: 'Nenhuma alteração fornecida' }, { status: 400 });

  } catch (error: any) {
    console.error('Erro ao atualizar lead do pedido:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

// Rota GET para buscar/pesquisar leads para o autocompletar da troca manual
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    let sql = `SELECT id, nome, celular, email, documento FROM leads ORDER BY dataCriacao DESC LIMIT 20`;
    let params: any[] = [];

    if (query.trim()) {
      const term = `%${query.trim()}%`;
      sql = `SELECT id, nome, celular, email, documento FROM leads 
             WHERE nome LIKE ? OR celular LIKE ? OR email LIKE ? OR documento LIKE ? 
             ORDER BY dataCriacao DESC LIMIT 20`;
      params = [term, term, term, term];
    }

    const { results } = await d1Api.runQuery(sql, params);
    return NextResponse.json({ leads: results || [] });

  } catch (error: any) {
    console.error('Erro ao buscar leads:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar leads' }, { status: 500 });
  }
}
