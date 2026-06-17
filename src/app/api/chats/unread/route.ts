import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const sql = `
      SELECT COUNT(id) as unreadCount 
      FROM chats 
      WHERE unreadCount > 0
    `;
    const { results } = await (d1Api as any).runQuery(sql);

    const unreadCount = results?.[0]?.unreadCount || 0;

    return NextResponse.json({ unreadCount });
  } catch (error: any) {
    console.error('Error in GET /api/chats/unread:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
