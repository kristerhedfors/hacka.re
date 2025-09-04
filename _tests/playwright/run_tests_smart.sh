#!/bin/bash

# Smart Test Runner - Handles API key persistence and modal issues
# Runs tests with better error handling and retry logic for flaky tests

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Clear output file
> run_tests_smart.out

# Capture all output
exec > >(tee run_tests_smart.out) 2>&1

# Set up trap for interruptions
trap 'echo "Script interrupted at $(date)"' INT

# Change to script directory
cd "$(dirname "$0")"

# Check virtual environment
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    playwright install
else
    source .venv/bin/activate
fi

# Parse command line arguments
PYTEST_ARGS=""
BROWSER="chromium"
HEADLESS="--headed"
SKIP_SERVER="false"
RUN_MODE="all"  # all, core, feature, modal, sharing, mcp, function
MAX_RETRIES=2

while [[ $# -gt 0 ]]; do
    case $1 in
        --headless)
            HEADLESS=""
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
        --verbose|-v)
            PYTEST_ARGS="$PYTEST_ARGS -v"
            shift
            ;;
        --skip-server)
            SKIP_SERVER="true"
            shift
            ;;
        --mode)
            RUN_MODE="$2"
            shift 2
            ;;
        --max-retries)
            MAX_RETRIES="$2"
            shift 2
            ;;
        *)
            PYTEST_ARGS="$PYTEST_ARGS $1"
            shift
            ;;
    esac
done

# Start HTTP server if needed
if [ "$SKIP_SERVER" = "false" ]; then
    echo "Starting HTTP server..."
    ./start_server.sh
    trap './stop_server.sh' EXIT
fi

# Function to run a test with retry logic
run_test_with_retry() {
    local test_file="$1"
    local test_name="$2"
    local max_retries="$3"
    local retry_count=0
    local success=false
    
    while [ $retry_count -lt $max_retries ] && [ "$success" = false ]; do
        if [ $retry_count -gt 0 ]; then
            echo -e "${YELLOW}  Retry $retry_count/$max_retries for $test_name${NC}"
            # Clear browser cache between retries
            rm -rf ~/.cache/ms-playwright/
        fi
        
        # Run test with increased timeout for API key issues
        ../../_venv/bin/python -m pytest "$test_file" $PYTEST_ARGS --browser $BROWSER $HEADLESS \
            --timeout 15000 > "test_output_${test_name}.log" 2>&1
        
        if [ $? -eq 0 ]; then
            success=true
            echo -e "${GREEN}✅ $test_name: PASSED${NC}"
            return 0
        else
            # Check for specific issues
            if grep -q "api.*key\|API.*key" "test_output_${test_name}.log"; then
                echo -e "${YELLOW}  ⚠️  API key issue detected${NC}"
            fi
            if grep -q "TimeoutError.*modal" "test_output_${test_name}.log"; then
                echo -e "${YELLOW}  ⚠️  Modal timeout detected${NC}"
            fi
            retry_count=$((retry_count + 1))
        fi
    done
    
    if [ "$success" = false ]; then
        echo -e "${RED}❌ $test_name: FAILED after $max_retries attempts${NC}"
        return 1
    fi
}

echo -e "${BLUE}=========================================="
echo "Smart Test Runner"
echo "Mode: $RUN_MODE"
echo "Browser: $BROWSER"
echo "Max Retries: $MAX_RETRIES"
echo -e "==========================================${NC}"
echo ""

# Define test categories
declare -A TEST_CATEGORIES
TEST_CATEGORIES["core"]="test_page.py test_api.py test_chat.py test_welcome_modal.py"
TEST_CATEGORIES["modal"]="test_modals.py test_welcome_modal.py test_rag_modal.py test_share_modal.py test_function_modal.py test_api_key_modal.py"
TEST_CATEGORIES["sharing"]="test_sharing.py test_link_sharing.py test_share_modal.py test_theme_sharing.py test_function_library_sharing.py test_default_functions_sharing.py"
TEST_CATEGORIES["mcp"]="test_mcp*.py"
TEST_CATEGORIES["function"]="test_function*.py"
TEST_CATEGORIES["rag"]="test_rag*.py"

# Determine which tests to run
if [ "$RUN_MODE" = "all" ]; then
    TEST_FILES=$(find . -name "test_*.py" -type f | grep -v __pycache__ | grep -v test_utils.py | sort)
else
    if [ -z "${TEST_CATEGORIES[$RUN_MODE]}" ]; then
        echo -e "${RED}Invalid mode: $RUN_MODE${NC}"
        echo "Valid modes: all, core, modal, sharing, mcp, function, rag"
        exit 1
    fi
    TEST_FILES=""
    for pattern in ${TEST_CATEGORIES[$RUN_MODE]}; do
        TEST_FILES="$TEST_FILES $(find . -name "$pattern" -type f | grep -v __pycache__)"
    done
fi

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
FLAKY_TESTS=0

# Track test results
declare -A TEST_RESULTS
declare -A TEST_RETRIES

# Run tests
for TEST_FILE in $TEST_FILES; do
    if [ ! -f "$TEST_FILE" ]; then
        continue
    fi
    
    TEST_NAME=$(basename "$TEST_FILE" .py)
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "${BLUE}Testing: $TEST_NAME${NC}"
    
    # Run test with retry logic for flaky tests
    if run_test_with_retry "$TEST_FILE" "$TEST_NAME" "$MAX_RETRIES"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        TEST_RESULTS[$TEST_NAME]="PASSED"
        
        # Check if it needed retries
        if grep -q "Retry" "test_output_${TEST_NAME}.log" 2>/dev/null; then
            FLAKY_TESTS=$((FLAKY_TESTS + 1))
            TEST_RESULTS[$TEST_NAME]="FLAKY"
        fi
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS[$TEST_NAME]="FAILED"
    fi
    echo ""
done

# Generate detailed report
REPORT_FILE="test_report_$(date +%Y%m%d_%H%M%S).md"
echo "# Test Report - $(date)" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Summary" >> "$REPORT_FILE"
echo "- **Total Tests:** $TOTAL_TESTS" >> "$REPORT_FILE"
echo "- **Passed:** $PASSED_TESTS ($(( PASSED_TESTS * 100 / TOTAL_TESTS ))%)" >> "$REPORT_FILE"
echo "- **Failed:** $FAILED_TESTS ($(( FAILED_TESTS * 100 / TOTAL_TESTS ))%)" >> "$REPORT_FILE"
echo "- **Flaky:** $FLAKY_TESTS" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "## Test Results" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Group results by status
echo "### ✅ Passing Tests" >> "$REPORT_FILE"
for test in "${!TEST_RESULTS[@]}"; do
    if [ "${TEST_RESULTS[$test]}" = "PASSED" ]; then
        echo "- $test" >> "$REPORT_FILE"
    fi
done | sort >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "### ⚠️ Flaky Tests (passed with retry)" >> "$REPORT_FILE"
for test in "${!TEST_RESULTS[@]}"; do
    if [ "${TEST_RESULTS[$test]}" = "FLAKY" ]; then
        echo "- $test" >> "$REPORT_FILE"
    fi
done | sort >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "### ❌ Failed Tests" >> "$REPORT_FILE"
for test in "${!TEST_RESULTS[@]}"; do
    if [ "${TEST_RESULTS[$test]}" = "FAILED" ]; then
        echo "- $test" >> "$REPORT_FILE"
        # Add error snippet if available
        ERROR=$(grep -A 3 "FAILED\|ERROR" "test_output_${test}.log" 2>/dev/null | head -4)
        if [ ! -z "$ERROR" ]; then
            echo "  \`\`\`" >> "$REPORT_FILE"
            echo "$ERROR" | sed 's/^/  /' >> "$REPORT_FILE"
            echo "  \`\`\`" >> "$REPORT_FILE"
        fi
    fi
done | sort >> "$REPORT_FILE"

# Print summary
echo ""
echo -e "${BLUE}=========================================="
echo "Test Execution Complete"
echo -e "==========================================${NC}"
echo -e "Total: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC} ($(( PASSED_TESTS * 100 / TOTAL_TESTS ))%)"
echo -e "Failed: ${RED}$FAILED_TESTS${NC} ($(( FAILED_TESTS * 100 / TOTAL_TESTS ))%)"
if [ $FLAKY_TESTS -gt 0 ]; then
    echo -e "Flaky: ${YELLOW}$FLAKY_TESTS${NC} (passed with retry)"
fi
echo ""
echo "Report saved to: $REPORT_FILE"
echo "Individual logs: test_output_*.log"

# Generate bundle
./bundle_test_results.sh

deactivate