import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = (globalThis as any).DB || process.env.DB;
    if (!db) return NextResponse.json({ error: 'DB binding not found' });
    
    // Criação das tabelas de chat interno
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS internal_chats (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT,
        participantsJson TEXT NOT NULL,
        lastMessage TEXT,
        lastTimestamp TEXT,
        dataCriacao TEXT NOT NULL
      );
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS internal_messages (
        id TEXT PRIMARY KEY,
        chatId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        senderName TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        readByJson TEXT DEFAULT '[]'
      );
    `).run();

    // Adicionar colunas da Mercos (se não existirem, o try-catch evita erro)
    try {
      await db.prepare(`ALTER TABLE leads ADD COLUMN documento TEXT`).run();
    } catch (e) { console.log('Coluna documento já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE leads ADD COLUMN faturamento REAL DEFAULT 0`).run();
    } catch (e) { console.log('Coluna faturamento já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE leads ADD COLUMN cicloVendasDias REAL`).run();
    } catch (e) { console.log('Coluna cicloVendasDias já existe ou erro:', e); }
    
    // Adicionar colunas para funcionalidades avançadas do chat interno
    try {
      await db.prepare(`ALTER TABLE internal_chats ADD COLUMN avatarUrl TEXT`).run();
    } catch (e) { console.log('Coluna avatarUrl já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE internal_messages ADD COLUMN isEdited INTEGER DEFAULT 0`).run();
    } catch (e) { console.log('Coluna isEdited já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE internal_messages ADD COLUMN isDeleted INTEGER DEFAULT 0`).run();
    } catch (e) { console.log('Coluna isDeleted já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE internal_messages ADD COLUMN attachmentUrl TEXT`).run();
    } catch (e) { console.log('Coluna attachmentUrl já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE internal_messages ADD COLUMN attachmentName TEXT`).run();
    } catch (e) { console.log('Coluna attachmentName já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE internal_messages ADD COLUMN type TEXT DEFAULT 'text'`).run();
    } catch (e) { console.log('Coluna type já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE internal_messages ADD COLUMN quotedMessageId TEXT`).run();
    } catch (e) { console.log('Coluna quotedMessageId já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE internal_messages ADD COLUMN quotedMessageSender TEXT`).run();
    } catch (e) { console.log('Coluna quotedMessageSender já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE internal_messages ADD COLUMN quotedMessageContent TEXT`).run();
    } catch (e) { console.log('Coluna quotedMessageContent já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE users ADD COLUMN avatarUrl TEXT`).run();
    } catch (e) { console.log('Coluna avatarUrl em users já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE chats ADD COLUMN isInternal INTEGER DEFAULT 0`).run();
    } catch (e) { console.log('Coluna isInternal em chats já existe ou erro:', e); }

    // NORMALIZAÇÃO E MESCLAGEM DE LEADS E CHATS DUPLICADOS (FIX 9º DÍGITO E COLONS)
    try {
      console.log('Iniciando normalização de leads e chats...');
      const allLeadsQuery = await db.prepare(`SELECT * FROM leads`).all();
      const allLeads = allLeadsQuery.results || [];
      
      const normalizeBRNumber = (phone: string) => {
        let normalized = phone.replace(/\D/g, '');
        if (normalized.startsWith('55') && normalized.length === 12) {
          const ddd = normalized.substring(2, 4);
          const num = normalized.substring(4);
          return { with9: `55${ddd}9${num}`, without9: normalized };
        } else if (normalized.startsWith('55') && normalized.length === 13) {
          const ddd = normalized.substring(2, 4);
          const num = normalized.substring(5);
          return { with9: normalized, without9: `55${ddd}${num}` };
        }
        return { with9: normalized, without9: normalized };
      };

      const leadGroups: Record<string, any[]> = {};
      for (const lead of allLeads) {
        const phone = lead.telefone || lead.celular || '';
        if (phone) {
          const cleanPhone = phone.split(':')[0].replace(/\D/g, '');
          if (cleanPhone) {
            const { with9 } = normalizeBRNumber(cleanPhone);
            if (!leadGroups[with9]) leadGroups[with9] = [];
            leadGroups[with9].push(lead);
          }
        }
      }

      const leadStatements: any[] = [];
      for (const [normPhone, group] of Object.entries(leadGroups)) {
        if (group.length > 1) {
          group.sort((a, b) => {
            const nameA = a.nome || '';
            const nameB = b.nome || '';
            if (nameA.startsWith('Contato') && !nameB.startsWith('Contato')) return 1;
            if (!nameA.startsWith('Contato') && nameB.startsWith('Contato')) return -1;
            return (b.totalConversoes || 0) - (a.totalConversoes || 0);
          });

          const primaryLead = group[0];
          const duplicateLeads = group.slice(1);

          for (const dup of duplicateLeads) {
            console.log(`Mesclando lead duplicado ${dup.nome} (${dup.id}) no principal ${primaryLead.nome} (${primaryLead.id})`);
            leadStatements.push(db.prepare(`UPDATE queue SET leadId = ? WHERE leadId = ?`).bind(primaryLead.id, dup.id));
            leadStatements.push(db.prepare(`UPDATE chats SET leadId = ? WHERE leadId = ?`).bind(primaryLead.id, dup.id));
            leadStatements.push(db.prepare(`DELETE FROM leads WHERE id = ?`).bind(dup.id));
          }

          if (primaryLead.telefone !== normPhone || primaryLead.celular !== normPhone) {
            leadStatements.push(db.prepare(`UPDATE leads SET telefone = ?, celular = ? WHERE id = ?`).bind(normPhone, normPhone, primaryLead.id));
          }
        } else {
          const lead = group[0];
          if (lead.telefone !== normPhone || lead.celular !== normPhone) {
            leadStatements.push(db.prepare(`UPDATE leads SET telefone = ?, celular = ? WHERE id = ?`).bind(normPhone, normPhone, lead.id));
          }
        }
      }

      if (leadStatements.length > 0) {
        console.log(`Executando ${leadStatements.length} atualizações de leads em lotes...`);
        for (let i = 0; i < leadStatements.length; i += 100) {
          await db.batch(leadStatements.slice(i, i + 100));
        }
      }

      const allChatsQuery = await db.prepare(`SELECT * FROM chats`).all();
      const allChats = allChatsQuery.results || [];
      
      const chatGroups: Record<string, any[]> = {};
      for (const chat of allChats) {
        if (chat.id.startsWith('whatsapp_')) {
          const rawPhone = chat.id.substring('whatsapp_'.length).split(':')[0].replace(/\D/g, '');
          const { with9 } = normalizeBRNumber(rawPhone);
          const targetId = `whatsapp_${with9}`;
          if (!chatGroups[targetId]) chatGroups[targetId] = [];
          chatGroups[targetId].push(chat);
        }
      }

      const chatStatements: any[] = [];
      for (const [targetChatId, group] of Object.entries(chatGroups)) {
        if (group.length > 1) {
          group.sort((a, b) => {
            if (a.isInternal !== b.isInternal) {
              return (b.isInternal || 0) - (a.isInternal || 0);
            }
            return new Date(b.lastTimestamp || 0).getTime() - new Date(a.lastTimestamp || 0).getTime();
          });

          const primaryChat = group[0];
          const duplicateChats = group.slice(1);

          if (primaryChat.id !== targetChatId) {
            chatStatements.push(db.prepare(`UPDATE chats SET id = ? WHERE id = ?`).bind(targetChatId, primaryChat.id));
            chatStatements.push(db.prepare(`UPDATE messages SET chatId = ? WHERE chatId = ?`).bind(targetChatId, primaryChat.id));
            primaryChat.id = targetChatId;
          }

          for (const dup of duplicateChats) {
            console.log(`Mesclando chat duplicado ${dup.id} no principal ${targetChatId}`);
            chatStatements.push(db.prepare(`UPDATE messages SET chatId = ? WHERE chatId = ?`).bind(targetChatId, dup.id));
            chatStatements.push(db.prepare(`DELETE FROM chats WHERE id = ?`).bind(dup.id));
          }
        } else {
          const chat = group[0];
          if (chat.id !== targetChatId) {
            chatStatements.push(db.prepare(`UPDATE chats SET id = ? WHERE id = ?`).bind(targetChatId, chat.id));
            chatStatements.push(db.prepare(`UPDATE messages SET chatId = ? WHERE chatId = ?`).bind(targetChatId, chat.id));
          }
        }
      }

      if (chatStatements.length > 0) {
        console.log(`Executando ${chatStatements.length} atualizações de chats em lotes...`);
        for (let i = 0; i < chatStatements.length; i += 100) {
          await db.batch(chatStatements.slice(i, i + 100));
        }
      }

      // Sincronizar os nomes e avatares atuais de todos os leads nas sessões de chat
      try {
        console.log('Sincronizando nomes de leads nas sessões de chat...');
        await db.prepare(`
          UPDATE chats 
          SET 
            leadName = (SELECT nome FROM leads WHERE leads.id = chats.leadId),
            leadAvatar = (SELECT avatar FROM leads WHERE leads.id = chats.leadId)
          WHERE EXISTS (SELECT 1 FROM leads WHERE leads.id = chats.leadId)
        `).run();
      } catch (err) {
        console.error('Erro ao sincronizar nomes de leads nas sessões de chat:', err);
      }

      // Tentar restaurar avatares ausentes chamando a API do Evolution para todos os chats ativos
      try {
        console.log('Iniciando restauração de avatares ausentes via Evolution API...');
        const settingsQuery = await db.prepare(`SELECT valueJson FROM settings WHERE key = 'global'`).first();
        const globalSettings = settingsQuery ? JSON.parse(settingsQuery.valueJson) : {};
        const settings = globalSettings?.omnichannel || {};
        const apiUrl = settings?.evolutionApiUrl || '';
        const apiKey = settings?.evolutionApiKey || '';
        
        if (apiUrl && apiKey) {
          const connectionsQuery = await db.prepare(`SELECT id, name, evolutionInstanceName FROM whatsapp_connections`).all();
          const connections = connectionsQuery.results || [];
          
          const chatsQuery = await db.prepare(`SELECT id, leadId, connectionId, connectionName FROM chats WHERE id LIKE 'whatsapp_%' AND (leadAvatar IS NULL OR leadAvatar = '')`).all();
          const chatsToRestore = chatsQuery.results || [];
          
          console.log(`Restaurando fotos de perfil para ${chatsToRestore.length} chats...`);
          
          for (const chat of chatsToRestore) {
            const rawPhone = chat.id.substring('whatsapp_'.length);
            const conn = connections.find(c => c.id === chat.connectionId || c.name === chat.connectionName);
            const instanceName = conn ? conn.evolutionInstanceName : (chat.connectionName || '');
            
            if (instanceName) {
              try {
                const picRes = await fetch(`${apiUrl.replace(/\/$/, '')}/chat/fetchProfilePictureUrl/${instanceName}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                  body: JSON.stringify({ number: `${rawPhone}@s.whatsapp.net` })
                });
                if (picRes.ok) {
                  const picData = await picRes.json();
                  if (picData && picData.profilePictureUrl && !picData.profilePictureUrl.includes('placeholder')) {
                    const avatarUrl = picData.profilePictureUrl;
                    await db.prepare(`UPDATE chats SET leadAvatar = ? WHERE id = ?`).bind(avatarUrl, chat.id).run();
                    await db.prepare(`UPDATE leads SET avatar = ? WHERE id = ?`).bind(avatarUrl, chat.leadId).run();
                    console.log(`Foto de perfil restaurada para ${chat.id}: ${avatarUrl}`);
                  }
                }
              } catch (e) {
                console.log(`Erro ao restaurar avatar para o chat ${chat.id}:`, e);
              }
            }
          }
        }
      } catch (err) {
        console.error('Erro ao restaurar avatares ausentes:', err);
      }

    } catch (e: any) {
      console.error('Erro na normalização/mesclagem de leads/chats:', e);
    }

    // Limpeza de chats de teste anteriores a hoje (30 de Junho de 2026)
    try {
      await db.prepare(`UPDATE messages SET isIncoming = 0 WHERE timestamp < '2026-06-30T00:00:00'`).run();
    } catch (e) { console.log('Erro ao atualizar messages antigas:', e); }

    try {
      await db.prepare(`UPDATE chats SET unreadCount = 0 WHERE lastTimestamp < '2026-06-30T00:00:00'`).run();
    } catch (e) { console.log('Erro ao resetar unreadCount antigo:', e); }

    return NextResponse.json({ success: true, message: 'Tabelas e colunas adicionadas e histórico antigo limpo com sucesso no D1!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, success: false });
  }
}
