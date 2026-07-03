import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { d1Api } from '@/services/d1';

export const runtime = 'edge';

async function getAuthenticatedUser(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('session_token='))
      ?.substring('session_token='.length);

    if (!token) return null;

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.uid) return null;

    return await d1Api.getUserProfile(decoded.uid);
  } catch (err) {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterUser = searchParams.get('assignedTo');
    const getCountOnly = searchParams.get('countOnly') === 'true';

    // Determina o filtro de atribuição
    let assignedToFilter: string | undefined = undefined;

    // Se o usuário não for master/admin, ele só pode ver as próprias oportunidades
    if ((user.role as string) !== 'admin' && (user.role as string) !== 'master') {
      assignedToFilter = user.uid;
    } else if (filterUser) {
      assignedToFilter = filterUser;
    }

    if (getCountOnly) {
      const count = await d1Api.getUnreadOpportunitiesCount(assignedToFilter);
      return NextResponse.json({ count });
    }

    const opportunities = await d1Api.getOpportunities(assignedToFilter);
    return NextResponse.json(opportunities);
  } catch (error: any) {
    console.error('Erro no GET /api/opportunities:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { leadId, assignedTo } = await request.json();
    if (!leadId || !assignedTo) {
      return NextResponse.json({ error: 'Lead ID e Atendente são obrigatórios' }, { status: 400 });
    }

    await d1Api.saveOpportunity({ leadId, assignedTo });
    return NextResponse.json({ success: true, message: 'Oportunidade criada com sucesso.' });
  } catch (error: any) {
    console.error('Erro no POST /api/opportunities:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id, status, observacao, markRead, assignedTo } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'ID da oportunidade é obrigatório' }, { status: 400 });
    }

    if (status) {
      await d1Api.updateOpportunityStatus(id, status);
    }

    if (observacao !== undefined) {
      await d1Api.updateOpportunityObservacao(id, observacao);
    }

    if (markRead) {
      await d1Api.markOpportunityAsRead(id);
    }

    if (assignedTo) {
      await d1Api.updateOpportunityAssignment(id, assignedTo);
    }

    return NextResponse.json({ success: true, message: 'Oportunidade atualizada com sucesso.' });
  } catch (error: any) {
    console.error('Erro no PUT /api/opportunities:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
