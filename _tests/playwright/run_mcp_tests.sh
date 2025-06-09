#!/bin/bash

# Script to run MCP-specific tests
# This includes both unit tests (mocked) and integration tests (real servers)

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Running MCP Tests${NC}"
echo "================================"

# Check if we're in the correct directory
if [ ! -f "conftest.py" ]; then
    echo -e "${RED}Error: Must be run from _tests/playwright directory${NC}"
    exit 1
fi

# Parse command line arguments
HEADLESS=""
VERBOSE=""
SKIP_SERVER=false
TEST_TYPE="all"

while [[ $# -gt 0 ]]; do
    case $1 in
        --headless)
            HEADLESS="--headed=false"
            shift
            ;;
        --verbose)
            VERBOSE="-v"
            shift
            ;;
        --skip-server)
            SKIP_SERVER=true
            shift
            ;;
        --unit)
            TEST_TYPE="unit"
            shift
            ;;
        --integration)
            TEST_TYPE="integration"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--headless] [--verbose] [--skip-server] [--unit|--integration]"
            exit 1
            ;;
    esac
done

# Function to check if MCP proxy is installed
check_mcp_proxy() {
    if [ ! -f "../../mcp-stdio-proxy/server.js" ]; then
        echo -e "${YELLOW}Warning: MCP stdio proxy not found${NC}"
        echo "Installing MCP proxy dependencies..."
        cd ../../mcp-stdio-proxy
        npm install
        cd - > /dev/null
    fi
}

# Function to check if filesystem server is available
check_filesystem_server() {
    if ! npx --version > /dev/null 2>&1; then
        echo -e "${RED}Error: npx not found. Please install Node.js${NC}"
        exit 1
    fi
    
    echo "Checking @modelcontextprotocol/server-filesystem availability..."
    npx -y @modelcontextprotocol/server-filesystem --help > /dev/null 2>&1 || true
}

# Start HTTP server if needed
if [ "$SKIP_SERVER" = false ]; then
    ./start_server.sh
fi

# Prepare for MCP tests
echo -e "\n${GREEN}Preparing MCP test environment...${NC}"
check_mcp_proxy
check_filesystem_server

# Create screenshots directory if it doesn't exist
mkdir -p screenshots

# Run the appropriate tests
echo -e "\n${GREEN}Running MCP tests...${NC}"

if [ "$TEST_TYPE" = "unit" ] || [ "$TEST_TYPE" = "all" ]; then
    echo -e "\n${YELLOW}Running MCP Unit Tests (mocked)...${NC}"
    pytest test_mcp_unit.py test_mcp_simple.py test_mcp_reconnection.py $VERBOSE $HEADLESS
fi

if [ "$TEST_TYPE" = "integration" ] || [ "$TEST_TYPE" = "all" ]; then
    echo -e "\n${YELLOW}Running MCP Integration Tests (real servers)...${NC}"
    # Integration tests require more setup time
    pytest test_mcp_integration.py test_mcp_integration_simple.py $VERBOSE $HEADLESS
fi

# Stop HTTP server if we started it
if [ "$SKIP_SERVER" = false ]; then
    ./stop_server.sh
fi

echo -e "\n${GREEN}MCP tests completed!${NC}"
echo -e "Screenshots saved in: $(pwd)/screenshots/"

# Check if any tests failed
if [ $? -eq 0 ]; then
    echo -e "${GREEN}All MCP tests passed!${NC}"
else
    echo -e "${RED}Some MCP tests failed${NC}"
    exit 1
fi