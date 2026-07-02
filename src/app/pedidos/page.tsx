'use client';

import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Pedido } from '@/types/crm';
import { ShoppingBag, ChevronDown, ChevronUp, RefreshCw, CheckCircle2, User, Phone, Package, DollarSign, Clock, Check, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPedidoId, setExpandedPedidoId] = useState<string | null>(null);

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const data = await api.getPedidos();
      setPedidos(data);
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, []);

  const handleTogglePedido = async (pedido: Pedido) => {
    if (expandedPedidoId === pedido.id) {
      setExpandedPedidoId(null);
      return;
    }
    
    setExpandedPedidoId(pedido.id);

    if (!pedido.isRead) {
      try {
        await api.markPedidoAsRead(pedido.id);
        setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, isRead: true } : p));
        
        // Disparar evento para atualizar o badge do sidebar
        window.dispatchEvent(new Event('pedidos-read'));
      } catch (e) {
        console.error('Erro ao marcar pedido como lido:', e);
      }
    }
  };

  const handleStatusChange = async (pedidoId: string, newStatus: string) => {
    try {
      await api.updatePedidoStatus(pedidoId, newStatus);
      setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, status: newStatus as any } : p));
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert('Erro ao atualizar o status do pedido.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente': 
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1"><Clock size={12}/> Pendente</span>;
      case 'em_atendimento': 
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1"><RefreshCw size={12}/> Em Atendimento</span>;
      case 'finalizado': 
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center gap-1"><Check size={12}/> Finalizado</span>;
      case 'cancelado': 
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1"><XCircle size={12}/> Cancelado</span>;
      default: 
        return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="text-emerald-600" />
            Pedidos do Site
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gerencie cotações e compras recebidas via WooCommerce/Site.
          </p>
        </div>
        <button 
          onClick={fetchPedidos} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {pedidos.length === 0 && !loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center">
            <CheckCircle2 size={48} className="text-emerald-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-700">Tudo limpo!</h3>
            <p>Nenhum pedido ou cotação pendente no momento.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pedidos.map((pedido) => (
              <div 
                key={pedido.id} 
                className={`transition-colors ${!pedido.isRead ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}
              >
                <div 
                  className="p-4 flex items-center gap-4 cursor-pointer"
                  onClick={() => handleTogglePedido(pedido)}
                >
                  <div className="shrink-0 mt-1 self-start">
                    <div className={`p-2 rounded-lg ${!pedido.isRead ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      <ShoppingBag size={20} />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      {getStatusBadge(pedido.status)}
                      <span className="text-sm font-bold text-slate-800 flex items-center gap-1">
                        Ref: {pedido.pedidoReferencia || 'N/A'}
                      </span>
                      {!pedido.isRead && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mt-2">
                      <span className="flex items-center gap-1">
                        <User size={14} className="text-slate-400" />
                        {pedido.leadNome || 'Lead Desconhecido'}
                      </span>
                      {pedido.valor ? (
                        <span className="flex items-center gap-1 font-semibold text-emerald-700">
                          <DollarSign size={14} />
                          R$ {pedido.valor.toFixed(2)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  
                  <div className="shrink-0 text-xs text-slate-400 flex flex-col items-end gap-2">
                    {new Date(pedido.dataCriacao).toLocaleString('pt-BR')}
                    {expandedPedidoId === pedido.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {expandedPedidoId === pedido.id && (
                  <div className="px-14 pb-5 pt-2 border-t border-slate-100 mt-2 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      
                      {/* Detalhes do Pedido */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                          <Package size={16} /> Produtos Solicitados
                        </h4>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm text-slate-600">
                          {pedido.itens ? (
                            <ul className="list-disc pl-4 space-y-1">
                              {pedido.itens.split(',').map((item, idx) => (
                                <li key={idx}>{item.trim()}</li>
                              ))}
                            </ul>
                          ) : 'Itens não informados'}
                        </div>
                      </div>

                      {/* Ações e Contato */}
                      <div className="flex flex-col gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                            <Phone size={16} /> Contato
                          </h4>
                          <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">{pedido.leadCelular || 'N/A'}</span>
                            <Link href="/leads" className="text-xs text-emerald-600 font-semibold hover:underline">
                              Ver no CRM &rarr;
                            </Link>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                            Mudar Status
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => handleStatusChange(pedido.id, 'pendente')} className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${pedido.status === 'pendente' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Pendente</button>
                            <button onClick={() => handleStatusChange(pedido.id, 'em_atendimento')} className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${pedido.status === 'em_atendimento' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Em Atendimento</button>
                            <button onClick={() => handleStatusChange(pedido.id, 'finalizado')} className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${pedido.status === 'finalizado' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Finalizado</button>
                            <button onClick={() => handleStatusChange(pedido.id, 'cancelado')} className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${pedido.status === 'cancelado' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Cancelado</button>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
