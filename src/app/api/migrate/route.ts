import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = (globalThis as any).DB || process.env.DB;
    if (!db) return NextResponse.json({ error: 'DB binding not found' });
    
    // Criação das tabelas de chat interno
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS internal_chats (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT,
        participantsJson TEXT NOT NULL,
        lastMessage TEXT,
        lastTimestamp TEXT,
        dataCriacao TEXT NOT NULL
      );
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS internal_messages (
        id TEXT PRIMARY KEY,
        chatId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        senderName TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        readByJson TEXT DEFAULT '[]'
      );
    `).run();

    // Adicionar colunas da Mercos (se não existirem, o try-catch evita erro)
    try {
      await db.prepare(`ALTER TABLE leads ADD COLUMN documento TEXT`).run();
    } catch (e) { console.log('Coluna documento já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE leads ADD COLUMN faturamento REAL DEFAULT 0`).run();
    } catch (e) { console.log('Coluna faturamento já existe ou erro:', e); }
    
    return NextResponse.json({ success: true, message: 'Tabelas internal_chats e internal_messages criadas, e colunas da Mercos adicionadas com sucesso no D1!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, success: false });
  }
}
