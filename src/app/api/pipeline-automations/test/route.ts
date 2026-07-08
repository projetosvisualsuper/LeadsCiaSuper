import { NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';
import { automationEngine } from '@/services/automation-engine';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { leadId, automationId } = await request.json();
    if (!leadId || !automationId) {
      return NextResponse.json({ error: 'Lead ID e Automation ID são obrigatórios' }, { status: 400 });
    }

    const { results: leadResults } = await d1Api.runQuery(`SELECT * FROM leads WHERE id = ? LIMIT 1`, [leadId]);
    const lead = leadResults && leadResults.length > 0 ? leadResults[0] : null;
    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    const auto = await d1Api.getPipelineAutomationById(automationId);
    if (!auto) {
      return NextResponse.json({ error: 'Automação não encontrada' }, { status: 404 });
    }

    // Executar ações
    if (auto.adicionarTags) {
      const tagsToAdd = auto.adicionarTags.split(',').map((t: string) => t.trim()).filter(Boolean);
      if (tagsToAdd.length > 0) {
        const currentTags = Array.isArray(lead.tags) ? lead.tags : [];
        const newTags = Array.from(new Set([...currentTags, ...tagsToAdd]));
        await d1Api.executeRun(`UPDATE leads SET tags = ? WHERE id = ?`, [JSON.stringify(newTags), lead.id]);
      }
    }

    if (auto.atribuirUsuarioId) {
      await d1Api.executeRun(`UPDATE chats SET assignedTo = ? WHERE leadId = ?`, [auto.atribuirUsuarioId, lead.id]);
      await d1Api.executeRun(`UPDATE opportunities SET assignedTo = ? WHERE leadId = ?`, [auto.atribuirUsuarioId, lead.id]);
    }

    if (auto.alterarEtapaPara) {
      await d1Api.executeRun(`UPDATE opportunities SET status = ? WHERE leadId = ?`, [auto.alterarEtapaPara, lead.id]);
    }

    if (auto.salesbotId) {
      await automationEngine.runSalesbot(
        auto.salesbotId,
        lead,
        auto.destinatarioTipo,
        auto.whatsappConnectionId || undefined,
        auto.deixarSemResposta === 1
      );
    }

    return NextResponse.json({ success: true, message: 'Teste executado com sucesso!' });
  } catch (error: any) {
    console.error('Erro ao rodar teste de automação:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
