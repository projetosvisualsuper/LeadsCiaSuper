export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  try {
    const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
    const settings = settingsSnap.exists() ? settingsSnap.data() : {};
    
    const clientId = settings.omnichannel?.youtubeClientId;
    if (!clientId) {
      return new NextResponse('Client ID not configured', { status: 400 });
    }

    let origin = settings.appUrl || '';
    
    if (!origin) {
      const host = req.headers.get('host') || new URL(req.url).host;
      const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
      origin = `${protocol}://${host}`;
    }
    
    // Garantir que não há barra no final
    origin = origin.replace(/\/$/, '');

    const redirectUri = `${origin}/api/auth/callback/youtube`;
    const scope = 'https://www.googleapis.com/auth/youtube.force-ssl';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating YouTube Auth:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
