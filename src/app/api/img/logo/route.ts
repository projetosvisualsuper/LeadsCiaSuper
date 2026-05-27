export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'visual'));
    
    if (!snap.exists()) {
      return new NextResponse('Not found', { status: 404 });
    }

    const settings = snap.data();
    const base64 = settings?.logoUrl;

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
    console.error('Error fetching logo image:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
