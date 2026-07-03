import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');
    const leadId = searchParams.get('leadId');
    const type = searchParams.get('type');

    if (type === 'connections') {
      const connections = await d1Api.getWhatsappConnections();
      return NextResponse.json(connections);
    }

    if (leadId) {
      // Buscar lead pelo campo 'id' ou telefone
      let query = `SELECT * FROM leads WHERE id = ? LIMIT 1`;
      let params: any[] = [leadId];
      
      const cleanPhone = leadId.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        let strippedPhone = cleanPhone;
        if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
          strippedPhone = cleanPhone.substring(2);
        }
        query = `SELECT * FROM leads WHERE id = ? OR celular LIKE ? OR telefone LIKE ? LIMIT 1`;
        params = [leadId, `%${strippedPhone}%`, `%${strippedPhone}%`];
      }

      const { results } = await d1Api.runQuery(query, params);
      if (results && results.length > 0) {
        const lead = results[0];
        return NextResponse.json({
          ...lead,
          consentimentoLGPD: lead.consentimentoLGPD === 1,
          isMetaLead: lead.isMetaLead === 1,
          tags: lead.tags ? JSON.parse(lead.tags) : []
        });
      }
      return NextResponse.json(null);
    }

    if (chatId) {
      const messages = await d1Api.getMessages(chatId);
      // Automatically mark chat as read when messages are fetched
      await d1Api.markChatAsRead(chatId);
      return NextResponse.json(messages);
    }

    const chats = await d1Api.getChats();

    // Em segundo plano, tenta resolver avatares em falta para os chats de WhatsApp e renovar avatares expirados do Meta (Instagram/Facebook)
    (async () => {
      try {
        const settings = await d1Api.getSettings();
        const globalSettings = settings || {};
        const omnichannelSettings = globalSettings.omnichannel || {};

        // 1. WhatsApp - Carrega avatares ausentes
        const chatsWithoutAvatar = chats.filter(c => c.id.startsWith('whatsapp_') && (!c.leadAvatar || c.leadAvatar === ''));
        if (chatsWithoutAvatar.length > 0) {
          const apiUrl = omnichannelSettings.evolutionApiUrl || '';
          const apiKey = omnichannelSettings.evolutionApiKey || '';
          
          if (apiUrl && apiKey) {
            const connections = await d1Api.getWhatsappConnections();
            for (const chat of chatsWithoutAvatar.slice(0, 10)) {
              const rawPhone = chat.id.substring('whatsapp_'.length);
              const defaultConn = connections.find(c => c.isDefault) || connections[0];
              const conn = connections.find(c => c.id === chat.connectionId || c.name === chat.connectionName) || defaultConn;
              const instanceName = conn ? conn.evolutionInstanceName : '';
              
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
                      await d1Api.executeRun(`UPDATE chats SET leadAvatar = ? WHERE id = ?`, [avatarUrl, chat.id]);
                      await d1Api.executeRun(`UPDATE leads SET avatar = ? WHERE id = ?`, [avatarUrl, chat.leadId]);
                    }
                  }
                } catch (err) {
                  // Silencioso em background
                }
              }
            }
          }
        }

        // 2. Meta (Instagram & Facebook) - Renova avatares temporários que expiraram
        const metaChats = chats.filter(c => c.id.startsWith('instagram_') || c.id.startsWith('facebook_'));
        if (metaChats.length > 0) {
          if (!(globalThis as any).metaAvatarUpdateCache) {
            (globalThis as any).metaAvatarUpdateCache = new Map<string, number>();
          }
          const metaCache = (globalThis as any).metaAvatarUpdateCache;
          const nowMs = Date.now();
          const SIX_HOURS = 6 * 60 * 60 * 1000;

          for (const chat of metaChats.slice(0, 10)) {
            const lastUpdated = metaCache.get(chat.id) || 0;
            if (nowMs - lastUpdated < SIX_HOURS) {
              continue; // Evita requisições excessivas (limite de 6 horas por lead)
            }

            const channel = chat.id.startsWith('instagram_') ? 'instagram' : 'facebook';
            const leadId = chat.leadId;
            const token = channel === 'instagram' 
              ? (omnichannelSettings.instagramAccessToken || (globalSettings as any).instagramAccessToken)
              : (omnichannelSettings.messengerAccessToken || (globalSettings as any).messengerAccessToken);

            if (token && leadId) {
              try {
                const fields = channel === 'instagram' ? 'name,profile_pic' : 'name,first_name,last_name,profile_pic';
                const res = await fetch(`https://graph.facebook.com/v19.0/${leadId}?fields=${fields}&access_token=${token}`);
                if (res.ok) {
                  const data = await res.json();
                  const avatarUrl = data.profile_picture_url || data.profile_picture || data.profile_pic;
                  if (avatarUrl && avatarUrl !== chat.leadAvatar) {
                    await d1Api.executeRun(`UPDATE chats SET leadAvatar = ? WHERE id = ?`, [avatarUrl, chat.id]);
                    await d1Api.executeRun(`UPDATE leads SET avatar = ? WHERE id = ?`, [avatarUrl, chat.leadId]);
                  }
                  metaCache.set(chat.id, nowMs);
                } else {
                  const errBody = await res.json().catch(() => ({}));
                  await d1Api.executeRun(`INSERT INTO settings (key, valueJson) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET valueJson = excluded.valueJson`, [
                    'meta_debug_avatar',
                    JSON.stringify({
                      status: res.status,
                      error: errBody,
                      leadId,
                      chatId: chat.id,
                      timestamp: new Date().toISOString()
                    })
                  ]);
                }
              } catch (err: any) {
                await d1Api.executeRun(`INSERT INTO settings (key, valueJson) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET valueJson = excluded.valueJson`, [
                  'meta_debug_avatar',
                  JSON.stringify({
                    error: err?.message || String(err),
                    leadId,
                    chatId: chat.id,
                    timestamp: new Date().toISOString()
                  })
                ]);
              }
            }
          }
        }
      } catch (err) {
        // Silencioso em background
      }
    })();

    return NextResponse.json(chats);
  } catch (error: any) {
    console.error('Error in GET /api/chats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (body.action === 'saveSession') {
      const result = await d1Api.saveChatSession(body.session);
      return NextResponse.json({ success: true, session: result });
    }
    
    if (body.action === 'testConnection') {
      const { sendOmnichannelMessageAction } = await import('@/app/actions/chat');
      const result = await sendOmnichannelMessageAction(
        body.phone,
        body.channel,
        body.message,
        body.connectionId
      );
      return NextResponse.json(result);
    }

    if (body.action === 'sendOmnichannel') {
      const { sendOmnichannelMessageAction } = await import('@/app/actions/chat');
      const result = await sendOmnichannelMessageAction(
        body.recipient,
        body.channel,
        body.message,
        body.connectionId,
        undefined, // templateData
        body.mediaUrl,
        body.mediaMimeType,
        body.quotedMessageId
      );
      return NextResponse.json(result);
    }

    const result = await d1Api.sendMessage(body);
    return NextResponse.json({ success: true, message: result });
  } catch (error: any) {
    console.error('Error in POST /api/chats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'Chat ID required' }, { status: 400 });
    }

    if ('lastMessageIsIncoming' in updates && updates.lastMessageIsIncoming === 0) {
      // Atualizar a última mensagem no banco de dados para isIncoming = 0
      const lastMsgQuery = `SELECT id FROM messages WHERE chatId = ? ORDER BY timestamp DESC LIMIT 1`;
      const { results } = await d1Api.runQuery(lastMsgQuery, [id]);
      if (results && results.length > 0) {
        const lastMsgId = results[0].id;
        await d1Api.executeRun(`UPDATE messages SET isIncoming = 0 WHERE id = ?`, [lastMsgId]);
      }
      delete updates.lastMessageIsIncoming;
    }
    
    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return NextResponse.json({ success: true });
    }
    
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const params = [...Object.values(updates), id];
    const sql = `UPDATE chats SET ${setClause} WHERE id = ?`;
    await d1Api.executeRun(sql, params);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in PATCH /api/chats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');
    const messageId = searchParams.get('messageId');

    if (messageId) {
      // Buscar a mensagem para verificar se possui mídia associada no R2
      const msgList = await d1Api.runQuery(`SELECT mediaUrl FROM messages WHERE id = ?`, [messageId]);
      if (msgList && msgList[0]?.mediaUrl) {
        const mediaUrl = msgList[0].mediaUrl;
        const prefix = '/api/media/';
        if (mediaUrl.startsWith(prefix)) {
          const key = decodeURIComponent(mediaUrl.substring(prefix.length));
          const bucket = process.env.BUCKET || (globalThis as any).BUCKET;
          if (bucket) {
            try {
              await bucket.delete(key);
            } catch (err) {
              console.error('Erro ao deletar arquivo do R2:', err);
            }
          }
        }
      }
      await d1Api.executeRun(`DELETE FROM messages WHERE id = ?`, [messageId]);
      return NextResponse.json({ success: true });
    }

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID or Message ID required' }, { status: 400 });
    }
    
    await d1Api.executeRun(`DELETE FROM chats WHERE id = ?`, [chatId]);
    await d1Api.executeRun(`DELETE FROM messages WHERE chatId = ?`, [chatId]);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/chats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
