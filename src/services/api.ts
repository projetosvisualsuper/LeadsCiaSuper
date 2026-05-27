import { d1Api } from './d1';

// Exporta a API do Cloudflare D1 diretamente.
// Isso evita importar as bibliotecas do Firebase no build do Cloudflare Pages,
// reduzindo drasticamente o tamanho do bundle final de cada rota e resolvendo o erro de limite de 25MB.
export const api = d1Api;
