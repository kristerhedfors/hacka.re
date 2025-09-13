#!/bin/bash

# check_environments.sh - Environment Status Check
# Shows current state of all Python environments

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Python Environment Status Check${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# System Python
echo "System Python:"
echo "  Version: $(python3 --version 2>&1)"
echo "  Path: $(which python3)"
echo

# Check each environment
echo "Virtual Environments:"
echo

check_env() {
    local path="$1"
    local name="$2"
    
    echo -n "  $name: "
    if [ -d "$path" ]; then
        if [ -f "$path/bin/python" ]; then
            local version=$($path/bin/python --version 2>&1 | cut -d' ' -f2)
            local packages=$($path/bin/pip list 2>/dev/null | wc -l)
            echo -e "${GREEN}✓${NC} (Python $version, $packages packages)"
        else
            echo -e "${YELLOW}⚠${NC} (exists but incomplete)"
        fi
    else
        echo -e "${RED}✗${NC} (not found)"
    fi
}

check_env ".venv" "Project scripts (.venv)"
check_env "_tests/playwright/.venv" "Playwright tests"
check_env "hackare/.venv" "hackare CLI"

# Check for old environment
if [ -d "_venv" ]; then
    echo -e "  ${YELLOW}Old _venv found${NC} (should be removed)"
fi

# Check .env files
echo
echo "Configuration Files:"
for env_file in ".env" "_tests/playwright/.env" "hackare/.env"; do
    echo -n "  $env_file: "
    if [ -f "$env_file" ]; then
        if grep -q "your.*key.*here" "$env_file" 2>/dev/null; then
            echo -e "${YELLOW}⚠${NC} (exists but needs configuration)"
        else
            echo -e "${GREEN}✓${NC}"
        fi
    else
        echo -e "${RED}✗${NC}"
    fi
done

# Check server status
echo
echo "Server Status:"
if [ -f ".server.pid" ]; then
    PID=$(cat .server.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo -e "  ${GREEN}Running${NC} (PID: $PID, port 8000)"
    else
        echo -e "  ${YELLOW}Stale PID file${NC}"
    fi
else
    echo -e "  ${RED}Not running${NC}"
fi

# Cache status
echo
echo "Cache Files:"
PYCACHE=$(find . -type d -name "__pycache__" 2>/dev/null | wc -l)
PYTEST=$(find . -type d -name ".pytest_cache" 2>/dev/null | wc -l)
echo "  __pycache__ directories: $PYCACHE"
echo "  .pytest_cache directories: $PYTEST"

echo
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo "Commands:"
echo "  ./refresh_environments.sh - Full refresh all environments"
echo "  ./clean_environments.sh   - Remove all environments"
echo "  ./setup_environment.sh    - Interactive setup"
echo "  ./check_environments.sh   - This status check"
echo