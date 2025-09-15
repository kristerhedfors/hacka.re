#!/bin/bash

echo "=========================================="
echo "  MONITORING MENU TRACE"
echo "=========================================="
echo ""
echo "This will show EXACTLY what's happening:"
echo "  - When HandleInput is called"
echo "  - When selectedIdx changes"
echo "  - When Draw() is called"
echo "  - When Show() is called"
echo ""
echo "1. Start ./hacka.re in another terminal"
echo "2. Press 0 for settings"
echo "3. Press arrow keys"
echo "4. Watch the trace below:"
echo ""
echo "Waiting for trace file..."

# Wait for file to exist
while [ ! -f /tmp/menu_trace.log ]; do
  sleep 0.5
done

echo "Trace started! Watching for updates..."
echo "=========================================="

# Monitor the file
tail -f /tmp/menu_trace.log