#!/bin/bash
# Start MCP stdio proxy with memory server in one command
# Usage: ./start-with-memory.sh [port]

set -e

# Parse arguments
PORT="${1:-3001}"

echo "🚀 Starting MCP stdio proxy with memory server"
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

# Start memory server
echo "🧠 Starting memory MCP server..."
curl -X POST http://localhost:$PORT/mcp/start \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"memory\",
    \"command\": \"npx\",
    \"args\": [\"-y\", \"@modelcontextprotocol/server-memory\"]
  }" \
  && echo "✅ Memory server started successfully" \
  || (echo "❌ Failed to start memory server" && exit 1)

echo ""
echo "🎉 MCP setup complete!"
echo "📍 Proxy running on: http://localhost:$PORT"
echo "🧠 Memory server connected"
echo ""
echo "💡 In hacka.re:"
echo "   1. Open MCP Servers modal"
echo "   2. Set proxy URL to: http://localhost:$PORT"
echo "   3. Click 'Test Connection' - should show 1 server running"
echo "   4. Click 'Connect & Load Tools' on the memory server"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep script running
wait $PROXY_PID