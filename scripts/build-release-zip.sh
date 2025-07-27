#!/bin/bash

# Build Release ZIP Script
# Generates a ZIP file containing all essential hacka.re files for local deployment

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Output directory and filename with timestamp
OUTPUT_DIR="$PROJECT_ROOT/releases"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M)
TIMESTAMPED_ZIP="$OUTPUT_DIR/hacka-re-$TIMESTAMP.zip"
LATEST_ZIP="$OUTPUT_DIR/hacka-re-latest.zip"

echo "Building hacka.re release ZIP..."
echo "Project root: $PROJECT_ROOT"
echo "Timestamped file: $TIMESTAMPED_ZIP"
echo "Latest link: $LATEST_ZIP"

# Create temporary directory for files to zip
TEMP_DIR=$(mktemp -d)
echo "Temporary directory: $TEMP_DIR"

# Copy essential files to temp directory
echo "Copying essential files..."

# Main files
cp index.html "$TEMP_DIR/"
cp LICENSE "$TEMP_DIR/"

# JavaScript files (only copy existing files)
mkdir -p "$TEMP_DIR/js"
for file in app.js script.js themes.js button-tooltips.js copy-code.js default-functions-tooltip.js function-tooltip.js link-sharing-tooltip.js logo-animation.js mobile-utils.js modal-effects.js settings-tooltip.js ascii-tree-menu.js; do
    if [ -f "js/$file" ]; then
        cp "js/$file" "$TEMP_DIR/js/"
    fi
done

# Copy entire subdirectories (only existing ones)
for dir in components services utils default-functions default-prompts plugins providers; do
    if [ -d "js/$dir" ]; then
        cp -r "js/$dir" "$TEMP_DIR/js/"
    fi
done

# CSS files
cp -r css "$TEMP_DIR/"

# Library files
cp -r lib "$TEMP_DIR/"

# About pages (useful for local users)
cp -r about "$TEMP_DIR/"

# No installation file created - users can refer to the about pages

# Create the timestamped ZIP file
echo "Creating timestamped ZIP file..."
cd "$TEMP_DIR"
zip -r "$TIMESTAMPED_ZIP" . -x "*.DS_Store" "*/.*" > /dev/null

# Create/update the latest link
echo "Creating latest link..."
cd "$OUTPUT_DIR"
rm -f "hacka-re-latest.zip"
cp "$(basename "$TIMESTAMPED_ZIP")" "hacka-re-latest.zip"

# Clean up
rm -rf "$TEMP_DIR"

# Get file size
TIMESTAMPED_SIZE=$(ls -lh "$TIMESTAMPED_ZIP" | awk '{print $5}')
FILE_COUNT=$(unzip -l "$TIMESTAMPED_ZIP" | tail -n 1 | awk '{print $2}')

echo ""
echo "✅ Release ZIP created successfully!"
echo "📁 Timestamped: $TIMESTAMPED_ZIP"
echo "📁 Latest link: $LATEST_ZIP"
echo "📊 Size: $TIMESTAMPED_SIZE"
echo "📄 Files: $FILE_COUNT"
echo ""
echo "🚀 To use:"
echo "   1. Distribute the ZIP file"
echo "   2. Users extract and open index.html"
echo "   3. No server setup required!"
echo ""