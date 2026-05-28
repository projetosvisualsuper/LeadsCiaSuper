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
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'async_hooks', 'node:async_hooks'];
    }
    return config;
  }
};

module.exports = nextConfig;


