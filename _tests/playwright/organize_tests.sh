#!/bin/bash

# Test Organization Script
# Creates a clear structure showing which tests belong to which categories
# and identifies currently passing vs failing tests

echo "=========================================="
echo "Test Organization Report"
echo "Generated: $(date)"
echo "=========================================="
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Create organization directories
mkdir -p test_organization/{core,modal,sharing,mcp,function,rag,api,other}
mkdir -p test_organization/status/{passing,failing,unknown}

# Function to categorize test file
categorize_test() {
    local test_file="$1"
    local test_name=$(basename "$test_file" .py)
    
    # Determine category based on name
    if [[ "$test_name" =~ ^test_(page|chat|welcome_modal|api)$ ]]; then
        echo "core"
    elif [[ "$test_name" =~ modal ]]; then
        echo "modal"
    elif [[ "$test_name" =~ (shar|link) ]]; then
        echo "sharing"
    elif [[ "$test_name" =~ mcp ]]; then
        echo "mcp"
    elif [[ "$test_name" =~ function ]]; then
        echo "function"
    elif [[ "$test_name" =~ rag ]]; then
        echo "rag"
    elif [[ "$test_name" =~ (api|oauth|provider) ]]; then
        echo "api"
    else
        echo "other"
    fi
}

# Create category report
REPORT_FILE="test_organization/test_categories_$(date +%Y%m%d).md"

echo "# Test Organization Report" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Generated: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Count tests by category (using simple variables for compatibility)
COUNT_CORE=0
COUNT_MODAL=0
COUNT_SHARING=0
COUNT_MCP=0
COUNT_FUNCTION=0
COUNT_RAG=0
COUNT_API=0
COUNT_OTHER=0

# Find all test files and categorize them
echo "## Test Categories" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

for category in core modal sharing mcp function rag api other; do
    # Capitalize category name for display
    category_display=$(echo "$category" | sed 's/^./\U&/')
    echo "### $category_display Tests" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    count=0
    for test_file in $(find . -name "test_*.py" -type f | grep -v __pycache__ | grep -v test_utils.py | sort); do
        test_name=$(basename "$test_file" .py)
        test_category=$(categorize_test "$test_file")
        
        if [ "$test_category" == "$category" ]; then
            echo "- $test_name" >> "$REPORT_FILE"
            ln -sf "../../$test_file" "test_organization/$category/$test_name.py"
            count=$((count + 1))
        fi
    done
    
    # Store count in individual variables
    case "$category" in
        core) COUNT_CORE=$count ;;
        modal) COUNT_MODAL=$count ;;
        sharing) COUNT_SHARING=$count ;;
        mcp) COUNT_MCP=$count ;;
        function) COUNT_FUNCTION=$count ;;
        rag) COUNT_RAG=$count ;;
        api) COUNT_API=$count ;;
        other) COUNT_OTHER=$count ;;
    esac
    
    echo "" >> "$REPORT_FILE"
    echo "**Total: $count tests**" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
done

# Summary statistics
echo "## Summary Statistics" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

total=0
echo "- **Core**: $COUNT_CORE tests" >> "$REPORT_FILE"
total=$((total + COUNT_CORE))
echo "- **Modal**: $COUNT_MODAL tests" >> "$REPORT_FILE"
total=$((total + COUNT_MODAL))
echo "- **Sharing**: $COUNT_SHARING tests" >> "$REPORT_FILE"
total=$((total + COUNT_SHARING))
echo "- **MCP**: $COUNT_MCP tests" >> "$REPORT_FILE"
total=$((total + COUNT_MCP))
echo "- **Function**: $COUNT_FUNCTION tests" >> "$REPORT_FILE"
total=$((total + COUNT_FUNCTION))
echo "- **RAG**: $COUNT_RAG tests" >> "$REPORT_FILE"
total=$((total + COUNT_RAG))
echo "- **API**: $COUNT_API tests" >> "$REPORT_FILE"
total=$((total + COUNT_API))
echo "- **Other**: $COUNT_OTHER tests" >> "$REPORT_FILE"
total=$((total + COUNT_OTHER))

echo "- **Total**: $total tests" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Create runner script recommendations
echo "## Recommended Test Runners" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Based on the categorization, use these scripts to run specific test groups:" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo '```bash' >> "$REPORT_FILE"
echo '# Run core tests (quick validation)' >> "$REPORT_FILE"
echo './run_core_tests.sh' >> "$REPORT_FILE"
echo '' >> "$REPORT_FILE"
echo '# Run modal-specific tests' >> "$REPORT_FILE"
echo './run_modal_tests.sh' >> "$REPORT_FILE"
echo '' >> "$REPORT_FILE"
echo '# Run sharing tests' >> "$REPORT_FILE"
echo './run_sharing_tests.sh' >> "$REPORT_FILE"
echo '' >> "$REPORT_FILE"
echo '# Run MCP tests' >> "$REPORT_FILE"
echo './run_mcp_tests.sh' >> "$REPORT_FILE"
echo '' >> "$REPORT_FILE"
echo '# Run function calling tests' >> "$REPORT_FILE"
echo './run_function_tests.sh' >> "$REPORT_FILE"
echo '' >> "$REPORT_FILE"
echo '# Run RAG tests' >> "$REPORT_FILE"
echo './run_rag_tests.sh' >> "$REPORT_FILE"
echo '' >> "$REPORT_FILE"
echo '# Run test audit to identify failing tests' >> "$REPORT_FILE"
echo './run_test_audit.sh' >> "$REPORT_FILE"
echo '' >> "$REPORT_FILE"
echo '# Run smart test runner with retry logic' >> "$REPORT_FILE"
echo './run_tests_smart.sh --mode core' >> "$REPORT_FILE"
echo './run_tests_smart.sh --mode modal --max-retries 3' >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"

# Print to console
echo "Test Organization Complete!"
echo ""
echo "Category Breakdown:"
printf "  %-10s: %3d tests\n" "Core" "$COUNT_CORE"
printf "  %-10s: %3d tests\n" "Modal" "$COUNT_MODAL"
printf "  %-10s: %3d tests\n" "Sharing" "$COUNT_SHARING"
printf "  %-10s: %3d tests\n" "MCP" "$COUNT_MCP"
printf "  %-10s: %3d tests\n" "Function" "$COUNT_FUNCTION"
printf "  %-10s: %3d tests\n" "RAG" "$COUNT_RAG"
printf "  %-10s: %3d tests\n" "API" "$COUNT_API"
printf "  %-10s: %3d tests\n" "Other" "$COUNT_OTHER"
echo ""
echo "Total: $total tests"
echo ""
echo "Organization saved to: $REPORT_FILE"
echo "Category links created in: test_organization/"
echo ""
echo "Next steps:"
echo "1. Run ./run_test_audit.sh to identify failing tests"
echo "2. Use category-specific runners for focused testing"
echo "3. Use ./run_tests_smart.sh for tests with retry logic"