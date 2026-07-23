import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';
import { verifyToken } from '@/lib/auth';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const token = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('session_token='))
      ?.substring('session_token='.length);

    let sql = `
      SELECT 
        SUM(CASE WHEN channel = 'whatsapp' THEN 1 ELSE 0 END) as whatsappCount,
        SUM(CASE WHEN channel != 'whatsapp' THEN 1 ELSE 0 END) as socialCount,
        COUNT(id) as unreadCount
      FROM chats 
      WHERE unreadCount > 0
    `;
    const params: any[] = [];

    if (token) {
      try {
        const decoded = await verifyToken(token);
        if (decoded && decoded.uid) {
          const profile = await d1Api.getUserProfile(decoded.uid);
          if (profile && profile.role !== 'admin' && profile.role !== 'master') {
            sql += ` AND assignedTo = ? `;
            params.push(decoded.uid);
          }
        }
      } catch (err) {
        console.error('Error verifying token in /api/chats/unread route:', err);
      }
    }

    const { results } = await (d1Api as any).runQuery(sql, params);
    const resultRow = results?.[0] || {};
    const unreadCount = resultRow.unreadCount || 0;
    const whatsappCount = resultRow.whatsappCount || 0;
    const socialCount = resultRow.socialCount || 0;

    return NextResponse.json({ unreadCount, whatsappCount, socialCount });
  } catch (error: any) {
    console.error('Error in GET /api/chats/unread:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
