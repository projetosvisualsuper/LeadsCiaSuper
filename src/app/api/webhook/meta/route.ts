export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';
import { ChatSession } from '@/types/crm';
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
    const settings = await d1Api.getSettings();
    if (!settings) return null;
    
    // Fallback: Tentar buscar na raiz ou dentro de omnichannel
    const token = channel === 'instagram' 
      ? (settings.omnichannel?.instagramAccessToken || settings.instagramAccessToken)
      : (settings.omnichannel?.messengerAccessToken || settings.messengerAccessToken);

    if (!token) {
      console.error('getMetaProfile: Token não encontrado para o canal', channel);
      return null;
    }

    // Campos variam levemente entre Instagram e Facebook
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
      
      try {
        await d1Api.executeRun(`INSERT OR REPLACE INTO settings (id, value) VALUES (?, ?)`, [
          'meta_debug',
          JSON.stringify({
            lastError: errorData,
            timestamp: new Date().toISOString(),
            userIdAttempted: userId,
            channel: channel
          })
        ]);
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

    console.log('Webhook Meta recebido:', JSON.stringify(body, null, 2));

    if (body.object === 'instagram' || body.object === 'page') {
      const entry = body.entry?.[0];
      const messaging = entry?.messaging?.[0];
      const changes = entry?.changes?.[0];

      let leadId = '';
      let messageText = '';
      let messageType: 'text' | 'image' | 'video' | 'file' = 'text';
      let isEcho = false;
      let tempLeadName = '';

      if (messaging && messaging.message) {
        isEcho = messaging.message.is_echo;
        leadId = isEcho ? messaging.recipient.id : messaging.sender.id;
        messageText = messaging.message.text || '';
        
        const attachments = messaging.message.attachments;
        if (attachments && attachments.length > 0) {
          const attachment = attachments[0];
          if (attachment.type === 'image') {
            messageType = 'image';
            messageText = attachment.payload?.url || messageText;
          } else if (attachment.type === 'video') {
            messageType = 'video';
            messageText = attachment.payload?.url || messageText;
          } else if (attachment.type === 'audio' || attachment.type === 'file') {
            messageType = 'file';
            messageText = attachment.payload?.url || messageText;
          }
        }
      } else if (changes && changes.field === 'comments') {
        const commentValue = changes.value;
        if (commentValue && commentValue.from && commentValue.text) {
          messageText = `[Comentário na Postagem]: ${commentValue.text}`;
          messageType = 'text';

          if (commentValue.from.id === entry.id) {
            isEcho = true;
            if (commentValue.parent_id) {
              try {
                const settings = await d1Api.getSettings();
                const token = body.object === 'instagram' 
                  ? (settings?.omnichannel?.instagramAccessToken || settings?.instagramAccessToken)
                  : (settings?.omnichannel?.messengerAccessToken || settings?.messengerAccessToken);

                if (token) {
                  const parentRes = await fetch(`https://graph.facebook.com/v19.0/${commentValue.parent_id}?fields=from&access_token=${token}`);
                  if (parentRes.ok) {
                    const parentData = await parentRes.json();
                    if (parentData.from && parentData.from.id) {
                      leadId = parentData.from.id;
                      tempLeadName = parentData.from.username || parentData.from.name || '';
                    }
                  }
                }
              } catch (e) {
                console.error("Erro ao buscar parent comment:", e);
              }
            }
            if (!leadId) {
              leadId = commentValue.from.id;
              tempLeadName = commentValue.from.username || commentValue.from.name || '';
            }
          } else {
            leadId = commentValue.from.id;
            tempLeadName = commentValue.from.username || commentValue.from.name || '';
          }
        }
      }

      if (leadId && messageText) {
        const channel = body.object === 'instagram' ? 'instagram' : 'facebook';
        const chatId = `${channel}_${leadId}`;

        let leadName = tempLeadName || ('Lead via ' + (channel === 'instagram' ? 'Instagram' : 'Facebook'));
        let leadAvatar = null;

        const profile = await getMetaProfile(leadId, channel);
        if (profile) {
          leadName = profile.name || leadName;
          leadAvatar = profile.avatar || leadAvatar;
        }

        const { results: existingLeads } = await d1Api.runQuery(`SELECT * FROM leads WHERE id = ? LIMIT 1`, [leadId]);
        const agora = new Date().toISOString();

        if (!existingLeads || existingLeads.length === 0) {
          await d1Api.saveLead({
            id: leadId,
            nome: leadName,
            origem: channel === 'instagram' ? 'Instagram Direct' : 'Facebook Messenger',
            status: 'novo',
            dataCriacao: agora,
            dataUltimaAtividade: agora,
            tags: ['omnichannel', channel],
            avatar: leadAvatar,
            isMetaLead: true
          });
        } else {
          const leadData = existingLeads[0];
          let updatedName = leadData.nome;
          let updatedAvatar = leadData.avatar;

          if (profile) {
            if (!leadData.nome || leadData.nome.startsWith('Lead via')) {
              updatedName = profile.name || leadData.nome;
            }
            if (!leadData.avatar) {
              updatedAvatar = profile.avatar || leadData.avatar;
            }
          }
          await d1Api.executeRun(`UPDATE leads SET dataUltimaAtividade = ?, nome = ?, avatar = ? WHERE id = ?`, [
            agora, updatedName, updatedAvatar, leadId
          ]);
        }

        const { results: chatResults } = await d1Api.runQuery(`SELECT * FROM chats WHERE id = ? LIMIT 1`, [chatId]);
        const hasChat = chatResults && chatResults.length > 0;

        if (!hasChat) {
          const newChat: ChatSession = {
            id: chatId,
            leadId: leadId,
            leadName: leadName,
            channel: channel as any,
            lastMessage: messageText,
            lastTimestamp: agora,
            unreadCount: isEcho ? 0 : 1,
            status: 'active',
            leadAvatar: leadAvatar,
            dataCriacao: agora
          };
          await d1Api.saveChatSession(newChat);
        } else {
          const chatData = chatResults[0];
          const unreadCount = isEcho ? 0 : (chatData.unreadCount || 0) + 1;
          
          let updatedLeadName = chatData.leadName;
          let updatedLeadAvatar = chatData.leadAvatar;

          if (profile) {
            if (!chatData.leadName || chatData.leadName.startsWith('Lead via')) {
              updatedLeadName = profile.name || chatData.leadName;
            }
            if (!chatData.leadAvatar) {
              updatedLeadAvatar = profile.avatar || chatData.leadAvatar;
            }
          }

          await d1Api.executeRun(`UPDATE chats SET lastMessage = ?, lastTimestamp = ?, unreadCount = ?, leadName = ?, leadAvatar = ? WHERE id = ?`, [
            messageText, agora, unreadCount, updatedLeadName, updatedLeadAvatar, chatId
          ]);
        }

        let skipSave = false;

        if (isEcho) {
          const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          const { results: recentMessages } = await d1Api.runQuery(
            `SELECT id FROM messages WHERE chatId = ? AND content = ? AND isIncoming = 0 AND timestamp >= ? LIMIT 1`,
            [chatId, messageText, fiveMinsAgo]
          );
          if (recentMessages && recentMessages.length > 0) {
            skipSave = true;
          }
        }

        if (!skipSave) {
          await d1Api.sendMessage({
            id: Math.random().toString(36).substr(2, 9),
            chatId: chatId,
            senderId: isEcho ? entry.id : leadId,
            senderName: isEcho ? 'Nossa Conta' : leadName,
            content: messageText,
            timestamp: agora,
            type: messageType,
            status: 'delivered',
            isIncoming: !isEcho,
            channel: channel as any,
            leadId: leadId,
            leadName: leadName
          });

          if (!isEcho && !hasChat) {
            try {
              const settings = await d1Api.getSettings();
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
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (value && value.messages && value.messages.length > 0) {
        const message = value.messages[0];
        const contact = value.contacts?.[0];
        
        const rawPhone = message.from; 
        const leadName = contact?.profile?.name || 'Cliente (WhatsApp)';
        const messageText = message.text?.body || '';
        const phoneId = value.metadata?.phone_number_id; 

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

        const { with9, without9 } = normalizeBRNumber(rawPhone);

        const connections = await d1Api.getWhatsappConnections();
        const connection = connections.find(c => c.metaPhoneNumberId === phoneId);
        
        let connectionId = '';
        let connectionName = 'WhatsApp Oficial';
        if (connection) {
          connectionId = connection.id;
          connectionName = connection.name;
        }

        const { results: existingLeads } = await d1Api.runQuery(`SELECT * FROM leads WHERE telefone = ? OR celular = ? LIMIT 1`, [with9, without9]);

        let leadId = '';
        const agora = new Date().toISOString();

        if (existingLeads && existingLeads.length > 0) {
          const leadData = existingLeads[0];
          leadId = leadData.id;
          
          if (!leadData.telefone || !leadData.telefone.includes('9')) {
            await d1Api.executeRun(`UPDATE leads SET telefone = ?, celular = ?, dataUltimaAtividade = ? WHERE id = ?`, [with9, with9, agora, leadId]);
          } else {
            await d1Api.executeRun(`UPDATE leads SET dataUltimaAtividade = ? WHERE id = ?`, [agora, leadId]);
          }
        } else {
          leadId = Math.random().toString(36).substr(2, 9);
          await d1Api.saveLead({
            id: leadId,
            nome: leadName,
            telefone: with9,
            celular: with9,
            origem: `WhatsApp (${connectionName})`,
            status: 'novo',
            dataCriacao: agora,
            dataUltimaAtividade: agora,
            tags: ['whatsapp', 'meta_official']
          });
        }

        const chatId = `whatsapp_${with9}`; 
        const { results: chatResults } = await d1Api.runQuery(`SELECT * FROM chats WHERE id = ? LIMIT 1`, [chatId]);
        const timestampIso = new Date().toISOString();

        if (!chatResults || chatResults.length === 0) {
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
          await d1Api.saveChatSession(newChat);
        } else {
          const currentData = chatResults[0];
          await d1Api.executeRun(`UPDATE chats SET lastMessage = ?, lastTimestamp = ?, unreadCount = ?, status = 'active', connectionId = ?, connectionName = ? WHERE id = ?`, [
             messageText, timestampIso, (currentData.unreadCount || 0) + 1, connectionId, connectionName, chatId
          ]);
        }

        const messageId = message.id;
        await d1Api.sendMessage({
          id: messageId,
          chatId: chatId,
          senderId: leadId,
          senderName: leadName,
          content: messageText,
          timestamp: timestampIso,
          type: 'text',
          status: 'delivered',
          isIncoming: true,
          channel: 'whatsapp',
          leadId: leadId,
          leadName: leadName
        });

        if (!chatResults || chatResults.length === 0) {
          try {
            const settings = await d1Api.getSettings();
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
