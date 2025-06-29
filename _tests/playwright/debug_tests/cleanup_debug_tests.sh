#!/bin/bash
# Cleanup Debug Tests
# Safely removes debug test files once issues are resolved

set -e

cd "$(dirname "$0")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Debug Tests Cleanup${NC}"
echo "==================="

# Function to show what will be deleted
show_cleanup_preview() {
    echo -e "${YELLOW}The following debug test files will be deleted:${NC}"
    echo ""
    
    total_files=0
    for category in mcp_debugging api_debugging function_debugging general_debugging; do
        if [ -d "$category" ]; then
            file_count=$(find "$category" -name "*.py" | wc -l)
            if [ $file_count -gt 0 ]; then
                echo -e "${GREEN}${category}:${NC}"
                find "$category" -name "*.py" | sed 's/^/  /'
                total_files=$((total_files + file_count))
                echo ""
            fi
        fi
    done
    
    echo -e "${BLUE}Total files to delete: $total_files${NC}"
    echo ""
}

# Function to perform cleanup
do_cleanup() {
    echo -e "${GREEN}Removing debug test directories...${NC}"
    
    # Remove each category directory
    for category in mcp_debugging api_debugging function_debugging general_debugging; do
        if [ -d "$category" ]; then
            echo "Removing $category/"
            rm -rf "$category"
        fi
    done
    
    # Remove the scripts but keep README for reference
    cd ..
    if [ -f "debug_tests/run_debug_tests.sh" ]; then
        echo "Removing run_debug_tests.sh"
        rm "debug_tests/run_debug_tests.sh"
    fi
    
    if [ -f "debug_tests/cleanup_debug_tests.sh" ]; then
        echo "Removing cleanup_debug_tests.sh"
        rm "debug_tests/cleanup_debug_tests.sh"
    fi
    
    echo -e "${GREEN}Debug tests cleanup completed!${NC}"
    echo ""
    echo -e "${YELLOW}Note: README.md has been kept for reference${NC}"
    echo "You can safely remove the entire debug_tests/ directory if desired:"
    echo "  rm -rf debug_tests/"
}

# Main execution
echo -e "${YELLOW}⚠️  WARNING: This will permanently delete all debug test files!${NC}"
echo ""

show_cleanup_preview

echo -e "${RED}Are you sure you want to proceed with cleanup?${NC}"
echo "This action cannot be undone."
echo ""
read -p "Type 'yes' to confirm: " confirmation

case $confirmation in
    yes|YES)
        echo ""
        do_cleanup
        ;;
    *)
        echo ""
        echo -e "${YELLOW}Cleanup cancelled.${NC}"
        exit 0
        ;;
esac