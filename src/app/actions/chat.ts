'use server';

import { d1Api } from '@/services/d1';

export async function sendOmnichannelMessageAction(
  recipientIdOrPhone: string, 
  channel: string, 
  text: string, 
  connectionId?: string,
  templateData?: { name: string, language: string, components?: any[] },
  mediaUrl?: string,
  mediaMimeType?: string
) {
  try {
    // 1. Lógica para INSTAGRAM e FACEBOOK
    if (channel === 'instagram' || channel === 'facebook') {
      const settings = await d1Api.getSettings();
      
      const token = channel === 'instagram' 
        ? (settings.omnichannel?.instagramAccessToken || settings.instagramAccessToken)
        : (settings.omnichannel?.messengerAccessToken || settings.messengerAccessToken);

      if (!token) {
        return { success: false, error: `Token de acesso não configurado para ${channel}.` };
      }

      const response = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientIdOrPhone },
          message: { text: text }
        })
      });

      const data = await response.json();
      return response.ok ? { success: true, data } : { success: false, error: data.error?.message || 'Erro na API (Meta)' };
    }

    // 2. Lógica para WHATSAPP
    if (channel === 'whatsapp') {
      let targetConnectionId = connectionId;

      // Se não temos um ID de conexão, ou se queremos garantir que usamos a principal
      if (!targetConnectionId) {
        const connections = await d1Api.getWhatsappConnections();
        const principal = connections.find(c => c.isDefault);
        if (principal) {
          targetConnectionId = principal.id;
        }
      }

      if (!targetConnectionId) {
        return { success: false, error: 'Nenhuma conexão WhatsApp (Principal ou Específica) encontrada.' };
      }

      // Buscar os detalhes da conexão específica
      const conn = await d1Api.getWhatsappConnectionById(targetConnectionId);
      if (!conn) {
        return { success: false, error: 'Conexão WhatsApp não encontrada no sistema.' };
      }

      // Buscar Configurações Globais (Para URL global da Evolution API)
      const settings = await d1Api.getSettings();

      // 2.A: Envio via API OFICIAL DA META
      if (conn.type === 'meta_official') {
        const token = conn.metaAccessToken;
        const phoneId = conn.metaPhoneNumberId;
        
        if (!token || !phoneId) {
          return { success: false, error: 'Credenciais da API Oficial ausentes nesta conexão.' };
        }

        // Garante que o número tem o DDI 55 do Brasil se o usuário digitar apenas DDD + Número
        let cleanNumber = recipientIdOrPhone.replace(/\D/g, '');
        if (cleanNumber.length === 10 || cleanNumber.length === 11) {
          cleanNumber = '55' + cleanNumber;
        }

        let body: any = {
          messaging_product: "whatsapp",
          to: cleanNumber
        };

        if (templateData) {
          body.type = "template";
          body.template = {
            name: templateData.name,
            language: { code: templateData.language || 'pt_BR' },
            components: templateData.components || []
          };
        } else {
          body.type = "text";
          body.text = { body: text };
        }

        const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });

        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data.error?.message || 'Erro na API da Meta' };
      }

      // 2.B: Envio via EVOLUTION API
      if (conn.type === 'evolution_api') {
        const apiUrl = settings.omnichannel?.evolutionApiUrl;
        const globalApiKey = settings.omnichannel?.evolutionApiKey;
        const instanceName = conn.evolutionInstanceName?.trim();

        // Validação p/ Modo Simulação
        if (!apiUrl || !globalApiKey) {
          console.warn('Modo Simulação: Mensagem "enviada" localmente pois a URL oficial não está configurada.');
          return { success: true, mock: true, message: 'Mensagem simulada com sucesso.' };
        }

        const isLid = recipientIdOrPhone.includes('@lid') || (recipientIdOrPhone.length > 13 && !recipientIdOrPhone.startsWith('55'));
        let cleanNumber = recipientIdOrPhone.replace(/[^\d@lid]/g, '');
        
        if (isLid && !cleanNumber.includes('@lid')) {
          cleanNumber = cleanNumber.split('@')[0] + '@lid';
        } else if (!isLid && (cleanNumber.length === 10 || cleanNumber.length === 11)) {
          cleanNumber = '55' + cleanNumber;
        }

        let evolutionReqUrl = `${apiUrl.replace(/\/$/, '')}/message/sendText/${instanceName}`;
        let payload: any = {
          number: cleanNumber,
          text: text,
          options: {
            delay: 1200,
            presence: "composing",
            linkPreview: false
          }
        };

        if (mediaUrl) {
          let mt = "document";
          if (mediaMimeType?.startsWith('image/')) mt = 'image';
          else if (mediaMimeType?.startsWith('video/')) mt = 'video';
          else if (mediaMimeType?.startsWith('audio/')) mt = 'audio';

          // Se o mediaUrl for relativo (/api/media...), precisaremos transformar numa URL absoluta
          let finalMediaUrl = mediaUrl;
          if (mediaUrl.startsWith('/api/')) {
             finalMediaUrl = `https://leads.ciasuper.com.br${mediaUrl}`; // Fallback para URL absoluta
          }

          if (mt === 'audio') {
            evolutionReqUrl = `${apiUrl.replace(/\/$/, '')}/message/sendWhatsAppAudio/${instanceName}`;
            payload = {
              number: cleanNumber,
              audio: finalMediaUrl,
              delay: 1200,
              encoding: true
            };
          } else {
            evolutionReqUrl = `${apiUrl.replace(/\/$/, '')}/message/sendMedia/${instanceName}`;
            payload = {
              number: cleanNumber,
              mediatype: mt,
              mimetype: mediaMimeType || "application/octet-stream",
              caption: text !== 'Arquivo enviado' && !text.startsWith('Arquivo enviado:') ? text : '',
              media: finalMediaUrl,
              options: {
                delay: 1200,
                presence: "composing",
                linkPreview: false
              }
            };
          }
        }
        
        console.log(`>>> Enviando para Evolution: ${cleanNumber} (LID: ${isLid}, Media: ${!!mediaUrl})`);

        const response = await fetch(evolutionReqUrl, {
          method: 'POST',
          headers: {
            'apikey': globalApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('>>> Resposta do Docker:', JSON.stringify(data));
        
        return response.ok ? { success: true, data } : { success: false, error: data.error || 'Erro no Docker' };
      }
    }

    // 3. Lógica para TIKTOK
    if (channel === 'tiktok') {
      const settings = await d1Api.getSettings();
      
      let accessToken = settings.omnichannel?.tiktokAccessToken;
      const refreshToken = settings.omnichannel?.tiktokRefreshToken;
      const expiry = settings.omnichannel?.tiktokTokenExpiry;
      const clientKey = settings.omnichannel?.tiktokAppId;
      const clientSecret = settings.omnichannel?.tiktokClientSecret;

      if (!accessToken && !refreshToken) {
        return { success: false, error: 'TikTok não conectado. Vá em Configurações.' };
      }

      // Refresh Token se expirado
      const isExpired = !expiry || new Date(expiry).getTime() < Date.now() + 60000;
      if (isExpired && refreshToken && clientKey && clientSecret) {
        console.log('>>> Refreshing TikTok Token...');
        const formData = new URLSearchParams();
        formData.append('client_key', clientKey);
        formData.append('client_secret', clientSecret);
        formData.append('refresh_token', refreshToken);
        formData.append('grant_type', 'refresh_token');

        const refreshResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData,
        });
        const refreshData = await refreshResponse.json();
        if (refreshResponse.ok) {
          accessToken = refreshData.access_token;
          
          if (!settings.omnichannel) settings.omnichannel = {};
          settings.omnichannel.tiktokAccessToken = accessToken;
          settings.omnichannel.tiktokRefreshToken = refreshData.refresh_token;
          settings.omnichannel.tiktokTokenExpiry = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
          await d1Api.saveSettings(settings);
        }
      }

      const isCommentReply = recipientIdOrPhone.length > 15; // Simplificação para identificar IDs de comentário

      if (isCommentReply) {
        // Enviar como RESPOSTA DE COMENTÁRIO (API V2)
        const response = await fetch(`https://open.tiktokapis.com/v2/video/comment/reply/`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            comment_id: recipientIdOrPhone,
            text: text
          })
        });

        const data = await response.json();
        if (!response.ok || data.error) {
          console.error('TikTok Comment Reply Error:', data);
          return { success: false, error: data.error?.message || 'Erro ao responder comentário no TikTok' };
        }
        return { success: true, data };
      } else {
        // Enviar como MENSAGEM DIRETA (DM - Requer Business API ou Scopes específicos)
        const response = await fetch(`https://open.tiktokapis.com/v2/message/send/`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            recipient_id: recipientIdOrPhone,
            message_type: "TEXT",
            text: text
          })
        });

        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data.error?.message || 'Erro na API do TikTok' };
      }
    }

    // 4. Lógica para YOUTUBE (Comments)
    if (channel === 'youtube') {
      const settings = await d1Api.getSettings();
      
      let accessToken = settings.omnichannel?.youtubeAccessToken;
      const refreshToken = settings.omnichannel?.youtubeRefreshToken;
      const expiry = settings.omnichannel?.youtubeTokenExpiry;
      const clientId = settings.omnichannel?.youtubeClientId;
      const clientSecret = settings.omnichannel?.youtubeClientSecret;

      if (!refreshToken || !clientId || !clientSecret) {
        return { success: false, error: 'YouTube OAuth2 não configurado (Falta conectar o canal).' };
      }

      // Validação básica: IDs de autor do YouTube geralmente começam com UC. 
      // Se o recipient começar com UC, ele provavelmente é o autor e não o comentário.
      if (recipientIdOrPhone.startsWith('UC')) {
        return { success: false, error: 'Aguarde a próxima sincronização. O ID do comentário ainda não foi mapeado para este lead.' };
      }

      // Refresh Token se expirado
      const isExpired = !expiry || new Date(expiry).getTime() < Date.now() + 60000;
      if (isExpired) {
        console.log('>>> Refreshing YouTube Token...');
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });
        const refreshData = await refreshResponse.json();
        if (refreshResponse.ok) {
          accessToken = refreshData.access_token;
          
          if (!settings.omnichannel) settings.omnichannel = {};
          settings.omnichannel.youtubeAccessToken = accessToken;
          settings.omnichannel.youtubeTokenExpiry = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
          await d1Api.saveSettings(settings);
        } else {
          return { success: false, error: 'Falha ao renovar token do YouTube. Tente reconectar o canal.' };
        }
      }

      // Enviar Resposta
      console.log(`>>> Enviando Resposta YouTube: parentId=${recipientIdOrPhone}, text=${text}`);
      
      const body: any = {
        snippet: {
          parentId: recipientIdOrPhone,
          textOriginal: text
        }
      };

      const response = await fetch(`https://www.googleapis.com/youtube/v3/comments?part=snippet`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'GerencyLeads-CRM/1.0'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      console.log('>>> Resposta da API do YouTube:', JSON.stringify(data));

      if (!response.ok) {
        console.error('>>> Erro na API do YouTube Detalhado:', data.error);
        return { success: false, error: data.error?.message || 'Erro ao postar comentário' };
      }

      return { success: true, data };
    }

    return { success: false, error: 'Canal desconhecido.' };

  } catch (error: any) {
    console.log(`Erro ao enviar mensagem via omnichannel:`, error?.message || 'Erro desconhecido');
    return { success: false, error: error?.message || 'Erro interno do servidor ao enviar a mensagem.' };
  }
}
