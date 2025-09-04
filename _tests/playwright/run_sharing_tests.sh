#!/bin/bash

# Sharing Tests Runner - Tests all sharing and link-related functionality
# Includes: Link sharing, encrypted sharing, share modal, theme sharing, function sharing

# Clear output file
> run_sharing_tests.out

# Capture all output
exec > >(tee run_sharing_tests.out) 2>&1

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

echo "=========================================="
echo "Running Sharing & Link Tests"
echo "=========================================="
echo ""

# Find all sharing-related test files
SHARING_TESTS=$(find . -name "test_*shar*.py" -o -name "test_*link*.py" | grep -v __pycache__ | sort)

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Run each sharing test file
for TEST_FILE in $SHARING_TESTS; do
    TEST_NAME=$(basename "$TEST_FILE" .py)
    
    echo "----------------------------------------"
    echo "Testing: $TEST_NAME"
    echo "File: $TEST_FILE"
    echo "----------------------------------------"
    
    ../../_venv/bin/python -m pytest "$TEST_FILE" $PYTEST_ARGS --browser $BROWSER $HEADLESS 2>&1 | tee -a "sharing_test_${TEST_NAME}.log"
    
    EXIT_CODE=${PIPESTATUS[0]}
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "✅ $TEST_NAME: PASSED"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "❌ $TEST_NAME: FAILED"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        
        # Check for common sharing test issues
        if grep -q "encryption" "sharing_test_${TEST_NAME}.log"; then
            echo "  ⚠️  Possible encryption issue detected"
        fi
        if grep -q "localStorage" "sharing_test_${TEST_NAME}.log"; then
            echo "  ⚠️  Possible storage issue detected"
        fi
    fi
    echo ""
done

# Also run specific sharing functionality within other test files
echo "----------------------------------------"
echo "Testing: Sharing functionality in other tests"
echo "----------------------------------------"

SHARING_FILTER="test_sharing or test_share or link_sharing or share_modal or encrypted_sharing"
_venv/bin/../../_venv/bin/python -m pytest $PYTEST_ARGS --browser $BROWSER $HEADLESS -k "$SHARING_FILTER" 2>&1 | tee -a sharing_test_combined.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ Combined sharing tests: PASSED"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo "❌ Combined sharing tests: FAILED"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Summary
echo ""
echo "=========================================="
echo "Sharing Test Summary"
echo "=========================================="
echo "Total test groups: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo ""

# Generate report
./bundle_test_results.sh

echo "Output saved to: run_sharing_tests.out"
echo "Individual logs saved as: sharing_test_*.log"

deactivate