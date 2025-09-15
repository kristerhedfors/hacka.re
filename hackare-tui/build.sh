#!/bin/bash

# Build script for hacka.re TUI

set -e

echo "Building hacka.re TUI..."

# Get dependencies
go mod tidy

# Build the binary
go build -o hackare-tui cmd/tui/main.go

echo "Build complete! Run ./hackare-tui to start."
echo ""
echo "Usage:"
echo "  ./hackare-tui           # Auto-detect best mode"
echo "  ./hackare-tui -mode socket  # Force socket mode"
echo "  ./hackare-tui -mode rich    # Force rich TUI mode"
echo "  ./hackare-tui -debug        # Enable debug output"