#!/bin/bash

# Fixed log path
LOG_FILE="/tmp/hacka_debug.log"

if [ ! -f "$LOG_FILE" ]; then
    echo "No log file found at $LOG_FILE"
    echo "Make sure to run with: export HACKARE_LOG_LEVEL=DEBUG"
    exit 1
fi

echo "════════════════════════════════════════════════════════"
echo "  HACKA.RE DEBUG LOG"
echo "════════════════════════════════════════════════════════"
echo ""

# Show only the most recent session
LAST_SESSION=$(grep -n "NEW SESSION STARTED" "$LOG_FILE" | tail -1 | cut -d: -f1)

if [ -n "$LAST_SESSION" ]; then
    echo "Showing latest session (from line $LAST_SESSION):"
    echo "────────────────────────────────────────────────────────"
    tail -n +$LAST_SESSION "$LOG_FILE"
else
    echo "Showing full log:"
    echo "────────────────────────────────────────────────────────"
    cat "$LOG_FILE"
fi