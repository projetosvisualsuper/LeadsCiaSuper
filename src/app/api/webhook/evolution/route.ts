export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, setDoc, getDoc, addDoc } from 'firebase/firestore';
import { ChatMessage, ChatSession, Lead, WhatsappConnection } from '@/types/crm';
import { sendOmnichannelMessageAction } from '@/app/actions/chat';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // LOG DE EMERGÊNCIA - PARA ANALISAR O LID
    console.error('#################################################');
    console.error('### NOVO WEBHOOK RECEBIDO DO EVOLUTION        ###');
    console.error(JSON.stringify(body, null, 2));
    console.error('#################################################');

    // A Evolution envia vários eventos, queremos focar em novas mensagens
    if (body.event === 'messages.upsert' || body.event === 'messages.update') {
      const instanceName = body.instance;
      const data = body.data;

      // Se não tiver a chave da mensagem, ignora
      if (!data || !data.key || !data.key.remoteJid) {
        return new NextResponse('Missing message key', { status: 200 });
      }

      const isFromMe = data.key.fromMe;
      
      // O remoteJid real da conversa está em data.key.remoteJid
      let remoteJid = data.key.remoteJid;
      
      // Lógica para lidar com LIDs (WhatsApp novos/privacidade)
      let phoneNumber = remoteJid.split('@')[0];
      const isLid = remoteJid.includes('@lid');

      // Se for @lid, tentamos resolver para o número real chamando a API da Evolution
      if (isLid && !isFromMe) {
        try {
          const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
          const settings = settingsSnap.exists() ? settingsSnap.data() : null;
          
          // Usar configurações do banco ou fallback (o que funcionar no "Testar Envio")
          const apiUrl = settings?.omnichannel?.evolutionApiUrl || 'http://localhost:8080';
          const apiKey = settings?.omnichannel?.evolutionApiKey || '42247732-1594-42cc-9430-194165683244';

          if (apiUrl && apiKey) {
            const endpoints = [
              `/chat/fetchContact/${instanceName}`,
              `/chat/getContact/${instanceName}`,
              `/chat/fetchProfile/${instanceName}`,
              `/chat/whatsappNumbers/${instanceName}`,
              `/chat/contactDetails/${instanceName}`,
              `/chat/retrieveNumber/${instanceName}`
            ];

            let resolved = false;
            // Tenta com o ID original (com @lid) e depois só com os números
            const idsToTry = [remoteJid, remoteJid.split('@')[0]];

            for (const idToTry of idsToTry) {
              if (resolved) break;
              for (const endpoint of endpoints) {
                if (resolved) break;

                const resolveUrl = `${apiUrl.replace(/\/$/, '')}${endpoint}`;
                console.log(`Tentando resolver ${idToTry} em: ${resolveUrl}`);
                
                try {
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 3000);
                  
                  // Se for whatsappNumbers, tenta o formato de array
                  const bodyData = endpoint.includes('whatsappNumbers') 
                    ? { numbers: [idToTry] } 
                    : { number: idToTry };

                  const resolveRes = await fetch(resolveUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                    body: JSON.stringify(bodyData),
                    signal: controller.signal
                  });
                  clearTimeout(timeoutId);
                  
                  const resolveData = await resolveRes.json();
                  // Log para debug
                  if (endpoint.includes('whatsappNumbers')) {
                    console.log('Resposta whatsappNumbers:', JSON.stringify(resolveData));
                  }
                  
                  if (resolveRes.ok && resolveData) {
                    // O whatsappNumbers costuma retornar um array
                    const result = Array.isArray(resolveData) ? resolveData[0] : resolveData;
                    const resNum = (result.number || result.jid || result.id || result.exists || '').toString().split('@')[0].replace(/\D/g, '');
                    
                    if (resNum && resNum.startsWith('55') && resNum.length >= 12) {
                      console.log(`✅ LID RESOLVIDO via ${endpoint}: ${idToTry} -> ${resNum}`);
                      phoneNumber = resNum;
                      resolved = true;
                    }
                  }
                } catch (e) {}
              }
            }

            // Se ainda não resolveu, tenta o endpoint de Contatos
            if (!resolved) {
              console.log(`Tentando resolver via Contatos em: ${apiUrl}/contact/fetchContent/${instanceName}`);
              try {
                const contactUrl = `${apiUrl.replace(/\/$/, '')}/contact/fetchContent/${instanceName}`;
                const contactRes = await fetch(contactUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                  body: JSON.stringify({ number: remoteJid })
                });
                const contactData = await contactRes.json();
                console.log('Resposta Contatos:', JSON.stringify(contactData));
                if (contactData && contactData.number && !contactData.number.includes('lid')) {
                  phoneNumber = contactData.number.split('@')[0];
                  console.log(`✅ LID RESOLVIDO via Contatos: ${remoteJid} -> ${phoneNumber}`);
                  resolved = true;
                }
              } catch (e) {
                console.log('Erro ao buscar no diretório de contatos.');
              }
            }

            // Se nada resolveu, tenta buscar na lista global de contatos da instância
            if (!resolved) {
              try {
                console.log('Buscando na lista global de contatos da instância...');
                const contactsUrl = `${apiUrl.replace(/\/$/, '')}/instance/fetchContacts/${instanceName}`;
                const contactsRes = await fetch(contactsUrl, {
                  method: 'GET',
                  headers: { 'apikey': apiKey }
                });
                const contacts = await contactsRes.json();
                
                if (Array.isArray(contacts)) {
                  const matchedContact = contacts.find(c => 
                    c.id === remoteJid || 
                    c.jid === remoteJid || 
                    (c.id && c.id.includes(remoteJid.split('@')[0]))
                  );
                  
                  if (matchedContact) {
                    const realId = matchedContact.id || matchedContact.jid;
                    const realNum = realId.split('@')[0];
                    if (realNum && !realNum.includes('lid')) {
                      console.log(`✅ LID RESOLVIDO via Agenda Global: ${remoteJid} -> ${realNum}`);
                      phoneNumber = realNum;
                      resolved = true;
                    }
                  }
                }
              } catch (e) {
                console.log('Erro ao buscar na agenda global.');
              }
            }
          }
 else {
            console.error('❌ URL ou API Key da Evolution não configuradas para resolução de LID.');
          }
        } catch (err) {
          console.error('Erro ao resolver LID para número real:', err);
        }
      }

      // Ignorar mensagens de grupos ou sistema
      if (remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') {
        return new NextResponse('Ignored', { status: 200 });
      }

      const pushName = data.pushName || 'Desconhecido';
      
      // Extrair o texto da mensagem (A estrutura da Evolution/Baileys varia entre versões)
      const messageObj = data.message;
      let messageText = '';
      let messageType: 'text' | 'image' | 'video' | 'file' = 'text';
      
      if (messageObj) {
        // Tenta encontrar o texto em diferentes níveis (v1.x vs v2.x)
        const msg = messageObj.message || messageObj;
        
        if (msg.conversation) {
          messageText = msg.conversation;
        } else if (msg.extendedTextMessage?.text) {
          messageText = msg.extendedTextMessage.text;
        } else if (msg.imageMessage) {
          messageType = 'image';
          messageText = msg.imageMessage.caption || '📷 Imagem';
        } else if (msg.videoMessage) {
          messageType = 'video';
          messageText = msg.videoMessage.caption || '🎥 Vídeo';
        } else if (msg.documentMessage) {
          messageType = 'file';
          messageText = msg.documentMessage.fileName || '📄 Documento';
        } else if (msg.audioMessage) {
          messageType = 'file';
          messageText = '🎵 Áudio';
        } else if (typeof msg === 'string') {
          messageText = msg;
        } else {
          messageText = 'Mensagem de mídia ou sistema';
        }
      }

      // Se for apenas atualização de status de leitura, não cria nova mensagem
      if (!messageText && body.event !== 'messages.upsert') {
        return new NextResponse('OK', { status: 200 });
      }

      // 1. Buscar a conexão que recebeu essa mensagem
      const connectionsRef = collection(db, 'whatsapp_connections');
      const connSnap = await getDocs(connectionsRef);
      
      console.log('--- Conexões encontradas no banco ---');
      connSnap.forEach(d => console.log(`- ${d.data().name}: Key=${d.data().evolutionApiKey}`));

      const qConn = query(connectionsRef, where('evolutionInstanceName', '==', instanceName));
      const connSnapSpecific = await getDocs(qConn);
      
      let connectionId = '';
      let connectionName = 'WhatsApp';
      
      if (!connSnapSpecific.empty) {
        const connDoc = connSnapSpecific.docs[0];
        connectionId = connDoc.id;
        connectionName = connDoc.data().name;
      }

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
