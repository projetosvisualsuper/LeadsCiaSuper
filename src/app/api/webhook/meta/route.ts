export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { ChatMessage, ChatSession, Lead } from '@/types/crm';
import { sendOmnichannelMessageAction } from '@/app/actions/chat';

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
    // Para Instagram Business, tentamos name e profile_pic
    const fields = channel === 'instagram' 
      ? 'name,profile_pic' 
      : 'name,first_name,last_name,profile_pic';
      
    const response = await fetch(`https://graph.facebook.com/v19.0/${userId}?fields=${fields}&access_token=${token}`);
    
    if (response.ok) {
      const data = await response.json();
      return {
        name: data.name || data.username || (data.first_name ? `${data.first_name} ${data.last_name || ''}`.trim() : null),
        avatar: data.profile_picture_url || data.profile_picture || data.profile_pic
      };
    } else {
      const errorData = await response.json();
      console.error('Meta API Error:', JSON.stringify(errorData));
      
      // Salvar erro no banco para podermos debugar sem acesso ao terminal
      try {
        await setDoc(doc(db, 'settings', 'meta_debug'), {
          lastError: errorData,
          timestamp: new Date().toISOString(),
          userIdAttempted: userId,
          channel: channel
        });
      } catch(e) {}
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
        const isEcho = messaging.message.is_echo;
        // Se for eco (mensagem enviada por nós), o ID do lead está no recipient
        // Se não for eco (mensagem enviada pelo lead), o ID do lead está no sender
        const leadId = isEcho ? messaging.recipient.id : messaging.sender.id;
        const messageText = messaging.message.text || '';
        const channel = body.object === 'instagram' ? 'instagram' : 'facebook';

        // 1. Identificador Único e Determinístico (Garante que nunca haverá duplicados)
        const chatId = `${channel}_${leadId}`;
        const chatRef = doc(db, 'atendimentos_v3', chatId);
        let chatSnap = await getDoc(chatRef);

        let leadName = 'Lead via ' + (channel === 'instagram' ? 'Instagram' : 'Facebook');
        let leadAvatar = null;

        // Tentar buscar o nome e foto real do usuário no Meta
        const profile = await getMetaProfile(leadId, channel);
        if (profile) {
          leadName = profile.name || leadName;
          leadAvatar = profile.avatar || leadAvatar;
        }

        // 2. Criar ou Atualizar o Lead (Usando o leadId como chave única)
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
        } else {
          // Atualizar última atividade e enriquecer dados se forem genéricos
          const leadData = leadSnap.data();
          const updateData: any = { dataUltimaAtividade: new Date().toISOString() };
          
          if (profile) {
            if (!leadData.nome || leadData.nome.startsWith('Lead via')) {
              updateData.nome = profile.name || leadData.nome;
            }
            if (!leadData.avatar) {
              updateData.avatar = profile.avatar || leadData.avatar;
            }
          }
          await updateDoc(leadRef, updateData);
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
            unreadCount: isEcho ? 0 : 1,
            status: 'active',
            leadAvatar: leadAvatar,
            dataCriacao: new Date().toISOString()
          };
          await setDoc(chatRef, newChat);
        } else {
          // Atualizar última mensagem e tentar atualizar nome/avatar se forem genéricos
          const chatData = chatSnap.data();
          const updateData: any = {
            lastMessage: messageText,
            lastTimestamp: new Date().toISOString(),
            unreadCount: isEcho ? 0 : (chatData?.unreadCount || 0) + 1
          };

          if (profile) {
            if (!chatData?.leadName || chatData.leadName.startsWith('Lead via')) {
              updateData.leadName = profile.name || chatData?.leadName;
            }
            if (!chatData?.leadAvatar) {
              updateData.leadAvatar = profile.avatar || chatData?.leadAvatar;
            }
          }

          await updateDoc(chatRef, updateData);
        }

        // 4. Salvar a mensagem (APENAS se não for um Eco)
        // Se for um Eco, o CRM já salvou a mensagem quando o usuário clicou em enviar.
        if (!isEcho) {
          const newMessage: Partial<ChatMessage> = {
            chatId: chatId,
            senderId: leadId,
            senderName: leadName,
            content: messageText,
            timestamp: new Date().toISOString(),
            type: 'text',
            status: 'delivered',
            isIncoming: true
          };
          await addDoc(collection(db, 'messages'), newMessage);

          // 5. Autoresponder Meta
          if (!chatSnap.exists()) {
            try {
              const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
              const settings = settingsSnap.exists() ? settingsSnap.data() : null;
              if (settings?.autoresponder?.enabled && settings.autoresponder.message) {
                sendOmnichannelMessageAction(
                  leadId,
                  channel,
                  settings.autoresponder.message
                ).catch(err => console.error('Erro no Autoresponder Meta:', err));
              }
            } catch (err) {
              console.error('Falha ao verificar Autoresponder Meta:', err);
            }
          }
        }
      }
    } else if (body.object === 'whatsapp_business_account') {
      // Processar mensagens recebidas pela API Oficial do WhatsApp Meta
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (value && value.messages && value.messages.length > 0) {
        const message = value.messages[0];
        const contact = value.contacts?.[0];
        
        const rawPhone = message.from; // Número do cliente (ex: 554884040762)
        const leadName = contact?.profile?.name || 'Cliente (WhatsApp)';
        const messageText = message.text?.body || '';
        const phoneId = value.metadata?.phone_number_id; // ID do telefone que recebeu a msg

        // Função para normalizar número do Brasil (Trata o 9º dígito)
        const normalizeBRNumber = (phone: string) => {
          let normalized = phone.replace(/\D/g, '');
          if (normalized.startsWith('55') && normalized.length === 12) {
            // Se tem 12 dígitos (55 + DDD + 8 dígitos), tenta adicionar o 9
            const ddd = normalized.substring(2, 4);
            const num = normalized.substring(4);
            return {
              with9: `55${ddd}9${num}`,
              without9: normalized
            };
          } else if (normalized.startsWith('55') && normalized.length === 13) {
            // Se tem 13 dígitos (55 + DDD + 9 + 8 dígitos), tenta remover o 9
            const ddd = normalized.substring(2, 4);
            const num = normalized.substring(5);
            return {
              with9: normalized,
              without9: `55${ddd}${num}`
            };
          }
          return { with9: normalized, without9: normalized };
        };

        const { with9, without9 } = normalizeBRNumber(rawPhone);

        // 1. Encontrar a conexão WhatsApp que recebeu
        const connectionsRef = collection(db, 'whatsapp_connections');
        const qConn = query(connectionsRef, where('metaPhoneNumberId', '==', phoneId));
        const connSnap = await getDocs(qConn);
        
        let connectionId = '';
        let connectionName = 'WhatsApp Oficial';
        if (!connSnap.empty) {
          const connDoc = connSnap.docs[0];
          connectionId = connDoc.id;
          connectionName = connDoc.data().name;
        }

        // 2. Buscar Lead (Tenta com e sem o 9)
        const leadsRef = collection(db, 'leads');
        const qLeadWith9 = query(leadsRef, where('telefone', '==', with9));
        const qLeadWithout9 = query(leadsRef, where('telefone', '==', without9));
        
        const [snapWith9, snapWithout9] = await Promise.all([
          getDocs(qLeadWith9),
          getDocs(qLeadWithout9)
        ]);

        let leadId = '';

        if (!snapWith9.empty) {
          leadId = snapWith9.docs[0].id;
        } else if (!snapWithout9.empty) {
          leadId = snapWithout9.docs[0].id;
          // Se encontramos sem o 9, atualizamos o lead para ter o 9 (melhor para o envio da Meta)
          await updateDoc(doc(db, 'leads', leadId), { 
            telefone: with9,
            celular: with9,
            dataUltimaAtividade: new Date().toISOString() 
          });
        } else {
          // Criar Lead Novo (Sempre criamos com o 9 para evitar erros de envio depois)
          const newLeadRef = doc(leadsRef);
          leadId = newLeadRef.id;
          await setDoc(newLeadRef, {
            nome: leadName,
            telefone: with9,
            celular: with9,
            origem: `WhatsApp (${connectionName})`,
            status: 'novo',
            dataCriacao: new Date().toISOString(),
            dataUltimaAtividade: new Date().toISOString(),
            tags: ['whatsapp', 'meta_official']
          });
        }

        // 3. Buscar ou Criar ChatSession
        const chatId = `whatsapp_${with9}`; // Usamos o formato com 9 para o ID do chat ser consistente
        const chatRef = doc(db, 'atendimentos_v3', chatId);
        let chatSnap = await getDoc(chatRef);
        const timestampIso = new Date().toISOString();

        if (!chatSnap.exists()) {
          const newChat: ChatSession = {
            id: chatId,
            leadId: leadId,
            leadName: leadName,
            channel: 'whatsapp',
            connectionId: connectionId,
            connectionName: connectionName,
            lastMessage: messageText,
            lastTimestamp: timestampIso,
            unreadCount: 1,
            status: 'active',
            dataCriacao: timestampIso
          };
          await setDoc(chatRef, newChat);
        } else {
          const currentData = chatSnap.data() as ChatSession;
          await updateDoc(chatRef, {
            lastMessage: messageText,
            lastTimestamp: timestampIso,
            unreadCount: (currentData.unreadCount || 0) + 1,
            status: 'active',
            connectionId: connectionId,
            connectionName: connectionName
          });
        }

        // 4. Salvar Mensagem
        const messageId = message.id;
        const messageRef = doc(db, 'messages', `${chatId}_${messageId}`);
        await setDoc(messageRef, {
          id: messageId,
          chatId: chatId,
          senderId: leadId,
          senderName: leadName,
          content: messageText,
          timestamp: timestampIso,
          type: 'text',
          status: 'delivered',
          isIncoming: true
        }, { merge: true });

        // 5. Autoresponder WhatsApp Cloud API
        if (!chatSnap.exists()) {
          try {
            const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
            const settings = settingsSnap.exists() ? settingsSnap.data() : null;
            if (settings?.autoresponder?.enabled && settings.autoresponder.message) {
              sendOmnichannelMessageAction(
                with9,
                'whatsapp',
                settings.autoresponder.message,
                connectionId
              ).catch(err => console.error('Erro no Autoresponder WhatsApp Cloud:', err));
            }
          } catch (err) {
            console.error('Falha ao verificar Autoresponder WhatsApp Cloud:', err);
          }
        }
      }
    }

    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    console.error('Erro no Webhook Meta:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
