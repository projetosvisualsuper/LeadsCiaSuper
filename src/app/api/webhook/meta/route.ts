import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { ChatMessage, ChatSession, Lead } from '@/types/crm';

// O Meta envia um desafio GET para verificar o webhook na configuração inicial
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // O TOKEN deve ser configurado no painel da Meta e no .env
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'gerency_leads_token';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// Recebe as notificações de mensagens reais via POST
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Log para depuração (remover em produção se necessário)
    console.log('Webhook Meta recebido:', JSON.stringify(body, null, 2));

    // Verifica se é uma notificação do Instagram ou Facebook
    if (body.object === 'instagram' || body.object === 'page') {
      const entry = body.entry?.[0];
      const messaging = entry?.messaging?.[0];

      if (messaging && messaging.message) {
        const senderId = messaging.sender.id; // ID do usuário no Instagram/FB
        const recipientId = messaging.recipient.id; // ID da sua página/conta
        const messageText = messaging.message.text;
        const channel = body.object === 'instagram' ? 'instagram' : 'facebook';

        // 1. Verificar se já existe um ChatSession para este senderId
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('leadId', '==', senderId), where('channel', '==', channel));
        const querySnapshot = await getDocs(q);

        let chatId = '';
        let leadName = 'Lead via ' + (channel === 'instagram' ? 'Instagram' : 'Facebook');

        if (querySnapshot.empty) {
          // Criar novo chat e possivelmente novo lead
          const newChat: Partial<ChatSession> = {
            leadId: senderId,
            leadName: leadName,
            channel: channel as any,
            lastMessage: messageText,
            lastTimestamp: new Date().toISOString(),
            unreadCount: 1,
            status: 'active',
            dataCriacao: new Date().toISOString()
          };
          const docRef = await addDoc(chatsRef, newChat);
          chatId = docRef.id;

          // Criar lead no CRM também
          await addDoc(collection(db, 'leads'), {
            id: senderId, // Usamos o ID da plataforma como referência
            nome: leadName,
            email: '',
            celular: '',
            origem: channel === 'instagram' ? 'Direct Instagram' : 'Messenger Facebook',
            status: 'novo',
            tags: ['omnichannel', channel],
            dataCriacao: new Date().toISOString(),
            consentimentoLGPD: true
          });
        } else {
          // Atualizar chat existente
          const chatDoc = querySnapshot.docs[0];
          chatId = chatDoc.id;
          const chatData = chatDoc.data() as ChatSession;
          
          await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: messageText,
            lastTimestamp: new Date().toISOString(),
            unreadCount: (chatData.unreadCount || 0) + 1
          });
        }

        // 2. Salvar a mensagem
        const newMessage: Partial<ChatMessage> = {
          chatId: chatId,
          senderId: senderId,
          senderName: leadName,
          content: messageText,
          timestamp: new Date().toISOString(),
          type: 'text',
          status: 'delivered',
          isIncoming: true
        };
        await addDoc(collection(db, 'messages'), newMessage);
      }
    }

    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    console.error('Erro no Webhook Meta:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
