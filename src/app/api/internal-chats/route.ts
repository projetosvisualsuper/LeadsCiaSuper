import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const chats = await d1Api.getInternalChats(userId);
    const chatIds = chats.map((c: any) => c.id);

    let unreadMap: Record<string, number> = {};
    if (chatIds.length > 0) {
      const sql = `
        SELECT chatId, COUNT(*) as count 
        FROM internal_messages 
        WHERE senderId != ? 
        AND readByJson NOT LIKE ? 
        AND chatId IN (${chatIds.map(() => '?').join(',')})
        GROUP BY chatId
      `;
      const params = [userId, `%${userId}%`, ...chatIds];
      const { results } = await (d1Api as any).runQuery(sql, params);
      
      results?.forEach((row: any) => {
        unreadMap[row.chatId] = row.count;
      });
    }

    const chatsWithUnread = chats.map((c: any) => ({
      ...c,
      unreadCount: unreadMap[c.id] || 0
    }));
    
    // Also fetch users to display their names/info
    const users = await d1Api.getAllUserProfiles();
    
    // Para simplificar no frontend, enviamos os usuários junto
    return NextResponse.json({ chats: chatsWithUnread, users });
  } catch (error: any) {
    console.error('Error in GET /api/internal-chats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id || !body.type || !body.participants) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Checar se já existe chat 1-a-1 com esses participantes
    if (body.type === 'direct' && body.participants.length === 2) {
      const chats = await d1Api.getInternalChats(body.participants[0]);
      const existing = chats.find(c => {
        if (c.type === 'direct') {
          try {
            const parts = JSON.parse(c.participantsJson);
            return parts.includes(body.participants[0]) && parts.includes(body.participants[1]);
          } catch(e) {}
        }
        return false;
      });
      
      if (existing) {
        return NextResponse.json({ success: true, chat: existing });
      }
    }

    const newChat = await d1Api.createInternalChat(body);
    return NextResponse.json({ success: true, chat: newChat });
  } catch (error: any) {
    console.error('Error in POST /api/internal-chats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
