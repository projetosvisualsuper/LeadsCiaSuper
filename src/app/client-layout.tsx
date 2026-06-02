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
  MessageSquare
} from 'lucide-react';
import { UserProfile, Lead } from '@/types/crm';

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
    '/conexoes'
  ];

  // Se a rota NÃO estiver na lista acima, consideramos que é uma Página de Captura pública
  const isCapturePage = !adminRoutes.includes(pathname);
  const [notification, setNotification] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user.status === 'approved') {
          setUserProfile(data.user);
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
    intervalId = setInterval(checkNewLeads, 15000); // Polling a cada 15 segundos

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

  return (
    <div className="app-container">
        <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{
          width: isSidebarCollapsed ? '80px' : '260px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowX: 'hidden'
        }}>
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
            <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
              <LayoutDashboard size={20} />
              {!isSidebarCollapsed && <span className="nav-text">Dashboard</span>}
            </Link>
            <Link href="/leads" className={`nav-link ${pathname === '/leads' ? 'active' : ''}`}>
              <Users size={20} />
              {!isSidebarCollapsed && <span className="nav-text">Leads</span>}
            </Link>
            <Link href="/campanhas" className={`nav-link ${pathname === '/campanhas' ? 'active' : ''}`}>
              <Mail size={20} />
              {!isSidebarCollapsed && <span className="nav-text">Campanhas</span>}
            </Link>
            <Link href="/segmentacoes" className={`nav-link ${pathname === '/segmentacoes' ? 'active' : ''}`}>
              <Filter size={20} />
              {!isSidebarCollapsed && <span className="nav-text">Segmentações</span>}
            </Link>
            <Link href="/relatorios" className={`nav-link ${pathname === '/relatorios' ? 'active' : ''}`}>
              <BarChart3 size={20} />
              {!isSidebarCollapsed && <span className="nav-text">Relatórios</span>}
            </Link>
            <Link href="/integracoes" className={`nav-link ${pathname === '/integracoes' ? 'active' : ''}`}>
              <Code size={20} />
              {!isSidebarCollapsed && <span className="nav-text">Integrações</span>}
            </Link>
            <Link href="/captura-editor" className={`nav-link ${pathname === '/captura-editor' ? 'active' : ''}`}>
              <LayoutIcon size={20} />
              {!isSidebarCollapsed && <span className="nav-text">Página de Captura</span>}
            </Link>
            <Link href="/whatsapp" className={`nav-link ${pathname === '/whatsapp' ? 'active' : ''}`}>
              <MessageCircle size={20} />
              {!isSidebarCollapsed && <span className="nav-text">Botão WhatsApp</span>}
            </Link>
            <Link href="/bio" className={`nav-link ${pathname === '/bio' ? 'active' : ''}`}>
              <Smartphone size={20} />
              {!isSidebarCollapsed && <span className="nav-text">Link na Bio</span>}
            </Link>
            <Link href="/popups" className={`nav-link ${pathname === '/popups' ? 'active' : ''}`}>
              <SquareStack size={20} />
              {!isSidebarCollapsed && <span className="nav-text">Pop-ups</span>}
            </Link>
            <Link href="/atendimento" className={`nav-link ${pathname === '/atendimento' ? 'active' : ''}`}>
              <Zap size={20} />
              {!isSidebarCollapsed && <span className="nav-text">Atendimento</span>}
            </Link>
            <Link href="/conexoes" className={`nav-link ${pathname === '/conexoes' ? 'active' : ''}`}>
              <MessageSquare size={20} />
              {!isSidebarCollapsed && <span className="nav-text">Conexões WhatsApp</span>}
            </Link>
            <Link href="/configuracoes" className={`nav-link ${pathname === '/configuracoes' ? 'active' : ''}`}>
              <SettingsIcon size={20} />
              {!isSidebarCollapsed && <span className="nav-text">Configurações</span>}
            </Link>
            {userProfile?.role === 'admin' && (
              <Link href="/usuarios" className={`nav-link ${pathname === '/usuarios' ? 'active' : ''}`} style={{ position: 'relative' }}>
                <ShieldCheck size={20} />
                {!isSidebarCollapsed && <span className="nav-text">Usuários</span>}
                {pendingUsersCount > 0 && (
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
                    {pendingUsersCount}
                  </span>
                )}
              </Link>
            )}
          </nav>
 
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
              className="nav-link" 
              style={{ width: '100%', cursor: 'pointer', border: 'none', background: 'transparent' }}
            >
              <LogIn size={20} />
              {!isSidebarCollapsed && <span className="nav-text">Sair</span>}
            </button>
            {!isSidebarCollapsed && <p style={{ fontSize: '0.75rem', opacity: 0.5, textAlign: 'center' }}>v1.2.0</p>}
          </div>
        </aside>
        
        <main className="main-content" style={{
          marginLeft: isSidebarCollapsed ? '80px' : '260px',
          width: `calc(100% - ${isSidebarCollapsed ? '80px' : '260px'})`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {children}
        </main>

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
      </div>
  );
}
