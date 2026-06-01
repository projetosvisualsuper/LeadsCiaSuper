'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Eye, EyeOff, LogIn, ShieldCheck, UserPlus, AlertCircle } from 'lucide-react';

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
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      if (isRegister) {
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
          setError('Sua conta de Administrador foi criada e aprovada automaticamente! Faça login.');
          setIsRegister(false);
          setFormData({ email: formData.email, password: '', name: '' });
        } else {
          setIsPending(true);
          setError(data.message);
        }
      } else {
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

  const handleForgotPassword = () => {
    setError('A recuperação de senha foi desativada temporariamente. Entre em contato com o administrador do sistema.');
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
            Leads <span style={{ color: 'var(--primary)' }}>Cia Super</span>
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

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.75rem' }}>
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255, 255, 255, 0.4)', textDecoration: 'underline' }}>
              Termos de Serviço
            </a>
            <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255, 255, 255, 0.4)', textDecoration: 'underline' }}>
              Política de Privacidade
            </a>
          </div>
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
        .btn-login:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
