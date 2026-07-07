export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('Erro no redirecionamento do Bling:', error);
      return NextResponse.redirect(new URL('/integracoes?status=bling_error&error=' + error, req.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/integracoes?status=bling_error&error=no_code_provided', req.url));
    }

    // Carregar configurações atuais para pegar as credenciais
    const settings = await d1Api.getSettings();
    const clientId = settings?.bling?.clientId;
    const clientSecret = settings?.bling?.clientSecret;

    if (!clientId || !clientSecret) {
      console.error('Credenciais do Bling não localizadas nas configurações do CRM.');
      return NextResponse.redirect(new URL('/integracoes?status=bling_error&error=credentials_missing', req.url));
    }

    const redirectUri = `${new URL(req.url).origin}/api/auth/callback/bling`;
    const basicAuth = btoa(`${clientId}:${clientSecret}`);

    console.error('Iniciando troca do código por tokens no Bling...');
    
    // Trocar código pelos tokens de acesso e atualização
    const response = await fetch('https://api.bling.com.br/Api/v3/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'enable-jwt': '1'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Erro na resposta do token do Bling:', errText);
      return NextResponse.redirect(new URL('/integracoes?status=bling_error&error=token_swap_failed', req.url));
    }

    const tokenData = await response.json();
    
    // Calcular a data de expiração (normalmente dura 3600 segundos = 1 hora)
    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Salvar os tokens nas configurações do CRM
    const updatedSettings = {
      ...settings,
      bling: {
        ...(settings.bling || {}),
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: expiresAt,
        enabled: true
      }
    };

    await d1Api.saveSettings(updatedSettings);

    console.error('Tokens do Bling salvos e configurados com sucesso.');
    return NextResponse.redirect(new URL('/integracoes?status=bling_connected', req.url));

  } catch (err: any) {
    console.error('Erro interno na rota de callback do Bling:', err);
    return NextResponse.redirect(new URL('/integracoes?status=bling_error&error=internal_error', req.url));
  }
}
