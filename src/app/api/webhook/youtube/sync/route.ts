export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { ChatMessage, ChatSession, Lead } from '@/types/crm';

export async function GET(req: NextRequest) {
  try {
    const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
    const settings = settingsSnap.exists() ? settingsSnap.data() : {};
    const apiKey = settings.omnichannel?.youtubeApiKey;
    const channelId = settings.omnichannel?.youtubeChannelId;

    if (!apiKey || !channelId) {
      return NextResponse.json({ error: 'YouTube API Key ou Channel ID não configurados.' }, { status: 400 });
    }

    // 1. Buscar os comentários mais recentes no canal
    // Usamos allThreadsRelatedToChannelId para pegar comentários em todos os vídeos
    const response = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&allThreadsRelatedToChannelId=${channelId}&maxResults=20&key=${apiKey}`);
    
    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json({ error: 'Erro na API do YouTube', details: err }, { status: 500 });
    }

    const data = await response.json();
    const comments = data.items || [];
    let newMessagesCount = 0;

    for (const item of comments) {
      const snippet = item.snippet.topLevelComment.snippet;
      const commentId = item.snippet.topLevelComment.id;
      const authorId = snippet.authorChannelId.value;
      const authorName = snippet.authorDisplayName;
      const authorAvatar = snippet.authorProfileImageUrl;
      const text = snippet.textDisplay;
      const timestamp = snippet.publishedAt;

      const chatId = `youtube_${commentId}`;
      const chatRef = doc(db, 'atendimentos_v3', chatId);
      
      // Verificar se essa mensagem já foi salva (para evitar duplicidade no poll)
      const msgQuery = query(collection(db, 'messages'), where('id', '==', commentId));
      const msgSnap = await getDocs(msgQuery);
      
      if (msgSnap.empty) {
        newMessagesCount++;

        // Garantir Lead
        const leadRef = doc(db, 'leads', authorId);
        const leadSnap = await getDoc(leadRef);
        if (!leadSnap.exists()) {
          await setDoc(leadRef, {
            nome: authorName,
            avatar: authorAvatar,
            origem: 'YouTube Comments',
            status: 'novo',
            dataCriacao: new Date().toISOString(),
            tags: ['youtube', 'omnichannel']
          });
        } else {
          await updateDoc(leadRef, {
            dataUltimaAtividade: new Date().toISOString()
          });
        }

        // Garantir ChatSession
        const chatSnap = await getDoc(chatRef);
        if (!chatSnap.exists()) {
          await setDoc(chatRef, {
            id: chatId,
            leadId: authorId,
            leadName: authorName,
            leadAvatar: authorAvatar,
            channel: 'youtube',
            lastMessage: text,
            lastTimestamp: timestamp,
            unreadCount: 1,
            status: 'active',
            lastPlatformMessageId: commentId,
            lastVideoId: item.snippet.videoId,
            dataCriacao: new Date().toISOString()
          });
        } else {
          await updateDoc(chatRef, {
            lastMessage: text,
            lastTimestamp: timestamp,
            unreadCount: (chatSnap.data()?.unreadCount || 0) + 1,
            status: 'active',
            lastPlatformMessageId: commentId,
            lastVideoId: item.snippet.videoId
          });
        }

        // Salvar Mensagem
        await addDoc(collection(db, 'messages'), {
          id: commentId,
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

    return NextResponse.json({ success: true, newMessages: newMessagesCount });
  } catch (error: any) {
    console.error('Erro na sincronização do YouTube:', error);
    return NextResponse.json({ error: 'Internal Error', message: error.message }, { status: 500 });
  }
}
