import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { d1Api } from '@/services/d1';

export const runtime = 'edge';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false, message: 'Sem token de sessão.' }, { status: 401 });
    }

    // Verificar e decodificar token
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.uid) {
      return NextResponse.json({ authenticated: false, message: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    // Carregar informações atualizadas do usuário
    const profile = await d1Api.getUserProfile(decoded.uid);
    if (!profile) {
      return NextResponse.json({ authenticated: false, message: 'Usuário não encontrado.' }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: profile
    });
  } catch (error: any) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false, message: 'Erro interno.' }, { status: 500 });
  }
}
