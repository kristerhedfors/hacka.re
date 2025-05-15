#!/bin/bash

# Unified script to bundle test output and screenshots into a comprehensive markdown report
# This script creates a markdown file that includes:
# 1. Test output from the specified log file
# 2. Screenshots and their associated markdown content
#
# Usage: 
#   Without arguments: ./bundle_test_results.sh 
#     (Uses default files: test_output.log -> test_results.md and run_tests.out -> run_tests.out_bundle.md)
#   With arguments: ./bundle_test_results.sh <input_log_file> <output_markdown_file>

# Default files
DEFAULT_INPUT_LOGS=("test_output.log" "run_tests.out")
DEFAULT_OUTPUT_MDS=("test_results.md" "run_tests.out_bundle.md")

# Function to process a single input/output pair
process_log_file() {
    local input_log="$1"
    local output_md="$2"
    
    # Check if the output file already exists and has been modified after the input log
    if [ -f "$output_md" ] && [ -f "$input_log" ]; then
        input_mod_time=$(stat -f "%m" "$input_log")
        output_mod_time=$(stat -f "%m" "$output_md")
        
        if [ "$output_mod_time" -gt "$input_mod_time" ]; then
            echo "Warning: Output file '$output_md' is newer than input file '$input_log'."
            echo "This suggests the bundle has already been generated for this test run."
            echo "To regenerate, delete '$output_md' first."
            return 1
        fi
    fi
    
    # Check if the input log file exists
    if [ ! -f "$input_log" ]; then
        echo "Warning: Input log file '$input_log' not found. Proceeding without test output."
        LOG_CONTENT="No test output log found."
    else
        LOG_CONTENT=$(cat "$input_log")
    fi
    
    echo "Generating markdown report for '$input_log' -> '$output_md'..."
    
    # Create the markdown file header
    cat > "$output_md" << EOF
# Hacka.re Test Results

Generated: $(date "+%Y-%m-%d %H:%M:%S")

## Test Output

\`\`\`
$LOG_CONTENT
\`\`\`

## Screenshots and Debug Information

EOF
    
    # Find all PNG files in the screenshots directory
    PNG_FILES=$(find "$SCREENSHOTS_DIR" -name "*.png" | sort)
    
    # Check if any PNG files were found
    if [ -z "$PNG_FILES" ]; then
        # No screenshots found, add a message to the markdown
        cat >> "$output_md" << EOF
No screenshots found in '$SCREENSHOTS_DIR'.

Run your tests with the screenshot_with_markdown function to generate screenshots.
EOF
    else
        # Process each PNG file
        for PNG_FILE in $PNG_FILES; do
            # Get the base name without extension
            BASE_NAME="${PNG_FILE%.png}"
            # Get just the filename without path or extension
            FILE_NAME_NO_EXT=$(basename "$BASE_NAME")
            
            # Corresponding markdown file in the screenshots_data directory
            MD_FILE="${SCREENSHOTS_DATA_DIR}/$(basename "$PNG_FILE" .png).md"
            
            # Get the file name without path
            FILE_NAME=$(basename "$PNG_FILE")
            
            # Add screenshot header
            echo "### Screenshot: $FILE_NAME" >> "$output_md"
            echo "" >> "$output_md"
            
            # Add the screenshot as a link
            echo "![Screenshot]($PNG_FILE)" >> "$output_md"
            echo "" >> "$output_md"
            
            # Check if the markdown file exists
            if [ -f "$MD_FILE" ]; then
                # Add the markdown content
                echo "#### Debug Information" >> "$output_md"
                echo "" >> "$output_md"
                cat "$MD_FILE" >> "$output_md"
                echo "" >> "$output_md"
            else
                # No markdown file found
                echo "No debug information available for this screenshot." >> "$output_md"
                echo "" >> "$output_md"
            fi
            
            # Add a separator
            echo "---" >> "$output_md"
            echo "" >> "$output_md"
        done
    fi
    
    echo "Markdown report generated: $output_md"
    echo "You can view it with: glow -p $output_md"
    return 0
}

# No force mode - just warn and exit if files are newer

# Input and output files
if [ $# -ge 2 ]; then
    # Use provided arguments
    INPUT_LOG="$1"
    OUTPUT_MD="$2"
else
    # No arguments provided, use defaults
    echo "No arguments provided. Using default files."
fi

# Directory containing screenshots and their associated markdown files
SCREENSHOTS_DIR="screenshots"
SCREENSHOTS_DATA_DIR="screenshots_data"

# Check if the screenshots directories exist
if [ ! -d "$SCREENSHOTS_DIR" ]; then
    echo "Warning: Screenshots directory '$SCREENSHOTS_DIR' not found. Creating it..."
    mkdir -p "$SCREENSHOTS_DIR"
fi

if [ ! -d "$SCREENSHOTS_DATA_DIR" ]; then
    echo "Warning: Screenshots data directory '$SCREENSHOTS_DATA_DIR' not found. Creating it..."
    mkdir -p "$SCREENSHOTS_DATA_DIR"
fi

# Process files based on arguments
if [ $# -ge 2 ]; then
    # Process the specified input/output pair
    process_log_file "$INPUT_LOG" "$OUTPUT_MD" || exit 1
else
    # Process default files
    echo "Processing default files..."
    for i in "${!DEFAULT_INPUT_LOGS[@]}"; do
        process_log_file "${DEFAULT_INPUT_LOGS[$i]}" "${DEFAULT_OUTPUT_MDS[$i]}" || exit 1
    done
fi
