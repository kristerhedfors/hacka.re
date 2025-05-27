#!/bin/bash

# Script to run Core Functionality tests for hacka.re
# Tests fundamental chat application functionality: page loading, API configuration, basic chat
# Excludes problematic tests with @timed_test decorator issues
# Captures all output including Ctrl+C interruptions to run_core_tests.out

# Clear the run_core_tests.out file at the beginning of each run
> run_core_tests.out

# Start capturing all output to run_core_tests.out
exec > >(tee run_core_tests.out) 2>&1

# Set up trap to ensure we capture Ctrl+C interruptions with stack trace
trap 'echo "Script interrupted with Ctrl+C at $(date)" | tee -a run_core_tests.out; ps -o pid,args -p $$ | tee -a run_core_tests.out; caller | tee -a run_core_tests.out' INT

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
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --skip-server)
            SKIP_SERVER_MANAGEMENT="true"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Core Functionality Tests - Tests fundamental chat application functionality:"
            echo "  - Page loading & basic UI (test_page.py)"
            echo "  - API configuration (test_api.py)"
            echo "  - Basic chat functionality (test_chat.py)"
            echo ""
            echo "Note: Excludes problematic tests (modals, welcome manager) with decorator issues"
            echo ""
            echo "Options:"
            echo "  --headless      Run tests in headless mode (no browser UI)"
            echo "  --firefox       Run tests in Firefox"
            echo "  --webkit        Run tests in WebKit"
            echo "  --verbose, -v   Run tests with verbose output"
            echo "  --timeout       Set timeout in milliseconds (default: 5000)"
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

# Define the core tests filter - exclude problematic tests with @timed_test decorator
CORE_TESTS_FILTER="test_page or test_api or test_chat"

# Start the HTTP server if not skipped
if [ "$SKIP_SERVER_MANAGEMENT" = "false" ]; then
    echo "Starting HTTP server for tests..."
    ./start_server.sh
    
    # Set up trap to stop the server on exit
    # We need to preserve the existing trap for Ctrl+C
    trap 'echo "Stopping HTTP server..."; ./stop_server.sh; echo "Server stopped."' EXIT
fi

# Run the core tests
echo "Running Core Functionality tests with $BROWSER browser..."
echo "Test filter: $CORE_TESTS_FILTER"
echo ""
eval "python -m pytest $PYTEST_ARGS --browser $BROWSER $HEADLESS -k \"$CORE_TESTS_FILTER\"" | tee test_output.log

# Generate test results markdown files
echo "Generating test results markdown files..."
./bundle_test_results.sh

# Deactivate the virtual environment
deactivate

# Inform the user about the output files
echo ""
echo "All core test output, including any Ctrl+C interruptions, has been captured to run_core_tests.out"
echo "A bundled markdown report has been generated at run_tests.out_bundle.md"
echo "You can view the markdown report with: glow -p run_tests.out_bundle.md"
echo "These files can be used by the coding assistant LLM to analyze test results"
