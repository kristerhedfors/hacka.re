#!/bin/bash

# Setup script for Playwright tests environment
# Creates and configures a local .venv in _tests/playwright/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"

echo "🔧 Setting up Playwright tests environment..."

# Create virtual environment
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating virtual environment at $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
else
    echo "✅ Virtual environment already exists at $VENV_DIR"
fi

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install requirements
if [ -f "$SCRIPT_DIR/requirements.txt" ]; then
    echo "📦 Installing test requirements..."
    
    pip install -r "$SCRIPT_DIR/requirements.txt" || {
        echo "⚠️  Some packages failed to install"
        echo "📦 Attempting to install packages individually..."
        while read -r line; do
            if [[ ! "$line" =~ ^# ]] && [[ -n "$line" ]]; then
                pip install "$line" 2>/dev/null || echo "⚠️  Failed: $line"
            fi
        done < "$SCRIPT_DIR/requirements.txt"
    }
else
    echo "⚠️  No requirements.txt found, skipping package installation"
fi

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
playwright install

# Copy .env.example if .env doesn't exist
if [ ! -f "$SCRIPT_DIR/.env" ] && [ -f "$SCRIPT_DIR/.env.example" ]; then
    echo "📋 Copying .env.example to .env..."
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    echo "⚠️  Please configure your API keys in $SCRIPT_DIR/.env"
fi

echo ""
echo "✅ Playwright tests environment setup complete!"
echo ""
echo "To activate the environment in a new terminal:"
echo "  cd $SCRIPT_DIR && source .venv/bin/activate"
echo ""
echo "To run tests from project root:"
echo "  $SCRIPT_DIR/.venv/bin/python -m pytest $SCRIPT_DIR/test_*.py -v"
echo ""
echo "Or activate and run:"
echo "  source $SCRIPT_DIR/.venv/bin/activate"
echo "  cd $SCRIPT_DIR && python -m pytest test_*.py -v"
echo ""