#!/bin/bash

# Script to run RAG (Retrieval-Augmented Generation) tests for hacka.re
# Tests all RAG functionality: modal UI, indexing, search, bundles, and chat integration
# Captures all output including Ctrl+C interruptions to run_rag_tests.out

# Clear the run_rag_tests.out file at the beginning of each run
> run_rag_tests.out

# Start capturing all output to run_rag_tests.out
exec > >(tee run_rag_tests.out) 2>&1

# Set up trap to ensure we capture Ctrl+C interruptions with stack trace
trap 'echo "Script interrupted with Ctrl+C at $(date)" | tee -a run_rag_tests.out; ps -o pid,args -p $$ | tee -a run_rag_tests.out; caller | tee -a run_rag_tests.out' INT

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
TEST_CATEGORY="all"

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
        --category)
            TEST_CATEGORY="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "RAG (Retrieval-Augmented Generation) Tests - Tests all RAG functionality:"
            echo "  - Modal UI and button interactions (test_rag_modal.py)"
            echo "  - Embedding generation and indexing (test_rag_indexing.py)"
            echo "  - Vector search and similarity ranking (test_rag_search.py)"
            echo "  - User bundle loading and management (test_rag_bundles.py)"
            echo "  - Chat integration and end-to-end workflows (test_rag_integration.py)"
            echo ""
            echo "Test Categories:"
            echo "  all         - Run all RAG tests (default)"
            echo "  modal       - Run modal UI tests only"
            echo "  indexing    - Run indexing and embedding tests only"
            echo "  search      - Run search functionality tests only"
            echo "  bundles     - Run user bundle tests only"
            echo "  integration - Run integration and chat tests only"
            echo "  quick       - Run modal + search tests (no API calls)"
            echo "  api         - Run tests that require API calls (indexing + integration)"
            echo ""
            echo "Options:"
            echo "  --headless      Run tests in headless mode (no browser UI)"
            echo "  --firefox       Run tests in Firefox"
            echo "  --webkit        Run tests in WebKit"
            echo "  --verbose, -v   Run tests with verbose output"
            echo "  --timeout       Set timeout in milliseconds (default: 5000)"
            echo "  --skip-server   Skip starting/stopping the HTTP server"
            echo "  --category      Specify test category to run (see above)"
            echo "  --help, -h      Show this help message"
            exit 0
            ;;
        *)
            PYTEST_ARGS="$PYTEST_ARGS $1"
            shift
            ;;
    esac
done

# Define test filters based on category
case $TEST_CATEGORY in
    modal)
        RAG_TESTS_FILTER="test_rag_modal"
        echo "Running RAG Modal UI tests..."
        ;;
    indexing)
        RAG_TESTS_FILTER="test_rag_indexing"
        echo "Running RAG Indexing and Embedding tests..."
        ;;
    search)
        RAG_TESTS_FILTER="test_rag_search"
        echo "Running RAG Search Functionality tests..."
        ;;
    bundles)
        RAG_TESTS_FILTER="test_rag_bundles"
        echo "Running RAG User Bundle tests..."
        ;;
    integration)
        RAG_TESTS_FILTER="test_rag_integration"
        echo "Running RAG Integration and Chat tests..."
        ;;
    quick)
        RAG_TESTS_FILTER="test_rag_modal or test_rag_search or test_rag_bundles"
        echo "Running Quick RAG tests (no API calls)..."
        ;;
    api)
        RAG_TESTS_FILTER="test_rag_indexing or test_rag_integration"
        echo "Running RAG API-dependent tests..."
        ;;
    all|*)
        RAG_TESTS_FILTER="test_rag_modal or test_rag_indexing or test_rag_search or test_rag_bundles or test_rag_integration"
        echo "Running All RAG tests..."
        ;;
esac

# Start the HTTP server if not skipped
if [ "$SKIP_SERVER_MANAGEMENT" = "false" ]; then
    echo "Starting HTTP server for tests..."
    ./start_server.sh
    
    # Set up trap to stop the server on exit
    # We need to preserve the existing trap for Ctrl+C
    trap 'echo "Stopping HTTP server..."; ./stop_server.sh; echo "Server stopped."' EXIT
fi

# Run the RAG tests
echo "Running RAG tests with $BROWSER browser..."
echo "Test filter: $RAG_TESTS_FILTER"
echo "Category: $TEST_CATEGORY"
echo ""

# Note about API requirements
if [[ "$TEST_CATEGORY" == "all" || "$TEST_CATEGORY" == "indexing" || "$TEST_CATEGORY" == "integration" || "$TEST_CATEGORY" == "api" ]]; then
    echo "Note: Some tests require OpenAI API key in .env file for real embedding generation"
    echo "Tests will use gpt-5-nano model for cost efficiency"
    echo ""
fi

eval "../../_venv/bin/python -m pytest $PYTEST_ARGS --browser $BROWSER $HEADLESS -k \"$RAG_TESTS_FILTER\"" | tee test_output.log

# Generate test results markdown files
echo "Generating test results markdown files..."
./bundle_test_results.sh

# Deactivate the virtual environment
deactivate

# Inform the user about the output files
echo ""
echo "All RAG test output, including any Ctrl+C interruptions, has been captured to run_rag_tests.out"
echo "A bundled markdown report has been generated at run_tests.out_bundle.md"
echo "You can view the markdown report with: glow -p run_tests.out_bundle.md"
echo "These files can be used by the coding assistant LLM to analyze test results"
echo ""
echo "RAG Test Summary:"
echo "  - Modal UI tests: Basic button and modal functionality"
echo "  - Indexing tests: Embedding generation with real OpenAI API"
echo "  - Search tests: Vector similarity and result ranking"
echo "  - Bundle tests: User-defined knowledge base loading"
echo "  - Integration tests: Chat enhancement and end-to-end workflows"