import { d1Api } from './d1';

const isClient = typeof window !== 'undefined';

// Proxy dinâmico para rotear chamadas do banco de dados D1.
// No navegador (Client-side), faz a ponte com a rota /api/d1-bridge via HTTP POST.
// No servidor (Edge Runtime), executa as consultas diretamente contra o binding do D1.
export const api = new Proxy({} as typeof d1Api, {
  get(target, propKey) {
    const method = propKey as string;
    
    return async (...args: any[]) => {
      if (isClient) {
        const res = await fetch('/api/d1-bridge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method, args })
        });
        
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Erro ao conectar à D1 Bridge API.' }));
          throw new Error(err.message || 'Erro de comunicação com o banco D1.');
        }
        return await res.json();
      } else {
        if (typeof (d1Api as any)[method] !== 'function') {
          throw new Error(`Método '${method}' não encontrado no adaptador D1.`);
        }
        return await (d1Api as any)[method](...args);
      }
    };
  }
});
