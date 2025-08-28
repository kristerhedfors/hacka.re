#!/bin/bash

# Stop HTTP Server Script for hacka.re
# Reliable server shutdown with proper cleanup

PROJECT_ROOT="/Users/user/dev/hacka.re"
SERVER_PORT=8000
PID_FILE="$PROJECT_ROOT/.server.pid"
LOG_FILE="$PROJECT_ROOT/.server.log"

echo "Stopping HTTP server..."

# Method 1: Stop using PID file
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Stopping server with PID: $PID"
        kill "$PID" 2>/dev/null
        
        # Wait for graceful shutdown
        for i in {1..10}; do
            if ! kill -0 "$PID" 2>/dev/null; then
                echo "✅ Server stopped gracefully"
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if kill -0 "$PID" 2>/dev/null; then
            echo "Force killing server..."
            kill -9 "$PID" 2>/dev/null
        fi
    fi
    
    # Clean up PID file
    rm -f "$PID_FILE"
fi

# Method 2: Kill any process on the port (backup)
if lsof -ti :$SERVER_PORT >/dev/null 2>&1; then
    echo "Found process on port $SERVER_PORT, killing it..."
    lsof -ti :$SERVER_PORT | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Verify server is stopped
if lsof -ti :$SERVER_PORT >/dev/null 2>&1; then
    echo "❌ Failed to stop server on port $SERVER_PORT"
    exit 1
else
    echo "✅ Server stopped successfully"
    
    # Clean up files
    rm -f "$PID_FILE"
    if [ -f "$LOG_FILE" ]; then
        echo "Log file preserved at: $LOG_FILE"
    fi
fi