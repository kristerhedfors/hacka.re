#!/bin/bash

# Setup script for hackare CLI environment
# Creates and configures a local .venv in hackare/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"

echo "🔧 Setting up hackare CLI environment..."

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
    echo "📦 Installing hackare requirements..."
    
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
    echo "📦 Installing hackare in development mode..."
    pip install -e "$SCRIPT_DIR"
fi

# Install development dependencies if requested
if [ "$1" == "--dev" ]; then
    echo "📦 Installing development dependencies..."
    pip install -e "$SCRIPT_DIR[dev]"
fi

# Copy .env.example if .env doesn't exist
if [ ! -f "$SCRIPT_DIR/.env" ] && [ -f "$SCRIPT_DIR/.env.example" ]; then
    echo "📋 Copying .env.example to .env..."
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    echo "⚠️  Please configure your API keys in $SCRIPT_DIR/.env"
fi

echo ""
echo "✅ hackare CLI environment setup complete!"
echo ""
echo "To activate the environment in a new terminal:"
echo "  source $VENV_DIR/bin/activate"
echo ""
echo "To use hackare CLI:"
echo "  $VENV_DIR/bin/hackare --help"
echo ""
echo "Or activate and run:"
echo "  source $VENV_DIR/bin/activate"
echo "  hackare --help"
echo ""