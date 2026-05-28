// Cross-platform build script to force Webpack and run next-on-pages on Cloudflare
process.env.NEXT_TURBOPACK = '0';

const { spawnSync } = require('child_process');
const isWindows = process.platform === 'win32';
const cmd = isWindows ? 'npx.cmd' : 'npx';

console.log('Running next build with Webpack...');
const buildRes = spawnSync(cmd, ['next', 'build', '--webpack'], { stdio: 'inherit', shell: true });
if (buildRes.status !== 0) {
  process.exit(buildRes.status ?? 1);
}

// Apenas executa o next-on-pages no ambiente Cloudflare Pages (onde CF_PAGES=1)
// ou em sistemas não-Windows, evitando o crash de compatibilidade do shellac no Windows local.
if (process.env.CF_PAGES === '1' || !isWindows) {
  console.log('Running next-on-pages compiler...');
  const nopRes = spawnSync(cmd, ['@cloudflare/next-on-pages'], { stdio: 'inherit', shell: true });
  process.exit(nopRes.status ?? 0);
} else {
  console.log('Skipping next-on-pages compiler on local Windows development machine.');
}
