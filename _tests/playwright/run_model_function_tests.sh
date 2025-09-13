#!/bin/bash

# Test runner for function calling across different models
# This script tests function calling with various Groq and OpenAI models

set -e

# Change to the script's directory (playwright tests directory)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Go back to project root
cd ../..

echo "========================================="
echo "Function Calling Model Tests"
echo "========================================="
echo ""

# Ensure virtual environment is activated
if [ ! -d "_venv" ]; then
    echo "Virtual environment not found. Running setup..."
    ./setup_environment.sh
fi

# Check if .env file exists with API keys
if [ ! -f "_tests/playwright/.env" ]; then
    echo "Warning: .env file not found at _tests/playwright/.env"
    echo "Creating from .env.example..."
    cp _tests/playwright/.env.example _tests/playwright/.env
    echo "Please edit _tests/playwright/.env to add your API keys"
fi

# Parse command line arguments
HEADLESS=""
VERBOSE=""
TEST_TYPE="all"
SPECIFIC_MODEL=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --headless)
            HEADLESS="--headed"
            shift
            ;;
        -v|--verbose)
            VERBOSE="-vv"
            shift
            ;;
        --groq)
            TEST_TYPE="groq"
            shift
            ;;
        --openai)
            TEST_TYPE="openai"
            shift
            ;;
        --model)
            SPECIFIC_MODEL="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --headless    Run tests in headless mode"
            echo "  -v, --verbose Show verbose output"
            echo "  --groq        Test only Groq models"
            echo "  --openai      Test only OpenAI models"
            echo "  --model MODEL Test specific model"
            echo "  --help        Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                          # Test all models"
            echo "  $0 --groq                   # Test only Groq models"
            echo "  $0 --openai                 # Test only OpenAI models"
            echo "  $0 --model llama-3.3-70b-versatile  # Test specific model"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check if server is already running
SERVER_PID=""
if lsof -i:8000 > /dev/null 2>&1; then
    echo "Server already running on port 8000"
else
    echo "Starting HTTP server..."
    ./scripts/start_server.sh
    SERVER_PID=$!
    sleep 2
fi

echo ""
echo "Running function calling tests across models..."
echo "========================================="

# Build the pytest command
PYTEST_CMD="_venv/bin/.venv/bin/python -m pytest _tests/playwright/test_function_calling_models.py"

# Add test selection based on type
if [ "$TEST_TYPE" == "groq" ]; then
    PYTEST_CMD="$PYTEST_CMD -k test_groq"
    echo "Testing Groq models only..."
elif [ "$TEST_TYPE" == "openai" ]; then
    PYTEST_CMD="$PYTEST_CMD -k test_openai"
    echo "Testing OpenAI models only..."
fi

# Add specific model if provided
if [ ! -z "$SPECIFIC_MODEL" ]; then
    PYTEST_CMD="$PYTEST_CMD -k '$SPECIFIC_MODEL'"
    echo "Testing specific model: $SPECIFIC_MODEL"
fi

# Add other options
PYTEST_CMD="$PYTEST_CMD $VERBOSE $HEADLESS -s --tb=short"

echo ""
echo "Command: $PYTEST_CMD"
echo ""

# Run the tests
set +e
$PYTEST_CMD
TEST_EXIT_CODE=$?
set -e

echo ""
echo "========================================="

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✓ All function calling model tests passed!"
else
    echo "✗ Some tests failed. Check the output above."
fi

# Clean up server if we started it
if [ ! -z "$SERVER_PID" ]; then
    echo "Stopping HTTP server..."
    ./scripts/stop_server.sh
fi

echo "========================================="
echo ""

# Generate summary report
echo "Generating test summary..."
_venv/bin/python -c "
import os
import glob
import json

# Find all screenshot metadata files from this test run
metadata_files = glob.glob('_tests/playwright/screenshots_data/*_result.md')

if metadata_files:
    print('\n=== Function Calling Model Test Results ===')
    for f in sorted(metadata_files)[-10:]:  # Show last 10 results
        with open(f, 'r') as file:
            content = file.read()
            # Extract model and result from metadata
            if 'model' in content and 'success' in content:
                lines = content.split('\n')
                model = ''
                success = ''
                provider = ''
                for line in lines:
                    if '**Model**:' in line:
                        model = line.split(':', 1)[1].strip()
                    elif '**Success**:' in line:
                        success = line.split(':', 1)[1].strip()
                    elif '**Provider**:' in line:
                        provider = line.split(':', 1)[1].strip()
                if model and success:
                    status = '✓' if success == 'True' else '✗'
                    print(f'{status} {provider}/{model}')
"

exit $TEST_EXIT_CODE