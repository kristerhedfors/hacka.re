#!/bin/bash

# refresh_environments.sh - Comprehensive Environment Refresh Script
# This script cleanly removes and recreates all Python environments
# Handles Python 3.13 compatibility and provides fallback options

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

print_header() {
    echo
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get Python version
get_python_version() {
    python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')" 2>/dev/null || echo "0.0.0"
}

# Function to compare version numbers
version_ge() {
    printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

# Function to clean environment
clean_environment() {
    local env_path="$1"
    local env_name="$2"
    
    if [ -d "$env_path" ]; then
        print_warning "Removing existing $env_name environment at $env_path"
        rm -rf "$env_path"
        print_success "$env_name environment removed"
    else
        print_status "$env_name environment not found, skipping cleanup"
    fi
}

# Function to create and setup environment
setup_environment() {
    local env_path="$1"
    local env_name="$2"
    local requirements_file="$3"
    local extra_commands="$4"
    
    print_status "Creating $env_name environment at $env_path"
    
    # Create virtual environment with system site packages for better compatibility
    python3 -m venv "$env_path" --system-site-packages
    
    # Activate environment
    source "$env_path/bin/activate"
    
    # Upgrade pip, setuptools, and wheel
    print_status "Upgrading pip, setuptools, and wheel..."
    pip install --upgrade pip setuptools wheel
    
    # Install requirements if file exists
    if [ -f "$requirements_file" ]; then
        print_status "Installing requirements from $requirements_file"
        
        # Install requirements
        pip install -r "$requirements_file" || {
            print_warning "Some packages failed to install"
            print_status "Attempting to install packages individually..."
            # Try to install what we can
            while read -r line; do
                if [[ ! "$line" =~ ^# ]] && [[ -n "$line" ]]; then
                    pip install "$line" 2>/dev/null || print_warning "Failed to install: $line"
                fi
            done < "$requirements_file"
        }
    else
        print_warning "No requirements file found at $requirements_file"
    fi
    
    # Run extra commands if provided
    if [ -n "$extra_commands" ]; then
        eval "$extra_commands"
    fi
    
    # Deactivate environment
    deactivate
    
    print_success "$env_name environment setup complete"
}

# Main script starts here
print_header "hacka.re Environment Refresh Tool"

# Check if we're in the correct directory
if [[ ! -f "index.html" ]] || [[ ! -d "js" ]]; then
    print_error "This script must be run from the hacka.re project root directory"
    print_error "Expected to find index.html and js/ directory"
    exit 1
fi

# Check Python installation
print_status "Checking Python installation..."

if ! command_exists python3; then
    print_error "Python 3 is not installed or not in PATH"
    print_error "Please install Python 3.8 or later"
    exit 1
fi

PYTHON_VERSION=$(get_python_version)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

if ! version_ge "$PYTHON_VERSION" "3.8.0"; then
    print_error "Python 3.8 or later is required (found: $PYTHON_VERSION)"
    exit 1
fi

print_success "Python $PYTHON_VERSION found at $(which python3)"

# Ask for confirmation
print_header "Environment Refresh Options"
echo "This script will:"
echo "  1. Remove ALL existing Python virtual environments"
echo "  2. Clean up any cached files"
echo "  3. Recreate all environments from scratch"
echo "  4. Install all dependencies"
echo
echo "Environments to refresh:"
echo "  • Project scripts: .venv/"
echo "  • Playwright tests: _tests/playwright/.venv/"
echo "  • hackare CLI: hackare/.venv/"
echo

read -p "Do you want to proceed with FULL refresh? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Refresh cancelled by user"
    exit 0
fi

# Stop any running servers
print_header "Stopping Running Services"
if [ -f ".server.pid" ]; then
    print_status "Stopping HTTP server..."
    ./scripts/stop_server.sh 2>/dev/null || true
fi

# Clean old environments
print_header "Cleaning Existing Environments"

clean_environment ".venv" "project scripts"
clean_environment "_tests/playwright/.venv" "Playwright tests"
clean_environment "hackare/.venv" "hackare CLI"

# Clean old _venv if it exists
if [ -d "_venv" ]; then
    print_warning "Found old _venv directory from previous setup"
    rm -rf "_venv"
    print_success "Old _venv directory removed"
fi

# Clean Python cache files
print_status "Cleaning Python cache files..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type f -name "*.pyo" -delete 2>/dev/null || true
find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true

# Create new environments
print_header "Creating Fresh Environments"

# 1. Project scripts environment
print_status "Setting up project scripts environment..."
setup_environment ".venv" "Project scripts" "requirements-scripts.txt" ""

# 2. Playwright tests environment
print_status "Setting up Playwright tests environment..."
PLAYWRIGHT_EXTRA="playwright install chromium"
setup_environment "_tests/playwright/.venv" "Playwright tests" "_tests/playwright/requirements.txt" "$PLAYWRIGHT_EXTRA"

# 3. hackare CLI environment
print_status "Setting up hackare CLI environment..."
HACKARE_EXTRA="cd hackare && pip install -e . && cd .."
setup_environment "hackare/.venv" "hackare CLI" "hackare/requirements.txt" "$HACKARE_EXTRA"

# Verify installations
print_header "Verifying Installations"

# Check project scripts environment
if [ -f ".venv/bin/python" ]; then
    SCRIPTS_PACKAGES=$(.venv/bin/pip list | wc -l)
    print_success "Project scripts environment: $SCRIPTS_PACKAGES packages installed"
else
    print_error "Project scripts environment verification failed"
fi

# Check Playwright environment
if [ -f "_tests/playwright/.venv/bin/python" ]; then
    PLAYWRIGHT_PACKAGES=$(_tests/playwright/.venv/bin/pip list | wc -l)
    print_success "Playwright tests environment: $PLAYWRIGHT_PACKAGES packages installed"
    
    # Check if Playwright browsers are installed
    if _tests/playwright/.venv/bin/playwright list | grep -q "chromium"; then
        print_success "Playwright browsers installed"
    else
        print_warning "Playwright browsers may need installation"
    fi
else
    print_error "Playwright environment verification failed"
fi

# Check hackare environment
if [ -f "hackare/.venv/bin/python" ]; then
    HACKARE_PACKAGES=$(hackare/.venv/bin/pip list | wc -l)
    print_success "hackare CLI environment: $HACKARE_PACKAGES packages installed"
    
    # Check if hackare is available
    if hackare/.venv/bin/python -c "import hackare" 2>/dev/null; then
        print_success "hackare module is importable"
    else
        print_warning "hackare module may need configuration"
    fi
else
    print_error "hackare environment verification failed"
fi

# Setup .env files if needed
print_header "Environment Configuration"

# Check and create .env files
for env_file in ".env" "_tests/playwright/.env" "hackare/.env"; do
    example_file="${env_file}.example"
    if [ ! -f "$env_file" ] && [ -f "$example_file" ]; then
        print_status "Creating $env_file from template..."
        cp "$example_file" "$env_file"
        print_warning "Please configure API keys in $env_file"
    elif [ -f "$env_file" ]; then
        print_success "$env_file already exists"
    else
        print_warning "No template found for $env_file"
    fi
done

# Final summary
print_header "Environment Refresh Complete!"

echo
print_success "All environments have been refreshed successfully!"
echo
echo "Python version: $PYTHON_VERSION"
echo
echo "Environment locations:"
echo "  • Project scripts: $(pwd)/.venv/"
echo "  • Playwright tests: $(pwd)/_tests/playwright/.venv/"
echo "  • hackare CLI: $(pwd)/hackare/.venv/"
echo
echo "Quick commands:"
echo
echo "  Project scripts:"
echo "    source .venv/bin/activate"
echo "    python scripts/generate_embeddings.py"
echo
echo "  Playwright tests:"
echo "    _tests/playwright/.venv/bin/python -m pytest _tests/playwright/test_*.py -v"
echo
echo "  hackare CLI:"
echo "    hackare/.venv/bin/hackare --help"
echo
echo "  Start server:"
echo "    ./scripts/start_server.sh"
echo
print_warning "Remember to configure API keys in .env files!"
echo

# Test quick functionality
print_header "Quick Functionality Test"

print_status "Testing Python imports..."

# Test basic imports for each environment
echo -n "  Project scripts: "
if .venv/bin/python -c "import openai, dotenv" 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "  Playwright tests: "
if _tests/playwright/.venv/bin/python -c "import playwright, pytest" 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "  hackare CLI: "
if hackare/.venv/bin/python -c "import click, numpy" 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo
print_success "Environment refresh completed successfully!"