#!/bin/bash

# Test Audit Script - Identifies and categorizes all tests as passing or failing
# This script runs each test individually to identify failures and organizes them
# into a clear directory structure for better visibility

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to the script directory
cd "$(dirname "$0")"

# Create directories for organization
mkdir -p test_status/passing
mkdir -p test_status/failing
mkdir -p test_status/timeout
mkdir -p test_status/reports

# Clear previous status files
rm -f test_status/passing/*.txt
rm -f test_status/failing/*.txt
rm -f test_status/timeout/*.txt

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Virtual environment not found. Creating one..."
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    playwright install
else
    source .venv/bin/activate
fi

# Start the HTTP server
echo "Starting HTTP server for tests..."
./start_server.sh

# Set up trap to stop the server on exit
trap './stop_server.sh' EXIT

# Initialize counters
TOTAL=0
PASSING=0
FAILING=0
TIMEOUT=0

# Create summary report
REPORT_FILE="test_status/reports/test_audit_$(date +%Y%m%d_%H%M%S).md"
echo "# Test Audit Report - $(date)" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Summary" >> "$REPORT_FILE"

# Find all test files (only in current directory, exclude venv and utils)
TEST_FILES=$(find . -maxdepth 1 -name "test_*.py" -type f | grep -v test_utils.py | sort)

echo -e "${YELLOW}Starting test audit...${NC}"
echo "This will run each test file individually to identify failures."
echo ""

# Run each test file individually
for TEST_FILE in $TEST_FILES; do
    TEST_NAME=$(basename "$TEST_FILE" .py)
    TOTAL=$((TOTAL + 1))
    
    echo -n "Testing $TEST_NAME... "
    
    # Run test (without timeout for macOS compatibility)
    python -m pytest "$TEST_FILE" --browser chromium --headed --tb=short > "test_status/${TEST_NAME}_output.log" 2>&1
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}PASS${NC}"
        PASSING=$((PASSING + 1))
        echo "$TEST_FILE" > "test_status/passing/${TEST_NAME}.txt"
        echo "- ✅ **$TEST_NAME**: PASSING" >> "$REPORT_FILE"
    # Note: timeout detection removed for macOS compatibility
    else
        echo -e "${RED}FAIL${NC}"
        FAILING=$((FAILING + 1))
        echo "$TEST_FILE" > "test_status/failing/${TEST_NAME}.txt"
        echo "- ❌ **$TEST_NAME**: FAILING" >> "$REPORT_FILE"
        
        # Extract error details from log
        ERROR_DETAIL=$(grep -A 5 "FAILED\|ERROR\|AssertionError" "test_status/${TEST_NAME}_output.log" | head -10 | sed 's/^/    /')
        if [ ! -z "$ERROR_DETAIL" ]; then
            echo "    <details>" >> "$REPORT_FILE"
            echo "    <summary>Error details</summary>" >> "$REPORT_FILE"
            echo "" >> "$REPORT_FILE"
            echo '    ```' >> "$REPORT_FILE"
            echo "$ERROR_DETAIL" >> "$REPORT_FILE"
            echo '    ```' >> "$REPORT_FILE"
            echo "    </details>" >> "$REPORT_FILE"
        fi
    fi
done

# Create category lists
echo "" >> "$REPORT_FILE"
echo "## Test Categories" >> "$REPORT_FILE"

# Categorize tests by name pattern
echo "" >> "$REPORT_FILE"
echo "### API Tests" >> "$REPORT_FILE"
ls test_status/passing/ | grep -E "api|oauth|provider" | sed 's/.txt//' | while read test; do
    echo "- ✅ $test" >> "$REPORT_FILE"
done
ls test_status/failing/ | grep -E "api|oauth|provider" | sed 's/.txt//' | while read test; do
    echo "- ❌ $test" >> "$REPORT_FILE"
done

echo "" >> "$REPORT_FILE"
echo "### Modal Tests" >> "$REPORT_FILE"
ls test_status/passing/ | grep -E "modal|welcome" | sed 's/.txt//' | while read test; do
    echo "- ✅ $test" >> "$REPORT_FILE"
done
ls test_status/failing/ | grep -E "modal|welcome" | sed 's/.txt//' | while read test; do
    echo "- ❌ $test" >> "$REPORT_FILE"
done

echo "" >> "$REPORT_FILE"
echo "### Function Calling Tests" >> "$REPORT_FILE"
ls test_status/passing/ | grep -E "function" | sed 's/.txt//' | while read test; do
    echo "- ✅ $test" >> "$REPORT_FILE"
done
ls test_status/failing/ | grep -E "function" | sed 's/.txt//' | while read test; do
    echo "- ❌ $test" >> "$REPORT_FILE"
done

echo "" >> "$REPORT_FILE"
echo "### MCP Tests" >> "$REPORT_FILE"
ls test_status/passing/ | grep -E "mcp" | sed 's/.txt//' | while read test; do
    echo "- ✅ $test" >> "$REPORT_FILE"
done
ls test_status/failing/ | grep -E "mcp" | sed 's/.txt//' | while read test; do
    echo "- ❌ $test" >> "$REPORT_FILE"
done

echo "" >> "$REPORT_FILE"
echo "### Sharing Tests" >> "$REPORT_FILE"
ls test_status/passing/ | grep -E "shar|link" | sed 's/.txt//' | while read test; do
    echo "- ✅ $test" >> "$REPORT_FILE"
done
ls test_status/failing/ | grep -E "shar|link" | sed 's/.txt//' | while read test; do
    echo "- ❌ $test" >> "$REPORT_FILE"
done

echo "" >> "$REPORT_FILE"
echo "### RAG Tests" >> "$REPORT_FILE"
ls test_status/passing/ | grep -E "rag" | sed 's/.txt//' | while read test; do
    echo "- ✅ $test" >> "$REPORT_FILE"
done
ls test_status/failing/ | grep -E "rag" | sed 's/.txt//' | while read test; do
    echo "- ❌ $test" >> "$REPORT_FILE"
done

# Print summary
echo ""
echo "## Final Statistics" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "- Total tests: $TOTAL" >> "$REPORT_FILE"
echo "- Passing: $PASSING ($(( PASSING * 100 / TOTAL ))%)" >> "$REPORT_FILE"
echo "- Failing: $FAILING ($(( FAILING * 100 / TOTAL ))%)" >> "$REPORT_FILE"
echo "- Timeout: $TIMEOUT ($(( TIMEOUT * 100 / TOTAL ))%)" >> "$REPORT_FILE"

echo ""
echo -e "${GREEN}=== TEST AUDIT COMPLETE ===${NC}"
echo "Total tests: $TOTAL"
echo -e "Passing: ${GREEN}$PASSING${NC} ($(( PASSING * 100 / TOTAL ))%)"
echo -e "Failing: ${RED}$FAILING${NC} ($(( FAILING * 100 / TOTAL ))%)"
echo -e "Timeout: ${YELLOW}$TIMEOUT${NC} ($(( TIMEOUT * 100 / TOTAL ))%)"
echo ""
echo "Report saved to: $REPORT_FILE"
echo "Test outputs saved in: test_status/"
echo ""
echo "Failing tests are listed in: test_status/failing/"
echo "Passing tests are listed in: test_status/passing/"
echo "Timeout tests are listed in: test_status/timeout/"

# Deactivate virtual environment
deactivate