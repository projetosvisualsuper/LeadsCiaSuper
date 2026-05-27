import { NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';
import { hashPassword, generateToken } from '@/lib/auth';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ message: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    // 1. Buscar o usuário pelo e-mail
    const { results } = await d1Api.runQuery(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email]);
    if (!results || results.length === 0) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    const user = results[0];
    if (!user.passwordHash || !user.salt) {
      return NextResponse.json({ message: 'Este usuário não possui login por senha configurado.' }, { status: 400 });
    }

    // 2. Verificar a senha
    const computedHash = await hashPassword(password, user.salt);
    if (computedHash !== user.passwordHash) {
      return NextResponse.json({ message: 'Senha incorreta.' }, { status: 401 });
    }

    if (user.status !== 'approved') {
      return NextResponse.json({ message: 'Sua conta ainda não foi aprovada pelo administrador ou foi desativada.' }, { status: 403 });
    }

    // 3. Gerar o token JWT de sessão
    const tokenPayload = {
      uid: user.uid,
      email: user.email,
      name: user.name,
      role: user.role
    };
    const token = await generateToken(tokenPayload);

    // 4. Responder salvando o cookie
    const response = NextResponse.json({
      success: true,
      user: tokenPayload
    });

    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/'
    });

    return response;
  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ message: 'Erro interno no servidor: ' + error.message }, { status: 500 });
  }
}
