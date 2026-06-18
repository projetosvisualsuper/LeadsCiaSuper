'use client';
// Updated: 2026-05-07 10:40

import { useState, useEffect, useRef, Suspense, Fragment } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Trash2,
  Loader2,
  Reply,
  Forward,
  Sparkles,
  Link,
  ChevronDown
} from 'lucide-react';

const renderSocialIcon = (platform: string, size: number = 24, color?: string) => {
  const svgPaths: Record<string, string> = {
    instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c.796 0 1.441.645 1.441 1.44s-.645 1.44-1.441 1.44c-.795 0-1.439-.645-1.439-1.44s.644-1.44 1.439-1.44z",
    facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
    whatsapp: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
    tiktok: "M12.525.02c1.31 0 2.591.21 3.824.63v4.2c-1.31-.63-2.73-.945-4.2-.945v4.2c2.73 0 5.04 1.89 5.67 4.515.63 2.625-.42 5.355-2.625 6.93a7.35 7.35 0 01-4.305 1.365c-4.095 0-7.35-3.255-7.35-7.35 0-3.15 1.995-5.985 4.935-6.93V.02zm0 0v0z",
    youtube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
  };

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color || "currentColor"}>
      <path d={svgPaths[platform] || ""} />
    </svg>
  );
};
import { ChatSession, ChatMessage, Lead } from '@/types/crm';

const META_TEMPLATES = [
  "Olá! Aqui é da equipe de atendimento. Recebemos seu contato, como podemos ajudar hoje?",
  "Oi! Percebi que você se interessou pelas nossas ofertas. Posso te enviar mais detalhes?",
  "Olá! Faz um tempo que não nos falamos. Ainda tem interesse em nossos serviços?",
  "Lembrete: Sua oferta especial expira em breve! Gostaria de aproveitar?"
];

function AtendimentoContent() {
  const searchParams = useSearchParams();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showLeadDetails, setShowLeadDetails] = useState(true);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  
  const [syncingYoutube, setSyncingYoutube] = useState(false);
  const [syncingTiktok, setSyncingTiktok] = useState(false);
  
  // Estados para Filtros de Mensagens / Conversas
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterUnread, setFilterUnread] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('active'); // active | archived | all
  const [filterPeriod, setFilterPeriod] = useState<string>('all'); // all | today | 7d | 30d

  // Efeito para capturar busca vinda de outras páginas (como Leads)
  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  const EMOJIS = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😻', '😼', '😽', '🙀', '😿', '😾'];

  // Carregar sessões de chat e mantê-las atualizadas via polling
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch(`/api/chats?t=${Date.now()}`);
        if (res.ok) {
          const chatList = await res.json();
          setChats(chatList);
        }
      } catch (err) {
        console.error('Erro ao carregar chats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
    const interval = setInterval(() => {
      if (!document.hidden) fetchChats();
    }, 10000);

    const handleVisibilityChange = () => {
      if (!document.hidden) fetchChats();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Carregar conexões disponíveis
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const res = await fetch('/api/chats?type=connections');
        if (res.ok) {
          const list = await res.json();
          setConnections(list);
        }
      } catch (err) {
        console.error('Erro ao buscar conexões:', err);
      }
    };
    fetchConnections();
  }, []);

  // Polling para mensagens do chat selecionado e dados do lead
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      setSelectedLead(null);
      return;
    }

    const fetchMessagesAndLead = async () => {
      try {
        const res = await fetch(`/api/chats?chatId=${encodeURIComponent(selectedChatId)}`);
        if (res.ok) {
          const msgList = await res.json();
          msgList.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          setMessages(msgList.slice(-50));
        }
      } catch (err) {
        console.error("Erro ao carregar mensagens:", err);
      }
    };

    const chat = chats.find(c => c.id === selectedChatId);
    if (chat) {
      fetch(`/api/chats?leadId=${encodeURIComponent(chat.leadId)}`)
        .then(res => res.ok ? res.json() : null)
        .then(leadData => {
          if (leadData) setSelectedLead(leadData);
        })
        .catch(err => console.error("Erro ao buscar lead:", err));
    }

    fetchMessagesAndLead();
    const interval = setInterval(() => {
      if (!document.hidden) fetchMessagesAndLead();
    }, 5000);

    const handleVisibilityChange = () => {
      if (!document.hidden) fetchMessagesAndLead();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedChatId, chats.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        setShowChatMenu(false);
      }
      
      const target = e.target as Element;
      if (!target.closest('.message-menu-container') && !target.closest('.message-menu-trigger')) {
        setActiveMessageMenu(null);
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
      await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });

      if (['instagram', 'facebook', 'whatsapp', 'tiktok', 'youtube'].includes(chat.channel)) {
        // Priorizar o leadId da sessão de chat se for WhatsApp, pois ele contém o número real que enviou a mensagem
        let recipient = chat.leadId;

        if (chat.channel === 'whatsapp') {
          // Se o leadId não parecer um número, tenta o celular do cadastro
          if (!/^\d+$/.test(chat.leadId.split('@')[0]) && selectedLead) {
            recipient = (selectedLead.celular || selectedLead.telefone || chat.leadId).replace(/\D/g, '');
          } else {
            recipient = chat.leadId.split('@')[0];
          }
        }

        if (chat.channel === 'youtube' && chat.lastPlatformMessageId) {
          recipient = chat.lastPlatformMessageId;
        }
        
        if (chat.channel === 'tiktok') {
          recipient = chat.id.replace('tiktok_', '');
        }

        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sendOmnichannel',
            recipient,
            channel: chat.channel,
            message: messageToSend,
            connectionId: chat.connectionId
          })
        });
        const result = await response.json();

        if (!result.success) {
          console.error(`Erro ao enviar para ${chat.channel}:`, result.error);
          alert(`Falha ao enviar mensagem: ${result.error}`);
          // Reverter status da mensagem
          await fetch('/api/chats', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: msg.id, status: 'failed' })
          });
        } else if (result.mock) {
          console.log('Mensagem processada em modo simulação.');
        }
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const chat = chats.find(c => c.id === selectedChatId);
    if (!file || !selectedChatId || !chat) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', selectedChatId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Falha no upload do servidor.');
      }

      const { url, mimeType } = await response.json();

      let msgType: 'image' | 'video' | 'audio' | 'file' | 'text' = 'file';
      if (file.type.startsWith('image/')) msgType = 'image';
      else if (file.type.startsWith('video/')) msgType = 'video';
      else if (file.type.startsWith('audio/')) msgType = 'audio';

      const msg: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        chatId: selectedChatId,
        senderId: 'atendente_admin',
        senderName: 'Atendente',
        content: file.name,
        timestamp: new Date().toISOString(),
        type: msgType,
        status: 'sent',
        isIncoming: false,
        mediaUrl: url,
        mediaMimeType: mimeType || file.type
      };

      await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });

      if (['instagram', 'facebook', 'whatsapp'].includes(chat.channel) && chat?.leadId) {
        const recipient = chat.channel === 'whatsapp' && selectedLead 
          ? (selectedLead.celular || selectedLead.telefone || '').replace(/\D/g, '') 
          : chat.leadId;

        await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sendOmnichannel',
            recipient,
            channel: chat.channel,
            message: `Arquivo enviado: ${file.name}`,
            connectionId: chat.connectionId,
            mediaUrl: url,
            mediaMimeType: mimeType || file.type
          })
        });
      }
    } catch (error: any) {
      console.error('Erro no upload:', error);
      alert('Erro ao enviar arquivo: ' + (error.message || error));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm('Deseja realmente excluir esta mensagem? Ela será apagada apenas do painel CRM.')) return;
    try {
      const response = await fetch(`/api/chats?messageId=${msgId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Falha ao excluir mensagem');
      
      setMessages(prev => prev.filter(m => m.id !== msgId));
      setActiveMessageMenu(null);
    } catch (error) {
      console.error('Erro ao excluir mensagem:', error);
      alert('Erro ao excluir mensagem');
    }
  };

  const handleCopyMessage = (content: string, mediaUrl?: string) => {
    const textToCopy = mediaUrl || content;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => alert('Conteúdo copiado!'))
        .catch(err => console.error('Erro ao copiar:', err));
    }
    setActiveMessageMenu(null);
  };

  const handleArchiveChat = async () => {
    if (!selectedChatId) return;
    try {
      await fetch('/api/chats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedChatId, status: 'archived' })
      });
      setSelectedChatId(null);
      setShowChatMenu(false);
    } catch (err) {
      console.error('Erro ao arquivar conversa:', err);
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedChatId || !confirm('Tem certeza que deseja excluir esta conversa permanentemente?')) return;
    try {
      await fetch(`/api/chats?chatId=${encodeURIComponent(selectedChatId)}`, {
        method: 'DELETE'
      });
      setSelectedChatId(null);
      setShowChatMenu(false);
    } catch (err) {
      console.error('Erro ao excluir conversa:', err);
    }
  };

  const handleChangeChatConnection = async (connId: string) => {
    if (!selectedChatId) return;
    const conn = connections.find((c: any) => c.id === connId);
    try {
      await fetch('/api/chats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedChatId,
          connectionId: connId,
          connectionName: conn?.name || conn?.evolutionInstanceName || 'WhatsApp'
        })
      });
    } catch (err) {
      console.error('Erro ao alterar conexão do chat:', err);
    }
  };

  const getChannelIcon = (channel: string, size = 16) => {
    if (['instagram', 'facebook', 'whatsapp', 'tiktok', 'youtube'].includes(channel)) {
      return renderSocialIcon(channel, size);
    }
    return <Hash size={size} />;
  };

  const handleStartNewChat = async () => {
    if (!searchQuery) return;
    
    setLoading(true);
    try {
      let cleanNumber = searchQuery.replace(/\D/g, '');
      if (cleanNumber.length === 10 || cleanNumber.length === 11) {
        cleanNumber = '55' + cleanNumber;
      }
      const chatId = `whatsapp_${cleanNumber}`;
      const legacyChatId = `${cleanNumber}@s.whatsapp.net`;
      const leadNameFromUrl = searchParams.get('name');
      
      // Verifica se já existe (prevenção para não duplicar a conversa)
      const existing = chats.find(c => 
        c.id === chatId || 
        c.id === legacyChatId || 
        (c.leadId && c.leadId.includes(cleanNumber))
      );
      
      if (existing) {
        setSelectedChatId(existing.id);
        return;
      }

      const newChat: ChatSession = {
        id: chatId,
        leadId: cleanNumber,
        leadName: leadNameFromUrl || `Lead ${cleanNumber}`,
        channel: 'whatsapp',
        lastMessage: 'Iniciando conversa...',
        lastTimestamp: new Date().toISOString(),
        unreadCount: 0,
        status: 'active',
        connectionId: connections[0]?.id || '', // Usa a primeira conexão disponível
        dataCriacao: new Date().toISOString()
      };

      await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveSession', session: newChat })
      });
      setSelectedChatId(chatId);
    } catch (error) {
      console.error('Erro ao iniciar chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    // 1. Filtro por Busca (Nome, Última Mensagem ou ID)
    const matchesSearch = 
      (chat.leadName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.leadId || '').includes(searchQuery);

    // 2. Filtro por Canal
    const matchesChannel = filterChannel === 'all' || chat.channel === filterChannel;

    // 3. Filtro de Não Lidas
    const matchesUnread = !filterUnread || (chat.unreadCount || 0) > 0;

    // 4. Filtro por Status da Conversa (Ativa vs. Arquivada)
    const chatStatus = chat.status || 'active';
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && chatStatus === 'active') || 
      (filterStatus === 'archived' && chatStatus === 'archived');

    // 5. Filtro por Período da Conversa
    const matchesPeriod = (() => {
      if (filterPeriod === 'all') return true;
      const chatDate = new Date(chat.lastTimestamp || chat.dataCriacao || 0);
      const now = new Date();
      if (filterPeriod === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        const chatDateStr = chatDate.toISOString().split('T')[0];
        return chatDateStr === todayStr;
      }
      if (filterPeriod === '7d') {
        const limitDate = new Date(now);
        limitDate.setDate(now.getDate() - 7);
        return chatDate >= limitDate;
      }
      if (filterPeriod === '30d') {
        const limitDate = new Date(now);
        limitDate.setDate(now.getDate() - 30);
        return chatDate >= limitDate;
      }
      return true;
    })();

    return matchesSearch && matchesChannel && matchesUnread && matchesStatus && matchesPeriod;
  });

  const activeChat = chats.find(c => c.id === selectedChatId);

  const formatMessageDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }
  };

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Mensagens</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={async () => {
                  if (syncingYoutube) return;
                  setSyncingYoutube(true);
                  try {
                    const res = await fetch('/api/webhook/youtube/sync');
                    const data = await res.json();
                    if (data.success) {
                      alert(`${data.newMessages} novas mensagens do YouTube sincronizadas!`);
                    } else {
                      alert('Erro ao sincronizar YouTube: ' + (data.message || 'Erro desconhecido'));
                    }
                  } catch (e: any) {
                    alert('Erro ao sincronizar YouTube: ' + e.message);
                  } finally {
                    setSyncingYoutube(false);
                  }
                }}
                title="Sincronizar YouTube"
                disabled={syncingYoutube}
                style={{ background: 'none', border: 'none', cursor: syncingYoutube ? 'wait' : 'pointer', opacity: syncingYoutube ? 0.8 : 0.5, padding: '5px' }}
              >
                {syncingYoutube ? <Loader2 size={18} className="animate-spin" /> : renderSocialIcon('youtube', 18)}
              </button>
              <button 
                onClick={async () => {
                  if (syncingTiktok) return;
                  setSyncingTiktok(true);
                  try {
                    const res = await fetch('/api/webhook/tiktok/sync');
                    const data = await res.json();
                    if (data.success) {
                      alert(`${data.newMessages} novas mensagens do TikTok sincronizadas!`);
                    } else {
                      alert('Erro ao sincronizar TikTok: ' + (data.message || 'Erro desconhecido'));
                    }
                  } catch (e: any) {
                    alert('Erro ao sincronizar TikTok: ' + e.message);
                  } finally {
                    setSyncingTiktok(false);
                  }
                }}
                title="Sincronizar TikTok"
                disabled={syncingTiktok}
                style={{ background: 'none', border: 'none', cursor: syncingTiktok ? 'wait' : 'pointer', opacity: syncingTiktok ? 0.8 : 0.5, padding: '5px' }}
              >
                {syncingTiktok ? <Loader2 size={18} className="animate-spin" /> : renderSocialIcon('tiktok', 18)}
              </button>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            {searchQuery ? (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedChatId(null);
                  window.history.replaceState({}, '', '/atendimento');
                }}
                style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}
                title="Voltar para todas as conversas"
              >
                <ChevronLeft size={20} />
              </button>
            ) : (
              <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            )}
            <input 
              type="text" 
              placeholder="Buscar conversas..." 
              style={{ width: '100%', padding: '0.6rem 2.5rem 0.6rem 2.5rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }}
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                if (e.target.value === '') {
                  window.history.replaceState({}, '', '/atendimento');
                }
              }}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  window.history.replaceState({}, '', '/atendimento');
                }}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: '#e2e8f0', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0.8 }}
              >
                <X size={12} color="#475569" />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
            <select 
              value={filterChannel}
              onChange={e => setFilterChannel(e.target.value)}
              style={{ 
                flex: 1, 
                padding: '0.45rem 0.75rem', 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0', 
                fontSize: '0.8rem', 
                fontWeight: 600, 
                color: '#475569',
                background: '#f8fafc',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">Todos os Canais</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
            </select>

            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ 
                flex: 1, 
                padding: '0.45rem 0.75rem', 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0', 
                fontSize: '0.8rem', 
                fontWeight: 600, 
                color: '#475569',
                background: '#f8fafc',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="active">Conversas Ativas</option>
              <option value="archived">Arquivadas</option>
              <option value="all">Todas</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
            <select 
              value={filterPeriod}
              onChange={e => setFilterPeriod(e.target.value)}
              style={{ 
                flex: 1, 
                padding: '0.45rem 0.75rem', 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0', 
                fontSize: '0.8rem', 
                fontWeight: 600, 
                color: '#475569',
                background: '#f8fafc',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">Todo o período</option>
              <option value="today">Hoje</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
            </select>

            <button
              onClick={() => setFilterUnread(!filterUnread)}
              style={{
                flex: 1,
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: filterUnread ? 'var(--primary)' : '#e2e8f0',
                background: filterUnread ? 'rgba(99, 102, 241, 0.1)' : '#f8fafc',
                color: filterUnread ? 'var(--primary)' : '#475569',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              Não lidas
              {chats.filter(c => (c.unreadCount || 0) > 0).length > 0 && (
                <span style={{ 
                  background: 'var(--primary)', 
                  color: 'white', 
                  fontSize: '0.65rem', 
                  borderRadius: '50%', 
                  width: '16px', 
                  height: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: 800
                }}>
                  {chats.filter(c => (c.unreadCount || 0) > 0).length}
                </span>
              )}
            </button>
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
                  background: selectedChatId === chat.id 
                    ? '#f8fafc' 
                    : ((chat.unreadCount || 0) > 0 ? '#f0fdf4' : 'transparent'),
                  borderLeft: selectedChatId === chat.id 
                    ? '4px solid var(--primary)' 
                    : ((chat.unreadCount || 0) > 0 ? '4px solid #22c55e' : '4px solid transparent'),
                  transition: 'all 0.2s'
                }}
                className="hover:bg-slate-50"
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: (chat.unreadCount || 0) > 0 ? 700 : 600, color: (chat.unreadCount || 0) > 0 ? '#1e293b' : 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.leadName}</h4>
                    <span style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: (chat.unreadCount || 0) > 0 ? 600 : 400, color: (chat.unreadCount || 0) > 0 ? '#22c55e' : 'inherit' }}>
                      {chat.lastTimestamp ? new Date(chat.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ 
                        fontSize: '0.8rem', 
                        color: (chat.unreadCount || 0) > 0 ? '#475569' : '#64748b',
                        fontWeight: (chat.unreadCount || 0) > 0 ? 600 : 400,
                        margin: 0,
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis' 
                      }}>
                        {chat.lastMessage}
                      </p>
                    </div>
                    {(chat.unreadCount || 0) > 0 && (
                      <span style={{ 
                        background: '#22c55e', 
                        color: 'white', 
                        fontSize: '0.7rem', 
                        fontWeight: 'bold', 
                        minWidth: '20px',
                        height: '20px',
                        borderRadius: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: '0 6px',
                        flexShrink: 0
                      }}>
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
               <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Nenhuma conversa encontrada.</p>
               {searchQuery && (
                 <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', fontSize: '0.8rem' }}
                  onClick={handleStartNewChat}
                 >
                   <Send size={14} /> Iniciar chat com {searchQuery}
                 </button>
               )}
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

              {chats.find(c => c.id === selectedChatId)?.connectionName && (
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ 
                    background: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    padding: '0.4rem 1rem', 
                    borderRadius: '20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    color: '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}>
                    <MessageCircle size={14} color="#10b981" />
                    Conexão: <span style={{ color: '#0f172a' }}>{chats.find(c => c.id === selectedChatId)?.connectionName}</span>
                  </div>
                </div>
              )}

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
                const showDateSeparator = i === 0 || new Date(messages[i-1].timestamp).toDateString() !== new Date(msg.timestamp).toDateString();
                const dateLabel = showDateSeparator ? formatMessageDate(msg.timestamp) : '';

                return (
                  <Fragment key={msg.id}>
                    {showDateSeparator && (
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
                        <span style={{ background: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                          {dateLabel}
                        </span>
                      </div>
                    )}
                    <div 
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
                      onMouseEnter={() => setHoveredMessageId(msg.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                      style={{ 
                        padding: msg.type === 'image' ? '4px' : '0.75rem 1rem', 
                        borderRadius: msg.isIncoming ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                        background: msg.isIncoming ? 'white' : 'var(--primary)',
                        color: msg.isIncoming ? '#1e293b' : 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        fontSize: '0.9rem',
                        lineHeight: 1.5,
                        position: 'relative',
                      }}
                    >
                      {/* Botão de Menu */}
                      {(hoveredMessageId === msg.id || activeMessageMenu === msg.id) && (
                        <button
                          className="message-menu-trigger"
                          onClick={() => setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: msg.isIncoming ? '-30px' : 'auto',
                            left: !msg.isIncoming ? '-30px' : 'auto',
                            background: 'rgba(255,255,255,0.9)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '50%',
                            padding: '4px',
                            cursor: 'pointer',
                            color: '#64748b',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                            zIndex: 10
                          }}
                        >
                          <ChevronDown size={16} />
                        </button>
                      )}

                      {/* Dropdown Menu */}
                      {activeMessageMenu === msg.id && (
                        <div
                          className="message-menu-container"
                          style={{
                            position: 'absolute',
                            top: '30px',
                            right: msg.isIncoming ? '-180px' : 'auto',
                            left: !msg.isIncoming ? '-180px' : 'auto',
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            padding: '4px 0',
                            minWidth: '160px',
                            zIndex: 20,
                            color: '#1e293b'
                          }}
                        >
                          <button onClick={() => { setNewMessage(`> ${msg.content?.substring(0, 50)}...\n\n`); setActiveMessageMenu(null); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <Reply size={14} /> Responder
                          </button>
                          <button onClick={() => { alert('Em breve'); setActiveMessageMenu(null); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <Forward size={14} /> Encaminhar
                          </button>
                          <button onClick={() => { alert('Em breve'); setActiveMessageMenu(null); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <Sparkles size={14} /> Sugerir resposta
                          </button>
                          <button onClick={() => handleCopyMessage(msg.content, msg.mediaUrl)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <Link size={14} /> Copiar link/texto
                          </button>
                          <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
                          <button onClick={() => handleDeleteMessage(msg.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#ef4444' }}>
                            <Trash2 size={14} /> Excluir
                          </button>
                        </div>
                      )}

                      {msg.mediaUrl ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {msg.type === 'image' && (
                            <img 
                              src={msg.mediaUrl} 
                              alt="Imagem" 
                              style={{ maxWidth: '100%', maxHeight: '250px', display: 'block', borderRadius: '8px', cursor: 'pointer' }} 
                              onClick={() => window.open(msg.mediaUrl, '_blank')}
                            />
                          )}
                          {msg.type === 'video' && (
                            <video 
                              src={msg.mediaUrl} 
                              controls 
                              style={{ maxWidth: '100%', maxHeight: '250px', display: 'block', borderRadius: '8px' }} 
                            />
                          )}
                          {msg.type === 'audio' && (
                            <audio 
                              src={msg.mediaUrl} 
                              controls 
                              style={{ maxWidth: '100%', display: 'block' }} 
                            />
                          )}
                          {msg.type === 'file' && (
                            <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', background: 'rgba(0,0,0,0.05)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                              <Paperclip size={16} /> <span>Abrir Documento</span>
                            </a>
                          )}
                          {/* Renderiza a legenda (se houver) e não for os textos padrão */}
                          {msg.content && !['📷 Imagem', '🎥 Vídeo', '🎵 Áudio', '📄 Documento'].includes(msg.content) && (
                            <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                          )}
                        </div>
                      ) : msg.type === 'image' && msg.content.startsWith('http') ? (
                        <img 
                          src={msg.content} 
                          alt="Attachment" 
                          style={{ maxWidth: '100%', maxHeight: '250px', display: 'block', borderRadius: '8px', cursor: 'pointer' }} 
                          onClick={() => window.open(msg.content, '_blank')}
                        />
                      ) : msg.type === 'file' && msg.content.startsWith('http') ? (
                        <a href={msg.content} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                          <Paperclip size={16} /> <span>Documento</span>
                        </a>
                      ) : (
                        <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                      )}
                      {!msg.isIncoming && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px', paddingRight: msg.type === 'image' ? '8px' : 0 }}>
                          <CheckCheck size={14} style={{ opacity: 0.7 }} />
                        </div>
                      )}
                    </div>
                  </div>
                  </Fragment>
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
                    style={{ color: uploading ? 'var(--primary)' : '#64748b', padding: '0.5rem', cursor: 'pointer', border: 'none', background: 'transparent' }}
                  >
                    <Paperclip size={22} />
                  </button>
                  
                  {activeChat?.channel === 'whatsapp' && (
                    <div style={{ position: 'relative' }}>
                      <button 
                        type="button" 
                        onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                        style={{ color: showTemplatePicker ? 'var(--primary)' : '#64748b', padding: '0.5rem', cursor: 'pointer', border: 'none', background: 'transparent' }}
                        title="Modelos Pré-Aprovados (Templates)"
                      >
                        <MessageSquare size={22} />
                      </button>

                      {showTemplatePicker && (
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
                          width: '350px', 
                          zIndex: 100,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>Modelos Pré-Aprovados (Meta)</p>
                          {META_TEMPLATES.map((template, idx) => (
                            <button 
                              key={idx} 
                              type="button" 
                              onClick={() => {
                                setNewMessage(template);
                                setShowTemplatePicker(false);
                              }}
                              style={{ 
                                fontSize: '0.875rem', 
                                padding: '0.75rem', 
                                background: '#f8fafc', 
                                border: '1px solid #e2e8f0', 
                                cursor: 'pointer', 
                                borderRadius: '8px',
                                textAlign: 'left',
                                lineHeight: '1.4'
                              }}
                              className="hover-bg"
                            >
                              {template}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', overflow: 'hidden' }}>
                {activeChat?.leadAvatar ? (
                  <img src={activeChat.leadAvatar} alt={selectedLead?.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={40} color="#94a3b8" />
                )}
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

              {activeChat?.channel === 'whatsapp' && (
                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.4, display: 'block', marginBottom: '0.5rem' }}>Conexão de Resposta</label>
                  <select 
                    value={activeChat.connectionId || ''}
                    onChange={(e) => handleChangeChatConnection(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="">Selecione uma conexão...</option>
                    {connections.map(conn => (
                      <option key={conn.id} value={conn.id}>
                        {conn.name || conn.evolutionInstanceName} ({conn.type === 'evolution_api' ? 'Docker' : 'Meta'})
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: '0.65rem', marginTop: '0.5rem', opacity: 0.6 }}>Altere aqui para forçar o uso do Docker neste lead.</p>
                </div>
              )}

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
export default function AtendimentoPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <AtendimentoContent />
    </Suspense>
  );
}
