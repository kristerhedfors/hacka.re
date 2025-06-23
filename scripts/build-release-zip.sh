#!/bin/bash

# Build Release ZIP Script
# Generates a ZIP file containing all essential hacka.re files for local deployment

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Output directory and filename
OUTPUT_DIR="$PROJECT_ROOT/releases"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
ZIP_FILE="$OUTPUT_DIR/hacka-re-${TIMESTAMP}.zip"

echo "Building hacka.re release ZIP..."
echo "Project root: $PROJECT_ROOT"
echo "Output file: $ZIP_FILE"

# Create temporary directory for files to zip
TEMP_DIR=$(mktemp -d)
echo "Temporary directory: $TEMP_DIR"

# Copy essential files to temp directory
echo "Copying essential files..."

# Main files
cp index.html "$TEMP_DIR/"
cp README.md "$TEMP_DIR/"
cp LICENSE "$TEMP_DIR/"
cp CLAUDE.md "$TEMP_DIR/"

# JavaScript files
mkdir -p "$TEMP_DIR/js"
cp js/app.js "$TEMP_DIR/js/"
cp js/script.js "$TEMP_DIR/js/"
cp js/themes.js "$TEMP_DIR/js/"
cp js/button-tooltips.js "$TEMP_DIR/js/"
cp js/copy-code.js "$TEMP_DIR/js/"
cp js/default-functions-tooltip.js "$TEMP_DIR/js/"
cp js/function-tooltip.js "$TEMP_DIR/js/"
cp js/link-sharing-tooltip.js "$TEMP_DIR/js/"
cp js/logo-animation.js "$TEMP_DIR/js/"
cp js/logo-tooltip.js "$TEMP_DIR/js/"
cp js/logo-typewriter.js "$TEMP_DIR/js/"
cp js/mobile-utils.js "$TEMP_DIR/js/"
cp js/modal-effects.js "$TEMP_DIR/js/"
cp js/settings-tooltip.js "$TEMP_DIR/js/"

# Copy entire subdirectories
cp -r js/components "$TEMP_DIR/js/"
cp -r js/config "$TEMP_DIR/js/"
cp -r js/services "$TEMP_DIR/js/"
cp -r js/utils "$TEMP_DIR/js/"
cp -r js/default-functions "$TEMP_DIR/js/"
cp -r js/default-prompts "$TEMP_DIR/js/"
cp -r js/plugins "$TEMP_DIR/js/"

# CSS files
cp -r css "$TEMP_DIR/"

# Library files
cp -r lib "$TEMP_DIR/"

# About pages (useful for local users)
cp -r about "$TEMP_DIR/"

# Create installation instructions
cat > "$TEMP_DIR/INSTALLATION.md" << 'EOF'
# hacka.re - Local Installation

## Quick Start

1. **Extract files**: Unzip all files to any directory on your computer
2. **Open in browser**: Double-click `index.html` or open it in any web browser
3. **Configure API**: Click the settings gear icon and enter your API details
4. **For Local LLMs**: See `about/local-llm-toolbox.html` for setup guides

## What's Included

- Complete hacka.re application (no internet required after setup)
- All JavaScript modules and services  
- CSS stylesheets and themes
- Local libraries (Font Awesome, syntax highlighting, etc.)
- Documentation and Local LLM setup guides

## Local LLM Setup

For complete privacy, combine with local LLMs:
- **Ollama**: `http://localhost:11434/v1/chat/completions`
- **LM Studio**: `http://localhost:1234/v1/chat/completions`
- **GPT4All**: `http://localhost:4891/v1/chat/completions`

See `about/local-llm-toolbox.html` for detailed setup instructions.

## Privacy & Security

- No backend server required
- All data stays in your browser's local storage
- Compatible with air-gapped systems when using local LLMs
- Encrypted storage for sensitive data

Generated: $(date)
EOF

# Create the ZIP file
echo "Creating ZIP file..."
cd "$TEMP_DIR"
zip -r "$ZIP_FILE" . -x "*.DS_Store" "*/.*" > /dev/null

# Clean up
rm -rf "$TEMP_DIR"

# Get file size
FILE_SIZE=$(ls -lh "$ZIP_FILE" | awk '{print $5}')
FILE_COUNT=$(unzip -l "$ZIP_FILE" | tail -n 1 | awk '{print $2}')

echo ""
echo "✅ Release ZIP created successfully!"
echo "📁 File: $ZIP_FILE"
echo "📊 Size: $FILE_SIZE"
echo "📄 Files: $FILE_COUNT"
echo ""
echo "🚀 To use:"
echo "   1. Distribute the ZIP file"
echo "   2. Users extract and open index.html"
echo "   3. No server setup required!"
echo ""

# Create latest symlink
cd "$OUTPUT_DIR"
ln -sf "$(basename "$ZIP_FILE")" "hacka-re-latest.zip"
echo "📎 Latest release symlink created: releases/hacka-re-latest.zip"