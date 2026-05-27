export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

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
    const campaignRef = doc(db, 'campaigns', campaignId);
    
    if (type === 'open') {
      // Incrementa a contagem de aberturas no Firestore
      await updateDoc(campaignRef, { totalAbertos: increment(1) }).catch(console.error);
      
      // Retorna um GIF 1x1 transparente para o rastreador
      const buffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      return new NextResponse(buffer, { 
        headers: { 
          'Content-Type': 'image/gif', 
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' 
        } 
      });
    }
    
    if (type === 'click' && url) {
      // Incrementa a contagem de cliques no Firestore
      await updateDoc(campaignRef, { totalCliques: increment(1) }).catch(console.error);
      
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
