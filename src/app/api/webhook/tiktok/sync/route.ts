import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { ChatSession } from '@/types/crm';

export async function GET(req: NextRequest) {
  try {
    const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
    const settings = settingsSnap.exists() ? settingsSnap.data() : {};
    
    const accessToken = settings.omnichannel?.tiktokAccessToken;

    if (!accessToken) {
      return NextResponse.json({ success: false, message: 'TikTok Access Token não configurado.' }, { status: 400 });
    }

    // 1. Buscar vídeos da conta (limitando aos últimos para performance)
    // Nota: O TikTok Business API requer o business_id para alguns endpoints. 
    // Se não tivermos, tentaremos usar os endpoints que aceitam apenas o token.
    const videosRes = await fetch(`https://business-api.tiktok.com/open_api/v1.3/business/video/list/`, {
      headers: { 'Access-Token': accessToken }
    });

    const videosData = await videosRes.json();
    if (!videosRes.ok || videosData.code !== 0) {
      console.error('TikTok API Error (Videos):', videosData);
      return NextResponse.json({ success: false, message: videosData.message || 'Erro ao buscar vídeos do TikTok' }, { status: 500 });
    }

    const videos = videosData.data.list || [];
    let newMessages = 0;

    // 2. Para cada vídeo, buscar comentários
    for (const video of videos) {
      const videoId = video.video_id;
      
      const commentsRes = await fetch(`https://business-api.tiktok.com/open_api/v1.3/business/comment/list/?video_id=${videoId}`, {
        headers: { 'Access-Token': accessToken }
      });

      const commentsData = await commentsRes.json();
      if (!commentsRes.ok || commentsData.code !== 0) continue;

      const comments = commentsData.data.list || [];

      for (const comment of comments) {
        const commentId = comment.comment_id;
        const authorId = comment.user_id;
        const authorName = comment.username || `User ${authorId.substring(0, 5)}`;
        const text = comment.text;
        const timestamp = new Date(comment.create_time * 1000).toISOString();

        // Agrupamos por ID do comentário principal (thread)
        const chatId = `tiktok_${commentId}`;
        const chatRef = doc(db, 'atendimentos_v3', chatId);
        
        // Evitar duplicidade
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
        } else {
          await updateDoc(leadRef, { dataUltimaAtividade: timestamp });
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
        } else {
          await updateDoc(chatRef, {
            lastMessage: text,
            lastTimestamp: timestamp,
            unreadCount: (chatSnap.data()?.unreadCount || 0) + 1,
            status: 'active',
            lastPlatformMessageId: commentId,
            lastVideoId: videoId
          });
        }

        // Salvar Mensagem com ID fixo para evitar duplicidade
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
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
