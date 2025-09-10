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

**CRITICAL: Python Usage Rules:**
- **ALWAYS USE**: `_venv/bin/python` - This is the ONLY Python environment for this project
- **Virtual environment location**: `_venv/` in project root (NOT .venv, NOT _env, ONLY _venv)
- **Absolute path**: `/Users/user/dev/hacka.re/_venv/bin/python`
- **From project root**: `_venv/bin/python`
- **From _tests/playwright/**: `../../_venv/bin/python`
- **Running tests**: `_venv/bin/python -m pytest _tests/playwright/test_file.py -v -s`
- **NEVER USE**: System python, homebrew python, .venv, or any other python installation
- **CRITICAL**: The virtual environment is `_venv` - memorize this, it's the ONLY correct path

**Important Environment Notes:**
- The setup script creates a virtual environment at `_venv/` in the project root
- Always use `_venv/bin/python` for ALL Python commands in this project
- The environment includes Playwright, pytest, and all required dependencies
- API keys should be configured in `_tests/playwright/.env` (copy from `.env.example`)
- Playwright browsers are automatically installed during setup

### HTTP Server Management

**CRITICAL: Use ONLY these methods for server management. Do NOT use ad-hoc python commands.**

```bash
# Start the HTTP server (port 8000)
./scripts/start_server.sh

# Stop the HTTP server
./scripts/stop_server.sh

# Check server status
./scripts/server_status.sh
```

**Server Management Details:**
- **Start**: `./scripts/start_server.sh` - Starts server on port 8000, kills any existing processes, tracks PID
- **Stop**: `./scripts/stop_server.sh` - Gracefully stops server, cleans up PID file, force kills if needed
- **Status**: `./scripts/server_status.sh` - Shows detailed status, connection test, recent logs
- **PID file**: `.server.pid` - Contains server process ID for reliable management
- **Log file**: `.server.log` - Contains server output and error logs
- **URL**: `http://localhost:8000` - Access the application after starting server

**Server Management Rules:**
1. **ALWAYS** use the scripts - never start server manually with `python3 -m http.server`
2. **ALWAYS** check status before starting: `./scripts/server_status.sh`
3. **ALWAYS** stop cleanly: `./scripts/stop_server.sh` 
4. Scripts handle all error cases: port conflicts, zombie processes, cleanup
5. Scripts provide clear success/failure feedback and detailed logging

### Testing - ESSENTIAL INFORMATION

**🚨 ABSOLUTELY CRITICAL: TEST DEBUGGING VISIBILITY 🚨**
**BEFORE RUNNING ANY TESTS:** If you cannot see BOTH full console logs AND screenshots when tests fail, **STOP AND FIX THIS FIRST!** This is NON-NEGOTIABLE. You MUST have:
1. **Complete console log capture** - Every console message, error, and warning from the browser
2. **Screenshots on failure** - Visual evidence of what the UI looked like when the test failed
3. **Page state information** - localStorage keys, selected values, DOM state
4. **Error context** - Full stack traces and error messages

**If you lack this visibility, DO NOT PROCEED with test analysis. First implement enhanced error tracking using tools like:**
- Custom test runners with console log capture (`debug_test_runner.py`, `enhanced_test_runner.py`)
- Screenshot utilities with metadata (`screenshot_with_markdown`)
- Browser page state dumping
- JSON error report generation

**CRITICAL TESTING RULES:**
1. **ALWAYS RUN TESTS FROM PROJECT ROOT** - `/Users/user/dev/hacka.re/`
2. **NEVER cd INTO _tests/playwright** - All test scripts are designed to run from project root
3. **TEST SCRIPTS ARE IN**: `_tests/playwright/` but RUN FROM PROJECT ROOT
4. **PYTHON ENVIRONMENT**: Virtual environment is at `_venv/` in project root
5. **ALWAYS CAPTURE CONSOLE LOGS** - Essential for debugging API calls and errors
6. **ALWAYS TAKE SCREENSHOTS** - Visual confirmation of UI state at failure

**Running Tests FROM PROJECT ROOT:**
```bash
# CORRECT - From project root (/Users/user/dev/hacka.re/):
_tests/playwright/run_core_tests.sh      # Core functionality tests (quick)
_tests/playwright/run_feature_tests.sh   # Advanced feature tests
_tests/playwright/run_tests.sh          # All tests (comprehensive)
_tests/playwright/run_modal_tests.sh    # Modal-specific tests
_tests/playwright/run_function_tests.sh # Function calling tests

# With options (FROM PROJECT ROOT):
_tests/playwright/run_tests.sh --headless --verbose
_tests/playwright/run_tests.sh -k "function_calling or api"

# WRONG - Do NOT do this:
cd _tests/playwright
./run_core_tests.sh  # WRONG - scripts expect to be run from project root
```

**Test Categories:**
- **Core Tests** (`run_core_tests.sh`): Basic UI, page loading, API config, chat
- **Feature Tests** (`run_feature_tests.sh`): Function calling, MCP, sharing, themes
- **Modal Tests** (`run_modal_tests.sh`): All modal UI tests including prompts modal
- **Function Tests** (`run_function_tests.sh`): Function calling system tests
- **All Tests** (`run_tests.sh`): Complete test suite (377+ tests)

**Direct pytest Execution (FROM PROJECT ROOT):**
```bash
# Run specific test file
_venv/bin/python -m pytest _tests/playwright/test_modals.py -v -s

# Run specific test
_venv/bin/python -m pytest _tests/playwright/test_modals.py::test_prompts_modal -v -s

# With filtering
_venv/bin/python -m pytest _tests/playwright/ -k "prompts" -v
```

**🚨 CRITICAL: HANDLING LARGE TEST BUNDLES - TIMEOUT SOLUTIONS 🚨**
The test suite contains 377+ tests that can take 5-10 minutes to complete. NEVER run all tests with default timeout settings!

**PROPER TEST EXECUTION STRATEGY:**
```bash
# 1. RUN TESTS IN SMALLER BATCHES (RECOMMENDED)
# Instead of running all 53 RAG tests at once:
_venv/bin/python -m pytest _tests/playwright/test_rag_modal.py -v  # 9 tests
_venv/bin/python -m pytest _tests/playwright/test_rag_indexing.py -v  # 7 tests
_venv/bin/python -m pytest _tests/playwright/test_rag_search.py -v  # 10 tests

# 2. USE INCREASED TIMEOUT FOR LARGE BUNDLES
# When running many tests, ALWAYS use timeout parameter:
_venv/bin/python -m pytest _tests/playwright/test_rag_*.py --timeout=600 -v

# 3. FOR SUMMARY/STATISTICS ONLY (NO ACTUAL TEST EXECUTION)
# Use --collect-only or --co to just count tests:
_venv/bin/python -m pytest _tests/playwright/test_rag_*.py --co -q

# 4. QUICK PASS/FAIL COUNT (with proper timeout)
_venv/bin/python -m pytest _tests/playwright/test_rag_*.py --tb=no -q --timeout=600

# 5. NEVER DO THIS (WILL TIMEOUT):
_venv/bin/python -m pytest _tests/playwright/test_*.py  # 377+ tests, will timeout!
```

**TEST BUNDLE SIZES (Approximate execution times):**
- `test_rag_*.py`: 53 tests (~5 minutes)
- `test_function_*.py`: 40+ tests (~4 minutes)  
- `test_mcp_*.py`: 26 tests (~3 minutes)
- `test_modals.py`: 20+ tests (~2 minutes)
- **FULL SUITE**: 377+ tests (~15-20 minutes) - ALWAYS RUN IN BATCHES!

**TIMEOUT BEST PRACTICES:**
1. Single test file: Default timeout is usually fine
2. 10-20 tests: Use `--timeout=300` (5 minutes)
3. 20-50 tests: Use `--timeout=600` (10 minutes)
4. 50+ tests: SPLIT INTO BATCHES or use `--timeout=1200` (20 minutes)
5. For CI/CD: Always use explicit timeouts and run in parallel batches

**Project Metrics:**
```bash
# From project root
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
├── default-prompts/         # System prompt components
└── default-functions/       # Built-in function groups (4 modules)
    ├── rc4-encryption.js    # RC4 encryption functions
    ├── math-utilities.js    # Mathematical utilities
    ├── api-auth-client.js   # API authentication
    └── mcp-example.js       # MCP example functions
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
Refactored from monolithic ~800-line service into focused modules with clear dependencies:
- `function-tools-service.js` - Main orchestrator (public API, maintains backward compatibility)
- `function-tools-config.js` - Configuration constants and storage keys
- `function-tools-logger.js` - Centralized logging utilities with debug prefixes
- `function-tools-storage.js` - localStorage operations and registry state management
- `function-tools-parser.js` - Argument parsing with type conversion and JSDoc parsing
- `function-tools-executor.js` - Sandboxed function execution with timeout handling
- `function-tools-registry.js` - Function registry management and grouping logic
- `function-tools-processor.js` - Tool call processing from API responses

**Loading Order**: Must be loaded in dependency order in `index.html` for proper initialization

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

### RAG (Retrieval-Augmented Generation) System
**IMPORTANT: RAG is ONLY available with OpenAI provider** (requires embeddings API)
- Automatically disabled when switching to non-OpenAI providers (Groq, Berget, Ollama, etc.)
- Provider-specific query expansion models:
  - OpenAI: `gpt-4.1-mini` (optimized for diverse search terms)
  - Groq: `openai/gpt-oss-20b` (20B model for query expansion)
  - Berget: `mistralai/Devstral-Small-2505` (Devstral model)
- Visual indicators show when/why RAG is disabled
- Checkbox is grayed out with warning message for non-OpenAI providers

### Function Calling System
- Allows JavaScript functions to be executed by AI models
- 8-module refactored architecture in `js/services/function-tools-*.js`
- Functions tagged with `@callable` or `@tool` become available to models
- Built-in RC4 encryption/decryption functions for testing

### Default Functions System
- Pre-built JavaScript function groups in `js/default-functions/`
- Mirrors the Default Prompts functionality but for executable functions
- Easy enable/disable via checkboxes in Function Calling UI
- Function groups include: RC4 encryption, math utilities, API authentication, MCP examples
- Functions persist across sessions and integrate with Function Tools Service
- All functions follow standardized patterns: return objects, include error handling, use `@callable` annotation

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
- Uses `gpt-5-nano` model for cost efficiency
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
- Uses `gpt-5-nano` model for cost efficiency
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
- **Test against real APIs** - no mocking, use `gpt-5-nano` for cost efficiency
- **Include comprehensive debug context** in screenshot metadata for LLM-assisted debugging
- **Use multi-level output capture** - terminal output, test logs, and screenshot reports
- **Handle modals proactively** with `page.on("dialog")` handlers before triggering actions
- **Wait for specific conditions** rather than arbitrary timeouts when possible
- **Organize tests by complexity** - core, feature, and API integration categories

### UI Element Identifiers for Testing

**CRITICAL: Use these exact identifiers in tests - these are confirmed working selectors:**

#### Modal Identifiers
```python
# Main modal containers
"#welcome-modal"           # Welcome/onboarding modal
"#settings-modal"          # Settings configuration modal  
"#function-modal"          # Function calling modal
"#prompts-modal"           # Prompts management modal
"#share-modal"             # Share link modal
"#rag-modal"               # RAG system modal
"#function-execution-modal" # Function execution approval modal
"#mcp-servers-modal"       # MCP servers configuration modal

# Modal close buttons
"#close-welcome-modal"     # Close welcome modal
"#close-settings"          # Close settings modal (NOT #close-settings-modal)
"#close-function-modal"    # Close function modal
"#close-prompts-modal"     # Close prompts modal
"#close-share-modal"       # Close share modal
"#close-rag-modal"         # Close RAG modal
"#close-mcp-servers-modal" # Close MCP servers modal
```

#### MCP Modal Elements
```python
"#mcp-servers-btn"         # Open MCP servers modal button
"#mcp-servers-modal"       # MCP servers modal container
"#close-mcp-servers-modal" # Close MCP modal button
"#mcp-servers-info-icon"   # MCP info icon

# MCP Proxy Connection (dynamically created)
"#mcp-proxy-placeholder"   # Placeholder for proxy section
"#mcp-proxy-url"          # Proxy URL input field (created dynamically)
"#test-proxy-btn"         # Test connection button (created dynamically)
"#proxy-status"           # Proxy connection status (created dynamically)
"#server-instructions"    # Server instructions section (created dynamically)

# MCP Server Form
"#mcp-server-url"         # Server URL input field
"#mcp-server-list"        # List of connected servers
"#mcp-quick-connectors-placeholder" # Quick connectors section

# MCP Configuration Options
"#mcp-share-link-enable"  # Enable share link button
"#mcp-introspection-enable" # Enable introspection button
"#mcp-oauth-config-btn"   # Configure OAuth button

# Input Mode Radio Buttons
'input[name="input-mode"][value="command"]' # Simple command mode
'input[name="input-mode"][value="json"]'    # JSON config mode
```

#### Settings Modal Elements
```python
"#api-key-update"          # API key input field (NOT #api-key-input)
"#base-url-select"         # Provider selection dropdown
"#model-select"            # Model selection dropdown
"#yolo-mode-checkbox"      # YOLO mode checkbox (NOT #yolo-mode)
"#namespace-input"         # Namespace input field
"#clear-namespace-select"  # Namespace clearing dropdown
```

#### Chat Interface Elements
```python
"#message-input"           # Chat message input (NOT #chat-input)
"#send-btn"                # Send message button (NOT #send-message-btn)
"#clear-chat-btn"          # Clear chat button
"#copy-chat-btn"           # Copy chat button
".message"                 # All chat message containers
".message.assistant"       # Assistant messages (NOT .assistant-message)
".message.user"            # User messages (NOT .user-message)
".message.system"          # System messages (NOT .system-message)
".chat-messages"           # Chat messages container

# IMPORTANT: Assistant messages use .message.assistant, not .assistant-message!
# When a function executes, you typically get 2 assistant messages:
# 1. Initial response acknowledging the function call
# 2. Final response with the function result
```

#### Function Execution Modal Elements
```python
# Tabs
"#exec-request-tab"        # Request parameters tab
"#exec-result-tab"         # Result viewing tab

# Buttons
"#exec-execute-btn"        # Execute function button
"#exec-block-btn"          # Block function button
"#exec-intercept-btn"      # Execute + Intercept button
"#exec-restore-btn"        # Restore original parameters
"#exec-return-btn"         # Return modified result
"#exec-block-result-btn"   # Block result after execution

# Content areas
"#exec-function-name"      # Function name display
"#exec-args-textarea"      # Parameters textarea
"#exec-result-textarea"    # Result textarea
"#exec-remember-choice"    # Remember choice checkbox
```

#### Function Modal Elements
```python
"#function-code"           # Function code editor
"#function-name"           # Function name field (read-only, auto-populated)
"#function-validate-btn"   # Validate function button
"#function-list"           # Function list container
".function-item"           # Individual function items
".function-item-name"      # Function name in list
".function-collection-container" # Function collection container
".function-collection-delete" # Delete collection button (NOT individual delete)
"#empty-function-state"    # Empty state message
```

#### Button Identifiers
```python
"#settings-btn"            # Open settings button
"#prompts-btn"             # Open prompts button
"#share-btn"               # Open share button
"#function-btn"            # Open function calling button
"#rag-btn"                 # Open RAG button
"#mcp-servers-btn"         # Open MCP servers button
```

**Common Testing Mistakes to Avoid:**
- ❌ Using `#close-settings-modal` → ✅ Use `#close-settings`
- ❌ Using `#api-key-input` → ✅ Use `#api-key-update`
- ❌ Using `#chat-input` → ✅ Use `#message-input`
- ❌ Using `#send-message-btn` → ✅ Use `#send-btn`
- ❌ Using `#yolo-mode` → ✅ Use `#yolo-mode-checkbox`
- ❌ Using `.function-item-delete` → ✅ Use `.function-collection-delete`
- ❌ Using `.assistant-message` → ✅ Use `.message.assistant`
- ❌ Setting localStorage directly for encrypted data → ✅ Configure through UI
- ❌ Looking for `.function-result-icon` → ✅ Check `.message.assistant` count increases

**Testing Function Execution:**
1. After sending a message that triggers a function call, the execution modal appears
2. Click `#exec-execute-btn` to approve the function execution
3. Wait for the modal to close: `page.wait_for_selector("#function-execution-modal", state="hidden")`
4. **CRITICAL**: Wait for response generation to complete:
   - The send button (`#send-btn`) gets `data-generating="true"` attribute during generation
   - The button title changes to "Stop generation" during generation
   - Wait for generation to complete:
     ```python
     page.wait_for_function(
         """() => {
             const btn = document.querySelector('#send-btn');
             return btn && !btn.hasAttribute('data-generating');
         }""",
         timeout=30000
     )
     ```
   - This ensures the full response has been generated before checking content
5. Wait for and check assistant response:
   ```python
   # Wait for assistant message content to be visible
   page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=15000)
   
   # Get the assistant response messages
   assistant_messages = page.locator(".message.assistant .message-content")
   
   # Find non-empty assistant response
   for i in range(assistant_messages.count()):
       msg_content = assistant_messages.nth(i).text_content()
       if msg_content and msg_content.strip():
           actual_response = msg_content.strip()
           break
   ```
6. Assistant messages use `.message.assistant` with content in `.message-content` child element
7. **Note**: Message content streams in progressively, always wait for `data-generating` to be removed before checking content

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
7. **Test against real APIs** using `gpt-5-nano` model for actual functionality validation
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