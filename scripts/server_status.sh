#!/bin/bash

# Server Status Script for hacka.re
# Check if the HTTP server is running and show detailed status

PROJECT_ROOT="/Users/user/dev/hacka.re"
SERVER_PORT=8000
PID_FILE="$PROJECT_ROOT/.server.pid"
LOG_FILE="$PROJECT_ROOT/.server.log"

echo "HTTP Server Status Check"
echo "========================"
echo "Port: $SERVER_PORT"
echo "PID file: $PID_FILE"
echo "Log file: $LOG_FILE"
echo ""

# Check PID file
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    echo "PID file exists: $PID"
    
    if kill -0 "$PID" 2>/dev/null; then
        echo "✅ Process is running (PID: $PID)"
    else
        echo "❌ PID file exists but process is not running"
    fi
else
    echo "❌ PID file does not exist"
fi

# Check port
if lsof -ti :$SERVER_PORT >/dev/null 2>&1; then
    PORT_PID=$(lsof -ti :$SERVER_PORT)
    echo "✅ Port $SERVER_PORT is in use by PID: $PORT_PID"
    
    # Get process details
    if ps -p "$PORT_PID" -o pid,ppid,command 2>/dev/null; then
        echo ""
        echo "Process details:"
        ps -p "$PORT_PID" -o pid,ppid,command | head -2
    fi
else
    echo "❌ Port $SERVER_PORT is not in use"
fi

# Check if we can connect
echo ""
echo "Connection test:"
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$SERVER_PORT" | grep -q "200\|301\|302"; then
    echo "✅ Server is responding to HTTP requests"
    echo "   URL: http://localhost:$SERVER_PORT"
else
    echo "❌ Server is not responding to HTTP requests"
fi

# Show recent log entries if available
if [ -f "$LOG_FILE" ]; then
    echo ""
    echo "Recent log entries (last 10 lines):"
    tail -10 "$LOG_FILE"
fi