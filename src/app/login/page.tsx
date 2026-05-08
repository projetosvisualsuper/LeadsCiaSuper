'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Eye, EyeOff, LogIn, ShieldCheck, UserPlus, AlertCircle } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { api } from '@/services/api';
import { UserProfile } from '@/types/crm';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [isPending, setIsPending] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await api.getUserProfile(user.uid);
        if (profile) {
          if (profile.status === 'approved') {
            router.push('/');
          } else if (profile.status === 'pending') {
            setIsPending(true);
            setError('Seu acesso está pendente de aprovação pelo administrador.');
          } else {
            setError('Seu acesso foi recusado. Entre em contato com o suporte.');
            await signOut(auth);
          }
        } else {
          // Se o usuário logou (ex: via Google) mas não tem perfil, cria um pendente
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            name: user.displayName || '',
            status: 'pending',
            role: 'editor',
            dataSolicitacao: new Date().toISOString()
          };
          await api.createUserProfile(newProfile);
          setIsPending(true);
          setError('Solicitação de acesso enviada! Aguarde a aprovação do administrador.');
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao entrar com Google. Verifique se o pop-up foi bloqueado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const newProfile: UserProfile = {
          uid: userCredential.user.uid,
          email: formData.email,
          name: formData.name,
          status: 'pending',
          role: 'editor',
          dataSolicitacao: new Date().toISOString()
        };
        await api.createUserProfile(newProfile);
        setIsPending(true);
        setError('Solicitação de acesso enviada com sucesso! Aguarde a aprovação.');
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        const profile = await api.getUserProfile(userCredential.user.uid);
        
        if (!profile || profile.status !== 'approved') {
          if (profile?.status === 'rejected') {
            setError('Seu acesso foi recusado pelo administrador.');
          } else {
            setIsPending(true);
            setError('Seu acesso ainda não foi aprovado pelo administrador.');
          }
          await signOut(auth);
          setIsLoading(false);
          return;
        }
        
        router.push('/');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') setError('Usuário não encontrado.');
      else if (err.code === 'auth/wrong-password') setError('Senha incorreta.');
      else if (err.code === 'auth/email-already-in-use') setError('Este e-mail já está em uso.');
      else if (err.code === 'auth/operation-not-allowed') setError('O login por E-mail/Senha não está ativado no seu Console do Firebase.');
      else if (err.code === 'auth/weak-password') setError('A senha deve ter no mínimo 6 caracteres.');
      else setError('Erro: ' + (err.message || 'Verifique suas credenciais.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError('Por favor, digite seu e-mail no campo acima primeiro.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    try {
      auth.languageCode = 'pt';
      await sendPasswordResetEmail(auth, formData.email);
      setResetSent(true);
      setError('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') setError('Usuário não encontrado.');
      else setError('Erro ao enviar e-mail de recuperação: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: `linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.9)), url('/images/login-bg.png')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding: '1.5rem',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '450px', 
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '3rem 2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center'
      }}>
        {/* LOGO SECTION */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: 'var(--primary)', 
            borderRadius: '16px', 
            margin: '0 auto 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)'
          }}>
            <ShieldCheck size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', letterSpacing: '-0.025em' }}>
            Gerency<span style={{ color: 'var(--primary)' }}>Leads</span>
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
            {isRegister ? 'Criar nova conta administrativa' : 'Acesse seu painel administrativo'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', textAlign: 'left' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {resetSent && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: '#10b981', padding: '0.75rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', textAlign: 'left' }}>
            <ShieldCheck size={18} /> E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.
          </div>
        )}

        {/* FORM SECTION */}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
          {isRegister && (
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Nome Completo
              </label>
              <div style={{ position: 'relative' }}>
                <ShieldCheck size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.3)' }} />
                <input 
                  type="text" 
                  required
                  placeholder="Seu Nome"
                  style={{ 
                    width: '100%', 
                    height: '52px', 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '0 1rem 0 3rem',
                    color: 'white',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  className="login-input"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>
          )}
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              E-mail Profissional
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.3)' }} />
              <input 
                type="email" 
                required
                placeholder="seu@email.com"
                style={{ 
                  width: '100%', 
                  height: '52px', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '0 1rem 0 3rem',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                className="login-input"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Senha
              </label>
              {!isRegister && <button type="button" onClick={handleForgotPassword} style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Esqueceu?</button>}
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.3)' }} />
              <input 
                type={showPassword ? 'text' : 'password'} 
                required
                placeholder="••••••••"
                style={{ 
                  width: '100%', 
                  height: '52px', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '0 3rem 0 3rem',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                className="login-input"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.3)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            style={{ 
              width: '100%', 
              height: '56px', 
              background: 'var(--primary)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '14px', 
              fontSize: '1rem', 
              fontWeight: 700, 
              cursor: 'pointer',
              marginTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              boxShadow: '0 10px 20px rgba(59, 130, 246, 0.2)',
              transition: 'all 0.3s'
            }}
            className="btn-login"
          >
            {isLoading ? (
              <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
            ) : (
              <>
                {isRegister ? <UserPlus size={20} /> : <LogIn size={20} />} 
                {isRegister ? 'Criar Conta' : 'Entrar no Sistema'}
              </>
            )}
          </button>
        </form>

        {!isRegister && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>OU</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
            </div>

            <button 
              onClick={handleGoogleLogin}
              type="button"
              style={{ 
                width: '100%', 
                height: '52px', 
                background: 'white', 
                color: '#1e293b', 
                border: 'none', 
                borderRadius: '12px', 
                fontSize: '0.9375rem', 
                fontWeight: 600, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                transition: 'all 0.2s'
              }}
              className="btn-google"
            >
              <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" width="20" height="20" alt="Google" />
              Entrar com Google
            </button>
          </>
        )}

        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.875rem' }}>
            {isRegister ? 'Já possui acesso?' : 'Novo por aqui?'} 
            <button 
              onClick={() => setIsRegister(!isRegister)}
              style={{ color: 'white', fontWeight: 600, textDecoration: 'none', background: 'none', border: 'none', marginLeft: '0.5rem', cursor: 'pointer' }}
            >
              {isRegister ? 'Fazer Login' : 'Solicitar Acesso'}
            </button>
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .login-input:focus {
          border-color: var(--primary) !important;
          background: rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
        }
        .btn-login:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
          box-shadow: 0 15px 30px rgba(59, 130, 246, 0.3);
        }
        .btn-google:hover {
          background: #f8fafc !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .btn-login:active, .btn-google:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
