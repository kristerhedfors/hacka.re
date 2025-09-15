#!/bin/bash

echo "=========================================="
echo "  VISUAL UPDATE DEBUG TEST"
echo "=========================================="
echo ""
echo "This will track EXACTLY when visuals update:"
echo "  - When selectedIdx changes"
echo "  - When Draw() is called"
echo "  - What item shows as selected"
echo "  - When info panel updates"
echo ""
echo "TEST:"
echo "  1. Press 0 for settings"
echo "  2. Press DOWN arrow ONCE"
echo "  3. Check if visual updated"
echo "  4. Press DOWN arrow again"
echo "  5. Check if visual updated"
echo "  6. Press ESC"
echo ""
echo "Log: /tmp/hacka_visual.log"
echo ""
echo "Press Enter to start..."
read

# Clear log
> /tmp/hacka_visual.log

# Use specific log file
export HACKARE_LOG_LEVEL=DEBUG
export HACKARE_LOG_FILE=/tmp/hacka_visual.log

# Run
./hacka.re

echo ""
echo "=========================================="
echo "  ANALYSIS"
echo "=========================================="
echo ""
echo "Checking selectedIdx changes vs Draw calls:"
echo ""
grep -E "selectedIdx|Draw\(\) CALLED|IS SELECTED|Info panel drawn" /tmp/hacka_visual.log | tail -40

echo ""
echo "To see full sequence:"
echo "  grep -E 'Event.*received|selectedIdx|CALLED|IS SELECTED' /tmp/hacka_visual.log"