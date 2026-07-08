'use server';

import { d1Api } from '@/services/d1';
import { sendOmnichannelMessageAction } from './chat';

export async function sendBlingTestMessageAction(phone: string) {
  try {
    const settings = await d1Api.getSettings();
    if (!settings?.bling) {
      return { success: false, error: 'Configurações do Bling não localizadas.' };
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
      return result || { success: true };
    } else {
      const result = await sendOmnichannelMessageAction(
        cleanPhone,
        'whatsapp',
        msgText
      );
      return result || { success: true };
    }
  } catch (error: any) {
    console.error('Erro na action de teste do Bling:', error);
    return { success: false, error: error.message || 'Erro desconhecido.' };
  }
}
