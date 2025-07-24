#!/bin/bash

# Master test runner for all agent save/load functionality tests
# Tests comprehensive agent functionality including:
# - API configuration (provider, model, API key, tools)
# - MCP connections (GitHub OAuth, Gmail OAuth, etc.)
# - Function calling (library, enabled functions, tools status)
# - Prompts (library, selected prompts, custom prompts)
# - Default prompts (system defaults, selection states)
# - Conversation history (messages, system prompts, chat state)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_status "=== AGENT SAVE/LOAD COMPREHENSIVE TEST SUITE ==="
print_status "Testing all aspects of agent save/load functionality"

# Parse command line arguments
HEADLESS=""
BROWSER="chromium"
VERBOSE=""
COMPONENT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --headless)
            HEADLESS="--headless"
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
        -v|--verbose)
            VERBOSE="-v"
            shift
            ;;
        --component)
            COMPONENT="$2"
            shift
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --headless      Run tests in headless mode"
            echo "  --firefox       Use Firefox browser"
            echo "  --webkit        Use WebKit browser"
            echo "  -v, --verbose   Verbose output"
            echo "  --component     Run specific component test (api|mcp|functions|prompts|default-prompts|conversation)"
            echo "  --help          Show this help message"
            echo ""
            echo "Components:"
            echo "  api              Test API configuration save/load"
            echo "  mcp              Test MCP connections save/load"
            echo "  functions        Test function calling save/load"
            echo "  prompts          Test custom prompts save/load"
            echo "  default-prompts  Test default prompts save/load"
            echo "  conversation     Test conversation history save/load"
            echo ""
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Function to get test file for component
get_test_file() {
    case "$1" in
        api) echo "test_agent_api_config.py" ;;
        mcp) echo "test_agent_mcp_config.py" ;;
        functions) echo "test_agent_function_config.py" ;;
        prompts) echo "test_agent_prompts_config.py" ;;
        default-prompts) echo "test_agent_default_prompts_config.py" ;;
        conversation) echo "test_agent_conversation_history.py" ;;
        *) echo "" ;;
    esac
}

# If specific component requested, run only that
if [[ -n "$COMPONENT" ]]; then
    TEST_FILE=$(get_test_file "$COMPONENT")
    if [[ -n "$TEST_FILE" ]]; then
        print_status "Running $COMPONENT component tests only"
        
        print_status "Executing: ./run_tests.sh --test-file $TEST_FILE $HEADLESS $VERBOSE"
        
        if ./run_tests.sh --test-file "$TEST_FILE" $HEADLESS $VERBOSE; then
            print_success "$COMPONENT component tests passed"
        else
            print_error "$COMPONENT component tests failed"
            exit 1
        fi
        exit 0
    else
        print_error "Unknown component: $COMPONENT"
        echo "Available components: api, mcp, functions, prompts, default-prompts, conversation"
        exit 1
    fi
fi

# Run all component tests
print_status "Running all agent component tests..."

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

for component in api mcp functions prompts default-prompts conversation; do
    TEST_FILE=$(get_test_file "$component")
    
    print_status "Testing $component component ($TEST_FILE)..."
    
    if ./run_tests.sh --test-file "$TEST_FILE" $HEADLESS $VERBOSE; then
        print_success "$component component tests passed"
        ((PASSED_TESTS++))
    else
        print_error "$component component tests failed"
        ((FAILED_TESTS++))
    fi
    
    ((TOTAL_TESTS++))
    echo ""
done

# Summary
print_status "=== AGENT TEST SUITE SUMMARY ==="
print_status "Total component test suites: $TOTAL_TESTS"
print_success "Passed: $PASSED_TESTS"

if [[ $FAILED_TESTS -gt 0 ]]; then
    print_error "Failed: $FAILED_TESTS"
    echo ""
    print_error "Some agent component tests failed. Check the output above for details."
    exit 1
else
    print_success "Failed: $FAILED_TESTS"
    echo ""
    print_success "🎉 All agent save/load component tests passed successfully!"
    print_success "✅ API Configuration save/load working"
    print_success "✅ MCP Connections save/load working"
    print_success "✅ Function Calling save/load working"
    print_success "✅ Custom Prompts save/load working"
    print_success "✅ Default Prompts save/load working"
    print_success "✅ Conversation History save/load working"
    print_success ""
    print_success "Agent functionality is fully tested and operational!"
fi