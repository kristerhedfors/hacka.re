#!/bin/bash
# Start MCP stdio proxy with Context7 server in one command
# Usage: ./start-with-context7.sh [port]

set -e

# Parse arguments
PORT="${1:-3001}"

echo "🚀 Starting MCP stdio proxy with Context7 documentation server"
echo "📚 Context7: Up-to-date docs for any library or framework"
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

# Start Context7 server
echo "📖 Starting Context7 MCP server..."
curl -X POST http://localhost:$PORT/mcp/start \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"context7\",
    \"command\": \"npx\",
    \"args\": [\"-y\", \"@upstash/context7-mcp@latest\"]
  }" \
  && echo "✅ Context7 server started successfully" \
  || (echo "❌ Failed to start Context7 server" && exit 1)

echo ""
echo "🎉 MCP setup complete!"
echo "📍 Proxy running on: http://localhost:$PORT"
echo "📚 Context7 server: Ready for documentation queries"
echo ""
echo "💡 In hacka.re:"
echo "   1. Open MCP Servers modal"
echo "   2. Set proxy URL to: http://localhost:$PORT"
echo "   3. Click 'Test Connection' - should show 1 server running"
echo "   4. Click 'Connect & Load Tools' on the Context7 server"
echo ""
echo "🔍 Context7 provides tools to:"
echo "   • Search documentation for any library (React, FastAPI, etc.)"
echo "   • Get latest code examples and tutorials"
echo "   • Access version-specific documentation"
echo ""
echo "💬 Example usage in hacka.re chat:"
echo "   'Search for FastAPI authentication examples'"
echo "   'Get the latest React hooks documentation'"
echo "   'Show me pandas DataFrame examples'"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep script running
wait $PROXY_PID