import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export const runtime = 'edge';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, avatarUrl, participants } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Chat ID required' }, { status: 400 });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (participants !== undefined) updates.participants = participants;

    await d1Api.updateInternalChat(id, updates);

    return NextResponse.json({ success: true, message: 'Chat updated' });
  } catch (error: any) {
    console.error(`Error in PUT /api/internal-chats/[id]:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Chat ID required' }, { status: 400 });
    }

    await d1Api.deleteInternalChat(id);

    return NextResponse.json({ success: true, message: 'Chat deleted' });
  } catch (error: any) {
    console.error(`Error in DELETE /api/internal-chats/[id]:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
