#!/bin/bash

echo "==============================================="
echo "  Granular Offline Mode Demonstration"
echo "==============================================="
echo

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Scenario 1: Basic offline mode (blocks ALL external)${NC}"
echo "Command: hacka.re --offline"
echo "Expected: All external API requests are blocked"
echo "- LLM requests: ❌ Blocked (must be localhost)"
echo "- MCP requests: ❌ Blocked"
echo "- Embeddings: ❌ Blocked"
echo

echo -e "${GREEN}Scenario 2: Offline with remote MCP allowed${NC}"
echo "Command: hacka.re --offline --allow-remote-mcp"
echo "Expected: Only MCP can connect remotely"
echo "- LLM requests: ❌ Blocked (always local in offline)"
echo "- MCP requests: ✅ Allowed to remote"
echo "- Embeddings: ❌ Blocked"
echo

echo -e "${GREEN}Scenario 3: Offline with remote embeddings allowed${NC}"
echo "Command: hacka.re --offline --allow-remote-embeddings"
echo "Expected: Only embeddings can connect remotely"
echo "- LLM requests: ❌ Blocked (always local in offline)"
echo "- MCP requests: ❌ Blocked"
echo "- Embeddings: ✅ Allowed to remote"
echo

echo -e "${GREEN}Scenario 4: Offline with both exceptions${NC}"
echo "Command: hacka.re --offline --allow-remote-mcp --allow-remote-embeddings"
echo "Expected: MCP and embeddings can be remote, LLM stays local"
echo "- LLM requests: ❌ Blocked (always local in offline)"
echo "- MCP requests: ✅ Allowed to remote"
echo "- Embeddings: ✅ Allowed to remote"
echo

echo "==============================================="
echo "  Request Type Detection Logic"
echo "==============================================="
echo
echo "The system detects request types based on URL patterns:"
echo
echo -e "${YELLOW}Embeddings Requests:${NC}"
echo "  - URLs containing '/embeddings'"
echo "  - Example: https://api.openai.com/v1/embeddings"
echo
echo -e "${YELLOW}MCP Requests:${NC}"
echo "  - URLs containing '/mcp'"
echo "  - URLs containing 'model-context'"
echo "  - URLs containing '/tools'"
echo "  - URLs containing '/functions'"
echo "  - Example: https://api.service.com/mcp/tools"
echo
echo -e "${YELLOW}LLM Requests (Default):${NC}"
echo "  - All other URLs (chat completions, etc.)"
echo "  - Example: https://api.openai.com/v1/chat/completions"
echo "  - ${RED}ALWAYS blocked in offline mode${NC} (must use localhost)"
echo

echo "==============================================="
echo "  Security Guarantee"
echo "==============================================="
echo
echo "When --offline is specified:"
echo "1. LLM requests are ALWAYS restricted to localhost"
echo "2. Only explicitly allowed request types can go remote"
echo "3. Configuration from shared links is overridden for safety"
echo "4. Clear error messages when violations are detected"
echo
echo -e "${GREEN}This ensures your LLM interactions stay private while${NC}"
echo -e "${GREEN}allowing necessary remote services when explicitly permitted.${NC}"
echo