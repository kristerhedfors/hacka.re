#!/bin/bash

# Script to run Playwright tests for hacka.re

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
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --headless      Run tests in headless mode (no browser UI)"
            echo "  --firefox       Run tests in Firefox"
            echo "  --webkit        Run tests in WebKit"
            echo "  --verbose, -v   Run tests with verbose output"
            echo "  --test-file     Specify a test file to run"
            echo "  --timeout       Set timeout in milliseconds (default: 5000)"
            echo "  -k              Filter tests by expression (e.g., -k \"not function_calling_api\")"
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

# Run the tests and capture output
if [ -n "$TEST_FILE" ]; then
    echo "Running tests in $TEST_FILE with $BROWSER browser..."
    eval "python -m pytest $TEST_FILE $PYTEST_ARGS --browser $BROWSER $HEADLESS" | tee test_output.log
else
    echo "Running all tests with $BROWSER browser..."
    eval "python -m pytest $PYTEST_ARGS --browser $BROWSER $HEADLESS" | tee test_output.log
fi

# Generate test results markdown file
echo "Generating test results markdown file..."
./bundle_screenshots.sh

# Deactivate the virtual environment
deactivate
