import { NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';
import { verifyToken, hashPassword, generateSalt } from '@/lib/auth';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ message: 'Token e nova senha são obrigatórios.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: 'A nova senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
    }

    // 1. Verificar e decodificar o token JWT
    const decoded = await verifyToken(token);
    if (!decoded || decoded.purpose !== 'reset-password' || !decoded.uid) {
      return NextResponse.json({ message: 'Token inválido ou expirado.' }, { status: 400 });
    }

    // 2. Verificar expiração explicitamente
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (decoded.exp && nowInSeconds > decoded.exp) {
      return NextResponse.json({ message: 'O link de recuperação expirou. Por favor, solicite um novo link.' }, { status: 400 });
    }

    // 3. Obter perfil do usuário para confirmar se existe
    const profile = await d1Api.getUserProfile(decoded.uid);
    if (!profile) {
      return NextResponse.json({ message: 'Usuário correspondente ao token não foi encontrado.' }, { status: 404 });
    }

    // 4. Gerar novo salt e hash para a nova senha
    const newSalt = generateSalt();
    const newHash = await hashPassword(password, newSalt);

    // 5. Atualizar a senha no banco de dados D1
    await d1Api.updateUserProfile(decoded.uid, {
      passwordHash: newHash,
      salt: newSalt
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Sua senha foi redefinida com sucesso! Você já pode entrar com a nova senha.' 
    });

  } catch (error: any) {
    console.error('Reset Password Error:', error);
    return NextResponse.json({ message: 'Erro ao redefinir a senha: ' + error.message }, { status: 500 });
  }
}
