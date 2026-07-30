import type { d1Api as d1ApiType } from './d1';

const isClient = typeof window !== 'undefined';

// Cache em memória para o lado do cliente (Client-side)
const cacheMap = new Map<string, { data: any; expiry: number }>();
const pendingMap = new Map<string, Promise<any>>();

// Métodos de leitura com tempo de vida de cache (TTL em ms)
const READ_CACHE_TTL: Record<string, number> = {
  getSettings: 30000,            // 30s
  getAllUserProfiles: 30000,     // 30s
  getWhatsappConnections: 15000,  // 15s
  getPopups: 30000,              // 30s
  getLandingPages: 30000,         // 30s
  getUnreadLogsCount: 10000,     // 10s
  getUnreadPedidosCount: 10000,  // 10s
  getBots: 20000,                // 20s
};

// Proxy dinâmico para rotear chamadas do banco de dados D1.
// No navegador (Client-side), faz a ponte com a rota /api/d1-bridge via HTTP POST com deduplicação e cache.
// No servidor (Edge Runtime), executa as consultas diretamente contra o binding do D1.
export const api = new Proxy({} as typeof d1ApiType, {
  get(target, propKey) {
    const method = propKey as string;
    
    return async (...args: any[]) => {
      if (isClient) {
        // Se for um método de alteração/mutação, invalida o cache
        const isMutation = method.startsWith('save') || 
                           method.startsWith('delete') || 
                           method.startsWith('update') || 
                           method.startsWith('clear') || 
                           method.startsWith('mark') ||
                           method.startsWith('toggle') ||
                           method.startsWith('add') ||
                           method.startsWith('generate') ||
                           method.startsWith('remove');

        if (isMutation) {
          cacheMap.clear();
        }

        const cacheTTL = READ_CACHE_TTL[method];
        const cacheKey = `${method}:${JSON.stringify(args)}`;

        // 1. Retorna cache válido em memória
        if (cacheTTL && !isMutation) {
          const cached = cacheMap.get(cacheKey);
          if (cached && Date.now() < cached.expiry) {
            return cached.data;
          }
        }

        // 2. Deduplicação de requisições simultâneas em andamento
        if (pendingMap.has(cacheKey)) {
          return await pendingMap.get(cacheKey);
        }

        // 3. Executa a requisição HTTP POST para a d1-bridge
        const fetchPromise = (async () => {
          try {
            const res = await fetch('/api/d1-bridge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ method, args })
            });
            
            if (!res.ok) {
              const err = await res.json().catch(() => ({ message: 'Erro ao conectar à D1 Bridge API.' }));
              throw new Error(err.message || 'Erro de comunicação com o banco D1.');
            }
            
            const data = await res.json();

            // Salva no cache se o método for elegível
            if (cacheTTL && !isMutation) {
              cacheMap.set(cacheKey, { data, expiry: Date.now() + cacheTTL });
            }

            return data;
          } finally {
            pendingMap.delete(cacheKey);
          }
        })();

        pendingMap.set(cacheKey, fetchPromise);
        return await fetchPromise;
      } else {
        const { d1Api } = await import('./d1');
        if (typeof (d1Api as any)[method] !== 'function') {
          throw new Error(`Método '${method}' não encontrado no adaptador D1.`);
        }
        return await (d1Api as any)[method](...args);
      }
    };
  }
});
