import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logout realizado com sucesso.' });
  
  // Limpa o cookie de sessão expirando-o imediatamente
  response.cookies.set('session_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    expires: new Date(0),
    path: '/'
  });

  return response;
}
