#!/bin/bash

# Script to run Function-related tests for hacka.re
# Tests function calling system functionality: modal UI, collections, editing, icons, colors
# Focuses on the function calling system and its visual representation

# Clear the run_function_tests.out file at the beginning of each run
> run_function_tests.out

# Start capturing all output to run_function_tests.out
exec > >(tee run_function_tests.out) 2>&1

# Set up trap to ensure we capture Ctrl+C interruptions with stack trace
trap 'echo "Script interrupted with Ctrl+C at $(date)" | tee -a run_function_tests.out; ps -o pid,args -p $$ | tee -a run_function_tests.out; caller | tee -a run_function_tests.out' INT

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
            echo "Function Tests - Tests function calling system functionality:"
            echo "  - Function modal UI (test_function_modal.py)"
            echo "  - Function group colors and visual hierarchy (test_function_group_colors.py)"
            echo "  - Function deletion and management (test_function_deletion.py)"
            echo "  - Function editing interface (test_function_editing.py)"
            echo "  - Function icons and visual indicators (test_function_icons.py)"
            echo "  - Function copy functionality (test_function_copy_buttons.py)"
            echo "  - Function library operations (test_function_library_*.py)"
            echo "  - Function parsing logic (test_function_parsing_logic.py)"
            echo "  - Function tooltips (test_function_tooltip.py)"
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

# Define the function tests filter - all function-related tests
FUNCTION_TESTS_FILTER="test_function_modal or test_function_group_colors or test_function_deletion or test_function_editing or test_function_icons or test_function_copy_buttons or test_function_library_copy or test_function_library_multi or test_function_library_sharing or test_function_parsing_logic or test_function_tooltip or test_function_bundle_preservation"

# Start the HTTP server if not skipped
if [ "$SKIP_SERVER_MANAGEMENT" = "false" ]; then
    echo "Starting HTTP server for tests..."
    ./start_server.sh
    
    # Set up trap to stop the server on exit
    # We need to preserve the existing trap for Ctrl+C
    trap 'echo "Stopping HTTP server..."; ./stop_server.sh; echo "Server stopped."' EXIT
fi

# Run the function tests
echo "Running Function tests with $BROWSER browser..."
echo "Test filter: $FUNCTION_TESTS_FILTER"
echo ""
eval "../../_venv/bin/python -m pytest $PYTEST_ARGS --browser $BROWSER $HEADLESS -k \"$FUNCTION_TESTS_FILTER\"" | tee test_output.log

# Generate test results markdown files
echo "Generating test results markdown files..."
./bundle_test_results.sh

# Deactivate the virtual environment
deactivate

# Inform the user about the output files
echo ""
echo "All function test output, including any Ctrl+C interruptions, has been captured to run_function_tests.out"
echo "A bundled markdown report has been generated at run_tests.out_bundle.md"
echo "You can view the markdown report with: glow -p run_tests.out_bundle.md"
echo "These files can be used by the coding assistant LLM to analyze test results"