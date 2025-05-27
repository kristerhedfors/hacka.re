#!/bin/bash

# setup_environment.sh - Unified Python Environment Setup for hacka.re
# This script sets up a complete Python environment for testing and development

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

print_status "Starting hacka.re Python environment setup..."

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
    print_error "Please install Python 3.11 or later"
    exit 1
fi

PYTHON_VERSION=$(get_python_version)
if ! version_ge "$PYTHON_VERSION" "3.11"; then
    print_error "Python 3.11 or later is required (found: $PYTHON_VERSION)"
    print_error "Please upgrade your Python installation"
    exit 1
fi

print_success "Python $PYTHON_VERSION found"

# Check if virtual environment exists
VENV_DIR="_venv"
if [[ -d "$VENV_DIR" ]]; then
    print_status "Virtual environment already exists at $VENV_DIR"
else
    print_status "Creating virtual environment at $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
    print_success "Virtual environment created"
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# Verify we're in the virtual environment
if [[ "$VIRTUAL_ENV" != *"$VENV_DIR"* ]]; then
    print_error "Failed to activate virtual environment"
    exit 1
fi

print_success "Virtual environment activated: $VIRTUAL_ENV"

# Upgrade pip
print_status "Upgrading pip..."
python -m pip install --upgrade pip

# Install requirements
print_status "Installing Python packages from requirements.txt..."
if [[ -f "requirements.txt" ]]; then
    pip install -r requirements.txt
    print_success "Python packages installed successfully"
else
    print_error "requirements.txt not found"
    exit 1
fi

# Install Playwright browsers
print_status "Installing Playwright browsers..."
playwright install

# Verify Playwright installation
if playwright --help >/dev/null 2>&1; then
    print_success "Playwright browsers installed successfully"
else
    print_warning "Playwright installation may have issues"
fi

# Create .env.example if it doesn't exist
if [[ ! -f ".env.example" ]]; then
    print_status "Creating .env.example template..."
    cat > .env.example << 'EOF'
# OpenAI API Configuration
OPENAI_API_KEY=your_api_key_here
OPENAI_API_MODEL=o4-mini
OPENAI_API_BASE=https://api.openai.com/v1

# Azure OpenAI Configuration (alternative)
# AZURE_OPENAI_API_KEY=your_azure_api_key_here
# AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
# AZURE_OPENAI_API_VERSION=2024-02-15-preview
# AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
EOF
    print_success "Created .env.example template"
fi

# Check if .env file exists in playwright directory
PLAYWRIGHT_ENV="_tests/playwright/.env"
if [[ ! -f "$PLAYWRIGHT_ENV" ]]; then
    print_warning "No .env file found at $PLAYWRIGHT_ENV"
    print_status "Creating template .env file for Playwright tests..."
    mkdir -p "_tests/playwright"
    cp ".env.example" "$PLAYWRIGHT_ENV"
    print_warning "Please edit $PLAYWRIGHT_ENV and add your API key"
fi

# Verify installation by running a simple test
print_status "Verifying installation..."

# Test Python imports
python -c "
import playwright
import pytest
import jsbeautifier
import pandas
import matplotlib
print('✓ All core packages imported successfully')
" 2>/dev/null && print_success "Python package verification passed" || print_warning "Some Python packages may have import issues"

# Test Playwright
python -c "
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    browser.close()
print('✓ Playwright browser test passed')
" 2>/dev/null && print_success "Playwright verification passed" || print_warning "Playwright browser test failed"

# Display summary
echo
print_success "=== Environment Setup Complete ==="
echo
print_status "Virtual environment: $VIRTUAL_ENV"
print_status "Python version: $(python --version)"
print_status "Pip version: $(pip --version | cut -d' ' -f2)"
echo
print_status "Installed packages:"
pip list | grep -E "(playwright|pytest|jsbeautifier|pandas|matplotlib)" || true
echo

print_status "=== Next Steps ==="
echo "1. To activate the environment in a new terminal:"
echo "   source _venv/bin/activate"
echo
echo "2. Configure your API key in:"
echo "   $PLAYWRIGHT_ENV"
echo
echo "3. Run Playwright tests:"
echo "   cd _tests/playwright && ./run_core_tests.sh"
echo
echo "4. Run the hacka.re verifier:"
echo "   python run_verifier.py"
echo
echo "5. To deactivate the environment:"
echo "   deactivate"
echo

# Check if we should stay in the virtual environment
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Script was executed, not sourced
    print_status "Environment setup complete. Virtual environment will be deactivated."
    print_status "Run 'source _venv/bin/activate' to reactivate it."
else
    # Script was sourced
    print_status "Environment setup complete and activated in current shell."
fi

print_success "Setup completed successfully!"
