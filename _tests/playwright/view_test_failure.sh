#!/bin/bash

# Script to view test failure artifacts together
# Usage: ./view_test_failure.sh [test_name]

echo "======================================"
echo "🔍 TEST FAILURE VIEWER"
echo "======================================"
echo ""

# Check if test name provided
if [ $# -eq 0 ]; then
    echo "Usage: ./view_test_failure.sh [test_name or screenshot_name]"
    echo ""
    echo "Recent test failures with artifacts:"
    echo ""
    
    # Find recent screenshots
    if [ -d "screenshots" ]; then
        echo "Recent screenshots (last 10):"
        ls -t screenshots/*.png 2>/dev/null | head -10 | while read -r file; do
            basename=$(basename "$file" .png)
            echo "  - $basename"
            
            # Check if corresponding metadata exists
            if [ -f "screenshots_data/${basename}.md" ]; then
                echo "    ✓ Has metadata"
            fi
            
            # Check if corresponding console log exists
            if [ -f "console_logs/${basename}.json" ]; then
                echo "    ✓ Has console log"
            fi
        done
    fi
    
    echo ""
    echo "To view a specific failure:"
    echo "  ./view_test_failure.sh <name>"
    exit 1
fi

TEST_NAME="$1"

# Remove .png extension if provided
TEST_NAME="${TEST_NAME%.png}"

echo "Searching for artifacts for: $TEST_NAME"
echo ""

# Find matching files
SCREENSHOT=""
METADATA=""
CONSOLE_LOG=""

# Search for screenshot
if [ -f "screenshots/${TEST_NAME}.png" ]; then
    SCREENSHOT="screenshots/${TEST_NAME}.png"
else
    # Try partial match
    SCREENSHOT=$(find screenshots -name "*${TEST_NAME}*.png" -type f | head -1)
fi

# Search for metadata
if [ -f "screenshots_data/${TEST_NAME}.md" ]; then
    METADATA="screenshots_data/${TEST_NAME}.md"
else
    # Try partial match
    METADATA=$(find screenshots_data -name "*${TEST_NAME}*.md" -type f | head -1)
fi

# Search for console log
if [ -f "console_logs/${TEST_NAME}.json" ]; then
    CONSOLE_LOG="console_logs/${TEST_NAME}.json"
else
    # Try partial match
    CONSOLE_LOG=$(find console_logs -name "*${TEST_NAME}*.json" -type f | head -1)
fi

# Display findings
echo "======================================"
echo "📁 ARTIFACTS FOUND:"
echo "======================================"

if [ -n "$SCREENSHOT" ]; then
    echo "✅ Screenshot: $SCREENSHOT"
else
    echo "❌ Screenshot: Not found"
fi

if [ -n "$METADATA" ]; then
    echo "✅ Metadata: $METADATA"
else
    echo "❌ Metadata: Not found"
fi

if [ -n "$CONSOLE_LOG" ]; then
    echo "✅ Console log: $CONSOLE_LOG"
else
    echo "❌ Console log: Not found"
fi

echo ""

# Display metadata if found
if [ -n "$METADATA" ] && [ -f "$METADATA" ]; then
    echo "======================================"
    echo "📝 METADATA CONTENT:"
    echo "======================================"
    cat "$METADATA"
    echo ""
fi

# Display console errors if found
if [ -n "$CONSOLE_LOG" ] && [ -f "$CONSOLE_LOG" ]; then
    echo "======================================"
    echo "🖥️ CONSOLE ERRORS:"
    echo "======================================"
    
    # Extract errors using Python
    python3 -c "
import json
import sys

try:
    with open('$CONSOLE_LOG', 'r') as f:
        data = json.load(f)
    
    print(f\"Total messages: {data.get('message_count', 0)}\")
    print(f\"Errors: {data.get('error_count', 0)}\")
    print(f\"Warnings: {data.get('warning_count', 0)}\")
    print()
    
    # Show errors
    errors = [m for m in data.get('messages', []) if m['type'] == 'error']
    if errors:
        print('ERROR MESSAGES:')
        for error in errors:
            print(f\"  [{error['timestamp']}] {error['text']}\")
            if error.get('location'):
                print(f\"    Location: {error['location']}\")
    
    # Show warnings
    warnings = [m for m in data.get('messages', []) if m['type'] == 'warning']
    if warnings:
        print()
        print('WARNING MESSAGES:')
        for warning in warnings[:5]:  # Show first 5 warnings
            print(f\"  [{warning['timestamp']}] {warning['text']}\")
    
except Exception as e:
    print(f'Error parsing console log: {e}')
"
    echo ""
fi

# Open screenshot if available
if [ -n "$SCREENSHOT" ] && [ -f "$SCREENSHOT" ]; then
    echo "======================================"
    echo "📸 OPENING SCREENSHOT..."
    echo "======================================"
    
    # Check OS and open appropriately
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$SCREENSHOT"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        xdg-open "$SCREENSHOT" 2>/dev/null || echo "Please open: $SCREENSHOT"
    else
        echo "Please open: $SCREENSHOT"
    fi
fi

echo ""
echo "💡 TIPS:"
echo "  - Check console errors for JavaScript issues"
echo "  - Review metadata for test context"
echo "  - Compare screenshot with expected state"
echo "  - Look for active modals that might block interactions"
echo ""