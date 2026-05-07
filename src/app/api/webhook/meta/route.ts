import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, setDoc, getDoc } from 'firebase/firestore';
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

// Função auxiliar para buscar o perfil do usuário no Meta (Nome e Foto)
async function getMetaProfile(userId: string, channel: string) {
  try {
    // Buscar tokens nas configurações globais
    const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
    if (!settingsSnap.exists()) return null;
    
    const settings = settingsSnap.data();
    const token = channel === 'instagram' 
      ? settings.omnichannel?.instagramAccessToken 
      : settings.omnichannel?.messengerAccessToken;

    if (!token) return null;

    // Campos variam levemente entre Instagram e Facebook
    const fields = channel === 'instagram' ? 'name,profile_picture' : 'first_name,last_name,profile_pic';
    const response = await fetch(`https://graph.facebook.com/v19.0/${userId}?fields=${fields}&access_token=${token}`);
    
    if (response.ok) {
      const data = await response.json();
      return {
        name: data.name || (data.first_name ? `${data.first_name} ${data.last_name || ''}`.trim() : null),
        avatar: data.profile_picture || data.profile_pic
      };
    }
  } catch (error) {
    console.error('Erro ao buscar perfil no Meta:', error);
  }
  return null;
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
        const deterministicId = `${channel}_${senderId}`;
        let chatRef = doc(db, 'chats', deterministicId);
        let chatSnap = await getDoc(chatRef);
        let chatId = deterministicId;

        // Se não encontrar pelo ID determinístico, tenta buscar por leadId (para compatibilidade com chats legados)
        if (!chatSnap.exists()) {
          const chatsRef = collection(db, 'chats');
          const q = query(chatsRef, where('leadId', '==', senderId), where('channel', '==', channel));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const legacyDoc = querySnapshot.docs[0];
            chatId = legacyDoc.id;
            chatRef = doc(db, 'chats', chatId);
            chatSnap = await getDoc(chatRef);
          }
        }

        let leadName = 'Lead via ' + (channel === 'instagram' ? 'Instagram' : 'Facebook');
        let leadAvatar = null;

        // Tentar buscar o nome e foto real do usuário no Meta
        const profile = await getMetaProfile(senderId, channel);
        if (profile) {
          if (profile.name) leadName = profile.name;
          if (profile.avatar) leadAvatar = profile.avatar;
        }

        if (!chatSnap.exists()) {
          // Criar novo chat
          const newChat: Partial<ChatSession> = {
            leadId: senderId,
            leadName: leadName,
            leadAvatar: leadAvatar,
            channel: channel as any,
            lastMessage: messageText,
            lastTimestamp: new Date().toISOString(),
            unreadCount: 1,
            status: 'active',
            dataCriacao: new Date().toISOString()
          };
          await setDoc(chatRef, newChat);

          // Criar/Atualizar lead no CRM
          const leadData: Lead = {
            id: senderId, 
            nome: leadName,
            email: '',
            celular: '',
            origem: channel === 'instagram' ? 'Direct Instagram' : 'Messenger Facebook',
            status: 'novo',
            tags: ['omnichannel', channel],
            dataCriacao: new Date().toISOString(),
            consentimentoLGPD: true
          };
          await setDoc(doc(db, 'leads', senderId), leadData);
        } else {
          // Atualizar chat existente
          const chatData = chatSnap.data() as ChatSession;
          
          await updateDoc(chatRef, {
            leadName: leadName,
            leadAvatar: leadAvatar,
            lastMessage: messageText,
            lastTimestamp: new Date().toISOString(),
            unreadCount: (chatData.unreadCount || 0) + 1
          });

          // Também atualizar o nome no Lead se ainda for o nome genérico
          if (chatData.leadName.startsWith('Lead via')) {
             await updateDoc(doc(db, 'leads', senderId), { nome: leadName });
          }
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
