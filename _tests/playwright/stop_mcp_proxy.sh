#!/bin/bash

# Script to stop MCP stdio proxy after testing

set -e

PROXY_PID_FILE="/tmp/mcp-proxy-test.pid"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if PID file exists
if [ ! -f "$PROXY_PID_FILE" ]; then
    echo -e "${YELLOW}MCP proxy not running (no PID file found)${NC}"
    exit 0
fi

# Get PID and check if process is running
PID=$(cat "$PROXY_PID_FILE")
if ! ps -p "$PID" > /dev/null 2>&1; then
    echo -e "${YELLOW}MCP proxy not running (process $PID not found)${NC}"
    rm "$PROXY_PID_FILE"
    exit 0
fi

# Stop the proxy
echo -e "${GREEN}Stopping MCP proxy (PID: $PID)...${NC}"
kill $PID

# Wait for process to stop
for i in {1..5}; do
    if ! ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${GREEN}MCP proxy stopped successfully${NC}"
        rm "$PROXY_PID_FILE"
        exit 0
    fi
    sleep 1
done

# Force kill if still running
echo -e "${YELLOW}Force killing MCP proxy...${NC}"
kill -9 $PID 2>/dev/null || true
rm "$PROXY_PID_FILE"

echo -e "${GREEN}MCP proxy stopped${NC}"