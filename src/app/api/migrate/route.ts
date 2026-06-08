import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = (globalThis as any).DB || process.env.DB;
    if (!db) return NextResponse.json({ error: 'DB binding not found' });
    
    // Attempt to run the alter table
    await db.prepare('ALTER TABLE queue ADD COLUMN whatsappConnectionId TEXT;').run();
    
    return NextResponse.json({ success: true, message: 'Migração do D1 executada com sucesso!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, success: false });
  }
}
