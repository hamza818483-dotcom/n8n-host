// n8n MCP Bridge Server
// Exposes n8n's REST API as MCP tools so Claude can create/edit/execute workflows.

const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const N8N_BASE_URL = process.env.N8N_BASE_URL; // e.g. https://hf04-quizbot-backup.hf.space
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

// ---- MCP Tool Definitions ----
const tools = [
  {
    name: 'list_workflows',
    description: 'List all workflows in the n8n instance.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_workflow',
    description: 'Get the full JSON definition of a workflow by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Workflow ID' } },
      required: ['id'],
    },
  },
  {
    name: 'create_workflow',
    description: 'Create a new workflow. Provide the full n8n workflow JSON (name, nodes, connections).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        nodes: { type: 'array' },
        connections: { type: 'object' },
        settings: { type: 'object' },
      },
      required: ['name', 'nodes', 'connections'],
    },
  },
  {
    name: 'update_workflow',
    description: 'Update an existing workflow by ID. Provide the full updated workflow JSON.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        nodes: { type: 'array' },
        connections: { type: 'object' },
        settings: { type: 'object' },
      },
      required: ['id', 'name', 'nodes', 'connections'],
    },
  },
  {
    name: 'activate_workflow',
    description: 'Activate (publish) a workflow by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'deactivate_workflow',
    description: 'Deactivate a workflow by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'delete_workflow',
    description: 'Delete a workflow by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'execute_workflow',
    description: 'Manually trigger/execute a workflow by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'list_executions',
    description: 'List recent executions, optionally filtered by workflow ID.',
    inputSchema: {
      type: 'object',
      properties: { workflowId: { type: 'string' } },
    },
  },
  {
    name: 'get_execution',
    description: 'Get details of a specific execution by ID, including node outputs and errors.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
];

async function callTool(name, args) {
  switch (name) {
    case 'list_workflows':
      return n8nRequest('/workflows');
    case 'get_workflow':
      return n8nRequest(`/workflows/${args.id}`);
    case 'create_workflow':
      return n8nRequest('/workflows', 'POST', {
        name: args.name,
        nodes: args.nodes,
        connections: args.connections,
        settings: args.settings || {},
      });
    case 'update_workflow':
      return n8nRequest(`/workflows/${args.id}`, 'PUT', {
        name: args.name,
        nodes: args.nodes,
        connections: args.connections,
        settings: args.settings || {},
      });
    case 'activate_workflow':
      return n8nRequest(`/workflows/${args.id}/activate`, 'POST');
    case 'deactivate_workflow':
      return n8nRequest(`/workflows/${args.id}/deactivate`, 'POST');
    case 'delete_workflow':
      return n8nRequest(`/workflows/${args.id}`, 'DELETE');
    case 'execute_workflow':
      return n8nRequest(`/workflows/${args.id}/run`, 'POST', {});
    case 'list_executions':
      return n8nRequest(`/executions${args.workflowId ? `?workflowId=${args.workflowId}` : ''}`);
    case 'get_execution':
      return n8nRequest(`/executions/${args.id}`);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ---- MCP HTTP Transport (Streamable HTTP / JSON-RPC over POST) ----
app.post('/mcp', async (req, res) => {
  const { jsonrpc, id, method, params } = req.body;

  try {
    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'n8n-mcp-bridge', version: '1.0.0' },
        },
      });
    }

    if (method === 'tools/list') {
      return res.json({ jsonrpc: '2.0', id, result: { tools } });
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      const result = await callTool(name, args || {});
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        },
      });
    }

    if (method === 'notifications/initialized') {
      return res.status(202).end();
    }

    return res.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  } catch (err) {
    return res.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32000, message: err.message },
    });
  }
});

app.get('/', (req, res) => {
  res.send('n8n MCP bridge is running.');
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`n8n MCP bridge listening on port ${PORT}`);
});
