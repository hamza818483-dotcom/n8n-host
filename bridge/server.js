// n8n MCP Bridge Server
// Exposes n8n's REST API as MCP tools so Claude can create/edit/execute workflows.
// Uses the official MCP SDK for correct Streamable HTTP transport handling.

const express = require('express');
const fetch = require('node-fetch');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { z } = require('zod');

const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_BASE_URL || !N8N_API_KEY) {
  console.error('Missing N8N_BASE_URL or N8N_API_KEY environment variables.');
  process.exit(1);
}

const n8nHeaders = {
  'X-N8N-API-KEY': N8N_API_KEY,
  'Content-Type': 'application/json',
};

async function n8nRequest(path, method = 'GET', body = null) {
  const res = await fetch(`${N8N_BASE_URL}/api/v1${path}`, {
    method,
    headers: n8nHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`n8n API error ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

function textResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function buildServer() {
  const server = new McpServer({ name: 'n8n-mcp-bridge', version: '1.0.0' });

  server.registerTool(
    'list_workflows',
    { description: 'List all workflows in the n8n instance.', inputSchema: {} },
    async () => textResult(await n8nRequest('/workflows'))
  );

  server.registerTool(
    'get_workflow',
    { description: 'Get the full JSON definition of a workflow by ID.', inputSchema: { id: z.string() } },
    async ({ id }) => textResult(await n8nRequest(`/workflows/${id}`))
  );

  server.registerTool(
    'create_workflow',
    {
      description: 'Create a new workflow. Provide the full n8n workflow JSON (name, nodes, connections).',
      inputSchema: {
        name: z.string(),
        nodes: z.array(z.any()),
        connections: z.record(z.any()),
        settings: z.record(z.any()).optional(),
      },
    },
    async ({ name, nodes, connections, settings }) =>
      textResult(await n8nRequest('/workflows', 'POST', { name, nodes, connections, settings: settings || {} }))
  );

  server.registerTool(
    'update_workflow',
    {
      description: 'Update an existing workflow by ID. Provide the full updated workflow JSON.',
      inputSchema: {
        id: z.string(),
        name: z.string(),
        nodes: z.array(z.any()),
        connections: z.record(z.any()),
        settings: z.record(z.any()).optional(),
      },
    },
    async ({ id, name, nodes, connections, settings }) =>
      textResult(await n8nRequest(`/workflows/${id}`, 'PUT', { name, nodes, connections, settings: settings || {} }))
  );

  server.registerTool(
    'activate_workflow',
    { description: 'Activate (publish) a workflow by ID.', inputSchema: { id: z.string() } },
    async ({ id }) => textResult(await n8nRequest(`/workflows/${id}/activate`, 'POST'))
  );

  server.registerTool(
    'deactivate_workflow',
    { description: 'Deactivate a workflow by ID.', inputSchema: { id: z.string() } },
    async ({ id }) => textResult(await n8nRequest(`/workflows/${id}/deactivate`, 'POST'))
  );

  server.registerTool(
    'delete_workflow',
    { description: 'Delete a workflow by ID.', inputSchema: { id: z.string() } },
    async ({ id }) => textResult(await n8nRequest(`/workflows/${id}`, 'DELETE'))
  );

  server.registerTool(
    'execute_workflow',
    { description: 'Manually trigger/execute a workflow by ID.', inputSchema: { id: z.string() } },
    async ({ id }) => textResult(await n8nRequest(`/workflows/${id}/run`, 'POST', {}))
  );

  server.registerTool(
    'list_executions',
    { description: 'List recent executions, optionally filtered by workflow ID.', inputSchema: { workflowId: z.string().optional() } },
    async ({ workflowId }) =>
      textResult(await n8nRequest(`/executions${workflowId ? `?workflowId=${workflowId}` : ''}`))
  );

  server.registerTool(
    'get_execution',
    { description: 'Get details of a specific execution by ID, including node outputs and errors.', inputSchema: { id: z.string() } },
    async ({ id }) => textResult(await n8nRequest(`/executions/${id}`))
  );

  return server;
}

const app = express();
app.use(express.json());

// Stateless mode: a fresh server+transport per request (simple and robust for this use case)
app.post('/mcp', async (req, res) => {
  try {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('MCP request error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: err.message },
        id: req.body?.id ?? null,
      });
    }
  }
});

app.get('/mcp', (req, res) => {
  res.status(405).json({ error: 'Method not allowed. Use POST for MCP requests.' });
});

app.get('/', (req, res) => {
  res.send('n8n MCP bridge is running.');
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`n8n MCP bridge listening on port ${PORT}`);
});
