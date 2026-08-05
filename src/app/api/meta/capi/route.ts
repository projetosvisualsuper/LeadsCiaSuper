export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sendMetaCapiEvent } from '@/lib/meta-capi';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventName, userData, customData, testEventCode, actionSource, eventSourceUrl } = body;

    if (!userData) {
      return NextResponse.json({ error: 'Dados do usuário (userData) são obrigatórios' }, { status: 400 });
    }

    const response = await sendMetaCapiEvent({
      eventName: eventName || 'Lead',
      testEventCode,
      actionSource: actionSource || 'website',
      eventSourceUrl: eventSourceUrl || 'https://leads.ciasuper.com.br',
      userData: {
        email: userData.email,
        phone: userData.phone,
        firstName: userData.firstName || userData.name,
        lastName: userData.lastName,
        leadId: userData.leadId,
        fbc: userData.fbc,
        fbp: userData.fbp,
        fbclid: userData.fbclid,
        clientIp: userData.clientIp,
        clientUserAgent: userData.clientUserAgent
      },
      customData: customData || {}
    });

    if (response.success) {
      return NextResponse.json({ success: true, result: response.result });
    } else {
      return NextResponse.json({ success: false, error: response.error, details: response.result }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[API Meta CAPI] Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
