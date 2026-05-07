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
    // Fallback: Tentar buscar na raiz ou dentro de omnichannel
    const token = channel === 'instagram' 
      ? (settings.omnichannel?.instagramAccessToken || settings.instagramAccessToken)
      : (settings.omnichannel?.messengerAccessToken || settings.messengerAccessToken);

    if (!token) {
      console.error('getMetaProfile: Token não encontrado para o canal', channel);
      return null;
    }

    // Campos variam levemente entre Instagram e Facebook
    // Para Instagram Business, tentamos name e username
    const fields = channel === 'instagram' ? 'name,username,profile_picture' : 'name,first_name,last_name,profile_pic';
    const response = await fetch(`https://graph.facebook.com/v19.0/${userId}?fields=${fields}&access_token=${token}`);
    
    if (response.ok) {
      const data = await response.json();
      return {
        name: data.name || data.username || (data.first_name ? `${data.first_name} ${data.last_name || ''}`.trim() : null),
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
        // Determinar se é Instagram ou Facebook pelo objeto da requisição
        const channel = body.object === 'instagram' ? 'instagram' : 'facebook';

        // 1. Identificador Único e Determinístico (Garante que nunca haverá duplicados)
        const chatId = `${channel}_${senderId}`;
        const chatRef = doc(db, 'atendimentos_v3', chatId);
        let chatSnap = await getDoc(chatRef);

        let leadName = 'Lead via ' + (channel === 'instagram' ? 'Instagram' : 'Facebook');
        let leadAvatar = null;

        // Tentar buscar o nome e foto real do usuário no Meta
        const profile = await getMetaProfile(senderId, channel);
        if (profile) {
          leadName = profile.name || leadName;
          leadAvatar = profile.avatar || leadAvatar;
        }

        // 2. Criar ou Atualizar o Lead (Usando o senderId como chave única)
        const leadId = senderId;
        const leadRef = doc(db, 'leads', leadId);
        const leadSnap = await getDoc(leadRef);

        if (!leadSnap.exists()) {
          const newLead: Partial<Lead> = {
            nome: leadName,
            origem: channel === 'instagram' ? 'Instagram Direct' : 'Facebook Messenger',
            status: 'novo',
            dataCriacao: new Date().toISOString(),
            tags: ['omnichannel', channel],
            avatar: leadAvatar,
            isMetaLead: true
          };
          await setDoc(leadRef, newLead);
        }

        // 3. Garantir que o ChatSession exista (Usando o ID determinístico)
        if (!chatSnap.exists()) {
          const newChat: ChatSession = {
            id: chatId,
            leadId: leadId,
            leadName: leadName,
            channel: channel as any,
            lastMessage: messageText,
            lastTimestamp: new Date().toISOString(),
            unreadCount: 1,
            status: 'active',
            avatar: leadAvatar
          };
          await setDoc(chatRef, newChat);
        } else {
          // Atualizar última mensagem e tentar atualizar nome/avatar se forem genéricos
          const chatData = chatSnap.data();
          const updateData: any = {
            lastMessage: messageText,
            lastTimestamp: new Date().toISOString(),
            unreadCount: (chatData?.unreadCount || 0) + 1
          };

          if (profile) {
            if (!chatData?.leadName || chatData.leadName.startsWith('Lead via')) {
              updateData.leadName = profile.name || chatData?.leadName;
            }
            if (!chatData?.avatar) {
              updateData.avatar = profile.avatar || chatData?.avatar;
            }
          }

          await updateDoc(chatRef, updateData);
        }

        // 4. Salvar a mensagem
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
