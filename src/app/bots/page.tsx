'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bot, MessageCircle, Clock, Zap, Plus, Settings2, Power, Copy } from 'lucide-react';

interface BotTemplate {
  id: string;
  name: string;
  description: string;
  category: 'gerar_leads' | 'engajar' | 'atendimento' | 'utilitarios';
  icon: any;
  color: string;
}

const templates: BotTemplate[] = [
  {
    id: 'boas-vindas',
    name: 'Bot de Boas-vindas',
    description: 'Recepcione seus clientes imediatamente e direcione para o setor correto.',
    category: 'engajar',
    icon: MessageCircle,
    color: '#6366f1'
  },
  {
    id: 'qualificacao',
    name: 'Qualificação de Leads',
    description: 'Faça perguntas essenciais (CPF/CNPJ, Email) antes de passar para um humano.',
    category: 'gerar_leads',
    icon: Zap,
    color: '#10b981'
  },
  {
    id: 'fora-horario',
    name: 'Fora de Horário',
    description: 'Aise o cliente sobre seus horários de funcionamento e recolha a mensagem.',
    category: 'atendimento',
    icon: Clock,
    color: '#f59e0b'
  }
];

export default function BotsPage() {
  const [activeTab, setActiveTab] = useState<'modelos' | 'meus_bots'>('modelos');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Bot size={32} color="var(--primary)" />
            Bots e Automações
          </h1>
          <p style={{ color: 'var(--secondary)', marginTop: '0.5rem' }}>Crie fluxos de atendimento automatizados incríveis.</p>
        </div>
        
        <Link href="/bots/builder/novo" style={{ background: 'var(--primary)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <Plus size={20} />
          Começar do Zero
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveTab('modelos')}
          style={{ 
            padding: '1rem', 
            fontWeight: 600,
            borderBottom: activeTab === 'modelos' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'modelos' ? 'var(--primary)' : 'var(--secondary)'
          }}>
          Galeria de Modelos
        </button>
        <button 
          onClick={() => setActiveTab('meus_bots')}
          style={{ 
            padding: '1rem', 
            fontWeight: 600,
            borderBottom: activeTab === 'meus_bots' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'meus_bots' ? 'var(--primary)' : 'var(--secondary)'
          }}>
          Meus Bots
        </button>
      </div>

      {activeTab === 'modelos' && (
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Templates recomendados</h2>
          <div className="grid grid-cols-3">
            {templates.map(tpl => (
              <div key={tpl.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: `${tpl.color}15`, color: tpl.color, padding: '0.75rem', borderRadius: '12px' }}>
                    <tpl.icon size={24} />
                  </div>
                  <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>{tpl.name}</h3>
                </div>
                <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', flex: 1 }}>{tpl.description}</p>
                <div style={{ marginTop: '1rem' }}>
                  <Link href={`/bots/builder/${tpl.id}`} style={{ display: 'block', textAlign: 'center', background: 'rgba(0,0,0,0.05)', padding: '0.5rem', borderRadius: '8px', fontWeight: 500 }}>
                    Usar este Modelo
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'meus_bots' && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Settings2 size={48} color="var(--secondary)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Nenhum Bot Ativo</h3>
          <p style={{ color: 'var(--secondary)', marginBottom: '1.5rem' }}>Você ainda não criou ou ativou nenhuma automação.</p>
          <Link href="/bots/builder/novo" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius)', fontWeight: 600 }}>
            Criar meu primeiro Bot
          </Link>
        </div>
      )}
    </div>
  );
}
