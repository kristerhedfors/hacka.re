#!/bin/bash

# Modal Tests Runner - Tests all modal-related functionality
# Includes: Settings Modal, Welcome Modal, API Key Modal, Function Modal, RAG Modal, Share Modal

# Clear output file
> run_modal_tests.out

# Capture all output
exec > >(tee run_modal_tests.out) 2>&1

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
TIMEOUT="10000"
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
        --timeout)
            TIMEOUT="$2"
            shift 2
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
echo "Running Modal-Related Tests"
echo "=========================================="
echo ""

# Define modal test groups with proper API key handling
MODAL_TEST_GROUPS=(
    "Welcome Modal:test_welcome_modal.py:Basic welcome modal functionality"
    "Settings Modal:test_modals.py:Settings modal interactions and persistence"
    "API Key Modal:test_api_key_modal.py:API key configuration modal"
    "Function Modal:test_function_modal.py:Function calling modal UI"
    "Share Modal:test_share_modal.py:Share functionality modal"
    "RAG Modal:test_rag_modal.py:RAG knowledge base modal"
    "Modal Coordination:test_modal_coordination.py:Multiple modal interactions"
)

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Run each modal test group
for GROUP in "${MODAL_TEST_GROUPS[@]}"; do
    IFS=':' read -r NAME FILE DESC <<< "$GROUP"
    
    echo "----------------------------------------"
    echo "Testing: $NAME"
    echo "Description: $DESC"
    echo "File: $FILE"
    echo "----------------------------------------"
    
    if [ -f "$FILE" ]; then
        # Add specific handling for tests that require API key
        EXTRA_ARGS=""
        if [[ "$FILE" == *"api"* ]] || [[ "$FILE" == *"function"* ]]; then
            echo "Note: This test requires API key configuration"
            EXTRA_ARGS="--timeout 15000"
        fi
        
        python -m pytest "$FILE" $PYTEST_ARGS --browser $BROWSER $HEADLESS $EXTRA_ARGS 2>&1 | tee -a "modal_test_${FILE}.log"
        
        EXIT_CODE=${PIPESTATUS[0]}
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        
        if [ $EXIT_CODE -eq 0 ]; then
            echo "✅ $NAME: PASSED"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo "❌ $NAME: FAILED"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            
            # Check for common modal test issues
            if grep -q "api_key" "modal_test_${FILE}.log"; then
                echo "  ⚠️  Possible API key persistence issue detected"
            fi
            if grep -q "TimeoutError" "modal_test_${FILE}.log"; then
                echo "  ⚠️  Timeout waiting for modal - possible unexpected modal popup"
            fi
        fi
    else
        echo "⚠️  Test file not found: $FILE"
    fi
    echo ""
done

# Summary
echo "=========================================="
echo "Modal Test Summary"
echo "=========================================="
echo "Total test groups: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo ""

# Generate report
./bundle_test_results.sh

echo "Output saved to: run_modal_tests.out"
echo "Individual logs saved as: modal_test_*.log"

deactivate