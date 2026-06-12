import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export const runtime = 'edge';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: chatId } = await params;
    const body = await req.json();

    if (!chatId || !body.userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await d1Api.markMessagesAsRead(chatId, body.userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Error in POST /api/internal-chats/${(await params).id}/read:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
