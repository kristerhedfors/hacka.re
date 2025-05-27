#!/bin/bash

# Script to run Advanced Feature tests for hacka.re
# Tests advanced features and tools: function calling, sharing, prompts, themes, and other enhanced functionality
# Also includes modal and welcome manager tests (moved from core due to @timed_test decorator issues)
# Excludes core functionality tests (covered by run_core_tests.sh)
# Captures all output including Ctrl+C interruptions to run_feature_tests.out

# Clear the run_feature_tests.out file at the beginning of each run
> run_feature_tests.out

# Start capturing all output to run_feature_tests.out
exec > >(tee run_feature_tests.out) 2>&1

# Set up trap to ensure we capture Ctrl+C interruptions with stack trace
trap 'echo "Script interrupted with Ctrl+C at $(date)" | tee -a run_feature_tests.out; ps -o pid,args -p $$ | tee -a run_feature_tests.out; caller | tee -a run_feature_tests.out' INT

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
            echo "Advanced Feature Tests - Tests advanced features and tools:"
            echo "  - Function calling (test_function_calling_with_api.py)"
            echo "  - Share functionality (test_sharing.py)"
            echo "  - System prompts (test_default_prompts.py)"
            echo "  - Theme switching (test_themes.py)"
            echo "  - Clear chat (test_clear_chat.py)"
            echo "  - Model selection (test_model_selection_*.py)"
            echo "  - Copy chat (test_copy_chat.py)"
            echo "  - Button tooltips (test_button_tooltips.py)"
            echo "  - Function library features (test_function_library_*.py)"
            echo "  - Context window features (test_context_window_*.py)"
            echo "  - Modal tests (test_modals.py)"
            echo "  - Welcome manager tests (test_welcome_manager.py)"
            echo "  - And other advanced functionality"
            echo ""
            echo "Note: Excludes core functionality tests (use run_core_tests.sh for those)"
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

# Define the feature tests filter - exclude core tests and include feature tests
CORE_TESTS_EXCLUDE="test_page or test_api or test_chat"
FEATURE_TESTS_INCLUDE="test_function_calling_with_api or test_sharing or test_default_prompts or test_themes or test_clear_chat or test_model_selection or test_copy_chat or test_button_tooltips or test_function_library or test_context_window or test_function_calling or test_function_copy or test_function_deletion or test_function_editing or test_function_group or test_function_parsing or test_function_tooltip or test_deterministic_crypto or test_clear_namespace or test_system_prompt or test_token_counter or test_input_field or test_logo_tooltip or test_modals or test_welcome_manager"

FEATURE_TESTS_FILTER="not ($CORE_TESTS_EXCLUDE) and ($FEATURE_TESTS_INCLUDE)"

# Start the HTTP server if not skipped
if [ "$SKIP_SERVER_MANAGEMENT" = "false" ]; then
    echo "Starting HTTP server for tests..."
    ./start_server.sh
    
    # Set up trap to stop the server on exit
    # We need to preserve the existing trap for Ctrl+C
    trap 'echo "Stopping HTTP server..."; ./stop_server.sh; echo "Server stopped."' EXIT
fi

# Run the feature tests
echo "Running Advanced Feature tests with $BROWSER browser..."
echo "Test filter: $FEATURE_TESTS_FILTER"
echo ""
eval "python -m pytest $PYTEST_ARGS --browser $BROWSER $HEADLESS -k \"$FEATURE_TESTS_FILTER\"" | tee test_output.log

# Generate test results markdown files
echo "Generating test results markdown files..."
./bundle_test_results.sh

# Deactivate the virtual environment
deactivate

# Inform the user about the output files
echo ""
echo "All feature test output, including any Ctrl+C interruptions, has been captured to run_feature_tests.out"
echo "A bundled markdown report has been generated at run_tests.out_bundle.md"
echo "You can view the markdown report with: glow -p run_tests.out_bundle.md"
echo "These files can be used by the coding assistant LLM to analyze test results"
