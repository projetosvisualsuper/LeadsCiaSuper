'use server';

import { Campaign, Lead, Settings, FilaEnvio } from '@/types/crm';

/**
 * Ações de Servidor para integrar com o Brevo de forma segura e sem erros de CORS.
 */

export async function testBrevoConnectionAction(apiKey: string) {
  if (!apiKey) return { success: false, message: 'API Key não informada.' };

  try {
    const response = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || 'Chave inválida ou expirada.' };
    }

    return { success: true, message: 'Conectado com sucesso!', account: data };
  } catch (error: any) {
    return { success: false, message: `Erro ao conectar com o servidor do Brevo: ${error.message || String(error)}` };
  }
}

export async function sendEmailBrevoAction(params: {
  apiKey: string,
  sender: { name: string, email: string },
  to: { email: string, name: string }[],
  subject: string,
  htmlContent: string
}) {
  const { apiKey, sender, to, subject, htmlContent } = params;

  if (!apiKey) return { success: false, message: 'Chave de API não configurada.' };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ sender, to, subject, htmlContent })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || 'Erro no disparo.' };
    }

    return { success: true, message: 'Enviado com sucesso!', data };
  } catch (error: any) {
    return { success: false, message: `Falha crítica no servidor de disparo: ${error.message || String(error)}` };
  }
}

export async function getBrevoCreditsAction(apiKey: string) {
  if (!apiKey) return 0;

  try {
    const response = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey
      }
    });

    if (!response.ok) return 0;

    const data = await response.json();
    
    // 1. Tenta encontrar créditos de envio (Plano Gratuito ou SendLimit)
    const sendLimitPlan = data.plan?.find((p: any) => p.creditsType === 'sendLimit');
    if (sendLimitPlan) return sendLimitPlan.credits;

    // 2. Tenta encontrar créditos de assinatura (Planos Pagos)
    const subscriptionPlan = data.plan?.find((p: any) => p.type === 'subscription');
    if (subscriptionPlan) return subscriptionPlan.credits;

    // 3. Fallback para qualquer outro plano que tenha créditos
    const anyPlanWithCredits = data.plan?.find((p: any) => p.credits !== undefined);
    return anyPlanWithCredits?.credits || 0;
  } catch (error) {
    return 0;
  }
}
