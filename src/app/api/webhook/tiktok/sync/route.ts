export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  try {
    const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
    const settings = settingsSnap.exists() ? settingsSnap.data() : {};
    
    let accessToken = settings.omnichannel?.tiktokAccessToken;
    const refreshToken = settings.omnichannel?.tiktokRefreshToken;
    const expiry = settings.omnichannel?.tiktokTokenExpiry;
    const clientKey = settings.omnichannel?.tiktokAppId;
    const clientSecret = settings.omnichannel?.tiktokClientSecret;

    if (!accessToken && !refreshToken) {
      return NextResponse.json({ success: false, message: 'TikTok não conectado.' }, { status: 400 });
    }

    // Refresh Token se expirado
    const isExpired = !expiry || new Date(expiry).getTime() < Date.now() + 60000;
    if (isExpired && refreshToken && clientKey && clientSecret) {
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
        await updateDoc(doc(db, 'settings', 'global'), {
          'omnichannel.tiktokAccessToken': accessToken,
          'omnichannel.tiktokRefreshToken': refreshData.refresh_token,
          'omnichannel.tiktokTokenExpiry': new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
        });
      }
    }

    // 1. Buscar vídeos da conta (API V2)
    const videosRes = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=id,title`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_count: 10 })
    });

    const videosText = await videosRes.text();
    let videosData;
    try {
      videosData = JSON.parse(videosText);
    } catch (e) {
      throw new Error(`TikTok video/list returned HTML/Invalid JSON (Status ${videosRes.status}): ${videosText.substring(0, 150)}`);
    }
    if (!videosRes.ok || (videosData.error && videosData.error.code !== 'ok')) {
      const errMsg = videosData.error?.message || videosData.message || JSON.stringify(videosData);
      return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
    }

    const videos = videosData.data?.videos || [];
    let newMessages = 0;

    // 2. Para cada vídeo, buscar comentários
    for (const video of videos) {
      const videoId = video.id;
      
      const commentsRes = await fetch(`https://open.tiktokapis.com/v2/video/comment/list/?fields=id,video_id,user_id,create_time,text`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: videoId, max_count: 20 })
      });

      const commentsText = await commentsRes.text();
      let commentsData;
      try {
        commentsData = JSON.parse(commentsText);
      } catch (e) {
        console.warn(`[TikTok Sync] Falha ao buscar comentários (Status ${commentsRes.status}). Endpoint indisponível nesta versão da API.`);
        continue;
      }
      if (!commentsRes.ok || (commentsData.error && commentsData.error.code !== 'ok')) continue;

      const comments = commentsData.data?.comments || [];

      for (const comment of comments) {
        const commentId = comment.id;
        const authorId = comment.user_id || `user_${videoId}`;
        const authorName = comment.username || 'TikTok User';
        const text = comment.text;
        const timestamp = new Date(comment.create_time * 1000).toISOString();

        const chatId = `tiktok_${commentId}`;
        const chatRef = doc(db, 'atendimentos_v3', chatId);
        
        const msgId = `tiktok_msg_${commentId}`;
        const msgCheck = await getDoc(doc(db, 'messages', msgId));
        if (msgCheck.exists()) continue;

        newMessages++;

        // Garantir Lead
        const leadRef = doc(db, 'leads', authorId);
        const leadSnap = await getDoc(leadRef);
        if (!leadSnap.exists()) {
          await setDoc(leadRef, {
            nome: authorName,
            origem: 'TikTok Comments',
            status: 'novo',
            dataCriacao: timestamp,
            tags: ['tiktok', 'omnichannel']
          });
        }

        // Garantir Sessão de Chat
        const chatSnap = await getDoc(chatRef);
        if (!chatSnap.exists()) {
          await setDoc(chatRef, {
            id: chatId,
            leadId: authorId,
            leadName: authorName,
            channel: 'tiktok',
            lastMessage: text,
            lastTimestamp: timestamp,
            unreadCount: 1,
            status: 'active',
            lastPlatformMessageId: commentId,
            lastVideoId: videoId,
            dataCriacao: timestamp
          });
        }

        // Salvar Mensagem
        await setDoc(doc(db, 'messages', msgId), {
          id: msgId,
          chatId: chatId,
          senderId: authorId,
          senderName: authorName,
          content: text,
          timestamp: timestamp,
          type: 'text',
          status: 'delivered',
          isIncoming: true
        });
      }
    }

    return NextResponse.json({ success: true, newMessages });
  } catch (error) {
    console.error('Error syncing TikTok:', error);
    return NextResponse.json({ success: false, message: `Internal Server Error: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
