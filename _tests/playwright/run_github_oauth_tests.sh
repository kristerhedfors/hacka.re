#!/bin/bash

# GitHub MCP OAuth Integration Test Runner
# Runs comprehensive tests for GitHub OAuth device flow integration

set -e

echo "🔧 GitHub MCP OAuth Integration Tests"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$TEST_DIR/../.." && pwd)"
SERVER_PORT=8000
SERVER_PID=""

# Default options
HEADLESS=true
VERBOSE=false
SKIP_SERVER=false
BROWSER="chromium"
SPECIFIC_TEST=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --headed)
            HEADLESS=false
            shift
            ;;
        --headless)
            HEADLESS=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --skip-server)
            SKIP_SERVER=true
            shift
            ;;
        --browser)
            BROWSER="$2"
            shift 2
            ;;
        --test|-t)
            SPECIFIC_TEST="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --headed          Run tests in headed mode (visible browser)"
            echo "  --headless        Run tests in headless mode (default)"
            echo "  --verbose, -v     Enable verbose output"
            echo "  --skip-server     Skip starting HTTP server (if already running)"
            echo "  --browser BROWSER Browser to use (chromium, firefox, webkit)"
            echo "  --test TEST, -t   Run specific test method"
            echo "  --help, -h        Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Run all tests headless"
            echo "  $0 --headed --verbose                # Run with visible browser and verbose output"
            echo "  $0 --test test_github_device_flow_initiation  # Run specific test"
            echo "  $0 --browser firefox --headed        # Use Firefox in headed mode"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Function to start HTTP server
start_server() {
    if [ "$SKIP_SERVER" = true ]; then
        echo -e "${YELLOW}⚠️  Skipping server startup (--skip-server flag)${NC}"
        return
    fi

    echo -e "${BLUE}🚀 Starting HTTP server on port $SERVER_PORT...${NC}"
    cd "$PROJECT_ROOT"
    
    # Kill any existing server on the port
    pkill -f "python.*-m.*http.server.*$SERVER_PORT" 2>/dev/null || true
    
    # Start new server
    python3 -m http.server $SERVER_PORT > /dev/null 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 2
    
    if curl -s "http://localhost:$SERVER_PORT" > /dev/null; then
        echo -e "${GREEN}✅ Server started successfully (PID: $SERVER_PID)${NC}"
    else
        echo -e "${RED}❌ Failed to start server${NC}"
        exit 1
    fi
}

# Function to stop HTTP server
stop_server() {
    if [ -n "$SERVER_PID" ]; then
        echo -e "${BLUE}🛑 Stopping HTTP server (PID: $SERVER_PID)...${NC}"
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
}

# Function to check environment
check_environment() {
    echo -e "${BLUE}🔍 Checking test environment...${NC}"
    
    # Check if we're in the right directory
    if [ ! -f "$PROJECT_ROOT/index.html" ]; then
        echo -e "${RED}❌ Not in hacka.re project directory${NC}"
        exit 1
    fi
    
    # Check if pytest is available
    if ! command -v pytest &> /dev/null; then
        echo -e "${RED}❌ pytest not found. Please install with: pip install pytest playwright${NC}"
        exit 1
    fi
    
    # Check if playwright is installed
    if ! python3 -c "import playwright" 2>/dev/null; then
        echo -e "${RED}❌ Playwright not found. Please install with: pip install playwright && playwright install${NC}"
        exit 1
    fi
    
    # Check if browsers are installed
    if ! python3 -c "from playwright.sync_api import sync_playwright; sync_playwright().start().chromium.launch()" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Chromium not installed. Installing browsers...${NC}"
        playwright install
    fi
    
    echo -e "${GREEN}✅ Environment check passed${NC}"
}

# Function to run tests
run_tests() {
    echo -e "${BLUE}🧪 Running GitHub OAuth tests...${NC}"
    
    cd "$TEST_DIR"
    
    # Build pytest command
    PYTEST_ARGS=("test_github_mcp_oauth.py")
    
    if [ "$VERBOSE" = true ]; then
        PYTEST_ARGS+=("-v" "-s")
    fi
    
    if [ -n "$SPECIFIC_TEST" ]; then
        PYTEST_ARGS+=("-k" "$SPECIFIC_TEST")
    fi
    
    # Browser configuration is handled in conftest.py
    
    # Set base URL
    export PLAYWRIGHT_BASE_URL="http://localhost:$SERVER_PORT"
    
    echo -e "${BLUE}Running: pytest ${PYTEST_ARGS[*]}${NC}"
    
    # Run the tests
    if pytest "${PYTEST_ARGS[@]}"; then
        echo -e "${GREEN}✅ All GitHub OAuth tests passed!${NC}"
        return 0
    else
        echo -e "${RED}❌ Some GitHub OAuth tests failed${NC}"
        return 1
    fi
}

# Function to generate test report
generate_report() {
    echo -e "${BLUE}📊 Generating test report...${NC}"
    
    REPORT_DIR="$TEST_DIR/test-results"
    mkdir -p "$REPORT_DIR"
    
    # Count screenshot files
    SCREENSHOT_COUNT=$(find "$REPORT_DIR" -name "*.png" 2>/dev/null | wc -l)
    
    echo -e "${GREEN}📈 Test Results Summary${NC}"
    echo "===================="
    echo "Screenshots captured: $SCREENSHOT_COUNT"
    echo "Results directory: $REPORT_DIR"
    
    if [ $SCREENSHOT_COUNT -gt 0 ]; then
        echo ""
        echo "Screenshot files:"
        find "$REPORT_DIR" -name "*.png" -exec basename {} \; | sort
    fi
}

# Cleanup function
cleanup() {
    echo -e "${BLUE}🧹 Cleaning up...${NC}"
    stop_server
}

# Set up trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    echo -e "${GREEN}🚀 Starting GitHub MCP OAuth Integration Tests${NC}"
    echo "=============================================="
    echo "Configuration:"
    echo "  Headless: $HEADLESS"
    echo "  Verbose: $VERBOSE"
    echo "  Browser: $BROWSER"
    echo "  Server Port: $SERVER_PORT"
    if [ -n "$SPECIFIC_TEST" ]; then
        echo "  Specific Test: $SPECIFIC_TEST"
    fi
    echo ""
    
    check_environment
    start_server
    
    if run_tests; then
        echo -e "${GREEN}🎉 GitHub OAuth integration tests completed successfully!${NC}"
        EXIT_CODE=0
    else
        echo -e "${RED}💥 GitHub OAuth integration tests failed!${NC}"
        EXIT_CODE=1
    fi
    
    generate_report
    
    echo ""
    echo -e "${BLUE}🔗 Useful Commands:${NC}"
    echo "  View screenshots: ls -la $TEST_DIR/test-results/"
    echo "  Re-run tests: $0"
    echo "  Run specific test: $0 --test test_github_device_flow_initiation"
    echo "  Run in headed mode: $0 --headed"
    
    exit $EXIT_CODE
}

# Run main function
main "$@"