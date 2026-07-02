import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { to, subject, htmlContent } = await req.json();
    
    if (!to || !subject || !htmlContent) {
      return NextResponse.json({ success: false, message: 'Dados insuficientes' }, { status: 400 });
    }

    const settings = await d1Api.getSettings();
    if (!settings?.brevoApiKey) {
      return NextResponse.json({ success: false, message: 'Chave do Brevo não configurada no servidor.' }, { status: 400 });
    }

    const remetenteNome = settings.remetenteNome || 'Contato';
    const remetenteEmail = settings.remetenteEmail || 'contato@visualsuper.com.br';

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': settings.brevoApiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: remetenteNome, email: remetenteEmail },
        to,
        subject,
        htmlContent
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const errorMessage = data.message || 'Erro na API do Brevo';
      await d1Api.saveSystemLog({
        level: 'error',
        source: 'Brevo Email API',
        message: `Falha ao enviar e-mail para ${to.map((t: any) => t.email).join(', ')}`,
        details: errorMessage
      });
      return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Erro no disparador de email da landing page:', error);
    await d1Api.saveSystemLog({
      level: 'error',
      source: 'Brevo Email API',
      message: 'Erro interno ao tentar disparar e-mail de cupom',
      details: error.message || String(error)
    }).catch(err => console.error("Falha ao salvar log do sistema:", err));

    return NextResponse.json({ success: false, message: error.message || 'Erro interno' }, { status: 500 });
  }
}
