export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { processQueueServerAction } from '@/app/actions/queue';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verificar se a requisição vem do Vercel Cron (segurança)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Se não houver secret configurado no env, permitimos para fins de teste local se for localhost
    const isLocal = request.url.includes('localhost');
    if (!isLocal) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  try {
    console.log('Cron Job: Iniciando processamento automático da fila...');
    const result = await processQueueServerAction();
    
    return NextResponse.json({ 
      timestamp: new Date().toISOString(),
      ...result 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
