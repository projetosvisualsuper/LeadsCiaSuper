'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { api } from '@/services/api';
import { 
  LayoutDashboard, 
  Users, 
  Mail, 
  Settings as SettingsIcon, 
  PlusCircle, 
  BarChart3,
  Code,
  Bell,
  X,
  UserPlus,
  Layout as LayoutIcon,
  MessageCircle,
  Smartphone,
  LogIn,
  ShieldCheck,
  ShieldAlert,
  Zap,
  ChevronLeft,
  ChevronRight,
  Menu,
  Filter,
  SquareStack,
  MessageSquare,
  Bot,
  User,
  Camera,
  Phone,
  Mic
} from 'lucide-react';
import { UserProfile, Lead } from '@/types/crm';

const rolePermissions: Record<string, string[]> = {
  basico: ['/', '/leads', '/atendimento', '/chat-interno'],
  intermediario: ['/', '/leads', '/atendimento', '/chat-interno', '/bots', '/campanhas', '/segmentacoes', '/relatorios', '/integracoes', '/captura-editor', '/whatsapp', '/bio', '/popups'],
  master: ['/', '/leads', '/atendimento', '/chat-interno', '/bots', '/campanhas', '/segmentacoes', '/relatorios', '/integracoes', '/captura-editor', '/whatsapp', '/bio', '/popups', '/conexoes', '/configuracoes', '/usuarios']
};

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Lista de rotas que pertencem ao PAINEL ADMINISTRATIVO
  const adminRoutes = [
    '/', 
    '/leads', 
    '/campanhas', 
    '/relatorios', 
    '/integracoes', 
    '/captura-editor', 
    '/configuracoes',
    '/whatsapp',
    '/bio',
    '/usuarios',
    '/segmentacoes',
    '/popups',
    '/atendimento',
    '/chat-interno',
    '/bots',
    '/conexoes'
  ];

  // Se a rota NÃO estiver na lista acima, consideramos que é uma Página de Captura pública
  const isCapturePage = !adminRoutes.includes(pathname);
  const [notification, setNotification] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [whatsappUnreadCount, setWhatsappUnreadCount] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Estados para Ligações de Voz via WebRTC (Globais)
  const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'connected'>('idle');
  const [peerInstance, setPeerInstance] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [incomingCallerName, setIncomingCallerName] = useState('');
  const [outgoingReceiverName, setOutgoingReceiverName] = useState('');
  const [systemUsers, setSystemUsers] = useState<UserProfile[]>([]);

  // Sintetizador de áudio nativo para som de chamada (Web Audio API)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<any>(null);

  const startDialTone = () => {
    try {
      stopCallSounds();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = 350;
      osc2.frequency.value = 440;
      gain.gain.value = 0.05;

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      let soundOn = true;
      ringtoneIntervalRef.current = setInterval(() => {
        if (soundOn) {
          gain.gain.setValueAtTime(0, ctx.currentTime);
        } else {
          gain.gain.setValueAtTime(0.05, ctx.currentTime);
        }
        soundOn = !soundOn;
      }, 1500);
    } catch (e) {
      console.error('Erro ao tocar som de chamada:', e);
    }
  };

  const startRingtone = () => {
    try {
      stopCallSounds();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      gain.gain.value = 0.05;

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      let soundOn = true;
      ringtoneIntervalRef.current = setInterval(() => {
        if (soundOn) {
          gain.gain.setValueAtTime(0, ctx.currentTime);
        } else {
          gain.gain.setValueAtTime(0.05, ctx.currentTime);
        }
        soundOn = !soundOn;
      }, 1000);
    } catch (e) {
      console.error('Erro ao tocar ringtone:', e);
    }
  };

  const stopCallSounds = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(console.error);
      audioCtxRef.current = null;
    }
  };

  const showNativeNotification = (title: string, body: string) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico'
      });
      notification.onclick = () => {
        window.focus();
      };
    }
  };

  // Pedir permissão de notificações nativas no carregamento do layout
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Carregar lista de usuários para resolver UIDs de chamadas
  useEffect(() => {
    if (userProfile) {
      api.getAllUserProfiles()
        .then(setSystemUsers)
        .catch(console.error);
    }
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile?.uid) return;

    let peer: any;
    const initPeer = async () => {
      try {
        const PeerClass = (await import('peerjs')).default;
        peer = new PeerClass(userProfile.uid, {
          host: '0.peerjs.com',
          secure: true,
          port: 443,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' }
            ]
          }
        });
        setPeerInstance(peer);

        peer.on('open', (id: string) => {
          console.log('Conexão PeerJS Global aberta com ID:', id);
        });

        peer.on('error', (err: any) => {
          console.error('Erro no PeerJS Global:', err);
        });

        peer.on('call', async (call: any) => {
          console.log('Recebendo chamada global de:', call.peer);
          
          // Buscar nome do chamador de forma dinâmica
          let caller = systemUsers.find(u => u.uid === call.peer);
          if (!caller) {
            try {
              const allUsers = await api.getAllUserProfiles();
              setSystemUsers(allUsers);
              caller = allUsers.find(u => u.uid === call.peer);
            } catch(e) {}
          }
          const callerName = caller?.name || caller?.email || 'Atendente';
          
          setIncomingCallerName(callerName);
          setActiveCall(call);
          setCallState('ringing');
          startRingtone();

          if (document.hidden) {
            showNativeNotification('Chamada de Voz Recebida', `${callerName} está ligando para você...`);
          }
        });
      } catch (err) {
        console.error('Falha ao inicializar PeerJS:', err);
      }
    };

    initPeer();

    return () => {
      stopCallSounds();
      if (peer) {
        peer.destroy();
      }
    };
  }, [userProfile, systemUsers.length]);

  useEffect(() => {
    let interval: any;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const startVoiceCall = async (otherUserId: string) => {
    if (!userProfile || !peerInstance) return;

    let otherUser = systemUsers.find(u => u.uid === otherUserId);
    setOutgoingReceiverName(otherUser?.name || otherUser?.email || 'Atendente');
    setCallState('calling');
    startDialTone();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      const call = peerInstance.call(otherUserId, stream);
      setActiveCall(call);

      call.on('stream', (rStream: MediaStream) => {
        stopCallSounds();
        setRemoteStream(rStream);
        setCallState('connected');
      });

      call.on('close', () => {
        endVoiceCall();
      });

      call.on('error', (err: any) => {
        console.error('Erro na ligação:', err);
        endVoiceCall();
      });
    } catch (err: any) {
      console.error('Erro ao iniciar ligação:', err);
      alert('Não foi possível acessar o microfone. Verifique as permissões de gravação.');
      setCallState('idle');
      stopCallSounds();
    }
  };

  const acceptVoiceCall = async () => {
    if (!activeCall) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      activeCall.answer(stream);
      setCallState('connected');
      stopCallSounds();

      activeCall.on('stream', (rStream: MediaStream) => {
        setRemoteStream(rStream);
      });

      activeCall.on('close', () => {
        endVoiceCall();
      });

      activeCall.on('error', (err: any) => {
        console.error('Erro ao aceitar ligação:', err);
        endVoiceCall();
      });
    } catch (err: any) {
      console.error('Erro ao aceitar ligação:', err);
      alert('Não foi possível acessar o microfone.');
      declineVoiceCall();
    }
  };

  const declineVoiceCall = () => {
    stopCallSounds();
    if (activeCall) {
      activeCall.close();
    }
    setCallState('idle');
    setActiveCall(null);
    setIncomingCallerName('');
  };

  const endVoiceCall = () => {
    stopCallSounds();
    if (activeCall) {
      activeCall.close();
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setCallState('idle');
    setActiveCall(null);
    setLocalStream(null);
    setRemoteStream(null);
    setCallDuration(0);
    setIsMuted(false);
    setIncomingCallerName('');
    setOutgoingReceiverName('');
  };

  const toggleMuteCall = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Escutar eventos globais emitidos pelo chat interno para iniciar ligação
  useEffect(() => {
    const handleStartCallEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { otherUserId } = customEvent.detail;
      startVoiceCall(otherUserId);
    };
    window.addEventListener('start-voice-call', handleStartCallEvent);
    return () => window.removeEventListener('start-voice-call', handleStartCallEvent);
  }, [peerInstance, systemUsers]);

  useEffect(() => {
    setShowMobileMenu(false);
  }, [pathname]);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCapturePage) {
      setLoading(false);
      return;
    }

    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated) {
          router.push('/login');
        } else {
          setUserProfile(data.user);
        }
        setLoading(false);
      });
  }, [router, isCapturePage]);

  useEffect(() => {
    if (userProfile?.uid) {
      const fetchUnreadChats = async () => {
        try {
          const res = await fetch(`/api/internal-chats/unread?userId=${userProfile.uid}`);
          const data = await res.json();
          if (data.unreadCount !== undefined) {
            setUnreadChatCount(data.unreadCount);
          }
        } catch(e) { }
      };

      const fetchWhatsappUnread = async () => {
        try {
          const res = await fetch(`/api/chats/unread?t=${Date.now()}`);
          const data = await res.json();
          if (data.unreadCount !== undefined) {
            setWhatsappUnreadCount(data.unreadCount);
          }
        } catch(e) { }
      };

      // Traz as infos uma vez
      fetchUnreadChats();
      fetchWhatsappUnread();

      // Poll apenas de pendencias e chat (como era antes para pending users)
      const fetchPending = async () => {
        if (userProfile?.role === 'admin') {
          try {
            const res = await fetch('/api/usuarios/pendentes/count');
            const data = await res.json();
            if (data.count !== undefined) {
              setPendingUsersCount(data.count);
            }
          } catch (error) { }
        }
      };

      fetchPending();
      const interval = setInterval(() => {
        if (document.hidden) return;
        fetchPending();
        fetchUnreadChats();
        fetchWhatsappUnread();
      }, 30000); // Check a cada 30s

      const handleVisibilityChange = () => {
        if (!document.hidden) {
          fetchPending();
          fetchUnreadChats();
          fetchWhatsappUnread();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [userProfile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success && data.url) {
        const updateRes = await fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: data.url })
        });
        const updateData = await updateRes.json();
        if (updateData.success && updateData.user) {
          setUserProfile(updateData.user);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const userRole = userProfile?.role === 'admin' ? 'master' : (userProfile?.role === 'editor' ? 'intermediario' : (userProfile?.role || 'basico'));

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user.status === 'approved') {
          setUserProfile(data.user);
          const mappedRole = data.user.role === 'admin' ? 'master' : (data.user.role === 'editor' ? 'intermediario' : (data.user.role || 'basico'));
          const allowedPaths = rolePermissions[mappedRole] || [];
          if (!isCapturePage && pathname !== '/' && !allowedPaths.includes(pathname)) {
            router.push('/');
          }
        } else {
          setUserProfile(null);
          if (!isCapturePage) router.push('/login');
        }
      } else {
        setUserProfile(null);
        if (!isCapturePage) router.push('/login');
      }
    } catch (e) {
      console.error(e);
      setUserProfile(null);
      if (!isCapturePage) router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, [pathname, isCapturePage]);

  // Função para tocar um sinal sonoro agradável (duplo tom) usando a Web Audio API
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      
      // Primeiro tom
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // Ré5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Segundo tom
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12); // A5
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // Ré6
      gain2.gain.setValueAtTime(0.15, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.8);
    } catch (e) {
      console.error('Falha ao tocar som de notificação:', e);
    }
  };

  const lastLeadIdRef = useRef<string | null>(null);

  // Polling para novos Leads
  useEffect(() => {
    if (!userProfile) return;

    let isFirstLoad = true;
    let intervalId: any;

    const checkNewLeads = async () => {
      try {
        // Verificar se notificações de novos leads estão ativas
        const settings = await api.getSettings();
        if (settings?.notificacoes?.novosLeads === false) {
          return;
        }

        const leads = await api.getLeads(1);
        if (leads && leads.length > 0) {
          const latestLead = leads[0];
          
          if (isFirstLoad) {
            lastLeadIdRef.current = latestLead.id;
            isFirstLoad = false;
          } else if (lastLeadIdRef.current && latestLead.id !== lastLeadIdRef.current) {
            lastLeadIdRef.current = latestLead.id;
            
            // Exibir notificação visual
            setNotification({
              type: 'lead',
              title: 'Novo Lead!',
              message: `${latestLead.nome || 'Cliente'} entrou via ${latestLead.origem}`
            });
            
            // Tocar som de notificação
            playChime();
          }
        }
      } catch (e) {
        console.error('Erro ao verificar novos leads no polling:', e);
      }
    };

    checkNewLeads();
    intervalId = setInterval(() => {
      if (!document.hidden) checkNewLeads();
    }, 60000); // Polling a cada 60 segundos

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [userProfile]);

  useEffect(() => {
    if (userProfile?.role !== 'admin') return;

    const checkPendingUsers = async () => {
      try {
        const users = await api.getAllUserProfiles();
        const pending = users.filter(u => u.status === 'pending');
        setPendingUsersCount(pending.length);
      } catch (e) {
        console.error(e);
      }
    };

    checkPendingUsers();
  }, [userProfile?.role]);

  if (pathname === '/whatsapp-widget') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            background: transparent !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            color-scheme: light !important;
          }
          html::-webkit-scrollbar, body::-webkit-scrollbar {
            display: none !important;
          }
        `}} />
        {children}
      </>
    );
  }

  if (isCapturePage) {
    return (
      <div style={{ background: 'transparent', minHeight: '100vh' }}>
        {children}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--accent)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  const sidebarIconSize = isSidebarCollapsed ? 25 : 20;

  const renderNavLink = (href: string, label: string, icon: React.ReactNode, count?: number) => {
    const hasAccess = rolePermissions[userRole]?.includes(href);
    if (!hasAccess) return null;
    return (
      <Link 
        href={href} 
        className={`nav-link ${pathname === href ? 'active' : ''}`} 
        style={isSidebarCollapsed ? { justifyContent: 'center', padding: '0.75rem', position: count ? 'relative' : 'static' } : { position: count ? 'relative' : 'static' }}
      >
        {icon}
        {!isSidebarCollapsed && <span className="nav-text">{label}</span>}
        {count && count > 0 && (
          <span style={{ 
            position: isSidebarCollapsed ? 'absolute' : 'relative',
            right: isSidebarCollapsed ? '-4px' : '0',
            top: isSidebarCollapsed ? '-4px' : 'auto',
            marginLeft: isSidebarCollapsed ? '0' : 'auto',
            background: 'var(--danger)', 
            color: 'white', 
            fontSize: '0.65rem', 
            fontWeight: 800, 
            padding: '2px 6px', 
            borderRadius: '10px',
            minWidth: '18px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
          }}>
            {count}
          </span>
        )}
      </Link>
    );
  };

  const isNoScrollPage = ['/atendimento', '/chat-interno'].includes(pathname) && !showMobileMenu;

  const gridMenuItems = [
    { href: '/chat-interno', label: 'Chat Interno', icon: <MessageSquare size={24} />, count: unreadChatCount },
    { href: '/campanhas', label: 'Campanhas', icon: <Mail size={24} /> },
    { href: '/segmentacoes', label: 'Segmentações', icon: <Filter size={24} /> },
    { href: '/relatorios', label: 'Relatórios', icon: <BarChart3 size={24} /> },
    { href: '/integracoes', label: 'Integrações', icon: <Code size={24} /> },
    { href: '/captura-editor', label: 'Páginas de Captura', icon: <LayoutIcon size={24} /> },
    { href: '/whatsapp', label: 'Botão WhatsApp', icon: <MessageCircle size={24} /> },
    { href: '/bio', label: 'Link na Bio', icon: <Smartphone size={24} /> },
    { href: '/popups', label: 'Pop-ups', icon: <SquareStack size={24} /> },
    { href: '/bots', label: 'Bots e Automações', icon: <Bot size={24} /> },
    { href: '/conexoes', label: 'Conexões WhatsApp', icon: <MessageSquare size={24} /> },
    { href: '/configuracoes', label: 'Configurações', icon: <SettingsIcon size={24} /> },
    { href: '/usuarios', label: 'Usuários', icon: <ShieldCheck size={24} />, count: pendingUsersCount },
  ];

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
         {isNoScrollPage && (
          <style dangerouslySetInnerHTML={{ __html: `
            html, body {
              overflow: hidden !important;
              height: 100vh !important;
              height: 100dvh !important;
            }
          `}} />
        )}
        <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <div style={{ 
            padding: '1.5rem 1rem', 
            marginBottom: '1rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: isSidebarCollapsed ? 'center' : 'space-between' 
          }}>
            {!isSidebarCollapsed && (
              <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                Leads Cia<span style={{ color: 'var(--primary)' }}> Super</span>
              </h1>
            )}
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              style={{ 
                background: 'rgba(0,0,0,0.05)', 
                border: 'none', 
                borderRadius: '8px', 
                padding: '0.4rem', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)'
              }}
            >
              {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {renderNavLink('/', 'Dashboard', <LayoutDashboard size={sidebarIconSize} />)}
            {renderNavLink('/leads', 'Leads', <Users size={sidebarIconSize} />)}
            {renderNavLink('/campanhas', 'Campanhas', <Mail size={sidebarIconSize} />)}
            {renderNavLink('/segmentacoes', 'Segmentações', <Filter size={sidebarIconSize} />)}
            {renderNavLink('/relatorios', 'Relatórios', <BarChart3 size={sidebarIconSize} />)}
            {renderNavLink('/integracoes', 'Integrações', <Code size={sidebarIconSize} />)}
            {renderNavLink('/captura-editor', 'Página de Captura', <LayoutIcon size={sidebarIconSize} />)}
            {renderNavLink('/whatsapp', 'Botão WhatsApp', <MessageCircle size={sidebarIconSize} />)}
            {renderNavLink('/bio', 'Link na Bio', <Smartphone size={sidebarIconSize} />)}
            {renderNavLink('/popups', 'Pop-ups', <SquareStack size={sidebarIconSize} />)}
            {renderNavLink('/atendimento', 'Atendimento', <Zap size={sidebarIconSize} />, whatsappUnreadCount > 0 ? whatsappUnreadCount : undefined)}
            {renderNavLink('/chat-interno', 'Chat Interno', <MessageSquare size={sidebarIconSize} />, unreadChatCount > 0 ? unreadChatCount : undefined)}
            {renderNavLink('/bots', 'Bots e Automações', <Bot size={sidebarIconSize} />)}
            {renderNavLink('/conexoes', 'Conexões WhatsApp', <MessageSquare size={sidebarIconSize} />)}
            {renderNavLink('/configuracoes', 'Configurações', <SettingsIcon size={sidebarIconSize} />)}
            {renderNavLink('/usuarios', 'Usuários', <ShieldCheck size={sidebarIconSize} />, pendingUsersCount)}
          </nav>
 
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 0.5rem', paddingBottom: '1rem' }}>
            <div 
              onClick={() => setShowProfileModal(true)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', 
                background: 'rgba(0,0,0,0.03)', borderRadius: '12px', cursor: 'pointer',
                transition: 'background 0.2s',
                justifyContent: isSidebarCollapsed ? 'center' : 'flex-start'
              }}
              className="hover:bg-slate-100"
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#cbd5e1', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {userProfile?.avatarUrl ? (
                  <img src={userProfile.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={18} color="#475569" />
                )}
              </div>
              {!isSidebarCollapsed && (
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {userProfile?.name || 'Usuário'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize' }}>
                    {userRole === 'master' ? 'Master' : (userRole === 'intermediario' ? 'Intermediário' : 'Básico')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
        
        <main className={`main-content ${isNoScrollPage ? 'no-padding' : ''}`} style={{
          ...(isNoScrollPage ? { height: '100dvh', overflow: 'hidden' } : {})
        }}>
          {showMobileMenu ? (
            <div className="mobile-grid-menu">
              {gridMenuItems
                .filter(item => rolePermissions[userRole]?.includes(item.href))
                .map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMobileMenu(false)}
                    className="mobile-menu-card"
                  >
                    <div className="mobile-menu-card-icon" style={{ position: 'relative' }}>
                      {item.icon}
                      {item.count && item.count > 0 ? (
                        <span style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          background: 'var(--danger)',
                          color: 'white',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '10px',
                          minWidth: '18px',
                          textAlign: 'center',
                          boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                        }}>
                          {item.count}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mobile-menu-card-title">{item.label}</h3>
                  </Link>
                ))}

              {/* Perfil do Usuário */}
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  setShowProfileModal(true);
                }}
                className="mobile-menu-card"
                style={{ width: '100%', background: 'white', border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                <div className="mobile-menu-card-icon">
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#cbd5e1', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {userProfile?.avatarUrl ? (
                      <img src={userProfile.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={14} color="#475569" />
                    )}
                  </div>
                </div>
                <h3 className="mobile-menu-card-title">Meu Perfil</h3>
              </button>
            </div>
          ) : (
            children
          )}
        </main>

        <div className="mobile-bottom-nav">
          <Link href="/" onClick={() => setShowMobileMenu(false)} className={`mobile-nav-item ${pathname === '/' && !showMobileMenu ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>Início</span>
          </Link>
          <Link href="/leads" onClick={() => setShowMobileMenu(false)} className={`mobile-nav-item ${pathname === '/leads' && !showMobileMenu ? 'active' : ''}`}>
            <Users size={20} />
            <span>Leads</span>
          </Link>
          <Link href="/atendimento" onClick={() => setShowMobileMenu(false)} className={`mobile-nav-item ${pathname === '/atendimento' && !showMobileMenu ? 'active' : ''}`} style={{ position: 'relative' }}>
            <Zap size={20} />
            <span>Atendimento</span>
            {whatsappUnreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '12px',
                background: 'var(--danger)',
                color: 'white',
                fontSize: '0.6rem',
                fontWeight: 800,
                padding: '2px 4px',
                borderRadius: '10px',
                minWidth: '14px',
                textAlign: 'center'
              }}>
                {whatsappUnreadCount}
              </span>
            )}
          </Link>

          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)} 
            className={`mobile-nav-item ${showMobileMenu ? 'active' : ''}`}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <Menu size={20} />
            <span>Mais</span>
          </button>
        </div>

        {/* Global Notifications Toast */}
        {notification && (
          <div style={{ 
            position: 'fixed', 
            top: '2rem', 
            right: '2rem', 
            width: '350px', 
            background: 'white', 
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            padding: '1.25rem',
            zIndex: 9999,
            display: 'flex',
            gap: '1rem',
            animation: 'slideInRight 0.3s ease-out'
          }}>
            <div style={{ 
              background: notification.type === 'lead' ? 'var(--success-bg)' : notification.type === 'auth' ? 'rgba(245, 158, 11, 0.1)' : notification.type === 'message' ? 'rgba(59, 130, 246, 0.1)' : 'var(--accent)', 
              color: notification.type === 'lead' ? 'var(--success)' : notification.type === 'auth' ? '#d97706' : notification.type === 'message' ? '#3b82f6' : 'var(--primary)',
              padding: '0.75rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 'fit-content'
            }}>
              {notification.type === 'lead' ? <UserPlus size={24} /> : notification.type === 'auth' ? <ShieldAlert size={24} /> : notification.type === 'message' ? <MessageCircle size={24} /> : <Bell size={24} />}
            </div>
            
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{notification.title}</h4>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#64748b', lineHeight: '1.4' }}>{notification.message}</p>
            </div>

            <button onClick={() => setNotification(null)} style={{ opacity: 0.3, alignSelf: 'flex-start' }}>
              <X size={18} />
            </button>
          </div>
        )}
        {/* Modal de Perfil */}
        {showProfileModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Meu Perfil</h3>
                <button onClick={() => setShowProfileModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <div 
                  onClick={() => avatarInputRef.current?.click()}
                  style={{ width: '120px', height: '120px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden', border: '2px dashed #cbd5e1' }}
                  className="hover:border-slate-400 group"
                >
                  {uploadingAvatar ? (
                    <div style={{ width: '20px', height: '20px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  ) : userProfile?.avatarUrl ? (
                    <>
                      <img src={userProfile.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} className="group-hover:opacity-100">
                        <Camera size={24} color="white" />
                      </div>
                    </>
                  ) : (
                    <Camera size={32} color="#94a3b8" />
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{userProfile?.name || 'Usuário'}</h4>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>{userProfile?.email}</p>
                </div>
                <input type="file" ref={avatarInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleAvatarUpload} />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <button 
                  onClick={async () => {
                    try {
                      await fetch('/api/auth/logout', { method: 'POST' });
                      setUserProfile(null);
                      router.push('/login');
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="btn btn-outline" 
                  style={{ width: '100%', color: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}
                >
                  <LogIn size={18} />
                  Sair da Conta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Canal de Áudio da Chamada WebRTC */}
        {remoteStream && (
          <audio
            ref={(el) => {
              if (el) {
                el.srcObject = remoteStream;
                el.play().catch(err => console.error('Erro ao reproduzir áudio:', err));
              }
            }}
            autoPlay
          />
        )}

        {/* MODAIS DE LIGAÇÃO DE VOZ (HUD) */}
        {/* 1. Chamada de Saída (Discando) */}
        {callState === 'calling' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(6px)', zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '320px', background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={36} style={{ animation: 'pulse 2s infinite' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#0f172a' }}>{outgoingReceiverName}</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>Discando...</p>
              </div>
              <button 
                onClick={endVoiceCall}
                style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(239,68,68,0.4)' }}
              >
                <X size={24} />
              </button>
            </div>
          </div>
        )}

        {/* 2. Chamada de Entrada (Recebendo) */}
        {callState === 'ringing' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(6px)', zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '320px', background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={36} style={{ animation: 'pulse 1.5s infinite' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#0f172a' }}>{incomingCallerName}</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>Chamada de voz...</p>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <button 
                  onClick={acceptVoiceCall}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#10b981', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(16,185,129,0.4)' }}
                >
                  <Phone size={24} />
                </button>
                <button 
                  onClick={declineVoiceCall}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(239,68,68,0.4)' }}
                >
                  <X size={24} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Chamada Conectada (Ativa) */}
        {callState === 'connected' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(6px)', zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '320px', background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={36} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#0f172a' }}>{incomingCallerName || outgoingReceiverName}</h3>
                <p style={{ fontSize: '1.1rem', fontFamily: 'monospace', fontWeight: 'bold', color: '#3b82f6', margin: 0 }}>
                  {Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <button 
                  onClick={toggleMuteCall}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', background: isMuted ? '#64748b' : '#f1f5f9', border: 'none', color: isMuted ? 'white' : '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title={isMuted ? "Ativar som" : "Mutar microfone"}
                >
                  {isMuted ? <Mic size={24} style={{ opacity: 0.5 }} /> : <Mic size={24} />}
                </button>
                <button 
                  onClick={endVoiceCall}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(239,68,68,0.4)' }}
                  title="Desligar"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
// Trigger novo deploy
