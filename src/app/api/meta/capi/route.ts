export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sendMetaCapiEvent } from '@/lib/meta-capi';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventName, userData, customData, testEventCode } = body;

    if (!userData) {
      return NextResponse.json({ error: 'Dados do usuário (userData) são obrigatórios' }, { status: 400 });
    }

    const response = await sendMetaCapiEvent({
      eventName: eventName || 'Lead',
      userData: {
        email: userData.email,
        phone: userData.phone,
        firstName: userData.firstName || userData.name,
        leadId: userData.leadId
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
