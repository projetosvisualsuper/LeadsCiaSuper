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

    // Buscar a mensagem para verificar se possui anexo associado no R2
    const msgList = await d1Api.runQuery(`SELECT attachmentUrl FROM internal_messages WHERE id = ?`, [messageId]);
    if (msgList && msgList[0]?.attachmentUrl) {
      const attachmentUrl = msgList[0].attachmentUrl;
      const prefix = '/api/media/';
      if (attachmentUrl.startsWith(prefix)) {
        const key = decodeURIComponent(attachmentUrl.substring(prefix.length));
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

    await d1Api.deleteInternalMessage(messageId);

    return NextResponse.json({ success: true, message: 'Message deleted' });
  } catch (error: any) {
    console.error(`Error in DELETE /api/internal-chats/.../messages/[messageId]:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
