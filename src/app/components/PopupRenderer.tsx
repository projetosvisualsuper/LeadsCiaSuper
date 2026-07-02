'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/services/api';
import { PopupConfig } from '@/types/crm';
import { X } from 'lucide-react';

interface PopupRendererProps {
  slug: string;
}

export default function PopupRenderer({ slug }: PopupRendererProps) {
  const [activePopups, setActivePopups] = useState<PopupConfig[]>([]);
  const [currentPopup, setCurrentPopup] = useState<PopupConfig | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [closedPopups, setClosedPopups] = useState<string[]>([]);

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ nome: '', email: '', telefone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    setFormSubmitted(false);
    setFormData({ nome: '', email: '', telefone: '' });
  }, [currentPopup]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPopup) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/popup/${currentPopup.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Erro ao salvar lead');
      
      const data = await res.json();
      if (currentPopup.templateId === 'coupon') {
        setFormSubmitted(true);
      } else {
        if (currentPopup.buttonLink) {
          window.location.href = currentPopup.buttonLink;
        } else {
          alert('Dados enviados com sucesso!');
          handleClose();
        }
      }
    } catch (err) {
      console.error(err);
      if (currentPopup.buttonLink) {
        window.location.href = currentPopup.buttonLink;
      } else {
        alert('Erro ao processar dados. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCoupon = () => {
    if (!currentPopup?.couponCode) return;
    navigator.clipboard.writeText(currentPopup.couponCode);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const renderCouponSuccessInner = () => {
    return (
      <div style={{ width: '100%', textAlign: 'center' }}>
         <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎁</div>
         <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{currentPopup?.title}</h2>
         <p style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '1.5rem' }}>Seu cupom de desconto foi gerado com sucesso!</p>
         <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '2px dashed #e2e8f0', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.25rem' }}>Seu Cupom</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '1px', color: theme.buttonColor }}>{currentPopup?.couponCode}</div>
         </div>
         
         <div style={{ display: 'grid', gap: '0.5rem' }}>
           <button onClick={handleCopyCoupon} style={{ width: '100%', height: '42px', borderRadius: '8px', background: '#1e293b', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justify-content: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              {copying ? '✓ Copiado!' : 'Copiar Código'}
           </button>
           {currentPopup?.buttonLink && (
             <a href={currentPopup.buttonLink} className="popup-btn" style={{ background: theme.buttonColor, color: theme.buttonTextColor, padding: '0.75rem', fontSize: '0.9rem', borderRadius: '8px' }}>{currentPopup.buttonText}</a>
           )}
         </div>

         {theme.sendCouponEmail && (
           <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', justify-content: 'center', gap: '0.5rem' }}>
              ✓ Enviamos uma cópia para seu e-mail
           </div>
         )}
      </div>
    );
  };

  useEffect(() => {
    const fetchPopups = async () => {
      try {
        const allPopups = await api.getPopups();
        // Filtrar apenas popups ativos e que devem aparecer nesta página
        const filtered = allPopups.filter(p => 
          p.isActive && (p.pages?.length === 0 || p.pages?.includes(slug))
        );
        setActivePopups(filtered);
      } catch (error) {
        console.error('Erro ao carregar pop-ups:', error);
      }
    };
    fetchPopups();
  }, [slug]);

  const showPopup = useCallback((popup: PopupConfig) => {
    if (closedPopups.includes(popup.id)) return;
    
    setCurrentPopup(popup);
    setIsVisible(true);
    
    // Marcar como fechado na sessão para não mostrar de novo na mesma navegação
    setClosedPopups(prev => [...prev, popup.id]);
  }, [closedPopups]);

  useEffect(() => {
    if (activePopups.length === 0 || isVisible) return;

    const triggers: (() => void)[] = [];

    activePopups.forEach(popup => {
      if (closedPopups.includes(popup.id)) return;

      if (popup.trigger === 'timer') {
        const timer = setTimeout(() => {
          showPopup(popup);
        }, (popup.triggerValue || 0) * 1000);
        triggers.push(() => clearTimeout(timer));
      }

      if (popup.trigger === 'exit-intent') {
        const handleMouseLeave = (e: MouseEvent) => {
          if (e.clientY < 20 || !e.relatedTarget) {
            showPopup(popup);
          }
        };
        document.addEventListener('mouseleave', handleMouseLeave);
        triggers.push(() => document.removeEventListener('mouseleave', handleMouseLeave));

        const handleVisibilityChange = () => {
          if (document.visibilityState === 'hidden') {
            showPopup(popup);
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        triggers.push(() => document.removeEventListener('visibilitychange', handleVisibilityChange));

        let lastScrollTop = 0;
        const handleScrollMobile = () => {
          const st = window.pageYOffset || document.documentElement.scrollTop;
          if (st < lastScrollTop && st < 150 && lastScrollTop - st > 30) {
            showPopup(popup);
          }
          lastScrollTop = st;
        };
        window.addEventListener('scroll', handleScrollMobile, { passive: true });
        triggers.push(() => window.removeEventListener('scroll', handleScrollMobile));
      }

      if (popup.trigger === 'scroll') {
        const handleScroll = () => {
          const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
          if (scrollPercent >= (popup.triggerValue || 0)) {
            showPopup(popup);
          }
        };
        window.addEventListener('scroll', handleScroll);
        triggers.push(() => window.removeEventListener('scroll', handleScroll));
      }
    });

    return () => {
      triggers.forEach(cleanup => cleanup());
    };
  }, [activePopups, isVisible, showPopup, closedPopups]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => setCurrentPopup(null), 300);
  };

  if (!currentPopup) return null;

  const theme = currentPopup.theme || {};
  const template = currentPopup.templateId || 'simple';

  const renderContent = () => {
    switch (template) {
      case 'image-left':
        return (
          <div style={{ display: 'flex', minHeight: '350px', flexDirection: window.innerWidth < 640 ? 'column' : 'row' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <img src={currentPopup.imageUrl || 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&q=80'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1, padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'left' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.2 }}>{currentPopup.title}</h2>
              <p style={{ fontSize: '1rem', opacity: 0.8, marginBottom: '2rem' }}>{currentPopup.subtitle}</p>
              <a href={currentPopup.buttonLink} className="popup-btn" style={{ background: theme.buttonColor, color: theme.buttonTextColor }}>{currentPopup.buttonText}</a>
            </div>
          </div>
        );
      
      case 'image-right':
        return (
          <div style={{ display: 'flex', minHeight: '350px', flexDirection: window.innerWidth < 640 ? 'column-reverse' : 'row' }}>
            <div style={{ flex: 1, padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'left' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.2 }}>{currentPopup.title}</h2>
              <p style={{ fontSize: '1rem', opacity: 0.8, marginBottom: '2rem' }}>{currentPopup.subtitle}</p>
              <a href={currentPopup.buttonLink} className="popup-btn" style={{ background: theme.buttonColor, color: theme.buttonTextColor }}>{currentPopup.buttonText}</a>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <img src={currentPopup.imageUrl || 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&q=80'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        );

      case 'image-form-left':
      case 'image-form-right':
        const isImgLeft = template === 'image-form-left';
        return (
          <div style={{ display: 'flex', minHeight: '350px', flexDirection: window.innerWidth < 640 ? 'column' : (isImgLeft ? 'row' : 'row-reverse') }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <img src={currentPopup.imageUrl || 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&q=80'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1.2, padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
              {currentPopup.couponCode && formSubmitted ? (
                renderCouponSuccessInner()
              ) : (
                <>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{currentPopup.title}</h2>
                  <p style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '1.5rem' }}>{currentPopup.subtitle}</p>
                  <form onSubmit={handleFormSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
                    <input required placeholder="Seu Nome" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }} value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                    <input required type="email" placeholder="Seu Melhor E-mail" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    <input required type="tel" placeholder="Seu WhatsApp" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }} value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} />
                    <button type="submit" disabled={submitting} style={{ background: theme.buttonColor, color: theme.buttonTextColor, padding: '0.8rem', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                      {submitting ? 'Enviando...' : currentPopup.buttonText}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        );

      case 'lead-form':
        return (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            {currentPopup.couponCode && formSubmitted ? (
              renderCouponSuccessInner()
            ) : (
              <>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>{currentPopup.title}</h2>
                <p style={{ opacity: 0.7, marginBottom: '1.5rem' }}>{currentPopup.subtitle}</p>
                <form onSubmit={handleFormSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
                  <input required placeholder="Seu Nome" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                  <input required type="email" placeholder="Seu Melhor E-mail" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  <input required type="tel" placeholder="Seu WhatsApp" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} />
                  <button type="submit" disabled={submitting} style={{ background: theme.buttonColor, color: theme.buttonTextColor, padding: '0.85rem', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                    {submitting ? 'Enviando...' : currentPopup.buttonText}
                  </button>
                </form>
              </>
            )}
          </div>
        );

      case 'coupon':
        if (formSubmitted) {
          return (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
               <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎁</div>
               <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>{currentPopup.title}</h2>
               <p style={{ opacity: 0.7, marginBottom: '2rem' }}>Seu cupom de desconto foi gerado com sucesso!</p>
               <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '2px dashed #e2e8f0', marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.5rem' }}>Seu Cupom</div>
                  <div style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '2px', color: theme.buttonColor }}>{currentPopup.couponCode || 'PROMO10'}</div>
               </div>
               
               <div style={{ display: 'grid', gap: '0.75rem' }}>
                 <button onClick={handleCopyCoupon} style={{ width: '100%', height: '50px', borderRadius: '12px', background: '#1e293b', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justify-content: 'center', gap: '0.5rem' }}>
                    {copying ? '✓ Copiado!' : 'Copiar Código'}
                 </button>
                 {currentPopup.buttonLink && (
                   <a href={currentPopup.buttonLink} className="popup-btn" style={{ background: theme.buttonColor, color: theme.buttonTextColor }}>{currentPopup.buttonText}</a>
                 )}
               </div>

               {theme.sendCouponEmail && (
                 <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center', justify-content: 'center', gap: '0.5rem' }}>
                    ✓ Enviamos uma cópia para seu e-mail
                 </div>
               )}
            </div>
          );
        }

        return (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
             <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎁</div>
             <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>{currentPopup.title}</h2>
             <p style={{ opacity: 0.7, marginBottom: '2rem' }}>{currentPopup.subtitle}</p>
             <form onSubmit={handleFormSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
               <input required placeholder="Seu Nome" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
               <input required type="email" placeholder="Seu Melhor E-mail" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
               <input required type="tel" placeholder="Seu WhatsApp" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} />
               <button type="submit" disabled={submitting} style={{ background: theme.buttonColor, color: theme.buttonTextColor, padding: '0.85rem', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                 {submitting ? 'Enviando...' : currentPopup.buttonText}
               </button>
             </form>
          </div>
        );

      case 'horizontal-banner':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem 2rem', width: '100%' }}>
            {currentPopup.imageUrl && (
              <div style={{ width: '100px', height: '60px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                <img src={currentPopup.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, lineHeight: 1.2 }}>{currentPopup.title}</h2>
              {currentPopup.subtitle && <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>{currentPopup.subtitle}</p>}
              {currentPopup.couponCode && (
                 <div style={{ background: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px dashed #e2e8f0', marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, letterSpacing: '1px', color: theme.buttonColor }}>{currentPopup.couponCode}</span>
                    <button onClick={handleCopyCoupon} style={{ background: '#1e293b', color: 'white', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>
                      {copying ? '✓ Copiado!' : 'Copiar'}
                    </button>
                 </div>
              )}
            </div>
            <a href={currentPopup.buttonLink} className="popup-btn" style={{ background: theme.buttonColor, color: theme.buttonTextColor, padding: '0.6rem 1.5rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
              {currentPopup.buttonText}
            </a>
          </div>
        );

      case 'image-top':
      case 'simple':
      default:
        return (
          <>
            {currentPopup.imageUrl && (
              <img 
                src={currentPopup.imageUrl} 
                alt={currentPopup.title} 
                style={{ width: '100%', height: '200px', objectFit: 'cover' }}
              />
            )}
            <div style={{ padding: '2.5rem', textAlign: 'center' }}>
              {currentPopup.couponCode && <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎁</div>}
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.2 }}>
                {currentPopup.title}
              </h2>
              {currentPopup.subtitle && (
                <p style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '2rem', lineHeight: 1.5 }}>
                  {currentPopup.subtitle}
                </p>
              )}
              {currentPopup.couponCode && (
                 <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '2px dashed #e2e8f0', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.5rem' }}>Seu Cupom</div>
                    <div style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '2px', color: theme.buttonColor }}>{currentPopup.couponCode}</div>
                 </div>
              )}
              {currentPopup.couponCode ? (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <button onClick={handleCopyCoupon} style={{ width: '100%', height: '50px', borderRadius: '12px', background: '#1e293b', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justify-content: 'center', gap: '0.5rem' }}>
                     {copying ? '✓ Copiado!' : 'Copiar Código'}
                  </button>
                  {currentPopup.buttonLink && (
                    <a href={currentPopup.buttonLink} className="popup-btn" style={{ background: theme.buttonColor, color: theme.buttonTextColor }}>{currentPopup.buttonText}</a>
                  )}
                </div>
              ) : (
                <a 
                  href={currentPopup.buttonLink} 
                  className="popup-btn"
                  style={{ background: theme.buttonColor, color: theme.buttonTextColor }}
                >
                  {currentPopup.buttonText}
                </a>
              )}
            </div>
          </>
        );
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      zIndex: 9999, 
      display: 'flex', 
      alignItems: template === 'horizontal-banner' ? 'flex-end' : 'center', 
      justifyContent: 'center',
      padding: template === 'horizontal-banner' ? '0' : '1.5rem',
      pointerEvents: isVisible ? 'auto' : 'none',
      opacity: isVisible ? 1 : 0,
      transition: 'opacity 0.3s ease-out'
    }}>
      {/* Overlay */}
      <div 
        onClick={handleClose}
        style={{ 
          position: 'absolute', 
          inset: 0, 
          background: template === 'horizontal-banner' ? 'transparent' : (theme.overlayColor || 'rgba(0,0,0,0.5)'),
          cursor: 'pointer'
        }} 
      />

      {/* Popup Content */}
      <div style={{ 
        position: 'relative',
        background: theme.backgroundColor || '#ffffff',
        color: theme.textColor || '#1e293b',
        width: '100%',
        maxWidth: template === 'horizontal-banner' ? '100%' : (['image-left', 'image-right', 'image-form-left', 'image-form-right'].includes(template) ? '700px' : '450px'),
        borderRadius: template === 'horizontal-banner' ? '0' : '24px',
        overflow: 'hidden',
        boxShadow: '0 -10px 50px -12px rgba(0,0,0,0.25)',
        transform: isVisible ? 'translateY(0)' : (template === 'horizontal-banner' ? 'translateY(100%)' : 'scale(0.95) translateY(20px)'),
        transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.1)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <button 
          onClick={handleClose}
          style={{ 
            position: 'absolute', 
            right: template === 'horizontal-banner' ? '0.5rem' : '1rem', 
            top: template === 'horizontal-banner' ? '50%' : '1rem', 
            transform: template === 'horizontal-banner' ? 'translateY(-50%)' : 'none',
            zIndex: 10,
            background: 'rgba(0,0,0,0.1)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'inherit'
          }}
        >
          <X size={20} />
        </button>

        {renderContent()}
        
        <div style={{ padding: '0 2.5rem 2rem', textAlign: 'center' }}>
          <button 
            onClick={handleClose}
            style={{ 
              fontSize: '0.875rem', 
              opacity: 0.5, 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Não, obrigado.
          </button>
        </div>
      </div>

      <style jsx>{`
        .popup-btn {
          display: block;
          padding: 1rem 2rem;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1.1rem;
          text-decoration: none;
          text-align: center;
          transition: transform 0.2s ease;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }
        .popup-btn:hover {
          transform: scale(1.03);
        }
      `}</style>
    </div>
  );
}
