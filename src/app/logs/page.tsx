'use client';

import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { SystemLog } from '@/types/crm';
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getSystemLogs();
      setLogs(data);
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleToggleLog = async (log: SystemLog) => {
    if (expandedLogId === log.id) {
      setExpandedLogId(null);
      return;
    }
    
    setExpandedLogId(log.id);

    if (!log.isRead) {
      try {
        await api.markSystemLogAsRead(log.id);
        setLogs(prev => prev.map(l => l.id === log.id ? { ...l, isRead: true } : l));
        
        // Dispatch event to update sidebar badge
        window.dispatchEvent(new Event('logs-read'));
      } catch (e) {
        console.error('Erro ao marcar log como lido:', e);
      }
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertTriangle size={20} className="text-red-500" />;
      case 'warning': return <AlertCircle size={20} className="text-amber-500" />;
      case 'info': return <Info size={20} className="text-blue-500" />;
      default: return <Info size={20} className="text-slate-500" />;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="text-red-500" />
            Logs do Sistema
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Monitoramento de erros e alertas técnicos dos serviços integrados.
          </p>
        </div>
        <button 
          onClick={fetchLogs} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {logs.length === 0 && !loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center">
            <CheckCircle2 size={48} className="text-green-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-700">Tudo limpo!</h3>
            <p>Nenhum erro ou alerta recente no sistema.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div 
                key={log.id} 
                className={`transition-colors ${!log.isRead ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}
              >
                <div 
                  className="p-4 flex items-center gap-4 cursor-pointer"
                  onClick={() => handleToggleLog(log)}
                >
                  <div className="shrink-0 mt-1 self-start">
                    {getLevelIcon(log.level)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider
                        ${log.level === 'error' ? 'bg-red-100 text-red-700' : 
                          log.level === 'warning' ? 'bg-amber-100 text-amber-700' : 
                          'bg-blue-100 text-blue-700'}`}
                      >
                        {log.level}
                      </span>
                      <span className="text-sm font-medium text-slate-600 truncate">{log.source}</span>
                      {!log.isRead && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                      )}
                    </div>
                    <p className={`text-sm truncate ${!log.isRead ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                      {log.message}
                    </p>
                  </div>
                  
                  <div className="shrink-0 text-xs text-slate-400 flex flex-col items-end gap-2">
                    {new Date(log.dataCriacao).toLocaleString('pt-BR')}
                    {expandedLogId === log.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {expandedLogId === log.id && (
                  <div className="px-14 pb-5 pt-1">
                    <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
                      {log.details || 'Nenhum detalhe adicional fornecido pelo sistema.'}
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
