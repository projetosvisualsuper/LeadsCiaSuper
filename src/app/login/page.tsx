'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Eye, EyeOff, LogIn, ShieldCheck, UserPlus, AlertCircle, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const checkLogged = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            if (data.user.status === 'approved') {
              router.push('/');
            } else if (data.user.status === 'pending') {
              setIsPending(true);
              setError('Seu acesso está pendente de aprovação pelo administrador.');
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkLogged();

    // Verificar se há token de redefinição de senha na URL
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token');
    if (token) {
      setView('reset');
      setResetToken(token);
      // Limpar a query string para não ficar expondo o token
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      if (view === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            name: formData.name
          })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Erro ao cadastrar.');

        if (data.status === 'approved') {
          setSuccessMessage('Sua conta de Administrador foi criada e aprovada automaticamente! Faça login.');
          setView('login');
          setFormData({ email: formData.email, password: '', confirmPassword: '', name: '' });
        } else {
          setIsPending(true);
          setError(data.message);
        }
      } else if (view === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Erro ao solicitar recuperação.');

        setSuccessMessage(data.message || 'Se o e-mail estiver cadastrado, um link de recuperação será enviado.');
        // Limpar o campo de e-mail ou manter, mas voltar para o login depois de um tempo
        setFormData({ ...formData, password: '', confirmPassword: '' });
      } else if (view === 'reset') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('As senhas digitadas não coincidem.');
        }

        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: resetToken,
            password: formData.password
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Erro ao redefinir a senha.');

        setSuccessMessage(data.message || 'Senha alterada com sucesso! Faça o login.');
        setView('login');
        setFormData({ email: '', password: '', confirmPassword: '', name: '' });
        setResetToken('');
      } else {
        // Login normal
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        });
        
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 403) {
            setIsPending(true);
          }
          throw new Error(data.message || 'Erro ao entrar.');
        }
        
        router.push('/');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordClick = () => {
    setError('');
    setSuccessMessage('');
    setView('forgot');
  };

  const handleBackToLogin = () => {
    setError('');
    setSuccessMessage('');
    setView('login');
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
            {view === 'forgot' || view === 'reset' ? (
              <KeyRound size={32} color="white" />
            ) : (
              <ShieldCheck size={32} color="white" />
            )}
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', letterSpacing: '-0.025em' }}>
            Leads <span style={{ color: 'var(--primary)' }}>Cia Super</span>
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
            {view === 'register' && 'Criar nova conta administrativa'}
            {view === 'login' && 'Acesse seu painel administrativo'}
            {view === 'forgot' && 'Recuperação de acesso ao painel'}
            {view === 'reset' && 'Defina sua nova senha administrativa'}
          </p>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid var(--danger)', 
            color: 'var(--danger)', 
            padding: '0.75rem', 
            borderRadius: '12px', 
            marginBottom: '1.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            fontSize: '0.875rem', 
            textAlign: 'left' 
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}

        {successMessage && (
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid #10b981', 
            color: '#10b981', 
            padding: '0.75rem', 
            borderRadius: '12px', 
            marginBottom: '1.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            fontSize: '0.875rem', 
            textAlign: 'left' 
          }}>
            <CheckCircle size={18} style={{ flexShrink: 0 }} /> {successMessage}
          </div>
        )}

        {/* FORM SECTION */}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
          {view === 'register' && (
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

          {view !== 'reset' && (
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
          )}

          {view !== 'forgot' && (
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {view === 'reset' ? 'Nova Senha' : 'Senha'}
                </label>
                {view === 'login' && (
                  <button 
                    type="button" 
                    onClick={handleForgotPasswordClick} 
                    style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Esqueceu?
                  </button>
                )}
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
          )}

          {view === 'reset' && (
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Confirmar Nova Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.3)' }} />
                <input 
                  type={showConfirmPassword ? 'text' : 'password'} 
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
                  value={formData.confirmPassword}
                  onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.3)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

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
                {view === 'register' && <UserPlus size={20} />} 
                {view === 'login' && <LogIn size={20} />} 
                {view === 'forgot' && <Mail size={20} />} 
                {view === 'reset' && <KeyRound size={20} />} 
                
                {view === 'register' && 'Criar Conta'}
                {view === 'login' && 'Entrar no Sistema'}
                {view === 'forgot' && 'Enviar E-mail de Recuperação'}
                {view === 'reset' && 'Salvar Nova Senha'}
              </>
            )}
          </button>
        </form>

        {(view === 'forgot' || view === 'reset') && (
          <button 
            onClick={handleBackToLogin}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem', 
              margin: '1.5rem auto 0', 
              color: 'white', 
              fontSize: '0.875rem', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              opacity: 0.8
            }}
            className="btn-back"
          >
            <ArrowLeft size={16} /> Voltar para o Login
          </button>
        )}

        {view !== 'forgot' && view !== 'reset' && (
          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.875rem' }}>
              {view === 'register' ? 'Já possui acesso?' : 'Novo por aqui?'} 
              <button 
                onClick={() => setView(view === 'register' ? 'login' : 'register')}
                style={{ color: 'white', fontWeight: 600, textDecoration: 'none', background: 'none', border: 'none', marginLeft: '0.5rem', cursor: 'pointer' }}
              >
                {view === 'register' ? 'Fazer Login' : 'Solicitar Acesso'}
              </button>
            </p>

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.75rem' }}>
              <a href="https://leads.ciasuper.com.br/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255, 255, 255, 0.4)', textDecoration: 'underline' }}>
                Termos de Serviço
              </a>
              <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>
              <a href="https://leads.ciasuper.com.br/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255, 255, 255, 0.4)', textDecoration: 'underline' }}>
                Política de Privacidade
              </a>
            </div>
          </div>
        )}
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
        .btn-login:active {
          transform: translateY(0);
        }
        .btn-back:hover {
          opacity: 1 !important;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
