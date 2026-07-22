export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';
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
      let phoneNumber = remoteJid.split('@')[0].split(':')[0];
      const isLid = remoteJid.includes('@lid');

      // Se for @lid, tentamos resolver para o número real chamando a API da Evolution
      if (isLid && !isFromMe) {
        try {
          const settings = await d1Api.getSettings();
          
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
        
        const reactionObj = msg.reactionMessage || messageObj.reactionMessage;
        if (reactionObj) {
          const emoji = reactionObj.text;
          if (emoji) {
            messageText = `Reagiu: ${emoji}`;
          } else {
            return new NextResponse('OK', { status: 200 });
          }
        } else if (msg.conversation) {
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
          messageType = 'audio';
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

      // --- UPLOAD PARA O R2 ---
      let mediaUrl = '';
      let mediaMimeType = '';

      if (messageType !== 'text') {
        let base64Data = messageObj.base64;
        let mimetype = messageObj.mimetype || 'application/octet-stream';

        if (!base64Data) {
          try {
            const settings = await d1Api.getSettings();
            const apiUrl = settings?.omnichannel?.evolutionApiUrl || 'http://localhost:8080';
            const apiKey = settings?.omnichannel?.evolutionApiKey || '';
            
            if (apiUrl && apiKey) {
              const fetchBase64Res = await fetch(`${apiUrl.replace(/\/$/, '')}/chat/getBase64FromMediaMessage/${instanceName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                body: JSON.stringify({ message: data })
              });
              
              if (fetchBase64Res.ok) {
                const base64Json = await fetchBase64Res.json();
                if (base64Json && base64Json.base64) {
                  base64Data = base64Json.base64;
                  if (base64Json.mimetype) mimetype = base64Json.mimetype;
                }
              } else {
                console.error("Erro na API da Evolution ao buscar base64:", await fetchBase64Res.text());
              }
            }
          } catch(e) {
             console.error("Erro ao buscar base64 da mídia na Evolution:", e);
          }
        }

        if (base64Data) {
          try {
            let bucket = process.env.BUCKET || (globalThis as any).BUCKET;

            if (bucket) {
              // Limpar o prefixo data:image/png;base64, se existir
              let cleanBase64 = base64Data;
              if (cleanBase64.includes(',')) {
                cleanBase64 = cleanBase64.split(',')[1];
              }

              const binaryString = atob(cleanBase64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
              }
              
              const fileExt = mimetype.split('/')[1]?.split(';')[0] || 'bin';
              const messageId = data.key.id;
              const fileName = `chat_${phoneNumber}/${messageId}.${fileExt}`;
              
              await bucket.put(fileName, bytes.buffer, {
                httpMetadata: { contentType: mimetype }
              });
              
              mediaUrl = `/api/media/${fileName.split('/').map(s => encodeURIComponent(s)).join('/')}`;
              mediaMimeType = mimetype;
              console.log(`✅ Upload de mídia para o R2 com sucesso: ${fileName}`);
            } else {
               console.error("Bucket R2 não configurado no webhook");
            }
          } catch (err) {
            console.error("Erro ao fazer upload pro R2:", err);
          }
        }
      }

      // 1. Buscar a conexão que recebeu essa mensagem
      const connections = await d1Api.getWhatsappConnections();
      const connection = connections.find(c => c.evolutionInstanceName?.toLowerCase() === instanceName?.toLowerCase() || c.name?.toLowerCase() === instanceName?.toLowerCase());
      
      let connectionId = '';
      let connectionName = 'WhatsApp';
      
      if (connection) {
        connectionId = connection.id;
        connectionName = connection.name;
      }

      // 2. Normalizar número de telefone BR (com/sem 9 dígitos)
      const normalizeBRNumber = (phone: string) => {
        let normalized = phone.replace(/\D/g, '');
        if (normalized.startsWith('55') && normalized.length === 12) {
          const ddd = normalized.substring(2, 4);
          const num = normalized.substring(4);
          return { with9: `55${ddd}9${num}`, without9: normalized };
        } else if (normalized.startsWith('55') && normalized.length === 13) {
          const ddd = normalized.substring(2, 4);
          const num = normalized.substring(5);
          return { with9: normalized, without9: `55${ddd}${num}` };
        }
        return { with9: normalized, without9: normalized };
      };

      const { with9, without9 } = normalizeBRNumber(phoneNumber);

      // 3. Procurar se já existe um Lead com esse telefone por ambos os formatos (com/sem 9)
      const { results: existingLeads } = await d1Api.runQuery(
        `SELECT * FROM leads WHERE telefone = ? OR celular = ? OR telefone = ? OR celular = ? LIMIT 1`,
        [with9, with9, without9, without9]
      );

      let leadId = '';
      let leadName = pushName;
      if (isFromMe || leadName === 'Você') {
        leadName = 'Contato WhatsApp';
      }
      const agora = new Date().toISOString();

      let existingLeadAvatar = null;

      if (existingLeads && existingLeads.length > 0) {
        const lead = existingLeads[0];
        leadId = lead.id;
        existingLeadAvatar = lead.avatar || null;
        
        // Se o nome do lead for genérico (como 'Contato WhatsApp' ou 'Desconhecido') e recebermos um nome real do cliente, atualizamos no CRM!
        const isGenericName = !lead.nome || lead.nome === 'Contato WhatsApp' || lead.nome === 'Desconhecido' || lead.nome.startsWith('Lead via');
        const hasRealNewName = pushName && pushName !== 'Você' && pushName !== 'Contato WhatsApp';

        if (isGenericName && hasRealNewName && !isFromMe) {
          leadName = pushName;
          const needsPhoneUpdate = !lead.telefone || !lead.telefone.includes('9');
          if (needsPhoneUpdate) {
            await d1Api.executeRun(
              `UPDATE leads SET nome = ?, telefone = ?, celular = ?, dataUltimaAtividade = ? WHERE id = ?`,
              [pushName, with9, with9, agora, leadId]
            );
          } else {
            await d1Api.executeRun(
              `UPDATE leads SET nome = ?, dataUltimaAtividade = ? WHERE id = ?`,
              [pushName, agora, leadId]
            );
          }
        } else {
          leadName = lead.nome && lead.nome !== 'Você' ? lead.nome : leadName; // Prefere o nome salvo no CRM se válido
          
          // Se o lead não tinha o número com 9 dígitos, atualiza para o padrão com 9
          if (!lead.telefone || !lead.telefone.includes('9')) {
            await d1Api.executeRun(
              `UPDATE leads SET telefone = ?, celular = ?, dataUltimaAtividade = ? WHERE id = ?`,
              [with9, with9, agora, leadId]
            );
          } else {
            await d1Api.executeRun(
              `UPDATE leads SET dataUltimaAtividade = ? WHERE id = ?`,
              [agora, leadId]
            );
          }
        }
      } else {
        // Cria um lead novo
        leadId = Math.random().toString(36).substr(2, 9);
        await d1Api.saveLead({
          id: leadId,
          nome: leadName,
          telefone: with9, // Sempre salva no padrão com 9 para manter consistência
          celular: with9,
          origem: `WhatsApp (${connectionName})`,
          status: 'novo',
          dataCriacao: agora,
          dataUltimaAtividade: agora,
          consentimentoLGPD: true,
          tags: ['whatsapp', 'evolution']
        } as any);
      }

      // 4. Identificador Único do Chat (normalizado sempre com 9 dígitos)
      const chatId = `whatsapp_${with9}`;
      const oldChatId = `whatsapp_${without9}`;

      // Buscar o chat existente por qualquer um dos formatos (com ou sem 9)
      const { results: chatResults } = await d1Api.runQuery(
        `SELECT * FROM chats WHERE id = ? OR id = ? LIMIT 1`,
        [chatId, oldChatId]
      );
      
      const hasChat = chatResults && chatResults.length > 0;
      let matchedChat = hasChat ? chatResults[0] : null;

      // Se o chat foi encontrado no formato antigo (sem o 9), migramos as tabelas para o formato novo (com 9)
      if (matchedChat && matchedChat.id === oldChatId && oldChatId !== chatId) {
        try {
          await d1Api.executeRun(`UPDATE chats SET id = ? WHERE id = ?`, [chatId, oldChatId]);
          await d1Api.executeRun(`UPDATE messages SET chatId = ? WHERE chatId = ?`, [chatId, oldChatId]);
          matchedChat.id = chatId;
        } catch (e) {
          console.error('Erro ao migrar tabelas para o novo chatId:', e);
        }
      }

      const timestampIso = new Date().toISOString();

      if (!matchedChat) {
        let leadAvatar = null;
        // Não buscar avatar se for mensagem enviada por nós (isFromMe) ou se for um LID não resolvido
        if (!isFromMe && !isLid) {
          try {
            const settings = await d1Api.getSettings();
            const apiUrl = settings?.omnichannel?.evolutionApiUrl || 'http://localhost:8080';
            const apiKey = settings?.omnichannel?.evolutionApiKey || '';
            if (apiUrl && apiKey) {
              const picRes = await fetch(`${apiUrl.replace(/\/$/, '')}/chat/fetchProfilePictureUrl/${instanceName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                body: JSON.stringify({ number: `${with9}@s.whatsapp.net` }) // Usar o JID completo com 9
              });
              if (picRes.ok) {
                const picData = await picRes.json();
                if (picData && picData.profilePictureUrl && !picData.profilePictureUrl.includes('placeholder')) {
                  leadAvatar = picData.profilePictureUrl;
                }
              }
            }
          } catch (e) {
            console.error('Erro ao buscar foto de perfil novo chat:', e);
          }
        }

        // Buscar se existe algum atendente/vendedor vinculado a esta conexão
        const { results: linkedUsers } = await d1Api.runQuery(
          `SELECT uid FROM users WHERE whatsappConnectionId = ? LIMIT 1`,
          [connectionId]
        );
        const assignedToId = linkedUsers && linkedUsers.length > 0 ? linkedUsers[0].uid : undefined;

        // Criar nova sessão de chat
        const newChat: ChatSession = {
          id: chatId,
          leadId: leadId,
          leadName: leadName,
          leadAvatar: leadAvatar || undefined,
          channel: 'whatsapp',
          connectionId: connectionId,
          connectionName: connectionName,
          lastMessage: messageText,
          lastTimestamp: timestampIso,
          unreadCount: isFromMe ? 0 : 1,
          status: 'active',
          assignedTo: assignedToId,
          dataCriacao: timestampIso
        };
        await d1Api.saveChatSession(newChat);

        // Também salvar o avatar na tabela de leads
        if (leadAvatar) {
          await d1Api.executeRun(`UPDATE leads SET avatar = ? WHERE id = ?`, [leadAvatar, leadId]);
        }
      } else {
        // Atualizar sessão existente
        let unreadCount = isFromMe ? 0 : (matchedChat.unreadCount || 0) + 1;
        let leadAvatar = matchedChat.leadAvatar || existingLeadAvatar || null;

        // Preserva o nome do chat anterior se ele for válido e o novo nome for genérico ou se for mensagem enviada por nós
        let finalLeadName = matchedChat.leadName;
        if (!finalLeadName || finalLeadName === 'Contato WhatsApp' || finalLeadName === 'Desconhecido') {
          finalLeadName = leadName || 'Contato WhatsApp';
        } else if (!isFromMe && leadName && leadName !== 'Contato WhatsApp') {
          finalLeadName = leadName;
        }

        // Tentar buscar foto de perfil de forma assíncrona se não existir, ignorando se for LID ou fromMe
        if (!isFromMe && !leadAvatar && !isLid) {
          try {
            const settings = await d1Api.getSettings();
            const apiUrl = settings?.omnichannel?.evolutionApiUrl || 'http://localhost:8080';
            const apiKey = settings?.omnichannel?.evolutionApiKey || '';
            if (apiUrl && apiKey) {
              const picRes = await fetch(`${apiUrl.replace(/\/$/, '')}/chat/fetchProfilePictureUrl/${instanceName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                body: JSON.stringify({ number: `${with9}@s.whatsapp.net` }) // Usar o JID completo com 9
              });
              if (picRes.ok) {
                const picData = await picRes.json();
                if (picData && picData.profilePictureUrl && !picData.profilePictureUrl.includes('placeholder')) {
                  leadAvatar = picData.profilePictureUrl;
                  // Atualizar avatar na tabela de leads
                  await d1Api.executeRun(`UPDATE leads SET avatar = ? WHERE id = ?`, [leadAvatar, matchedChat.leadId]);
                }
              }
            }
          } catch (e) {
            console.error('Erro ao buscar foto de perfil:', e);
          }
        }

        // Se a conversa já existe mas não possui responsável, vincular ao usuário dono da conexão
        let assignedTo = matchedChat.assignedTo;
        if (!assignedTo) {
          const { results: linkedUsers } = await d1Api.runQuery(
            `SELECT uid FROM users WHERE whatsappConnectionId = ? LIMIT 1`,
            [connectionId]
          );
          if (linkedUsers && linkedUsers.length > 0) {
            assignedTo = linkedUsers[0].uid;
          }
        }

        await d1Api.executeRun(
          `UPDATE chats SET lastMessage = ?, lastTimestamp = ?, unreadCount = ?, status = 'active', connectionId = ?, connectionName = ?, leadName = ?, leadAvatar = ?, assignedTo = ? WHERE id = ?`,
          [messageText, timestampIso, unreadCount, connectionId, connectionName, finalLeadName, leadAvatar, assignedTo || null, chatId]
        );
      }

      // 5. Salvar a Mensagem na tabela de mensagens
      const messageId = data.key.id;
      await d1Api.sendMessage({
        id: messageId,
        chatId: chatId,
        senderId: isFromMe ? 'vendedor' : leadId,
        senderName: isFromMe ? 'Você' : leadName,
        content: messageText,
        timestamp: timestampIso,
        type: messageType,
        status: isFromMe ? 'sent' : 'delivered',
        isIncoming: !isFromMe,
        channel: 'whatsapp',
        leadId,
        leadName,
        mediaUrl,
        mediaMimeType,
        connectionId
      });

      // 6. Autoresponder (Apenas se for uma nova sessão e a mensagem for recebida)
      if (!hasChat && !isFromMe) {
        try {
          const settings = await d1Api.getSettings();
          
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

      // 6.B Disparar automações de atendimento de lead do tipo 'mensagem_entrada'
      if (!isFromMe) {
        try {
          const { automationEngine } = await import('@/services/automation-engine');
          const channelId = connectionId ? `whatsapp_${connectionId}` : 'all_channels';
          
          (async () => {
            await automationEngine.processLeadAutomation(leadId, channelId, 'mensagem_entrada', messageText);
          })();
        } catch (err) {
          console.error('Erro ao disparar automação por mensagem de entrada:', err);
        }
      }

      return new NextResponse('Webhook processed successfully', { status: 200 });
    }

    if (body.event === 'connection.update') {
      const instanceName = body.instance;
      const state = body.data?.state;
      
      const connections = await d1Api.getWhatsappConnections();
      const connection = connections.find(c => c.evolutionInstanceName === instanceName);
      
      if (connection && state) {
        let newStatus = connection.status;
        if (state === 'open') newStatus = 'connected';
        else if (state === 'close' || state === 'connecting') newStatus = 'pending';
        
        if (newStatus !== connection.status) {
          await d1Api.updateWhatsappConnection(connection.id, { status: newStatus });
        }
      }
      return new NextResponse('Connection update processed', { status: 200 });
    }

    // Se for outro evento de webhook da Evolution (QR Code, etc), apenas retorna 200
    return new NextResponse('Event ignored', { status: 200 });
  } catch (error) {
    console.error('Erro no Webhook Evolution:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
