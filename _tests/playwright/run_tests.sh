#!/bin/bash

# Script to run Playwright tests for hacka.re
# Captures all output including Ctrl+C interruptions to run_tests.out

# Clear the run_tests.out file at the beginning of each run
> run_tests.out

# Start capturing all output to run_tests.out
exec > >(tee run_tests.out) 2>&1

# Set up trap to ensure we capture Ctrl+C interruptions with stack trace
trap 'echo "Script interrupted with Ctrl+C at $(date)" | tee -a run_tests.out; ps -o pid,args -p $$ | tee -a run_tests.out; caller | tee -a run_tests.out' INT

# Change to the script directory
cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Virtual environment not found. Creating one..."
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    playwright install
else
    # Activate the virtual environment
    source .venv/bin/activate
fi

# Parse command line arguments
PYTEST_ARGS=""
BROWSER="chromium"
HEADLESS="--headed"
TIMEOUT="5000"
SKIP_SERVER_MANAGEMENT="false"

# Process command line arguments
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
        --test-file)
            TEST_FILE="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -k)
            K_EXPR="$2"
            shift 2
            ;;
        --skip-server)
            SKIP_SERVER_MANAGEMENT="true"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Runs all hacka.re tests including core functionality, advanced features, and RAG."
            echo ""
            echo "Specialized test scripts:"
            echo "  ./run_core_tests.sh     - Core functionality only (page, API, chat)"
            echo "  ./run_feature_tests.sh  - Advanced features (function calling, RAG, etc.)"
            echo "  ./run_rag_tests.sh      - RAG functionality only (with categories)"
            echo ""
            echo "Options:"
            echo "  --headless      Run tests in headless mode (no browser UI)"
            echo "  --firefox       Run tests in Firefox"
            echo "  --webkit        Run tests in WebKit"
            echo "  --verbose, -v   Run tests with verbose output"
            echo "  --test-file     Specify a test file to run"
            echo "  --timeout       Set timeout in milliseconds (default: 5000)"
            echo "  -k              Filter tests by expression (e.g., -k \"test_rag\")"
            echo "  --skip-server   Skip starting/stopping the HTTP server"
            echo "  --help, -h      Show this help message"
            exit 0
            ;;
        *)
            PYTEST_ARGS="$PYTEST_ARGS $1"
            shift
            ;;
    esac
done

# Prepare pytest arguments
if [ -n "$K_EXPR" ]; then
    PYTEST_ARGS="$PYTEST_ARGS -k \"$K_EXPR\""
fi

# Start the HTTP server if not skipped
if [ "$SKIP_SERVER_MANAGEMENT" = "false" ]; then
    echo "Starting HTTP server for tests..."
    ./start_server.sh
    
    # Set up trap to stop the server on exit
    # We need to preserve the existing trap for Ctrl+C
    trap 'echo "Stopping HTTP server..."; ./stop_server.sh; echo "Server stopped."' EXIT
fi

# Run the tests
if [ -n "$TEST_FILE" ]; then
    echo "Running tests in $TEST_FILE with $BROWSER browser..."
    eval "../../_venv/bin/python -m pytest $TEST_FILE $PYTEST_ARGS --browser $BROWSER $HEADLESS" | tee test_output.log
else
    echo "Running all tests with $BROWSER browser..."
    eval "../../_venv/bin/python -m pytest $PYTEST_ARGS --browser $BROWSER $HEADLESS" | tee test_output.log
fi

# Generate test results markdown files
echo "Generating test results markdown files..."
./bundle_test_results.sh

# Deactivate the virtual environment
deactivate

# Inform the user about the output files
echo ""
echo "All test output, including any Ctrl+C interruptions, has been captured to run_tests.out"
echo "A bundled markdown report has been generated at run_tests.out_bundle.md"
echo "You can view the markdown report with: glow -p run_tests.out_bundle.md"
echo "These files can be used by the coding assistant LLM to analyze test results"
