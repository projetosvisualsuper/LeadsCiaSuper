const path = require('path');

// Inicia a ponte local de banco de dados em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  const { spawn } = require('child_process');
  const fs = require('fs');
  const bridgePath = path.join(__dirname, 'scripts', 'd1-bridge.js');
  
  if (fs.existsSync(bridgePath)) {
    console.log('Iniciando D1 Local Bridge...');
    const child = spawn('node', [bridgePath], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
  }
}

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


