// Cross-platform build script to force Webpack by disabling Turbopack in Next.js 16
process.env.NEXT_TURBOPACK = '0';

const { spawnSync } = require('child_process');
const isWindows = process.platform === 'win32';
const cmd = isWindows ? 'npx.cmd' : 'npx';

console.log('Starting Next.js build with Webpack (Turbopack disabled)...');
const result = spawnSync(cmd, ['next', 'build', '--webpack'], { stdio: 'inherit', shell: true });
process.exit(result.status ?? 0);
