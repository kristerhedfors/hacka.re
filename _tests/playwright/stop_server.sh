#!/bin/bash

# Script to stop the Python HTTP server for hacka.re tests

# Define variables
PROJECT_ROOT="/Users/user/dev/hacka.re"
PID_FILE="$PROJECT_ROOT/_tests/playwright/server_pid.txt"

# Print header
echo "===== Stopping HTTP Server for hacka.re Tests ====="

# Check if PID file exists
if [ -f "$PID_FILE" ]; then
    # Read the PID from the file
    SERVER_PID=$(cat "$PID_FILE")
    
    # Check if the process is still running
    if ps -p $SERVER_PID > /dev/null; then
        echo "Found server process with PID: $SERVER_PID"
        echo "Stopping server..."
        kill -9 $SERVER_PID
        echo "Server stopped."
    else
        echo "Server process with PID $SERVER_PID is not running."
    fi
    
    # Remove the PID file
    rm "$PID_FILE"
    echo "Removed PID file: $PID_FILE"
else
    echo "PID file not found: $PID_FILE"
    
    # Try to find and kill any Python HTTP server processes on port 8000
    echo "Checking for any HTTP server processes on port 8000..."
    EXISTING_PIDS=$(lsof -ti:8000)
    if [ -n "$EXISTING_PIDS" ]; then
        echo "Found existing processes: $EXISTING_PIDS"
        echo "Killing existing processes..."
        kill -9 $EXISTING_PIDS
        echo "Processes killed."
    else
        echo "No existing processes found on port 8000."
    fi
fi

echo "=================================================="
