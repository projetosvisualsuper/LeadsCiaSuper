export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return new NextResponse(`TikTok Auth Error: ${error}`, { status: 400 });
  }

  if (!code) {
    return new NextResponse('Missing Code', { status: 400 });
  }

  try {
    const settings = await d1Api.getSettings();
    
    const clientKey = settings.omnichannel?.tiktokAppId;
    const clientSecret = settings.omnichannel?.tiktokClientSecret || settings.omnichannel?.tiktokAccessToken; // Fallback se o campo estiver trocado
    
    let origin = settings.appUrl || '';
    if (!origin) {
      const host = req.headers.get('host') || new URL(req.url).host;
      const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
      origin = `${protocol}://${host}`;
    }
    origin = origin.replace(/\/$/, '');

    const redirectUri = `${origin}/api/auth/callback/tiktok`;

    // Trocar código por tokens (TikTok V2 usa form-data)
    const formData = new URLSearchParams();
    formData.append('client_key', clientKey);
    formData.append('client_secret', clientSecret);
    formData.append('code', code);
    formData.append('grant_type', 'authorization_code');
    formData.append('redirect_uri', redirectUri);

    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('TikTok Token Exchange Error:', tokens);
      return new NextResponse('Failed to exchange TikTok code for tokens', { status: 500 });
    }

    if (!settings.omnichannel) settings.omnichannel = {};
    settings.omnichannel.tiktokAccessToken = tokens.access_token;
    settings.omnichannel.tiktokRefreshToken = tokens.refresh_token;
    settings.omnichannel.tiktokTokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Fetch User Info
    const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    });
    
    if (userRes.ok) {
      const userData = await userRes.json();
      if (userData?.data?.user) {
        settings.omnichannel.tiktokAvatar = userData.data.user.avatar_url;
        settings.omnichannel.tiktokName = userData.data.user.display_name;
      }
    }

    // Salvar no D1
    await d1Api.saveSettings(settings);

    return NextResponse.redirect(`${origin}/configuracoes?tiktok=connected`);
  } catch (err) {
    console.error('Error in TikTok Callback:', err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
