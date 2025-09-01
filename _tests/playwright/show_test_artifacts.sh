#!/bin/bash

# Test Artifacts Location Script
# This script shows where all test artifacts are stored and provides quick access

echo "======================================"
echo "🔍 TEST ARTIFACTS LOCATION GUIDE"
echo "======================================"
echo ""
echo "📁 DIRECTORY STRUCTURE:"
echo "  _tests/playwright/"
echo "  ├── screenshots/           # Test failure screenshots"
echo "  ├── screenshots_data/      # Screenshot metadata (markdown)"
echo "  ├── console_logs/          # Browser console output"
echo "  ├── test_output.log        # Latest test run output"
echo "  ├── run_*.out             # Test script outputs"
echo "  └── *.log                 # Individual test logs"
echo ""
echo "======================================"
echo "📸 SCREENSHOTS:"
echo "======================================"
SCREENSHOT_DIR="screenshots"
echo "Location: $(pwd)/$SCREENSHOT_DIR"
echo ""
if [ -d "$SCREENSHOT_DIR" ]; then
    SCREENSHOT_COUNT=$(find "$SCREENSHOT_DIR" -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
    echo "Total screenshots: $SCREENSHOT_COUNT"
    echo ""
    echo "Latest 5 screenshots:"
    ls -lat "$SCREENSHOT_DIR"/*.png 2>/dev/null | head -5 | while read -r line; do
        echo "  $line"
    done
else
    echo "⚠️  Screenshot directory not found!"
fi

echo ""
echo "======================================"
echo "📝 SCREENSHOT METADATA:"
echo "======================================"
METADATA_DIR="screenshots_data"
echo "Location: $(pwd)/$METADATA_DIR"
echo ""
if [ -d "$METADATA_DIR" ]; then
    METADATA_COUNT=$(find "$METADATA_DIR" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    echo "Total metadata files: $METADATA_COUNT"
    echo ""
    echo "Latest 5 metadata files:"
    ls -lat "$METADATA_DIR"/*.md 2>/dev/null | head -5 | while read -r line; do
        echo "  $line"
    done
else
    echo "⚠️  Metadata directory not found!"
fi

echo ""
echo "======================================"
echo "🖥️ CONSOLE LOGS:"
echo "======================================"
CONSOLE_DIR="console_logs"
echo "Location: $(pwd)/$CONSOLE_DIR"
echo ""
if [ -d "$CONSOLE_DIR" ]; then
    CONSOLE_COUNT=$(find "$CONSOLE_DIR" -name "*.log" 2>/dev/null | wc -l | tr -d ' ')
    echo "Total console logs: $CONSOLE_COUNT"
    echo ""
    echo "Latest 5 console logs:"
    ls -lat "$CONSOLE_DIR"/*.log 2>/dev/null | head -5 | while read -r line; do
        echo "  $line"
    done
else
    echo "⚠️  Console logs directory not found - creating it..."
    mkdir -p "$CONSOLE_DIR"
    echo "✅ Created: $(pwd)/$CONSOLE_DIR"
fi

echo ""
echo "======================================"
echo "📊 TEST OUTPUT LOGS:"
echo "======================================"
TEST_LOG_DIR="."
echo "Location: $(pwd)"
echo ""
echo "Latest test outputs:"
ls -lat "$TEST_LOG_DIR"/*.out "$TEST_LOG_DIR"/*.log 2>/dev/null | head -10 | while read -r line; do
    echo "  $line"
done

echo ""
echo "======================================"
echo "🔧 HELPER COMMANDS:"
echo "======================================"
echo "View latest screenshot:"
echo "  open $SCREENSHOT_DIR/\$(ls -t $SCREENSHOT_DIR/*.png | head -1)"
echo ""
echo "View latest console log:"
echo "  cat $CONSOLE_DIR/\$(ls -t $CONSOLE_DIR/*.log | head -1)"
echo ""
echo "View test output:"
echo "  cat test_output.log"
echo ""
echo "Search for failures:"
echo "  grep -n FAILED test_output.log"
echo ""
echo "View screenshot with metadata:"
echo "  ./view_test_failure.sh <screenshot_name>"
echo ""
echo "======================================"
echo "💡 TIPS:"
echo "======================================"
echo "1. Always check console logs for JavaScript errors"
echo "2. Screenshots show the exact state at failure"
echo "3. Metadata files contain debug context"
echo "4. Use 'tail -f' to watch logs in real-time"
echo "5. Failed tests generate both screenshot + metadata"
echo ""
echo "======================================"