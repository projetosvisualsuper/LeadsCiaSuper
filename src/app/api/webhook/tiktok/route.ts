export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('challenge');
  
  // TikTok verification
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('TikTok Webhook Active', { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('TikTok Webhook Event:', JSON.stringify(body, null, 2));

    // Lógica para processar mensagem direta (DM) ou comentário do TikTok
    // Nota: O formato exato depende da versão da API Business do TikTok
    if (body.event === 'message' || (body.type === 'message' && body.data) || body.event === 'comment') {
      const messageData = body.data || body;
      const senderId = messageData.sender_id || messageData.from_user_id || messageData.user_id;
      const messageText = messageData.content?.text || messageData.text || '';
      const commentId = messageData.comment_id || messageData.id;
      const videoId = messageData.video_id;
      
      if (!senderId) return new NextResponse('Missing Sender', { status: 400 });

      // Se for comentário, usamos o ID do comentário no chatId para permitir respostas.
      // Se for DM, usamos o senderId.
      const isComment = !!commentId;
      const chatId = isComment ? `tiktok_${commentId}` : `tiktok_${senderId}`;
      const msgId = isComment ? `tiktok_msg_${commentId}` : `tiktok_msg_${Math.random().toString(36).substring(2, 10)}`;

      const timestamp = new Date().toISOString();

      // Checar se a mensagem já existe
      const { results: msgCheck } = await d1Api.runQuery(`SELECT id FROM messages WHERE id = ? LIMIT 1`, [msgId]);
      if (msgCheck && msgCheck.length > 0) {
        return new NextResponse('OK', { status: 200 });
      }

      const authorName = `TikTok User ${senderId.substring(0, 5)}`;

      // 1. Garantir existência do Lead
      const { results: leadCheck } = await d1Api.runQuery(`SELECT id FROM leads WHERE id = ? LIMIT 1`, [senderId]);
      if (!leadCheck || leadCheck.length === 0) {
        await d1Api.saveLead({
          id: senderId,
          nome: authorName,
          origem: 'TikTok Business',
          status: 'novo',
          dataCriacao: timestamp,
          dataUltimaAtividade: timestamp,
          tags: ['tiktok', 'omnichannel']
        });
      }

      // 2. Salvar Mensagem (também cria/atualiza a sessão de chat automaticamente via d1Api)
      await d1Api.sendMessage({
        id: msgId,
        chatId: chatId,
        senderId: senderId,
        senderName: authorName,
        content: messageText,
        timestamp: timestamp,
        type: 'text',
        status: 'delivered',
        isIncoming: true,
        channel: 'tiktok',
        leadId: senderId,
        leadName: authorName
      });
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Erro no Webhook TikTok:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
