import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, setDoc, getDoc, addDoc } from 'firebase/firestore';
import { ChatMessage, ChatSession, Lead, WhatsappConnection } from '@/types/crm';
import { sendOmnichannelMessageAction } from '@/app/actions/chat';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Log para depuração
    console.log('Webhook Evolution API recebido:', JSON.stringify(body, null, 2));

    // A Evolution envia vários eventos, queremos focar em novas mensagens
    if (body.event === 'messages.upsert' || body.event === 'messages.update') {
      const instanceName = body.instance;
      const data = body.data;

      // Se não tiver a chave da mensagem, ignora
      if (!data || !data.key || !data.key.remoteJid) {
        return new NextResponse('Missing message key', { status: 200 });
      }

      // O remoteJid é o número do WhatsApp com o sufixo @s.whatsapp.net
      // Ex: 554899999999@s.whatsapp.net (Pode ser também de grupo @g.us)
      const remoteJid = data.key.remoteJid;
      
      // Ignorar mensagens de grupos temporariamente ou mensagens de sistema
      if (remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') {
        return new NextResponse('Ignored', { status: 200 });
      }

      const isFromMe = data.key.fromMe;
      const pushName = data.pushName || 'Desconhecido';
      
      // Extrair o texto da mensagem (A estrutura da Evolution/Baileys é complexa)
      const messageObj = data.message;
      let messageText = '';
      let messageType: 'text' | 'image' | 'video' | 'file' = 'text';
      
      if (messageObj) {
        if (messageObj.conversation) {
          messageText = messageObj.conversation;
        } else if (messageObj.extendedTextMessage?.text) {
          messageText = messageObj.extendedTextMessage.text;
        } else if (messageObj.imageMessage) {
          messageType = 'image';
          messageText = messageObj.imageMessage.caption || '📷 Imagem';
        } else if (messageObj.videoMessage) {
          messageType = 'video';
          messageText = messageObj.videoMessage.caption || '🎥 Vídeo';
        } else if (messageObj.documentMessage) {
          messageType = 'file';
          messageText = messageObj.documentMessage.fileName || '📄 Documento';
        } else if (messageObj.audioMessage) {
          messageType = 'file';
          messageText = '🎵 Áudio';
        } else {
           messageText = 'Mensagem não suportada';
        }
      }

      // Se for apenas atualização de status de leitura, não cria nova mensagem
      if (!messageText && body.event !== 'messages.upsert') {
        return new NextResponse('OK', { status: 200 });
      }

      // 1. Buscar a conexão que recebeu essa mensagem
      const connectionsRef = collection(db, 'whatsapp_connections');
      const qConn = query(connectionsRef, where('evolutionInstanceName', '==', instanceName));
      const connSnap = await getDocs(qConn);
      
      let connectionId = '';
      let connectionName = 'WhatsApp';
      
      if (!connSnap.empty) {
        const connDoc = connSnap.docs[0];
        connectionId = connDoc.id;
        connectionName = connDoc.data().name;
      } else {
        console.warn(`Conexão Evolution não encontrada para a instância: ${instanceName}`);
      }

      // 2. Extrair o telefone limpo do JID
      const phoneNumber = remoteJid.split('@')[0];

      // 3. Procurar se já existe um Lead com esse telefone
      const leadsRef = collection(db, 'leads');
      const qLead = query(leadsRef, where('telefone', '==', phoneNumber));
      const leadSnap = await getDocs(qLead);

      let leadId = '';
      let leadName = pushName;

      if (!leadSnap.empty) {
        // Atualiza a data de última atividade do lead existente
        const leadDoc = leadSnap.docs[0];
        leadId = leadDoc.id;
        leadName = leadDoc.data().nome; // Prefere o nome salvo no CRM
        
        await updateDoc(doc(db, 'leads', leadId), {
          dataUltimaAtividade: new Date().toISOString()
        });
      } else {
        // Cria um lead novo
        const newLeadRef = doc(collection(db, 'leads'));
        leadId = newLeadRef.id;
        await setDoc(newLeadRef, {
          nome: pushName,
          telefone: phoneNumber, // Pode salvar no celular tbm se preferir
          celular: phoneNumber,
          origem: `WhatsApp (${connectionName})`,
          status: 'novo',
          dataCriacao: new Date().toISOString(),
          dataUltimaAtividade: new Date().toISOString(),
          consentimentoLGPD: true,
          tags: ['whatsapp', 'evolution']
        });
      }

      // 4. Identificador Único do Chat
      const chatId = `whatsapp_${phoneNumber}`;
      const chatRef = doc(db, 'atendimentos_v3', chatId);
      let chatSnap = await getDoc(chatRef);

      const timestampIso = new Date().toISOString();

      if (!chatSnap.exists()) {
        // Criar nova sessão de chat
        const newChat: ChatSession = {
          id: chatId,
          leadId: leadId,
          leadName: leadName,
          channel: 'whatsapp',
          connectionId: connectionId,
          connectionName: connectionName,
          lastMessage: messageText,
          lastTimestamp: timestampIso,
          unreadCount: isFromMe ? 0 : 1,
          status: 'active',
          dataCriacao: timestampIso
        };
        await setDoc(chatRef, newChat);
      } else {
        // Atualizar sessão existente
        const currentData = chatSnap.data() as ChatSession;
        await updateDoc(chatRef, {
          lastMessage: messageText,
          lastTimestamp: timestampIso,
          unreadCount: isFromMe ? 0 : (currentData.unreadCount || 0) + 1,
          status: 'active', // reativa se estava arquivado
          connectionId: connectionId,
          connectionName: connectionName,
          leadName: leadName // Atualiza o nome caso tenha mudado
        });
      }

      // 5. Salvar a Mensagem na subcoleção/coleção raiz de mensagens
      // A chave (id) do Firestore será o id da mensagem no WhatsApp para evitar duplicação
      const messageId = data.key.id;
      const messageRef = doc(db, 'messages', `${chatId}_${messageId}`);
      
      const newMsg: ChatMessage = {
        id: messageId,
        chatId: chatId,
        senderId: isFromMe ? 'vendedor' : leadId,
        senderName: isFromMe ? 'Você' : leadName,
        content: messageText,
        timestamp: timestampIso,
        type: messageType,
        status: isFromMe ? 'sent' : 'delivered',
        isIncoming: !isFromMe
      };

      await setDoc(messageRef, newMsg, { merge: true });

      // 6. Autoresponder (Apenas se for uma nova sessão e a mensagem for recebida)
      if (!chatSnap.exists() && !isFromMe) {
        try {
          const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
          const settings = settingsSnap.exists() ? settingsSnap.data() : null;
          
          if (settings?.autoresponder?.enabled && settings.autoresponder.message) {
            // Dispara assincronamente para não prender o webhook
            sendOmnichannelMessageAction(
              phoneNumber,
              'whatsapp',
              settings.autoresponder.message,
              connectionId
            ).catch(err => console.error('Erro no Autoresponder Evolution:', err));
          }
        } catch (err) {
          console.error('Falha ao verificar Autoresponder:', err);
        }
      }

      return new NextResponse('Webhook processed successfully', { status: 200 });
    }

    // Se for outro evento de webhook da Evolution (QR Code, etc), apenas retorna 200
    return new NextResponse('Event ignored', { status: 200 });
  } catch (error) {
    console.error('Erro no Webhook Evolution:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
