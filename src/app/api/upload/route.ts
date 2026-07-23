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

    let bucket = process.env.BUCKET || (globalThis as any).BUCKET;

    if (!bucket) {
      return NextResponse.json({ error: 'Bucket R2 não configurado' }, { status: 500 });
    }

    const buffer = await file.arrayBuffer();
    const originalName = file.name;
    const cleanOriginalName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const safeFolder = Math.random().toString(36).substring(2, 10);
    const fileName = `${chatId}/${safeFolder}/${cleanOriginalName}`;

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

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');

    if (!fileUrl) {
      return NextResponse.json({ error: 'URL do arquivo ausente.' }, { status: 400 });
    }

    let bucket = process.env.BUCKET || (globalThis as any).BUCKET;
    if (!bucket) {
      return NextResponse.json({ error: 'Bucket R2 não configurado' }, { status: 500 });
    }

    const prefix = '/api/media/';
    if (fileUrl.startsWith(prefix)) {
      const key = decodeURIComponent(fileUrl.substring(prefix.length));
      await bucket.delete(key);
      return NextResponse.json({ success: true, message: 'Arquivo deletado do R2' });
    }

    return NextResponse.json({ error: 'Formato de URL inválido.' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro ao deletar arquivo do R2:', error);
    return NextResponse.json({ error: 'Erro ao deletar', message: error.message }, { status: 500 });
  }
}
