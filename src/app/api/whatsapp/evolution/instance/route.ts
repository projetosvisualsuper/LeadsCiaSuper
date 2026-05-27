export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/services/api';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let instanceName = searchParams.get('instanceName');
    const connectionId = searchParams.get('connectionId');

    // 1. Se o nome não veio, buscar no Firestore pelo ID
    if (!instanceName && connectionId) {
      console.log(`[Evolution] Buscando nome da conexão: ${connectionId}`);
      const connDoc = await getDoc(doc(db, 'whatsapp_connections', connectionId));
      if (connDoc.exists()) {
        instanceName = connDoc.data().nome;
      }
    }

    if (!instanceName) {
      return NextResponse.json({ error: 'Nome da instância não encontrado' }, { status: 400 });
    }

    // 2. Buscar configurações
    const settings = await api.getSettings();
    const apiUrl = settings.omnichannel?.evolutionApiUrl?.replace(/\/$/, '');
    const apiKey = settings.omnichannel?.evolutionApiKey;

    if (!apiUrl || !apiKey) {
      return NextResponse.json({ error: 'Configurações Evolution não encontradas' }, { status: 500 });
    }

    let origin = req.nextUrl.origin;
    if (origin.includes('localhost')) {
      origin = origin.replace('localhost', 'host.docker.internal');
    }

    // 3. Verificar estado
    const statusRes = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': apiKey }
    });

    const statusData = await statusRes.json();
    if (statusData.instance?.state === 'open') {
      return NextResponse.json({ connected: true });
    }

    // 4. Se não existir, criar
    if (statusRes.status === 404) {
      await fetch(`${apiUrl}/instance/create`, {
        method: 'POST',
        headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: instanceName,
          token: Math.random().toString(36).substring(7),
          integration: 'WHATSAPP-BAILEYS',
          qrcode: true,
          webhook: {
            enabled: true,
            url: `${origin}/api/webhook/evolution`,
            webhook_by_events: false,
            events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"]
          }
        })
      });
      await new Promise(r => setTimeout(r, 1500));
    }

    // 5. Conectar e pegar QR
    const connectRes = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': apiKey }
    });

    const connectData = await connectRes.json();
    const qrCode = connectData.base64 || connectData.qrcode?.base64 || connectData.code || connectData.qrcode;
    const pairingCode = connectData.pairingCode || connectData.code;

    if (qrCode && typeof qrCode === 'string' && qrCode.length > 50) {
      const formattedQr = qrCode.startsWith('data:image') ? qrCode : `data:image/png;base64,${qrCode}`;
      return NextResponse.json({ qrCodeBase64: formattedQr });
    }

    if (pairingCode && typeof pairingCode === 'string') {
      return NextResponse.json({ pairingCode: pairingCode });
    }

    return NextResponse.json({ 
      error: 'Aguardando QR Code... Tente novamente em alguns segundos.',
      state: connectData.instance?.state 
    }, { status: 503 });

  } catch (error: any) {
    console.error('[Evolution] Erro:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
