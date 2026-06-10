import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export const runtime = 'edge';

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
      // Buscar lead pelo campo 'id'
      const { results } = await d1Api.runQuery(`SELECT * FROM leads WHERE id = ? LIMIT 1`, [leadId]);
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
        body.connectionId
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
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID required' }, { status: 400 });
    }
    
    await d1Api.executeRun(`DELETE FROM chats WHERE id = ?`, [chatId]);
    await d1Api.executeRun(`DELETE FROM messages WHERE chatId = ?`, [chatId]);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/chats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
