import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export const runtime = 'edge';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string, messageId: string }> }) {
  try {
    const { messageId } = await params;
    const body = await req.json();
    const { content } = body;
    
    if (!messageId || !content) {
      return NextResponse.json({ error: 'Message ID and content are required' }, { status: 400 });
    }

    await d1Api.editInternalMessage(messageId, content);

    return NextResponse.json({ success: true, message: 'Message updated' });
  } catch (error: any) {
    console.error(`Error in PUT /api/internal-chats/.../messages/[messageId]:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string, messageId: string }> }) {
  try {
    const { messageId } = await params;
    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    await d1Api.deleteInternalMessage(messageId);

    return NextResponse.json({ success: true, message: 'Message deleted' });
  } catch (error: any) {
    console.error(`Error in DELETE /api/internal-chats/.../messages/[messageId]:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
