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

    try {
      await db.prepare(`ALTER TABLE leads ADD COLUMN cicloVendasDias REAL`).run();
    } catch (e) { console.log('Coluna cicloVendasDias já existe ou erro:', e); }
    
    // Adicionar colunas para funcionalidades avançadas do chat interno
    try {
      await db.prepare(`ALTER TABLE internal_chats ADD COLUMN avatarUrl TEXT`).run();
    } catch (e) { console.log('Coluna avatarUrl já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE internal_messages ADD COLUMN isEdited INTEGER DEFAULT 0`).run();
    } catch (e) { console.log('Coluna isEdited já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE internal_messages ADD COLUMN isDeleted INTEGER DEFAULT 0`).run();
    } catch (e) { console.log('Coluna isDeleted já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE internal_messages ADD COLUMN attachmentUrl TEXT`).run();
    } catch (e) { console.log('Coluna attachmentUrl já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE internal_messages ADD COLUMN attachmentName TEXT`).run();
    } catch (e) { console.log('Coluna attachmentName já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE internal_messages ADD COLUMN type TEXT DEFAULT 'text'`).run();
    } catch (e) { console.log('Coluna type já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE internal_messages ADD COLUMN quotedMessageId TEXT`).run();
    } catch (e) { console.log('Coluna quotedMessageId já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE internal_messages ADD COLUMN quotedMessageSender TEXT`).run();
    } catch (e) { console.log('Coluna quotedMessageSender já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE internal_messages ADD COLUMN quotedMessageContent TEXT`).run();
    } catch (e) { console.log('Coluna quotedMessageContent já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE users ADD COLUMN avatarUrl TEXT`).run();
    } catch (e) { console.log('Coluna avatarUrl em users já existe ou erro:', e); }

    try {
      await db.prepare(`ALTER TABLE chats ADD COLUMN isInternal INTEGER DEFAULT 0`).run();
    } catch (e) { console.log('Coluna isInternal em chats já existe ou erro:', e); }

    // Limpeza de chats de teste anteriores a hoje (30 de Junho de 2026)
    try {
      await db.prepare(`UPDATE messages SET isIncoming = 0 WHERE timestamp < '2026-06-30T00:00:00'`).run();
    } catch (e) { console.log('Erro ao atualizar messages antigas:', e); }

    try {
      await db.prepare(`UPDATE chats SET unreadCount = 0 WHERE lastTimestamp < '2026-06-30T00:00:00'`).run();
    } catch (e) { console.log('Erro ao resetar unreadCount antigo:', e); }

    return NextResponse.json({ success: true, message: 'Tabelas e colunas adicionadas e histórico antigo limpo com sucesso no D1!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, success: false });
  }
}
