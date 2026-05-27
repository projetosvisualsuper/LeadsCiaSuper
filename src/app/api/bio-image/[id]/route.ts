export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const bioDoc = await getDoc(doc(db, 'bio_links', id));
    
    if (!bioDoc.exists()) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const data = bioDoc.data();
    const avatarUrl = data.avatarUrl;

    if (!avatarUrl || !avatarUrl.startsWith('data:image')) {
      // Retornar um placeholder se não houver imagem
      return NextResponse.redirect(new URL('/images/sales-bg.png', request.url));
    }

    // Extrair o base64
    const base64Data = avatarUrl.split(',')[1];
    const contentType = avatarUrl.split(';')[0].split(':')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error serving bio image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
