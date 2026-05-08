import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get('connectionId');
    const origin = req.nextUrl.origin;

    if (!connectionId) {
      return NextResponse.json({ error: 'connectionId is required' }, { status: 400 });
    }

    const connRef = doc(db, 'whatsapp_connections', connectionId);
    const connSnap = await getDoc(connRef);

    if (!connSnap.exists()) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const connectionData = connSnap.data();
    const instanceName = connectionData.evolutionInstanceName;

    if (!instanceName) {
      return NextResponse.json({ error: 'Instance name not configured' }, { status: 400 });
    }

    const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
    const settings = settingsSnap.data() || {};
    const apiUrl = settings.omnichannel?.evolutionApiUrl?.replace(/\/$/, '');
    const apiKey = settings.omnichannel?.evolutionApiKey;

    if (!apiUrl || !apiKey) {
      // Usando um serviço externo de QR Code para gerar um placeholder visível no modo simulação
      const mockQrCode = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MODO-SIMULACAO-GERENCY";
      await updateDoc(connRef, { status: 'qr_code_ready' });

      return NextResponse.json({
        success: true,
        instanceName: instanceName,
        qrCodeBase64: mockQrCode,
        mock: true,
        message: 'A Evolution API não está conectada nas configurações globais. Simulação ativa.'
      });
    }

    // 1. Verificar se a instância existe / Buscar status
    const statusUrl = `${apiUrl}/instance/connectionState/${instanceName}`;
    const statusRes = await fetch(statusUrl, {
      method: 'GET',
      headers: { 'apikey': apiKey }
    });

    // 2. Se a instância não existir (404), vamos criá-la
    if (statusRes.status === 404) {
      console.log(`Instância ${instanceName} não encontrada. Criando...`);
      const createRes = await fetch(`${apiUrl}/instance/create`, {
        method: 'POST',
        headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: instanceName,
          token: Math.random().toString(36).substring(7),
          qrcode: true
        })
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        return NextResponse.json({ error: 'Falha ao criar instância na Evolution', details: err }, { status: 500 });
      }
    }

    // 3. Configurar o Webhook automaticamente
    // O Webhook aponta para a nossa rota de recebimento
    const webhookUrl = `${origin}/api/webhook/evolution`;
    await fetch(`${apiUrl}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        url: webhookUrl,
        webhook_by_events: false,
        events: [
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "MESSAGES_DELETE",
          "SEND_MESSAGE",
          "CONNECTION_UPDATE",
          "PRESENCE_UPDATE"
        ]
      })
    }).catch(err => console.error('Erro ao configurar Webhook automaticamente:', err));

    // 4. Buscar o QR Code / Conectar
    const connectRes = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': apiKey }
    });

    const data = await connectRes.json();
    const qrCode = data.base64 || data.qrcode?.base64 || data.instance?.qrCode?.base64;
    const state = data.instance?.state || data.state;

    if (state === 'open' || state === 'connected') {
      await updateDoc(connRef, { status: 'connected' });
    } else if (qrCode) {
      await updateDoc(connRef, { status: 'qr_code_ready' });
    }

    return NextResponse.json({
      success: true,
      instanceName: instanceName,
      state: state,
      qrCodeBase64: qrCode
    });

  } catch (error) {
    console.error('Erro ao gerenciar instância Evolution:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
