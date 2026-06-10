'use client';

import { useCallback, useState, use, useEffect } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Link from 'next/link';
import { ArrowLeft, Save, Play } from 'lucide-react';
import BotSidebar from '@/components/bots/BotSidebar';
import SendMessageNode from '@/components/bots/nodes/SendMessageNode';
import ConditionNode from '@/components/bots/nodes/ConditionNode';

import ActionNode from '@/components/bots/nodes/ActionNode';
import PauseNode from '@/components/bots/nodes/PauseNode';
import ReactionNode from '@/components/bots/nodes/ReactionNode';
import CommentNode from '@/components/bots/nodes/CommentNode';
import InternalMessageNode from '@/components/bots/nodes/InternalMessageNode';
import ListMessageNode from '@/components/bots/nodes/ListMessageNode';
import SubscribeMetaNode from '@/components/bots/nodes/SubscribeMetaNode';
import ValidationNode from '@/components/bots/nodes/ValidationNode';
import StartSalesbotNode from '@/components/bots/nodes/StartSalesbotNode';
import CustomCodeNode from '@/components/bots/nodes/CustomCodeNode';
import WidgetNode from '@/components/bots/nodes/WidgetNode';
import RoundRobinNode from '@/components/bots/nodes/RoundRobinNode';
import TriggerNode from '@/components/bots/nodes/TriggerNode';
import MediaNode from '@/components/bots/nodes/MediaNode';

const nodeTypes: any = {
  trigger: TriggerNode,
  sendMessage: SendMessageNode,
  media: MediaNode,
  condition: ConditionNode,
  action: ActionNode,
  pause: PauseNode,
  reaction: ReactionNode,
  comment: CommentNode,
  internalMessage: InternalMessageNode,
  listMessage: ListMessageNode,
  subscribeMeta: SubscribeMetaNode,
  validation: ValidationNode,
  startSalesbot: StartSalesbotNode,
  customCode: CustomCodeNode,
  widget: WidgetNode,
  roundRobin: RoundRobinNode,
};

const templatesData: Record<string, { nodes: any[], edges: any[] }> = {
  'novo': {
    nodes: [],
    edges: []
  },
  'boas-vindas': {
    nodes: [
      { id: '1', type: 'sendMessage', position: { x: 250, y: 100 }, data: { label: 'Mensagem de Boas Vindas', message: 'Olá! Seja muito bem-vindo à Visual Super 😊. Como posso ajudar você hoje?' } },
      { id: '2', type: 'condition', position: { x: 250, y: 300 }, data: { label: 'Aguardar Resposta' } },
      { id: '3', type: 'action', position: { x: 100, y: 500 }, data: { label: 'Transferir Atendente' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', sourceHandle: 'true', target: '3' },
    ]
  },
  'qualificacao': {
    nodes: [
      { id: '1', type: 'sendMessage', position: { x: 250, y: 50 }, data: { label: 'Pedir CNPJ', message: 'Por favor, informe-nos seu CPF ou CNPJ para que possamos localizar seu cadastro.' } },
      { id: '2', type: 'condition', position: { x: 250, y: 250 }, data: { label: 'Verificar Documento' } },
      { id: '3', type: 'action', position: { x: 100, y: 450 }, data: { label: 'Salvar no CRM' } },
      { id: '4', type: 'sendMessage', position: { x: 400, y: 450 }, data: { label: 'Pedir Novamente', message: 'Documento inválido. Tente novamente apenas com números.' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', sourceHandle: 'true', target: '3' },
      { id: 'e2-4', source: '2', sourceHandle: 'false', target: '4' }
    ]
  },
  'fora-horario': {
    nodes: [
      { id: '1', type: 'condition', position: { x: 250, y: 50 }, data: { label: 'Verificar Horário Comercial' } },
      { id: '2', type: 'sendMessage', position: { x: 100, y: 250 }, data: { label: 'Atendimento Normal', message: 'Em instantes um de nossos consultores irá te atender.' } },
      { id: '3', type: 'sendMessage', position: { x: 400, y: 250 }, data: { label: 'Mensagem de Ausência', message: 'Lembrando que nossos horários de atendimento são de Segunda a quinta-feira das 09h às 17h. Deixe sua mensagem e retornaremos!' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', sourceHandle: 'true', target: '2' },
      { id: 'e1-3', source: '1', sourceHandle: 'false', target: '3' }
    ]
  }
};

export default function BotBuilder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const initialData = templatesData[id] || templatesData['novo'];
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [botName, setBotName] = useState(id === 'novo' ? 'Novo Bot de Automação' : `Modelo: ${id}`);
  const [saveStatus, setSaveStatus] = useState('Salvar Fluxo');
  const [showTestModal, setShowTestModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`bot_flow_${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.nodes && parsed.nodes.length > 0) {
          setNodes(parsed.nodes);
          setEdges(parsed.edges);
          if (parsed.name) setBotName(parsed.name);
        }
      } catch(e) {}
    }
  }, [id, setNodes, setEdges]);

  const handleSave = () => {
    setSaveStatus('Salvando...');
    setTimeout(() => {
      localStorage.setItem(`bot_flow_${id}`, JSON.stringify({ nodes, edges, name: botName }));
      setSaveStatus('Salvo! ✓');
      setTimeout(() => setSaveStatus('Salvar Fluxo'), 2500);
    }, 600);
  };

  const handleTest = () => {
    setShowTestModal(true);
  };

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onDragOver = useCallback((event: any) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: any) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) {
        return;
      }

      // In a real app we'd map screen coords to react flow pane coords properly
      const position = {
        x: event.clientX - 200,
        y: event.clientY - 100,
      };

      const typeLabels: Record<string, { label: string, color: string }> = {
        trigger: { label: 'Gatilho de Início', color: '#eab308' },
        sendMessage: { label: 'Enviar Mensagem', color: 'var(--primary)' },
        media: { label: 'Enviar Arquivo', color: '#6366f1' },
        reaction: { label: 'Reação', color: '#ef4444' },
        comment: { label: 'Comentário', color: '#ec4899' },
        internalMessage: { label: 'Mensagem Interna', color: '#64748b' },
        listMessage: { label: 'List Message', color: '#22c55e' },
        pause: { label: 'Pausa', color: '#db2777' },
        subscribeMeta: { label: 'Inscrever-se', color: '#3b82f6' },
        action: { label: 'Ação', color: '#10b981' },
        condition: { label: 'Condição', color: '#8b5cf6' },
        validation: { label: 'Validação', color: '#10b981' },
        startSalesbot: { label: 'Iniciar Salesbot', color: '#14b8a6' },
        customCode: { label: 'Código Customizado', color: '#0ea5e9' },
        widget: { label: 'Widget', color: '#3b82f6' },
        roundRobin: { label: 'Round Robin', color: '#f59e0b' }
      };

      const nodeData = typeLabels[type] || { label: 'Novo Nó', color: '#3b82f6' };

      const newNode = {
        id: `node_${Date.now()}`,
        type,
        position,
        data: { 
          label: nodeData.label,
          color: nodeData.color,
          message: '' 
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes],
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: 'var(--card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/bots" style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.05)', borderRadius: '8px' }}>
            <ArrowLeft size={20} />
          </Link>
          <input 
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            style={{ 
              fontSize: '1.25rem', 
              fontWeight: 600, 
              background: 'transparent', 
              border: 'none', 
              borderBottom: '1px dashed transparent',
              outline: 'none',
              padding: '2px 8px',
              transition: 'all 0.2s',
              width: '350px'
            }}
            onFocus={(e) => {
              e.target.style.borderBottom = '1px dashed var(--primary)';
              e.target.style.background = 'rgba(0,0,0,0.02)';
            }}
            onBlur={(e) => {
              e.target.style.borderBottom = '1px dashed transparent';
              e.target.style.background = 'transparent';
            }}
            title="Clique para renomear"
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleTest} style={{ padding: '0.5rem 1rem', background: 'var(--success)', color: 'white', borderRadius: 'var(--radius)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', border: 'none', transition: 'all 0.2s' }}>
            <Play size={18} />
            Testar
          </button>
          <button onClick={handleSave} style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', border: 'none', transition: 'all 0.2s', opacity: saveStatus === 'Salvando...' ? 0.7 : 1 }}>
            <Save size={18} />
            {saveStatus}
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <BotSidebar isOpen={isSidebarOpen} />
        
        <div style={{ flex: 1 }} onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>

      {/* Modal de Teste Customizado */}
      {showTestModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ background: 'var(--card)', color: 'var(--card-foreground)', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '12px', borderRadius: '50%' }}>
                <Play size={24} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Simulador de Bot</h2>
            </div>
            
            <div style={{ color: 'var(--secondary)', lineHeight: 1.5 }}>
              <p style={{ marginBottom: '12px' }}>O modo de teste interativo será disponibilizado em breve na sua tela de chat unificada.</p>
              <p style={{ fontSize: '0.9rem', padding: '12px', background: 'rgba(234, 179, 8, 0.1)', color: '#ca8a04', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                <strong>Lembrete:</strong> Não esqueça de clicar em "Salvar Fluxo" para não perder as alterações que você acabou de fazer.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setShowTestModal(false)} style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
