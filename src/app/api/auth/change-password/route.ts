import { NextResponse } from 'next/server';
import { verifyToken, hashPassword, generateSalt } from '@/lib/auth';
import { d1Api } from '@/services/d1';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { currentPassword, newPassword } = await request.json();
    if (!newPassword) {
      return NextResponse.json({ message: 'A nova senha é obrigatória.' }, { status: 400 });
    }

    // 1. Obter token de sessão dos cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const token = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('session_token='))
      ?.substring('session_token='.length);

    if (!token) {
      return NextResponse.json({ message: 'Não autorizado. Sem sessão ativa.' }, { status: 401 });
    }

    // 2. Verificar e decodificar o token
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.uid) {
      return NextResponse.json({ message: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    // 3. Obter o perfil do usuário do D1
    const profile = await d1Api.getUserProfile(decoded.uid);
    if (!profile) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    // 4. Se o usuário já tiver uma senha configurada, exigir e validar a senha atual
    if (profile.passwordHash && profile.salt) {
      if (!currentPassword) {
        return NextResponse.json({ message: 'A senha atual é obrigatória.' }, { status: 400 });
      }
      const computedHash = await hashPassword(currentPassword, profile.salt);
      if (computedHash !== profile.passwordHash) {
        return NextResponse.json({ message: 'A senha atual está incorreta.' }, { status: 400 });
      }
    }

    // 5. Gerar novo salt e hash para a nova senha
    const newSalt = generateSalt();
    const newHash = await hashPassword(newPassword, newSalt);

    // 6. Atualizar a senha no banco de dados D1
    await d1Api.updateUserProfile(decoded.uid, {
      passwordHash: newHash,
      salt: newSalt
    });

    return NextResponse.json({ success: true, message: 'Senha alterada com sucesso!' });
  } catch (error: any) {
    console.error('Change Password Error:', error);
    return NextResponse.json({ message: 'Erro ao alterar a senha: ' + error.message }, { status: 500 });
  }
}
