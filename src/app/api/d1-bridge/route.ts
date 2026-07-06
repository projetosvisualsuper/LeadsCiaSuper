import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // Opcional: roda no edge runtime do Cloudflare

export async function POST(req: NextRequest) {
  try {
    const { method, args } = await req.json();
    
    // Validar se o método existe no adaptador D1
    if (typeof (d1Api as any)[method] !== 'function') {
      return NextResponse.json({ 
        success: false, 
        message: `Método '${method}' não é suportado pelo adaptador SQL.` 
      }, { status: 400 });
    }
    
    let finalArgs = args;
    if (method === 'submitTemplateToMeta') {
      const origin = req.nextUrl.origin;
      finalArgs = [args[0], origin];
    }

    // Executa a consulta SQL com os argumentos e retorna o resultado
    const result = await (d1Api as any)[method](...finalArgs);
    return NextResponse.json(result === undefined ? { success: true } : result);
  } catch (error: any) {
    console.error(`Erro na ponte D1 (Bridge) para o método [${req.method}]:`, error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Erro interno de banco de dados.' 
    }, { status: 500 });
  }
}
