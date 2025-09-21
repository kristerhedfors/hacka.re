#!/bin/bash

# Test script for granular offline mode controls

echo "=== Testing Granular Offline Mode Controls ==="
echo

# Test 1: Basic offline mode blocks all external requests
echo "Test 1: Basic offline mode (blocks all external)"
output=$(env HACKARE_BASE_URL=https://api.openai.com/v1 ../hacka.re --offline 2>&1)
if echo "$output" | grep -q "Configuration Conflict"; then
    echo "✓ Basic offline mode blocks external API"
else
    echo "✗ Basic offline mode doesn't block external API"
fi
echo

# Test 2: Allow remote MCP flag
echo "Test 2: --allow-remote-mcp flag presence"
output=$(../hacka.re --offline --allow-remote-mcp --help 2>&1)
if echo "$output" | grep -q "allow-remote-mcp"; then
    echo "✓ --allow-remote-mcp flag is recognized"
else
    echo "✗ --allow-remote-mcp flag not found"
fi
echo

# Test 3: Allow remote embeddings flag
echo "Test 3: --allow-remote-embeddings flag presence"
output=$(../hacka.re --offline --allow-remote-embeddings --help 2>&1)
if echo "$output" | grep -q "allow-remote-embeddings"; then
    echo "✓ --allow-remote-embeddings flag is recognized"
else
    echo "✗ --allow-remote-embeddings flag not found"
fi
echo

# Test 4: Both flags together
echo "Test 4: Both remote allowance flags together"
# This should not cause an error, just try to start offline mode
output=$(../hacka.re --offline --allow-remote-mcp --allow-remote-embeddings 2>&1 | head -5)
if echo "$output" | grep -q "offline mode"; then
    echo "✓ Both flags can be used together"
else
    echo "✗ Flags conflict or error occurred"
fi
echo

# Test 5: Verify help text shows new options
echo "Test 5: Help text includes new options"
../hacka.re --offline --help 2>&1 | grep -E "(allow-remote-mcp|allow-remote-embeddings)" > /dev/null
if [ $? -eq 0 ]; then
    echo "✓ Help text shows remote allowance options"
else
    echo "✗ Help text missing remote allowance options"
fi
echo

echo "=== Test Summary ==="
echo "The granular offline mode should:"
echo "1. Block ALL external requests by default in offline mode"
echo "2. Allow selective remote access for MCP with --allow-remote-mcp"
echo "3. Allow selective remote access for embeddings with --allow-remote-embeddings"
echo "4. Keep LLM requests always local regardless of flags"
echo
echo "Request type detection:"
echo "- URLs with '/embeddings' → Embeddings request"
echo "- URLs with '/mcp', '/tools', '/functions' → MCP request"
echo "- All other URLs → LLM request (must be local)"
echo
echo "Note: Actual validation occurs when making API requests."