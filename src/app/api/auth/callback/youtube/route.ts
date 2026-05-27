export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return new NextResponse(`Auth Error: ${error}`, { status: 400 });
  }

  if (!code) {
    return new NextResponse('Missing Code', { status: 400 });
  }

  try {
    const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
    const settings = settingsSnap.exists() ? settingsSnap.data() : {};
    
    const clientId = settings.omnichannel?.youtubeClientId;
    const clientSecret = settings.omnichannel?.youtubeClientSecret;
    let origin = settings.appUrl || '';
    if (!origin) {
      const host = req.headers.get('host') || new URL(req.url).host;
      const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
      origin = `${protocol}://${host}`;
    }
    origin = origin.replace(/\/$/, '');

    const redirectUri = `${origin}/api/auth/callback/youtube`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('YouTube Token Exchange Error:', tokens);
      return new NextResponse('Failed to exchange code for tokens', { status: 500 });
    }

    // Save tokens to Firestore
    await updateDoc(doc(db, 'settings', 'global'), {
      'omnichannel.youtubeAccessToken': tokens.access_token,
      'omnichannel.youtubeRefreshToken': tokens.refresh_token, // Only provided on first auth with prompt=consent
      'omnichannel.youtubeTokenExpiry': new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    });

    // Redirect back to settings with success
    return NextResponse.redirect(`${origin}/configuracoes?youtube=connected`);
  } catch (err) {
    console.error('Error in YouTube Callback:', err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
