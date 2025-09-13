#!/bin/bash

# clean_environments.sh - Environment Cleanup Script
# Safely removes Python environments and cache files

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo
echo "======================="
echo "Environment Cleanup Tool"
echo "======================="
echo

# Check directory
if [[ ! -f "index.html" ]] || [[ ! -d "js" ]]; then
    print_error "Run from hacka.re project root"
    exit 1
fi

# List what will be cleaned
print_status "This will remove:"
echo "  • .venv/ (project scripts)"
echo "  • _tests/playwright/.venv/ (tests)"
echo "  • hackare/.venv/ (CLI)"
echo "  • _venv/ (old environment)"
echo "  • __pycache__ directories"
echo "  • .pytest_cache directories"
echo "  • *.pyc and *.pyo files"
echo

read -p "Proceed with cleanup? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Cleanup cancelled"
    exit 0
fi

# Stop server if running
if [ -f ".server.pid" ]; then
    print_status "Stopping server..."
    ./scripts/stop_server.sh 2>/dev/null || true
fi

# Remove environments
for env in ".venv" "_tests/playwright/.venv" "hackare/.venv" "_venv"; do
    if [ -d "$env" ]; then
        print_status "Removing $env..."
        rm -rf "$env"
        print_success "Removed $env"
    fi
done

# Clean cache
print_status "Cleaning Python cache..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type f -name "*.pyo" -delete 2>/dev/null || true

print_success "Cleanup complete!"
echo
echo "Run ./setup_environment.sh or ./refresh_environments.sh to recreate environments"