# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

hacka.re is a privacy-focused, serverless chat interface for OpenAI-compatible APIs built with pure HTML, CSS, and ES6 JavaScript. It runs entirely client-side with no backend server, no build system, no TypeScript compilation, and no server-side processing beyond serving static files, ensuring user privacy and data control.

## Development Commands

### Environment Setup
```bash
# One-time setup - creates Python virtual environment and installs dependencies
./setup_environment.sh

# Activate environment in new terminals
source _venv/bin/activate

# To deactivate the environment
deactivate
```

**Important Environment Notes:**
- The setup script creates a virtual environment at `_venv/` in the project root
- Always activate the environment before running tests: `source _venv/bin/activate`
- The environment includes Playwright, pytest, and all required dependencies
- API keys should be configured in `_tests/playwright/.env` (copy from `.env.example`)
- Playwright browsers are automatically installed during setup

### Testing
```bash
# Navigate to test directory
cd _tests/playwright

# Core functionality tests (quick validation)
./run_core_tests.sh

# Advanced feature tests 
./run_feature_tests.sh

# All tests (comprehensive)
./run_tests.sh

# Test with specific options
./run_tests.sh --headless --verbose
./run_tests.sh -k "function_calling or api"

# Project metrics
./scripts/project_metrics.sh
```

### Security Verification
```bash
# Run security analysis tool
python run_verifier.py
```

## Architecture

### Core Structure
- **Pure client-side application** - no server-side rendering or processing
- **Modular component-based architecture** with specialized manager classes
- **Service-oriented design** with 33+ service modules for different concerns
- **Event-driven UI** interactions with vanilla JavaScript
- **Recently refactored** (~50 new files) from monolithic to modular architecture

### Key Directories (Refactored Architecture)
```
js/
├── app.js                    # Application initialization
├── components/               # UI component managers (39 files)
│   ├── chat-manager.js      # Chat interface orchestrator
│   ├── function-calling/    # Function system (11 specialized modules)
│   │   ├── function-calling-manager.js    # Main orchestrator
│   │   ├── function-code-editor.js        # Code editor component
│   │   ├── function-modal-manager.js      # Modal UI management
│   │   ├── function-list-renderer.js      # List display
│   │   └── ... (7 more specialized modules)
│   ├── settings/            # Settings system (13 specialized modules)
│   │   ├── settings-coordinator.js        # Core coordination
│   │   ├── settings-state-manager.js      # State management
│   │   ├── api-key-manager.js             # API key handling
│   │   ├── model-manager.js               # Model selection
│   │   └── ... (9 more specialized modules)
│   ├── mcp/                 # Model Context Protocol (6 modules)
│   ├── prompts/             # Prompts system (5 modules)
│   ├── ui/                  # UI components (5 modules)
│   └── share-manager.js     # Secure sharing functionality
├── services/                # Core business logic (33 files)
│   ├── api-*.js            # API services (7 modules)
│   ├── function-tools-*.js # Function calling system (8 modules)
│   ├── mcp-*.js            # MCP services (5 modules)
│   ├── chat-*.js           # Chat services (3 modules)
│   ├── storage-*.js        # Storage services (4 modules)
│   └── ... (6 more service categories)
├── utils/                   # Utility functions (7 modules)
└── default-prompts/         # System prompt components
```

### Service Architecture (Refactored)

**API Services (7 modules):**
- `api-service.js` - Main API communication layer
- `api-request-builder.js` - Request construction
- `api-response-parser.js` - Response parsing
- `api-stream-processor.js` - Streaming response handling
- `api-tool-call-handler.js` - Tool call processing
- `api-debugger.js` - API debugging utilities
- `api-tools-service.js` - API tools integration

**Function Tools System (8 modules):**
- `function-tools-service.js` - Main orchestrator
- `function-tools-config.js` - Configuration constants
- `function-tools-storage.js` - Storage operations
- `function-tools-parser.js` - Argument parsing
- `function-tools-executor.js` - Sandboxed execution
- `function-tools-registry.js` - Function registry
- `function-tools-processor.js` - Tool call processing
- `function-tools-logger.js` - Centralized logging

**Storage Services (4 modules):**
- `storage-service.js` - Main storage interface
- `core-storage-service.js` - Core storage operations
- `encryption-service.js` - Data encryption (TweetNaCl)
- `namespace-service.js` - Multi-tenant data isolation

**MCP Services (5 modules):**
- `mcp-client-core.js` - Core MCP functionality
- `mcp-connection-manager.js` - Connection management
- `mcp-transport-service.js` - Transport layer
- `mcp-tool-registry.js` - Tool registration
- `mcp-request-manager.js` - Request handling

**Additional Services:**
- `link-sharing-service.js` - Encrypted sharing
- `chat-streaming-service.js` - Chat streaming
- `prompts-service.js` - Prompts management
- `model-info.js` - Model information
- Plus 8 more specialized services

## Key Features

### Function Calling System
- Allows JavaScript functions to be executed by AI models
- 8-module refactored architecture in `js/services/function-tools-*.js`
- Functions tagged with `@callable` or `@tool` become available to models
- Built-in RC4 encryption/decryption functions for testing

### Privacy & Security
- All data encrypted in localStorage using TweetNaCl
- No backend server - direct API communication
- Secure sharing via encrypted URLs
- No analytics or tracking

### Multi-Provider Support
- OpenAI, Groq, Ollama, custom endpoints
- Real-time context window visualization
- Token counting and usage tracking

## Playwright Testing Infrastructure

### Test Philosophy
- **No mocking** - all tests use real API calls to validate actual functionality
- Uses `gpt-4o-mini` model for cost efficiency
- Playwright + pytest browser automation for comprehensive UI testing
- **Screenshot-driven debugging** with contextual metadata capture
- **Multi-level output capture** for development and CI/CD integration

### Test Architecture
```
_tests/playwright/
├── conftest.py                    # Core pytest fixtures and configuration
├── test_utils.py                  # Common utilities and helper functions
├── pytest.ini                    # pytest configuration
├── requirements.txt               # Python dependencies
├── screenshots/                   # Screenshot capture directory
├── screenshots_data/              # Screenshot metadata in markdown
├── function_calling_api/          # Specialized API testing suite
│   ├── conftest.py               # API-specific fixtures
│   ├── helpers/                  # Modular helper functions
│   └── test_*.py                 # API integration tests
├── debug_tests/                   # Temporary debugging tests
├── run_*.sh                      # Test execution scripts
└── test_*.py                     # Main test files (80+ tests)
```

### Test Categories and Execution

**Core Tests (Quick validation - `./run_core_tests.sh`):**
- `test_page.py` - Basic UI and page loading
- `test_api.py` - API configuration and model selection
- `test_chat.py` - Basic chat functionality
- `test_welcome_modal.py` - Welcome modal behavior

**Feature Tests (Advanced functionality - `./run_feature_tests.sh`):**
- `test_function_*.py` - Function calling system (multiple files)
- `test_mcp_*.py` - Model Context Protocol integration
- `test_sharing.py` - Secure sharing functionality
- `test_themes.py` - Theme switching and mobile responsiveness
- `test_modals.py` - Modal interactions

**API Integration Tests:**
- `function_calling_api/` - Real OpenAI API function calling tests
- Uses `gpt-4o-mini` model for cost efficiency
- No mocking - validates actual API responses

**Specialized Test Suites:**
```bash
./run_mcp_tests.sh              # All MCP tests (26 tests)
./run_mcp_tests.sh --unit       # Unit tests only (18 tests)
./run_mcp_tests.sh --integration # Integration tests (8 tests)
./run_oauth_tests.sh            # OAuth-specific test suite
./run_github_oauth_tests.sh     # GitHub provider tests
```

### Test Execution Options
```bash
# Core functionality tests (quick validation)
./run_core_tests.sh [--headless] [--firefox] [--webkit] [-v] [--timeout <ms>]

# Advanced feature tests 
./run_feature_tests.sh [options]

# All tests (comprehensive - 377 total tests)
./run_tests.sh [options]

# Specific filtering
./run_tests.sh -k "function_calling_api or test_api"
./run_tests.sh --test-file test_my_feature.py

# Manual server management
./run_tests.sh --skip-server
```

### Development and Debugging Capabilities

**Multi-Level Output Capture:**
1. **Raw Terminal Output** - Complete stdout/stderr with interruption handling
2. **Test-Specific Output** - Direct pytest output with console messages
3. **Debug Screenshots** - Contextual screenshots with metadata

**Screenshot-Driven Debugging:**
```python
from test_utils import screenshot_with_markdown

screenshot_with_markdown(page, "test_phase", {
    "Status": "After clicking button",
    "Component": "Function Calling Modal", 
    "Error": error_message if error else "None",
    "API Key": "Configured" if api_key else "None"
})
```

**Console Logging and Browser Debugging:**
```python
# Setup real-time console logging
def setup_console_logging(page):
    def log_console_message(msg):
        print(f"Console {msg.type}: {msg.text}")
    page.on("console", log_console_message)

# Interactive debugging
page.pause()  # Opens browser inspector

# State inspection
debug_info = {
    "LocalStorage": str(page.evaluate("() => Object.keys(localStorage)")),
    "API Key Set": str(page.evaluate("() => !!localStorage.getItem('openai_api_key')")),
    "Current URL": page.url
}
```

**Automated Report Generation:**
- `bundle_test_results.sh` generates markdown reports after test completion
- `test_results.md` - Test output + screenshots
- `run_tests.out_bundle.md` - Complete output bundle
- Compatible with markdown viewers like `glow`

### Writing New Playwright Tests

**Standard Test Pattern:**
```python
from test_utils import dismiss_welcome_modal, screenshot_with_markdown
from playwright.sync_api import Page, expect

def test_feature(page: Page, serve_hacka_re):
    """Clear test description"""
    # 1. Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # 2. Test implementation
    element = page.locator("#element-id")
    element.scroll_into_view_if_needed()
    expect(element).to_be_visible()
    element.click()
    
    # 3. Wait for specific conditions (NEVER arbitrary timeouts)
    page.wait_for_selector("#result:not(:empty)", state="visible", timeout=5000)
    
    # 4. Assert and debug
    screenshot_with_markdown(page, "test_completion", {
        "Status": "Test completed successfully",
        "Component": "Component name"
    })
```

**Modal Management Best Practices:**
```python
# Always dismiss modals at start
dismiss_welcome_modal(page)
dismiss_settings_modal(page)  # If needed

# Handle dialogs proactively  
page.on("dialog", lambda dialog: dialog.accept())
delete_button.click()
```

**Essential Waiting Strategies:**
```python
# ✅ Good - Wait for specific conditions
page.wait_for_selector("#element", state="visible", timeout=5000)
page.wait_for_selector("#validation-result:not(:empty)", state="visible")

# ❌ Avoid - Arbitrary timeouts
page.wait_for_timeout(500)  # Not recommended unless necessary
```

**Function Name Auto-Population Pattern:**
```python
# For function calling tests - function name field is READ-ONLY and auto-populated
# 1. Set function code first
function_code.fill("""function test_function() { ... }""")

# 2. Trigger auto-population
page.evaluate("document.getElementById('function-code').dispatchEvent(new Event('input'))")

# 3. Wait and verify
page.wait_for_timeout(500)  # Brief wait for auto-population
expect(page.locator("#function-name")).to_have_value("test_function")
```

### Test Setup Requirements
```bash
# Copy and configure API key
cp .env.example _tests/playwright/.env
# Edit .env file with your OpenAI API key

# Tests automatically start/stop HTTP server on port 8000
# Use --skip-server flag if managing server manually

# Environment is automatically managed by test scripts:
# - Creates Python virtual environment
# - Installs dependencies via requirements.txt
# - Handles server lifecycle
# - Captures all output to log files
```

### Integration with Development Workflow

**For Unit Testing:**
- Create focused test files for specific components
- Use `debug_tests/` directory for temporary debugging
- Include comprehensive debug information with screenshots
- Test against real APIs to validate actual functionality

**As Development Tool:**
- Run tests in headed mode for visual debugging
- Use `page.pause()` for interactive inspection
- Capture browser state and console output
- Generate detailed reports for issue investigation

**For CI/CD Integration:**
- Headless mode execution with comprehensive logging
- Screenshot capture for failure investigation
- Markdown report generation for automated processing
- Multi-browser testing support (Chromium, Firefox, WebKit)

### Debugging Production Issues with Playwright

**Console Log Capture and Analysis:**
The Playwright testing infrastructure is designed to support debugging production issues through comprehensive console logging and real-time inspection:

```python
# Setup console logging for debugging
console_messages = []
def setup_console_logging(page):
    def log_console_message(msg):
        timestamp = time.strftime("%H:%M:%S.%f")[:-3]
        console_messages.append({
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text,
            'location': msg.location
        })
        print(f"[{timestamp}] Console {msg.type.upper()}: {msg.text}")
    page.on("console", log_console_message)
```

**Real-time Debugging Workflow:**
1. **Create debug script** in `debug_tests/` directory 
2. **Run with visible browser** for interactive debugging: `python debug_script.py`
3. **Use `page.pause()`** to open browser inspector at any point
4. **Capture state** with `screenshot_with_debug()` including contextual metadata
5. **Save console logs** to JSON files for analysis and sharing with LLM assistants

**Example Debug Script Pattern:**
```python
# Navigate to issue area
page.goto(issue_url)
dismiss_welcome_modal(page)
dismiss_settings_modal(page)

# Capture before state
screenshot_with_debug(page, "before_action", {
    "Component": "Share Modal",
    "Expected": "Welcome message should appear",
    "API Key": "Configured" if api_key else "None"
})

# Perform action and wait for results
action_button.click()
page.wait_for_selector("#result", timeout=5000)

# Capture after state with debug info
screenshot_with_debug(page, "after_action", {
    "Result": "Action completed",
    "Console Messages": str(len(console_messages)),
    "Error": error_msg if error else "None"
})

# Save full console log for analysis
with open("debug_console.json", 'w') as f:
    json.dump(console_messages, f, indent=2)
```

**Console Log Analysis for LLM Debugging:**
The multi-level output capture generates markdown-compatible reports that can be shared with LLM assistants for analysis:
- **Raw console messages** with timestamps and source locations
- **Screenshot metadata** with contextual debug information
- **Test execution flow** with success/failure points
- **JavaScript errors and warnings** captured in real-time

## Development Practices

### Code Organization (Post-Refactoring)
- **Specialized component managers** handle focused UI responsibilities
- **Modular services** contain business logic with single responsibilities
- **Manager pattern** with coordinators orchestrating specialized components
- **Service layer architecture** with clear dependency hierarchies
- **Component categories**: function-calling, settings, mcp, prompts, ui
- **Utilities** provide shared helper functions (7 specialized modules)
- **Default prompts** are modular components

### Refactoring Philosophy
- **REMOVE old functionality** when refactoring - do not keep old versions for backwards compatibility
- Old code patterns tend to re-emerge if left in the codebase
- Clean removal ensures the new architecture remains pure and maintainable
- Delete deprecated functions, unused imports, and legacy code paths completely

### Playwright Testing Requirements
- **Always include debug information** with screenshots using `screenshot_with_markdown()`
- **Function name fields are auto-populated** from code editor (read-only)
- **Use proper waiting strategies**: `page.wait_for_selector()` not arbitrary `page.wait_for_timeout()`
- **Dismiss welcome modal** in tests with `dismiss_welcome_modal()` after page navigation
- **Test against real APIs** - no mocking, use `gpt-4o-mini` for cost efficiency
- **Include comprehensive debug context** in screenshot metadata for LLM-assisted debugging
- **Use multi-level output capture** - terminal output, test logs, and screenshot reports
- **Handle modals proactively** with `page.on("dialog")` handlers before triggering actions
- **Wait for specific conditions** rather than arbitrary timeouts when possible
- **Organize tests by complexity** - core, feature, and API integration categories

### Security Considerations
- Never commit API keys or secrets
- All external libraries hosted locally (no CDN dependencies)
- Encrypted storage for sensitive data
- Secure sharing mechanism for credentials and conversations

## Validation

**Pure Static Web Application** - No build system, no TypeScript, no linting required. Validation is done through:

```bash
# Security verification
python run_verifier.py

# Test suite serves as primary validation
cd _tests/playwright && ./run_core_tests.sh

# Python code quality (for verifier tool only)
cd hacka_re_verifier && python -m flake8
cd hacka_re_verifier && python -m black --check .
```

## Common Development Tasks

### Adding New Functions
1. Functions defined in Function Calling UI automatically become available
2. Use JSDoc comments for better tool definitions
3. Tag with `@callable` or `@tool` if selective calling enabled

### Adding Tests
1. **Create new test file** in `_tests/playwright/` following naming conventions
2. **Use standard test pattern** with `conftest.py` fixtures (`serve_hacka_re`, `api_key`)
3. **Follow modal management best practices** - always dismiss welcome modal after navigation
4. **Include comprehensive debug information** with contextual screenshots and metadata
5. **Choose appropriate test category** - core (quick validation), feature (advanced), or API integration
6. **Use proper waiting strategies** - wait for specific conditions, avoid arbitrary timeouts
7. **Test against real APIs** using `gpt-4o-mini` model for actual functionality validation
8. **Run tests with multiple execution options** - headless/headed, single/batch, filtered by keywords

### Modifying Services
1. **Service modules** are in `js/services/` (33+ specialized files)
2. **Component modules** are in `js/components/` (39+ specialized files)
3. **Follow module patterns**: config → logger → storage → parser/registry → executor/processor → service
4. **Update related components**: settings/, function-calling/, mcp/, prompts/, ui/
5. **Service dependencies**: respect the established hierarchy
6. **Add corresponding tests** to validate functionality
7. **Update documentation** in `_tests/playwright/` for modal changes

The codebase emphasizes privacy, security, and real-world testing with actual AI APIs rather than mocked responses.