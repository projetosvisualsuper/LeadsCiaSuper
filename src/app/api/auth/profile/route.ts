import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { d1Api } from '@/services/d1';

export const runtime = 'edge';

export async function PATCH(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('session_token='))
      ?.substring('session_token='.length);

    if (!token) {
      return NextResponse.json({ success: false, message: 'Sem token de sessão.' }, { status: 401 });
    }

    // Verificar e decodificar token
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.uid) {
      return NextResponse.json({ success: false, message: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    const data = await request.json();
    const { avatarUrl } = data;

    if (avatarUrl === undefined) {
      return NextResponse.json({ success: false, message: 'Nenhum dado fornecido para atualização.' }, { status: 400 });
    }

    // Atualizar no banco
    await d1Api.updateUserProfile(decoded.uid, { avatarUrl });

    // Buscar perfil atualizado
    const profile = await d1Api.getUserProfile(decoded.uid);

    return NextResponse.json({
      success: true,
      user: profile
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
