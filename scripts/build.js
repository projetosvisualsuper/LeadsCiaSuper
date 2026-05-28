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

// Apenas executa o next-on-pages localmente em sistemas não-Windows,
// evitando recursão no Cloudflare Pages (onde o painel já executa npx @cloudflare/next-on-pages@1)
// e evitando crash de compatibilidade do shellac no Windows local.
if (!process.env.CF_PAGES && !isWindows) {
  console.log('Running next-on-pages compiler...');
  const nopRes = spawnSync(cmd, ['@cloudflare/next-on-pages'], { stdio: 'inherit', shell: true });
  process.exit(nopRes.status ?? 0);
} else {
  console.log('Skipping next-on-pages compiler in this environment (handled by Cloudflare or local Windows).');
}
