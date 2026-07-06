import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';
import { verifyToken } from '@/lib/auth';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    // 1. Validar autenticação
    const cookieHeader = req.headers.get('cookie') || '';
    const token = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('session_token='))
      ?.substring('session_token='.length);

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.uid) {
      return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
    }

    // 2. Extrair parâmetros
    const { sourceLeadId, targetLeadId } = await req.json();

    if (!sourceLeadId || !targetLeadId) {
      return NextResponse.json({ error: 'IDs de origem e destino são necessários.' }, { status: 400 });
    }

    // 3. Executar mesclagem no banco de dados D1
    await d1Api.mergeLeads(sourceLeadId, targetLeadId);

    return NextResponse.json({ success: true, message: 'Leads mesclados com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao mesclar leads:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
