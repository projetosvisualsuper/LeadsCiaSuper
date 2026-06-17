'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { InternalChat, InternalMessage, UserProfile } from '@/types/crm';
import { Search, Plus, Send, User, Users, MoreVertical, MessageSquare, Paperclip, Smile, Check, CheckCheck, Info, X, FileText, Image as ImageIcon, Pencil, Trash2, Camera, UserPlus, UserMinus } from 'lucide-react';

const EMOJIS = ['😀','😂','😍','😭','🙏','👍','🔥','❤️','🎉','😊','😎','🤔','😡','🥺','✨','💯','🙌','👏','👀','🚀'];

export default function ChatInternoPage() {
  const [chats, setChats] = useState<InternalChat[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [me, setMe] = useState<UserProfile | null>(null);
  
  const [selectedChat, setSelectedChat] = useState<InternalChat | null>(null);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatType, setNewChatType] = useState<'direct'|'group'>('direct');
  const [newChatName, setNewChatName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  
  // Novas funcionalidades
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  
  // Edição de grupo
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [showAddParticipant, setShowAddParticipant] = useState(false);

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
  }, []);

  useEffect(() => {
    if (me) {
      loadData();
      const interval = setInterval(loadData, 10000); // Polling 10s
      return () => clearInterval(interval);
    }
  }, [me]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
      const interval = setInterval(() => loadMessages(selectedChat.id), 5000); // Polling 5s messages
      return () => clearInterval(interval);
    }
  }, [selectedChat]);

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

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length]);

  const handleSendMessage = async (attachmentUrl?: string, attachmentName?: string) => {
    if ((!newMessage.trim() && !attachmentUrl) || !selectedChat || !me) return;
    
    if (editingMessageId) {
      // Edição de mensagem
      try {
        await fetch(`/api/internal-chats/${selectedChat.id}/messages/${editingMessageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newMessage.trim() })
        });
        setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, content: newMessage.trim(), isEdited: true } : m));
        setEditingMessageId(null);
        setNewMessage('');
      } catch (e) {
        console.error(e);
      }
      return;
    }

    const msg: any = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: me.uid,
      senderName: me.name || me.email,
      content: newMessage.trim() || (attachmentUrl ? '📁 Arquivo anexo' : ''),
      attachmentUrl,
      attachmentName
    };
    
    setNewMessage('');
    setShowEmojiPicker(false);
    setShowMentions(false);

    setMessages(prev => [...prev, { ...msg, chatId: selectedChat.id, timestamp: new Date().toISOString(), readByJson: '[]' }]);
    scrollToBottom();

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

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedChat) return;
    try {
      await fetch(`/api/internal-chats/${selectedChat.id}/messages/${messageId}`, {
        method: 'DELETE'
      });
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: '🚫 Mensagem apagada', isDeleted: true } : m));
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      alert("Arquivo muito grande. O limite é de 2MB.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      
      if (data.success && data.url) {
        await handleSendMessage(data.url, file.name);
      } else {
        alert("Erro ao enviar arquivo.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar arquivo.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

  return (
    <div style={{ display: 'flex', height: '100vh', margin: '-2rem', background: '#f8fafc', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: '320px', background: 'white', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, zIndex: 5 }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Chat Interno</h2>
          <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setIsNewChatModalOpen(true)}>
            <Plus size={18} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {chats.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => { setSelectedChat(chat); setShowGroupInfo(false); setShowEmojiPicker(false); setEditingMessageId(null); setNewMessage(''); }}
              style={{ 
                padding: '1rem', 
                borderBottom: '1px solid var(--border)', 
                cursor: 'pointer',
                background: selectedChat?.id === chat.id ? 'var(--accent)' : 'transparent',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center'
              }}
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
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getChatName(chat)}</h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.25rem' }}>
                  {chat.lastMessage || 'Nova conversa'}
                </p>
              </div>
            </div>
          ))}
          {chats.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              Nenhuma conversa. Clique no + para começar.
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0 }}>
        {selectedChat ? (
          <>
            {/* Header */}
            <div 
              style={{ padding: '1rem', background: '#f0f2f5', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', cursor: selectedChat.type === 'group' ? 'pointer' : 'default', zIndex: 5 }}
              onClick={() => selectedChat.type === 'group' && setShowGroupInfo(true)}
            >
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
              <button onClick={handleDeleteChat} style={{ color: '#ef4444', padding: '0.25rem' }} title="Apagar conversa">
                <Trash2 size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '1.5rem 5%', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.5rem',
              backgroundColor: '#efeae2',
              backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-solid-color-whatsapp-bg-whatsapp-dark-whatsapp-theme.jpg")',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}>
              {messages.map((msg, index) => {
                const isMe = msg.senderId === me?.uid;
                const prevMsg = messages[index - 1];
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
                      
                      <div style={{
                        position: 'relative',
                        background: isMe ? '#dcf8c6' : 'white',
                        color: msg.isDeleted ? '#94a3b8' : '#111b21',
                        fontStyle: msg.isDeleted ? 'italic' : 'normal',
                        padding: '0.4rem 0.5rem 0.4rem 0.6rem',
                        borderRadius: '7.5px',
                        borderTopRightRadius: isMe && showTail ? 0 : '7.5px',
                        borderTopLeftRadius: !isMe && showTail ? 0 : '7.5px',
                        maxWidth: '75%',
                        boxShadow: '0 1px 0.5px rgba(11,20,26,.13)',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
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

                        {/* Attachment Render */}
                        {msg.attachmentUrl && !msg.isDeleted && (
                          <div style={{ marginBottom: '0.25rem' }}>
                            {msg.attachmentUrl.startsWith('data:image') || msg.attachmentUrl.match(/\.(jpeg|jpg|gif|png)$/) ? (
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
                          <span style={{ fontSize: '0.875rem', lineHeight: '1.4' }}>
                            {renderMessageText(msg.content)}
                            {msg.isEdited && !msg.isDeleted && <span style={{ fontSize: '0.65rem', color: '#64748b', marginLeft: '4px' }}>(editado)</span>}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', color: '#667781', fontSize: '0.65rem', marginBottom: '-2px', minWidth: isMe ? '45px' : 'auto' }}>
                            <span style={{ marginTop: '2px' }}>{formatTime(msg.timestamp)}</span>
                            {renderMessageStatus(msg)}
                          </div>
                        </div>
                      </div>

                      </div>
                      {/* Hover Actions */}
                      {isMe && !msg.isDeleted && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1" style={{ alignSelf: 'center' }}>
                          <button onClick={() => { setEditingMessageId(msg.id); setNewMessage(msg.content); inputRef.current?.focus(); }} style={{ padding: '0.25rem', color: '#64748b', cursor: 'pointer', background: 'white', borderRadius: '50%' }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDeleteMessage(msg.id)} style={{ padding: '0.25rem', color: '#ef4444', cursor: 'pointer', background: 'white', borderRadius: '50%' }}>
                            <Trash2 size={14} />
                          </button>
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
            <div style={{ padding: '0.75rem 1rem', background: '#f0f2f5', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button ref={emojiButtonRef} onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ padding: '0.5rem', color: '#54656f' }}>
                <Smile size={24} />
              </button>
              
              <button onClick={() => fileInputRef.current?.click()} style={{ padding: '0.5rem', color: '#54656f' }} disabled={isUploading}>
                <Paperclip size={24} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileUpload} 
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              />

              <div style={{ flex: 1, background: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>
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
                  />
                )}
              </div>
              
              <button onClick={() => handleSendMessage()} style={{ padding: '0.5rem', color: newMessage.trim() ? '#00a884' : '#54656f', transition: 'color 0.2s' }}>
                <Send size={24} />
              </button>
            </div>
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
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '350px', background: '#f0f2f5', borderLeft: '1px solid var(--border)', zIndex: 20, display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.2s ease-out' }}>
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
    </div>
  );
}
