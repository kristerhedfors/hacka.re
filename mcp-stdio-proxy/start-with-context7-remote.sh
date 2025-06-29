#!/bin/bash
# Start MCP stdio proxy and connect to remote Context7 server
# Usage: ./start-with-context7-remote.sh [port]

set -e

# Parse arguments
PORT="${1:-3001}"

echo "🚀 Starting MCP stdio proxy with remote Context7 server"
echo "📚 Context7: Up-to-date docs via remote MCP server"
echo "🔌 Port: $PORT"

# Start proxy in background
echo "Starting proxy on port $PORT..."
node server.js $PORT --debug &
PROXY_PID=$!

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping services..."
    kill $PROXY_PID 2>/dev/null || true
    wait $PROXY_PID 2>/dev/null || true
    echo "✅ Cleanup complete"
}

# Set up signal handlers
trap cleanup EXIT INT TERM

# Wait for proxy to be ready
echo "⏳ Waiting for proxy to start..."
for i in {1..10}; do
    if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
        echo "✅ Proxy is ready"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "❌ Proxy failed to start"
        exit 1
    fi
    sleep 1
done

echo ""
echo "🎉 MCP proxy ready!"
echo "📍 Proxy running on: http://localhost:$PORT"
echo ""
echo "💡 In hacka.re:"
echo "   1. Open MCP Servers modal"
echo "   2. Set proxy URL to: http://localhost:$PORT"
echo "   3. Add remote Context7 server:"
echo "      - Name: context7-remote"
echo "      - Transport: SSE"
echo "      - URL: https://mcp.context7.com/mcp"
echo "   4. Click 'Connect & Load Tools' on the Context7 remote server"
echo ""
echo "🔍 This connects to the official Context7 remote server"
echo "📚 Should provide tools: resolve-library-id, get-library-docs"
echo ""
echo "Press Ctrl+C to stop proxy"

# Keep script running
wait $PROXY_PID