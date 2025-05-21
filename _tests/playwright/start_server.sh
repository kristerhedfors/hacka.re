#!/bin/bash

# Script to start the Python HTTP server for hacka.re tests
# This script:
# 1. Kills any existing Python HTTP server processes on port 8000
# 2. Starts a new HTTP server in the project root directory

# Define variables
PORT=8000
PROJECT_ROOT="/Users/user/dev/hacka.re"

# Print header
echo "===== Starting HTTP Server for hacka.re Tests ====="
echo "Port: $PORT"
echo "Project Root: $PROJECT_ROOT"
echo "=================================================="

# Kill any existing Python HTTP server processes on port 8000
echo "Checking for existing HTTP server processes on port $PORT..."
EXISTING_PIDS=$(lsof -ti:$PORT)
if [ -n "$EXISTING_PIDS" ]; then
    echo "Found existing processes: $EXISTING_PIDS"
    echo "Killing existing processes..."
    kill -9 $EXISTING_PIDS
    echo "Processes killed."
else
    echo "No existing processes found on port $PORT."
fi

# Change to the project root directory
echo "Changing to project root directory: $PROJECT_ROOT"
cd $PROJECT_ROOT

# Start a new Python HTTP server in the background with output redirected
echo "Starting Python HTTP server on port $PORT..."
python -m http.server $PORT > /dev/null 2>&1 &
SERVER_PID=$!

# Check if server started successfully
sleep 1
if ps -p $SERVER_PID > /dev/null; then
    echo "Server started successfully with PID: $SERVER_PID"
    echo "Server is now running at http://localhost:$PORT"
else
    echo "Failed to start server."
    exit 1
fi

# Save the PID to a file for later cleanup
echo $SERVER_PID > "$PROJECT_ROOT/_tests/playwright/server_pid.txt"
echo "Server PID saved to: $PROJECT_ROOT/_tests/playwright/server_pid.txt"

echo "=================================================="
echo "Server is ready. You can now run your tests."
echo "To stop the server, run: kill -9 \$(cat $PROJECT_ROOT/_tests/playwright/server_pid.txt)"
echo "=================================================="
