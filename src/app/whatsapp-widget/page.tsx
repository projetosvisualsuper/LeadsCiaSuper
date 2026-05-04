'use client';

import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Settings, Lead } from '@/types/crm';
import { MessageCircle, X, User, ChevronRight } from 'lucide-react';

const renderOfficialWhatsappIcon = (size: number = 24, color: string = "currentColor") => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={color} style={{ display: 'block' }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function WhatsappWidgetStandalone() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedAttendant, setSelectedAttendant] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nome: '', email: '', telefone: '' });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const s = await api.getSettings();
      setSettings(s);
    };
    load();
  }, []);

  useEffect(() => {
    // Notificar o pai sobre o estado (aberto/fechado) para redimensionar o iframe se necessário
    if (typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage({ type: 'wa-widget-state', open }, '*');
    }
  }, [open]);

  if (!settings?.whatsappWidget?.enabled || !settings.whatsappWidget.atendentes.length) {
    return null;
  }

  const config = settings.whatsappWidget;

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Salvar Lead
    const leadId = Math.random().toString(36).substr(2, 9);
    await api.saveLead({
      id: leadId,
      nome: formData.nome,
      email: formData.email,
      celular: formData.telefone,
      origem: `Widget Externo - Atendente: ${selectedAttendant.nome}`,
      consentimentoLGPD: true,
      status: 'novo',
      tags: ['whatsapp-widget'],
      dataCriacao: new Date().toISOString()
    } as Lead);

    const msg = encodeURIComponent(`Olá ${selectedAttendant.nome}, vim pelo seu site e gostaria de falar com você.`);
    window.open(`https://wa.me/${selectedAttendant.telefone.replace(/\D/g, '')}?text=${msg}`, '_blank');
    
    setSubmitted(true);
    setTimeout(() => {
      setOpen(false);
      setShowForm(false);
      setSelectedAttendant(null);
      setFormData({ nome: '', email: '', telefone: '' });
      setSubmitted(false);
    }, 2000);
  };

  return (
    <div 
      id="widget-container" 
      style={{ 
        position: 'absolute', 
        bottom: '0', 
        [config.posicao || 'right']: '0', 
        zIndex: 9999, 
        fontFamily: 'system-ui, -apple-system, sans-serif', 
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: config.posicao === 'left' ? 'flex-start' : 'flex-end',
        justifyContent: 'flex-end',
        padding: '1rem'
      }}
    >
       {/* Janela Pop-up */}
       {open && (
         <div style={{ width: '320px', background: 'white', borderRadius: '16px', boxShadow: '0 15px 40px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'slideUp 0.3s ease-out', pointerEvents: 'auto', marginBottom: '15px' }}>
            <div style={{ background: '#25D366', padding: '1.25rem', color: 'white' }}>
               <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>Fale Conosco</h3>
               <p style={{ fontSize: '0.8rem', opacity: 0.9, margin: '4px 0 0 0' }}>Escolha um atendente abaixo:</p>
            </div>

            <div style={{ padding: '0.75rem', maxHeight: '380px', overflowY: 'auto' }}>
               {!showForm ? (
                 config.atendentes.map((at: any) => (
                    <div 
                      key={at.id} 
                      onClick={() => { setSelectedAttendant(at); setShowForm(true); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.2s', borderBottom: '1px solid #f1f5f9' }}
                      onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                       <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          {at.avatarUrl ? (
                            <img src={at.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            renderOfficialWhatsappIcon(24, "#25D366")
                          )}
                       </div>
                       <div style={{ flex: 1 }}>
                          <h4 style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', margin: 0 }}>{at.nome}</h4>
                          <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>{at.cargo}</p>
                          {at.disponibilidade && <p style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>{at.disponibilidade}</p>}
                       </div>
                       {renderOfficialWhatsappIcon(18, "#25D366")}
                    </div>
                 ))
               ) : (
                 <div style={{ padding: '0.5rem' }}>
                    {submitted ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{ color: '#25D366', marginBottom: '1rem' }}><MessageCircle size={48} /></div>
                            <p style={{ fontWeight: 600, color: '#1e293b' }}>Abrindo WhatsApp...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleStartChat}>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', marginBottom: '1rem' }}>Falar com <strong>{selectedAttendant.nome}</strong></p>
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                            <input 
                                required placeholder="Seu Nome" 
                                style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #e2e8f0', padding: '0 0.75rem', fontSize: '0.85rem' }}
                                value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})}
                            />
                            <input 
                                required type="email" placeholder="Seu Email" 
                                style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #e2e8f0', padding: '0 0.75rem', fontSize: '0.85rem' }}
                                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                            />
                            <input 
                                required placeholder="Seu WhatsApp" 
                                style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #e2e8f0', padding: '0 0.75rem', fontSize: '0.85rem' }}
                                value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})}
                            />
                            <button type="submit" style={{ width: '100%', height: '42px', borderRadius: '6px', background: '#25D366', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
                                Iniciar Conversa
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} style={{ width: '100%', fontSize: '0.75rem', color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer', marginTop: '0.5rem' }}>Voltar</button>
                            </div>
                        </form>
                    )}
                 </div>
               )}
            </div>
         </div>
       )}

       {/* Botão Flutuante */}
       <button 
         onClick={() => setOpen(!open)}
         style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.25)', border: 'none', cursor: 'pointer', transition: 'transform 0.2s', position: 'relative', zIndex: 10000, pointerEvents: 'auto' }}
         onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
         onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
       >
         {open ? <X size={28} /> : renderOfficialWhatsappIcon(32, "white")}
       </button>

       <style>{`
         @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
         html, body { 
           background: none !important; 
           background-color: transparent !important;
           margin: 0 !important; 
           padding: 0 !important; 
           overflow: hidden !important;
           width: 100%;
           height: 100%;
           pointer-events: none;
         }
         #widget-container {
           pointer-events: none;
         }
         #widget-container > * {
           pointer-events: auto;
         }
       `}</style>
    </div>
  );
}
