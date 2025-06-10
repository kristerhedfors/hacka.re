#!/bin/bash

# project_metrics.sh
# Script to calculate metrics about the hacka.re project
# - Character and line counts for various file types
# - Test counts and other project size metrics

# Set script to exit on error
set -e

# Define colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}      HACKA.RE PROJECT METRICS          ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Get the project root directory (assuming script is in /scripts)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Define common directories to exclude (based on .gitignore and 3rd party libraries)
EXCLUDE_DIRS=(
    ".git"
    "node_modules"
    ".yarn"
    "dist"
    "build"
    "out"
    ".next"
    ".nuxt"
    ".cache"
    ".output"
    ".bin"
    "coverage"
    ".nyc_output"
    ".jest"
    ".vscode"
    ".idea"
    ".DS_Store"
    "logs"
    "__pycache__"
    ".pytest_cache"
    ".coverage"
    "htmlcov"
    ".tox"
    ".nox"
    ".hypothesis"
    ".venv"
    "venv"
    "ENV"
    "env"
    "_venv"
    "_tests/venv"
    "_tests/playwright/.venv"
    "_tests/playwright/screenshots"
    "_tests/playwright/screenshots_data"
    "_tests/playwright/videos"
    "lib"
    "reports"
    "custom_reports"
    "videos"
    "openai_proxy"
    "auth_examples"
)

# Additional find exclusions for patterns that need special handling
ADDITIONAL_EXCLUSIONS="-not -path \"*/__pycache__/*\" -not -path \"*/.pytest_cache/*\""

# Build the find exclusion string
build_exclusions() {
    local exclusions=""
    for dir in "${EXCLUDE_DIRS[@]}"; do
        exclusions="$exclusions -not -path \"./$dir/*\""
    done
    echo "$exclusions $ADDITIONAL_EXCLUSIONS"
}

# Store the exclusions
EXCLUSIONS=$(build_exclusions)

# Function to count files by extension
count_files_by_extension() {
    local ext=$1
    # Use eval to properly handle the exclusions string
    eval "find . -type f -name \"*.$ext\" $EXCLUSIONS" | wc -l
}

# Function to count lines in files by extension
count_lines_by_extension() {
    local ext=$1
    # Use eval to properly handle the exclusions string
    eval "find . -type f -name \"*.$ext\" $EXCLUSIONS" | xargs cat 2>/dev/null | wc -l
}

# Function to count characters in files by extension
count_chars_by_extension() {
    local ext=$1
    # Use eval to properly handle the exclusions string
    eval "find . -type f -name \"*.$ext\" $EXCLUSIONS" | xargs cat 2>/dev/null | wc -c
}

# Function to calculate average lines per file
avg_lines_per_file() {
    local ext=$1
    local files=$(count_files_by_extension "$ext")
    local lines=$(count_lines_by_extension "$ext")
    
    if [ "$files" -eq 0 ]; then
        echo "0"
    else
        echo "scale=2; $lines / $files" | bc
    fi
}

# Function to find largest files by extension
largest_files_by_extension() {
    local ext=$1
    local limit=${2:-3}  # Default to top 3 files
    
    # Find files, get line counts, sort by size, take top N
    eval "find . -type f -name \"*.$ext\" $EXCLUSIONS" | while read file; do
        if [ -f "$file" ]; then
            lines=$(wc -l < "$file" 2>/dev/null || echo "0")
            echo "$lines $file"
        fi
    done | sort -rn | head -$limit
}

# Function to format numbers with commas
format_number() {
    # Use printf with awk instead of sed for better compatibility
    printf "%'d" "$1"
}

# Print file counts by type
echo -e "${BLUE}FILE COUNTS BY TYPE${NC}"
echo -e "--------------------------------"

# Define file extensions to analyze
extensions=("js" "html" "css" "py" "sh" "md" "json" "yml" "yaml")

# Count and display files by extension
for ext in "${extensions[@]}"; do
    count=$(count_files_by_extension "$ext")
    if [ "$count" -gt 0 ]; then
        echo -e ".$ext files: $(format_number $count)"
    fi
done

# Count total files (using gitignore exclusions)
total_files=$(eval "find . -type f $EXCLUSIONS" | wc -l)
echo -e "${YELLOW}Total files: $(format_number $total_files)${NC}"
echo ""

# Print line counts by type
echo -e "${BLUE}LINE COUNTS BY TYPE${NC}"
echo -e "--------------------------------"

# Count and display lines by extension
for ext in "${extensions[@]}"; do
    lines=$(count_lines_by_extension "$ext")
    if [ "$lines" -gt 0 ]; then
        echo -e ".$ext lines: $(format_number $lines)"
    fi
done

# Count total lines
total_lines=$(eval "find . -type f $EXCLUSIONS" | xargs cat 2>/dev/null | wc -l)
echo -e "${YELLOW}Total lines: $(format_number $total_lines)${NC}"
echo ""

# Print character counts by type
echo -e "${BLUE}CHARACTER COUNTS BY TYPE${NC}"
echo -e "--------------------------------"

# Count and display characters by extension
for ext in "${extensions[@]}"; do
    chars=$(count_chars_by_extension "$ext")
    if [ "$chars" -gt 0 ]; then
        echo -e ".$ext characters: $(format_number $chars)"
    fi
done

# Count total characters
total_chars=$(eval "find . -type f $EXCLUSIONS" | xargs cat 2>/dev/null | wc -c)
echo -e "${YELLOW}Total characters: $(format_number $total_chars)${NC}"
echo ""

# Print average lines per file
echo -e "${BLUE}AVERAGE LINES PER FILE${NC}"
echo -e "--------------------------------"

# Calculate and display average lines per file by extension
for ext in "${extensions[@]}"; do
    files=$(count_files_by_extension "$ext")
    if [ "$files" -gt 0 ]; then
        avg=$(avg_lines_per_file "$ext")
        echo -e ".$ext files: $avg lines/file"
    fi
done

# Calculate overall average
overall_avg=$(echo "scale=2; $total_lines / $total_files" | bc)
echo -e "${YELLOW}Overall average: $overall_avg lines/file${NC}"
echo ""

# Print largest files by type (refactoring candidates)
echo -e "${BLUE}LARGEST FILES BY TYPE (Refactoring Candidates)${NC}"
echo -e "------------------------------------------------"

# Show TEN largest JavaScript files (refactoring focus)
js_files=$(count_files_by_extension "js")
if [ "$js_files" -gt 0 ]; then
    echo -e "${YELLOW}TEN Largest JavaScript files (primary refactoring targets):${NC}"
    largest_files_by_extension "js" 10 | while read line_count file_path; do
        if [ -n "$line_count" ] && [ "$line_count" -gt 0 ]; then
            echo -e "  $(format_number $line_count) lines: $file_path"
        fi
    done
    echo ""
fi

# Show TEN largest Python files (refactoring focus)
py_files=$(count_files_by_extension "py")
if [ "$py_files" -gt 0 ]; then
    echo -e "${YELLOW}TEN Largest Python files (secondary refactoring targets):${NC}"
    largest_files_by_extension "py" 10 | while read line_count file_path; do
        if [ -n "$line_count" ] && [ "$line_count" -gt 0 ]; then
            echo -e "  $(format_number $line_count) lines: $file_path"
        fi
    done
    echo ""
fi

# Show aggregate metrics for other file types (no individual file listing)
for ext in "${extensions[@]}"; do
    if [ "$ext" != "js" ] && [ "$ext" != "py" ]; then
        files=$(count_files_by_extension "$ext")
        if [ "$files" -gt 0 ]; then
            lines=$(count_lines_by_extension "$ext")
            avg=$(avg_lines_per_file "$ext")
            echo -e "${YELLOW}.$ext files aggregate:${NC} $(format_number $files) files, $(format_number $lines) total lines, $avg avg lines/file"
        fi
    fi
done
echo ""

# MCP-specific metrics
echo -e "${BLUE}MCP INTEGRATION METRICS${NC}"
echo -e "--------------------------------"

# Count MCP-related files
mcp_js_files=$(eval "find . -type f -name \"*mcp*.js\" $EXCLUSIONS" | wc -l)
mcp_md_files=$(eval "find . -type f -name \"*mcp*.md\" -o -name \"*MCP*.md\" $EXCLUSIONS" | wc -l)
mcp_py_files=$(eval "find . -type f -name \"*mcp*.py\" $EXCLUSIONS" | wc -l)

echo -e "MCP JavaScript files: $(format_number $mcp_js_files)"
echo -e "MCP documentation files: $(format_number $mcp_md_files)"
echo -e "MCP Python files: $(format_number $mcp_py_files)"

# MCP stdio proxy metrics
mcp_proxy_files=$(find ./mcp-stdio-proxy -type f 2>/dev/null | wc -l)
echo -e "MCP stdio proxy files: $(format_number $mcp_proxy_files)"

# Total MCP files
total_mcp_files=$((mcp_js_files + mcp_md_files + mcp_py_files + mcp_proxy_files))
echo -e "${YELLOW}Total MCP-related files: $(format_number $total_mcp_files)${NC}"
echo ""

# Test metrics
echo -e "${BLUE}TEST METRICS${NC}"
echo -e "--------------------------------"

# Count playwright tests
playwright_tests=$(find ./_tests/playwright -name "test_*.py" | wc -l)
echo -e "Playwright tests: $(format_number $playwright_tests)"

# Count MCP-specific tests
mcp_test_files=$(find ./_tests/playwright -name "*mcp*" -type f | wc -l)
mcp_pytest_files=$(find ./_tests/playwright -name "test_mcp*.py" | wc -l)
echo -e "MCP test files (all): $(format_number $mcp_test_files)"
echo -e "MCP pytest files: $(format_number $mcp_pytest_files)"

# Count other test files
other_tests=$(find ./_tests -type f -name "*.test.*" -o -name "*-test.*" | wc -l)
echo -e "Other test files: $(format_number $other_tests)"

# Total test count
total_tests=$((playwright_tests + other_tests))
echo -e "${YELLOW}Total tests: $(format_number $total_tests)${NC}"

# Test coverage ratio (rough estimate)
js_files=$(count_files_by_extension "js")
test_coverage=$(echo "scale=2; $total_tests / $js_files * 100" | bc)
echo -e "Estimated test coverage: ${test_coverage}% (tests/js files ratio)"

# MCP test coverage
if [ "$js_files" -gt 0 ]; then
    mcp_coverage=$(echo "scale=2; $mcp_pytest_files / $mcp_js_files * 100" | bc)
    echo -e "MCP test coverage: ${mcp_coverage}% (MCP tests/MCP JS files ratio)"
fi
echo ""

# Directory size metrics
echo -e "${BLUE}DIRECTORY SIZE METRICS${NC}"
echo -e "--------------------------------"

# List top directories by file count
echo "Top directories by file count:"
eval "find . -type d $EXCLUSIONS" | while read dir; do
    count=$(eval "find \"$dir\" -type f $EXCLUSIONS" | wc -l)
    if [ "$count" -gt 0 ]; then
        echo "$count $dir"
    fi
done | sort -rn | head -10 | awk '{printf "  %s: %s files\n", $2, $1}'

echo ""

# Print footer
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}      END OF METRICS REPORT             ${NC}"
echo -e "${GREEN}=========================================${NC}"
