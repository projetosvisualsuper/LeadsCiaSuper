'use client';

import { MessageSquare, Network, PlaySquare, FileText, Bot } from 'lucide-react';

export default function BotSidebar({ isOpen }: { isOpen: boolean }) {
  if (!isOpen) return null;

  const onDragStart = (event: any, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside style={{ 
      width: '300px', 
      background: 'var(--sidebar)', 
      color: 'var(--sidebar-foreground)',
      borderRight: '1px solid var(--border)',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Bot size={20} />
        Ações do Bot
      </h2>
      <p style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '1rem' }}>Arraste os blocos para a tela para criar seu fluxo.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
        
        {/* Gatilho */}
        <div className="dndnode" onDragStart={(event) => onDragStart(event, 'trigger')} draggable 
          style={{ background: '#fefce8', color: 'var(--card-foreground)', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #eab308', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(234, 179, 8, 0.1)' }}>
          <div style={{ color: '#eab308' }}>⚡</div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Gatilho de Início</span>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.5rem 0' }} />

        {/* Enviar mensagem */}
        <div className="dndnode" onDragStart={(event) => onDragStart(event, 'sendMessage')} draggable 
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ color: 'var(--primary)' }}><MessageSquare size={16} /></div>
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Enviar mensagem</span>
        </div>

        {/* Enviar Arquivo */}
        <div className="dndnode" onDragStart={(event) => onDragStart(event, 'media')} draggable 
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#6366f1' }}>📎</div>
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Enviar Arquivo</span>
        </div>

        {/* Reação */}
        <div className="dndnode" onDragStart={(event) => onDragStart(event, 'reaction')} draggable 
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#ef4444' }}>❤️</div>
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Reação</span>
        </div>

        {/* Comentário */}
        <div className="dndnode" onDragStart={(event) => onDragStart(event, 'comment')} draggable 
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#ec4899' }}><MessageSquare size={16} /></div>
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Comentário</span>
        </div>

        {/* Enviar mensagem interna */}
        <div className="dndnode" onDragStart={(event) => onDragStart(event, 'internalMessage')} draggable 
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#64748b' }}><MessageSquare size={16} /></div>
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Enviar mensagem interna</span>
        </div>

        {/* List Message (WhatsApp) */}
        <div className="dndnode" onDragStart={(event) => onDragStart(event, 'listMessage')} draggable 
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#22c55e' }}>💬</div>
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>List Message (WhatsApp)</span>
        </div>

        {/* Pausar */}
        <div className="dndnode" onDragStart={(event) => onDragStart(event, 'pause')} draggable 
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#db2777' }}>⏸️</div>
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Pausar</span>
        </div>

        {/* Inscrever-se (Meta) */}
        <div className="dndnode" onDragStart={(event) => onDragStart(event, 'subscribeMeta')} draggable 
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#3b82f6' }}>♾️</div>
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Inscrever-se (Meta)</span>
        </div>

        {/* Ação */}
        <div className="dndnode" onDragStart={(event) => onDragStart(event, 'action')} draggable 
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#10b981' }}><PlaySquare size={16} /></div>
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Ação</span>
        </div>

        {/* Condição */}
        <div className="dndnode" onDragStart={(event) => onDragStart(event, 'condition')} draggable 
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#8b5cf6' }}><Network size={16} /></div>
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Condição</span>
        </div>

        {/* Validação */}
        <div className="dndnode" onDragStart={(event) => onDragStart(event, 'validation')} draggable 
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#10b981' }}>✔️</div>
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Validação</span>
        </div>

        {/* Iniciar Salesbot */}
        <div className="dndnode" onDragStart={(event) => onDragStart(event, 'startSalesbot')} draggable 
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#14b8a6' }}>▶️</div>
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Iniciar Salesbot</span>
        </div>

        {/* Etapa adaptada (cód.) */}
        <div className="dndnode" onDragStart={(event) => onDragStart(event, 'customCode')} draggable 
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#0ea5e9' }}>&lt;/&gt;</div>
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Etapa adaptada (cód.)</span>
        </div>

        {/* Widget */}
        <div className="dndnode" onDragStart={(event) => onDragStart(event, 'widget')} draggable 
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#3b82f6' }}>🧩</div>
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Widget</span>
        </div>

        {/* Round Robin */}
        <div className="dndnode" onDragStart={(event) => onDragStart(event, 'roundRobin')} draggable 
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#f59e0b' }}>🔄</div>
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Round Robin</span>
        </div>
      </div>
    </aside>
  );
}
