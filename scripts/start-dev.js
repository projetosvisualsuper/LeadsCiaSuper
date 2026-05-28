const { spawn } = require('child_process');
const path = require('path');

console.log('=== INICIANDO AMBIENTE DE DESENVOLVIMENTO ===');

// 1. Iniciar Ponte Local D1 (Porta 3005)
const bridgePath = path.join(__dirname, 'd1-bridge.js');
console.log(`[Bridge] Iniciando ponte local em: ${bridgePath}`);
const bridge = spawn('node', [bridgePath], {
  stdio: 'inherit',
  shell: true
});

// 2. Iniciar Next.js Dev Server
console.log('[Next.js] Iniciando Next.js Dev Server...');
const nextDev = spawn('npx', ['next', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Encerrar ambos os processos quando o processo principal for interrompido
process.on('SIGINT', () => {
  console.log('\nEncerrando ambiente de desenvolvimento...');
  bridge.kill();
  nextDev.kill();
  process.exit(0);
});
process.on('SIGTERM', () => {
  bridge.kill();
  nextDev.kill();
  process.exit(0);
});
