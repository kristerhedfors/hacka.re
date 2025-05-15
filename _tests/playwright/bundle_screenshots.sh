#!/bin/bash

# Script to bundle screenshots, markdown files, and test results into a comprehensive report
# This script creates a markdown file that includes:
# 1. Screenshots and their associated markdown content
# 2. Test output results and stack traces in chronological order

# Directory containing screenshots and markdown files
SCREENSHOTS_DIR="videos"
# Output markdown file
OUTPUT_MD="test_results.md"

# Check if the screenshots directory exists
if [ ! -d "$SCREENSHOTS_DIR" ]; then
    echo "Warning: Screenshots directory '$SCREENSHOTS_DIR' not found. Creating it..."
    mkdir -p "$SCREENSHOTS_DIR"
fi

# Create the markdown file header
cat > "$OUTPUT_MD" << EOF
# Hacka.re Test Results

Generated: $(date "+%Y-%m-%d %H:%M:%S")

## Test Output

\`\`\`
$(cat test_output.log 2>/dev/null || echo "No test output log found.")
\`\`\`

## Screenshots and Debug Information

EOF

# Find all PNG files in the screenshots directory
PNG_FILES=$(find "$SCREENSHOTS_DIR" -name "*.png" | sort)

# Check if any PNG files were found
if [ -z "$PNG_FILES" ]; then
    # No screenshots found, add a message to the markdown
    cat >> "$OUTPUT_MD" << EOF
No screenshots found in '$SCREENSHOTS_DIR'.

Run your tests with the screenshot_with_markdown function to generate screenshots.
EOF
else
    # Process each PNG file
    for PNG_FILE in $PNG_FILES; do
        # Get the base name without extension
        BASE_NAME="${PNG_FILE%.png}"
        # Corresponding markdown file
        MD_FILE="${BASE_NAME}.md"
        
        # Get the file name without path
        FILE_NAME=$(basename "$PNG_FILE")
        
        # Add screenshot header
        echo "### Screenshot: $FILE_NAME" >> "$OUTPUT_MD"
        echo "" >> "$OUTPUT_MD"
        
        # Add the screenshot as a link
        echo "![Screenshot]($PNG_FILE)" >> "$OUTPUT_MD"
        echo "" >> "$OUTPUT_MD"
        
        # Check if the markdown file exists
        if [ -f "$MD_FILE" ]; then
            # Add the markdown content
            echo "#### Debug Information" >> "$OUTPUT_MD"
            echo "" >> "$OUTPUT_MD"
            cat "$MD_FILE" >> "$OUTPUT_MD"
            echo "" >> "$OUTPUT_MD"
        else
            # No markdown file found
            echo "No debug information available for this screenshot." >> "$OUTPUT_MD"
            echo "" >> "$OUTPUT_MD"
        fi
        
        # Add a separator
        echo "---" >> "$OUTPUT_MD"
        echo "" >> "$OUTPUT_MD"
    done
fi

echo "Markdown report generated: $OUTPUT_MD"
