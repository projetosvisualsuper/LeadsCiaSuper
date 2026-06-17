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

    // Pega as conversas onde o usuário participa
    const chats = await d1Api.getInternalChats(userId);
    const chatIds = chats.map((c: any) => c.id);

    if (chatIds.length === 0) {
      return NextResponse.json({ unreadCount: 0 });
    }

    // Pega as mensagens não lidas
    const sql = `
      SELECT COUNT(*) as unreadCount 
      FROM internal_messages 
      WHERE senderId != ? 
      AND readByJson NOT LIKE ? 
      AND chatId IN (${chatIds.map(() => '?').join(',')})
    `;
    const params = [userId, `%${userId}%`, ...chatIds];
    const { results } = await (d1Api as any).runQuery(sql, params); // Usando a mesma função do d1Api

    const unreadCount = results?.[0]?.unreadCount || 0;

    return NextResponse.json({ unreadCount });
  } catch (error: any) {
    console.error('Error in GET /api/internal-chats/unread:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
