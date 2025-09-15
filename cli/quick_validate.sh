#!/bin/bash

# Quick validation script for hacka.re CLI
# Run from cli directory to verify basic functionality

echo "=== CLI Quick Validation ==="
echo ""

# Check we're in the right directory
if [ ! -f "hacka.re" ]; then
    echo "❌ Error: hacka.re binary not found in current directory"
    echo "   Run from /Users/user/dev/hacka.re/cli/"
    exit 1
fi

# Check binary size
SIZE=$(ls -lh hacka.re | awk '{print $5}')
echo "Binary size: $SIZE"
if [[ $SIZE == *"M" ]]; then
    echo "✓ Binary has embedded ZIP"
else
    echo "⚠️  Binary seems small, may not have embedded ZIP"
fi
echo ""

# Test help commands
echo "Testing help commands..."
./hacka.re --help > /dev/null 2>&1 && echo "✓ Main help works" || echo "❌ Main help failed"
./hacka.re browse --help > /dev/null 2>&1 && echo "✓ Browse help works" || echo "❌ Browse help failed"
./hacka.re serve --help > /dev/null 2>&1 && echo "✓ Serve help works" || echo "❌ Serve help failed"
./hacka.re chat --help > /dev/null 2>&1 && echo "✓ Chat help works" || echo "❌ Chat help failed"
echo ""

# Test server startup (with timeout)
echo "Testing server startup..."
timeout 2 ./hacka.re serve -p 9999 > /dev/null 2>&1
if [ $? -eq 124 ]; then
    echo "✓ Server starts successfully (timeout expected)"
else
    echo "⚠️  Server may have issues"
fi

# Test port configuration
echo ""
echo "Testing port configuration..."
timeout 1 ./hacka.re browse -p 8888 --no-browser > /dev/null 2>&1
if [ $? -eq 124 ]; then
    echo "✓ Custom port accepted"
else
    echo "⚠️  Port configuration may have issues"
fi

# Test verbose flag
echo ""
echo "Testing verbose flags..."
./hacka.re serve --help 2>&1 | grep -q "\-v" && echo "✓ Verbose flag documented" || echo "❌ Verbose flag missing"
./hacka.re serve --help 2>&1 | grep -q "\-vv" && echo "✓ Very verbose flag documented" || echo "❌ Very verbose flag missing"

# Check for shared link support
echo ""
echo "Testing shared link support..."
./hacka.re browse --help 2>&1 | grep -q "URL\|FRAGMENT\|DATA" && echo "✓ Browse accepts shared links" || echo "❌ Browse shared links missing"
./hacka.re serve --help 2>&1 | grep -q "URL\|FRAGMENT\|DATA" && echo "✓ Serve accepts shared links" || echo "❌ Serve shared links missing"
./hacka.re chat --help 2>&1 | grep -q "URL\|FRAGMENT\|DATA" && echo "✓ Chat accepts shared links" || echo "❌ Chat shared links missing"

echo ""
echo "=== Validation Complete ==="
echo ""
echo "To run full tests:"
echo "  cd _tests"
echo "  source .venv/bin/activate"
echo "  ./run_quick_tests.sh"