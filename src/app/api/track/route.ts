export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { d1Api } from '@/services/d1';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const campaignId = searchParams.get('campaignId');
  const url = searchParams.get('url');

  if (!campaignId) {
    return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 });
  }

  try {
    let campaignRef = null;
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      try {
        campaignRef = doc(db, 'campaigns', campaignId);
      } catch (e) {
        console.warn('Firebase Firestore is not initialized:', e);
      }
    }
    
    if (type === 'open') {
      // Incrementa a contagem de aberturas no Firebase se estiver configurado
      if (campaignRef) {
        await updateDoc(campaignRef, { totalAbertos: increment(1) }).catch(() => {});
      }
      // Incrementa a contagem de aberturas no D1
      await d1Api.incrementCampaignOpen(campaignId).catch(() => {});
      
      // Retorna um GIF 1x1 transparente para o rastreador (Uint8Array compatível com Edge Runtime)
      const gifBytes = new Uint8Array([
        71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0,
        255, 255, 255, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0,
        1, 0, 1, 0, 0, 2, 2, 76, 1, 0, 59
      ]);
      return new NextResponse(gifBytes, { 
        headers: { 
          'Content-Type': 'image/gif', 
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' 
        } 
      });
    }
    
    if (type === 'click' && url) {
      // Incrementa a contagem de cliques e aberturas no Firebase se estiver configurado
      if (campaignRef) {
        await updateDoc(campaignRef, { 
          totalCliques: increment(1),
          totalAbertos: increment(1) // Em WhatsApp, clique conta como abertura também
        }).catch(() => {});
      }
      
      // Incrementa no D1
      await d1Api.incrementCampaignClick(campaignId).catch(() => {});
      await d1Api.incrementCampaignOpen(campaignId).catch(() => {}); // O clique garante que a msg foi lida
      
      // Redireciona para o link original
      return NextResponse.redirect(url);
    }
    
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Tracking error:', error);
    // Se der erro no banco durante o clique, ainda assim salva o usuário e redireciona
    if (type === 'click' && url) {
      return NextResponse.redirect(url);
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
