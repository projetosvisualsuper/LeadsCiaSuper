import { Lead, Campaign, FilaEnvio, Settings, LandingPageInstance, LandingPageSettings, BioLink, UserProfile, Segmentation, PopupConfig, ChatSession, ChatMessage, WhatsappConnection, WhatsappTemplate, Pedido, Opportunity, SystemLog } from '@/types/crm';


// Get the D1 database binding from process.env (or global context in Cloudflare Pages)
const getDbBinding = (): any => {
  if (typeof globalThis !== 'undefined' && (globalThis as any).DB) {
    return (globalThis as any).DB;
  }
  if (process.env.DB) {
    return process.env.DB;
  }
  
  // 2. Determina se estamos rodando localmente (Next.js dev local ou Edge sandbox local)
  // No Cloudflare Pages de produção, a API global de caches (caches.default) está presente.
  // No Next.js dev local e no sandbox do Edge local, ela não está presente.
  const isCloudflare = typeof globalThis !== 'undefined' && (globalThis as any).caches && (globalThis as any).caches.default;
  
  if (!isCloudflare) {
    return {
      prepare: (sql: string) => {
        return {
          bind: (...params: any[]) => {
            return {
              all: async () => {
                return executeWranglerD1Local(sql, params);
              },
              run: async () => {
                return executeWranglerD1Local(sql, params);
              }
            };
          },
          all: async () => {
            return executeWranglerD1Local(sql, []);
          },
          run: async () => {
            return executeWranglerD1Local(sql, []);
          }
        };
      }
    };
  }

  // Se estiver no Cloudflare Pages/Worker e não encontrar o binding 'DB'
  throw new Error(
    "Banco de dados D1 não encontrado. Se você está na hospedagem da Cloudflare Pages, " +
    "certifique-se de configurar o D1 Database Binding com o nome exato 'DB' nas " +
    "configurações do projeto no painel da Cloudflare (Configurações -> Funções -> D1 database bindings)."
  );
};

// Função auxiliar que chama o Wrangler D1 local por baixo dos panos no ambiente dev local
async function executeWranglerD1Local(sql: string, params: any[]): Promise<any> {
  const isClient = typeof window !== 'undefined';
  if (isClient || process.env.CF_PAGES === '1') {
    return { results: [], success: true, changes: 0 };
  }

  // Faz a chamada HTTP para nossa ponte local rodando em Node.js (porta 3005)
  // Isso evita o uso de child_process no sandbox do Edge Runtime do Next.js
  try {
    const res = await fetch('http://127.0.0.1:3005', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params })
    });
    if (!res.ok) {
      throw new Error('Falha na comunicação com a D1 Local Bridge.');
    }
    return await res.json();
  } catch (error: any) {
    console.error('Erro na simulação do Wrangler D1 local via Bridge:', error.message);
    throw error;
  }
}





// Helper helper function to execute SQL statements safely
const runQuery = async (sql: string, params: any[] = []): Promise<any> => {
  const db = getDbBinding();
  if (!db) {
    throw new Error('Cloudflare D1 DB binding not found. Please verify wrangler.toml configuration.');
  }
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      return await stmt.bind(...params).all();
    }
    return await stmt.all();
  } catch (error) {
    console.error('SQL Execution Error:', error, 'SQL:', sql, 'Params:', params);
    throw error;
  }
};

const executeRun = async (sql: string, params: any[] = []): Promise<any> => {
  const db = getDbBinding();
  if (!db) {
    throw new Error('Cloudflare D1 DB binding not found. Please verify wrangler.toml configuration.');
  }
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      return await stmt.bind(...params).run();
    }
    return await stmt.run();
  } catch (error) {
    console.error('SQL Execution Run Error:', error, 'SQL:', sql, 'Params:', params);
    throw error;
  }
};

export const d1Api = {
  // Leads
  getLeads: async (limitCount: number = 5000): Promise<Lead[]> => {
    const sql = `SELECT * FROM leads ORDER BY dataUltimaAtividade DESC, dataCriacao DESC LIMIT ?`;
    const { results } = await runQuery(sql, [limitCount]);
    return (results || []).map((row: any) => ({
      ...row,
      consentimentoLGPD: row.consentimentoLGPD === 1,
      isMetaLead: row.isMetaLead === 1,
      tags: row.tags ? JSON.parse(row.tags) : [],
      faturamento: row.faturamento || 0,
      documento: row.documento || undefined
    })) as Lead[];
  },

  saveLead: async (lead: Lead): Promise<Lead> => {
    const agora = new Date().toISOString();
    let targetId = lead.id;
    let existingData: any = null;

    // 1. Tentar encontrar lead por ID
    const { results: resultsId } = await runQuery(`SELECT * FROM leads WHERE id = ? LIMIT 1`, [lead.id]);
    if (resultsId && resultsId.length > 0) {
      existingData = resultsId[0];
    } else {
      // 1.5. Se não encontrar por ID, tentar por Documento
      if (lead.documento) {
        const { results: resultsDoc } = await runQuery(`SELECT * FROM leads WHERE documento = ? LIMIT 1`, [lead.documento]);
        if (resultsDoc && resultsDoc.length > 0) {
          targetId = resultsDoc[0].id;
          existingData = resultsDoc[0];
        }
      }

      // 2. Se não encontrar, tentar por E-mail
      if (!existingData && lead.email) {
        const { results: resultsEmail } = await runQuery(`SELECT * FROM leads WHERE email = ? LIMIT 1`, [lead.email]);
        if (resultsEmail && resultsEmail.length > 0) {
          targetId = resultsEmail[0].id;
          existingData = resultsEmail[0];
        }
      }

      // 3. Se ainda não encontrar, tentar por Celular
      if (!existingData && lead.celular) {
        const { results: resultsCelular } = await runQuery(`SELECT * FROM leads WHERE celular = ? LIMIT 1`, [lead.celular]);
        if (resultsCelular && resultsCelular.length > 0) {
          targetId = resultsCelular[0].id;
          existingData = resultsCelular[0];
        }
      }
    }

    const tagsJson = JSON.stringify(lead.tags || []);
    const consent = lead.consentimentoLGPD ? 1 : 0;
    const isMeta = lead.isMetaLead ? 1 : 0;

    if (existingData) {
      // Atualizar Lead Existente
      const totalConversoes = (existingData.totalConversoes || 1) + (resultsId && resultsId.length > 0 ? 0 : 1);
      const existingTags = existingData.tags ? JSON.parse(existingData.tags) : [];
      const mergedTags = Array.from(new Set([...existingTags, ...(lead.tags || [])]));
      
      const newObs = (existingData.observacoes || '') + (resultsId && resultsId.length > 0 ? '' : `\n[RECONVERSÃO] Nova interação em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} via ${lead.origem}`);

      const sql = `
        UPDATE leads 
        SET nome = ?, email = ?, telefone = ?, celular = ?, empresa = ?, origem = ?, 
            dataUltimaAtividade = ?, status = ?, tags = ?, consentimentoLGPD = ?, observacoes = ?, 
            utm_source = ?, utm_medium = ?, utm_campaign = ?, cidade = ?, estado = ?, 
            totalConversoes = ?, dataUltimaConversao = ?, avatar = ?, isMetaLead = ?,
            documento = ?, faturamento = ?, cicloVendasDias = ?
        WHERE id = ?
      `;
      const params = [
        lead.nome && lead.nome !== 'Cliente' ? lead.nome : existingData.nome,
        lead.email || existingData.email,
        lead.telefone || existingData.telefone,
        lead.celular || existingData.celular,
        lead.empresa || existingData.empresa,
        lead.origem || existingData.origem,
        agora,
        lead.status || existingData.status,
        JSON.stringify(mergedTags),
        consent,
        newObs,
        lead.utm_source || existingData.utm_source,
        lead.utm_medium || existingData.utm_medium,
        lead.utm_campaign || existingData.utm_campaign,
        lead.cidade || existingData.cidade,
        lead.estado || existingData.estado,
        totalConversoes,
        resultsId && resultsId.length > 0 ? (existingData.dataUltimaConversao || existingData.dataCriacao) : agora,
        lead.avatar || existingData.avatar,
        isMeta,
        lead.documento || existingData.documento || null,
        (existingData.faturamento || 0) + (lead.faturamento || 0),
        lead.cicloVendasDias !== undefined ? lead.cicloVendasDias : existingData.cicloVendasDias,
        targetId
      ];
      await executeRun(sql, params);

      // Sincronizar nome e avatar nas sessões de chat vinculadas
      const finalName = lead.nome && lead.nome !== 'Cliente' ? lead.nome : existingData.nome;
      const finalAvatar = lead.avatar || existingData.avatar || null;
      await executeRun(`UPDATE chats SET leadName = ?, leadAvatar = ? WHERE leadId = ?`, [finalName, finalAvatar, targetId]);

      lead.id = targetId;
    } else {
      // Criar Novo Lead
      const sql = `
        INSERT INTO leads (
          id, nome, email, telefone, celular, empresa, origem, dataCriacao, dataUltimaAtividade, 
          status, tags, consentimentoLGPD, observacoes, utm_source, utm_medium, utm_campaign, 
          cidade, estado, totalConversoes, dataUltimaConversao, avatar, isMetaLead, documento, faturamento, cicloVendasDias
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        lead.id,
        lead.nome || 'Cliente',
        lead.email || null,
        lead.telefone || null,
        lead.celular || null,
        lead.empresa || null,
        lead.origem,
        lead.dataCriacao || agora,
        agora,
        lead.status || 'novo',
        tagsJson,
        consent,
        lead.observacoes || null,
        lead.utm_source || null,
        lead.utm_medium || null,
        lead.utm_campaign || null,
        lead.cidade || null,
        lead.estado || null,
        1,
        agora,
        lead.avatar || null,
        isMeta,
        lead.documento || null,
        lead.faturamento || 0,
        lead.cicloVendasDias !== undefined ? lead.cicloVendasDias : null
      ];
      await executeRun(sql, params);
    }
    return lead;
  },

  deleteLead: async (id: string): Promise<void> => {
    await executeRun(`DELETE FROM leads WHERE id = ?`, [id]);
  },

  deleteLeadsBulk: async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    await executeRun(`DELETE FROM leads WHERE id IN (${placeholders})`, ids);
  },

  mergeLeads: async (sourceLeadId: string, targetLeadId: string): Promise<void> => {
    // 1. Buscar os leads
    const { results: sourceResults } = await runQuery(`SELECT * FROM leads WHERE id = ? LIMIT 1`, [sourceLeadId]);
    const { results: targetResults } = await runQuery(`SELECT * FROM leads WHERE id = ? LIMIT 1`, [targetLeadId]);

    if (!sourceResults || sourceResults.length === 0 || !targetResults || targetResults.length === 0) {
      throw new Error('Um ou ambos os leads não foram encontrados.');
    }

    const sourceLead = sourceResults[0];
    const targetLead = targetResults[0];

    // 2. Mesclar campos vazios no lead de destino (principal)
    const updates: string[] = [];
    const params: any[] = [];

    const fieldsToMerge = [
      'email', 'telefone', 'celular', 'empresa', 'observacoes', 
      'cidade', 'estado', 'documento', 'avatar'
    ];

    for (const field of fieldsToMerge) {
      if (!targetLead[field] && sourceLead[field]) {
        updates.push(`${field} = ?`);
        params.push(sourceLead[field]);
      }
    }

    // Faturamento
    if ((sourceLead.faturamento || 0) > (targetLead.faturamento || 0)) {
      updates.push(`faturamento = ?`);
      params.push(sourceLead.faturamento);
    }

    // Tags
    let targetTags: string[] = [];
    try { targetTags = targetLead.tags ? JSON.parse(targetLead.tags) : []; } catch (e) { targetTags = []; }
    let sourceTags: string[] = [];
    try { sourceTags = sourceLead.tags ? JSON.parse(sourceLead.tags) : []; } catch (e) { sourceTags = []; }
    const mergedTags = Array.from(new Set([...targetTags, ...sourceTags])).filter(Boolean);
    updates.push(`tags = ?`);
    params.push(JSON.stringify(mergedTags));

    if (updates.length > 0) {
      const sqlUpdate = `UPDATE leads SET ${updates.join(', ')} WHERE id = ?`;
      params.push(targetLeadId);
      await executeRun(sqlUpdate, params);
    }

    // 3. Atualizar dependências nas outras tabelas
    await executeRun(`UPDATE opportunities SET leadId = ? WHERE leadId = ?`, [targetLeadId, sourceLeadId]);
    await executeRun(`UPDATE pedidos SET leadId = ? WHERE leadId = ?`, [targetLeadId, sourceLeadId]);
    await executeRun(`UPDATE queue SET leadId = ? WHERE leadId = ?`, [targetLeadId, sourceLeadId]);
    
    // Atualizar sessões de chat vinculadas
    await executeRun(`UPDATE chats SET leadId = ?, leadName = ? WHERE leadId = ?`, [targetLeadId, targetLead.nome || 'Cliente', sourceLeadId]);

    // 4. Deletar o lead duplicado
    await executeRun(`DELETE FROM leads WHERE id = ?`, [sourceLeadId]);
  },

  saveLeadsBulk: async (leads: Lead[]): Promise<void> => {
    const agora = new Date().toISOString();
    for (const lead of leads) {
      const tagsJson = JSON.stringify(lead.tags || []);
      const consent = lead.consentimentoLGPD ? 1 : 0;
      const isMeta = lead.isMetaLead ? 1 : 0;
      const sql = `
        INSERT INTO leads (
          id, nome, email, telefone, celular, empresa, origem, dataCriacao, dataUltimaAtividade, 
          status, tags, consentimentoLGPD, observacoes, totalConversoes, dataUltimaConversao, avatar, isMetaLead, documento, faturamento
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          nome = excluded.nome, email = excluded.email, celular = excluded.celular,
          dataUltimaAtividade = excluded.dataUltimaAtividade, status = excluded.status,
          documento = excluded.documento, faturamento = excluded.faturamento
      `;
      const params = [
        lead.id,
        lead.nome || 'Cliente',
        lead.email || null,
        lead.telefone || null,
        lead.celular || null,
        lead.empresa || null,
        lead.origem,
        lead.dataCriacao || agora,
        agora,
        lead.status || 'novo',
        tagsJson,
        consent,
        lead.observacoes || null,
        lead.totalConversoes || 1,
        lead.dataUltimaConversao || agora,
        lead.avatar || null,
        isMeta,
        lead.documento || null,
        lead.faturamento || 0
      ];
      await executeRun(sql, params);
    }
  },

  // Campaigns
  getCampaigns: async (): Promise<Campaign[]> => {
    const { results } = await runQuery(`SELECT * FROM campaigns ORDER BY dataCriacao DESC`);
    return results as Campaign[];
  },

  saveCampaign: async (campaign: Campaign): Promise<Campaign> => {
    const sql = `
      INSERT INTO campaigns (
        id, nome, assunto, preheader, conteudoHtml, dataCriacao, dataAgendada, botaoTexto, botaoLink, 
        status, channel, whatsappConnectionId, segmentId, whatsappTemplateId, totalLeads, totalEnviados, 
        totalPendentes, totalErro, totalAbertos, totalCliques, textoSimples, bannerImg
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        nome = excluded.nome, assunto = excluded.assunto, preheader = excluded.preheader,
        conteudoHtml = excluded.conteudoHtml, dataAgendada = excluded.dataAgendada,
        botaoTexto = excluded.botaoTexto, botaoLink = excluded.botaoLink, status = excluded.status,
        channel = excluded.channel, whatsappConnectionId = excluded.whatsappConnectionId,
        segmentId = excluded.segmentId, whatsappTemplateId = excluded.whatsappTemplateId,
        totalLeads = excluded.totalLeads, totalEnviados = excluded.totalEnviados,
        totalPendentes = excluded.totalPendentes, totalErro = excluded.totalErro,
        totalAbertos = excluded.totalAbertos, totalCliques = excluded.totalCliques,
        textoSimples = excluded.textoSimples, bannerImg = excluded.bannerImg
    `;
    const params = [
      campaign.id,
      campaign.nome,
      campaign.assunto,
      campaign.preheader || null,
      campaign.conteudoHtml,
      campaign.dataCriacao || new Date().toISOString(),
      campaign.dataAgendada || null,
      campaign.botaoTexto || null,
      campaign.botaoLink || null,
      campaign.status,
      campaign.channel,
      campaign.whatsappConnectionId || null,
      campaign.segmentId || null,
      campaign.whatsappTemplateId || null,
      campaign.totalLeads || 0,
      campaign.totalEnviados || 0,
      campaign.totalPendentes || 0,
      campaign.totalErro || 0,
      campaign.totalAbertos || 0,
      campaign.totalCliques || 0,
      campaign.textoSimples || null,
      campaign.bannerImg || null
    ];
    await executeRun(sql, params);
    return campaign;
  },

  deleteCampaign: async (id: string): Promise<void> => {
    await executeRun(`DELETE FROM campaigns WHERE id = ?`, [id]);
    await executeRun(`DELETE FROM queue WHERE campanhaId = ?`, [id]);
  },

  // Queue
  getQueue: async (): Promise<FilaEnvio[]> => {
    const { results } = await runQuery(`SELECT * FROM queue`);
    return (results || []).map((row: any) => ({
      ...row,
      templateData: row.templateDataJson ? JSON.parse(row.templateDataJson) : undefined
    })) as FilaEnvio[];
  },

  generateQueueForCampaign: async (campanhaId: string, leadIds: string[]): Promise<FilaEnvio[]> => {
    // 1. Buscar campanha
    const { results: campaignRes } = await runQuery(`SELECT * FROM campaigns WHERE id = ? LIMIT 1`, [campanhaId]);
    if (!campaignRes || campaignRes.length === 0) throw new Error('Campanha não encontrada');
    const campaign = campaignRes[0] as Campaign;

    // 2. Buscar template se houver
    let templateData = null;
    if (campaign.channel === 'whatsapp' && campaign.whatsappTemplateId) {
      const { results: tplRes } = await runQuery(`SELECT * FROM whatsapp_templates WHERE id = ? LIMIT 1`, [campaign.whatsappTemplateId]);
      if (tplRes && tplRes.length > 0) {
        const tpl = tplRes[0];
        templateData = {
          name: tpl.name,
          language: tpl.language || 'pt_BR',
          components: tpl.componentsJson ? JSON.parse(tpl.componentsJson) : []
        };
      }
    }

    // 3. Buscar leads
    const placeholders = leadIds.map(() => '?').join(',');
    const { results: leadsRes } = await runQuery(`SELECT * FROM leads WHERE id IN (${placeholders})`, leadIds);

    const now = new Date().toISOString();
    const newItems: FilaEnvio[] = [];

    for (const lead of leadsRes) {
      const queueId = Math.random().toString(36).substr(2, 9);
      const sql = `
        INSERT INTO queue (
          id, campanhaId, leadId, email, telefone, channel, status, tentativa, dataAgendada, prioridade, whatsappConnectionId, templateDataJson
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        queueId,
        campanhaId,
        lead.id,
        campaign.channel === 'email' ? lead.email : null,
        campaign.channel === 'whatsapp' ? (lead.celular || lead.telefone) : null,
        campaign.channel,
        'pendente',
        0,
        now,
        1,
        campaign.whatsappConnectionId || null,
        templateData ? JSON.stringify(templateData) : null
      ];
      await executeRun(sql, params);
      newItems.push({
        id: queueId,
        campanhaId,
        leadId: lead.id,
        email: campaign.channel === 'email' ? lead.email : undefined,
        telefone: campaign.channel === 'whatsapp' ? (lead.celular || lead.telefone) : undefined,
        channel: campaign.channel,
        status: 'pendente',
        tentativa: 0,
        dataAgendada: now,
        prioridade: 1,
        whatsappConnectionId: campaign.whatsappConnectionId,
        templateData: templateData || undefined
      });
    }
    return newItems;
  },

  updateQueueItem: async (id: string, data: Partial<FilaEnvio>): Promise<void> => {
    const fields: string[] = [];
    const params: any[] = [];
    
    if (data.status !== undefined) { fields.push('status = ?'); params.push(data.status); }
    if (data.tentativa !== undefined) { fields.push('tentativa = ?'); params.push(data.tentativa); }
    if (data.erroMensagem !== undefined) { fields.push('erroMensagem = ?'); params.push(data.erroMensagem); }
    // dataEnvio não existe diretamente na FilaEnvio D1 schema, mas podemos ignorar ou atualizar na tabela se existir,
    // na schema.sql só existe dataAgendada. Podemos deixar assim.
    
    if (fields.length === 0) return;
    
    const sql = `UPDATE queue SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);
    await executeRun(sql, params);
  },

  updateCampaignStats: async (id: string, updates: Partial<Campaign>): Promise<void> => {
    const fields: string[] = [];
    const params: any[] = [];
    
    if (updates.totalEnviados !== undefined) { fields.push('totalEnviados = ?'); params.push(updates.totalEnviados); }
    if (updates.totalPendentes !== undefined) { fields.push('totalPendentes = ?'); params.push(updates.totalPendentes); }
    if (updates.totalErro !== undefined) { fields.push('totalErro = ?'); params.push(updates.totalErro); }
    if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
    
    if (fields.length === 0) return;
    
    const sql = `UPDATE campaigns SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);
    await executeRun(sql, params);
  },

  incrementCampaignOpen: async (id: string): Promise<void> => {
    await executeRun(`UPDATE campaigns SET totalAbertos = totalAbertos + 1 WHERE id = ?`, [id]);
  },

  incrementCampaignClick: async (id: string): Promise<void> => {
    await executeRun(`UPDATE campaigns SET totalCliques = totalCliques + 1 WHERE id = ?`, [id]);
  },

  // Settings
  getSettings: async (): Promise<Settings> => {
    try {
      const { results: globalRes } = await runQuery(`SELECT * FROM settings WHERE key = 'global' LIMIT 1`);
      const { results: visualRes } = await runQuery(`SELECT * FROM settings WHERE key = 'visual' LIMIT 1`);
      
      let settings = globalRes && globalRes.length > 0 ? JSON.parse(globalRes[0].valueJson) : {};
      let visualData = visualRes && visualRes.length > 0 ? JSON.parse(visualRes[0].valueJson) : {};

      return {
        brevoApiKey: settings.brevoApiKey || '',
        remetenteNome: settings.remetenteNome || 'Minha Empresa',
        remetenteEmail: settings.remetenteEmail || 'contato@minhaempresa.com',
        limiteDiario: settings.limiteDiario || 280,
        notificacoes: settings.notificacoes || { novosLeads: true, errosEnvio: true },
        landingPage: {
          titulo: settings.landingPage?.titulo || 'Leads Cia Super',
          subtitulo: settings.landingPage?.subtitulo || 'Acelere suas vendas com o melhor CRM',
          destaque: settings.landingPage?.destaque || 'do mercado brasileiro',
          descricao: settings.landingPage?.descricao || 'Capture, organize e converta leads de forma profissional com nossa plataforma intuitiva.',
          beneficios: settings.landingPage?.beneficios || [],
          formTitulo: settings.landingPage?.formTitulo || 'Solicite uma demonstração',
          formSubtitulo: settings.landingPage?.formSubtitulo || 'Preencha o formulário e um consultor entrará em contato.',
          botaoTexto: settings.landingPage?.botaoTexto || 'Falar com um consultor',
          backgroundUrl: visualData.backgroundUrl || settings.landingPage?.backgroundUrl || '/images/sales-bg.png',
          formColor: settings.landingPage?.formColor || '#3b82f6',
          botaoColor: settings.landingPage?.botaoColor || '#fbbf24',
          logoUrl: visualData.logoUrl || settings.landingPage?.logoUrl || '',
          ogLogoUrl: visualData.ogLogoUrl || settings.landingPage?.ogLogoUrl || '',
          faviconUrl: visualData.faviconUrl || settings.landingPage?.faviconUrl || '',
          headerColor: settings.landingPage?.headerColor || '#ffffff',
          footerText: settings.landingPage?.footerText || '',
          privacyPolicyUrl: settings.landingPage?.privacyPolicyUrl || ''
        },
        empresa: settings.empresa || { website: 'www.visualsuper.com.br', endereco: '' },
        whatsappWidget: settings.whatsappWidget || { enabled: true, posicao: 'right', atendentes: [] },
        omnichannel: settings.omnichannel || {},
        appUrl: settings.appUrl || '',
        autoresponder: settings.autoresponder || { enabled: false, message: '' },
        gtmId: settings.gtmId || '',
        woocommerce: settings.woocommerce || { url: '', consumerKey: '', consumerSecret: '', syncEnabled: false },
        bling: settings.bling || { enabled: false, clientId: '', clientSecret: '', accessToken: '', refreshToken: '', tokenExpiresAt: '', templateName: '', templateLanguage: 'pt_BR' }
      } as Settings;
    } catch (error) {
      console.error('Erro ao carregar configurações do D1:', error);
      return {} as Settings;
    }
  },

  saveSettings: async (settings: Settings): Promise<Settings> => {
    const { logoUrl, ogLogoUrl, faviconUrl, backgroundUrl, ...otherLp } = settings.landingPage || {};
    
    const visualData = {
      logoUrl: logoUrl || '',
      ogLogoUrl: ogLogoUrl || '',
      faviconUrl: faviconUrl || '',
      backgroundUrl: backgroundUrl || ''
    };

    const baseSettings = {
      ...settings,
      landingPage: {
        ...otherLp,
        logoUrl: logoUrl?.startsWith('data:') ? 'none' : (logoUrl || ''),
        ogLogoUrl: ogLogoUrl?.startsWith('data:') ? 'none' : (ogLogoUrl || ''),
        faviconUrl: faviconUrl?.startsWith('data:') ? 'none' : (faviconUrl || ''),
        backgroundUrl: backgroundUrl?.startsWith('data:') ? 'none' : (backgroundUrl || '')
      }
    };

    await executeRun(`INSERT INTO settings (key, valueJson) VALUES ('global', ?) ON CONFLICT(key) DO UPDATE SET valueJson = excluded.valueJson`, [JSON.stringify(baseSettings)]);
    await executeRun(`INSERT INTO settings (key, valueJson) VALUES ('visual', ?) ON CONFLICT(key) DO UPDATE SET valueJson = excluded.valueJson`, [JSON.stringify(visualData)]);
    return settings;
  },

  // Landing Pages
  getLandingPages: async (): Promise<LandingPageInstance[]> => {
    const { results } = await runQuery(`SELECT * FROM landing_pages ORDER BY dataCriacao DESC`);
    return (results || []).map((row: any) => ({
      ...row,
      isAtiva: row.isAtiva === 1,
      config: JSON.parse(row.configJson)
    })) as LandingPageInstance[];
  },

  getLandingPageBySlug: async (slug: string): Promise<LandingPageInstance | null> => {
    const { results } = await runQuery(`SELECT * FROM landing_pages WHERE slug = ? LIMIT 1`, [slug]);
    if (!results || results.length === 0) return null;
    const row = results[0];
    return {
      ...row,
      isAtiva: row.isAtiva === 1,
      config: JSON.parse(row.configJson)
    } as LandingPageInstance;
  },

  saveLandingPage: async (page: LandingPageInstance): Promise<LandingPageInstance> => {
    const sql = `
      INSERT INTO landing_pages (id, slug, templateId, configJson, dataCriacao, isAtiva, visualizacoes, cliquesTotais)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        slug = excluded.slug, templateId = excluded.templateId, configJson = excluded.configJson,
        isAtiva = excluded.isAtiva, visualizacoes = excluded.visualizacoes, cliquesTotais = excluded.cliquesTotais
    `;
    const params = [
      page.id,
      page.slug,
      page.templateId,
      JSON.stringify(page.config),
      page.dataCriacao || new Date().toISOString(),
      page.isAtiva ? 1 : 0,
      page.visualizacoes || 0,
      page.cliquesTotais || 0
    ];
    await executeRun(sql, params);
    return page;
  },

  deleteLandingPage: async (id: string): Promise<void> => {
    await executeRun(`DELETE FROM landing_pages WHERE id = ?`, [id]);
  },

  incrementLandingPageView: async (id: string): Promise<void> => {
    await executeRun(`UPDATE landing_pages SET visualizacoes = visualizacoes + 1 WHERE id = ?`, [id]);
  },

  incrementLandingPageClick: async (id: string): Promise<void> => {
    await executeRun(`UPDATE landing_pages SET cliquesTotais = cliquesTotais + 1 WHERE id = ?`, [id]);
  },

  // Bio Links
  getBioLinks: async (): Promise<BioLink[]> => {
    const { results } = await runQuery(`SELECT * FROM bio_links ORDER BY dataCriacao DESC`);
    return (results || []).map((row: any) => ({
      ...row,
      socials: row.socialsJson ? JSON.parse(row.socialsJson) : [],
      items: row.itemsJson ? JSON.parse(row.itemsJson) : [],
      theme: row.themeJson ? JSON.parse(row.themeJson) : {}
    })) as BioLink[];
  },

  getBioLinkBySlug: async (slug: string): Promise<BioLink | null> => {
    const { results } = await runQuery(`SELECT * FROM bio_links WHERE slug = ? LIMIT 1`, [slug]);
    if (!results || results.length === 0) return null;
    const row = results[0];
    return {
      ...row,
      socials: row.socialsJson ? JSON.parse(row.socialsJson) : [],
      items: row.itemsJson ? JSON.parse(row.itemsJson) : [],
      theme: row.themeJson ? JSON.parse(row.themeJson) : {}
    } as BioLink;
  },

  saveBioLink: async (bio: BioLink): Promise<BioLink> => {
    const sql = `
      INSERT INTO bio_links (id, slug, profileName, bio, avatarUrl, footerLogoUrl, socialsJson, itemsJson, themeJson, dataCriacao, cliquesTotais, visualizacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        slug = excluded.slug, profileName = excluded.profileName, bio = excluded.bio,
        avatarUrl = excluded.avatarUrl, footerLogoUrl = excluded.footerLogoUrl,
        socialsJson = excluded.socialsJson, itemsJson = excluded.itemsJson, themeJson = excluded.themeJson,
        cliquesTotais = excluded.cliquesTotais, visualizacoes = excluded.visualizacoes
    `;
    const params = [
      bio.id,
      bio.slug,
      bio.profileName,
      bio.bio || null,
      bio.avatarUrl || null,
      bio.footerLogoUrl || null,
      JSON.stringify(bio.socials || []),
      JSON.stringify(bio.items || []),
      JSON.stringify(bio.theme || {}),
      bio.dataCriacao || new Date().toISOString(),
      bio.cliquesTotais || 0,
      bio.visualizacoes || 0
    ];
    await executeRun(sql, params);
    return bio;
  },

  deleteBioLink: async (id: string): Promise<void> => {
    await executeRun(`DELETE FROM bio_links WHERE id = ?`, [id]);
  },

  incrementBioView: async (id: string): Promise<void> => {
    await executeRun(`UPDATE bio_links SET visualizacoes = visualizacoes + 1 WHERE id = ?`, [id]);
  },

  incrementBioClick: async (id: string): Promise<void> => {
    await executeRun(`UPDATE bio_links SET cliquesTotais = cliquesTotais + 1 WHERE id = ?`, [id]);
  },

  // User Management
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    const { results } = await runQuery(`SELECT * FROM users WHERE uid = ? LIMIT 1`, [uid]);
    if (!results || results.length === 0) return null;
    return results[0] as UserProfile;
  },

  createUserProfile: async (profile: UserProfile): Promise<UserProfile> => {
    // Se for o primeiro usuário, aprova automaticamente como admin
    const { results: anyUsers } = await runQuery(`SELECT uid FROM users LIMIT 1`);
    if (!anyUsers || anyUsers.length === 0) {
      profile.status = 'approved';
      profile.role = 'admin';
    }

    const sql = `
      INSERT INTO users (uid, email, name, status, role, dataSolicitacao, dataAprovacao, whatsappConnectionId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        email = excluded.email, name = excluded.name, status = excluded.status, role = excluded.role,
        whatsappConnectionId = excluded.whatsappConnectionId
    `;
    const params = [
      profile.uid,
      profile.email,
      profile.name || null,
      profile.status,
      profile.role,
      profile.dataSolicitacao || new Date().toISOString(),
      profile.dataAprovacao || null,
      profile.whatsappConnectionId || null
    ];
    await executeRun(sql, params);
    return profile;
  },

  updateUserProfile: async (uid: string, data: Partial<UserProfile>): Promise<void> => {
    const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
    if (!fields) return;
    const sql = `UPDATE users SET ${fields} WHERE uid = ?`;
    const params = [...Object.values(data), uid];
    await executeRun(sql, params);
  },

  deleteUserProfile: async (uid: string): Promise<void> => {
    await executeRun(`DELETE FROM users WHERE uid = ?`, [uid]);
  },

  getAllUserProfiles: async (): Promise<UserProfile[]> => {
    const { results } = await runQuery(`SELECT * FROM users ORDER BY dataSolicitacao DESC`);
    return results as UserProfile[];
  },

  // Segmentations
  getSegmentations: async (): Promise<Segmentation[]> => {
    const { results } = await runQuery(`SELECT * FROM segmentations ORDER BY dataCriacao DESC`);
    return (results || []).map((row: any) => ({
      ...row,
      leadIds: row.leadIdsJson ? JSON.parse(row.leadIdsJson) : []
    })) as Segmentation[];
  },

  saveSegmentation: async (segment: Segmentation): Promise<Segmentation> => {
    const sql = `
      INSERT INTO segmentations (id, nome, descricao, leadIdsJson, dataCriacao)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        nome = excluded.nome, descricao = excluded.descricao, leadIdsJson = excluded.leadIdsJson
    `;
    const params = [
      segment.id,
      segment.nome,
      segment.descricao || null,
      JSON.stringify(segment.leadIds || []),
      segment.dataCriacao || new Date().toISOString()
    ];
    await executeRun(sql, params);
    return segment;
  },

  deleteSegmentation: async (id: string): Promise<void> => {
    await executeRun(`DELETE FROM segmentations WHERE id = ?`, [id]);
  },

  // Popups
  getPopups: async (): Promise<PopupConfig[]> => {
    const { results } = await runQuery(`SELECT * FROM popups ORDER BY dataCriacao DESC`);
    return (results || []).map((row: any) => ({
      ...row,
      isActive: row.isActive === 1,
      pages: row.pagesJson ? JSON.parse(row.pagesJson) : [],
      theme: row.themeJson ? JSON.parse(row.themeJson) : {}
    })) as PopupConfig[];
  },

  savePopup: async (popup: PopupConfig): Promise<PopupConfig> => {
    const sql = `
      INSERT INTO popups (id, name, templateId, title, subtitle, imageUrl, buttonText, buttonLink, couponCode, trigger, triggerValue, isActive, dataCriacao, pagesJson, themeJson)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, templateId = excluded.templateId, title = excluded.title, subtitle = excluded.subtitle,
        imageUrl = excluded.imageUrl, buttonText = excluded.buttonText, buttonLink = excluded.buttonLink,
        couponCode = excluded.couponCode, trigger = excluded.trigger, triggerValue = excluded.triggerValue,
        isActive = excluded.isActive, pagesJson = excluded.pagesJson, themeJson = excluded.themeJson
    `;
    const params = [
      popup.id,
      popup.name,
      popup.templateId,
      popup.title,
      popup.subtitle || null,
      popup.imageUrl || null,
      popup.buttonText,
      popup.buttonLink,
      popup.couponCode || null,
      popup.trigger,
      popup.triggerValue || null,
      popup.isActive ? 1 : 0,
      popup.dataCriacao || new Date().toISOString(),
      JSON.stringify(popup.pages || []),
      JSON.stringify(popup.theme || {})
    ];
    await executeRun(sql, params);
    return popup;
  },

  deletePopup: async (id: string): Promise<void> => {
    await executeRun(`DELETE FROM popups WHERE id = ?`, [id]);
  },

  ensureEtapaAtendimentoColumn: async (): Promise<void> => {
    try {
      await executeRun(`ALTER TABLE chats ADD COLUMN etapaAtendimento TEXT DEFAULT 'novo'`);
    } catch (e) {
      // Ignora se a coluna já existir
    }
  },

  updateChatEtapa: async (chatId: string, etapa: string): Promise<void> => {
    await d1Api.ensureEtapaAtendimentoColumn();
    await executeRun(`UPDATE chats SET etapaAtendimento = ? WHERE id = ?`, [etapa, chatId]);
  },

  // Chats / Inbox
  getChats: async (assignedTo?: string): Promise<ChatSession[]> => {
    await d1Api.ensureEtapaAtendimentoColumn();
    let sql = `
      SELECT c.*, 
        (SELECT m.isIncoming FROM messages m WHERE m.chatId = c.id ORDER BY m.timestamp DESC LIMIT 1) as lastMessageIsIncoming
      FROM chats c
    `;
    let params: any[] = [];
    if (assignedTo) {
      sql += ` WHERE c.assignedTo = ? `;
      params.push(assignedTo);
    }
    sql += ` ORDER BY c.lastTimestamp DESC, c.dataCriacao DESC `;
    const { results } = await runQuery(sql, params);
    return results as ChatSession[];
  },

  getMessages: async (chatId: string): Promise<ChatMessage[]> => {
    const { results } = await runQuery(`SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC`, [chatId]);
    return (results || []).map((row: any) => ({
      ...row,
      isIncoming: row.isIncoming === 1
    })) as ChatMessage[];
  },

  sendMessage: async (message: any): Promise<any> => {
    let finalChatId = message.chatId;
    if (message.channel === 'instagram' || message.channel === 'facebook') {
      if (message.leadId) {
        finalChatId = `${message.channel}_${message.leadId}`;
      }
    }

    const messageId = message.id || Math.random().toString(36).substr(2, 9);
    const sqlMsg = `
      INSERT INTO messages (id, chatId, senderId, senderName, content, timestamp, type, status, isIncoming, mediaUrl, mediaMimeType, quotedMessageId, quotedMessageSender, quotedMessageContent, connectionId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const paramsMsg = [
      messageId,
      finalChatId,
      message.senderId,
      message.senderName,
      message.content,
      message.timestamp || new Date().toISOString(),
      message.type || 'text',
      message.status || 'sent',
      message.isIncoming ? 1 : 0,
      message.mediaUrl || null,
      message.mediaMimeType || null,
      message.quotedMessageId || null,
      message.quotedMessageSender || null,
      message.quotedMessageContent || null,
      message.connectionId || null
    ];
    await executeRun(sqlMsg, paramsMsg);

    // Atualizar sessão
    if (finalChatId) {
      const sqlUpdateChat = `
        UPDATE chats 
        SET lastMessage = ?, lastTimestamp = ? ${message.isIncoming ? '' : ', unreadCount = 0'} 
        WHERE id = ?
      `;
      const resultUpdate = await executeRun(sqlUpdateChat, [message.content, new Date().toISOString(), finalChatId]);
      
      if (resultUpdate.changes === 0 && message.leadId) {
        // Se não atualizou nada, o chat não existe ainda e precisamos criá-lo
        const sqlNewChat = `
          INSERT INTO chats (id, leadId, leadName, leadAvatar, channel, lastMessage, lastTimestamp, unreadCount, status, dataCriacao)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const paramsNewChat = [
          finalChatId,
          message.leadId,
          message.leadName || 'Lead',
          message.leadAvatar || null,
          message.channel,
          message.content,
          new Date().toISOString(),
          0,
          'active',
          new Date().toISOString()
        ];
        await executeRun(sqlNewChat, paramsNewChat);
      }
    }
    return message;
  },

  markChatAsRead: async (chatId: string): Promise<void> => {
    await executeRun(`UPDATE chats SET unreadCount = 0 WHERE id = ?`, [chatId]);
  },

  saveChatSession: async (session: any): Promise<any> => {
    const sql = `
      INSERT INTO chats (id, leadId, leadName, leadAvatar, channel, connectionId, connectionName, lastMessage, lastTimestamp, unreadCount, status, dataCriacao, isInternal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        leadName = excluded.leadName, leadAvatar = excluded.leadAvatar, channel = excluded.channel,
        connectionId = excluded.connectionId, connectionName = excluded.connectionName,
        lastMessage = excluded.lastMessage, lastTimestamp = excluded.lastTimestamp,
        unreadCount = excluded.unreadCount, status = excluded.status, isInternal = excluded.isInternal
    `;
    const params = [
      session.id,
      session.leadId,
      session.leadName,
      session.leadAvatar || null,
      session.channel,
      session.connectionId || null,
      session.connectionName || null,
      session.lastMessage || null,
      session.lastTimestamp || null,
      session.unreadCount || 0,
      session.status || 'active',
      session.dataCriacao || new Date().toISOString(),
      session.isInternal || 0
    ];
    await executeRun(sql, params);
    return session;
  },

  // Whatsapp Connections
  getWhatsappConnections: async (): Promise<WhatsappConnection[]> => {
    const { results } = await runQuery(`SELECT * FROM whatsapp_connections`);
    return (results || []).map((row: any) => ({
      ...row,
      isDefault: row.isDefault === 1
    })) as WhatsappConnection[];
  },

  getWhatsappConnectionById: async (id: string): Promise<WhatsappConnection | null> => {
    const { results } = await runQuery(`SELECT * FROM whatsapp_connections WHERE id = ? LIMIT 1`, [id]);
    if (!results || results.length === 0) return null;
    return {
      ...results[0],
      isDefault: results[0].isDefault === 1
    } as WhatsappConnection;
  },

  createWhatsappConnection: async (connection: Omit<WhatsappConnection, 'id'>): Promise<string> => {
    const id = Math.random().toString(36).substr(2, 9);
    const sql = `
      INSERT INTO whatsapp_connections (id, name, type, status, phoneNumber, metaPhoneNumberId, metaWabaId, metaAccessToken, evolutionInstanceName, evolutionApiKey, qrCodeBase64, isDefault, dataCriacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      id,
      connection.name,
      connection.type,
      connection.status,
      connection.phoneNumber || null,
      connection.metaPhoneNumberId || null,
      connection.metaWabaId || null,
      connection.metaAccessToken || null,
      connection.evolutionInstanceName || null,
      connection.evolutionApiKey || null,
      connection.qrCodeBase64 || null,
      connection.isDefault ? 1 : 0,
      connection.dataCriacao || new Date().toISOString()
    ];
    await executeRun(sql, params);
    return id;
  },

  updateWhatsappConnection: async (id: string, updates: Partial<WhatsappConnection>): Promise<void> => {
    const fields = Object.keys(updates).map(key => {
      if (key === 'isDefault') return `isDefault = ?`;
      return `${key} = ?`;
    }).join(', ');
    if (!fields) return;

    const sql = `UPDATE whatsapp_connections SET ${fields} WHERE id = ?`;
    const params = Object.keys(updates).map(key => {
      if (key === 'isDefault') return updates.isDefault ? 1 : 0;
      return (updates as any)[key];
    });
    params.push(id);

    await executeRun(sql, params);
  },

  deleteWhatsappConnection: async (id: string): Promise<void> => {
    await executeRun(`DELETE FROM whatsapp_connections WHERE id = ?`, [id]);
  },

  // Whatsapp Templates
  getWhatsappTemplates: async (connectionId?: string): Promise<WhatsappTemplate[]> => {
    let sql = `SELECT * FROM whatsapp_templates`;
    let params: any[] = [];
    if (connectionId) {
      sql += ` WHERE connectionId = ?`;
      params.push(connectionId);
    }
    const { results } = await runQuery(sql, params);
    return (results || []).map((row: any) => ({
      ...row,
      components: row.componentsJson ? JSON.parse(row.componentsJson) : []
    })) as WhatsappTemplate[];
  },

  saveWhatsappTemplate: async (template: WhatsappTemplate): Promise<void> => {
    const sql = `
      INSERT INTO whatsapp_templates (id, connectionId, name, category, language, content, status, componentsJson, dataCriacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        connectionId = excluded.connectionId, name = excluded.name, category = excluded.category,
        language = excluded.language, content = excluded.content, status = excluded.status,
        componentsJson = excluded.componentsJson
    `;
    const params = [
      template.id,
      template.connectionId,
      template.name,
      template.category,
      template.language,
      template.content,
      template.status,
      template.components ? JSON.stringify(template.components) : null,
      template.dataCriacao || new Date().toISOString()
    ];
    await executeRun(sql, params);
  },

  deleteWhatsappTemplate: async (id: string): Promise<void> => {
    await executeRun(`DELETE FROM whatsapp_templates WHERE id = ?`, [id]);
  },

  submitTemplateToMeta: async (templateId: string, origin?: string): Promise<any> => {
    // 1. Buscar o template no banco
    const { results: templates } = await runQuery(`SELECT * FROM whatsapp_templates WHERE id = ? LIMIT 1`, [templateId]);
    if (!templates || templates.length === 0) {
      throw new Error('Modelo não encontrado no banco de dados.');
    }
    const tpl = templates[0];
    const components = tpl.componentsJson ? JSON.parse(tpl.componentsJson) : [];

    // 2. Buscar a conexão
    const { results: connections } = await runQuery(`SELECT * FROM whatsapp_connections WHERE id = ? LIMIT 1`, [tpl.connectionId]);
    if (!connections || connections.length === 0) {
      throw new Error('Conexão associada não encontrada.');
    }
    const conn = connections[0];
    const token = conn.metaAccessToken;
    const wabaId = conn.metaWabaId;

    if (!token || !wabaId) {
      throw new Error('Essa conexão não possui ID do WABA ou Token configurados.');
    }

    // 3. Mapear para o formato que a Meta espera
    const metaComponents: any[] = [
      {
        type: 'BODY',
        text: tpl.content
      }
    ];

    for (const comp of components) {
      if (comp.type === 'HEADER') {
        if (comp.format === 'TEXT') {
          metaComponents.push({
            type: 'HEADER',
            format: 'TEXT',
            text: comp.text
          });
        } else {
          let mediaVal = comp.imageUrl || comp.mediaUrl || 'https://visualsuper.com.br/placeholder.png';
          let mimeType = 'image/png';
          let buffer: ArrayBuffer | null = null;
          
          // Se a imagem ainda for base64, fazer upload para o R2 no backend
          if (mediaVal.startsWith('data:')) {
            try {
              const matches = mediaVal.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
              if (matches && matches.length === 3) {
                mimeType = matches[1];
                const base64Data = matches[2];
                
                // Converter base64 para ArrayBuffer
                const binaryString = atob(base64Data);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                buffer = bytes.buffer;
                
                const extension = mimeType.split('/').pop() || 'png';
                const safeName = Math.random().toString(36).substring(2, 10);
                const fileName = `templates/${safeName}.${extension}`;
                
                // Acessar R2 bucket
                let bucket = (globalThis as any).BUCKET;
                if (bucket) {
                  await bucket.put(fileName, buffer, {
                    httpMetadata: { contentType: mimeType }
                  });
                  mediaVal = `/api/media/${fileName}`;
                  
                  // Atualizar os componentes locais do template no banco para salvar o novo caminho
                  const updatedComponents = components.map((c: any) => {
                    if (c.type === 'HEADER' && c.format === 'IMAGE') {
                      return { ...c, imageUrl: mediaVal, mediaUrl: mediaVal };
                    }
                    return c;
                  });
                  await executeRun(`UPDATE whatsapp_templates SET componentsJson = ? WHERE id = ?`, [JSON.stringify(updatedComponents), templateId]);
                }
              }
            } catch (err) {
              console.error('Erro ao converter base64 para R2 na ponte:', err);
            }
          }

          // Se não for base64, ou se a conversão falhou/não ocorreu, baixar do R2/URL pública
          if (!buffer) {
            try {
              let fetchUrl = mediaVal;
              if (fetchUrl.startsWith('/')) {
                fetchUrl = `${origin?.replace(/\/$/, '') || 'https://leads.ciasuper.com.br'}${fetchUrl}`;
              }
              const fetchRes = await fetch(fetchUrl);
              if (!fetchRes.ok) {
                throw new Error(`Falha ao baixar imagem de exemplo do cabeçalho: ${fetchRes.statusText}`);
              }
              buffer = await fetchRes.arrayBuffer();
              mimeType = fetchRes.headers.get('Content-Type') || 'image/png';
            } catch (fetchErr: any) {
              throw new Error(`Erro ao carregar mídia para upload da Meta: ${fetchErr.message}`);
            }
          }

          // Fazer o upload para a Meta via Resumable Upload API
          // 1. Obter o App ID do token da conexão
          const appRes = await fetch(`https://graph.facebook.com/v19.0/app?access_token=${token}`);
          if (!appRes.ok) {
            const errData = await appRes.json();
            throw new Error(`Erro ao obter App ID da Meta: ${errData.error?.message || appRes.statusText}`);
          }
          const appData = await appRes.json();
          const appId = appData.id;

          // 2. Iniciar a sessão de upload na Meta
          const initRes = await fetch(`https://graph.facebook.com/v19.0/${appId}/uploads?file_length=${buffer.byteLength}&file_type=${mimeType}&access_token=${token}`, {
            method: 'POST'
          });
          if (!initRes.ok) {
            const errData = await initRes.json();
            throw new Error(`Erro ao iniciar sessão de upload na Meta: ${errData.error?.message || initRes.statusText}`);
          }
          const initData = await initRes.json();
          const uploadSessionId = initData.id;

          // 3. Enviar bytes do arquivo para a Meta
          const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${uploadSessionId}`, {
            method: 'POST',
            headers: {
              'Authorization': `OAuth ${token}`,
              'file_offset': '0',
              'Content-Type': 'application/octet-stream'
            },
            body: buffer
          });
          if (!uploadRes.ok) {
            const errData = await uploadRes.json();
            throw new Error(`Erro ao enviar bytes de mídia para a Meta: ${errData.error?.message || uploadRes.statusText}`);
          }
          const uploadData = await uploadRes.json();
          const headerHandle = uploadData.h;

          metaComponents.push({
            type: 'HEADER',
            format: comp.format || 'IMAGE',
            example: {
              header_handle: [headerHandle]
            }
          });
        }
      } else if (comp.type === 'FOOTER') {
        metaComponents.push({
          type: 'FOOTER',
          text: comp.text
        });
      } else if (comp.type === 'BUTTONS') {
        metaComponents.push({
          type: 'BUTTONS',
          buttons: (comp.buttons || []).map((b: any) => {
            const btn: any = {
              type: b.type === 'QUICK_REPLY' || b.type === 'quick_reply' ? 'QUICK_REPLY' : b.type,
              text: b.text
            };
            if (b.type === 'URL' || b.type === 'url') {
              btn.type = 'URL';
              btn.url = b.url;
            } else if (b.type === 'PHONE_NUMBER' || b.type === 'phone' || b.type === 'PHONE') {
              btn.type = 'PHONE_NUMBER';
              btn.phone_number = b.phone || b.phoneNumber;
            }
            return btn;
          })
        });
      }
    }

    const payload = {
      name: tpl.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      category: tpl.category || 'MARKETING',
      language: tpl.language || 'pt_BR',
      components: metaComponents
    };

    // 4. Enviar requisição para a Meta
    const response = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/message_templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(`Erro Meta: ${responseData.error?.message || JSON.stringify(responseData)}`);
    }

    // 5. Atualizar o status local
    const metaStatus = responseData.status || 'PENDING';
    await executeRun(`UPDATE whatsapp_templates SET status = ?, name = ? WHERE id = ?`, [
      metaStatus,
      payload.name,
      templateId
    ]);

    return { success: true, status: metaStatus, metaResponse: responseData };
  },

  syncTemplatesFromMeta: async (connectionId: string, onlyUpdateExisting?: boolean): Promise<any> => {
    // 1. Buscar a conexão
    const { results: connections } = await runQuery(`SELECT * FROM whatsapp_connections WHERE id = ? LIMIT 1`, [connectionId]);
    if (!connections || connections.length === 0) {
      throw new Error('Conexão não encontrada.');
    }
    const conn = connections[0];
    const token = conn.metaAccessToken;
    const wabaId = conn.metaWabaId;

    if (!token || !wabaId) {
      throw new Error('Essa conexão não possui ID do WABA ou Token configurados.');
    }

    // 2. Buscar templates na Meta (com limite alto e tratando paginação)
    let url = `https://graph.facebook.com/v19.0/${wabaId}/message_templates?limit=100&access_token=${token}`;
    const allMetaTemplates: any[] = [];

    while (url) {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(`Erro ao buscar templates na Meta: ${data.error?.message || JSON.stringify(data)}`);
      }
      if (data.data) {
        allMetaTemplates.push(...data.data);
      }
      url = data.paging?.next || null;
    }

    // 3. Sincronizar com o banco local
    let createdCount = 0;
    let updatedCount = 0;

    for (const t of allMetaTemplates) {
      // Procurar localmente por nome e idioma
      const { results: locals } = await runQuery(
        `SELECT * FROM whatsapp_templates WHERE name = ? AND language = ? AND connectionId = ? LIMIT 1`,
        [t.name, t.language, connectionId]
      );

      // Extrair o conteúdo do corpo (body) para visualização
      const bodyComp = (t.components || []).find((c: any) => c.type === 'BODY');
      const content = bodyComp ? bodyComp.text : '';

      // Filtrar apenas os componentes que não sejam o BODY para salvar no componentsJson
      const otherComponents = (t.components || []).filter((c: any) => c.type !== 'BODY');

      if (locals && locals.length > 0) {
        // Atualizar status e conteúdo do existente
        await executeRun(
          `UPDATE whatsapp_templates SET status = ?, category = ?, content = ?, componentsJson = ? WHERE id = ?`,
          [t.status, t.category, content, JSON.stringify(otherComponents), locals[0].id]
        );
        updatedCount++;
      } else if (!onlyUpdateExisting) {
        // Inserir novo importado da Meta
        const id = Math.random().toString(36).substr(2, 9);
        await executeRun(
          `INSERT INTO whatsapp_templates (id, connectionId, name, category, language, content, status, componentsJson, dataCriacao)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            connectionId,
            t.name,
            t.category,
            t.language,
            content,
            t.status,
            JSON.stringify(otherComponents),
            new Date().toISOString()
          ]
        );
        createdCount++;
      }
    }

    return { success: true, createdCount, updatedCount, totalMeta: allMetaTemplates.length };
  },


  // Stats / Dashboard
  getSentTodayCount: async (): Promise<number> => {
    const today = new Date().toISOString().split('T')[0];
    const sql = `SELECT COUNT(id) as count FROM queue WHERE status = 'enviado' AND dataEnvio >= ? AND dataEnvio <= ?`;
    const { results } = await runQuery(sql, [today, today + "\uf8ff"]);
    return results && results.length > 0 ? results[0].count : 0;
  },

  getDashboardStats: async (period?: string, customStart?: string, customEnd?: string): Promise<any> => {
    const now = new Date();
    let limitDateStr = '';
    let endDateStr = '';

    if (period === 'today') {
      const d = new Date();
      d.setHours(0,0,0,0);
      limitDateStr = d.toISOString();
    } else if (period === '7d') {
      const d = new Date();
      d.setDate(now.getDate() - 7);
      limitDateStr = d.toISOString();
    } else if (period === '30d') {
      const d = new Date();
      d.setDate(now.getDate() - 30);
      limitDateStr = d.toISOString();
    } else if (period === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      limitDateStr = d.toISOString();
    } else if (period === 'custom') {
      if (customStart) limitDateStr = new Date(customStart + 'T00:00:00').toISOString();
      if (customEnd) endDateStr = new Date(customEnd + 'T23:59:59').toISOString();
    }

    // Calcular contagens base
    let totalLeadsCount = 0;
    let totalCampaignsCount = 0;
    let leadsByStatus = { novo: 0, contatado: 0, convertido: 0, perdido: 0 };

    let leadsSql = `SELECT status, dataCriacao FROM leads`;
    let campaignSql = `SELECT dataCriacao FROM campaigns`;
    let leadsParams: any[] = [];
    let campaignParams: any[] = [];

    if (limitDateStr || endDateStr) {
      leadsSql += ` WHERE 1=1`;
      campaignSql += ` WHERE 1=1`;
      if (limitDateStr) {
        leadsSql += ` AND dataCriacao >= ?`;
        campaignSql += ` AND dataCriacao >= ?`;
        leadsParams.push(limitDateStr);
        campaignParams.push(limitDateStr);
      }
      if (endDateStr) {
        leadsSql += ` AND dataCriacao <= ?`;
        campaignSql += ` AND dataCriacao <= ?`;
        leadsParams.push(endDateStr);
        campaignParams.push(endDateStr);
      }
    }

    const { results: leadsResults } = await runQuery(leadsSql, leadsParams);
    const { results: campaignsResults } = await runQuery(campaignSql, campaignParams);

    totalLeadsCount = leadsResults ? leadsResults.length : 0;
    totalCampaignsCount = campaignsResults ? campaignsResults.length : 0;

    if (leadsResults) {
      leadsResults.forEach((row: any) => {
        if (row.status && row.status in leadsByStatus) {
          leadsByStatus[row.status as keyof typeof leadsByStatus]++;
        }
      });
    }

     // Contagens rápidas adicionais
    const { results: queueResults } = await runQuery(`SELECT COUNT(id) as count FROM queue WHERE status = 'pendente'`);
    const todayStr = now.toISOString().split('T')[0];
    const { results: leadsTodayResults } = await runQuery(
      `SELECT COUNT(id) as count FROM leads WHERE (dataCriacao >= ? AND dataCriacao <= ?) OR (dataUltimaConversao >= ? AND dataUltimaConversao <= ?)`,
      [todayStr, todayStr + "\uf8ff", todayStr, todayStr + "\uf8ff"]
    );
    const { results: chatsPendingResults } = await runQuery(`SELECT COUNT(id) as count FROM chats WHERE unreadCount > 0`);

    // Obter leads e campanhas recentes
    const { results: recentLeadsRaw } = await runQuery(`SELECT * FROM leads ORDER BY dataCriacao DESC LIMIT 5`);
    const { results: recentCampaignsRaw } = await runQuery(`SELECT * FROM campaigns ORDER BY dataCriacao DESC LIMIT 4`);

    const recentLeads = (recentLeadsRaw || []).map((row: any) => ({
      ...row,
      consentimentoLGPD: row.consentimentoLGPD === 1,
      isMetaLead: row.isMetaLead === 1,
      tags: row.tags ? JSON.parse(row.tags) : []
    })) as Lead[];

    const recentCampaigns = recentCampaignsRaw as Campaign[];

    return {
      totalLeads: totalLeadsCount,
      totalCampaigns: totalCampaignsCount,
      pendentes: queueResults && queueResults.length > 0 ? queueResults[0].count : 0,
      leadsHoje: leadsTodayResults && leadsTodayResults.length > 0 ? leadsTodayResults[0].count : 0,
      conversasPendentes: chatsPendingResults && chatsPendingResults.length > 0 ? chatsPendingResults[0].count : 0,
      leadsByStatus,
      recentLeads,
      recentCampaigns
    };
  },

  getCRMReports: async (period?: string, customStart?: string, customEnd?: string): Promise<any> => {
    const now = new Date();
    let limitDateStr = '';
    let endDateStr = '';

    if (period === 'today') {
      const d = new Date();
      d.setHours(0,0,0,0);
      limitDateStr = d.toISOString();
    } else if (period === '7d') {
      const d = new Date();
      d.setDate(now.getDate() - 7);
      limitDateStr = d.toISOString();
    } else if (period === '30d') {
      const d = new Date();
      d.setDate(now.getDate() - 30);
      limitDateStr = d.toISOString();
    } else if (period === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      limitDateStr = d.toISOString();
    } else if (period === 'custom') {
      if (customStart) limitDateStr = new Date(customStart + 'T00:00:00').toISOString();
      if (customEnd) endDateStr = new Date(customEnd + 'T23:59:59').toISOString();
    }

    let whereClause = ' WHERE 1=1';
    let params: any[] = [];
    if (limitDateStr) {
      whereClause += ' AND dataCriacao >= ?';
      params.push(limitDateStr);
    }
    if (endDateStr) {
      whereClause += ' AND dataCriacao <= ?';
      params.push(endDateStr);
    }

    let convWhereClause = ' WHERE dataUltimaConversao IS NOT NULL';
    let convParams: any[] = [];
    if (limitDateStr) {
      convWhereClause += ' AND dataUltimaConversao >= ?';
      convParams.push(limitDateStr);
    }
    if (endDateStr) {
      convWhereClause += ' AND dataUltimaConversao <= ?';
      convParams.push(endDateStr);
    }

    const { results: statusRes } = await runQuery(`SELECT status, COUNT(id) as count FROM leads${whereClause} GROUP BY status`, params);
    const { results: sourceRes } = await runQuery(`SELECT origem, COUNT(id) as count FROM leads${whereClause} GROUP BY origem ORDER BY count DESC LIMIT 10`, params);
    const { results: dateRes } = await runQuery(`SELECT SUBSTR(dataCriacao, 1, 10) as date, COUNT(id) as count FROM leads${whereClause} AND dataCriacao IS NOT NULL GROUP BY date ORDER BY date ASC LIMIT 50`, params);
    const { results: convDateRes } = await runQuery(`SELECT SUBSTR(dataUltimaConversao, 1, 10) as date, COUNT(id) as count FROM leads${convWhereClause} GROUP BY date ORDER BY date ASC LIMIT 50`, convParams);
    const { results: utmRes } = await runQuery(`SELECT utm_source, COUNT(id) as count FROM leads${whereClause} AND utm_source IS NOT NULL AND utm_source != '' GROUP BY utm_source ORDER BY count DESC LIMIT 10`, params);
    const { results: stateRes } = await runQuery(`SELECT estado, COUNT(id) as count FROM leads${whereClause} AND estado IS NOT NULL AND estado != '' GROUP BY estado ORDER BY count DESC LIMIT 10`, params);
    const { results: cityRes } = await runQuery(`SELECT cidade, COUNT(id) as count FROM leads${whereClause} AND cidade IS NOT NULL AND cidade != '' GROUP BY cidade ORDER BY count DESC LIMIT 10`, params);
    
    // Calcular faturamento real com base na coluna faturamento
    const { results: faturamentoRes } = await runQuery(`SELECT SUM(faturamento) as faturamentoTotal FROM leads${whereClause} AND faturamento > 0`, params);
    let estimatedRevenue = 0;
    if (faturamentoRes && faturamentoRes.length > 0 && faturamentoRes[0].faturamentoTotal) {
      estimatedRevenue = faturamentoRes[0].faturamentoTotal;
    }

    // Calcular Recompra (LTV)
    const { results: recompraRes } = await runQuery(`SELECT COUNT(id) as totalRepurchasers, SUM(faturamento) as ltvRevenue FROM leads${whereClause} AND totalConversoes > 1`, params);
    let totalRepurchasers = 0;
    let ltvRevenue = 0;
    if (recompraRes && recompraRes.length > 0) {
      totalRepurchasers = recompraRes[0].totalRepurchasers || 0;
      ltvRevenue = recompraRes[0].ltvRevenue || 0;
    }

    // Calcular Ciclo de Vendas Médio
    let avgCicloVendas = 0;
    try {
      const { results: cicloRes } = await runQuery(`SELECT AVG(cicloVendasDias) as avgCicloVendas FROM leads${whereClause} AND cicloVendasDias IS NOT NULL`, params);
      if (cicloRes && cicloRes.length > 0 && cicloRes[0].avgCicloVendas) {
        avgCicloVendas = parseFloat(cicloRes[0].avgCicloVendas) || 0;
      }
    } catch (e) {
      console.log('Erro ao calcular cicloVendasDias (talvez a coluna não exista ainda):', e);
    }

    return {
      statusData: statusRes || [],
      sourceData: sourceRes || [],
      creationTimeline: dateRes || [],
      conversionTimeline: convDateRes || [],
      utmSourceData: utmRes || [],
      stateData: stateRes || [],
      cityData: cityRes || [],
      estimatedRevenue,
      totalRepurchasers,
      ltvRevenue,
      avgCicloVendas
    };
  },

  // Internal Chats
  getInternalChats: async (userId: string): Promise<any[]> => {
    // Busca chats onde o participantsJson contém o userId
    const { results } = await runQuery(`SELECT * FROM internal_chats WHERE participantsJson LIKE ? ORDER BY lastTimestamp DESC`, [`%${userId}%`]);
    return (results || []).map(r => ({
      ...r,
      avatarUrl: r.avatarUrl || undefined
    }));
  },

  createInternalChat: async (chat: any): Promise<any> => {
    const sql = `
      INSERT INTO internal_chats (id, type, name, avatarUrl, participantsJson, lastMessage, lastTimestamp, dataCriacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      chat.id,
      chat.type,
      chat.name || null,
      chat.avatarUrl || null,
      JSON.stringify(chat.participants),
      chat.lastMessage || '',
      chat.lastTimestamp || new Date().toISOString(),
      chat.dataCriacao || new Date().toISOString()
    ];
    await executeRun(sql, params);
    return chat;
  },

  getInternalMessages: async (chatId: string): Promise<any[]> => {
    const { results } = await runQuery(`SELECT * FROM internal_messages WHERE chatId = ? ORDER BY timestamp ASC`, [chatId]);
    return (results || []).map(r => ({
      ...r,
      isEdited: r.isEdited === 1,
      isDeleted: r.isDeleted === 1
    }));
  },

  sendInternalMessage: async (message: any): Promise<any> => {
    const sql = `
      INSERT INTO internal_messages (id, chatId, senderId, senderName, content, timestamp, readByJson, attachmentUrl, attachmentName, isEdited, isDeleted, type, quotedMessageId, quotedMessageSender, quotedMessageContent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
    `;
    const params = [
      message.id,
      message.chatId,
      message.senderId,
      message.senderName,
      message.content,
      message.timestamp || new Date().toISOString(),
      JSON.stringify(message.readBy || []),
      message.attachmentUrl || null,
      message.attachmentName || null,
      message.type || 'text',
      message.quotedMessageId || null,
      message.quotedMessageSender || null,
      message.quotedMessageContent || null
    ];
    await executeRun(sql, params);

    // Atualiza o lastMessage do chat
    await executeRun(`UPDATE internal_chats SET lastMessage = ?, lastTimestamp = ? WHERE id = ?`, [
      message.content,
      message.timestamp || new Date().toISOString(),
      message.chatId
    ]);

    return message;
  },

  markMessagesAsRead: async (chatId: string, userId: string): Promise<void> => {
    // Para simplificar no SQLite, pegamos as mensagens do chat onde o readByJson NÃO contém o userId
    // e atualizamos adicionando o userId ao array.
    // Usaremos a função JSON do SQLite se possível, ou puxaremos e atualizaremos.
    const { results } = await runQuery(`SELECT id, readByJson FROM internal_messages WHERE chatId = ? AND readByJson NOT LIKE ?`, [chatId, `%${userId}%`]);
    if (!results || results.length === 0) return;

    for (const msg of results) {
      try {
        const readBy = JSON.parse(msg.readByJson || '[]');
        if (!readBy.includes(userId)) {
          readBy.push(userId);
          await executeRun(`UPDATE internal_messages SET readByJson = ? WHERE id = ?`, [JSON.stringify(readBy), msg.id]);
        }
      } catch (e) {}
    }
  },

  // Novas funções para edição de chats e mensagens
  updateInternalChat: async (chatId: string, updates: any): Promise<void> => {
    const setClauses: string[] = [];
    const params: any[] = [];
    
    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      params.push(updates.name);
    }
    if (updates.avatarUrl !== undefined) {
      setClauses.push('avatarUrl = ?');
      params.push(updates.avatarUrl);
    }
    if (updates.participants !== undefined) {
      setClauses.push('participantsJson = ?');
      params.push(JSON.stringify(updates.participants));
    }

    if (setClauses.length > 0) {
      params.push(chatId);
      const sql = `UPDATE internal_chats SET ${setClauses.join(', ')} WHERE id = ?`;
      await executeRun(sql, params);
    }
  },

  editInternalMessage: async (messageId: string, newContent: string): Promise<void> => {
    await executeRun(`UPDATE internal_messages SET content = ?, isEdited = 1 WHERE id = ?`, [newContent, messageId]);
  },

  deleteInternalMessage: async (messageId: string): Promise<void> => {
    await executeRun(`UPDATE internal_messages SET content = '🚫 Mensagem apagada', isDeleted = 1, attachmentUrl = NULL, attachmentName = NULL WHERE id = ?`, [messageId]);
  },

  deleteInternalChat: async (chatId: string): Promise<void> => {
    await executeRun(`DELETE FROM internal_chats WHERE id = ?`, [chatId]);
    await executeRun(`DELETE FROM internal_messages WHERE chatId = ?`, [chatId]);
  },

  // --- SYSTEM LOGS ---
  saveSystemLog: async (log: Omit<SystemLog, 'id' | 'dataCriacao' | 'isRead'>): Promise<void> => {
    const id = Math.random().toString(36).substr(2, 9);
    const dataCriacao = new Date().toISOString();
    await executeRun(
      `INSERT INTO system_logs (id, level, source, message, details, dataCriacao, isRead) VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [id, log.level, log.source, log.message, log.details || null, dataCriacao]
    );
  },

  getSystemLogs: async (): Promise<SystemLog[]> => {
    const { results } = await runQuery(`SELECT * FROM system_logs ORDER BY dataCriacao DESC LIMIT 100`);
    return (results || []) as SystemLog[];
  },

  markSystemLogAsRead: async (logId: string): Promise<void> => {
    await executeRun(`UPDATE system_logs SET isRead = 1 WHERE id = ?`, [logId]);
  },

  markAllSystemLogsAsRead: async (): Promise<void> => {
    await executeRun(`UPDATE system_logs SET isRead = 1 WHERE isRead = 0`);
  },

  getUnreadLogsCount: async (): Promise<number> => {
    const { results } = await runQuery(`SELECT COUNT(id) as count FROM system_logs WHERE isRead = 0`);
    return results && results.length > 0 ? results[0].count : 0;
  },

  // --- PEDIDOS ---
  ensureOrigemColumn: async (): Promise<void> => {
    try {
      await executeRun(`ALTER TABLE pedidos ADD COLUMN origem TEXT DEFAULT 'site'`);
    } catch (e) {
      // Ignora se a coluna já existir
    }
  },

  ensureNumeroLojaVirtualColumn: async (): Promise<void> => {
    try {
      await executeRun(`ALTER TABLE pedidos ADD COLUMN numeroLojaVirtual TEXT`);
    } catch (e) {
      // Ignora se a coluna já existir
    }
  },

  savePedido: async (pedido: Omit<Pedido, 'id' | 'dataCriacao' | 'isRead' | 'status'> & { status?: string; origem?: string; numeroLojaVirtual?: string }): Promise<void> => {
    await d1Api.ensureOrigemColumn();
    await d1Api.ensureNumeroLojaVirtualColumn();
    const id = Math.random().toString(36).substr(2, 9);
    const dataCriacao = new Date().toISOString();
    await executeRun(
      `INSERT INTO pedidos (id, leadId, pedidoReferencia, itens, valor, status, isRead, dataCriacao, origem, numeroLojaVirtual, observacao) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [id, pedido.leadId, pedido.pedidoReferencia || null, pedido.itens || null, pedido.valor || null, pedido.status || 'pendente', dataCriacao, pedido.origem || 'site', pedido.numeroLojaVirtual || null, pedido.observacao || null]
    );
  },

  getPedidos: async (): Promise<Pedido[]> => {
    await d1Api.ensureOrigemColumn();
    await d1Api.ensureNumeroLojaVirtualColumn();
    // Fazer JOIN com a tabela de leads para pegar o nome e o celular do lead
    const query = `
      SELECT p.*, l.nome as leadNome, l.celular as leadCelular, c.assignedTo as assignedTo
      FROM pedidos p
      LEFT JOIN leads l ON p.leadId = l.id
      LEFT JOIN chats c ON p.leadId = c.leadId
      ORDER BY p.dataCriacao DESC
      LIMIT 100
    `;
    const { results } = await runQuery(query);
    return (results || []) as Pedido[];
  },

  getPedidosByLeadId: async (leadId: string): Promise<Pedido[]> => {
    await d1Api.ensureOrigemColumn();
    await d1Api.ensureNumeroLojaVirtualColumn();
    const query = `
      SELECT p.*, l.nome as leadNome, l.celular as leadCelular, c.assignedTo as assignedTo
      FROM pedidos p
      LEFT JOIN leads l ON p.leadId = l.id
      LEFT JOIN chats c ON p.leadId = c.leadId
      WHERE p.leadId = ?
      ORDER BY p.dataCriacao DESC
    `;
    const { results } = await runQuery(query, [leadId]);
    return (results || []) as Pedido[];
  },

  markPedidoAsRead: async (pedidoId: string): Promise<void> => {
    await executeRun(`UPDATE pedidos SET isRead = 1 WHERE id = ?`, [pedidoId]);
  },

  markAllPedidosAsRead: async (origem?: string): Promise<void> => {
    if (origem) {
      if (origem === 'mercos') {
        await executeRun(`UPDATE pedidos SET isRead = 1 WHERE origem = 'mercos' AND isRead = 0`);
      } else {
        await executeRun(`UPDATE pedidos SET isRead = 1 WHERE (origem IS NULL OR origem != 'mercos') AND isRead = 0`);
      }
    } else {
      await executeRun(`UPDATE pedidos SET isRead = 1 WHERE isRead = 0`);
    }
  },

  updatePedidoStatus: async (pedidoId: string, status: string): Promise<void> => {
    await executeRun(`UPDATE pedidos SET status = ? WHERE id = ?`, [status, pedidoId]);
  },

  updatePedidoObservacao: async (pedidoId: string, observacao: string): Promise<void> => {
    await executeRun(`UPDATE pedidos SET observacao = ? WHERE id = ?`, [observacao, pedidoId]);
  },

  getUnreadPedidosCount: async (): Promise<number> => {
    const { results } = await runQuery(`SELECT COUNT(id) as count FROM pedidos WHERE isRead = 0`);
    return results && results.length > 0 ? results[0].count : 0;
  },

  saveOpportunity: async (opportunity: Omit<Opportunity, 'id' | 'dataCriacao' | 'isRead' | 'status'>): Promise<void> => {
    const id = Math.random().toString(36).substr(2, 9);
    const dataCriacao = new Date().toISOString();
    await executeRun(
      `INSERT INTO opportunities (id, leadId, assignedTo, status, isRead, dataCriacao) VALUES (?, ?, ?, 'pendente', 0, ?)`,
      [id, opportunity.leadId, opportunity.assignedTo, dataCriacao]
    );
    // Também atualiza a atribuição do chat
    await executeRun(`UPDATE chats SET assignedTo = ? WHERE leadId = ?`, [opportunity.assignedTo, opportunity.leadId]);
  },

  getOpportunities: async (assignedTo?: string): Promise<Opportunity[]> => {
    let query = `
      SELECT o.*, l.nome as leadNome, l.celular as leadCelular, l.email as leadEmail, l.origem as leadOrigem
      FROM opportunities o
      LEFT JOIN leads l ON o.leadId = l.id
    `;
    let params: any[] = [];
    if (assignedTo) {
      query += ` WHERE o.assignedTo = ? `;
      params.push(assignedTo);
    }
    query += ` ORDER BY o.dataCriacao DESC LIMIT 100 `;
    
    const { results } = await runQuery(query, params);
    return (results || []) as Opportunity[];
  },

  markOpportunityAsRead: async (oppId: string): Promise<void> => {
    await executeRun(`UPDATE opportunities SET isRead = 1 WHERE id = ?`, [oppId]);
  },

  updateOpportunityStatus: async (oppId: string, status: string): Promise<void> => {
    await executeRun(`UPDATE opportunities SET status = ? WHERE id = ?`, [status, oppId]);
  },

  updateOpportunityObservacao: async (oppId: string, observacao: string): Promise<void> => {
    await executeRun(`UPDATE opportunities SET observacao = ? WHERE id = ?`, [observacao, oppId]);
  },

  updateOpportunityAssignment: async (oppId: string, assignedTo: string): Promise<void> => {
    // Busca o leadId desta oportunidade primeiro
    const { results } = await runQuery(`SELECT leadId FROM opportunities WHERE id = ? LIMIT 1`, [oppId]);
    if (results && results.length > 0) {
      const leadId = results[0].leadId;
      // Atualiza a atribuição do chat correspondente
      await executeRun(`UPDATE chats SET assignedTo = ? WHERE leadId = ?`, [assignedTo, leadId]);
    }
    // Atualiza a oportunidade
    await executeRun(`UPDATE opportunities SET assignedTo = ? WHERE id = ?`, [assignedTo, oppId]);
  },

  getUnreadOpportunitiesCount: async (assignedTo?: string): Promise<number> => {
    let query = `SELECT COUNT(id) as count FROM opportunities WHERE isRead = 0`;
    let params: any[] = [];
    if (assignedTo) {
      query += ` AND assignedTo = ?`;
      params.push(assignedTo);
    }
    const { results } = await runQuery(query, params);
    return results && results.length > 0 ? results[0].count : 0;
  },

  deleteOpportunity: async (oppId: string): Promise<void> => {
    await executeRun(`DELETE FROM opportunities WHERE id = ?`, [oppId]);
  },

  // --- BOTS ---
  getBots: async (): Promise<any[]> => {
    const { results } = await runQuery(`SELECT * FROM bots ORDER BY dataAtualizacao DESC`);
    return results || [];
  },

  getBotById: async (id: string): Promise<any | null> => {
    const { results } = await runQuery(`SELECT * FROM bots WHERE id = ? LIMIT 1`, [id]);
    return results && results.length > 0 ? results[0] : null;
  },

  saveBot: async (bot: { id: string; name: string; nodesJson: string; edgesJson: string; ativo?: number }): Promise<void> => {
    const exists = await d1Api.getBotById(bot.id);
    const agora = new Date().toISOString();
    if (exists) {
      await executeRun(
        `UPDATE bots SET name = ?, nodesJson = ?, edgesJson = ?, ativo = ?, dataAtualizacao = ? WHERE id = ?`,
        [bot.name, bot.nodesJson, bot.edgesJson, bot.ativo !== undefined ? bot.ativo : 1, agora, bot.id]
      );
    } else {
      await executeRun(
        `INSERT INTO bots (id, name, nodesJson, edgesJson, ativo, dataCriacao, dataAtualizacao) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [bot.id, bot.name, bot.nodesJson, bot.edgesJson, bot.ativo !== undefined ? bot.ativo : 1, agora, agora]
      );
    }
  },

  deleteBot: async (id: string): Promise<void> => {
    await executeRun(`DELETE FROM bots WHERE id = ?`, [id]);
  },

  // --- PIPELINE AUTOMATIONS ---
  getPipelineAutomations: async (statusOrigem?: string): Promise<any[]> => {
    let query = `SELECT * FROM pipeline_automations`;
    const params: any[] = [];
    if (statusOrigem) {
      query += ` WHERE statusOrigem = ?`;
      params.push(statusOrigem);
    }
    query += ` ORDER BY dataCriacao DESC`;
    const { results } = await runQuery(query, params);
    return results || [];
  },

  getPipelineAutomationById: async (id: string): Promise<any | null> => {
    const { results } = await runQuery(`SELECT * FROM pipeline_automations WHERE id = ? LIMIT 1`, [id]);
    return results && results.length > 0 ? results[0] : null;
  },

  savePipelineAutomation: async (auto: {
    id: string;
    statusOrigem: string;
    nome: string;
    ativo?: number;
    condicoesJson: string;
    tipoGatilho: string;
    gatilhoConfigJson: string;
    restricaoHorarioJson: string;
    destinatarioTipo: string;
    whatsappConnectionId?: string;
    salesbotId?: string;
    deixarSemResposta?: number;
    aplicarExistentes?: number;
    alterarEtapaPara?: string;
    adicionarTags?: string;
    atribuirUsuarioId?: string;
  }): Promise<void> => {
    const exists = await d1Api.getPipelineAutomationById(auto.id);
    const agora = new Date().toISOString();
    if (exists) {
      await executeRun(
        `UPDATE pipeline_automations SET statusOrigem = ?, nome = ?, ativo = ?, condicoesJson = ?, tipoGatilho = ?, gatilhoConfigJson = ?, restricaoHorarioJson = ?, destinatarioTipo = ?, whatsappConnectionId = ?, salesbotId = ?, deixarSemResposta = ?, aplicarExistentes = ?, alterarEtapaPara = ?, adicionarTags = ?, atribuirUsuarioId = ? WHERE id = ?`,
        [auto.statusOrigem, auto.nome, auto.ativo !== undefined ? auto.ativo : 1, auto.condicoesJson, auto.tipoGatilho, auto.gatilhoConfigJson, auto.restricaoHorarioJson, auto.destinatarioTipo, auto.whatsappConnectionId || null, auto.salesbotId || null, auto.deixarSemResposta || 0, auto.aplicarExistentes || 0, auto.alterarEtapaPara || null, auto.adicionarTags || null, auto.atribuirUsuarioId || null, auto.id]
      );
    } else {
      await executeRun(
        `INSERT INTO pipeline_automations (id, statusOrigem, nome, ativo, condicoesJson, tipoGatilho, gatilhoConfigJson, restricaoHorarioJson, destinatarioTipo, whatsappConnectionId, salesbotId, deixarSemResposta, aplicarExistentes, alterarEtapaPara, adicionarTags, atribuirUsuarioId, dataCriacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [auto.id, auto.statusOrigem, auto.nome, auto.ativo !== undefined ? auto.ativo : 1, auto.condicoesJson, auto.tipoGatilho, auto.gatilhoConfigJson, auto.restricaoHorarioJson, auto.destinatarioTipo, auto.whatsappConnectionId || null, auto.salesbotId || null, auto.deixarSemResposta || 0, auto.aplicarExistentes || 0, auto.alterarEtapaPara || null, auto.adicionarTags || null, auto.atribuirUsuarioId || null, agora]
      );
    }
  },

  deletePipelineAutomation: async (id: string): Promise<void> => {
    await executeRun(`DELETE FROM pipeline_automations WHERE id = ?`, [id]);
  },

  getServiceStages: async (): Promise<any[]> => {
    const { results } = await runQuery(`SELECT valueJson FROM settings WHERE key = 'service_stages' LIMIT 1`);
    if (results && results.length > 0) {
      return JSON.parse(results[0].valueJson);
    }
    return [
      { id: 'novo', name: 'Novo / Aguardando' },
      { id: 'em_atendimento', name: 'Em Atendimento' },
      { id: 'pendente', name: 'Pendente' },
      { id: 'finalizado', name: 'Finalizado' }
    ];
  },

  saveServiceStages: async (stages: any[]): Promise<void> => {
    await executeRun(
      `INSERT INTO settings (key, valueJson) VALUES ('service_stages', ?) ON CONFLICT(key) DO UPDATE SET valueJson = excluded.valueJson`,
      [JSON.stringify(stages)]
    );
  },

  // Database Execution Helpers
  runQuery: async (sql: string, params: any[] = []): Promise<any> => {
    return runQuery(sql, params);
  },
  executeRun: async (sql: string, params: any[] = []): Promise<any> => {
    return executeRun(sql, params);
  }
};
