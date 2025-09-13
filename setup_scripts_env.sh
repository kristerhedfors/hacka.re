#!/bin/bash

# Setup script for project utility scripts environment
# Creates and configures a .venv in project root for scripts/ directory

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"

echo "🔧 Setting up environment for project utility scripts..."

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

# Install requirements for scripts
if [ -f "$SCRIPT_DIR/requirements-scripts.txt" ]; then
    echo "📦 Installing script requirements..."
    
    pip install -r "$SCRIPT_DIR/requirements-scripts.txt" || {
        echo "⚠️  Some packages failed to install"
        echo "📦 Attempting to install packages individually..."
        while read -r line; do
            if [[ ! "$line" =~ ^# ]] && [[ -n "$line" ]]; then
                pip install "$line" 2>/dev/null || echo "⚠️  Failed: $line"
            fi
        done < "$SCRIPT_DIR/requirements-scripts.txt"
    }
else
    echo "⚠️  No requirements-scripts.txt found"
fi

# Create .env.example for scripts if it doesn't exist
if [ ! -f "$SCRIPT_DIR/.env.example" ]; then
    cat > "$SCRIPT_DIR/.env.example" << 'EOF'
# Environment variables for project utility scripts

# OpenAI API Configuration (for embedding generation scripts)
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Custom API endpoints
# OPENAI_BASE_URL=https://api.openai.com/v1

# Optional: Debug mode for scripts
# DEBUG=false
EOF
    echo "📋 Created .env.example for scripts"
fi

# Copy .env.example if .env doesn't exist
if [ ! -f "$SCRIPT_DIR/.env" ] && [ -f "$SCRIPT_DIR/.env.example" ]; then
    echo "📋 Copying .env.example to .env..."
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    echo "⚠️  Please configure your API keys in $SCRIPT_DIR/.env"
fi

echo ""
echo "✅ Script environment setup complete!"
echo ""
echo "To activate the environment in a new terminal:"
echo "  source $VENV_DIR/bin/activate"
echo ""
echo "To run a script:"
echo "  python scripts/generate_embeddings.py"
echo ""