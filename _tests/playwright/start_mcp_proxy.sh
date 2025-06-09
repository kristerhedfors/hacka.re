#!/bin/bash

# Script to start MCP stdio proxy for testing

set -e

PROXY_DIR="../../mcp-stdio-proxy"
PROXY_PID_FILE="/tmp/mcp-proxy-test.pid"
PROXY_LOG="/tmp/mcp-proxy-test.log"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if proxy is already running
if [ -f "$PROXY_PID_FILE" ]; then
    PID=$(cat "$PROXY_PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}MCP proxy already running (PID: $PID)${NC}"
        exit 0
    else
        rm "$PROXY_PID_FILE"
    fi
fi

# Check if proxy directory exists
if [ ! -d "$PROXY_DIR" ]; then
    echo -e "${RED}Error: MCP proxy directory not found at $PROXY_DIR${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "$PROXY_DIR/node_modules" ]; then
    echo -e "${YELLOW}Installing MCP proxy dependencies...${NC}"
    cd "$PROXY_DIR"
    npm install
    cd - > /dev/null
fi

# Start the proxy
echo -e "${GREEN}Starting MCP stdio proxy...${NC}"
cd "$PROXY_DIR"
nohup node server.js > "$PROXY_LOG" 2>&1 &
PROXY_PID=$!
echo $PROXY_PID > "$PROXY_PID_FILE"
cd - > /dev/null

# Wait for proxy to start
echo "Waiting for proxy to start..."
for i in {1..10}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}MCP proxy started successfully (PID: $PROXY_PID)${NC}"
        echo "Log file: $PROXY_LOG"
        exit 0
    fi
    sleep 1
done

# If we get here, proxy failed to start
echo -e "${RED}Failed to start MCP proxy${NC}"
echo "Last 20 lines of log:"
tail -n 20 "$PROXY_LOG"
kill $PROXY_PID 2>/dev/null || true
rm "$PROXY_PID_FILE"
exit 1