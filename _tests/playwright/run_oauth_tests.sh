#!/bin/bash

# MCP OAuth 2.1 Test Runner
# Runs comprehensive tests for OAuth 2.1 specification compliance

echo "🔐 Starting MCP OAuth 2.1 Compliance Tests"
echo "=========================================="

# Set test environment
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
export PYTEST_ARGS="--tb=short --maxfail=5 -v"

# Test categories
OAUTH_TESTS=(
    "test_mcp_oauth_metadata_discovery.py"
    "test_mcp_oauth_client_registration.py" 
    "test_mcp_oauth_enhanced_service.py"
    "test_mcp_stdio_oauth_middleware.py"
    "test_mcp_oauth_enhanced_transport.py"
    "test_mcp_oauth_integration.py"
)

# Function to run a specific test category
run_test_category() {
    local test_file="$1"
    local test_name=$(basename "$test_file" .py)
    
    echo ""
    echo "🧪 Running $test_name"
    echo "----------------------------------------"
    
    if pytest $PYTEST_ARGS -m oauth "$test_file"; then
        echo "✅ $test_name: PASSED"
        return 0
    else
        echo "❌ $test_name: FAILED"
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    # Check if pytest is available
    if ! command -v pytest &> /dev/null; then
        echo "❌ pytest not found. Please install: pip install pytest"
        exit 1
    fi
    
    # Check if playwright is available
    if ! python -c "import playwright" 2>/dev/null; then
        echo "❌ playwright not found. Please install: pip install playwright"
        exit 1
    fi
    
    # Check if required test files exist
    for test_file in "${OAUTH_TESTS[@]}"; do
        if [[ ! -f "$test_file" ]]; then
            echo "❌ Test file not found: $test_file"
            exit 1
        fi
    done
    
    echo "✅ Prerequisites check passed"
}

# Function to start services
start_services() {
    echo "🚀 Starting required services..."
    
    # Note: HTTP server is managed by pytest fixtures in conftest.py
    # Each test uses the serve_hacka_re fixture which starts the server
    # from the correct project root directory
    echo "HTTP server will be managed by pytest fixtures"
    
    # Check if MCP proxy is available (optional for some tests)
    if [[ -f "../../mcp-stdio-proxy/server.js" ]]; then
        echo "MCP stdio proxy available for stdio tests"
    fi
    
    echo "✅ Services setup complete"
}

# Function to stop services
stop_services() {
    echo "🛑 Stopping services..."
    
    # HTTP server cleanup is handled by pytest fixtures
    # Kill any stray HTTP servers if they exist
    pkill -f "python.*http.server.*8000" 2>/dev/null || true
    
    echo "✅ Services cleanup complete"
}

# Function to generate test report
generate_report() {
    local passed_count=$1
    local total_count=$2
    local failed_tests=("${@:3}")
    
    echo ""
    echo "📊 OAuth 2.1 Test Results Summary"
    echo "=================================="
    echo "Total test categories: $total_count"
    echo "Passed: $passed_count"
    echo "Failed: $((total_count - passed_count))"
    echo ""
    
    if [[ $passed_count -eq $total_count ]]; then
        echo "🎉 All OAuth 2.1 tests PASSED!"
        echo ""
        echo "✅ OAuth 2.0 Authorization Server Metadata Discovery (RFC 8414)"
        echo "✅ OAuth 2.0 Dynamic Client Registration Protocol (RFC 7591)"
        echo "✅ Enhanced OAuth Service with Auto-Discovery"
        echo "✅ stdio Proxy OAuth Middleware"
        echo "✅ Enhanced OAuth Transport with Retry Logic"
        echo "✅ Complete OAuth 2.1 Integration Flow"
        echo ""
        echo "🔒 OAuth 2.1 specification compliance verified!"
        return 0
    else
        echo "❌ Some tests failed:"
        for failed_test in "${failed_tests[@]}"; do
            echo "   • $failed_test"
        done
        echo ""
        echo "Please review failed tests and fix issues before deployment."
        return 1
    fi
}

# Main execution
main() {
    local passed_count=0
    local total_count=${#OAUTH_TESTS[@]}
    local failed_tests=()
    
    # Setup
    check_prerequisites
    start_services
    
    # Ensure we stop services on exit
    trap stop_services EXIT
    
    echo ""
    echo "🔐 Running OAuth 2.1 Compliance Test Suite"
    echo "Tests: ${OAUTH_TESTS[*]}"
    echo ""
    
    # Run each test category
    for test_file in "${OAUTH_TESTS[@]}"; do
        if run_test_category "$test_file"; then
            ((passed_count++))
        else
            failed_tests+=("$(basename "$test_file" .py)")
        fi
    done
    
    # Generate final report
    generate_report $passed_count $total_count "${failed_tests[@]}"
}

# Run main function
main "$@"