---
title: n8n Host
emoji: 🔧
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# n8n self-hosted + MCP bridge (combined)

This Space runs n8n AND an MCP bridge in the same container, using a pure
Node.js router (no OS packages needed, avoids Alpine `apk` build issues):

- `https://<space>.hf.space/` → n8n (editor, webhooks, REST API) — unchanged
- `https://<space>.hf.space/mcp` → MCP bridge, so Claude can manage workflows

## Setup

1. Replace your existing Space files with these: `Dockerfile`, `start.sh`,
   `bridge/server.js`, `bridge/router.js`, `bridge/package.json`.
2. Go to Space **Settings → Variables and secrets** and make sure these are set
   (keep whatever you already had for n8n, and add the new one):
   - `WEBHOOK_URL` = `https://<your-space-name>.hf.space/`
   - `N8N_EDITOR_BASE_URL` = same as above
   - `N8N_ENCRYPTION_KEY` — keep your existing one (don't change, or credentials break)
   - `N8N_API_KEY` — your n8n API key (Settings → API inside n8n) — **new, required for the bridge**
3. Rebuild the Space (it will restart both n8n and the bridge).
4. Your MCP server URL for Claude is: `https://<your-space-name>.hf.space/mcp`

## Connecting to Claude

In Claude's Connectors settings, add a custom connector:
- **Name**: n8n
- **MCP server URL**: `https://<your-space-name>.hf.space/mcp`
- **Requires sign-in**: off

## Notes

- n8n's own data, workflows, and webhooks work exactly as before — nothing
  about your existing setup changes except the new `/mcp` route.
- Keep your Space URL and API key private — anyone with `/mcp` access and the
  key can create, edit, execute, and delete your workflows.
- If persistent storage is not enabled, workflows/credentials are still wiped
  on rebuild/sleep, same as before — this setup doesn't change that.
