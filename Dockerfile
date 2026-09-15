FROM n8nio/n8n:latest

USER root

# HF Spaces requires the app to listen on port 7860
ENV N8N_PORT=7860
ENV N8N_HOST=0.0.0.0
ENV N8N_PROTOCOL=https
ENV N8N_EDITOR_BASE_URL=""
ENV WEBHOOK_URL=""
ENV N8N_RUNNERS_ENABLED=true
ENV GENERIC_TIMEZONE=Asia/Dhaka
ENV N8N_USER_FOLDER=/data

RUN mkdir -p /data && chown -R node:node /data

USER node

EXPOSE 7860

# Bypass any entrypoint/PATH resolution issues on HF Spaces by calling
# the n8n cli.js directly through node.
ENTRYPOINT []
CMD ["node", "/usr/local/lib/node_modules/n8n/bin/n8n", "start"]
