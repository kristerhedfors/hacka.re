#!/bin/bash

# Script to run MCP tests in smaller batches
# Avoids timeout issues by running tests in groups of 5

# Clear the output file
> run_mcp_tests.out

# Start capturing output
exec > >(tee run_mcp_tests.out) 2>&1

# Set up trap for Ctrl+C
trap 'echo "Script interrupted with Ctrl+C at $(date)" | tee -a run_mcp_tests.out' INT

# Change to script directory
cd "$(dirname "$0")"

echo "======================================"
echo "🔌 MCP TESTS STARTING"
echo "======================================"
echo ""
echo "📁 TEST ARTIFACTS:"
echo "  📸 Screenshots: $(pwd)/screenshots/"
echo "  📝 Output: $(pwd)/run_mcp_tests.out"
echo ""

# Ensure directories exist
mkdir -p screenshots screenshots_data console_logs

# Check virtual environment
VENV_PATH="$(pwd)/.venv"
if [ ! -d "$VENV_PATH" ]; then
    echo "Virtual environment not found at $VENV_PATH"
    echo "Please run setup_environment.sh from project root first"
    exit 1
fi

PYTHON_CMD="$VENV_PATH/bin/python"

# Parse arguments
PYTEST_ARGS=""
BROWSER="chromium"
HEADLESS="--headed"
SKIP_SERVER_MANAGEMENT="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        --headless)
            HEADLESS=""
            shift
            ;;
        --skip-server)
            SKIP_SERVER_MANAGEMENT="true"
            shift
            ;;
        --verbose|-v)
            PYTEST_ARGS="$PYTEST_ARGS -v"
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Start HTTP server if needed
if [ "$SKIP_SERVER_MANAGEMENT" = "false" ]; then
    echo "Starting HTTP server..."
    ./start_server.sh
    trap 'echo "Stopping HTTP server..."; ./stop_server.sh' EXIT
fi

# Find all MCP test files
MCP_TESTS=($(find . -name "test_mcp*.py" -o -name "test_*mcp*.py" | sort))
TOTAL_TESTS=${#MCP_TESTS[@]}

echo "Found $TOTAL_TESTS MCP test files"
echo ""

# Run tests in batches of 5
BATCH_SIZE=5
BATCH_NUM=1

for ((i=0; i<$TOTAL_TESTS; i+=$BATCH_SIZE)); do
    echo "=== Batch $BATCH_NUM (tests $((i+1))-$((i+BATCH_SIZE>TOTAL_TESTS ? TOTAL_TESTS : i+BATCH_SIZE)) of $TOTAL_TESTS) ==="
    
    # Get batch of tests
    BATCH_TESTS=""
    for ((j=i; j<i+BATCH_SIZE && j<TOTAL_TESTS; j++)); do
        BATCH_TESTS="$BATCH_TESTS ${MCP_TESTS[$j]}"
    done
    
    # Run batch
    eval "$PYTHON_CMD -m pytest $PYTEST_ARGS --browser $BROWSER $HEADLESS $BATCH_TESTS " | tee -a test_output.log
    
    echo ""
    BATCH_NUM=$((BATCH_NUM + 1))
done

echo "=== All MCP test batches completed ==="
echo "Total batches run: $((BATCH_NUM - 1))"

# Generate report
./bundle_test_results.sh

echo ""
echo "All MCP test output has been captured to run_mcp_tests.out"
echo "Bundled report available at run_tests.out_bundle.md"
