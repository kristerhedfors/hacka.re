#!/bin/bash

# Prepare Release Script
# Builds ZIP file and updates any release-related files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Preparing hacka.re release..."

# Build the ZIP file
echo "📦 Building release ZIP..."
"$SCRIPT_DIR/build-release-zip.sh"

# Get the latest ZIP info
RELEASES_DIR="$PROJECT_ROOT/releases"
LATEST_ZIP=$(ls -t "$RELEASES_DIR"/hacka-re-*.zip | head -n 1)
ZIP_SIZE=$(ls -lh "$LATEST_ZIP" | awk '{print $5}')
ZIP_COUNT=$(unzip -l "$LATEST_ZIP" | tail -n 1 | awk '{print $2}')

echo ""
echo "✅ Release preparation complete!"
echo "📁 Latest ZIP: $(basename "$LATEST_ZIP")"
echo "📊 Size: $ZIP_SIZE"
echo "📄 Files: $ZIP_COUNT"
echo ""
echo "🔗 Download link updated in:"
echo "   - about/local-llm-toolbox.html"
echo ""
echo "📋 Next steps:"
echo "   1. Test the download link works"
echo "   2. Verify extracted files run correctly"
echo "   3. Commit and push changes"
echo "   4. Tag the release if desired"
echo ""