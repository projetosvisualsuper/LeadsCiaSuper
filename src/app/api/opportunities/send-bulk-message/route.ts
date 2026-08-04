import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { d1Api } from '@/services/d1';
import { sendOmnichannelMessageAction } from '@/app/actions/chat';

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

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { opportunityIds, messageText } = await request.json();

    if (!Array.isArray(opportunityIds) || opportunityIds.length === 0) {
      return NextResponse.json({ error: 'Nenhuma oportunidade selecionada.' }, { status: 400 });
    }

    if (!messageText || !messageText.trim()) {
      return NextResponse.json({ error: 'A mensagem não pode estar vazia.' }, { status: 400 });
    }

    // Buscar as oportunidades no banco
    const allOpportunities = await d1Api.getOpportunities();
    const targetOpps = allOpportunities.filter(o => opportunityIds.includes(o.id));

    if (targetOpps.length === 0) {
      return NextResponse.json({ error: 'Nenhuma oportunidade válida encontrada.' }, { status: 404 });
    }

    let successCount = 0;
    let failCount = 0;
    const logs: Array<{ id: string; leadNome: string; status: 'sucesso' | 'erro'; details?: string }> = [];

    for (const opp of targetOpps) {
      const targetPhone = opp.leadCelular ? opp.leadCelular.replace(/\D/g, '') : '';
      const leadName = opp.leadNome || 'Cliente';

      if (!targetPhone) {
        failCount++;
        logs.push({
          id: opp.id,
          leadNome: leadName,
          status: 'erro',
          details: 'Lead sem número de telefone/celular cadastrado.'
        });
        continue;
      }

      // Personalizar mensagem (ex: {nome})
      const personalizedMsg = messageText.replace(/\{nome\}/gi, leadName);

      try {
        const result = await sendOmnichannelMessageAction(
          targetPhone,
          'whatsapp',
          personalizedMsg
        );

        if (result && result.success) {
          successCount++;
          logs.push({ id: opp.id, leadNome: leadName, status: 'sucesso' });
        } else {
          failCount++;
          logs.push({
            id: opp.id,
            leadNome: leadName,
            status: 'erro',
            details: result?.error || 'Falha ao enviar mensagem.'
          });
        }
      } catch (err: any) {
        failCount++;
        logs.push({
          id: opp.id,
          leadNome: leadName,
          status: 'erro',
          details: err.message || 'Erro inesperado'
        });
      }

      // Pequena pausa entre envios para evitar throttling
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return NextResponse.json({
      success: true,
      total: targetOpps.length,
      enviadosComSucesso: successCount,
      falhas: failCount,
      logs
    });

  } catch (error: any) {
    console.error('Erro no envio em massa de oportunidades:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
