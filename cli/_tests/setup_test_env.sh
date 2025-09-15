#!/bin/bash

# Set up Python virtual environment for CLI tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Setting up CLI test environment..."

# Create virtual environment if it doesn't exist
if [ ! -d "$SCRIPT_DIR/.venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$SCRIPT_DIR/.venv"
fi

# Activate and install requirements
echo "Installing requirements..."
source "$SCRIPT_DIR/.venv/bin/activate"
pip install --upgrade pip
pip install -r "$SCRIPT_DIR/requirements.txt"

# Install playwright browsers if needed
if command -v playwright &> /dev/null; then
    echo "Installing Playwright browsers..."
    playwright install chromium
fi

echo "Setup complete!"
echo ""
echo "To run tests:"
echo "  cd $SCRIPT_DIR"
echo "  source .venv/bin/activate"
echo "  ./run_cli_tests.sh"