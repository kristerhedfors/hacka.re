#!/bin/bash

# Test runner for CLI functionality tests
# Runs all CLI-related tests with full logging and visibility

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Create test results directory
RESULTS_DIR="$SCRIPT_DIR/cli_test_results"
mkdir -p "$RESULTS_DIR"

# Timestamp for this test run
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$RESULTS_DIR/test_run_${TIMESTAMP}.log"
REPORT_FILE="$RESULTS_DIR/test_report_${TIMESTAMP}.md"

echo -e "${GREEN}=== CLI Test Suite ===${NC}"
echo "Timestamp: $TIMESTAMP"
echo "Log file: $LOG_FILE"
echo "Report file: $REPORT_FILE"
echo ""

# Function to run a test and capture output
run_test() {
    local test_file=$1
    local test_name=$(basename "$test_file" .py)
    
    echo -e "${YELLOW}Running: $test_name${NC}"
    
    # Run the test with full output
    if python3 -m pytest "$SCRIPT_DIR/$test_file" \
        -v \
        -s \
        --tb=short \
        --capture=no \
        2>&1 | tee -a "$LOG_FILE"; then
        echo -e "${GREEN}✓ $test_name passed${NC}"
        echo "✓ $test_name" >> "$REPORT_FILE"
        return 0
    else
        echo -e "${RED}✗ $test_name failed${NC}"
        echo "✗ $test_name" >> "$REPORT_FILE"
        return 1
    fi
}

# Initialize report
cat > "$REPORT_FILE" << EOF
# CLI Test Report
**Date**: $(date)
**CLI Path**: $CLI_DIR/hacka.re

## Test Environment
- Python: $(python3 --version)
- Pytest: $(python3 -m pytest --version 2>/dev/null | head -1 || echo "pytest not installed")
- Working Directory: $PROJECT_ROOT

## Test Results

EOF

# Check if CLI binary exists
if [ ! -f "$CLI_DIR/hacka.re" ]; then
    echo -e "${RED}Error: CLI binary not found at $CLI_DIR/hacka.re${NC}"
    echo "Please build the CLI first with: cd $CLI_DIR && go build cmd/hacka.re/main.go -o hacka.re"
    exit 1
fi

# Track overall results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# List of CLI test files
CLI_TESTS=(
    "test_cli_browse_command.py"
    "test_cli_serve_command.py"
    "test_cli_chat_command.py"
    "test_cli_shared_links.py"
    "test_cli_zip_serving.py"
    "test_cli_port_configuration.py"
)

echo "## Individual Test Files" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Run each test file
for test_file in "${CLI_TESTS[@]}"; do
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if run_test "$test_file"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
done

# Summary
echo ""
echo -e "${GREEN}=== Test Summary ===${NC}"
echo "Total test files: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"

# Add summary to report
cat >> "$REPORT_FILE" << EOF

## Summary

- **Total Test Files**: $TOTAL_TESTS
- **Passed**: $PASSED_TESTS
- **Failed**: $FAILED_TESTS
- **Success Rate**: $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%

## Detailed Test Output

### Browse Command Tests
Tests for the \`browse\` subcommand that starts a web server and opens browser.

### Serve Command Tests  
Tests for the \`serve\` subcommand with verbose logging options.

### Chat Command Tests
Tests for the \`chat\` subcommand functionality.

### Shared Links Tests
Tests for shared configuration link handling across all commands.

### ZIP Serving Tests
Tests that embedded ZIP files are served from memory without extraction.

### Port Configuration Tests
Tests for port configuration via flags and environment variables.

## Log File
Full test output saved to: \`$LOG_FILE\`

## Screenshots
Any test screenshots are saved in: \`$SCRIPT_DIR/screenshots/\`

EOF

# Generate detailed test counts from log
echo "" >> "$REPORT_FILE"
echo "## Detailed Test Counts" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
grep -E "passed|failed|error" "$LOG_FILE" | tail -20 >> "$REPORT_FILE" 2>/dev/null || true
echo '```' >> "$REPORT_FILE"

# Check for any errors in log
if grep -q "ERROR\|FAILED\|AssertionError" "$LOG_FILE"; then
    echo "" >> "$REPORT_FILE"
    echo "## Errors Found" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    grep -A 2 -B 2 "ERROR\|FAILED\|AssertionError" "$LOG_FILE" | head -50 >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
fi

echo ""
echo -e "${GREEN}Test report saved to: $REPORT_FILE${NC}"
echo -e "${GREEN}Full log saved to: $LOG_FILE${NC}"

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Check the report for details.${NC}"
    exit 1
fi