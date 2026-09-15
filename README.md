---
title: n8n Host
emoji: 🔧
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# n8n self-hosted on Hugging Face Spaces

This Space runs n8n via Docker.

## Important setup steps after first deploy

1. Go to Space **Settings → Variables and secrets** and set:
   - `WEBHOOK_URL` = `https://<your-space-name>.hf.space/`
   - `N8N_EDITOR_BASE_URL` = same as above
   - (optional but recommended) `N8N_BASIC_AUTH_ACTIVE=true`, `N8N_BASIC_AUTH_USER`, `N8N_BASIC_AUTH_PASSWORD` — otherwise your n8n editor is open to anyone with the URL
   - (recommended) `N8N_ENCRYPTION_KEY` — set a fixed random string so credentials don't break on rebuild

2. Enable **persistent storage** in Space settings (Settings → Persistent storage) — without it, all workflows/credentials are wiped every time the Space rebuilds/sleeps.

3. Free Spaces sleep after inactivity — webhooks will be missed while asleep. Use a paid "always on" Space tier, or an external uptime pinger, for production Facebook webhook use.

4. Import your existing workflow (exported as JSON from n8n cloud) via the n8n editor: **Workflows → Import from File**.

5. Update the Facebook Developer Console Webhook callback URL to point to `https://<your-space-name>.hf.space/webhook/...` (production webhook path from the Webhook node).
