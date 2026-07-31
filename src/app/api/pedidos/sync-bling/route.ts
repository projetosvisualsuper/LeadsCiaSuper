export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

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
      // Priorizar pedidoReferencia (ID/Número do Bling), numeroLojaVirtual ou id do pedido
      const ref = p.pedidoReferencia || p.numeroLojaVirtual || p.id;
      if (!ref) {
        puladosCount++;
        continue;
      }

      try {
        // Tentar consultar via fetch relativo com fallback para chamada interna
        let res: Response | null = null;
        try {
          res = await fetch(`${blingWebhookUrl}?id=${encodeURIComponent(ref)}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
        } catch (fetchErr) {
          // Se falhar o fetch com URL absoluta, tentar relativo /api/webhook/bling
          const origin = req.nextUrl.origin;
          res = await fetch(`${origin}/api/webhook/bling?id=${encodeURIComponent(ref)}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
        }

        if (res && res.ok) {
          const resData = await res.json();
          if (resData.error) {
            falhasCount++;
            logs.push(`[FALHA] Pedido ${ref}: ${resData.error}`);
          } else {
            atualizadosCount++;
            logs.push(`[SUCESSO] Pedido ${ref}: Lead ${resData.pedido?.leadNome || 'atualizado'}`);
          }
        } else {
          falhasCount++;
          const errBody = res ? await res.text() : 'Sem resposta';
          logs.push(`[AVISO] Pedido ${ref}: Resposta status ${res?.status} - ${errBody.substring(0, 100)}`);
        }
      } catch (err: any) {
        falhasCount++;
        logs.push(`[ERRO] Pedido ${ref}: ${err.message}`);
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
