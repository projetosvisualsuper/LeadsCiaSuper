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
  experimental: {
    optimizePackageImports: ['lucide-react'], // Alivia a memória durante renderização
    serverActions: {
      allowedOrigins: ['leads.ciasuper.com.br', '*.ciasuper.com.br', 'localhost:3000']
    }
  }
};

module.exports = nextConfig;


