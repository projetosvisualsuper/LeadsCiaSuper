'use client';
// Updated: 2026-05-07 10:40

import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Send, 
  Smile, 
  Paperclip, 
  MessageCircle, 
  User, 
  CheckCheck, 
  Clock, 
  Hash, 
  ExternalLink,
  ChevronLeft,
  X,
  MessageSquare,
  Trash2
} from 'lucide-react';

const renderSocialIcon = (platform: string, size: number = 24, color?: string) => {
  const svgPaths: Record<string, string> = {
    instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c.796 0 1.441.645 1.441 1.44s-.645 1.44-1.441 1.44c-.795 0-1.439-.645-1.439-1.44s.644-1.44 1.439-1.44z",
    facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
    whatsapp: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
  };

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color || "currentColor"}>
      <path d={svgPaths[platform] || ""} />
    </svg>
  );
};
import { ChatSession, ChatMessage, Lead } from '@/types/crm';
import { api } from '@/services/api';
import { db, storage } from '@/lib/firebase';
import { sendMetaMessageAction } from '@/app/actions/chat';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function AtendimentoPage() {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadDetails, setShowLeadDetails] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);

  const EMOJIS = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😻', '😼', '😽', '🙀', '😿', '😾'];

  // Listener para as sessões de chat
  useEffect(() => {
    const q = query(collection(db, 'chat_sessions'), orderBy('lastTimestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
      setChats(chatList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listener para as mensagens do chat selecionado
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      setSelectedLead(null);
      return;
    }

    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', selectedChatId)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      
      // Ordenar manualmente para evitar erro de índice no Firestore
      msgList.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      setMessages(msgList);
      
      // Marcar como lido
      api.markChatAsRead(selectedChatId);
    }, (error) => {
      console.error("Erro ao carregar mensagens:", error);
    });

    // Carregar dados do lead
    const chat = chats.find(c => c.id === selectedChatId);
    if (chat) {
       // Buscar lead pelo campo 'id' (que contém o ID da plataforma) ou ID do documento
       const leadRef = collection(db, 'leads');
       const qLead = query(leadRef, where('id', '==', chat.leadId));
       getDocs(qLead).then(snap => {
         if (!snap.empty) {
           const leadDoc = snap.docs[0];
           setSelectedLead({ id: leadDoc.id, ...leadDoc.data() } as Lead);
         } else {
           // Tentar buscar pelo ID do documento caso tenha sido salvo assim
           getDoc(doc(db, 'leads', chat.leadId)).then(docSnap => {
             if (docSnap.exists()) setSelectedLead({ id: docSnap.id, ...docSnap.data() } as Lead);
           });
         }
       });
    }

    return () => unsubscribe();
  }, [selectedChatId, chats.length]); // Adicionado chats.length para reagir a mudanças na lista de chats

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(event.target as Node)) {
        setShowChatMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChatId) return;

    const chat = chats.find(c => c.id === selectedChatId);
    if (!chat) return;

    const msg = {
      id: Math.random().toString(36).substr(2, 9),
      chatId: chat.id,
      content: newMessage,
      senderId: 'atendente_admin',
      senderName: 'Atendente',
      timestamp: new Date().toISOString(),
      type: 'text',
      status: 'sent',
      isIncoming: false,
      channel: chat.channel,
      leadId: chat.leadId
    };

    const messageToSend = newMessage;
    setNewMessage('');
    
    try {
      await api.sendMessage(msg);

      if (chat.channel === 'instagram' || chat.channel === 'facebook') {
        const result = await sendMetaMessageAction(
          chat.leadId, 
          chat.channel as 'instagram' | 'facebook',
          messageToSend
        );

        if (!result.success) {
          console.error('Erro ao enviar para Meta:', result.error);
        }
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChatId || !selectedChat) return;

    try {
      setUploading(true);
      const fileRef = ref(storage, `chats/${selectedChatId}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      const msg: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        chatId: selectedChatId,
        senderId: 'atendente_admin',
        senderName: 'Atendente',
        content: url,
        timestamp: new Date().toISOString(),
        type: file.type.startsWith('image/') ? 'image' : 'file',
        status: 'sent',
        isIncoming: false
      };

      await api.sendMessage(msg);

      // Enviar link da imagem para o Meta
      if (chat?.channel && chat?.leadId) {
        await sendMetaMessageAction(
          chat.leadId,
          chat.channel,
          `Arquivo enviado: ${url}`
        );
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleArchiveChat = async () => {
    if (!selectedChatId) return;
    await updateDoc(doc(db, 'chat_sessions', selectedChatId), { status: 'archived' });
    setSelectedChatId(null);
    setShowChatMenu(false);
  };

  const handleDeleteChat = async () => {
    if (!selectedChatId || !confirm('Tem certeza que deseja excluir esta conversa permanentemente?')) return;
    await deleteDoc(doc(db, 'chat_sessions', selectedChatId));
    setSelectedChatId(null);
    setShowChatMenu(false);
  };

  const getChannelIcon = (channel: string, size = 16) => {
    if (['instagram', 'facebook', 'whatsapp'].includes(channel)) {
      return renderSocialIcon(channel, size);
    }
    return <Hash size={size} />;
  };

  const filteredChats = chats.filter(chat => 
    chat.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ 
      height: 'calc(100vh - 4rem)', 
      margin: '-1.5rem', 
      display: 'flex', 
      overflow: 'hidden', 
      background: '#f1f5f9'
    }}>
      
      {/* SIDEBAR DE CONVERSAS */}
      <div style={{ width: '350px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Mensagens</h2>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            <input 
              type="text" 
              placeholder="Buscar conversas..." 
              style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Carregando conversas...</div>
          ) : filteredChats.length > 0 ? (
            filteredChats.map(chat => (
              <div 
                key={chat.id} 
                onClick={() => setSelectedChatId(chat.id)}
                style={{ 
                  padding: '1rem 1.5rem', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  gap: '1rem', 
                  alignItems: 'center',
                  background: selectedChatId === chat.id ? '#f8fafc' : 'transparent',
                  borderLeft: selectedChatId === chat.id ? '4px solid var(--primary)' : '4px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {chat.leadAvatar ? <img src={chat.leadAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={24} color="#94a3b8" />}
                  </div>
                  <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'white', borderRadius: '50%', padding: '2px', display: 'flex' }}>
                    {getChannelIcon(chat.channel, 14)}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.leadName}</h4>
                    <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>
                      {chat.lastTimestamp ? new Date(chat.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.8rem', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.lastMessage}</p>
                    {chat.unreadCount > 0 && (
                      <span style={{ background: 'var(--primary)', color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '10px', minWidth: '18px', textAlign: 'center' }}>
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
               <MessageSquare size={32} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
               <p style={{ fontSize: '0.875rem' }}>Nenhuma conversa encontrada.</p>
            </div>
          )}
        </div>
      </div>

      {/* ÁREA DE CHAT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', position: 'relative' }}>
        {selectedChatId ? (
          <>
            {/* Header do Chat */}
            <header style={{ padding: '0.75rem 1.5rem', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={20} color="#94a3b8" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{chats.find(c => c.id === selectedChatId)?.leadName}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#10b981' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                    Canal: {chats.find(c => c.id === selectedChatId)?.channel.toUpperCase()}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => setShowLeadDetails(!showLeadDetails)}
                  style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: showLeadDetails ? 'var(--primary)' : 'inherit' }}
                >
                  <Filter size={18} />
                </button>
                <div style={{ position: 'relative' }} ref={chatMenuRef}>
                  <button 
                    onClick={() => setShowChatMenu(!showChatMenu)}
                    style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
                  >
                    <MoreVertical size={18} />
                  </button>
                  {showChatMenu && (
                    <div style={{ 
                      position: 'absolute', 
                      top: '100%', 
                      right: 0, 
                      marginTop: '0.5rem', 
                      background: 'white', 
                      borderRadius: '12px', 
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
                      border: '1px solid #e2e8f0',
                      zIndex: 100,
                      width: '180px',
                      overflow: 'hidden'
                    }}>
                      <button 
                        onClick={handleArchiveChat}
                        style={{ width: '100%', padding: '0.75rem 1rem', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <Clock size={14} /> Arquivar Conversa
                      </button>
                      <button 
                        onClick={handleDeleteChat}
                        style={{ width: '100%', padding: '0.75rem 1rem', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <Trash2 size={14} /> Excluir Conversa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Mensagens */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '2rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem',
              minHeight: 0 // Importante para o flex-grow com scroll
            }} className="custom-scrollbar">
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', margin: '2rem 0', opacity: 0.4 }}>
                  <p style={{ fontSize: '0.875rem' }}>Início da conversa</p>
                </div>
              )}
              
              {messages.map((msg, i) => {
                const isFirstOfGroup = i === 0 || messages[i-1].isIncoming !== msg.isIncoming;
                return (
                  <div 
                    key={msg.id} 
                    style={{ 
                      maxWidth: '70%', 
                      alignSelf: msg.isIncoming ? 'flex-start' : 'flex-end',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    {isFirstOfGroup && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.5, marginLeft: msg.isIncoming ? '12px' : 0, marginRight: !msg.isIncoming ? '12px' : 0, textAlign: msg.isIncoming ? 'left' : 'right' }}>
                        {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <div 
                      style={{ 
                        padding: msg.type === 'image' ? '4px' : '0.75rem 1rem', 
                        borderRadius: msg.isIncoming ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                        background: msg.isIncoming ? 'white' : 'var(--primary)',
                        color: msg.isIncoming ? '#1e293b' : 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        fontSize: '0.9rem',
                        lineHeight: 1.5,
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {msg.type === 'image' ? (
                        <img 
                          src={msg.content} 
                          alt="Attachment" 
                          style={{ maxWidth: '100%', maxHeight: '300px', display: 'block', borderRadius: '12px', cursor: 'pointer' }} 
                          onClick={() => window.open(msg.content, '_blank')}
                        />
                      ) : msg.type === 'file' ? (
                        <a href={msg.content} target="_blank" style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                          <Paperclip size={16} /> <span>Documento</span>
                        </a>
                      ) : (
                        msg.content
                      )}
                      {!msg.isIncoming && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px', paddingRight: msg.type === 'image' ? '8px' : 0 }}>
                          <CheckCheck size={14} style={{ opacity: 0.7 }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de Mensagem */}
            <footer style={{ padding: '1.5rem', background: 'white', borderTop: '1px solid #e2e8f0' }}>
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    style={{ color: showEmojiPicker ? 'var(--primary)' : '#64748b', padding: '0.5rem', cursor: 'pointer' }}
                  >
                    <Smile size={22} />
                  </button>
                  {showEmojiPicker && (
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '100%', 
                      left: 0, 
                      marginBottom: '1rem', 
                      background: 'white', 
                      borderRadius: '16px', 
                      boxShadow: '0 10px 40px rgba(0,0,0,0.15)', 
                      border: '1px solid #e2e8f0', 
                      padding: '1rem', 
                      width: '320px', 
                      height: '250px', 
                      overflowY: 'auto',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(8, 1fr)',
                      gap: '5px',
                      zIndex: 100
                    }}>
                      {EMOJIS.map(emoji => (
                        <button 
                          key={emoji} 
                          type="button" 
                          onClick={() => {
                            setNewMessage(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          style={{ fontSize: '1.25rem', padding: '5px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px' }}
                          className="hover-bg"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={handleFileUpload} 
                  />
                  <button 
                    type="button" 
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ color: uploading ? 'var(--primary)' : '#64748b', padding: '0.5rem', cursor: 'pointer' }}
                  >
                    <Paperclip size={22} />
                  </button>
                </div>
                <input 
                  type="text" 
                  placeholder="Escreva sua mensagem..." 
                  style={{ flex: 1, padding: '0.8rem 1.2rem', borderRadius: '30px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.95rem' }}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '50%', 
                    background: newMessage.trim() ? 'var(--primary)' : '#e2e8f0', 
                    color: 'white', 
                    border: 'none', 
                    cursor: newMessage.trim() ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <Send size={20} style={{ marginLeft: '3px' }} />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '1.5rem' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
              <MessageSquare size={48} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>Central de Atendimento</h3>
              <p>Selecione uma conversa para iniciar o atendimento omnichannel.</p>
            </div>
          </div>
        )}
      </div>

      {/* PAINEL DE DETALHES DO LEAD */}
      {selectedChatId && showLeadDetails && (
        <div style={{ width: '320px', background: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease-out' }}>
          <header style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 800 }}>Sobre o Lead</h3>
            <button onClick={() => setShowLeadDetails(false)} style={{ opacity: 0.4 }}><X size={20} /></button>
          </header>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <User size={40} color="#94a3b8" />
              </div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedLead?.nome}</h4>
              <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>{selectedLead?.email || 'Sem e-mail cadastrado'}</p>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.4, display: 'block', marginBottom: '0.5rem' }}>Tags do Lead</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {selectedLead?.tags && selectedLead.tags.length > 0 ? (
                    selectedLead.tags.map(tag => (
                      <span key={tag} style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: '6px' }}>#{tag}</span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Sem tags</span>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.4, display: 'block', marginBottom: '0.5rem' }}>Informações</label>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <MessageCircle size={16} opacity={0.5} />
                    <span>{selectedLead?.celular || selectedLead?.telefone || 'Não informado'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <Clock size={16} opacity={0.5} />
                    <span>Cadastrado em {selectedLead ? new Date(selectedLead.dataCriacao).toLocaleDateString() : '...'}</span>
                  </div>
                </div>
              </div>

              {selectedLead && (
                <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                  <p style={{ fontSize: '0.75rem', lineHeight: 1.5, color: '#4338ca' }}>
                    <strong>Nota do CRM:</strong> Este lead veio através de <strong>{selectedLead.origem}</strong>.
                  </p>
                </div>
              )}

              <a 
                href={`/leads?search=${selectedLead?.email || selectedLead?.nome}`} 
                className="btn btn-outline" 
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}
              >
                Ver no CRM <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .hover-bg:hover {
          background-color: #f1f5f9 !important;
        }
      `}</style>
    </div>
  );
}
