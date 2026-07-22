import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';
import { verifyToken } from '@/lib/auth';

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
    
    const cookieHeader = req.headers.get('cookie') || '';
    const token = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('session_token='))
      ?.substring('session_token='.length);

    let connectionIdFilter: string | undefined = undefined;
    let assignedToFilter: string | undefined = undefined;

    if (token) {
      try {
        const decoded = await verifyToken(token);
        if (decoded && decoded.uid) {
          const profile = await d1Api.getUserProfile(decoded.uid);
          if (profile) {
            if (profile.role !== 'admin' && profile.role !== 'master') {
              assignedToFilter = decoded.uid;
            }
            if (profile.whatsappConnectionId) {
              connectionIdFilter = profile.whatsappConnectionId;
            }
          }
        }
      } catch (err) {
        console.error('Error verifying token in d1-bridge route:', err);
      }
    }

    let finalArgs = args;
    if (method === 'submitTemplateToMeta') {
      const origin = req.nextUrl.origin;
      finalArgs = [args[0], origin];
    } else if (method === 'getLeads') {
      const limitVal = args[0] !== undefined ? args[0] : 5000;
      finalArgs = [limitVal, undefined];
    } else if (method === 'getChats') {
      finalArgs = [assignedToFilter, connectionIdFilter];
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
