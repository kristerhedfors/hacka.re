#!/bin/bash

# MCP and Shodan CLI Demonstration Script
# This script demonstrates all the read-only Shodan functions through the CLI

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}    MCP and Shodan CLI Feature Demonstration     ${NC}"
echo -e "${BLUE}==================================================${NC}"
echo

# Check if binary exists
if [ ! -f "./hacka.re" ]; then
    echo -e "${YELLOW}Building hacka.re binary...${NC}"
    go build -o hacka.re ./cmd/hacka.re/
    echo -e "${GREEN}✓ Binary built successfully${NC}"
fi

# Check for API key
if [ -z "$SHODAN_API_KEY" ]; then
    echo -e "${RED}Error: SHODAN_API_KEY environment variable not set${NC}"
    echo "Please set it with: export SHODAN_API_KEY=your_api_key_here"
    echo
    echo "Demo will continue with commands that don't require an API key..."
    echo
    DEMO_MODE="no-api"
else
    echo -e "${GREEN}✓ Shodan API key found${NC}"
    DEMO_MODE="full"
fi

echo
echo -e "${YELLOW}1. Testing MCP Commands${NC}"
echo "======================================"

echo -e "\n${BLUE}→ Listing available MCP connectors:${NC}"
./hacka.re mcp list

echo -e "\n${BLUE}→ Listing Shodan MCP tools:${NC}"
./hacka.re mcp tools shodan

echo -e "\n${BLUE}→ Getting help for a specific tool:${NC}"
./hacka.re mcp call shodan_tools_myip --help

echo
echo -e "${YELLOW}2. Testing Shodan Commands${NC}"
echo "======================================"

echo -e "\n${BLUE}→ Shodan help:${NC}"
./hacka.re shodan --help | head -15

if [ "$DEMO_MODE" = "full" ]; then
    echo -e "\n${YELLOW}3. Running Shodan API Commands${NC}"
    echo "======================================"
    
    echo -e "\n${BLUE}→ Getting your external IP:${NC}"
    ./hacka.re shodan myip
    
    echo -e "\n${BLUE}→ Getting account profile:${NC}"
    ./hacka.re shodan profile
    
    echo -e "\n${BLUE}→ Resolving DNS for example.com:${NC}"
    ./hacka.re shodan dns example.com --resolve
    
    echo -e "\n${BLUE}→ Reverse DNS lookup for 8.8.8.8:${NC}"
    ./hacka.re shodan dns 8.8.8.8 --reverse
    
    echo -e "\n${BLUE}→ Getting host information for 8.8.8.8:${NC}"
    ./hacka.re shodan host 8.8.8.8 | head -20
    
    echo -e "\n${YELLOW}4. Testing MCP Tool Invocation${NC}"
    echo "======================================"
    
    echo -e "\n${BLUE}→ Calling shodan_tools_myip through MCP:${NC}"
    ./hacka.re mcp call shodan_tools_myip
    
    echo -e "\n${BLUE}→ Calling shodan_account_profile through MCP:${NC}"
    ./hacka.re mcp call shodan_account_profile
else
    echo -e "\n${YELLOW}Skipping API commands (no API key set)${NC}"
fi

echo
echo -e "${YELLOW}5. Testing Error Handling${NC}"
echo "======================================"

echo -e "\n${BLUE}→ Testing invalid command:${NC}"
./hacka.re shodan invalid-command 2>&1 | head -3 || true

echo -e "\n${BLUE}→ Testing missing required argument:${NC}"
./hacka.re shodan host 2>&1 || true

echo
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}            Demonstration Complete!               ${NC}"
echo -e "${GREEN}==================================================${NC}"

if [ "$DEMO_MODE" = "no-api" ]; then
    echo
    echo -e "${YELLOW}Note: To see all features in action, set your SHODAN_API_KEY:${NC}"
    echo "  export SHODAN_API_KEY=your_api_key_here"
    echo "  ./demo_mcp_shodan.sh"
fi

echo
echo "Summary:"
echo "  - MCP server implementation: ✓"
echo "  - Shodan connector: ✓"
echo "  - CLI integration: ✓"
echo "  - Tool discovery: ✓"
echo "  - Error handling: ✓"
if [ "$DEMO_MODE" = "full" ]; then
    echo "  - API integration: ✓"
fi