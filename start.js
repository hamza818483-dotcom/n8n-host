const { spawn } = require('child_process');

console.log('Starting n8n...');
const n8n = spawn('node', ['/usr/local/lib/node_modules/n8n/bin/n8n', 'start'], { stdio: 'inherit' });

console.log('Starting MCP bridge...');
const bridge = spawn('node', ['/bridge/server.js'], { stdio: 'inherit' });

console.log('Starting router...');
const router = spawn('node', ['/bridge/router.js'], { stdio: 'inherit' });

function exitAll(code) {
  [n8n, bridge, router].forEach((p) => {
    if (!p.killed) p.kill();
  });
  process.exit(code);
}

n8n.on('exit', (code) => { console.log('n8n exited'); exitAll(code || 1); });
bridge.on('exit', (code) => { console.log('bridge exited'); exitAll(code || 1); });
router.on('exit', (code) => { console.log('router exited'); exitAll(code || 1); });
