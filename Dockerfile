FROM n8nio/n8n:latest

USER root

ENV PATH="/sbin:/usr/sbin:/bin:/usr/bin:$PATH"

# Install nginx (router) and supervisor (process manager)
RUN apk add --no-cache nginx supervisor

# ---- n8n config ----
ENV N8N_PORT=7861
ENV N8N_HOST=0.0.0.0
ENV N8N_PROTOCOL=https
ENV N8N_EDITOR_BASE_URL=""
ENV WEBHOOK_URL=""
ENV N8N_RUNNERS_ENABLED=true
ENV GENERIC_TIMEZONE=Asia/Dhaka
ENV N8N_USER_FOLDER=/data

RUN mkdir -p /data && chown -R node:node /data

# ---- MCP bridge ----
WORKDIR /bridge
COPY bridge/package.json .
RUN npm install --production
COPY bridge/server.js .
ENV PORT=7862

# ---- nginx router: routes / -> n8n (7861), /mcp -> bridge (7862) ----
COPY nginx.conf /etc/nginx/nginx.conf

# ---- supervisor: runs n8n, bridge, and nginx together ----
COPY supervisord.conf /etc/supervisord.conf

RUN chown -R node:node /bridge /etc/nginx || true
RUN mkdir -p /run/nginx

EXPOSE 7860

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
