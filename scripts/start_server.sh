#!/bin/bash

# Start HTTP Server Script for hacka.re
# Reliable server startup with proper error handling and PID tracking

PROJECT_ROOT="/Users/user/dev/hacka.re"
SERVER_PORT=8000
PID_FILE="$PROJECT_ROOT/.server.pid"
LOG_FILE="$PROJECT_ROOT/.server.log"

# Change to project directory
cd "$PROJECT_ROOT" || {
    echo "Error: Cannot change to project directory: $PROJECT_ROOT"
    exit 1
}

# Check if server is already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Server is already running on port $SERVER_PORT (PID: $PID)"
        echo "Use ./scripts/stop_server.sh to stop it first"
        exit 1
    else
        # PID file exists but process is dead, clean it up
        rm -f "$PID_FILE"
    fi
fi

# Kill any existing process on the port
if lsof -ti :$SERVER_PORT >/dev/null 2>&1; then
    echo "Killing existing process on port $SERVER_PORT..."
    lsof -ti :$SERVER_PORT | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Start the server
echo "Starting HTTP server on port $SERVER_PORT..."
echo "Server root: $PROJECT_ROOT"
echo "Log file: $LOG_FILE"

# Start server in background and capture PID
python3 -m http.server $SERVER_PORT > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

# Save PID to file
echo "$SERVER_PID" > "$PID_FILE"

# Wait a moment to ensure server started
sleep 2

# Verify server is running
if kill -0 "$SERVER_PID" 2>/dev/null && lsof -ti :$SERVER_PORT >/dev/null 2>&1; then
    echo "✅ Server started successfully!"
    echo "   PID: $SERVER_PID"
    echo "   URL: http://localhost:$SERVER_PORT"
    echo "   PID file: $PID_FILE"
    echo "   Log file: $LOG_FILE"
else
    echo "❌ Failed to start server"
    rm -f "$PID_FILE"
    exit 1
fi