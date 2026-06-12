import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export const runtime = 'edge';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: chatId } = await params;
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID required' }, { status: 400 });
    }

    const messages = await d1Api.getInternalMessages(chatId);
    return NextResponse.json(messages);
  } catch (error: any) {
    console.error(`Error in GET /api/internal-chats/messages:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: chatId } = await params;
    const body = await req.json();

    if (!chatId || !body.id || !body.senderId || !body.content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newMessage = await d1Api.sendInternalMessage({
      ...body,
      chatId
    });

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error: any) {
    console.error(`Error in POST /api/internal-chats/messages:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
