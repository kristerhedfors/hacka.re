#!/bin/bash

# Build hacka.re CLI with embedded web assets (as ZIP)
# This creates a single binary with the web interface embedded as a ZIP file

set -e

# Get script directory and paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "╔════════════════════════════════════════════╗"
echo "║   Building hacka.re CLI with embedded ZIP  ║"
echo "╚════════════════════════════════════════════╝"
echo

cd "$SCRIPT_DIR"

# Step 1: Build/update the release ZIP using the main project script
echo "Step 1: Building release ZIP..."
cd "$PROJECT_ROOT"
./scripts/build-release-zip.sh
cd "$SCRIPT_DIR"

# Step 2: Copy the latest ZIP to the web package for embedding
echo "Step 2: Copying release ZIP for embedding..."
cp "$PROJECT_ROOT/releases/hacka-re-latest.zip" "internal/web/hacka.re-release.zip"
ZIP_SIZE=$(ls -lh internal/web/hacka.re-release.zip | awk '{print $5}')
echo "ZIP file ready for embedding: $ZIP_SIZE"
echo

# Step 3: Build the Go binary with embedded ZIP
echo "Step 3: Building Go binary with embedded ZIP..."

# Build for current platform with optimizations
go build -o hacka.re -ldflags="-s -w" ./cmd/hacka.re

# Get binary size
BINARY_SIZE=$(ls -lh hacka.re | awk '{print $5}')

echo
echo "✅ Build complete!"
echo "📁 Binary: ./hacka.re"
echo "📊 Size: $BINARY_SIZE"
echo
echo "Usage:"
echo "  ./hacka.re browse           # Start web server on port 8080"
echo "  ./hacka.re browse -p 3000   # Start on custom port"
echo "  ./hacka.re --chat           # Start chat session"
echo "  ./hacka.re --help           # Show all options"
echo
echo "Environment Variables:"
echo "  HACKARE_BROWSE_PORT=8080    # Default port for browse command"