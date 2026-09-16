FROM n8nio/n8n:latest

USER root

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

# ---- MCP bridge + router (pure Node.js, no OS packages needed) ----
WORKDIR /bridge
COPY bridge/package.json .
RUN npm install --production
COPY bridge/server.js .
COPY bridge/router.js .
ENV PORT=7862
ENV ROUTER_PORT=7860

RUN chown -R node:node /bridge

COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 7860

USER node

CMD ["sh", "/start.sh"]
