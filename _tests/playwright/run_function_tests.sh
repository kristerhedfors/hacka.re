#!/bin/bash

# Script to run Function tests in smaller batches
# Avoids timeout issues by running tests in groups of 4

# Clear the output file
> run_function_tests.out

# Start capturing output
exec > >(tee run_function_tests.out) 2>&1

# Set up trap for Ctrl+C
trap 'echo "Script interrupted with Ctrl+C at $(date)" | tee -a run_function_tests.out' INT

# Change to script directory
cd "$(dirname "$0")"

echo "======================================"
echo "⚡ FUNCTION TESTS STARTING"
echo "======================================"
echo ""
echo "📁 TEST ARTIFACTS:"
echo "  📸 Screenshots: $(pwd)/screenshots/"
echo "  📝 Output: $(pwd)/run_function_tests.out"
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

# Find all function test files
FUNCTION_TESTS=($(find . -name "test_function*.py" | sort))
TOTAL_TESTS=${#FUNCTION_TESTS[@]}

echo "Found $TOTAL_TESTS function test files"
echo ""

# Run tests in batches of 4
BATCH_SIZE=4
BATCH_NUM=1

for ((i=0; i<$TOTAL_TESTS; i+=$BATCH_SIZE)); do
    echo "=== Batch $BATCH_NUM (tests $((i+1))-$((i+BATCH_SIZE>TOTAL_TESTS ? TOTAL_TESTS : i+BATCH_SIZE)) of $TOTAL_TESTS) ==="
    
    # Get batch of tests
    BATCH_TESTS=""
    for ((j=i; j<i+BATCH_SIZE && j<TOTAL_TESTS; j++)); do
        BATCH_TESTS="$BATCH_TESTS ${FUNCTION_TESTS[$j]}"
    done
    
    # Run batch
    eval "$PYTHON_CMD -m pytest $PYTEST_ARGS --browser $BROWSER $HEADLESS $BATCH_TESTS " | tee -a test_output.log
    
    echo ""
    BATCH_NUM=$((BATCH_NUM + 1))
done

echo "=== All function test batches completed ==="
echo "Total batches run: $((BATCH_NUM - 1))"

# Generate report
./bundle_test_results.sh

echo ""
echo "All function test output has been captured to run_function_tests.out"
echo "Bundled report available at run_tests.out_bundle.md"
