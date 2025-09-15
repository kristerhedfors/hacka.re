#!/bin/bash

echo "═══════════════════════════════════════════════════════"
echo "  Debug Arrow Keys in Settings"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "This will show detailed state information for each keypress"
echo ""

# Set debug logging
export HACKARE_LOG_LEVEL=DEBUG

# Run the CLI and filter for relevant debug info
./hacka.re 2>&1 | grep -E "\[STATE\]|\[ARROW-|\[MODEL-DROPDOWN\]|\[KEY\]|Moving selection:"

echo ""
echo "═══════════════════════════════════════════════════════"