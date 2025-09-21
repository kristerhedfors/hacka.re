#!/bin/bash

# Test script for offline mode with shared links

echo "=== Testing Offline Mode with Shared Link ==="
echo

# Test 1: Help output
echo "Test 1: Check if --offline accepts shared links in help"
../hacka.re -o --help 2>&1 | grep -q "SHARED_LINK" && echo "✓ Help mentions shared links" || echo "✗ Help doesn't mention shared links"
echo

# Test 2: Conflict detection with remote API key
echo "Test 2: Detect conflict with remote API key"
HACKARE_API_KEY=sk-test123 ../hacka.re --offline 2>&1 | grep -q "Configuration Conflict" && echo "✓ Detects API key conflict" || echo "✗ Doesn't detect API key conflict"
echo

# Test 3: Accept shared link argument
echo "Test 3: Try to parse shared link (will fail without valid encryption)"
echo "test" | ../hacka.re --offline "gpt=eyJlbmM..." 2>&1 | grep -q "password" && echo "✓ Attempts to parse shared link" || echo "✗ Doesn't attempt to parse shared link"
echo

# Test 4: Provider override
echo "Test 4: Check provider validation"
../hacka.re --offline --api-provider openai 2>&1 | grep -q "Configuration Conflict" && echo "✓ Rejects remote provider" || echo "✗ Doesn't reject remote provider"
echo

# Test 5: Local provider acceptance
echo "Test 5: Accept local providers"
../hacka.re --offline --api-provider ollama 2>&1 | grep -q "hacka.re: offline mode" && echo "✓ Accepts local provider" || echo "✗ Doesn't accept local provider"
echo

echo "=== Test Summary ==="
echo "The offline mode should:"
echo "1. Accept shared link arguments"
echo "2. Override external configurations to localhost"
echo "3. Validate that only localhost URLs are used"
echo "4. Show guidance for local LLM setup"
echo
echo "Note: Actual LLM execution requires a local LLM to be installed."