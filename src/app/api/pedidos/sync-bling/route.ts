export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';
import { processBlingOrder } from '@/app/api/webhook/bling/route';

/**
 * Endpoint de Sincronização em Massa (Bulk Resync)
 * Percorre todos os pedidos do CRM (ou até um limite recente) e refaz
 * a busca no Bling para atualizar os nomes dos leads, documentos e status.
 */
export async function GET(req: NextRequest) {
  return handleSync(req);
}

export async function POST(req: NextRequest) {
  return handleSync(req);
}

async function handleSync(req: NextRequest) {
  const startTime = Date.now();
  const logs: string[] = [];

  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit') || '100';
    const limit = parseInt(limitParam, 10) || 100;
    
    // Configurações do Bling
    const settings = await d1Api.getSettings();
    const accessToken = settings?.bling?.accessToken;

    if (!accessToken) {
      return NextResponse.json({
        error: 'Token do Bling não configurado nas Integrações.'
      }, { status: 400 });
    }

    // Buscar pedidos mais recentes no CRM
    const todosPedidos = await d1Api.getPedidos();
    // Filtrar pedidos que possuem pedidoReferencia (ID ou Número no Bling)
    const pedidosBling = todosPedidos.slice(0, limit);

    logs.push(`Iniciando sincronização de até ${pedidosBling.length} pedidos mais recentes com o Bling...`);

    let atualizadosCount = 0;
    let falhasCount = 0;
    let puladosCount = 0;

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const blingWebhookUrl = `${protocol}://${host}/api/webhook/bling`;

    for (const p of pedidosBling) {
      // Usar a referência do Bling (pedidoReferencia) ou o ID do pedido
      const ref = p.pedidoReferencia || p.id;
      if (!ref) {
        puladosCount++;
        continue;
      }

      try {
        const resData = await processBlingOrder(ref);
        if (resData && resData.success) {
          atualizadosCount++;
          logs.push(`[SUCESSO] Pedido ${ref}: Sincronizado com sucesso`);
        } else {
          falhasCount++;
          logs.push(`[FALHA] Pedido ${ref}`);
        }
      } catch (err: any) {
        falhasCount++;
        logs.push(`[ERRO] Pedido ${ref}: ${err.message || err}`);
      }
    }

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída em ${durationSeconds}s.`,
      estatisticas: {
        totalProcessados: pedidosBling.length,
        atualizadosComSucesso: atualizadosCount,
        falhas: falhasCount,
        pulados: puladosCount
      },
      logs
    });

  } catch (error: any) {
    console.error('Erro na sincronização em massa do Bling:', error);
    return NextResponse.json({
      error: error.message || 'Erro interno durante a sincronização em massa.'
    }, { status: 500 });
  }
}
