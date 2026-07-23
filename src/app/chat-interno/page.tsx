'use client';
import { useState, useEffect, useRef, Fragment } from 'react';
import { InternalChat, InternalMessage, UserProfile } from '@/types/crm';
import { Search, Plus, Send, User, Users, MoreVertical, MessageSquare, Paperclip, Smile, Check, CheckCheck, Info, X, FileText, Image as ImageIcon, Pencil, Trash2, Camera, UserPlus, UserMinus, Mic, Square, Reply, Forward, ChevronLeft, ChevronDown, Upload, Phone, Download } from 'lucide-react';

const EMOJIS = ['😀','😂','😍','😭','🙏','👍','🔥','❤️','🎉','😊','😎','🤔','😡','🥺','✨','💯','🙌','👏','👀','🚀'];

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
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: isIncoming ? '#f8fafc' : 'rgba(0, 0, 0, 0.05)', padding: '0.25rem', borderRadius: '8px' }}>
      <audio ref={audioRef} src={src} controls style={{ height: '36px', maxWidth: '220px' }} />
      <button 
        onClick={toggleSpeed} 
        style={{ 
          background: isIncoming ? '#cbd5e1' : 'rgba(255, 255, 255, 0.3)', 
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

export default function ChatInternoPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [chats, setChats] = useState<InternalChat[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [me, setMe] = useState<UserProfile | null>(null);
  
  const [selectedChat, setSelectedChat] = useState<InternalChat | null>(null);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Estados para WhatsApp Interno
  const [activeTab, setActiveTab] = useState<'system' | 'whatsapp'>('whatsapp');
  const [whatsappChats, setWhatsappChats] = useState<any[]>([]);
  const [selectedWhatsappChat, setSelectedWhatsappChat] = useState<any | null>(null);
  const [whatsappMessages, setWhatsappMessages] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatType, setNewChatType] = useState<'direct'|'group'>('direct');
  const [newChatName, setNewChatName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  
  // Gravador de áudio
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Resposta/Citação
  const [replyingToMessage, setReplyingToMessage] = useState<InternalMessage | null>(null);

  // Encaminhamento
  const [forwardMessage, setForwardMessage] = useState<InternalMessage | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);

  // Novas funcionalidades
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  
  // Edição de grupo
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [showAddParticipant, setShowAddParticipant] = useState(false);

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEmojiPicker && 
        emojiPickerRef.current && 
        !emojiPickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (showEmojiPicker && event.key === 'Escape') {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setMe(data.user);
        }
      });
    // Garantir que as migrações de banco rodem
    fetch('/api/migrate').catch(console.error);
  }, []);

  useEffect(() => {
    if (me) {
      loadData();
      const interval = setInterval(() => {
        if (!document.hidden) loadData();
      }, 15000); // Polling 15s

      const handleVisibilityChange = () => {
        if (!document.hidden) loadData();
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [me]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
      const interval = setInterval(() => {
        if (!document.hidden) loadMessages(selectedChat.id);
      }, 8000); // Polling 8s messages

      const handleVisibilityChange = () => {
        if (!document.hidden) loadMessages(selectedChat.id);
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [selectedChat]);

  useEffect(() => {
    if (selectedWhatsappChat && activeTab === 'whatsapp') {
      loadWhatsappMessages(selectedWhatsappChat.id);
      const interval = setInterval(() => {
        if (!document.hidden) loadWhatsappMessages(selectedWhatsappChat.id);
      }, 8000); // Polling 8s

      const handleVisibilityChange = () => {
        if (!document.hidden) loadWhatsappMessages(selectedWhatsappChat.id);
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [selectedWhatsappChat, activeTab]);

  const loadData = async () => {
    if (!me) return;
    try {
      const res = await fetch(`/api/internal-chats?userId=${me.uid}`);
      const data = await res.json();
      setChats(data.chats || []);
      setUsers(data.users || []);
      
      // Update selected chat references if it changed
      if (selectedChat) {
        const updatedChat = data.chats?.find((c: any) => c.id === selectedChat.id);
        if (updatedChat) setSelectedChat(updatedChat);
      }

      // Buscar conexões do WhatsApp
      const connRes = await fetch('/api/chats?type=connections');
      if (connRes.ok) {
        const connList = await connRes.json();
        setConnections(connList || []);
      }

      // Buscar conversas internas de WhatsApp
      const waRes = await fetch(`/api/chats?t=${Date.now()}`);
      if (waRes.ok) {
        const waChatsList = await waRes.json();
        const internalWaChats = waChatsList.filter((c: any) => c.isInternal === 1);
        setWhatsappChats(internalWaChats);
        
        if (selectedWhatsappChat) {
          const updatedWa = internalWaChats.find((c: any) => c.id === selectedWhatsappChat.id);
          if (updatedWa) setSelectedWhatsappChat(updatedWa);
        }
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const res = await fetch(`/api/internal-chats/${chatId}/messages`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        if (me) {
          fetch(`/api/internal-chats/${chatId}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: me.uid })
          }).catch(console.error);
        }
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadWhatsappMessages = async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats?chatId=${chatId}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setWhatsappMessages(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedWhatsappChat) {
      setSelectedConnectionId(selectedWhatsappChat.connectionId || '');
    }
  }, [selectedWhatsappChat]);

  const getUniqueConnectionsForChat = () => {
    const ids = new Set<string>();
    if (selectedWhatsappChat?.connectionId) {
      ids.add(selectedWhatsappChat.connectionId);
    }
    whatsappMessages.forEach(m => {
      if (m.connectionId) {
        ids.add(m.connectionId);
      }
    });
    return connections.filter(conn => ids.has(conn.id));
  };

  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const hasLoadedInitialMessages = useRef(false);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string>('');
  const [pendingFileCaption, setPendingFileCaption] = useState('');

  const messagesContainerRef = useRef<HTMLDivElement>(null);

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
    } else {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 80);
    }
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    setShowScrollBottomBtn(!isNearBottom);
  };

  useEffect(() => {
    hasLoadedInitialMessages.current = false;
    setShowScrollBottomBtn(false);
    scrollToBottom();
  }, [selectedChat, selectedWhatsappChat, activeTab]);

  useEffect(() => {
    const msgs = activeTab === 'whatsapp' ? whatsappMessages : messages;
    if (msgs.length > 0 && !hasLoadedInitialMessages.current) {
      setTimeout(scrollToBottom, 100);
      hasLoadedInitialMessages.current = true;
    }
  }, [messages.length, whatsappMessages.length, activeTab]);

  const handleSendWhatsappMessage = async (mediaUrl?: string, mediaMimeType?: string, caption?: string) => {
    const finalContent = caption !== undefined ? caption : newMessage.trim();
    if ((!finalContent && !mediaUrl) || !selectedWhatsappChat || !me) return;

    try {
      const msgPayload = {
        chatId: selectedWhatsappChat.id,
        leadId: selectedWhatsappChat.leadId,
        content: finalContent,
        isIncoming: false,
        mediaUrl: mediaUrl || null,
        mediaMimeType: mediaMimeType || null,
        senderId: 'vendedor',
        senderName: me.name || me.email || 'Vendedor',
        connectionId: selectedConnectionId || selectedWhatsappChat.connectionId
      };

      // Optimistic update
      const localMsg = {
        id: Math.random().toString(36).substr(2, 9),
        chatId: selectedWhatsappChat.id,
        senderId: 'vendedor',
        senderName: 'Você',
        content: finalContent,
        timestamp: new Date().toISOString(),
        isIncoming: 0,
        mediaUrl: mediaUrl || null,
        mediaMimeType: mediaMimeType || null
      };
      setWhatsappMessages(prev => [...prev, localMsg]);
      setNewMessage('');
      setTimeout(scrollToBottom, 50);

      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgPayload)
      });

      if (res.ok) {
        loadWhatsappMessages(selectedWhatsappChat.id);
      }
    } catch (e) {
      console.error('Erro ao enviar mensagem de WhatsApp interno:', e);
    }
  };

  const handleSendMessage = async (attachmentUrl?: string, attachmentName?: string, caption?: string) => {
    if (activeTab === 'whatsapp') {
      let mimeType = 'image/png';
      if (attachmentName?.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (attachmentName?.endsWith('.webm') || attachmentName?.endsWith('.mp3')) mimeType = 'audio/webm';
      await handleSendWhatsappMessage(attachmentUrl, attachmentUrl ? mimeType : undefined, caption);
      return;
    }

    const finalContent = caption !== undefined ? caption : newMessage.trim();

    if ((!finalContent && !attachmentUrl) || !selectedChat || !me) return;
    
    if (editingMessageId) {
      // Edição de mensagem
      try {
        await fetch(`/api/internal-chats/${selectedChat.id}/messages/${editingMessageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: finalContent })
        });
        setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, content: finalContent, isEdited: true } : m));
        setEditingMessageId(null);
        setNewMessage('');
      } catch (e) {
        console.error(e);
      }
      return;
    }

    let msgType = 'text';
    if (attachmentUrl) {
      if (attachmentUrl.startsWith('data:audio') || attachmentName?.endsWith('.webm') || attachmentUrl.match(/\.(webm|mp3|ogg|wav|m4a)$/i)) {
        msgType = 'audio';
      } else if (attachmentUrl.startsWith('data:image') || attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
        msgType = 'image';
      } else if (attachmentUrl.startsWith('data:video') || attachmentUrl.match(/\.(mp4|avi|mov)$/i)) {
        msgType = 'video';
      } else {
        msgType = 'file';
      }
    }

    const msg: any = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: me.uid,
      senderName: me.name || me.email,
      content: finalContent || (attachmentUrl ? (msgType === 'audio' ? '🎵 Áudio' : msgType === 'image' ? '📷 Imagem' : msgType === 'video' ? '🎥 Vídeo' : '📁 Arquivo anexo') : ''),
      attachmentUrl,
      attachmentName,
      type: msgType,
      quotedMessageId: replyingToMessage?.id || null,
      quotedMessageSender: replyingToMessage?.senderName || null,
      quotedMessageContent: replyingToMessage?.content || replyingToMessage?.attachmentUrl || null
    };
    
    setNewMessage('');
    setShowEmojiPicker(false);
    setShowMentions(false);
    setReplyingToMessage(null);

    setMessages(prev => [...prev, { ...msg, chatId: selectedChat.id, timestamp: new Date().toISOString(), readByJson: '[]' }]);
    setTimeout(scrollToBottom, 50);

    try {
      await fetch(`/api/internal-chats/${selectedChat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
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
        
        const dt = new DataTransfer();
        dt.items.add(audioFile);
        const dummyEvent = { target: { files: dt.files } } as React.ChangeEvent<HTMLInputElement>;
        await handleFileUpload(dummyEvent);
        
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
      showAlert('Não foi possível acessar o microfone. Verifique as permissões.', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setRecordingTime(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const handleForwardMessage = async (targetChatId: string) => {
    if (!forwardMessage || !me) return;
    const targetChat = chats.find(c => c.id === targetChatId);
    if (!targetChat) return;

    try {
      const msg: any = {
        id: Math.random().toString(36).substr(2, 9),
        senderId: me.uid,
        senderName: me.name || me.email,
        content: forwardMessage.content,
        type: forwardMessage.type || 'text',
        attachmentUrl: forwardMessage.attachmentUrl,
        attachmentName: forwardMessage.attachmentName
      };

      await fetch(`/api/internal-chats/${targetChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });

      showAlert('Mensagem encaminhada com sucesso!');
    } catch (error) {
      console.error('Erro ao encaminhar:', error);
      showAlert('Erro ao encaminhar mensagem.', 'error');
    } finally {
      setShowForwardModal(false);
      setForwardMessage(null);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessageToDeleteId(messageId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDeleteForEveryone = async () => {
    if (!messageToDeleteId || !selectedChat) return;
    const messageId = messageToDeleteId;
    setDeleteConfirmOpen(false);
    setMessageToDeleteId(null);
    try {
      await fetch(`/api/internal-chats/${selectedChat.id}/messages/${messageId}`, {
        method: 'DELETE'
      });
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: '🚫 Mensagem apagada', isDeleted: true } : m));
      showAlert('Mensagem apagada para todos!');
    } catch (e) {
      console.error(e);
      showAlert('Erro ao apagar mensagem', 'error');
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
    showAlert('Mensagem excluída apenas para você!');
  };

  const uploadFile = async (file: File, caption?: string) => {
    if (file.size > 2 * 1024 * 1024) {
      showAlert("Arquivo muito grande. O limite é de 2MB.", "error");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      
      if (data.success && data.url) {
        await handleSendMessage(data.url, file.name, caption);
      } else {
        showAlert("Erro ao enviar arquivo.", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Erro ao enviar arquivo.", "error");
    } finally {
      setIsUploading(false);
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
    if (file) handleFileSelect(file);
  };

  const handleCreateChat = async () => {
    if (!me) return;
    if (selectedUsers.length === 0) return;
    if (newChatType === 'group' && !newChatName.trim()) return;

    const body = {
      id: Math.random().toString(36).substr(2, 9),
      type: newChatType,
      name: newChatType === 'group' ? newChatName : '',
      participants: [me.uid, ...selectedUsers]
    };

    try {
      const res = await fetch(`/api/internal-chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success && data.chat) {
        setIsNewChatModalOpen(false);
        setSelectedUsers([]);
        setNewChatName('');
        await loadData();
        setSelectedChat(data.chat);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Group Management
  const handleUpdateGroup = async (updates: any) => {
    if (!selectedChat) return;
    try {
      await fetch(`/api/internal-chats/${selectedChat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      // Update state locally
      setSelectedChat(prev => prev ? { ...prev, ...updates, participantsJson: updates.participants ? JSON.stringify(updates.participants) : prev.participantsJson } : prev);
      setChats(prev => prev.map(c => c.id === selectedChat.id ? { ...c, ...updates, participantsJson: updates.participants ? JSON.stringify(updates.participants) : c.participantsJson } : c));
      
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedChat || !confirm('Tem certeza que deseja apagar esta conversa inteira? Essa ação não pode ser desfeita.')) return;
    try {
      await fetch(`/api/internal-chats/${selectedChat.id}`, { method: 'DELETE' });
      setChats(prev => prev.filter(c => c.id !== selectedChat.id));
      setSelectedChat(null);
      setMessages([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGroupAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success && data.url) {
        await handleUpdateGroup({ avatarUrl: data.url });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveGroupName = async () => {
    if (editGroupName.trim() && editGroupName !== selectedChat?.name) {
      await handleUpdateGroup({ name: editGroupName });
    }
    setIsEditingGroupName(false);
  };

  const handleAddParticipant = async (userId: string) => {
    if (!selectedChat) return;
    const parts = JSON.parse(selectedChat.participantsJson || '[]');
    if (!parts.includes(userId)) {
      await handleUpdateGroup({ participants: [...parts, userId] });
    }
    setShowAddParticipant(false);
  };

  const handleRemoveParticipant = async (userId: string) => {
    if (!selectedChat || !confirm('Remover participante?')) return;
    const parts = JSON.parse(selectedChat.participantsJson || '[]');
    const newParts = parts.filter((id: string) => id !== userId);
    await handleUpdateGroup({ participants: newParts });
  };

  // Input & Mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMessage(val);

    if (selectedChat?.type === 'group') {
      const cursor = e.target.selectionStart || 0;
      const textBeforeCursor = val.slice(0, cursor);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
      
      if (mentionMatch) {
        setShowMentions(true);
        setMentionFilter(mentionMatch[1].toLowerCase());
      } else {
        setShowMentions(false);
      }
    }
  };

  const insertMention = (userName: string) => {
    if (!inputRef.current) return;
    const cursor = inputRef.current.selectionStart || 0;
    const textBeforeCursor = newMessage.slice(0, cursor);
    const textAfterCursor = newMessage.slice(cursor);
    
    const textBeforeMention = textBeforeCursor.replace(/@\w*$/, '');
    const newText = `${textBeforeMention}@${userName} ${textAfterCursor}`;
    setNewMessage(newText);
    setShowMentions(false);
    inputRef.current.focus();
  };

  // Render Helpers
  const getChatName = (chat: InternalChat) => {
    if (chat.type === 'group') return chat.name;
    try {
      const parts = JSON.parse(chat.participantsJson);
      const otherId = parts.find((id: string) => id !== me?.uid);
      const otherUser = users.find(u => u.uid === otherId);
      return otherUser?.name || otherUser?.email || 'Usuário Desconhecido';
    } catch(e) { return 'Chat'; }
  };

  const getChatAvatar = (chat: InternalChat) => {
    if (chat.type === 'group') return chat.avatarUrl;
    try {
      const parts = JSON.parse(chat.participantsJson);
      const otherId = parts.find((id: string) => id !== me?.uid);
      const otherUser = users.find(u => u.uid === otherId);
      return otherUser?.avatarUrl;
    } catch(e) { return undefined; }
  };

  const renderMessageText = (text: string) => {
    // Basic regex for mentions (@Name)
    const mentionRegex = /@([A-Za-z0-9_]+)/g;
    const parts = text.split(mentionRegex);
    if (parts.length === 1) return text;
    
    return parts.map((part, i) => {
      if (i % 2 === 1) { // This is a mention
        return <span key={i} style={{ color: '#0284c7', fontWeight: 600, background: 'rgba(2,132,199,0.1)', padding: '0 4px', borderRadius: '4px' }}>@{part}</span>;
      }
      return part;
    });
  };

  const renderMessageStatus = (msg: InternalMessage) => {
    if (msg.senderId !== me?.uid) return null;
    try {
      const readBy = JSON.parse(msg.readByJson || '[]');
      const isRead = selectedChat?.type === 'group' ? readBy.length > 0 : readBy.length > 0;
      if (isRead) {
        return <CheckCheck size={14} color="#3b82f6" style={{ marginLeft: '4px' }} />;
      }
      return <Check size={14} color="#94a3b8" style={{ marginLeft: '4px' }} />;
    } catch (e) {
      return <Check size={14} color="#94a3b8" style={{ marginLeft: '4px' }} />;
    }
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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

  if (loading) return <div style={{ padding: '2rem' }}>Carregando Chat Interno...</div>;

  const chatParticipants = selectedChat ? JSON.parse(selectedChat.participantsJson || '[]') : [];
  const availableUsersForMention = users.filter(u => chatParticipants.includes(u.uid) && u.name?.toLowerCase().includes(mentionFilter));
  const availableUsersToAdd = users.filter(u => !chatParticipants.includes(u.uid) && u.uid !== me?.uid);

  const visibleMessages = messages.filter(msg => !hiddenMessageIds.includes(msg.id));

  return (
    <div className="chat-interno-container">
      <input 
        type="file" 
        id="file-upload-internal"
        ref={fileInputRef} 
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'hidden', pointerEvents: 'none' }} 
        onChange={handleFileUpload} 
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
      />
      {/* Sidebar */}
      <div style={{ 
        width: isMobile ? '100%' : '320px', 
        background: 'white', 
        borderRight: '1px solid var(--border)', 
        display: isMobile && (selectedChat || selectedWhatsappChat) ? 'none' : 'flex', 
        flexDirection: 'column', 
        minHeight: 0, 
        zIndex: 5 
      }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Chat Interno</h2>
          {activeTab === 'system' && (
            <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setIsNewChatModalOpen(true)}>
              <Plus size={18} />
            </button>
          )}
        </div>

        {/* Tab Buttons Selector */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
          <button 
            onClick={() => { setActiveTab('whatsapp'); setSelectedChat(null); }}
            style={{ 
              flex: 1, 
              padding: '0.75rem', 
              border: 'none', 
              background: activeTab === 'whatsapp' ? 'white' : 'transparent',
              borderBottom: activeTab === 'whatsapp' ? '2px solid var(--primary)' : 'none',
              fontWeight: activeTab === 'whatsapp' ? 'bold' : 'normal',
              color: activeTab === 'whatsapp' ? 'var(--primary)' : '#64748b',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            WhatsApp Interno
          </button>
          <button 
            onClick={() => { setActiveTab('system'); setSelectedWhatsappChat(null); }}
            style={{ 
              flex: 1, 
              padding: '0.75rem', 
              border: 'none', 
              background: activeTab === 'system' ? 'white' : 'transparent',
              borderBottom: activeTab === 'system' ? '2px solid var(--primary)' : 'none',
              fontWeight: activeTab === 'system' ? 'bold' : 'normal',
              color: activeTab === 'system' ? 'var(--primary)' : '#64748b',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Chat do Sistema
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {activeTab === 'system' ? (
            <>
              {chats.map(chat => (
                <div 
                  key={chat.id} 
                  onClick={() => { setSelectedChat(chat); setShowGroupInfo(false); setShowEmojiPicker(false); setEditingMessageId(null); setNewMessage(''); }}
                  style={{ 
                    padding: '1rem', 
                    borderBottom: '1px solid var(--border)', 
                    cursor: 'pointer',
                    background: selectedChat?.id === chat.id 
                      ? 'var(--accent)' 
                      : ((chat.unreadCount || 0) > 0 ? '#f0fdf4' : 'transparent'),
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center'
                  }}
                  className="hover:bg-slate-50"
                >
                  <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {getChatAvatar(chat) ? (
                      <img src={getChatAvatar(chat)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : chat.type === 'group' ? (
                      <Users size={20} color="#64748b" />
                    ) : (
                      <User size={20} color="#64748b" />
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontWeight: (chat.unreadCount || 0) > 0 ? 700 : 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#1e293b' }}>
                        {getChatName(chat)}
                      </h4>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <p style={{ 
                        fontSize: '0.8rem', 
                        color: (chat.unreadCount || 0) > 0 ? '#475569' : '#64748b', 
                        fontWeight: (chat.unreadCount || 0) > 0 ? 600 : 400,
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        margin: 0
                      }}>
                        {chat.lastMessage || 'Nova conversa'}
                      </p>
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
              ))}
              {chats.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                  Nenhuma conversa. Clique no + para começar.
                </div>
              )}
            </>
          ) : (
            <>
              {whatsappChats.map(chat => (
                <div 
                  key={chat.id} 
                  onClick={() => { setSelectedWhatsappChat(chat); setShowEmojiPicker(false); setNewMessage(''); }}
                  style={{ 
                    padding: '1rem', 
                    borderBottom: '1px solid var(--border)', 
                    cursor: 'pointer',
                    background: selectedWhatsappChat?.id === chat.id 
                      ? 'var(--accent)' 
                      : 'transparent',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center'
                  }}
                  className="hover:bg-slate-50"
                >
                  <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {chat.leadAvatar ? (
                      <img src={chat.leadAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={20} color="#64748b" />
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#1e293b' }}>
                        {chat.leadName}
                      </h4>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <p style={{ 
                        fontSize: '0.8rem', 
                        color: '#64748b', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        margin: 0
                      }}>
                        {chat.lastMessage || 'Nova conversa'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {whatsappChats.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                  Nenhuma conversa de WhatsApp interna encontrada.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ flex: 1, display: isMobile && !(selectedChat || selectedWhatsappChat) ? 'none' : 'flex', flexDirection: 'column', position: 'relative', minHeight: 0 }}
      >
        {(selectedChat || selectedWhatsappChat) && isDragging && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 168, 132, 0.15)',
            backdropFilter: 'blur(4px)',
            border: '3px dashed #00a884',
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
              <Upload size={48} color="#00a884" />
              <p style={{ fontWeight: 700, color: '#1e293b', margin: 0 }}>Arraste e solte o arquivo aqui para enviar</p>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Imagens, vídeos, áudios ou documentos (máx 2MB)</p>
            </div>
          </div>
        )}
        {activeTab === 'whatsapp' ? (
          selectedWhatsappChat ? (
            <>
              {/* WhatsApp Header */}
              <div 
                style={{ padding: '1rem', background: '#f0f2f5', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 5 }}
              >
                {isMobile && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWhatsappChat(null);
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0.25rem 0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}
                <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {selectedWhatsappChat.leadAvatar ? (
                    <img src={selectedWhatsappChat.leadAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={20} color="#475569" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: '600', fontSize: '1rem', color: '#111b21' }}>{selectedWhatsappChat.leadName}</h3>
                  <p style={{ fontSize: '0.75rem', color: '#667781', marginTop: '0.1rem' }}>
                    WhatsApp · Conexão Atual: {connections.find(c => c.id === selectedConnectionId)?.name || selectedWhatsappChat.connectionName || 'Padrão'}
                  </p>
                </div>
                {/* Lista suspensa para trocar de conexão interna */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#54656f', fontWeight: 600 }}>Com quem:</span>
                  <select
                    value={selectedConnectionId || ''}
                    onChange={(e) => setSelectedConnectionId(e.target.value)}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      background: 'white',
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  >
                    <option value="">Todas as Conexões</option>
                    {connections.map((conn: any) => (
                      <option key={conn.id} value={conn.id}>
                        {conn.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* WhatsApp Messages Area */}
              <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  minHeight: 0,
                  padding: '1.5rem 5%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.5rem',
                  backgroundColor: '#efeae2',
                  backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-solid-color-whatsapp-bg-whatsapp-dark-whatsapp-theme.jpg")',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {(() => {
                  const visibleWaMessages = whatsappMessages.filter(m => {
                    if (!selectedConnectionId) return true;
                    const msgConnId = m.connectionId || selectedWhatsappChat.connectionId;
                    if (!msgConnId) return true;
                    
                    const selectedConn = connections.find(c => c.id === selectedConnectionId);
                    if (!selectedConn) return true;
                    
                    const msgConnLower = msgConnId.toLowerCase();
                    return (
                      msgConnLower === selectedConn.id.toLowerCase() ||
                      msgConnLower === selectedConn.name.toLowerCase() ||
                      msgConnLower === selectedConn.evolutionInstanceName?.toLowerCase()
                    );
                  });
                  return visibleWaMessages.map((msg, index) => {
                    const isMe = !msg.isIncoming || msg.isIncoming === 0;
                    const prevMsg = visibleWaMessages[index - 1];
                    const showTail = !prevMsg || (!prevMsg.isIncoming || prevMsg.isIncoming === 0) !== isMe;
                    const showDateSeparator = !prevMsg || new Date(prevMsg.timestamp).toDateString() !== new Date(msg.timestamp).toDateString();
                    const dateLabel = showDateSeparator ? formatMessageDate(msg.timestamp) : '';

                    return (
                      <Fragment key={msg.id || index}>
                        {showDateSeparator && (
                          <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
                            <span style={{ background: 'rgba(255,255,255,0.95)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, color: '#54656f', boxShadow: '0 1px 2px rgba(11,20,26,0.1)' }}>
                              {dateLabel}
                            </span>
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: showTail ? '0.5rem' : '1px', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flexDirection: isMe ? 'row-reverse' : 'row', maxWidth: '85%' }}>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                              <div 
                                style={{
                                  position: 'relative',
                                  background: isMe ? '#dcf8c6' : 'white',
                                  color: '#111b21',
                                  padding: '0.4rem 0.5rem 0.4rem 0.6rem',
                                  borderRadius: '7.5px',
                                  borderTopRightRadius: isMe && showTail ? 0 : '7.5px',
                                  borderTopLeftRadius: !isMe && showTail ? 0 : '7.5px',
                                  maxWidth: '100%',
                                  width: 'fit-content',
                                  boxShadow: '0 1px 0.5px rgba(11,20,26,.13)',
                                  display: 'flex',
                                  flexDirection: 'column'
                                }}
                              >
                                {showTail && isMe && (
                                  <svg viewBox="0 0 8 13" width="8" height="13" style={{ position: 'absolute', top: 0, right: '-8px', color: '#dcf8c6' }}>
                                    <path opacity=".13" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                                    <path fill="currentColor" d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z"></path>
                                  </svg>
                                )}
                                {showTail && !isMe && (
                                  <svg viewBox="0 0 8 13" width="8" height="13" style={{ position: 'absolute', top: 0, left: '-8px', color: 'white' }}>
                                    <path opacity=".13" fill="#0000000" d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"></path>
                                    <path fill="currentColor" d="M1.533 2.568 8 11.193V0H2.812C1.042 0 .474 1.156 1.533 2.568z"></path>
                                  </svg>
                                )}

                                {/* Media Render */}
                                {msg.mediaUrl && (
                                  <div style={{ marginBottom: '0.25rem' }}>
                                    {msg.mediaMimeType?.startsWith('audio') || msg.mediaUrl.match(/\.(webm|mp3|ogg|wav|m4a)$/i) ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                                        <AudioPlayer src={msg.mediaUrl} isIncoming={!isMe} />
                                        <a href={`${msg.mediaUrl}?download=true`} download style={{ color: !isMe ? '#475569' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', textDecoration: 'none', flexShrink: 0 }} title="Baixar áudio">
                                          <Download size={16} />
                                        </a>
                                      </div>
                                    ) : msg.mediaMimeType?.startsWith('image') || msg.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                      <div style={{ position: 'relative', width: 'fit-content', maxWidth: '100%' }}>
                                        <img src={msg.mediaUrl} alt="Anexo" style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => window.open(msg.mediaUrl, '_blank')} />
                                        <a href={`${msg.mediaUrl}?download=true`} download style={{ position: 'absolute', top: '8px', right: '8px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', borderRadius: '6px', textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} title="Baixar imagem">
                                          <Download size={16} />
                                        </a>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%', maxWidth: '280px' }}>
                                        <a href={msg.mediaUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.05)', padding: '0.75rem', borderRadius: '4px', textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
                                          <FileText size={20} style={{ flexShrink: 0 }} />
                                          <span style={{ fontSize: '0.85rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Visualizar</span>
                                        </a>
                                        <a href={`${msg.mediaUrl}?download=true`} download style={{ color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', textDecoration: 'none', flexShrink: 0 }} title="Baixar arquivo">
                                          <Download size={16} />
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '0.9rem', lineHeight: '1.4', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                    {msg.content}
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', color: '#667781', fontSize: '0.65rem', marginBottom: '-2px', minWidth: isMe ? '45px' : 'auto', flexShrink: 0 }}>
                                    <span style={{ marginTop: '2px' }}>{formatTime(msg.timestamp)}</span>
                                    {isMe && <CheckCheck size={14} color="#3b82f6" style={{ marginLeft: '4px' }} />}
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      </Fragment>
                    );
                  });
                })()}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Footer */}
              <footer style={{ padding: '0.5rem 1rem', background: '#f0f2f5', display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: '1px solid var(--border)', zIndex: 10 }}>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button 
                    ref={emojiButtonRef}
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#54656f', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Smile size={24} />
                  </button>
                  <label 
                    htmlFor="file-upload-internal" 
                    style={{ cursor: 'pointer', color: '#54656f', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Paperclip size={24} />
                  </label>
                </div>

                <div style={{ flex: 1, position: 'relative' }}>
                  <input 
                    ref={inputRef}
                    type="text" 
                    placeholder="Digite uma mensagem" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSendMessage();
                      }
                    }}
                    onPaste={handleInputPaste}
                    style={{ 
                      width: '100%', 
                      padding: '0.6rem 1rem', 
                      borderRadius: '8px', 
                      border: 'none', 
                      outline: 'none',
                      fontSize: '0.95rem',
                      background: 'white'
                    }} 
                  />
                </div>

                <div>
                  {isUploading ? (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.75rem' }}>...</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleSendMessage()} 
                      style={{ 
                        width: '40px', height: '40px', borderRadius: '50%', 
                        background: '#00a884', color: 'white', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0
                      }}
                    >
                      <Send size={18} style={{ marginLeft: '2px' }} />
                    </button>
                  )}
                </div>
              </footer>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#667781', flexDirection: 'column', gap: '1rem', background: '#f0f2f5' }}>
              <div style={{ background: 'white', padding: '2rem', borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <MessageSquare size={48} color="#00a884" />
              </div>
              <h2 style={{ fontSize: '1.5rem', color: '#41525d', marginTop: '1rem', fontWeight: 300 }}>WhatsApp Interno</h2>
              <p style={{ fontSize: '0.875rem' }}>Selecione uma conversa ao lado para iniciar.</p>
            </div>
          )
        ) : selectedChat ? (
          <>
            {/* Header */}
            <div 
              style={{ padding: '1rem', background: '#f0f2f5', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', cursor: selectedChat.type === 'group' ? 'pointer' : 'default', zIndex: 5 }}
              onClick={() => selectedChat.type === 'group' && setShowGroupInfo(true)}
            >
              {isMobile && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedChat(null);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0.25rem 0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}
                >
                  <ChevronLeft size={24} />
                </button>
              )}
               <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {getChatAvatar(selectedChat) ? (
                  <img src={getChatAvatar(selectedChat)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : selectedChat.type === 'group' ? (
                  <Users size={20} color="#475569" />
                ) : (
                  <User size={20} color="#475569" />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: '600', fontSize: '1rem', color: '#111b21' }}>{getChatName(selectedChat)}</h3>
                {selectedChat.type === 'group' && <p style={{ fontSize: '0.75rem', color: '#667781', marginTop: '0.1rem' }}>Clique para ver os participantes</p>}
              </div>
              {selectedChat.type === 'group' && (
                <Info size={20} color="#64748b" style={{ cursor: 'pointer', marginRight: '0.5rem' }} />
              )}
              {selectedChat.type === 'direct' && (
                <button 
                  onClick={() => {
                    const participants = JSON.parse(selectedChat.participantsJson || '[]');
                    const otherUserId = participants.find((id: string) => id !== me?.uid);
                    if (otherUserId) {
                      window.dispatchEvent(new CustomEvent('start-voice-call', { detail: { otherUserId } }));
                    }
                  }} 
                  style={{ color: '#10b981', padding: '0.25rem', marginRight: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                  title="Iniciar ligação de voz"
                >
                  <Phone size={20} />
                </button>
              )}
              <button onClick={handleDeleteChat} style={{ color: '#ef4444', padding: '0.25rem' }} title="Apagar conversa">
                <Trash2 size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              onScroll={handleScroll}
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                minHeight: 0,
                padding: '1.5rem 5%', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.5rem',
                backgroundColor: '#efeae2',
                backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-solid-color-whatsapp-bg-whatsapp-dark-whatsapp-theme.jpg")',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {visibleMessages.map((msg, index) => {
                const isMe = msg.senderId === me?.uid;
                const prevMsg = visibleMessages[index - 1];
                const showTail = !prevMsg || prevMsg.senderId !== msg.senderId;

                const showDateSeparator = !prevMsg || new Date(prevMsg.timestamp).toDateString() !== new Date(msg.timestamp).toDateString();
                const dateLabel = showDateSeparator ? formatMessageDate(msg.timestamp) : '';

                return (
                  <Fragment key={msg.id}>
                    {showDateSeparator && (
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
                        <span style={{ background: 'rgba(255,255,255,0.95)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, color: '#54656f', boxShadow: '0 1px 2px rgba(11,20,26,0.1)' }}>
                          {dateLabel}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: showTail ? '0.5rem' : '1px', width: '100%' }} className="group">
                    
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flexDirection: isMe ? 'row-reverse' : 'row', maxWidth: '85%', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                      {/* Avatar do Remetente (Apenas Grupos ou Direct, se não for "Eu") */}
                      {!isMe && (
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: showTail ? '#e2e8f0' : 'transparent', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '0.2rem' }}>
                          {showTail ? (
                            users.find(u => u.uid === msg.senderId)?.avatarUrl ? (
                              <img src={users.find(u => u.uid === msg.senderId)?.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <User size={14} color="#64748b" />
                            )
                          ) : null}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        {!isMe && showTail && selectedChat.type === 'group' && (
                          <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600, marginBottom: '0.15rem', marginLeft: '0.5rem' }}>
                            {msg.senderName}
                          </div>
                        )}
                      
                      <div 
                        id={`msg-${msg.id}`}
                        style={{
                          position: 'relative',
                          background: isMe ? '#dcf8c6' : 'white',
                          color: msg.isDeleted ? '#94a3b8' : '#111b21',
                          fontStyle: msg.isDeleted ? 'italic' : 'normal',
                          padding: '0.4rem 0.5rem 0.4rem 0.6rem',
                          borderRadius: '7.5px',
                          borderTopRightRadius: isMe && showTail ? 0 : '7.5px',
                          borderTopLeftRadius: !isMe && showTail ? 0 : '7.5px',
                          maxWidth: '100%',
                          width: 'fit-content',
                          boxShadow: '0 1px 0.5px rgba(11,20,26,.13)',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        {/* Tail SVG */}
                        {showTail && isMe && (
                          <svg viewBox="0 0 8 13" width="8" height="13" style={{ position: 'absolute', top: 0, right: '-8px', color: '#dcf8c6' }}>
                            <path opacity=".13" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                            <path fill="currentColor" d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z"></path>
                          </svg>
                        )}
                        {showTail && !isMe && (
                          <svg viewBox="0 0 8 13" width="8" height="13" style={{ position: 'absolute', top: 0, left: '-8px', color: 'white' }}>
                            <path opacity=".13" fill="#0000000" d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"></path>
                            <path fill="currentColor" d="M1.533 2.568 8 11.193V0H2.812C1.042 0 .474 1.156 1.533 2.568z"></path>
                          </svg>
                        )}

                        {/* Quoted Message Render */}
                        {msg.quotedMessageId && !msg.isDeleted && (
                          <div 
                            style={{ 
                              background: isMe ? 'rgba(0, 0, 0, 0.05)' : '#f0f2f5', 
                              borderLeft: '4px solid #00a884', 
                              padding: '0.35rem 0.5rem', 
                              borderRadius: '4px', 
                              marginBottom: '0.4rem',
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              const target = document.getElementById(`msg-${msg.quotedMessageId}`);
                              if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                          >
                            <div style={{ fontWeight: 'bold', color: '#00a884', fontSize: '0.75rem', marginBottom: '0.1rem' }}>
                              {msg.quotedMessageSender}
                            </div>
                            <div style={{ color: '#4a4a4a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                              {msg.quotedMessageContent}
                            </div>
                          </div>
                        )}

                        {/* Attachment Render */}
                        {msg.attachmentUrl && !msg.isDeleted && (
                          <div style={{ marginBottom: '0.25rem' }}>
                            {msg.type === 'audio' ? (
                              <AudioPlayer src={msg.attachmentUrl} isIncoming={!isMe} />
                            ) : msg.attachmentUrl.startsWith('data:image') || msg.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                              <img src={msg.attachmentUrl} alt="Anexo" style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => window.open(msg.attachmentUrl, '_blank')} />
                            ) : (
                              <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.05)', padding: '0.75rem', borderRadius: '4px', textDecoration: 'none', color: 'inherit' }}>
                                <FileText size={20} />
                                <span style={{ fontSize: '0.85rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.attachmentName || 'Arquivo Anexo'}</span>
                              </a>
                            )}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.9rem', lineHeight: '1.4', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                            {renderMessageText(msg.content)}
                            {msg.isEdited && !msg.isDeleted && <span style={{ fontSize: '0.65rem', color: '#64748b', marginLeft: '4px' }}>(editado)</span>}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', color: '#667781', fontSize: '0.65rem', marginBottom: '-2px', minWidth: isMe ? '45px' : 'auto', flexShrink: 0 }}>
                            <span style={{ marginTop: '2px' }}>{formatTime(msg.timestamp)}</span>
                            {renderMessageStatus(msg)}
                          </div>
                        </div>
                      </div>

                      </div>
                      {/* Hover Actions */}
                      {!msg.isDeleted && (
                        <div 
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1" 
                          style={{ alignSelf: 'center', margin: isMe ? '0 0.5rem 0 0' : '0 0 0 0.5rem' }}
                        >
                          <button 
                            onClick={() => { setReplyingToMessage(msg); inputRef.current?.focus(); }} 
                            style={{ padding: '0.25rem', color: '#64748b', cursor: 'pointer', background: 'white', borderRadius: '50%', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Responder"
                          >
                            <Reply size={14} />
                          </button>
                          <button 
                            onClick={() => { setForwardMessage(msg); setShowForwardModal(true); }} 
                            style={{ padding: '0.25rem', color: '#64748b', cursor: 'pointer', background: 'white', borderRadius: '50%', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Encaminhar"
                          >
                            <Forward size={14} />
                          </button>
                          {isMe && (
                            <>
                              <button onClick={() => { setEditingMessageId(msg.id); setNewMessage(msg.content); inputRef.current?.focus(); }} style={{ padding: '0.25rem', color: '#64748b', cursor: 'pointer', background: 'white', borderRadius: '50%', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Editar">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => handleDeleteMessage(msg.id)} style={{ padding: '0.25rem', color: '#ef4444', cursor: 'pointer', background: 'white', borderRadius: '50%', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Excluir">
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  </Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Editing Bar */}
            {editingMessageId && (
              <div style={{ background: '#f8fafc', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.875rem', color: '#0284c7' }}><Pencil size={14} style={{ display: 'inline', marginRight: '0.25rem' }}/> Editando mensagem...</span>
                <button onClick={() => { setEditingMessageId(null); setNewMessage(''); }} style={{ color: '#64748b' }}><X size={16} /></button>
              </div>
            )}

            {/* Mentions Popover */}
            {showMentions && (
              <div style={{ position: 'absolute', bottom: editingMessageId ? '110px' : '80px', left: '1rem', background: 'white', borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', zIndex: 10, width: '250px', maxHeight: '200px', overflowY: 'auto' }}>
                {availableUsersForMention.map(u => (
                  <div key={u.uid} onClick={() => insertMention(u.name?.replace(/\s/g, '') || u.uid)} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', borderBottom: '1px solid var(--border)' }} className="hover:bg-slate-50">
                    <User size={16} color="#64748b" />
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{u.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
              <div ref={emojiPickerRef} style={{ position: 'absolute', bottom: editingMessageId ? '110px' : '80px', left: '1rem', background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', zIndex: 10 }}>
                {EMOJIS.map(emoji => (
                  <button 
                    key={emoji} 
                    onClick={() => setNewMessage(prev => prev + emoji)}
                    style={{ fontSize: '1.5rem', padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <footer style={{ padding: '0 1rem 1rem', background: '#f0f2f5', display: 'flex', flexDirection: 'column' }}>
              {replyingToMessage && (
                <div style={{
                  padding: '10px 15px',
                  background: 'white',
                  borderLeft: '4px solid var(--primary)',
                  borderRadius: '8px 8px 0 0',
                  marginTop: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #e2e8f0',
                  boxShadow: '0 -1px 2px rgba(0,0,0,0.05)'
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
                    <X size={16} />
                  </button>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', paddingTop: replyingToMessage ? '1rem' : '0.75rem' }}>
                <button ref={emojiButtonRef} onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ padding: '0.5rem', color: '#54656f' }}>
                  <Smile size={24} />
                </button>
                
                <label 
                  htmlFor="file-upload-internal" 
                  style={{ 
                    padding: '0.5rem', 
                    color: '#54656f', 
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: isUploading ? 'none' : 'auto'
                  }}
                >
                  <Paperclip size={24} />
                </label>

                {isRecording ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', height: '40px' }}>
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
                  <div style={{ flex: 1, background: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', boxShadow: '0 1px 1px rgba(0,0,0,0.05)', height: '40px' }}>
                    {isUploading ? (
                      <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Enviando arquivo...</span>
                    ) : (
                      <input 
                        ref={inputRef}
                        type="text" 
                        style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.95rem' }} 
                        placeholder="Mensagem"
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        onPaste={handleInputPaste}
                      />
                    )}
                  </div>
                )}
                
                {isRecording ? (
                  <button 
                    type="button"
                    onClick={stopRecording}
                    style={{ 
                      width: '40px', height: '40px', borderRadius: '50%', 
                      background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0
                    }}
                  >
                    <Send size={18} style={{ marginLeft: '2px' }} />
                  </button>
                ) : newMessage.trim() ? (
                  <button 
                    onClick={() => handleSendMessage()} 
                    style={{ 
                      width: '40px', height: '40px', borderRadius: '50%', 
                      background: '#00a884', color: 'white', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0
                    }}
                  >
                    <Send size={18} style={{ marginLeft: '2px' }} />
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={startRecording}
                    style={{ 
                      width: '40px', height: '40px', borderRadius: '50%', 
                      background: '#10b981', color: 'white', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0
                    }}
                  >
                    <Mic size={18} />
                  </button>
                )}
              </div>
            </footer>

            {showScrollBottomBtn && (
              <button
                type="button"
                onClick={scrollToBottom}
                style={{
                  position: 'absolute',
                  bottom: '75px',
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
                title="Ir para a última mensagem"
              >
                <ChevronDown size={22} />
              </button>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#667781', flexDirection: 'column', gap: '1rem', background: '#f0f2f5' }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <MessageSquare size={48} color="#00a884" />
            </div>
            <h2 style={{ fontSize: '1.5rem', color: '#41525d', marginTop: '1rem', fontWeight: 300 }}>Cia Super Leads Chat</h2>
            <p style={{ fontSize: '0.875rem' }}>Selecione uma conversa ao lado ou inicie uma nova.</p>
          </div>
        )}

        {/* Group Info Modal (Lateral Direito) */}
        {showGroupInfo && selectedChat?.type === 'group' && (
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: isMobile ? '100%' : '350px', background: '#f0f2f5', borderLeft: '1px solid var(--border)', zIndex: 20, display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.2s ease-out' }}>
            <div style={{ padding: '1.25rem', background: 'white', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => setShowGroupInfo(false)} style={{ color: '#54656f' }}><X size={20} /></button>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111b21' }}>Dados do grupo</h3>
            </div>
            
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'white', borderBottom: '1px solid var(--border)' }}>
              <div 
                style={{ width: '150px', height: '150px', borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => groupAvatarRef.current?.click()}
              >
                {selectedChat.avatarUrl ? (
                  <img src={selectedChat.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Users size={60} color="#475569" />
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} className="hover:opacity-100">
                  <Camera color="white" size={32} />
                </div>
              </div>
              <input type="file" ref={groupAvatarRef} style={{ display: 'none' }} accept="image/*" onChange={handleGroupAvatarUpload} />
              
              {isEditingGroupName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="text" value={editGroupName} onChange={e => setEditGroupName(e.target.value)} style={{ padding: '0.5rem', border: '1px solid var(--primary)', borderRadius: '4px', width: '200px' }} autoFocus />
                  <button onClick={handleSaveGroupName} style={{ background: 'var(--primary)', color: 'white', padding: '0.5rem', borderRadius: '4px' }}><Check size={16}/></button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.5rem', color: '#111b21', fontWeight: 400 }}>{selectedChat.name}</h2>
                  <button onClick={() => { setIsEditingGroupName(true); setEditGroupName(selectedChat.name || ''); }} style={{ color: '#64748b' }}><Pencil size={16}/></button>
                </div>
              )}

              <p style={{ color: '#667781', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Grupo · {chatParticipants.length} participantes
              </p>
            </div>
            
            <div style={{ padding: '1rem', background: 'white', marginTop: '0.5rem', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingLeft: '0.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#008069' }}>Participantes</h4>
                <button onClick={() => setShowAddParticipant(!showAddParticipant)} style={{ color: '#008069', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 600 }}>
                  <UserPlus size={16} /> Adicionar
                </button>
              </div>

              {showAddParticipant && (
                <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px' }}>
                  {availableUsersToAdd.length === 0 ? (
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Todos os usuários já estão no grupo.</span>
                  ) : (
                    availableUsersToAdd.map(u => (
                      <div key={u.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.875rem' }}>{u.name}</span>
                        <button onClick={() => handleAddParticipant(u.uid)} style={{ color: '#22c55e' }}><Plus size={16}/></button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {chatParticipants.map((participantId: string) => {
                const user = users.find(u => u.uid === participantId);
                const isYou = participantId === me?.uid;
                return (
                  <div key={participantId} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', transition: 'background 0.2s', borderRadius: '8px' }} className="group">
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <User size={20} color="#64748b" />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.95rem', color: '#111b21' }}>{isYou ? 'Você' : (user?.name || 'Usuário Desconhecido')}</div>
                      <div style={{ fontSize: '0.8rem', color: '#667781' }}>{user?.email || ''}</div>
                    </div>
                    {!isYou && (
                      <button onClick={() => handleRemoveParticipant(participantId)} style={{ color: '#ef4444', padding: '0.25rem' }} className="opacity-0 group-hover:opacity-100 transition-opacity" title="Remover participante">
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal Nova Conversa */}
      {isNewChatModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '450px', maxWidth: '90%', background: 'white', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', border: 'none' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#111b21' }}>Nova Conversa</h3>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', flex: 1, background: newChatType === 'direct' ? '#f0fdf4' : 'transparent', borderColor: newChatType === 'direct' ? '#22c55e' : 'var(--border)' }}>
                <input type="radio" checked={newChatType === 'direct'} onChange={() => setNewChatType('direct')} style={{ accentColor: '#22c55e' }} /> Individual
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', flex: 1, background: newChatType === 'group' ? '#f0fdf4' : 'transparent', borderColor: newChatType === 'group' ? '#22c55e' : 'var(--border)' }}>
                <input type="radio" checked={newChatType === 'group'} onChange={() => setNewChatType('group')} style={{ accentColor: '#22c55e' }} /> Grupo
              </label>
            </div>

            {newChatType === 'group' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#475569' }}>Nome do Grupo</label>
                <input type="text" className="btn-outline" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px' }} placeholder="Ex: Equipe de Vendas" value={newChatName} onChange={e => setNewChatName(e.target.value)} />
              </div>
            )}

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#475569' }}>Selecionar Participante(s)</label>
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                {users.filter(u => u.uid !== me?.uid).length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                    Nenhum outro usuário cadastrado no sistema.
                  </div>
                ) : (
                  users.filter(u => u.uid !== me?.uid).map(u => (
                    <label key={u.uid} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s', background: selectedUsers.includes(u.uid) ? '#f8fafc' : 'white' }}>
                      <input 
                        type={newChatType === 'group' ? 'checkbox' : 'radio'} 
                        name="chat_user"
                        style={{ accentColor: '#22c55e', width: '16px', height: '16px' }}
                        checked={selectedUsers.includes(u.uid)}
                        onChange={(e) => {
                          if (newChatType === 'group') {
                            setSelectedUsers(prev => e.target.checked ? [...prev, u.uid] : prev.filter(id => id !== u.uid));
                          } else {
                            setSelectedUsers([u.uid]);
                          }
                        }}
                      />
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <User size={16} color="#64748b" />
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{u.name || 'Sem Nome'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1, padding: '0.75rem' }} onClick={() => setIsNewChatModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1, padding: '0.75rem', background: '#22c55e' }} onClick={handleCreateChat}>Iniciar Conversa</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Encaminhar Mensagem */}
      {showForwardModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '450px', maxWidth: '90%', background: 'white', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', border: 'none' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#111b21' }}>Encaminhar Mensagem</h3>
            
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#475569' }}>Selecione a conversa para encaminhar</label>
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                {chats.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                    Nenhuma conversa ativa encontrada.
                  </div>
                ) : (
                  chats.map(chat => (
                    <div 
                      key={chat.id} 
                      onClick={() => handleForwardMessage(chat.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s' }}
                      className="hover:bg-slate-50"
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {getChatAvatar(chat) ? (
                          <img src={getChatAvatar(chat)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : chat.type === 'group' ? (
                          <Users size={16} color="#64748b" />
                        ) : (
                          <User size={16} color="#64748b" />
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{getChatName(chat)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1, padding: '0.75rem' }} onClick={() => { setShowForwardModal(false); setForwardMessage(null); }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .chat-interno-container {
          display: flex;
          flex: 1;
          height: 100%;
          min-height: 0;
          margin: 0;
          background: #f8fafc;
          overflow: hidden;
          width: 100%;
        }
        @media (max-width: 768px) {
          .chat-interno-container {
            height: 100% !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* Modal de Pré-visualização de Anexo */}
      {pendingFile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '500px', maxWidth: '90%', background: 'white', padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: 'none' }}>
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
