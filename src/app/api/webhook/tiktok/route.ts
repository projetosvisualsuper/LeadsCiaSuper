export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ChatMessage, ChatSession, Lead } from '@/types/crm';

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

    // Lógica para processar mensagem direta (DM) do TikTok
    // Nota: O formato exato depende da versão da API Business do TikTok
    if (body.event === 'message' || (body.type === 'message' && body.data)) {
      const messageData = body.data || body;
      const senderId = messageData.sender_id || messageData.from_user_id;
      const messageText = messageData.content?.text || messageData.text || '';
      
      if (!senderId) return new NextResponse('Missing Sender', { status: 400 });

      const chatId = `tiktok_${senderId}`;
      const chatRef = doc(db, 'atendimentos_v3', chatId);
      const leadRef = doc(db, 'leads', senderId);

      const timestamp = new Date().toISOString();

      // 1. Garantir existência do Lead
      const leadSnap = await getDoc(leadRef);
      if (!leadSnap.exists()) {
        await setDoc(leadRef, {
          nome: `TikTok User ${senderId.substring(0, 5)}`,
          origem: 'TikTok Business',
          status: 'novo',
          dataCriacao: timestamp,
          tags: ['tiktok', 'omnichannel']
        });
      }

      // 2. Garantir ChatSession
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) {
        const newChat: ChatSession = {
          id: chatId,
          leadId: senderId,
          leadName: `TikTok User ${senderId.substring(0, 5)}`,
          channel: 'tiktok',
          lastMessage: messageText,
          lastTimestamp: timestamp,
          unreadCount: 1,
          status: 'active',
          dataCriacao: timestamp
        };
        await setDoc(chatRef, newChat);
      } else {
        await updateDoc(chatRef, {
          lastMessage: messageText,
          lastTimestamp: timestamp,
          unreadCount: (chatSnap.data()?.unreadCount || 0) + 1,
          status: 'active'
        });
      }

      // 3. Salvar Mensagem
      await addDoc(collection(db, 'messages'), {
        chatId: chatId,
        senderId: senderId,
        senderName: `TikTok User`,
        content: messageText,
        timestamp: timestamp,
        type: 'text',
        status: 'delivered',
        isIncoming: true
      });
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Erro no Webhook TikTok:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
