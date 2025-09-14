#!/bin/bash

# Interactive menu for running test batches
# Helps avoid timeouts by guiding users to appropriate batch runners

echo "======================================"
echo "🧪 HACKA.RE TEST RUNNER MENU"
echo "======================================"
echo ""
echo "Choose a test suite to run:"
echo ""
echo "1) Core Tests       - Basic functionality (page, API, chat)"
echo "2) Feature Tests    - Advanced features (sharing, themes, etc)"
echo "3) Function Tests   - Function calling system (~16 files)"
echo "4) MCP Tests        - MCP integration (~20 files)"
echo "5) Agent Tests      - Agent functionality (~18 files)"
echo "6) All Tests        - Run everything in batches (289+ files)"
echo "7) Single File      - Run a specific test file"
echo "8) Pattern Match    - Run tests matching a pattern"
echo ""
echo "0) Exit"
echo ""
read -p "Enter your choice [0-8]: " choice

case $choice in
    1)
        echo "Running Core Tests..."
        ./run_core_tests.sh "$@"
        ;;
    2)
        echo "Running Feature Tests..."
        ./run_feature_tests.sh "$@"
        ;;
    3)
        echo "Running Function Tests..."
        ./run_function_tests.sh "$@"
        ;;
    4)
        echo "Running MCP Tests..."
        ./run_mcp_tests.sh "$@"
        ;;
    5)
        echo "Running Agent Tests..."
        ./run_agent_tests.sh "$@"
        ;;
    6)
        echo "Running All Tests in batches..."
        ./run_tests.sh "$@"
        ;;
    7)
        read -p "Enter test file name (e.g., test_api.py): " testfile
        echo "Running $testfile..."
        ./run_tests.sh --test-file "$testfile" "$@"
        ;;
    8)
        read -p "Enter test pattern (e.g., 'shodan' or 'rag'): " pattern
        echo "Running tests matching '$pattern'..."
        ./run_tests.sh -k "$pattern" "$@"
        ;;
    0)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid choice. Please run again and select 0-8."
        exit 1
        ;;
esac
