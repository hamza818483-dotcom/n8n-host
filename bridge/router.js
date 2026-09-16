// Minimal reverse proxy: /mcp -> bridge (127.0.0.1:7862), everything else -> n8n (127.0.0.1:7861)
const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({});
const ROUTER_PORT = process.env.ROUTER_PORT || 7860;

const server = http.createServer((req, res) => {
  const target = req.url.startsWith('/mcp')
    ? 'http://127.0.0.1:7862'
    : 'http://127.0.0.1:7861';

  proxy.web(req, res, { target }, (err) => {
    res.writeHead(502);
    res.end('Bad gateway: ' + err.message);
  });
});

// Support websocket upgrades (n8n editor uses these)
server.on('upgrade', (req, socket, head) => {
  const target = req.url.startsWith('/mcp')
    ? 'http://127.0.0.1:7862'
    : 'http://127.0.0.1:7861';
  proxy.ws(req, socket, head, { target });
});

server.listen(ROUTER_PORT, '0.0.0.0', () => {
  console.log(`Router listening on ${ROUTER_PORT} (routes /mcp -> 7862, else -> 7861)`);
});
