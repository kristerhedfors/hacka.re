#!/bin/bash

# setup_environment.sh - Master Setup Script for hacka.re Python Environments
# This script guides you through setting up the appropriate Python environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get Python version
get_python_version() {
    python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "0.0"
}

# Function to compare version numbers
version_ge() {
    printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

print_status "hacka.re Environment Setup Guide"
echo
print_status "This project uses separate Python environments for different components:"
echo "  • Project scripts: .venv/ (in project root)"
echo "  • Playwright tests: _tests/playwright/.venv/"
echo "  • hackare CLI: hackare/.venv/"
echo

# Check if we're in the correct directory
if [[ ! -f "index.html" ]] || [[ ! -d "js" ]]; then
    print_error "This script must be run from the hacka.re project root directory"
    print_error "Expected to find index.html and js/ directory"
    exit 1
fi

# Offer setup options
print_status "What would you like to set up?"
echo "  1) All environments (recommended for first-time setup)"
echo "  2) Project scripts environment only (.venv/)"
echo "  3) Playwright tests environment only (_tests/playwright/.venv/)"
echo "  4) hackare CLI environment only (hackare/.venv/)"
echo
read -p "Enter your choice (1-4): " choice

# Check Python installation
print_status "Checking Python installation..."

if ! command_exists python3; then
    print_error "Python 3 is not installed or not in PATH"
    print_error "Please install Python 3.8 or later"
    exit 1
fi

PYTHON_VERSION=$(get_python_version)
if ! version_ge "$PYTHON_VERSION" "3.8"; then
    print_error "Python 3.8 or later is required (found: $PYTHON_VERSION)"
    print_error "Please upgrade your Python installation"
    exit 1
fi

print_success "Python $PYTHON_VERSION found"

# Function to setup project scripts environment
setup_scripts_env() {
    print_status "Setting up project scripts environment..."
    if [[ -x "./setup_scripts_env.sh" ]]; then
        ./setup_scripts_env.sh
    else
        print_error "setup_scripts_env.sh not found or not executable"
        return 1
    fi
}

# Function to setup Playwright tests environment
setup_playwright_env() {
    print_status "Setting up Playwright tests environment..."
    if [[ -x "_tests/playwright/setup_environment.sh" ]]; then
        _tests/playwright/setup_environment.sh
    else
        print_error "_tests/playwright/setup_environment.sh not found or not executable"
        return 1
    fi
}

# Function to setup hackare CLI environment
setup_hackare_env() {
    print_status "Setting up hackare CLI environment..."
    if [[ -x "hackare/setup_environment.sh" ]]; then
        hackare/setup_environment.sh
    else
        print_error "hackare/setup_environment.sh not found or not executable"
        return 1
    fi
}

# Execute based on user choice
case $choice in
    1)
        print_status "Setting up all environments..."
        setup_scripts_env
        echo
        setup_playwright_env
        echo
        setup_hackare_env
        ;;
    2)
        setup_scripts_env
        ;;
    3)
        setup_playwright_env
        ;;
    4)
        setup_hackare_env
        ;;
    *)
        print_error "Invalid choice. Please run the script again and select 1-4."
        exit 1
        ;;
esac

# Check for old _venv directory
if [[ -d "_venv" ]]; then
    print_warning "Found old _venv directory from previous setup."
    print_warning "This is no longer used. Each component now has its own .venv/"
    print_status "You can remove it with: rm -rf _venv"
    echo
fi

# Display summary
echo
print_success "=== Environment Setup Complete ==="
echo
print_status "Environment locations:"
echo "  • Project scripts: .venv/"
echo "  • Playwright tests: _tests/playwright/.venv/"
echo "  • hackare CLI: hackare/.venv/"
echo

print_status "=== Next Steps ==="
echo
echo "For project scripts:"
echo "  source .venv/bin/activate"
echo "  python scripts/generate_embeddings.py"
echo
echo "For Playwright tests:"
echo "  source _tests/playwright/.venv/bin/activate"
echo "  cd _tests/playwright && python -m pytest test_*.py -v"
echo
echo "For hackare CLI:"
echo "  source hackare/.venv/bin/activate"
echo "  hackare --help"
echo
echo "Remember to configure .env files in each directory:"
echo "  • .env (for scripts)"
echo "  • _tests/playwright/.env (for tests)"
echo "  • hackare/.env (for CLI)"
echo

print_success "Setup completed successfully!"
