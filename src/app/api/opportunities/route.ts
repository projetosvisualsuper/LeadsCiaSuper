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
    let connectionIdFilter: string | undefined = undefined;

    // Se o usuário não for master/admin, ele só pode ver as próprias oportunidades
    if ((user.role as string) !== 'admin' && (user.role as string) !== 'master') {
      assignedToFilter = user.uid;
    } else if (filterUser) {
      assignedToFilter = filterUser;
    }

    if (user.whatsappConnectionId) {
      connectionIdFilter = user.whatsappConnectionId;
    }

    if (getCountOnly) {
      const count = await d1Api.getUnreadOpportunitiesCount(assignedToFilter, connectionIdFilter);
      return NextResponse.json({ count });
    }

    const opportunities = await d1Api.getOpportunities(assignedToFilter, connectionIdFilter);
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
    const connInfo = await d1Api.syncChatConnectionWithAssignedUser(leadId, assignedTo);

    try {
      const { automationEngine } = await import('@/services/automation-engine');
      (async () => {
        await automationEngine.processLeadAutomation(leadId, 'pendente', 'quando_criado');
      })();
    } catch (err) {
      console.error('Erro ao disparar automação na criação da oportunidade:', err);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Oportunidade criada com sucesso.',
      connectionId: connInfo?.connectionId,
      connectionName: connInfo?.connectionName
    });
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

    const { id, status, observacao, markRead, assignedTo, addTag, removeTag, setTags } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'ID da oportunidade é obrigatório' }, { status: 400 });
    }

    if (setTags && Array.isArray(setTags)) {
      try {
        const { results: oppRes } = await d1Api.runQuery(`SELECT leadId FROM opportunities WHERE id = ? LIMIT 1`, [id]);
        const targetLeadId = oppRes?.[0]?.leadId;
        if (targetLeadId) {
          const uniqueTags = Array.from(new Set(setTags.map(t => String(t).trim()).filter(Boolean)));
          await d1Api.executeRun(`UPDATE leads SET tags = ? WHERE id = ?`, [JSON.stringify(uniqueTags), targetLeadId]);
        }
      } catch (tagErr) {
        console.error('Erro ao definir tags do lead:', tagErr);
      }
    } else if (addTag) {
      try {
        const { results: oppRes } = await d1Api.runQuery(`SELECT leadId FROM opportunities WHERE id = ? LIMIT 1`, [id]);
        const targetLeadId = oppRes?.[0]?.leadId;
        if (targetLeadId) {
          const { results: leadRes } = await d1Api.runQuery(`SELECT tags FROM leads WHERE id = ? LIMIT 1`, [targetLeadId]);
          if (leadRes && leadRes.length > 0) {
            let currentTags: string[] = [];
            try {
              currentTags = leadRes[0].tags ? JSON.parse(leadRes[0].tags) : [];
            } catch (e) {
              currentTags = [];
            }
            const tagStr = String(addTag).trim();
            if (tagStr && !currentTags.includes(tagStr)) {
              currentTags.push(tagStr);
              await d1Api.executeRun(`UPDATE leads SET tags = ? WHERE id = ?`, [JSON.stringify(currentTags), targetLeadId]);
            }
          }
        }
      } catch (tagErr) {
        console.error('Erro ao adicionar tag ao lead:', tagErr);
      }
    } else if (removeTag) {
      try {
        const { results: oppRes } = await d1Api.runQuery(`SELECT leadId FROM opportunities WHERE id = ? LIMIT 1`, [id]);
        const targetLeadId = oppRes?.[0]?.leadId;
        if (targetLeadId) {
          const { results: leadRes } = await d1Api.runQuery(`SELECT tags FROM leads WHERE id = ? LIMIT 1`, [targetLeadId]);
          if (leadRes && leadRes.length > 0) {
            let currentTags: string[] = [];
            try {
              currentTags = leadRes[0].tags ? JSON.parse(leadRes[0].tags) : [];
            } catch (e) {
              currentTags = [];
            }
            const tagStr = String(removeTag).trim();
            const updatedTags = currentTags.filter(t => t !== tagStr);
            await d1Api.executeRun(`UPDATE leads SET tags = ? WHERE id = ?`, [JSON.stringify(updatedTags), targetLeadId]);
          }
        }
      } catch (tagErr) {
        console.error('Erro ao remover tag do lead:', tagErr);
      }
    }

    if (status) {
      await d1Api.updateOpportunityStatus(id, status);

      try {
        const { results: oppRes } = await d1Api.runQuery(`SELECT leadId FROM opportunities WHERE id = ? LIMIT 1`, [id]);
        const targetLeadId = oppRes?.[0]?.leadId;

        if (targetLeadId) {
          const { automationEngine } = await import('@/services/automation-engine');
          try {
            await automationEngine.processLeadAutomation(targetLeadId, status, 'quando_criado');
          } catch (autoErr) {
            console.error('Erro ao processar automação do lead:', autoErr);
          }

          // Disparar Evento para Meta Conversions API (CAPI)
          try {
            const { results: leadRes } = await d1Api.runQuery(`SELECT * FROM leads WHERE id = ? LIMIT 1`, [targetLeadId]);
            if (leadRes && leadRes.length > 0) {
              const lead = leadRes[0];
              const { sendMetaCapiEvent } = await import('@/lib/meta-capi');
              
              let eventName: 'Purchase' | 'Contact' | 'Lead' | 'Schedule' = 'Lead';
              if (status === 'ganha') {
                eventName = 'Purchase';
              } else if (status === 'em_atendimento' || status === 'cotacao') {
                eventName = 'Contact';
              }

              const capiRes = await sendMetaCapiEvent({
                eventName: eventName,
                userData: {
                  email: lead.email,
                  phone: lead.celular || lead.telefone,
                  firstName: lead.nome,
                  leadId: lead.id
                },
                customData: {
                  status: status,
                  opportunity_id: id,
                  lead_name: lead.nome,
                  lead_origem: lead.origem
                }
              });
              console.log(`[CAPI Meta] Evento '${eventName}' enviado para ${lead.nome}:`, capiRes);
            }
          } catch (capiErr) {
            console.error('Erro ao preparar CAPI Meta:', capiErr);
          }

          // Sincronizar status da cotação com WooCommerce
          try {
            const { results: leadRes } = await d1Api.runQuery(`SELECT origem FROM leads WHERE id = ? LIMIT 1`, [targetLeadId]);
            const leadOrigem = leadRes?.[0]?.origem;
            const { results: oppResObs } = await d1Api.runQuery(`SELECT observacao FROM opportunities WHERE id = ? LIMIT 1`, [id]);
            const oppObservacao = oppResObs?.[0]?.observacao;
            
            if (leadOrigem === 'Cotação (WooCommerce)' && oppObservacao) {
              const match = oppObservacao.match(/Pedido\/Cotação:\s*(\d+)/i);
              const quoteId = match ? match[1] : null;
              
              if (quoteId) {
                const settings = await d1Api.getSettings();
                const wcConfig = settings?.woocommerce;
                
                if (wcConfig && wcConfig.syncEnabled && wcConfig.url && wcConfig.consumerKey && wcConfig.consumerSecret) {
                  let wcStatus = '';
                  if (status === 'em_atendimento') {
                    wcStatus = 'ywraq-accepted';
                  } else if (status === 'cancelado' || status === 'perdida') {
                    wcStatus = 'ywraq-rejected';
                  }
                  
                  if (wcStatus) {
                    const cleanUrl = wcConfig.url.endsWith('/') ? wcConfig.url.slice(0, -1) : wcConfig.url;
                    const apiUrl = `${cleanUrl}/wp-json/wc/v3/orders/${quoteId}`;
                    const authHeader = 'Basic ' + btoa(`${wcConfig.consumerKey}:${wcConfig.consumerSecret}`);
                    
                    const wooResponse = await fetch(apiUrl, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authHeader
                      },
                      body: JSON.stringify({ status: wcStatus })
                    });
                    
                    if (!wooResponse.ok) {
                      const errorData = await wooResponse.text();
                      console.error('Erro ao sincronizar cotação com WooCommerce:', errorData);
                      await d1Api.saveSystemLog({
                        level: 'error',
                        source: 'WooCommerce Sync (Cotação)',
                        message: `Falha ao atualizar cotação ${quoteId} para ${wcStatus}: ${errorData}`,
                        details: null
                      });
                    }
                  }
                }
              }
            }
          } catch (wcErr) {
            console.error('Erro no sync de status da cotação com WooCommerce:', wcErr);
          }
        }
      } catch (err) {
        console.error('Erro ao disparar automação na mudança de status da oportunidade:', err);
      }
    }

    if (observacao !== undefined) {
      await d1Api.updateOpportunityObservacao(id, observacao);
    }

    if (markRead) {
      await d1Api.markOpportunityAsRead(id);
    }

    let assignedConnInfo: { connectionId: string; connectionName: string } | null = null;
    if (assignedTo) {
      await d1Api.updateOpportunityAssignment(id, assignedTo);
      const { results: oppRes } = await d1Api.runQuery(`SELECT leadId FROM opportunities WHERE id = ? LIMIT 1`, [id]);
      if (oppRes && oppRes[0]?.leadId) {
        assignedConnInfo = await d1Api.syncChatConnectionWithAssignedUser(oppRes[0].leadId, assignedTo);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Oportunidade atualizada com sucesso.',
      connectionId: assignedConnInfo?.connectionId,
      connectionName: assignedConnInfo?.connectionName
    });
  } catch (error: any) {
    console.error('Erro no PUT /api/opportunities:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'master') {
      return NextResponse.json({ error: 'Apenas administradores podem excluir oportunidades.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID da oportunidade é obrigatório' }, { status: 400 });
    }

    await d1Api.deleteOpportunity(id);
    return NextResponse.json({ success: true, message: 'Oportunidade excluída com sucesso.' });
  } catch (error: any) {
    console.error('Erro no DELETE /api/opportunities:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
