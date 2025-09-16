#!/bin/bash

# Test script for socket mode

echo "Testing hacka.re TUI Socket Mode"
echo "================================"
echo ""
echo "This will simulate various inputs to test the socket mode."
echo ""

# Create a test input file
cat > test_input.txt << EOF
/help
/status
Hello, this is a test message
/settings
/history
/clear
/mode
/exit
EOF

echo "Running with test input..."
echo ""

# Run the TUI with socket mode and feed it test input
./hackare-tui -mode socket < test_input.txt

echo ""
echo "Test complete!"