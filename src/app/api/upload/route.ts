import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const chatId = formData.get('chatId') as string || 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'Arquivo ausente.' }, { status: 400 });
    }

    const { getRequestContext } = require('@cloudflare/next-on-pages');
    let bucket = null;
    try {
      bucket = getRequestContext().env.BUCKET;
    } catch (e) {
      bucket = process.env.BUCKET || (globalThis as any).BUCKET;
    }

    if (!bucket) {
      return NextResponse.json({ error: 'Bucket R2 não configurado' }, { status: 500 });
    }

    const buffer = await file.arrayBuffer();
    const extension = file.name.split('.').pop() || 'bin';
    const safeName = Math.random().toString(36).substring(2, 10);
    const fileName = `${chatId}/${safeName}.${extension}`;

    await bucket.put(fileName, buffer, {
      httpMetadata: { contentType: file.type }
    });

    const mediaUrl = `/api/media/${fileName.split('/').map(s => encodeURIComponent(s)).join('/')}`;
    
    return NextResponse.json({ success: true, url: mediaUrl, mimeType: file.type });
  } catch (error: any) {
    console.error('Erro no upload do servidor:', error);
    return NextResponse.json({ error: 'Erro no upload', message: error.message }, { status: 500 });
  }
}
