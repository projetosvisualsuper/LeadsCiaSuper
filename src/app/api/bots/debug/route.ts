import { NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export const runtime = 'edge';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const botId = url.searchParams.get('botId') || 'bot_9g9lbjq0l';
  const leadId = url.searchParams.get('leadId');
  const connectionId = url.searchParams.get('connectionId') || 'ZdcH6c2MTTSNWqFeb30r';
  const dryRun = url.searchParams.get('dryRun') !== 'false'; // default true (no side effects)

  const trace: any[] = [];
  const errors: any[] = [];

  try {
    const bot = await d1Api.getBotById(botId);
    if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 });

    const nodes = JSON.parse(bot.nodesJson || '[]');
    const edges = JSON.parse(bot.edgesJson || '[]');

    // Fetch lead
    let lead: any = null;
    if (leadId) {
      const { results } = await d1Api.runQuery(`SELECT * FROM leads WHERE id = ? LIMIT 1`, [leadId]);
      lead = results?.[0] || null;
    } else {
      // Get most recent lead with celular
      const { results } = await d1Api.runQuery(`SELECT * FROM leads WHERE celular IS NOT NULL AND celular != '' ORDER BY dataCriacao DESC LIMIT 1`, []);
      lead = results?.[0] || null;
    }
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const triggerNode = nodes.find((n: any) => n.type === 'trigger');
    if (!triggerNode) return NextResponse.json({ error: 'No trigger node' }, { status: 400 });

    let currentNode = triggerNode;
    const visited = new Set<string>();
    let step = 0;

    while (currentNode && !visited.has(currentNode.id) && step < 20) {
      visited.add(currentNode.id);
      step++;

      const stepInfo: any = {
        step,
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        nodeLabel: currentNode.data?.label,
        result: null,
        error: null,
        nextNode: null,
      };

      // Execute node
      if (currentNode.type === 'sendMessage') {
        const messageText = (currentNode.data?.message || '')
          .replace('[Contato: Primeiro nome]', lead.nome?.split(' ')[0] || '')
          .replace('[Contato: Nome completo]', lead.nome || '');

        const phone = lead.celular || lead.telefone;
        stepInfo.phoneFound = !!phone;
        stepInfo.messageLength = messageText.length;
        stepInfo.messagePreview = messageText.substring(0, 80) + (messageText.length > 80 ? '...' : '');

        if (!phone) {
          stepInfo.result = 'SKIPPED: no phone';
        } else if (!messageText) {
          stepInfo.result = 'SKIPPED: no message text';
        } else if (dryRun) {
          stepInfo.result = `DRY_RUN: would send "${stepInfo.messagePreview}" to ${phone}`;
        } else {
          const { sendOmnichannelMessageAction } = await import('@/app/actions/chat');
          const cleanPhone = phone.replace(/\D/g, '');
          const channel = lead.origem === 'instagram' ? 'instagram' : lead.origem === 'facebook' ? 'facebook' : 'whatsapp';
          try {
            const res = await sendOmnichannelMessageAction(cleanPhone, channel as any, messageText, connectionId);
            stepInfo.result = `SENT: ${JSON.stringify(res)}`;
          } catch (e: any) {
            stepInfo.result = `SEND_ERROR: ${e.message}`;
            stepInfo.error = e.message;
          }
        }

      } else if (currentNode.type === 'roundRobin') {
        let options = currentNode.data?.options || [];
        if (options.length === 0) {
          const optEdges = edges.filter((e: any) =>
            e.source === currentNode.id && e.sourceHandle?.startsWith('opt-')
          );
          options = optEdges.map((e: any) => ({ id: e.sourceHandle.replace('opt-', ''), label: 'Opção' }));
          stepInfo.optionsReconstructed = true;
        }

        stepInfo.optionCount = options.length;
        stepInfo.options = options;
        stepInfo.allEdgesFromNode = edges
          .filter((e: any) => e.source === currentNode.id)
          .map((e: any) => ({ handle: e.sourceHandle, target: e.target }));

        if (options.length > 0) {
          const stateKey = `round_robin_last_index_${currentNode.id}`;
          const { results: sr } = await d1Api.runQuery(`SELECT valueJson FROM settings WHERE key = ? LIMIT 1`, [stateKey]);
          let lastIndex = -1;
          if (sr?.[0]) {
            try { lastIndex = parseInt(JSON.parse(sr[0].valueJson), 10); } catch {}
          }
          const nextIndex = (lastIndex + 1) % options.length;
          const chosenOption = options[nextIndex];
          const targetHandleId = `opt-${chosenOption.id}`;
          const branchEdge = edges.find((e: any) => e.source === currentNode.id && e.sourceHandle === targetHandleId);

          stepInfo.lastIndex = lastIndex;
          stepInfo.nextIndex = nextIndex;
          stepInfo.chosenOption = chosenOption;
          stepInfo.targetHandle = targetHandleId;
          stepInfo.branchEdgeFound = !!branchEdge;
          stepInfo.branchTarget = branchEdge?.target || null;

          if (branchEdge) {
            stepInfo.result = `BRANCHING to ${branchEdge.target} via ${targetHandleId}`;
            if (!dryRun) {
              await d1Api.executeRun(`INSERT OR REPLACE INTO settings (key, valueJson) VALUES (?, ?)`, [stateKey, JSON.stringify(nextIndex)]);
            }
            trace.push(stepInfo);
            currentNode = nodes.find((n: any) => n.id === branchEdge.target);
            continue;
          } else {
            stepInfo.result = `BLOCKED: No edge for handle "${targetHandleId}"`;
            stepInfo.error = `Missing edge for handle "${targetHandleId}". Available handles: ${stepInfo.allEdgesFromNode.map((e: any) => e.handle).join(', ')}`;
            trace.push(stepInfo);
            break;
          }
        }
      } else if (currentNode.type === 'action') {
        const actionType = currentNode.data?.actionType || '';
        const targetUserId = currentNode.data?.targetUserId;
        stepInfo.actionType = actionType;
        stepInfo.targetUserId = targetUserId;
        stepInfo.result = dryRun ? `DRY_RUN: would ${actionType} → ${targetUserId}` : 'EXECUTED';
        if (!dryRun && actionType === 'Mudar usuário resp.' && targetUserId) {
          await d1Api.executeRun(`UPDATE leads SET assignedTo = ? WHERE id = ?`, [targetUserId, lead.id]);
          await d1Api.executeRun(`UPDATE chats SET assignedTo = ? WHERE leadId = ?`, [targetUserId, lead.id]);
        }
      } else if (currentNode.type === 'trigger') {
        stepInfo.result = 'TRIGGER: starting flow';
      } else if (currentNode.type === 'stopBot') {
        stepInfo.result = 'STOP: flow complete';
        trace.push(stepInfo);
        break;
      } else {
        stepInfo.result = `UNKNOWN_NODE_TYPE: ${currentNode.type}`;
      }

      // Find next node
      const allEdgesFromNode = edges.filter((e: any) => e.source === currentNode.id);
      const successEdge = allEdgesFromNode.find((e: any) =>
        e.sourceHandle === 'success' || e.sourceHandle === null || e.sourceHandle === undefined
      );
      const nonFailEdge = allEdgesFromNode.find((e: any) => e.sourceHandle !== 'fail');
      const edge = successEdge || nonFailEdge || allEdgesFromNode[0];

      stepInfo.edgesFromNode = allEdgesFromNode.map((e: any) => ({ handle: e.sourceHandle, target: e.target }));
      stepInfo.chosenEdge = edge ? { handle: edge.sourceHandle, target: edge.target } : null;

      if (edge) {
        const nextNode = nodes.find((n: any) => n.id === edge.target);
        stepInfo.nextNode = edge.target;
        stepInfo.nextNodeType = nextNode?.type || 'NOT_FOUND';
        trace.push(stepInfo);
        currentNode = nextNode;
      } else {
        stepInfo.nextNode = null;
        stepInfo.result = (stepInfo.result || '') + ' | NO_NEXT_EDGE: flow ends here';
        trace.push(stepInfo);
        break;
      }
    }

    return NextResponse.json({
      dryRun,
      botName: bot.name,
      leadName: lead.nome,
      leadPhone: lead.celular || lead.telefone,
      connectionId,
      totalSteps: step,
      trace,
      errors,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
