#!/bin/bash

echo "Testing hacka.re Rich TUI Mode"
echo "=============================="
echo ""
echo "This will launch the rich graphical TUI with:"
echo "  - Searchable menus with filtering"
echo "  - Number index (0-9) for quick selection"
echo "  - Arrow key navigation (↑/↓)"
echo "  - Info panel showing detailed descriptions"
echo "  - ESC to clear filter or exit"
echo ""
echo "Press Enter to continue..."
read

# Launch in rich mode
./hackare-tui -mode rich