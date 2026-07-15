'use client';
// Updated: 2026-05-07 10:40

import { useState, useEffect, useRef, Suspense, Fragment } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/services/api';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Send, 
  Smile, 
  Paperclip, 
  MessageCircle, 
  User, 
  Users,
  CheckCheck, 
  Clock, 
  Hash, 
  ExternalLink,
  ChevronLeft,
  X,
  MessageSquare,
  Trash2,
  Edit2,
  Settings,
  Loader2,
  Reply,
  Forward,
  Sparkles,
  Link,
  ChevronDown,
  Mic,
  Square,
  Plus,
  Upload,
  Zap
} from 'lucide-react';
import PipelineAutomationModal from '@/components/bots/PipelineAutomationModal';

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

const AudioPlayer = ({ src, isIncoming }: { src: string; isIncoming: boolean }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [speed, setSpeed] = useState(1);

  const toggleSpeed = () => {
    if (!audioRef.current) return;
    let newSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    audioRef.current.playbackRate = newSpeed;
    setSpeed(newSpeed);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: isIncoming ? '#f8fafc' : 'rgba(255,255,255,0.1)', padding: '0.25rem', borderRadius: '8px' }}>
      <audio ref={audioRef} src={src} controls style={{ height: '36px', maxWidth: '220px' }} />
      <button 
        onClick={toggleSpeed} 
        style={{ 
          background: isIncoming ? '#cbd5e1' : 'rgba(255,255,255,0.3)', 
          border: 'none', 
          borderRadius: '12px', 
          padding: '4px 10px', 
          fontSize: '0.8rem', 
          fontWeight: '800',
          cursor: 'pointer',
          color: isIncoming ? '#0f172a' : '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
        title="Velocidade do Áudio"
      >
        {speed}x
      </button>
    </div>
  );
};

function AtendimentoContent() {
  const searchParams = useSearchParams();
  const [isMobile, setIsMobile] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showLeadDetails, setShowLeadDetails] = useState(true);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [dbTemplates, setDbTemplates] = useState<any[]>([]);
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [serviceStages, setServiceStages] = useState<any[]>([]);

  useEffect(() => {
    api.getAllUserProfiles()
      .then(setSystemUsers)
      .catch(err => console.error('Erro ao carregar usuários:', err));

    api.getWhatsappTemplates()
      .then(setDbTemplates)
      .catch(err => console.error('Erro ao carregar templates:', err));

    api.getServiceStages()
      .then(data => {
        if (data && data.length > 0) {
          setServiceStages(data);
        } else {
          setServiceStages([
            { id: 'novo', name: 'Novo / Aguardando' },
            { id: 'em_atendimento', name: 'Em Atendimento' },
            { id: 'pendente', name: 'Pendente' },
            { id: 'finalizado', name: 'Finalizado' }
          ]);
        }
      })
      .catch(err => console.error('Erro ao carregar etapas de atendimento:', err));
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setShowLeadDetails(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setShowLeadDetails(false);
    }
  }, [selectedChatId, isMobile]);

  const [chats, setChats] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const hasAutoStarted = useRef<string | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [syncingYoutube, setSyncingYoutube] = useState(false);
  const [syncingTiktok, setSyncingTiktok] = useState(false);
  
  // Estados para Filtros de Mensagens / Conversas
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterUnread, setFilterUnread] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('active'); // active | archived | all
  const [filterPeriod, setFilterPeriod] = useState<string>('all'); // all | today | 7d | 30d | custom
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [filterConnection, setFilterConnection] = useState<string>('all');
  const [filterResponseTime, setFilterResponseTime] = useState<string>('all');
  const [filterContactType, setFilterContactType] = useState<string>('external'); // all | external | internal
  const [filterUnreadOnly, setFilterUnreadOnly] = useState<boolean>(false);

  // Canais visíveis no pipeline (customização do usuário)
  const [showChannelSettingsModal, setShowChannelSettingsModal] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  // Estados para Exclusão Customizada e Notificações no Sistema
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [messageToDeleteId, setMessageToDeleteId] = useState<string | null>(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<string[]>([]);
  const [customAlert, setCustomAlert] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('crm_hidden_messages');
    if (saved) {
      try {
        setHiddenMessageIds(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setCustomAlert({ message, type });
    setTimeout(() => {
      setCustomAlert(prev => prev?.message === message ? null : prev);
    }, 4000);
  };

  // Efeito para capturar busca ou chat selecionado vindo de outras páginas
  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setSearchQuery(search);
      // Remove os parâmetros da URL para evitar que fiquem presos na barra de endereço ou histórico
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('search');
        url.searchParams.delete('name');
        window.history.replaceState(null, '', url.pathname + url.search);
      }
    } else {
      setSearchQuery('');
      hasAutoStarted.current = null;
    }
    const cid = searchParams.get('chatId');
    if (cid) {
      setSelectedChatId(cid);
    }
  }, [searchParams]);

  // Efeito para auto-iniciar ou abrir a conversa ao carregar busca de telefone/lead
  useEffect(() => {
    if (chats.length > 0 && searchQuery && !selectedChatId && hasAutoStarted.current !== searchQuery) {
      let cleanNumber = searchQuery.replace(/\D/g, '');
      if (cleanNumber.length === 10 || cleanNumber.length === 11) {
        cleanNumber = '55' + cleanNumber;
      }
      
      const existing = chats.find(c => 
        c.id === `whatsapp_${cleanNumber}` || 
        c.id === `${cleanNumber}@s.whatsapp.net` || 
        (c.leadId && c.leadId.includes(cleanNumber)) ||
        (c.leadName && c.leadName.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      if (existing) {
        setSelectedChatId(existing.id);
        hasAutoStarted.current = searchQuery;
      } else {
        if (cleanNumber && cleanNumber.length >= 8 && connections.length > 0) {
          hasAutoStarted.current = searchQuery;
          handleStartNewChat();
        }
      }
    }
  }, [chats, searchQuery, selectedChatId, connections]);

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
      }
    };
    fetchConnections();
  }, []);

  useEffect(() => {
    // 1. Carregar colunas visíveis
    const savedVisible = localStorage.getItem('visible_kanban_columns');
    if (savedVisible) {
      try {
        setVisibleColumns(JSON.parse(savedVisible));
      } catch (e) {
        console.error(e);
      }
    } else if (connections.length > 0) {
      setVisibleColumns([
        'all_channels',
        ...connections.map(c => `whatsapp_${c.id}`),
        'instagram',
        'facebook',
        'youtube',
        'tiktok'
      ]);
    }

    // 2. Carregar ordem das colunas
    const savedOrder = localStorage.getItem('kanban_column_order');
    if (savedOrder) {
      try {
        setColumnOrder(JSON.parse(savedOrder));
      } catch (e) {
        console.error(e);
      }
    } else if (connections.length > 0) {
      setColumnOrder([
        'all_channels',
        ...connections.map(c => `whatsapp_${c.id}`),
        'instagram',
        'facebook',
        'youtube',
        'tiktok'
      ]);
    }
  }, [connections]);

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

  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const hasLoadedInitialMessages = useRef(false);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string>('');
  const [pendingFileCaption, setPendingFileCaption] = useState('');

  useEffect(() => {
    return () => {
      if (pendingFilePreview) {
        URL.revokeObjectURL(pendingFilePreview);
      }
    };
  }, [pendingFilePreview]);

  const handleFileSelect = (file: File) => {
    setPendingFile(file);
    setPendingFileCaption('');
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setPendingFilePreview(URL.createObjectURL(file));
    } else {
      setPendingFilePreview('');
    }
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    setShowScrollBottomBtn(!isNearBottom);
  };

  useEffect(() => {
    if (selectedChatId) {
      hasLoadedInitialMessages.current = false;
      setShowScrollBottomBtn(false);
      scrollToBottom();
    }
  }, [selectedChatId]);

  useEffect(() => {
    if (messages.length > 0 && !hasLoadedInitialMessages.current) {
      setTimeout(scrollToBottom, 100);
      hasLoadedInitialMessages.current = true;
    }
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
      if (!target.closest('.actions-dropdown-container')) {
        setShowActionsDropdown(false);
      }
      if (!target.closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
      if (!target.closest('.template-picker-container')) {
        setShowTemplatePicker(false);
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

    const msg: any = {
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
      leadId: chat.leadId,
      quotedMessageId: replyingToMessage?.id,
      quotedMessageSender: replyingToMessage?.senderName,
      quotedMessageContent: replyingToMessage?.content || replyingToMessage?.mediaUrl
    };

    const messageToSend = newMessage;
    setNewMessage('');
    const currentReplyTo = replyingToMessage;
    setReplyingToMessage(null);
    
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
            connectionId: chat.connectionId,
            quotedMessageId: currentReplyTo?.id
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
      setTimeout(scrollToBottom, 50);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const uploadFile = async (file: File, caption?: string) => {
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

      const msgContent = caption || file.name;

      const msg: any = {
        id: Math.random().toString(36).substr(2, 9),
        chatId: selectedChatId,
        senderId: 'atendente_admin',
        senderName: 'Atendente',
        content: msgContent,
        timestamp: new Date().toISOString(),
        type: msgType,
        status: 'sent',
        isIncoming: false,
        mediaUrl: url,
        mediaMimeType: mimeType || file.type,
        quotedMessageId: replyingToMessage?.id,
        quotedMessageSender: replyingToMessage?.senderName,
        quotedMessageContent: replyingToMessage?.content || replyingToMessage?.mediaUrl
      };

      const currentReplyTo = replyingToMessage;
      setReplyingToMessage(null);

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
            message: caption || `Arquivo enviado: ${file.name}`,
            connectionId: chat.connectionId,
            mediaUrl: url,
            mediaMimeType: mimeType || file.type,
            quotedMessageId: currentReplyTo?.id
          })
        });
      }
      setTimeout(scrollToBottom, 50);
    } catch (error: any) {
      console.error('Erro no upload:', error);
      alert('Erro ao enviar arquivo: ' + (error.message || error));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleInputPaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      e.preventDefault();
      const file = files[0];
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  };

  const handleDeleteMessage = (msgId: string) => {
    setMessageToDeleteId(msgId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDeleteForEveryone = async () => {
    if (!messageToDeleteId) return;
    const msgId = messageToDeleteId;
    setDeleteConfirmOpen(false);
    setMessageToDeleteId(null);
    try {
      const response = await fetch(`/api/chats?messageId=${msgId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Falha ao excluir mensagem');
      
      setMessages(prev => prev.filter(m => m.id !== msgId));
      setActiveMessageMenu(null);
      showAlert('Mensagem excluída para todos!');
    } catch (error) {
      console.error('Erro ao excluir mensagem:', error);
      showAlert('Erro ao excluir mensagem', 'error');
    }
  };

  const handleConfirmDeleteForMe = () => {
    if (!messageToDeleteId) return;
    const msgId = messageToDeleteId;
    setDeleteConfirmOpen(false);
    setMessageToDeleteId(null);

    const updated = [...hiddenMessageIds, msgId];
    setHiddenMessageIds(updated);
    localStorage.setItem('crm_hidden_messages', JSON.stringify(updated));
    setActiveMessageMenu(null);
    showAlert('Mensagem excluída apenas para você!');
  };

  const handleCopyMessage = (content: string, mediaUrl?: string) => {
    const textToCopy = mediaUrl || content;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => showAlert('Conteúdo copiado!'))
        .catch(err => console.error('Erro ao copiar:', err));
    }
    setActiveMessageMenu(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
        
        // Simular o envio de arquivo chamando o handleFileUpload
        const dt = new DataTransfer();
        dt.items.add(audioFile);
        const dummyEvent = { target: { files: dt.files } } as React.ChangeEvent<HTMLInputElement>;
        await handleFileUpload(dummyEvent);
        
        // Limpar recursos
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setRecordingTime(0);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      alert('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null; // Prevent upload
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setRecordingTime(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const handleForwardMessage = async (targetChatId: string) => {
    if (!forwardMessage) return;
    const targetChat = chats.find(c => c.id === targetChatId);
    if (!targetChat) return;

    try {
      const msg: any = {
        id: Math.random().toString(36).substr(2, 9),
        chatId: targetChat.id,
        content: forwardMessage.content,
        senderId: 'atendente_admin',
        senderName: 'Atendente',
        timestamp: new Date().toISOString(),
        type: forwardMessage.type,
        status: 'sent',
        isIncoming: false,
        channel: targetChat.channel,
        leadId: targetChat.leadId,
        mediaUrl: forwardMessage.mediaUrl,
        mediaMimeType: forwardMessage.mediaMimeType
      };

      await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });

      let recipient = targetChat.leadId;
      if (targetChat.channel === 'whatsapp') {
        recipient = targetChat.leadId.split('@')[0];
      }

      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendOmnichannel',
          recipient,
          channel: targetChat.channel,
          message: forwardMessage.content,
          connectionId: targetChat.connectionId,
          mediaUrl: forwardMessage.mediaUrl,
          mediaMimeType: forwardMessage.mediaMimeType
        })
      });

      const result = await response.json();
      if (!result.success) {
        alert('Erro ao encaminhar mensagem: ' + result.error);
      } else {
        alert('Mensagem encaminhada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao encaminhar:', error);
      alert('Erro ao encaminhar mensagem.');
    } finally {
      setShowForwardModal(false);
      setForwardMessage(null);
    }
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

  const handleMarkAsAnswered = async () => {
    if (!selectedChatId) return;
    try {
      // Optimistically update frontend state
      setChats(prev => prev.map(chat => 
        chat.id === selectedChatId 
          ? { ...chat, lastMessageIsIncoming: 0 } 
          : chat
      ));
      
      await fetch('/api/chats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedChatId, lastMessageIsIncoming: 0 })
      });
      setShowChatMenu(false);
      showAlert('Conversa marcada como respondida com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao marcar conversa como respondida:', err);
      showAlert('Erro ao marcar conversa como respondida.', 'error');
    }
  };

  const handleToggleInternalContact = async () => {
    if (!selectedChatId || !activeChat) return;
    const newIsInternal = activeChat.isInternal === 1 ? 0 : 1;
    try {
      // Optimistically update frontend state
      setChats(prev => prev.map(chat => 
        chat.id === selectedChatId 
          ? { ...chat, isInternal: newIsInternal } 
          : chat
      ));
      
      await fetch('/api/chats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedChatId, isInternal: newIsInternal })
      });
      setShowChatMenu(false);
      showAlert(newIsInternal === 1 ? 'Contato marcado como interno!' : 'Contato marcado como externo!', 'success');
    } catch (err) {
      console.error('Erro ao alternar tipo de contato:', err);
      showAlert('Erro ao alterar tipo do contato.', 'error');
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

  const handleAddStage = async () => {
    const name = prompt('Nome da nova etapa de atendimento:');
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    const updated = [...serviceStages, { id, name }];
    setServiceStages(updated);
    await api.saveServiceStages(updated);
  };

  const handleDeleteStage = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta etapa de atendimento?')) return;
    const updated = serviceStages.filter(s => s.id !== id);
    setServiceStages(updated);
    await api.saveServiceStages(updated);
  };

  const handleEditStage = async (id: string, currentName: string) => {
    const name = prompt('Novo nome para esta etapa de atendimento:', currentName);
    if (!name || name.trim() === '') return;
    const updated = serviceStages.map(s => s.id === id ? { ...s, name: name.trim() } : s);
    setServiceStages(updated);
    await api.saveServiceStages(updated);
  };

  const handleDragStartCard = (e: React.DragEvent, chatId: string) => {
    e.dataTransfer.setData('text/plain', chatId);
  };

  const handleDropCard = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const chatId = e.dataTransfer.getData('text/plain');
    if (!chatId) return;

    if (targetColumnId.startsWith('whatsapp_')) {
      const connId = targetColumnId.replace('whatsapp_', '');
      const conn = connections.find((c: any) => c.id === connId);
      
      // 1. Atualizar no estado local
      setChats(prev => prev.map(c => c.id === chatId ? { 
        ...c, 
        channel: 'whatsapp', 
        connectionId: connId,
        connectionName: conn?.name || conn?.evolutionInstanceName || 'WhatsApp'
      } : c));

      // 2. Chamar a API para persistir
      await fetch('/api/chats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: chatId, 
          connectionId: connId,
          connectionName: conn?.name || conn?.evolutionInstanceName || 'WhatsApp'
        })
      });
    } else if (['instagram', 'facebook', 'youtube', 'tiktok'].includes(targetColumnId)) {
      // 1. Atualizar no estado local
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, channel: targetColumnId as any } : c));

      // 2. Chamar a API para persistir
      await fetch('/api/chats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chatId, channel: targetColumnId })
      });
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

    // 3. Filtro de Não Respondidas
    const matchesUnread = !filterUnread || chat.lastMessageIsIncoming === 1;

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
      if (filterPeriod === 'custom') {
        if (customStartDate) {
          const start = new Date(customStartDate + 'T00:00:00');
          if (chatDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate + 'T23:59:59');
          if (chatDate > end) return false;
        }
        return true;
      }
      return true;
    })();

    // 6. Filtro por Conexão de WhatsApp
    const matchesConnection = filterConnection === 'all' || chat.connectionId === filterConnection;

    // 7. Filtro por Tipo de Contato (Interno vs. Externo)
    const matchesContactType = 
      filterContactType === 'all' ||
      (filterContactType === 'internal' && chat.isInternal === 1) ||
      (filterContactType === 'external' && chat.isInternal !== 1);

    // 8. Filtro por Mensagens Não Lidas (unreadCount > 0)
    const matchesUnreadOnly = !filterUnreadOnly || (chat.unreadCount || 0) > 0;

    return matchesSearch && matchesChannel && matchesUnread && matchesStatus && matchesPeriod && matchesConnection && matchesContactType && matchesUnreadOnly;
  });

  const getBusinessTimeMs = (startDate: Date, endDate: Date): number => {
    if (startDate >= endDate) return 0;

    const businessHours: { [key: number]: { startMin: number; endMin: number }[] | null } = {
      0: null, // Domingo
      1: [
        { startMin: 7 * 60 + 30, endMin: 12 * 60 },
        { startMin: 13 * 60, endMin: 17 * 60 + 30 }
      ], // Segunda: 07:30 - 12:00 e 13:00 - 17:30
      2: [
        { startMin: 7 * 60 + 30, endMin: 12 * 60 },
        { startMin: 13 * 60, endMin: 17 * 60 + 30 }
      ], // Terça: 07:30 - 12:00 e 13:00 - 17:30
      3: [
        { startMin: 7 * 60 + 30, endMin: 12 * 60 },
        { startMin: 13 * 60, endMin: 17 * 60 + 30 }
      ], // Quarta: 07:30 - 12:00 e 13:00 - 17:30
      4: [
        { startMin: 7 * 60 + 30, endMin: 12 * 60 },
        { startMin: 13 * 60, endMin: 17 * 60 + 30 }
      ], // Quinta: 07:30 - 12:00 e 13:00 - 17:30
      5: [
        { startMin: 7 * 60 + 30, endMin: 12 * 60 },
        { startMin: 13 * 60, endMin: 16 * 60 + 15 }
      ], // Sexta: 07:30 - 12:00 e 13:00 - 16:15
      6: null // Sábado
    };

    let totalMs = 0;
    let current = new Date(startDate.getTime());
    const target = endDate.getTime();

    while (current.getTime() < target) {
      const day = current.getDay();
      const schedules = businessHours[day];

      if (schedules) {
        schedules.forEach(schedule => {
          const dayStart = new Date(current.getTime());
          dayStart.setHours(Math.floor(schedule.startMin / 60), schedule.startMin % 60, 0, 0);

          const dayEnd = new Date(current.getTime());
          dayEnd.setHours(Math.floor(schedule.endMin / 60), schedule.endMin % 60, 0, 0);

          const startMs = Math.max(current.getTime(), dayStart.getTime());
          const endMs = Math.min(target, dayEnd.getTime());

          if (startMs < endMs) {
            totalMs += (endMs - startMs);
          }
        });
      }

      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
    }

    return totalMs;
  };

  const getColumnMaxUnansweredTime = (columnChats: ChatSession[]) => {
    let maxMs = 0;
    columnChats.forEach(chat => {
      if (chat.lastMessageIsIncoming === 1) {
        const ms = getBusinessTimeMs(new Date(chat.lastTimestamp || chat.dataCriacao || 0), new Date());
        if (ms > maxMs) {
          maxMs = ms;
        }
      }
    });

    if (maxMs === 0) return null;
    
    const diffMins = Math.floor(maxMs / 60000);
    if (diffMins < 1) return 'Menos de 1 min';
    if (diffMins < 60) return `${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} d`;
  };

  const getMaxUnansweredTime = () => {
    let maxMs = 0;
    filteredChats.forEach(chat => {
      if (chat.lastMessageIsIncoming === 1) {
        const ms = getBusinessTimeMs(new Date(chat.lastTimestamp || chat.dataCriacao || 0), new Date());
        if (ms > maxMs) {
          maxMs = ms;
        }
      }
    });

    if (maxMs === 0) return 'Respondido';
    
    const diffMins = Math.floor(maxMs / 60000);
    if (diffMins < 1) return 'Menos de 1 min';
    if (diffMins < 60) return `${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} d`;
  };
  
  const maxUnansweredTimeStr = getMaxUnansweredTime();

  // Colunas Dinâmicas do Kanban (Canais de entrada)
  const kanbanColumns = [
    { id: 'all_channels', name: 'Todos os Canais' },
    ...connections.map(conn => ({
      id: `whatsapp_${conn.id}`,
      name: conn.name || conn.evolutionInstanceName || 'WhatsApp'
    })),
    { id: 'instagram', name: 'Instagram' },
    { id: 'facebook', name: 'Facebook Messenger' },
    { id: 'youtube', name: 'YouTube' },
    { id: 'tiktok', name: 'TikTok' }
  ];

  const orderedColumns = [...kanbanColumns].sort((a, b) => {
    const idxA = columnOrder.indexOf(a.id);
    const idxB = columnOrder.indexOf(b.id);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
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

  const getUnansweredTimeString = () => {
    if (!activeChat) return null;
    
    // Check if unanswered
    const isUnanswered = activeChat.lastMessageIsIncoming === 1 || (messages.length > 0 && messages[messages.length - 1].isIncoming);
    if (!isUnanswered) return null;
    
    const lastTime = messages.length > 0 
      ? messages[messages.length - 1].timestamp 
      : (activeChat.lastTimestamp || activeChat.dataCriacao);
      
    if (!lastTime) return null;
    
    const diffMs = getBusinessTimeMs(new Date(lastTime), new Date());
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Menos de 1 minuto';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
  };

  const unansweredTimeStr = getUnansweredTimeString();

  const visibleMessages = messages.filter(msg => !hiddenMessageIds.includes(msg.id));

  return (
    <div className="atendimento-container">
      
      {/* SIDEBAR DE CONVERSAS (REPROJETADO COMO KANBAN BOARD) */}
      <div 
        className={`conversas-sidebar ${selectedChatId && isMobile ? 'hidden-on-mobile' : ''}`}
        style={{ 
          width: '100%', 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          minWidth: 0,
          background: '#f8fafc',
          borderRight: '1px solid #e2e8f0',
          height: '100%'
        }}
      >
        <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
          {/* Header Row 1 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={24} color="var(--primary)" />
                Funil de Atendimento
              </h2>
              

            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                type="button"
                onClick={handleAddStage}
                style={{ 
                  background: 'var(--primary)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.45rem 1rem', 
                  borderRadius: '8px', 
                  fontWeight: 600, 
                  fontSize: '0.8rem', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Plus size={14} /> Nova Etapa
              </button>

              <button 
                type="button"
                onClick={() => setIsAutomationModalOpen(true)}
                title="Configurar Automações"
                style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', cursor: 'pointer', padding: '0.45rem 0.75rem', color: '#1e40af', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Zap size={14} /> Automações
              </button>

              <button 
                type="button"
                onClick={() => setShowChannelSettingsModal(true)}
                title="Personalizar Canais Visíveis"
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', padding: '0.45rem 0.75rem', color: '#475569', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Settings size={14} /> Personalizar
              </button>

              {/* Sync buttons */}
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
                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', cursor: syncingYoutube ? 'wait' : 'pointer', opacity: syncingYoutube ? 0.8 : 1, padding: '5px', borderRadius: '6px' }}
              >
                {syncingYoutube ? <Loader2 size={16} className="animate-spin" /> : renderSocialIcon('youtube', 16)}
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
                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', cursor: syncingTiktok ? 'wait' : 'pointer', opacity: syncingTiktok ? 0.8 : 1, padding: '5px', borderRadius: '6px' }}
              >
                {syncingTiktok ? <Loader2 size={16} className="animate-spin" /> : renderSocialIcon('tiktok', 16)}
              </button>
            </div>
          </div>

          {/* Header Row 2 (Search and Filters) */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: '0.75rem', alignItems: 'center', width: '100%' }}>
            <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '1.5 1 200px', width: isMobile ? '100%' : 'auto' }}>
              <input 
                type="text" 
                placeholder="Buscar lead ou mensagem..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 1rem 0.45rem 2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
              />
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '10px' }} />
            </div>

            <select 
              value={filterConnection}
              onChange={e => setFilterConnection(e.target.value)}
              style={{ width: isMobile ? '100%' : 'auto', flex: isMobile ? '1 1 100%' : '1 1 140px', padding: '0.45rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
            >
              <option value="all">Todas as conexões</option>
              {connections.map(conn => (
                <option key={conn.id} value={conn.id}>{conn.name || conn.evolutionInstanceName}</option>
              ))}
            </select>

            <select 
              value={filterChannel}
              onChange={e => setFilterChannel(e.target.value)}
              style={{ width: isMobile ? '100%' : 'auto', flex: isMobile ? '1 1 100%' : '1 1 130px', padding: '0.45rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
            >
              <option value="all">Todos os Canais</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="facebook">Facebook Messenger</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="whatsapp_widget">Widget WhatsApp</option>
            </select>

            <select 
              value={filterContactType}
              onChange={e => setFilterContactType(e.target.value)}
              style={{ width: isMobile ? '100%' : 'auto', flex: isMobile ? '1 1 100%' : '1 1 140px', padding: '0.45rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
            >
              <option value="all">Todos os Contatos</option>
              <option value="external">Clientes (Externos)</option>
              <option value="internal">Colaboradores (Internos)</option>
            </select>

            <button
              onClick={() => setFilterUnread(!filterUnread)}
              style={{
                width: isMobile ? '100%' : 'auto',
                flex: isMobile ? '1 1 100%' : '0.8 1 120px',
                padding: '0.45rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: filterUnread ? 'var(--primary)' : '#cbd5e1',
                background: filterUnread ? 'rgba(99, 102, 241, 0.1)' : '#ffffff',
                color: filterUnread ? 'var(--primary)' : '#475569',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                height: '32px'
              }}
            >
              Não respondidas
              {chats.filter(c => c.lastMessageIsIncoming === 1).length > 0 && (
                <span style={{ background: 'var(--primary)', color: 'white', fontSize: '0.65rem', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                  {chats.filter(c => c.lastMessageIsIncoming === 1).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterUnreadOnly(!filterUnreadOnly)}
              style={{
                width: isMobile ? '100%' : 'auto',
                flex: isMobile ? '1 1 100%' : '0.8 1 110px',
                padding: '0.45rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: filterUnreadOnly ? '#22c55e' : '#cbd5e1',
                background: filterUnreadOnly ? 'rgba(34, 197, 94, 0.1)' : '#ffffff',
                color: filterUnreadOnly ? '#22c55e' : '#475569',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                height: '32px',
                boxSizing: 'border-box'
              }}
            >
              Não lidas
              {chats.filter(c => (c.unreadCount || 0) > 0).length > 0 && (
                <span style={{ 
                  background: '#22c55e', 
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

        {/* KANBAN BOARD BODY */}
        <div style={{ flex: 1, display: 'flex', gap: '1rem', overflowX: 'auto', padding: '1rem', background: '#f1f5f9' }}>
          {orderedColumns.filter(col => visibleColumns.includes(col.id)).map(col => {
            const stageChats = filteredChats.filter(chat => {
              if (col.id === 'all_channels') return true;
              if (col.id === 'instagram') return chat.channel === 'instagram';
              if (col.id === 'facebook') return chat.channel === 'facebook';
              if (col.id === 'youtube') return chat.channel === 'youtube';
              if (col.id === 'tiktok') return chat.channel === 'tiktok';
              if (col.id.startsWith('whatsapp_')) {
                const connId = col.id.replace('whatsapp_', '');
                return chat.channel === 'whatsapp' && chat.connectionId === connId;
              }
              return false;
            });

            const maxTimeStr = getColumnMaxUnansweredTime(stageChats);

            return (
              <div 
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropCard(e, col.id)}
                style={{
                  width: '280px',
                  minWidth: '280px',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '100%',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                {/* Column Header */}
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
                    <span 
                      style={{ 
                        fontWeight: 700, 
                        fontSize: '0.85rem', 
                        color: '#1e293b', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {col.name}
                    </span>
                    <span style={{ background: '#e2e8f0', color: '#475569', fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '10px' }}>
                      {stageChats.length}
                    </span>
                  </div>
                  {maxTimeStr && (
                    <span 
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        color: '#ef4444', 
                        fontSize: '0.65rem', 
                        fontWeight: 700, 
                        padding: '2px 6px', 
                        borderRadius: '6px',
                        whiteSpace: 'nowrap'
                      }}
                      title="Maior tempo de espera por resposta nesta coluna"
                    >
                      Espera: {maxTimeStr}
                    </span>
                  )}
                </div>

                {/* Column Cards List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {stageChats.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                      Solte leads aqui
                    </div>
                  ) : (
                    stageChats.map(chat => {
                      const isSelected = selectedChatId === chat.id;
                      const hasUnread = (chat.unreadCount || 0) > 0;
                      
                      return (
                        <div 
                          key={chat.id}
                          draggable="true"
                          onDragStart={(e) => handleDragStartCard(e, chat.id)}
                          onClick={() => setSelectedChatId(chat.id)}
                          style={{
                            padding: '0.85rem',
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            borderRadius: '10px',
                            border: '1px solid ' + (isSelected ? '#3b82f6' : (hasUnread ? '#22c55e' : '#e2e8f0')),
                            cursor: 'grab',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}
                        >
                          {/* Card Top Row */}
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#cbd5e1', overflow: 'hidden', flexShrink: 0 }}>
                              {chat.leadAvatar ? <img src={chat.leadAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={14} color="#94a3b8" />}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {chat.leadName}
                              </div>
                            </div>
                            <div style={{ flexShrink: 0 }}>
                              {getChannelIcon(chat.channel, 14)}
                            </div>
                          </div>

                          {/* Last message preview */}
                          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {chat.lastMessage || 'Iniciando conversa...'}
                          </p>

                          {/* Card Footer */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                {chat.lastTimestamp ? new Date(chat.lastTimestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                              {chat.lastMessageIsIncoming === 1 && (() => {
                                const ms = getBusinessTimeMs(new Date(chat.lastTimestamp || chat.dataCriacao || 0), new Date());
                                const diffMins = Math.floor(ms / 60000);
                                let timeStr = 'Aguardando';
                                if (diffMins >= 1) {
                                  if (diffMins < 60) timeStr = `${diffMins}m`;
                                  else {
                                    const diffHours = Math.floor(diffMins / 60);
                                    if (diffHours < 24) timeStr = `${diffHours}h`;
                                    else timeStr = `${Math.floor(diffHours / 24)}d`;
                                  }
                                }
                                return (
                                  <span style={{ 
                                    fontSize: '0.65rem', 
                                    background: 'rgba(239, 68, 68, 0.1)', 
                                    color: '#ef4444', 
                                    padding: '1px 5px', 
                                    borderRadius: '4px', 
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {timeStr}
                                  </span>
                                );
                              })()}
                            </div>
                            {hasUnread && (
                              <span style={{ background: '#22c55e', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', padding: '1px 6px', borderRadius: '10px' }}>
                                {chat.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ÁREA DE CHAT (REPROJETADA COMO DRAWER DE ATENDIMENTO) */}
      <div 
        className="chat-area"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ 
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: selectedChatId ? (showLeadDetails ? '1120px' : '800px') : '0px',
          maxWidth: '100%',
          background: 'white',
          boxShadow: selectedChatId ? '-10px 0 30px rgba(0,0,0,0.1)' : 'none',
          zIndex: 999,
          display: selectedChatId ? 'flex' : 'none',
          flexDirection: 'row',
          transition: 'width 0.2s ease-out, box-shadow 0.2s ease-out',
          borderLeft: '1px solid #e2e8f0'
        }}
      >
        {isDragging && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(99, 102, 241, 0.15)',
            backdropFilter: 'blur(4px)',
            border: '3px dashed var(--primary)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            pointerEvents: 'none'
          }}>
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '16px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              textAlign: 'center'
            }}>
              <Upload size={48} color="var(--primary)" />
              <p style={{ fontWeight: 700, color: '#1e293b', margin: 0 }}>Arraste e solte o arquivo aqui para enviar</p>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Imagens, vídeos, áudios ou documentos</p>
            </div>
          </div>
        )}
        {selectedChatId ? (
          <>
            {/* Wrapper da Conversa (Lado Esquerdo) */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', minWidth: 0, position: 'relative' }}>
              {/* Header do Chat */}
            <header className="chat-header" style={{ padding: '0.75rem 1.5rem', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem', flexShrink: 0 }}>
              {/* Row 1: User Info & Control Buttons */}
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="chat-header-left">
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {activeChat?.leadAvatar ? (
                      <img src={activeChat.leadAvatar} alt={activeChat.leadName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={18} color="#94a3b8" />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 className="chat-lead-name" style={{ margin: 0 }}>{chats.find(c => c.id === selectedChatId)?.leadName}</h3>
                      {activeChat?.isInternal === 1 && (
                        <span style={{ fontSize: '0.65rem', background: '#dbeafe', color: '#1e40af', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                          Interno
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#10b981' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }}></div>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Canal: {chats.find(c => c.id === selectedChatId)?.channel.toUpperCase()}</span>
                      </div>
                      {unansweredTimeStr && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#ef4444' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }}></div>
                          <span>Sem resposta há {unansweredTimeStr}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="chat-header-right" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button 
                    onClick={() => setShowLeadDetails(!showLeadDetails)}
                    style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: showLeadDetails ? 'var(--primary)' : 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Detalhes do Lead"
                  >
                    <Filter size={18} />
                  </button>
                  <div style={{ position: 'relative', display: 'flex' }} ref={chatMenuRef}>
                    <button 
                      onClick={() => setShowChatMenu(!showChatMenu)}
                      style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <MoreVertical size={18} />
                    </button>
                    {showChatMenu && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        right: 0, 
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        zIndex: 1000,
                        width: '180px',
                        marginTop: '0.5rem',
                        overflow: 'hidden'
                      }}>
                         <button 
                           onClick={() => {
                             setShowChatMenu(false);
                             handleMarkAsAnswered();
                           }}
                           style={{ width: '100%', padding: '0.75rem 1rem', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #f1f5f9' }}
                         >
                           <CheckCheck size={14} color="#10b981" /> Marcar como Respondido
                         </button>
                        <button 
                          onClick={() => {
                            setShowChatMenu(false);
                            handleToggleInternalContact();
                          }}
                          style={{ width: '100%', padding: '0.75rem 1rem', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', color: activeChat?.isInternal === 1 ? '#3b82f6' : '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #f1f5f9' }}
                        >
                          <Users size={14} color={activeChat?.isInternal === 1 ? '#3b82f6' : '#64748b'} />
                          {activeChat?.isInternal === 1 ? 'Marcar como Externo' : 'Marcar como Interno'}
                        </button>
                        <button 
                          onClick={() => {
                            setShowChatMenu(false);
                            handleArchiveChat();
                          }}
                          style={{ width: '100%', padding: '0.75rem 1rem', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #f1f5f9' }}
                        >
                          <Clock size={14} /> Arquivar Conversa
                        </button>
                        <button 
                          onClick={() => {
                            setShowChatMenu(false);
                            handleDeleteChat();
                          }}
                          style={{ width: '100%', padding: '0.75rem 1rem', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <Trash2 size={14} /> Excluir Conversa
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Close button with X icon */}
                  <button 
                    onClick={() => setSelectedChatId(null)}
                    style={{ 
                      padding: '0.5rem', 
                      borderRadius: '8px', 
                      border: '1px solid #ef4444', 
                      background: '#fef2f2', 
                      cursor: 'pointer', 
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#fef2f2'}
                    title="Fechar Conversa"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Row 2: Connection Badge & Stage Dropdown */}
              <div style={{ display: 'flex', width: '100%', gap: '1rem', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                {chats.find(c => c.id === selectedChatId)?.connectionName && (
                  <div style={{ 
                    background: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    padding: '0.35rem 0.75rem', 
                    borderRadius: '20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.4rem',
                    color: '#475569',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}>
                    <MessageCircle size={14} color="#10b981" />
                    Conexão: <span style={{ color: '#0f172a' }}>{chats.find(c => c.id === selectedChatId)?.connectionName}</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: 'auto' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Etapa:</span>
                  <select
                    value={activeChat?.etapaAtendimento || 'novo'}
                    onChange={async (e) => {
                      const newStage = e.target.value;
                      setChats(prev => prev.map(c => c.id === selectedChatId ? { ...c, etapaAtendimento: newStage } : c));
                      await fetch('/api/chats', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: selectedChatId, etapaAtendimento: newStage })
                      });
                      if (activeChat?.leadId) {
                        await fetch('/api/pipeline-automations/test', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ leadId: activeChat.leadId, currentStage: newStage, eventType: 'quando_criado' })
                        });
                      }
                    }}
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '20px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    {serviceStages.map(stg => (
                      <option key={stg.id} value={stg.id}>{stg.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </header>



            {/* Mensagens */}
            <div ref={messagesContainerRef} className="messages-container custom-scrollbar" onScroll={handleScroll}>
              {visibleMessages.length === 0 && (
                <div style={{ textAlign: 'center', margin: '2rem 0', opacity: 0.4 }}>
                  <p style={{ fontSize: '0.875rem' }}>Início da conversa</p>
                </div>
              )}
              
              {visibleMessages.map((msg, i) => {
                const isFirstOfGroup = i === 0 || visibleMessages[i-1].isIncoming !== msg.isIncoming;
                const showDateSeparator = i === 0 || new Date(visibleMessages[i-1].timestamp).toDateString() !== new Date(msg.timestamp).toDateString();
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
                      className="message-bubble-wrapper"
                      style={{ 
                        alignSelf: msg.isIncoming ? 'flex-start' : 'flex-end',
                        alignItems: msg.isIncoming ? 'flex-start' : 'flex-end'
                      }}
                    >
                      {isFirstOfGroup && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.5, marginLeft: msg.isIncoming ? '12px' : 0, marginRight: !msg.isIncoming ? '12px' : 0, textAlign: msg.isIncoming ? 'left' : 'right' }}>
                          {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    <div 
                      id={`message-${msg.id}`}
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
                        transition: 'background-color 0.5s ease',
                        width: 'fit-content',
                        maxWidth: '100%'
                      }}
                    >
                      {/* Botão de Menu (Sempre Visível) */}
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
                          <button onClick={() => { setReplyingToMessage(msg); setActiveMessageMenu(null); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <Reply size={14} /> Responder
                          </button>
                          <button onClick={() => { setForwardMessage(msg); setShowForwardModal(true); setActiveMessageMenu(null); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <Forward size={14} /> Encaminhar
                          </button>
                          <button 
                            onClick={async () => { 
                              setActiveMessageMenu(null); 
                              const res = await fetch('/api/chats/suggest', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ messageContent: msg.content })
                              });
                              const data = await res.json();
                              if (data.success) {
                                setNewMessage(data.suggestion);
                              } else {
                                alert('Erro ao sugerir: ' + data.error);
                              }
                            }} 
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
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
                      {msg.quotedMessageId && (
                        <div 
                          onClick={() => {
                            const target = document.getElementById(`message-${msg.quotedMessageId}`);
                            if (target) {
                              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              const originalBg = target.style.backgroundColor;
                              target.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
                              setTimeout(() => {
                                target.style.backgroundColor = originalBg;
                              }, 1500);
                            }
                          }}
                          style={{
                            background: msg.isIncoming ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.15)',
                            borderLeft: `4px solid ${msg.isIncoming ? 'var(--primary)' : 'rgba(255,255,255,0.8)'}`,
                            padding: '6px 10px',
                            borderRadius: '4px',
                            marginBottom: '6px',
                            fontSize: '0.85rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontWeight: 600, color: msg.isIncoming ? 'var(--primary)' : 'white' }}>
                            {msg.quotedMessageSender || 'Usuário'}
                          </span>
                          <span style={{ opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                            {msg.quotedMessageContent || 'Mensagem anexa'}
                          </span>
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
                            <AudioPlayer src={msg.mediaUrl} isIncoming={msg.isIncoming} />
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
            <footer className="chat-footer">
              {replyingToMessage && (
                <div style={{
                  padding: '10px 15px',
                  background: '#f1f5f9',
                  borderLeft: '4px solid var(--primary)',
                  borderRadius: '8px 8px 0 0',
                  marginTop: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>
                      {replyingToMessage.senderName}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {replyingToMessage.type === 'audio' ? '🎵 Áudio' : 
                       replyingToMessage.type === 'image' ? '📷 Imagem' : 
                       replyingToMessage.type === 'video' ? '🎥 Vídeo' : 
                       replyingToMessage.content}
                    </span>
                  </div>
                  <button type="button" onClick={() => setReplyingToMessage(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
                    X
                  </button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="chat-form" style={{ paddingTop: replyingToMessage ? '0.75rem' : '' }}>
                <input 
                  type="file" 
                  id="file-upload"
                  ref={fileInputRef} 
                  style={{ position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'hidden', pointerEvents: 'none' }} 
                  onChange={(e) => {
                    handleFileUpload(e);
                    setShowActionsDropdown(false);
                  }} 
                />
                <div className="actions-dropdown-container" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                    style={{ 
                      color: showActionsDropdown ? 'var(--primary)' : '#64748b', 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      background: showActionsDropdown ? 'rgba(99, 102, 241, 0.1)' : '#f1f5f9',
                      border: 'none',
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                    title="Mais opções"
                  >
                    <Plus size={22} style={{ transform: showActionsDropdown ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  {showActionsDropdown && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      marginBottom: '10px',
                      background: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      border: '1px solid #e2e8f0',
                      zIndex: 101,
                      width: '180px',
                      padding: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEmojiPicker(true);
                          setShowActionsDropdown(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          textAlign: 'left',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: '#475569',
                          borderRadius: '8px'
                        }}
                        className="hover-bg"
                      >
                        <Smile size={18} color="#64748b" />
                        <span>Emoji</span>
                      </button>

                      <label
                        htmlFor="file-upload"
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          textAlign: 'left',
                          border: 'none',
                          background: 'none',
                          cursor: uploading ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: '#475569',
                          borderRadius: '8px',
                          pointerEvents: uploading ? 'none' : 'auto'
                        }}
                        className="hover-bg"
                      >
                        <Paperclip size={18} color="#64748b" />
                        <span>{uploading ? 'Enviando...' : 'Anexo'}</span>
                      </label>

                      {activeChat?.channel === 'whatsapp' && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowTemplatePicker(true);
                            setShowActionsDropdown(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '0.6rem 0.75rem',
                            textAlign: 'left',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#475569',
                            borderRadius: '8px'
                          }}
                          className="hover-bg"
                        >
                          <MessageSquare size={18} color="#64748b" />
                          <span>Modelos</span>
                        </button>
                      )}
                    </div>
                  )}

                  {showEmojiPicker && (
                    <div className="emoji-picker-container" style={{ 
                      position: 'absolute', 
                      bottom: '100%', 
                      left: 0, 
                      marginBottom: '10px', 
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
                      zIndex: 102
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

                  {showTemplatePicker && activeChat?.channel === 'whatsapp' && (
                    <div className="template-picker-container" style={{ 
                      position: 'absolute', 
                      bottom: '100%', 
                      left: 0, 
                      marginBottom: '10px', 
                      background: 'white', 
                      borderRadius: '16px', 
                      boxShadow: '0 10px 40px rgba(0,0,0,0.15)', 
                      border: '1px solid #e2e8f0', 
                      padding: '1rem', 
                      width: '350px', 
                      maxHeight: '400px',
                      overflowY: 'auto',
                      zIndex: 102,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>Modelos Pré-Aprovados (Meta)</p>
                      
                      {/* CAIXA DE PESQUISA */}
                      <input 
                        type="text"
                        placeholder="Pesquisar modelo..."
                        value={templateSearchQuery}
                        onChange={(e) => setTemplateSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          marginBottom: '0.5rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />

                      {(() => {
                        const activeChat = chats.find(c => c.id === selectedChatId);
                        const templatesToShow = dbTemplates.filter(t => {
                          if (t.status === 'LOCAL' || t.status === 'local' || !t.connectionId) return true;
                          return (t.status === 'APPROVED' || t.status === 'approved') && t.connectionId === activeChat?.connectionId;
                        });

                        const finalTemplates = templatesToShow.length > 0 
                          ? templatesToShow.map(t => ({ name: t.name, content: t.content })) 
                          : META_TEMPLATES.map(text => ({ name: 'Padrão', content: text }));

                        const filteredTemplates = finalTemplates.filter(t => 
                          (t.name || '').toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
                          (t.content || '').toLowerCase().includes(templateSearchQuery.toLowerCase())
                        );

                        if (filteredTemplates.length === 0) {
                          return (
                            <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '1rem', margin: 0 }}>
                              Nenhum modelo encontrado.
                            </p>
                          );
                        }

                        return filteredTemplates.map((template, idx) => (
                          <button 
                            key={idx} 
                            type="button" 
                            onClick={() => {
                              setNewMessage(template.content);
                              setShowTemplatePicker(false);
                              setTemplateSearchQuery('');
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
                            title={template.name}
                          >
                            <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>
                              {template.name}
                            </span>
                            {template.content}
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>
                
                {isRecording ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1.2rem', borderRadius: '30px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
                      <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '1.1rem' }}>
                        {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={cancelRecording}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                    >
                      <Trash2 size={16} /> Cancelar
                    </button>
                  </div>
                ) : (
                  <input 
                    type="text" 
                    placeholder="Escreva sua mensagem..." 
                    style={{ flex: 1, minWidth: 0, padding: '0.8rem 1.2rem', borderRadius: '30px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.95rem' }}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onPaste={handleInputPaste}
                  />
                )}
                
                {isRecording ? (
                  <button 
                    type="button"
                    onClick={stopRecording}
                    style={{ 
                      width: '48px', height: '48px', borderRadius: '50%', 
                      background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0
                    }}
                  >
                    <Send size={20} style={{ marginLeft: '3px' }} />
                  </button>
                ) : newMessage.trim() ? (
                  <button 
                    type="submit" 
                    style={{ 
                      width: '48px', height: '48px', borderRadius: '50%', 
                      background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0
                    }}
                  >
                    <Send size={20} style={{ marginLeft: '3px' }} />
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={startRecording}
                    style={{ 
                      width: '48px', height: '48px', borderRadius: '50%', 
                      background: '#10b981', color: 'white', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0
                    }}
                  >
                    <Mic size={20} />
                  </button>
                )}
              </form>
            {showScrollBottomBtn && (
              <button
                type="button"
                onClick={scrollToBottom}
                style={{
                  position: 'absolute',
                  bottom: '90px',
                  right: '12px',
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '1px solid #e2e8f0',
                  zIndex: 99,
                  color: '#64748b',
                  transition: 'all 0.2s ease',
                }}
                className="hover-bg"
                title="Ir para a última mensagem"
              >
                <ChevronDown size={22} />
              </button>
            )}
            </footer>
          </div> {/* Fim do Wrapper da Conversa */}

          {/* PAINEL DE DETALHES DO LEAD (Movido para dentro do chat-area) */}
          {showLeadDetails && (
            <div style={{ 
              width: isMobile ? '100%' : '320px', 
              position: isMobile ? 'absolute' : 'relative',
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 200,
              background: 'white', 
              borderLeft: '1px solid #e2e8f0', 
              display: 'flex', 
              flexDirection: 'column', 
              flexShrink: 0,
              animation: 'slideInRight 0.3s ease-out' 
            }}>
              <header style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 800, color: '#1e293b' }}>Sobre o Lead</h3>
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
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{selectedLead?.nome}</h4>
                  <p style={{ fontSize: '0.85rem', opacity: 0.6, color: '#64748b' }}>{selectedLead?.email || 'Sem e-mail cadastrado'}</p>
                </div>

                {unansweredTimeStr && (
                  <div style={{ 
                    padding: '1rem', 
                    background: 'rgba(239, 68, 68, 0.05)', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.05)'
                  }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      background: '#fef2f2', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#ef4444',
                      flexShrink: 0
                    }}>
                      <Clock size={16} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#ef4444', display: 'block', opacity: 0.8 }}>Sem Resposta</label>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#991b1b' }}>{unansweredTimeStr}</span>
                    </div>
                  </div>
                )}

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

                  {/* Atribuição de Consultor */}
                  <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.4, display: 'block', marginBottom: '0.5rem' }}>Encaminhar para Consultor</label>
                    <select 
                      value={activeChat?.assignedTo || ''}
                      disabled={isAssigning}
                      onChange={async (e) => {
                        const userId = e.target.value;
                        if (!userId || !selectedLead || !activeChat) return;
                        setIsAssigning(true);
                        try {
                          const res = await fetch('/api/opportunities', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ leadId: selectedLead.id, assignedTo: userId })
                          });
                          if (res.ok) {
                            showAlert('Lead encaminhado com sucesso!', 'success');
                            // Atualizar o chat localmente
                            setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, assignedTo: userId } : c));
                            // Disparar evento para atualizar a sidebar
                            window.dispatchEvent(new CustomEvent('oportunidades-read'));
                          } else {
                            const data = await res.json().catch(() => ({}));
                            showAlert(`Erro: ${data.error || 'Erro desconhecido'}`, 'error');
                          }
                        } catch (err) {
                          showAlert('Erro ao conectar com o servidor.', 'error');
                        } finally {
                          setIsAssigning(false);
                        }
                      }}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                    >
                      <option value="">Selecione um consultor...</option>
                      {systemUsers
                        .filter(u => u.status === 'approved')
                        .map(u => (
                          <option key={u.uid} value={u.uid}>
                            {u.name || u.email} ({u.role === 'admin' ? 'Master' : u.role === 'editor' ? 'Intermediário' : 'Básico'})
                          </option>
                        ))
                      }
                    </select>
                    <p style={{ fontSize: '0.65rem', marginTop: '0.5rem', opacity: 0.6 }}>Encaminhe este lead para que ele surja no módulo de Oportunidades do consultor.</p>
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

      {/* PAINEL DE DETALHES DO LEAD REMOVIDO DAQUI */}
      
      {showForwardModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', padding: '1.5rem',
            width: '90%', maxWidth: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Encaminhar mensagem
              <button onClick={() => { setShowForwardModal(false); setForwardMessage(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }}>×</button>
            </h3>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {chats.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleForwardMessage(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem',
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                    cursor: 'pointer', textAlign: 'left'
                  }}
                  className="hover-bg"
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={18} color="#64748b" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{c.leadName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.channel} - {c.connectionName}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showChannelSettingsModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '1.75rem',
            width: '90%', maxWidth: '450px', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, color: '#1e293b' }}>
              Personalizar Canais Visíveis
              <button onClick={() => setShowChannelSettingsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} />
              </button>
            </h3>
            
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem', marginTop: 0 }}>
              Marque quais canais/conexões você gostaria de visualizar como colunas no funil de atendimento.
            </p>

            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem', marginBottom: '1.5rem' }}>
              {orderedColumns.map((col, index) => {
                const isChecked = visibleColumns.includes(col.id);
                return (
                  <div 
                    key={col.id} 
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(index));
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceIndexStr = e.dataTransfer.getData('text/plain');
                      if (!sourceIndexStr) return;
                      const sourceIndex = parseInt(sourceIndexStr, 10);
                      if (isNaN(sourceIndex) || sourceIndex === index) return;

                      const newOrder = [...columnOrder];
                      orderedColumns.forEach(c => {
                        if (!newOrder.includes(c.id)) {
                          newOrder.push(c.id);
                        }
                      });

                      const [removed] = newOrder.splice(sourceIndex, 1);
                      newOrder.splice(index, 0, removed);
                      
                      setColumnOrder(newOrder);
                    }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem', 
                      padding: '0.75rem 1rem', 
                      background: isChecked ? '#f8fafc' : '#ffffff', 
                      border: '1px solid',
                      borderColor: isChecked ? 'var(--primary)' : '#e2e8f0', 
                      borderRadius: '10px', 
                      cursor: 'grab',
                      fontSize: '0.85rem',
                      fontWeight: isChecked ? 700 : 500,
                      color: isChecked ? '#1e293b' : '#475569',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setVisibleColumns([...visibleColumns, col.id]);
                        } else {
                          if (visibleColumns.length > 1) {
                            setVisibleColumns(visibleColumns.filter(id => id !== col.id));
                          } else {
                            alert('Você deve manter pelo menos um canal visível.');
                          }
                        }
                      }}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', userSelect: 'none' }}>
                      <span style={{ color: '#94a3b8', fontSize: '1rem', marginRight: '4px' }}>☰</span>
                      {col.name}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => {
                  const allIds = kanbanColumns.map(c => c.id);
                  setVisibleColumns(allIds);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  color: '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Marcar Todos
              </button>
              
              <button 
                onClick={() => {
                  localStorage.setItem('visible_kanban_columns', JSON.stringify(visibleColumns));
                  localStorage.setItem('kanban_column_order', JSON.stringify(columnOrder));
                  setShowChannelSettingsModal(false);
                  showAlert('Configurações salvas com sucesso!', 'success');
                }}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--primary)',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .atendimento-container {
          flex: 1;
          height: 100%;
          min-height: 0;
          margin: 0;
          display: flex;
          overflow: hidden;
          background: #f1f5f9;
        }
        .conversas-sidebar {
          width: 350px;
          background: white;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
        }
        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #f8fafc;
          position: relative;
          min-width: 0;
        }
        .chat-header {
          padding: 0.75rem 1.5rem;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .chat-header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
          min-width: 0;
        }
        .mobile-back-button {
          display: none !important;
        }
        .chat-header-right {
          display: flex;
          gap: 0.75rem;
          flex-shrink: 0;
        }
        .chat-lead-name {
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #1e293b;
        }
        .chat-footer {
          padding: 0 1.5rem 1.5rem;
          background: white;
          border-top: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }
        .chat-form {
          display: flex;
          gap: 1rem;
          align-items: center;
          padding-top: 1.5rem;
        }
        .connection-badge-container {
          flex: 1;
          display: flex;
          justify-content: center;
        }
        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          min-height: 0;
        }
        .message-bubble-wrapper {
          max-width: 70%;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
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
        @media (max-width: 768px) {
          .atendimento-container {
            height: calc(100vh - 60px) !important;
            height: calc(100dvh - 60px) !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .conversas-sidebar {
            width: 100% !important;
          }
          .conversas-sidebar.hidden-on-mobile {
            display: none !important;
          }
          .chat-area.hidden-on-mobile {
            display: none !important;
          }
          .chat-area.visible-on-mobile {
            display: flex !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .chat-header {
            padding: 0.5rem !important;
          }
          .chat-header-left {
            gap: 0.5rem !important;
          }
          .mobile-back-button {
            display: flex !important;
          }
          .chat-header-right {
            gap: 0.4rem !important;
          }
          .chat-lead-name {
            font-size: 0.9rem !important;
          }
          .connection-badge-container {
            display: none !important;
          }
          .chat-footer {
            padding: 0 0.75rem 0.75rem !important;
          }
          .chat-form {
            gap: 0.5rem !important;
            padding-top: 0.75rem !important;
          }
          .messages-container {
            padding: 1rem 0.75rem !important;
          }
          .message-bubble-wrapper {
            max-width: 85% !important;
          }
        }
      `}</style>

      {/* Modal de Pré-visualização de Anexo */}
      {pendingFile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '500px', maxWidth: '90%', background: 'white', padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Enviar Anexo</span>
              <button onClick={() => { setPendingFile(null); setPendingFilePreview(''); }} style={{ color: '#64748b', cursor: 'pointer', background: 'none', border: 'none' }}><X size={20} /></button>
            </h3>
            
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8fafc', borderRadius: '12px', padding: '1rem', minHeight: '200px', maxHeight: '300px', overflow: 'hidden' }}>
              {pendingFilePreview ? (
                pendingFile.type.startsWith('video/') ? (
                  <video src={pendingFilePreview} controls style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '8px' }} />
                ) : (
                  <img src={pendingFilePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '260px', objectFit: 'contain', borderRadius: '8px' }} />
                )
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <Paperclip size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{pendingFile.name}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{(pendingFile.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textAlign: 'left' }}>Legenda da Mensagem</label>
              <input 
                type="text" 
                placeholder="Adicione uma legenda..." 
                value={pendingFileCaption}
                onChange={e => setPendingFileCaption(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const btn = document.getElementById('send-pending-file-btn');
                    if (btn) btn.click();
                  }
                }}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', color: '#1e293b' }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button 
                onClick={() => { setPendingFile(null); setPendingFilePreview(''); }}
                style={{ flex: 1, background: '#f1f5f9', color: '#334155', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                id="send-pending-file-btn"
                onClick={async () => {
                  const file = pendingFile;
                  const caption = pendingFileCaption;
                  setPendingFile(null);
                  setPendingFilePreview('');
                  await uploadFile(file, caption);
                }}
                style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirmOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '400px', maxWidth: '90%', background: 'white', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', border: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Excluir Mensagem</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
              Deseja excluir esta mensagem? Você pode optar por apagar somente para você ou para todos no CRM.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button 
                onClick={handleConfirmDeleteForEveryone}
                style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                Excluir para todos
              </button>
              <button 
                onClick={handleConfirmDeleteForMe}
                style={{ background: '#f1f5f9', color: '#334155', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                Excluir apenas para mim
              </button>
              <button 
                onClick={() => { setDeleteConfirmOpen(false); setMessageToDeleteId(null); }}
                style={{ background: 'transparent', color: '#64748b', border: 'none', padding: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <PipelineAutomationModal 
        isOpen={isAutomationModalOpen}
        onClose={() => setIsAutomationModalOpen(false)}
      />

      {/* Notificação Toast Customizada */}
      {customAlert && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: customAlert.type === 'error' ? '#ef4444' : '#22c55e',
          color: 'white',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 600,
          fontSize: '0.9rem',
          animation: 'slideInRight 0.2s ease-out'
        }}>
          <span>{customAlert.message}</span>
          <button onClick={() => setCustomAlert(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '0.5rem', fontSize: '1rem', fontWeight: 'bold' }}>&times;</button>
        </div>
      )}
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
