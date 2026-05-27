import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo ausente.' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const url = `data:${file.type};base64,${base64}`;
    
    return NextResponse.json({ success: true, url });
  } catch (error: any) {
    console.error('Erro no upload do servidor:', error);
    return NextResponse.json({ error: 'Erro no upload', message: error.message }, { status: 500 });
  }
}
