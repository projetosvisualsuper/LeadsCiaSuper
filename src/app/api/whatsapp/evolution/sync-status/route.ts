export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export async function GET(req: NextRequest) {
  try {
    const settings = await d1Api.getSettings();
    const apiUrl = settings?.omnichannel?.evolutionApiUrl?.replace(/\/$/, '');
    const apiKey = settings?.omnichannel?.evolutionApiKey;

    const connections = await d1Api.getWhatsappConnections();
    const evolutionConnections = connections.filter(c => c.type === 'evolution_api' && c.evolutionInstanceName);

    if (!apiUrl || !apiKey || evolutionConnections.length === 0) {
      return NextResponse.json(connections);
    }

    await Promise.all(
      evolutionConnections.map(async (conn) => {
        const instanceName = conn.evolutionInstanceName?.trim();
        if (!instanceName) return;

        try {
          // 1. Consultar estado da conexão na Evolution API
          const statusRes = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': apiKey }
          });

          if (statusRes.ok) {
            const statusData = await statusRes.json();
            const state = statusData.instance?.state || statusData.state;

            if (state === 'open') {
              if (conn.status !== 'connected') {
                await d1Api.updateWhatsappConnection(conn.id, { status: 'connected' });
              }
              return;
            }

            // 2. Se a conexão estiver em 'close' ou 'connecting', tentar auto-reconnect na Evolution
            if (state === 'close' || state === 'connecting') {
              try {
                const connectRes = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
                  method: 'GET',
                  headers: { 'apikey': apiKey }
                });
                if (connectRes.ok) {
                  const connectData = await connectRes.json();
                  const newState = connectData.instance?.state || connectData.state;
                  if (newState === 'open') {
                    await d1Api.updateWhatsappConnection(conn.id, { status: 'connected' });
                    return;
                  }
                }
              } catch (connectErr) {
                console.error(`[Evolution Sync] Erro ao reconectar instância ${instanceName}:`, connectErr);
              }

              if (conn.status !== 'pending' && conn.status !== 'disconnected') {
                await d1Api.updateWhatsappConnection(conn.id, { status: 'pending' });
              }
            }
          }
        } catch (err) {
          console.error(`[Evolution Sync] Erro ao consultar ${instanceName}:`, err);
        }
      })
    );

    // Retorna a lista atualizada de conexões
    const freshConnections = await d1Api.getWhatsappConnections();
    return NextResponse.json(freshConnections);
  } catch (error: any) {
    console.error('Erro na rota sync-status Evolution:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
