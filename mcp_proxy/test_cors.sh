#!/bin/bash
# Quick CORS validation test for hacka.re with Hugging Face proxy

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=================================================="
echo "CORS Validation Test for hacka.re"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if proxy is running
if lsof -Pi :8014 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✓${NC} Proxy is already running on port 8014"
    PROXY_RUNNING=true
else
    echo -e "${YELLOW}⚠${NC} Starting proxy on port 8014..."
    cd "$PROJECT_ROOT"
    .venv/bin/python mcp_proxy/huggingface_proxy.py > /tmp/hf_proxy.log 2>&1 &
    PROXY_PID=$!
    echo "  Proxy PID: $PROXY_PID"

    # Wait for proxy to start
    echo "  Waiting for proxy to start..."
    for i in {1..10}; do
        if curl -s http://localhost:8014/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Proxy started successfully"
            PROXY_RUNNING=false
            break
        fi
        sleep 1
    done

    if ! curl -s http://localhost:8014/health > /dev/null 2>&1; then
        echo -e "${RED}✗${NC} Failed to start proxy"
        echo "Check logs at /tmp/hf_proxy.log"
        exit 1
    fi
fi

echo ""
echo "Running CORS validation tests..."
echo ""

# Run the validation script
cd "$PROJECT_ROOT"
.venv/bin/python validate_cors_hacka_re.py

TEST_RESULT=$?

# Clean up if we started the proxy
if [ "$PROXY_RUNNING" = false ]; then
    echo ""
    echo "Stopping proxy (PID: $PROXY_PID)..."
    kill $PROXY_PID 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✓${NC} Proxy stopped"
fi

echo ""
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}=================================================="
    echo "All tests passed! ✓"
    echo "==================================================${NC}"
else
    echo -e "${RED}=================================================="
    echo "Some tests failed! ✗"
    echo "==================================================${NC}"
fi

exit $TEST_RESULT
