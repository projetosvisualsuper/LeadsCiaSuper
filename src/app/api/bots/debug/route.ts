import { NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const botId = url.searchParams.get('botId');

    // If no botId provided, return all bots
    if (!botId) {
      const bots = await d1Api.getBots();
      return NextResponse.json({
        bots: bots.map((b: any) => ({ id: b.id, name: b.name, ativo: b.ativo }))
      });
    }

    const bot = await d1Api.getBotById(botId);
    if (!bot) {
      return NextResponse.json({ error: 'Bot não encontrado' }, { status: 404 });
    }

    const nodes = JSON.parse(bot.nodesJson || '[]');
    const edges = JSON.parse(bot.edgesJson || '[]');

    const triggerNode = nodes.find((n: any) => n.type === 'trigger');

    // Build a trace of the flow
    const trace: any[] = [];
    const edgesMap = edges.map((e: any) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle,
      target: e.target,
    }));

    // Simulate flow path starting from trigger
    if (triggerNode) {
      let currentNode = triggerNode;
      const visited = new Set<string>();
      let step = 0;

      while (currentNode && !visited.has(currentNode.id) && step < 20) {
        visited.add(currentNode.id);
        step++;

        const nodeInfo: any = {
          step,
          id: currentNode.id,
          type: currentNode.type,
          data: currentNode.data,
          outgoingEdges: edges
            .filter((e: any) => e.source === currentNode.id)
            .map((e: any) => ({ sourceHandle: e.sourceHandle, target: e.target }))
        };

        if (currentNode.type === 'roundRobin') {
          const options = currentNode.data?.options || [];
          nodeInfo.roundRobinAnalysis = {
            optionCount: options.length,
            options: options,
            expectedHandleIds: options.map((o: any) => `opt-${o.id}`),
            actualHandlesInEdges: edges
              .filter((e: any) => e.source === currentNode.id)
              .map((e: any) => e.sourceHandle),
            matches: options.map((o: any) => {
              const expectedHandle = `opt-${o.id}`;
              const matchingEdge = edges.find((e: any) => e.source === currentNode.id && e.sourceHandle === expectedHandle);
              return {
                optionId: o.id,
                optionLabel: o.label,
                expectedHandle,
                hasMatchingEdge: !!matchingEdge,
                targetNodeId: matchingEdge?.target || null,
              };
            }),
          };

          // For simulation, pick first option
          const firstOption = options[0];
          if (firstOption) {
            const handle = `opt-${firstOption.id}`;
            const branchEdge = edges.find((e: any) => e.source === currentNode.id && e.sourceHandle === handle);
            if (branchEdge) {
              nodeInfo.simulatedNextNode = branchEdge.target;
              trace.push(nodeInfo);
              currentNode = nodes.find((n: any) => n.id === branchEdge.target);
              continue;
            } else {
              nodeInfo.simulatedNextNode = null;
              nodeInfo.error = `BLOCKED: No edge found for handle "${handle}"`;
              trace.push(nodeInfo);
              break;
            }
          }
        }

        // Standard edge traversal
        const allEdgesFromNode = edges.filter((e: any) => e.source === currentNode.id);
        const successEdge = allEdgesFromNode.find((e: any) =>
          e.sourceHandle === 'success' || e.sourceHandle === null || e.sourceHandle === undefined
        );
        const nonFailEdge = allEdgesFromNode.find((e: any) => e.sourceHandle !== 'fail');
        const edge = successEdge || nonFailEdge || allEdgesFromNode[0];

        nodeInfo.simulatedNextNode = edge?.target || null;
        nodeInfo.usedHandle = edge?.sourceHandle || null;
        trace.push(nodeInfo);

        if (edge) {
          currentNode = nodes.find((n: any) => n.id === edge.target);
        } else {
          break;
        }
      }
    }

    return NextResponse.json({
      botId,
      botName: bot.name,
      ativo: bot.ativo,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      allEdges: edgesMap,
      allNodes: nodes.map((n: any) => ({ id: n.id, type: n.type, data: n.data })),
      flowTrace: trace,
    });
  } catch (error: any) {
    console.error('Erro no diagnóstico do bot:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
