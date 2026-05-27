const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Remove o processamento de imagens do servidor (alivia CPU Hostinger)
  },
  output: 'standalone', // Empacota apenas os arquivos necessários (Reduz memória)
  experimental: {
    optimizePackageImports: ['lucide-react'], // Alivia a memória durante renderização
  }
};

module.exports = nextConfig;

