# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

hacka.re is a privacy-focused, serverless chat interface for OpenAI-compatible APIs built with pure HTML, CSS, and JavaScript. It runs entirely client-side with no backend server, ensuring user privacy and data control.

## Development Commands

### Environment Setup
```bash
# One-time setup - creates Python virtual environment and installs dependencies
./setup_environment.sh

# Activate environment in new terminals
source _venv/bin/activate
```

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

## Testing Approach

### Test Philosophy
- **No mocking** - all tests use real API calls to validate actual functionality
- Uses `gpt-4o-mini` model for cost efficiency
- Playwright browser automation for comprehensive UI testing
- API key configured in `_tests/playwright/.env`

### Test Categories
- **Core tests**: Basic UI, API configuration, chat functionality
- **Feature tests**: Function calling, sharing, themes, model selection
- **API integration**: Real function calling and model interaction tests

### Test Setup Requirements
```bash
# Copy and configure API key
cp .env.example _tests/playwright/.env
# Edit .env file with your OpenAI API key

# Tests automatically start/stop HTTP server on port 8000
# Use --skip-server flag if managing server manually
```

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

### Testing Requirements
- Always include debug information with screenshots using `screenshot_with_markdown()`
- Function name fields are auto-populated from code editor (read-only)
- Use proper waiting strategies: `page.wait_for_selector()` not `page.wait_for_timeout()`
- Dismiss welcome modal in tests with `dismiss_welcome_modal()`

### Security Considerations
- Never commit API keys or secrets
- All external libraries hosted locally (no CDN dependencies)
- Encrypted storage for sensitive data
- Secure sharing mechanism for credentials and conversations

## Linting and Validation

No traditional build system - this is a static web application. Run these for validation:

```bash
# Python code quality (in hacka_re_verifier/)
python -m flake8
python -m black --check .

# Security verification
python run_verifier.py

# Test suite serves as validation
cd _tests/playwright && ./run_core_tests.sh
```

## Common Development Tasks

### Adding New Functions
1. Functions defined in Function Calling UI automatically become available
2. Use JSDoc comments for better tool definitions
3. Tag with `@callable` or `@tool` if selective calling enabled

### Adding Tests
1. Create new test file in `_tests/playwright/`
2. Follow existing patterns with `conftest.py` fixtures
3. Always include `dismiss_welcome_modal()` after page navigation
4. Include debug information with screenshots

### Modifying Services
1. **Service modules** are in `js/services/` (33+ specialized files)
2. **Component modules** are in `js/components/` (39+ specialized files)
3. **Follow module patterns**: config → logger → storage → parser/registry → executor/processor → service
4. **Update related components**: settings/, function-calling/, mcp/, prompts/, ui/
5. **Service dependencies**: respect the established hierarchy
6. **Add corresponding tests** to validate functionality
7. **Update documentation** in `_tests/playwright/` for modal changes

The codebase emphasizes privacy, security, and real-world testing with actual AI APIs rather than mocked responses.