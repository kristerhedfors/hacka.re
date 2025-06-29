#!/bin/bash
# Debug Tests Runner
# Provides easy access to run specific debug test categories

set -e

cd "$(dirname "$0")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Debug Tests Runner${NC}"
echo "====================="

# Function to show usage
show_usage() {
    echo "Usage: $0 [category] [test_file]"
    echo ""
    echo "Categories:"
    echo "  mcp        - Run MCP debugging tests"
    echo "  api        - Run API debugging tests" 
    echo "  function   - Run function debugging tests"
    echo "  general    - Run general debugging tests"
    echo "  all        - Run all debug tests"
    echo "  list       - List available test files"
    echo ""
    echo "Examples:"
    echo "  $0 mcp                                    # Run all MCP debug tests"
    echo "  $0 mcp test_mcp_parameter_fix_final.py    # Run specific MCP test"
    echo "  $0 api debug_api_issue.py                 # Run specific API test"
    echo "  $0 list                                   # List all available tests"
}

# Function to list all test files
list_tests() {
    echo -e "${YELLOW}Available Debug Tests:${NC}"
    echo ""
    for category in mcp_debugging api_debugging function_debugging general_debugging; do
        if [ -d "$category" ]; then
            echo -e "${GREEN}${category}:${NC}"
            ls -1 "$category"/*.py 2>/dev/null | sed 's|.*/||' | sed 's/^/  /' || echo "  (no Python files)"
            echo ""
        fi
    done
}

# Function to run tests in a category
run_category() {
    local category=$1
    local test_file=$2
    
    case $category in
        mcp)
            dir="mcp_debugging"
            ;;
        api)
            dir="api_debugging"
            ;;
        function)
            dir="function_debugging"
            ;;
        general)
            dir="general_debugging"
            ;;
        *)
            echo -e "${RED}Unknown category: $category${NC}"
            show_usage
            exit 1
            ;;
    esac
    
    if [ ! -d "$dir" ]; then
        echo -e "${RED}Directory $dir not found${NC}"
        exit 1
    fi
    
    cd ..  # Go back to main playwright test directory
    
    if [ -n "$test_file" ]; then
        # Run specific test file
        if [ -f "debug_tests/$dir/$test_file" ]; then
            echo -e "${GREEN}Running specific test: debug_tests/$dir/$test_file${NC}"
            python -m pytest "debug_tests/$dir/$test_file" -v -s
        else
            echo -e "${RED}Test file not found: debug_tests/$dir/$test_file${NC}"
            exit 1
        fi
    else
        # Run all tests in category
        echo -e "${GREEN}Running all tests in category: $dir${NC}"
        if ls debug_tests/$dir/*.py 1> /dev/null 2>&1; then
            python -m pytest debug_tests/$dir/ -v -s
        else
            echo -e "${YELLOW}No Python test files found in debug_tests/$dir/${NC}"
        fi
    fi
}

# Function to run all debug tests
run_all() {
    cd ..  # Go back to main playwright test directory
    echo -e "${GREEN}Running all debug tests${NC}"
    if ls debug_tests/*/*.py 1> /dev/null 2>&1; then
        python -m pytest debug_tests/ -v -s
    else
        echo -e "${YELLOW}No debug test files found${NC}"
    fi
}

# Main logic
case "${1:-help}" in
    help|--help|-h)
        show_usage
        ;;
    list)
        list_tests
        ;;
    all)
        run_all
        ;;
    mcp|api|function|general)
        run_category "$1" "$2"
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        echo ""
        show_usage
        exit 1
        ;;
esac