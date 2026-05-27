export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    if (!id) {
      return new NextResponse('Bad request', { status: 400 });
    }

    const snap = await getDoc(doc(db, 'campaigns', id));
    
    if (!snap.exists()) {
      return new NextResponse('Not found', { status: 404 });
    }

    const campaign = snap.data();
    const base64 = campaign?.bannerImg;

    if (!base64 || !base64.startsWith('data:image')) {
      return new NextResponse('Not found or not base64', { status: 404 });
    }

    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return new NextResponse('Invalid base64 format', { status: 400 });
    }

    const buffer = Buffer.from(matches[2], 'base64');
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': matches[1],
        'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
      }
    });
  } catch (error) {
    console.error('Error fetching banner image:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
