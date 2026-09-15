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
ENV PATH="/usr/local/bin:${PATH}"

# Persistent-ish data dir inside the space (note: free HF Spaces storage
# is NOT guaranteed persistent across rebuilds unless persistent storage
# is enabled on the Space settings)
RUN mkdir -p /data && chown -R node:node /data

USER node

EXPOSE 7860

# Use the base image's own entrypoint (tini + n8n) instead of overriding it,
# since HF Spaces was failing to resolve "n8n" as a bare command.
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]
CMD ["n8n", "start"]
