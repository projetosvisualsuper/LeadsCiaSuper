import { NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';
import { hashPassword, generateSalt } from '@/lib/auth';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();
    if (!email || !password || !name) {
      return NextResponse.json({ message: 'Todos os campos são obrigatórios.' }, { status: 400 });
    }

    // 1. Verificar se o e-mail já está cadastrado
    const { results } = await d1Api.runQuery(`SELECT uid FROM users WHERE email = ? LIMIT 1`, [email]);
    if (results && results.length > 0) {
      return NextResponse.json({ message: 'Este e-mail já está cadastrado.' }, { status: 400 });
    }

    // 2. Verificar se será o primeiro usuário do sistema (será aprovado como admin automaticamente)
    const { results: anyUsers } = await d1Api.runQuery(`SELECT uid FROM users LIMIT 1`);
    const isFirstUser = !anyUsers || anyUsers.length === 0;

    const uid = crypto.randomUUID();
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const status = isFirstUser ? 'approved' : 'pending';
    const role = isFirstUser ? 'admin' : 'editor';
    const dataSolicitacao = new Date().toISOString();

    // 3. Cadastrar usuário na tabela users
    const sql = `
      INSERT INTO users (uid, email, name, status, role, dataSolicitacao, passwordHash, salt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await d1Api.executeRun(sql, [uid, email, name, status, role, dataSolicitacao, passwordHash, salt]);

    return NextResponse.json({
      success: true,
      message: isFirstUser 
        ? 'Conta criada e aprovada automaticamente como Administrador!'
        : 'Solicitação de acesso enviada com sucesso! Aguarde aprovação.',
      status
    });
  } catch (error: any) {
    console.error('Registration Error:', error);
    return NextResponse.json({ message: 'Erro ao registrar usuário: ' + error.message }, { status: 500 });
  }
}
