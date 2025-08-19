#!/bin/bash

# Shodan MCP Server Test Suite Runner
# ====================================
# Executes comprehensive Shodan API tests with real API calls
# Tests explore read-only operations and information enrichment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"
TEST_DIR="$(dirname "$SCRIPT_DIR")"

# Configuration
DEFAULT_PORT=8000
PORT=${PORT:-$DEFAULT_PORT}
SERVER_PID=""
TEST_RESULTS_FILE="shodan_test_results.txt"
VENV_PATH="$PROJECT_ROOT/_venv"

# Parse command line arguments
HEADLESS="--headed"  # Default to headed for debugging
BROWSER="chromium"
VERBOSE=""
TEST_FILTER=""
SKIP_SERVER=false
SPECIFIC_TEST=""
TEST_TIMEOUT="60000"
PARALLEL=false
SHOW_HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --headless)
            HEADLESS="--headless"
            shift
            ;;
        --headed)
            HEADLESS="--headed"
            shift
            ;;
        --firefox)
            BROWSER="firefox"
            shift
            ;;
        --webkit)
            BROWSER="webkit"
            shift
            ;;
        -v|--verbose)
            VERBOSE="-v"
            shift
            ;;
        -k|--filter)
            TEST_FILTER="$2"
            shift 2
            ;;
        --skip-server)
            SKIP_SERVER=true
            shift
            ;;
        --test)
            SPECIFIC_TEST="$2"
            shift 2
            ;;
        --timeout)
            TEST_TIMEOUT="$2"
            shift 2
            ;;
        --parallel|-n)
            PARALLEL=true
            shift
            ;;
        -h|--help)
            SHOW_HELP=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            SHOW_HELP=true
            shift
            ;;
    esac
done

# Show help if requested
if [ "$SHOW_HELP" = true ]; then
    echo "Shodan MCP Test Suite Runner"
    echo "============================"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --headless        Run tests in headless mode (default: headed)"
    echo "  --headed          Run tests with visible browser"
    echo "  --firefox         Use Firefox browser"
    echo "  --webkit          Use WebKit browser"
    echo "  -v, --verbose     Verbose output"
    echo "  -k, --filter STR  Filter tests by keyword"
    echo "  --skip-server     Don't start/stop HTTP server"
    echo "  --test FILE       Run specific test file"
    echo "  --timeout MS      Set test timeout in milliseconds (default: 60000)"
    echo "  --parallel, -n    Run tests in parallel"
    echo "  -h, --help        Show this help message"
    echo ""
    echo "Test Categories:"
    echo "  Search APIs    - Host info, search queries, facets"
    echo "  DNS APIs       - Domain info, resolution, reverse DNS"
    echo "  Account APIs   - Profile, API info, utility methods"
    echo "  Enrichment     - Multi-step information enrichment workflows"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run all tests headed"
    echo "  $0 --headless                         # Run all tests headless"
    echo "  $0 -k search                          # Run only search tests"
    echo "  $0 -k dns --verbose                   # Run DNS tests with verbose output"
    echo "  $0 --test test_shodan_search_apis.py  # Run specific test file"
    echo "  $0 --parallel                         # Run tests in parallel"
    echo ""
    exit 0
fi

# Cleanup function
cleanup() {
    if [ ! -z "$SERVER_PID" ] && [ "$SKIP_SERVER" = false ]; then
        echo -e "\n${YELLOW}Stopping HTTP server...${NC}"
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
}

# Set up trap for cleanup
trap cleanup EXIT

# Change to test directory
cd "$TEST_DIR"

# Check for virtual environment
if [ ! -d "$VENV_PATH" ]; then
    echo -e "${YELLOW}Virtual environment not found. Running setup...${NC}"
    cd "$PROJECT_ROOT"
    ./setup_environment.sh
    cd "$TEST_DIR"
fi

# Activate virtual environment
echo -e "${BLUE}Activating virtual environment...${NC}"
source "$VENV_PATH/bin/activate"

# Check for Shodan API key
if [ -z "$SHODAN_API_KEY" ]; then
    # Try to load from .env file
    if [ -f "$TEST_DIR/.env" ]; then
        export $(grep -E '^SHODAN_API_KEY=' "$TEST_DIR/.env" | xargs)
    fi
    
    if [ -z "$SHODAN_API_KEY" ]; then
        echo -e "${RED}Error: SHODAN_API_KEY not set${NC}"
        echo "Please set SHODAN_API_KEY environment variable or add it to $TEST_DIR/.env"
        exit 1
    fi
fi

# Start HTTP server if needed
if [ "$SKIP_SERVER" = false ]; then
    echo -e "${BLUE}Starting HTTP server on port $PORT...${NC}"
    cd "$PROJECT_ROOT"
    python -m http.server $PORT > /dev/null 2>&1 &
    SERVER_PID=$!
    cd "$TEST_DIR"
    
    # Wait for server to start
    sleep 2
    
    # Check if server is running
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo -e "${RED}Failed to start HTTP server${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}HTTP server started (PID: $SERVER_PID)${NC}"
fi

# Build pytest command
PYTEST_CMD="python -m pytest"
PYTEST_CMD="$PYTEST_CMD --browser=$BROWSER"
PYTEST_CMD="$PYTEST_CMD $HEADLESS"
PYTEST_CMD="$PYTEST_CMD --timeout=$TEST_TIMEOUT"

if [ ! -z "$VERBOSE" ]; then
    PYTEST_CMD="$PYTEST_CMD $VERBOSE"
fi

if [ "$PARALLEL" = true ]; then
    PYTEST_CMD="$PYTEST_CMD -n auto"
fi

if [ ! -z "$TEST_FILTER" ]; then
    PYTEST_CMD="$PYTEST_CMD -k \"$TEST_FILTER\""
fi

# Add test path
if [ ! -z "$SPECIFIC_TEST" ]; then
    PYTEST_CMD="$PYTEST_CMD shodan/$SPECIFIC_TEST"
else
    PYTEST_CMD="$PYTEST_CMD shodan/"
fi

# Add output options
PYTEST_CMD="$PYTEST_CMD --tb=short --capture=no"

# Display test configuration
echo -e "\n${BLUE}===== Shodan MCP Test Configuration =====${NC}"
echo -e "Browser:     $BROWSER"
echo -e "Mode:        $([ "$HEADLESS" = "--headless" ] && echo "Headless" || echo "Headed")"
echo -e "Timeout:     ${TEST_TIMEOUT}ms"
echo -e "Parallel:    $([ "$PARALLEL" = true ] && echo "Yes" || echo "No")"
if [ ! -z "$TEST_FILTER" ]; then
    echo -e "Filter:      $TEST_FILTER"
fi
if [ ! -z "$SPECIFIC_TEST" ]; then
    echo -e "Test File:   $SPECIFIC_TEST"
fi
echo -e "API Key:     $([ ! -z "$SHODAN_API_KEY" ] && echo "Configured" || echo "Not set")"
echo -e "${BLUE}=========================================${NC}\n"

# Run tests
echo -e "${BLUE}Running Shodan MCP tests...${NC}"
echo -e "${YELLOW}Command: $PYTEST_CMD${NC}\n"

# Execute tests and capture result
set +e
eval $PYTEST_CMD 2>&1 | tee "$TEST_RESULTS_FILE"
TEST_EXIT_CODE=${PIPESTATUS[0]}
set -e

# Display summary
echo -e "\n${BLUE}===== Test Summary =====${NC}"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All Shodan tests passed!${NC}"
    
    # Count test statistics
    TOTAL_TESTS=$(grep -c "PASSED\|FAILED\|SKIPPED" "$TEST_RESULTS_FILE" 2>/dev/null || echo "0")
    PASSED_TESTS=$(grep -c "PASSED" "$TEST_RESULTS_FILE" 2>/dev/null || echo "0")
    FAILED_TESTS=$(grep -c "FAILED" "$TEST_RESULTS_FILE" 2>/dev/null || echo "0")
    SKIPPED_TESTS=$(grep -c "SKIPPED" "$TEST_RESULTS_FILE" 2>/dev/null || echo "0")
    
    echo -e "Total:   $TOTAL_TESTS"
    echo -e "Passed:  ${GREEN}$PASSED_TESTS${NC}"
    if [ "$FAILED_TESTS" -gt 0 ]; then
        echo -e "Failed:  ${RED}$FAILED_TESTS${NC}"
    fi
    if [ "$SKIPPED_TESTS" -gt 0 ]; then
        echo -e "Skipped: ${YELLOW}$SKIPPED_TESTS${NC}"
    fi
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo -e "Exit code: $TEST_EXIT_CODE"
    
    # Show failed test names
    echo -e "\n${RED}Failed tests:${NC}"
    grep "FAILED" "$TEST_RESULTS_FILE" | head -10 || true
fi

echo -e "${BLUE}========================${NC}"

# Generate markdown report if tests completed
if [ -f "$TEST_RESULTS_FILE" ]; then
    echo -e "\n${BLUE}Generating test report...${NC}"
    
    # Create markdown report
    cat > shodan_test_report.md << EOF
# Shodan MCP Test Report

## Configuration
- **Browser**: $BROWSER
- **Mode**: $([ "$HEADLESS" = "--headless" ] && echo "Headless" || echo "Headed")
- **Timeout**: ${TEST_TIMEOUT}ms
- **Date**: $(date)

## Test Results
\`\`\`
$(tail -20 "$TEST_RESULTS_FILE")
\`\`\`

## Test Categories Covered
- **Search APIs**: Host information, search queries, facets, filters
- **DNS APIs**: Domain info, DNS resolution, reverse DNS
- **Account APIs**: Profile, API info, rate limits
- **Enrichment Workflows**: Multi-step information gathering

EOF
    
    echo -e "${GREEN}Report saved to: shodan_test_report.md${NC}"
fi

# Cleanup is handled by trap
exit $TEST_EXIT_CODE