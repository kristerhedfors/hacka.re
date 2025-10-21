#!/bin/bash
# Test script for Hugging Face MCP Proxy

echo "🧪 Testing Hugging Face MCP Proxy"
echo "================================="
echo ""

# Check if proxy is running
echo "1️⃣ Checking if proxy is running on localhost:8014..."
if curl -s -f http://localhost:8014/health > /dev/null 2>&1; then
    echo "   ✅ Proxy is running"
    curl -s http://localhost:8014/health | python3 -m json.tool
else
    echo "   ❌ Proxy is not running"
    echo "   Start it with: python mcp_proxy/huggingface_proxy.py"
    exit 1
fi

echo ""
echo "2️⃣ Testing MCP endpoint..."
echo "   Sending MCP initialize request..."

# Test MCP endpoint
response=$(curl -s -X POST http://localhost:8014/mcp?login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0"}
    },
    "id": 1
  }' -w "\nHTTP Status: %{http_code}\n")

echo "$response"

if echo "$response" | grep -q "HTTP Status: 200"; then
    echo "   ✅ MCP endpoint responding"
elif echo "$response" | grep -q "HTTP Status: 401\|HTTP Status: 403"; then
    echo "   ⚠️  Authentication required (expected for HF MCP)"
    echo "   This is normal - HF MCP requires login"
else
    echo "   ❌ Unexpected response"
fi

echo ""
echo "✨ Proxy test complete!"
echo ""
echo "Next steps:"
echo "  1. Make sure you're logged into huggingface.co in your browser"
echo "  2. Open hacka.re and try connecting to Hugging Face MCP"
echo "  3. The connection will use this proxy automatically"
