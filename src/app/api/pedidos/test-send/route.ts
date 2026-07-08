import { NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';
import { sendOmnichannelMessageAction } from '@/app/actions/chat';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Número de telefone é obrigatório' }, { status: 400 });
    }

    const settings = await d1Api.getSettings();
    if (!settings?.bling) {
      return NextResponse.json({ error: 'Configurações do Bling não localizadas.' }, { status: 400 });
    }

    const testOrderNumber = '99999';
    const testClientName = 'Cliente Teste';
    const msgText = `Olá, *${testClientName}*! Seu pedido *#${testOrderNumber}* foi enviado com sucesso! 🚀\n\nVocê pode acompanhar a entrega e rastrear seu pedido através do nosso portal:\n🔗 https://portal.visualsuper.com.br\n\nObrigado pela confiança! 😊`;

    const cleanPhone = phone.replace(/\D/g, '');

    if (settings.bling.templateName) {
      const result = await sendOmnichannelMessageAction(
        cleanPhone,
        'whatsapp',
        msgText,
        undefined,
        {
          name: settings.bling.templateName,
          language: settings.bling.templateLanguage || 'pt_BR',
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: testClientName },
                { type: "text", text: testOrderNumber }
              ]
            }
          ]
        }
      );
      if (result && !result.success) {
        return NextResponse.json({ error: result.error || 'Falha ao enviar mensagem de template' }, { status: 500 });
      }
    } else {
      const result = await sendOmnichannelMessageAction(
        cleanPhone,
        'whatsapp',
        msgText
      );
      if (result && !result.success) {
        return NextResponse.json({ error: result.error || 'Falha ao enviar mensagem de texto simples' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro na API de teste do Bling:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
