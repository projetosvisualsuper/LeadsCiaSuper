export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  try {
    const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
    const settings = settingsSnap.exists() ? settingsSnap.data() : {};
    
    const clientKey = settings.omnichannel?.tiktokAppId; // Usaremos o campo App ID como Client Key
    if (!clientKey) {
      return new NextResponse('TikTok Client Key (App ID) not configured', { status: 400 });
    }

    let origin = settings.appUrl || '';
    if (!origin) {
      const host = req.headers.get('host') || new URL(req.url).host;
      const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
      origin = `${protocol}://${host}`;
    }
    origin = origin.replace(/\/$/, '');

    const redirectUri = `${origin}/api/auth/callback/tiktok`;
    
    // Scopes necessários para ler e responder comentários
    const scope = [
      'user.info.basic',
      'video.list'
    ].join(',');

    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?` +
      `client_key=${clientKey}&` +
      `scope=${scope}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=tiktok_auth_crm`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating TikTok Auth:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
