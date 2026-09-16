#!/bin/sh
set -e

echo "Starting n8n..."
node /usr/local/lib/node_modules/n8n/bin/n8n start &
N8N_PID=$!

echo "Starting MCP bridge..."
node /bridge/server.js &
BRIDGE_PID=$!

echo "Starting router..."
node /bridge/router.js &
ROUTER_PID=$!

# Wait for the first process to exit, then exit so the platform restarts the container
while true; do
  if ! kill -0 $N8N_PID 2>/dev/null; then
    echo "n8n exited"
    exit 1
  fi
  if ! kill -0 $BRIDGE_PID 2>/dev/null; then
    echo "bridge exited"
    exit 1
  fi
  if ! kill -0 $ROUTER_PID 2>/dev/null; then
    echo "router exited"
    exit 1
  fi
  sleep 5
done
