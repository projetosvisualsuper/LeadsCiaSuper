'use client';

import { useState, useEffect, useRef } from 'react';
import { InternalChat, InternalMessage, UserProfile } from '@/types/crm';
import { Search, Plus, Send, User, Users, MoreVertical, MessageSquare } from 'lucide-react';

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      setMessages(data || []);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !me) return;
    
    const msg = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: me.uid,
      senderName: me.name || me.email,
      content: newMessage.trim()
    };
    
    setNewMessage('');
    // Optimistic update
    setMessages(prev => [...prev, { ...msg, chatId: selectedChat.id, timestamp: new Date().toISOString(), readByJson: '[]' }]);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    try {
      await fetch(`/api/internal-chats/${selectedChat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
      loadData(); // Update sidebar last message
    } catch (e) {
      console.error(e);
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

  const getChatName = (chat: InternalChat) => {
    if (chat.type === 'group') return chat.name;
    try {
      const parts = JSON.parse(chat.participantsJson);
      const otherId = parts.find((id: string) => id !== me?.uid);
      const otherUser = users.find(u => u.uid === otherId);
      return otherUser?.name || otherUser?.email || 'Usuário Desconhecido';
    } catch(e) { return 'Chat'; }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Carregando Chat Interno...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
      {/* Sidebar */}
      <div style={{ width: '320px', background: 'white', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
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
              onClick={() => setSelectedChat(chat)}
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
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {chat.type === 'group' ? <Users size={20} color="#64748b" /> : <User size={20} color="#64748b" />}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getChatName(chat)}</h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.25rem' }}>
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedChat ? (
          <>
            {/* Header */}
            <div style={{ padding: '1rem', background: 'white', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selectedChat.type === 'group' ? <Users size={20} color="#64748b" /> : <User size={20} color="#64748b" />}
              </div>
              <div>
                <h3 style={{ fontWeight: 'bold' }}>{getChatName(selectedChat)}</h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedChat.type === 'group' ? 'Grupo' : 'Mensagem Direta'}</p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {messages.map(msg => {
                const isMe = msg.senderId === me?.uid;
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', marginLeft: isMe ? 0 : '0.5rem', marginRight: isMe ? '0.5rem' : 0 }}>
                      {isMe ? 'Você' : msg.senderName}
                    </div>
                    <div style={{
                      background: isMe ? 'var(--primary)' : 'white',
                      color: isMe ? 'white' : '#1e293b',
                      padding: '0.75rem 1rem',
                      borderRadius: '16px',
                      borderTopRightRadius: isMe ? 0 : '16px',
                      borderTopLeftRadius: isMe ? '16px' : 0,
                      maxWidth: '70%',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      border: isMe ? 'none' : '1px solid var(--border)'
                    }}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '1rem', background: 'white', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  className="btn-outline" 
                  style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '24px' }} 
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                />
                <button className="btn btn-primary" style={{ borderRadius: '50%', width: '48px', height: '48px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={handleSendMessage}>
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: '1rem' }}>
            <MessageSquare size={48} opacity={0.5} />
            <p>Selecione uma conversa ou inicie uma nova para começar.</p>
          </div>
        )}
      </div>

      {/* Modal Nova Conversa */}
      {isNewChatModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '400px', maxWidth: '90%' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Nova Conversa</h3>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="radio" checked={newChatType === 'direct'} onChange={() => setNewChatType('direct')} /> Individual
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="radio" checked={newChatType === 'group'} onChange={() => setNewChatType('group')} /> Grupo
              </label>
            </div>

            {newChatType === 'group' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Nome do Grupo</label>
                <input type="text" className="btn-outline" style={{ width: '100%', padding: '0.5rem' }} value={newChatName} onChange={e => setNewChatName(e.target.value)} />
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Selecionar Participante(s)</label>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                {users.filter(u => u.uid !== me?.uid).map(u => (
                  <label key={u.uid} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                    <input 
                      type={newChatType === 'group' ? 'checkbox' : 'radio'} 
                      name="chat_user"
                      checked={selectedUsers.includes(u.uid)}
                      onChange={(e) => {
                        if (newChatType === 'group') {
                          setSelectedUsers(prev => e.target.checked ? [...prev, u.uid] : prev.filter(id => id !== u.uid));
                        } else {
                          setSelectedUsers([u.uid]);
                        }
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.name || 'Sem Nome'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreateChat}>Criar</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsNewChatModalOpen(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
