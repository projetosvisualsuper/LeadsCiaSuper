'use client';

import "./globals.css";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { auth } from '@/lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
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
  Filter,
  SquareStack,
  MessageSquare
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types/crm';

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
    '/atendimento'
  ];

  // Se a rota NÃO estiver na lista acima, consideramos que é uma Página de Captura pública
  const isCapturePage = !adminRoutes.includes(pathname);
  const [notification, setNotification] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await api.getUserProfile(user.uid);
        setUserProfile(profile);
        if (!profile || profile.status !== 'approved') {
          if (!isCapturePage) router.push('/login');
        }
      } else {
        if (!isCapturePage) router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [pathname, isCapturePage]);

  useEffect(() => {
    const handleNewLead = async (e: any) => {
      const settings = await api.getSettings();
      if (!settings.notificacoes?.novosLeads) return;

      const lead = e.detail;
      setNotification({
        type: 'lead',
        title: '🎉 Novo Lead Capturado!',
        message: `${lead.nome} acabou de se cadastrar via ${lead.origem}.`,
        data: lead
      });

      // Auto hide after 8 seconds
      setTimeout(() => setNotification(null), 8000);
    };

    // Listen for events in the same tab
    window.addEventListener('crm_new_lead', handleNewLead as any);
    
    // Listen for storage changes (other tabs) - Note: With Firebase, we might want to use onSnapshot instead of storage events
    const handleStorage = async (e: StorageEvent) => {
      if (e.key === 'crm_leads') {
        const settings = await api.getSettings();
        if (settings.notificacoes?.novosLeads) {
           setNotification({
             type: 'info',
             title: 'Base de Leads Atualizada',
             message: 'Novos dados foram recebidos de outra aba.'
           });
           setTimeout(() => setNotification(null), 5000);
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('crm_new_lead', handleNewLead);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (userProfile?.role !== 'admin') return;

    const q = query(collection(db, 'users'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingUsersCount(snapshot.size);
      
      // Se houver novos pedidos, mostra uma notificação interna
      if (!snapshot.empty) {
        const lastUser = snapshot.docs[0].data() as UserProfile;
        
        // Verifica se é uma mudança real e não apenas o carregamento inicial
        // (Simplificando: se o count mudou pra cima, avisamos)
        setNotification({
          type: 'auth',
          title: 'Solicitação de Acesso',
          message: `${lastUser.name || lastUser.email} está aguardando aprovação.`,
          data: lastUser
        });
        setTimeout(() => setNotification(null), 10000);
      }
    });
    return () => unsubscribe();
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
        <aside className="sidebar">
          <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Gerency<span style={{ color: 'var(--primary)' }}>Leads</span></h1>
          </div>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
              <LayoutDashboard size={20} />
              <span className="nav-text">Dashboard</span>
            </Link>
            <Link href="/leads" className={`nav-link ${pathname === '/leads' ? 'active' : ''}`}>
              <Users size={20} />
              <span className="nav-text">Leads</span>
            </Link>
            <Link href="/campanhas" className={`nav-link ${pathname === '/campanhas' ? 'active' : ''}`}>
              <Mail size={20} />
              <span className="nav-text">Campanhas</span>
            </Link>
            <Link href="/segmentacoes" className={`nav-link ${pathname === '/segmentacoes' ? 'active' : ''}`}>
              <Filter size={20} />
              <span className="nav-text">Segmentações</span>
            </Link>
            <Link href="/relatorios" className={`nav-link ${pathname === '/relatorios' ? 'active' : ''}`}>
              <BarChart3 size={20} />
              <span className="nav-text">Monitoramento</span>
            </Link>
            <Link href="/integracoes" className={`nav-link ${pathname === '/integracoes' ? 'active' : ''}`}>
              <Code size={20} />
              <span className="nav-text">Integrações</span>
            </Link>
            <Link href="/captura-editor" className={`nav-link ${pathname === '/captura-editor' ? 'active' : ''}`}>
              <LayoutIcon size={20} />
              <span className="nav-text">Página de Captura</span>
            </Link>
            <Link href="/whatsapp" className={`nav-link ${pathname === '/whatsapp' ? 'active' : ''}`}>
              <MessageCircle size={20} />
              <span className="nav-text">Botão WhatsApp</span>
            </Link>
            <Link href="/bio" className={`nav-link ${pathname === '/bio' ? 'active' : ''}`}>
              <Smartphone size={20} />
              <span className="nav-text">Link na Bio</span>
            </Link>
            <Link href="/popups" className={`nav-link ${pathname === '/popups' ? 'active' : ''}`}>
              <SquareStack size={20} />
              <span className="nav-text">Pop-ups</span>
            </Link>
            <Link href="/atendimento" className={`nav-link ${pathname === '/atendimento' ? 'active' : ''}`}>
              <Zap size={20} />
              <span className="nav-text">Atendimento</span>
            </Link>
            <Link href="/configuracoes" className={`nav-link ${pathname === '/configuracoes' ? 'active' : ''}`}>
              <SettingsIcon size={20} />
              <span className="nav-text">Configurações</span>
            </Link>
            {userProfile?.role === 'admin' && (
              <Link href="/usuarios" className={`nav-link ${pathname === '/usuarios' ? 'active' : ''}`} style={{ position: 'relative' }}>
                <ShieldCheck size={20} />
                <span className="nav-text">Usuários</span>
                {pendingUsersCount > 0 && (
                  <span style={{ 
                    position: 'absolute', 
                    right: '0.75rem', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
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
                await signOut(auth);
                router.push('/login');
              }}
              className="nav-link" 
              style={{ width: '100%', cursor: 'pointer', border: 'none', background: 'transparent' }}
            >
              <LogIn size={20} />
              <span className="nav-text">Sair</span>
            </button>
            <p style={{ fontSize: '0.75rem', opacity: 0.5, textAlign: 'center' }}>v1.2.0 - NOVO ATENDIMENTO</p>
          </div>
        </aside>
        
        <main className="main-content">
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
              background: notification.type === 'lead' ? 'var(--success-bg)' : notification.type === 'auth' ? 'rgba(245, 158, 11, 0.1)' : 'var(--accent)', 
              color: notification.type === 'lead' ? 'var(--success)' : notification.type === 'auth' ? '#d97706' : 'var(--primary)',
              padding: '0.75rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 'fit-content'
            }}>
              {notification.type === 'lead' ? <UserPlus size={24} /> : notification.type === 'auth' ? <ShieldAlert size={24} /> : <Bell size={24} />}
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
