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
