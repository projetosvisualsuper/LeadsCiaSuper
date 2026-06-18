import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest, { params }: { params: { key: string[] } }) {
  try {
    let bucket = process.env.BUCKET || (globalThis as any).BUCKET;

    if (!bucket) {
      return new NextResponse('Bucket R2 não configurado', { status: 500 });
    }

    const fileKey = params.key.join('/');
    
    // Obter o objeto do R2
    const object = await bucket.get(fileKey);

    if (object === null) {
      return new NextResponse('Arquivo não encontrado', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000'); // Cache longo (1 ano) já que as mensagens não mudam

    return new NextResponse(object.body, {
      status: 200,
      headers
    });
  } catch (err: any) {
    console.error('Erro ao buscar mídia do R2:', err);
    return new NextResponse(`Erro interno: ${err.message}`, { status: 500 });
  }
}
