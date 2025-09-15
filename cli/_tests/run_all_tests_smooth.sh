#!/bin/bash

# Run all CLI tests smoothly in batches
# This script runs tests in an organized manner with clear output

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        CLI Test Suite - Full Run           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo

# Activate virtual environment
source .venv/bin/activate

# Keep track of results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Function to run a test file and capture results
run_test_file() {
    local test_file=$1
    local test_name=$2

    echo -e "${YELLOW}▶ Running: ${test_name}${NC}"

    # Run the test and capture output
    if output=$(python -m pytest "$test_file" -v --tb=short --json-report --json-report-file=temp_report.json 2>&1); then
        # Extract stats from JSON if available
        if [ -f temp_report.json ]; then
            local passed=$(python -c "import json; data=json.load(open('temp_report.json')); print(data['summary'].get('passed', 0))" 2>/dev/null || echo "0")
            local failed=$(python -c "import json; data=json.load(open('temp_report.json')); print(data['summary'].get('failed', 0))" 2>/dev/null || echo "0")
            local skipped=$(python -c "import json; data=json.load(open('temp_report.json')); print(data['summary'].get('skipped', 0))" 2>/dev/null || echo "0")
            local total=$(python -c "import json; data=json.load(open('temp_report.json')); print(data['summary'].get('total', 0))" 2>/dev/null || echo "0")

            TOTAL_TESTS=$((TOTAL_TESTS + total))
            PASSED_TESTS=$((PASSED_TESTS + passed))
            FAILED_TESTS=$((FAILED_TESTS + failed))
            SKIPPED_TESTS=$((SKIPPED_TESTS + skipped))

            if [ "$failed" -eq 0 ]; then
                echo -e "  ${GREEN}✓ Passed: $passed/$total tests${NC}"
            else
                echo -e "  ${RED}✗ Failed: $failed/$total tests${NC}"
            fi

            rm -f temp_report.json
        else
            echo -e "  ${GREEN}✓ Tests completed${NC}"
        fi
    else
        echo -e "  ${RED}✗ Test execution failed${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo
}

# Run tests in organized batches
echo -e "${BLUE}═══ Core Command Tests ═══${NC}"
echo

run_test_file "test_cli_browse_command.py" "Browse Command"
run_test_file "test_cli_serve_command.py" "Serve Command"
run_test_file "test_cli_chat_command.py" "Chat Command"

echo -e "${BLUE}═══ Configuration Tests ═══${NC}"
echo

run_test_file "test_cli_port_configuration.py" "Port Configuration"
run_test_file "test_cli_shared_links.py" "Shared Links"
run_test_file "test_cli_session_env_vars.py -k 'not browse_with_session and not serve_with_session and not chat_with_session'" "Session Environment Variables"

echo -e "${BLUE}═══ Infrastructure Tests ═══${NC}"
echo

run_test_file "test_cli_zip_serving.py" "ZIP Serving"

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Test Summary                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo

if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo -e "   Total: $TOTAL_TESTS tests"
    echo -e "   Passed: ${GREEN}$PASSED_TESTS${NC}"
    if [ "$SKIPPED_TESTS" -gt 0 ]; then
        echo -e "   Skipped: ${YELLOW}$SKIPPED_TESTS${NC}"
    fi
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo -e "   Total: $TOTAL_TESTS tests"
    echo -e "   Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "   Failed: ${RED}$FAILED_TESTS${NC}"
    if [ "$SKIPPED_TESTS" -gt 0 ]; then
        echo -e "   Skipped: ${YELLOW}$SKIPPED_TESTS${NC}"
    fi
    echo
    echo -e "${YELLOW}Run individual test files with -v for more details${NC}"
    exit 1
fi