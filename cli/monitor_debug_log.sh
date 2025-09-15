#!/bin/bash

echo "═══════════════════════════════════════════════════════"
echo "  Real-time Debug Log Monitor"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "This script monitors the debug log while you use the CLI"
echo ""
echo "Usage:"
echo "  1. Run this script in one terminal"
echo "  2. Run './hacka.re' in another terminal"
echo "  3. Watch debug events appear here in real-time"
echo ""

# Enable debug logging
export HACKARE_LOG_LEVEL=DEBUG

# Find or wait for the latest log file
LOG_DIR="/tmp"
LOG_PREFIX="debug_"

echo "Waiting for debug log to be created..."
echo "(Start ./hacka.re in another terminal with HACKARE_LOG_LEVEL=DEBUG)"
echo ""

# Wait for a log file to appear
while true; do
    LATEST_LOG=$(ls -t ${LOG_DIR}/${LOG_PREFIX}*.log 2>/dev/null | head -1)
    if [ -n "$LATEST_LOG" ]; then
        echo "Found log file: $LATEST_LOG"
        echo "─────────────────────────────────────────────────────"
        echo ""
        echo "Monitoring (filtered for key events)..."
        echo ""

        # Tail the log and filter for important events
        tail -f "$LATEST_LOG" | grep --line-buffered -E "\[STATE\]|\[ARROW|\[KEY\]|Moving selection:|Settings modal|ESC pressed|\[MODEL-DROPDOWN\]"
        break
    fi
    sleep 1
done