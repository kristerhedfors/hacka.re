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
- **Component-based architecture** with manager classes for different concerns
- **Service-oriented design** with separate modules for API, storage, encryption, etc.
- **Event-driven UI** interactions with vanilla JavaScript

### Key Directories
```
js/
├── app.js                    # Application initialization
├── components/               # UI component managers
│   ├── chat-manager.js      # Chat interface logic
│   ├── settings-manager.js  # Settings modal and configuration
│   ├── function-calling-manager.js # Function execution UI
│   └── share-manager.js     # Secure sharing functionality
├── services/                # Core business logic
│   ├── api-service.js       # API communication
│   ├── storage-service.js   # Local data persistence
│   ├── encryption-service.js # Data encryption (TweetNaCl)
│   ├── function-tools-*.js  # Function calling system (8 modules)
│   └── link-sharing-service.js # Encrypted sharing
├── utils/                   # Utility functions
└── default-prompts/         # System prompt components
```

### Service Architecture
- **APIService**: Handles communication with OpenAI-compatible APIs
- **StorageService**: Manages encrypted localStorage persistence
- **EncryptionService**: Handles data encryption using TweetNaCl
- **FunctionToolsService**: 8-module system for JavaScript function execution
- **LinkSharingService**: Creates encrypted, password-protected shareable links
- **NamespaceService**: Multi-tenant data isolation

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

### Code Organization
- Component managers handle UI state and interactions
- Services contain business logic and data operations
- Utilities provide shared helper functions
- Default prompts are modular components

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
1. Service modules are in `js/services/`
2. Follow existing patterns for error handling and logging
3. Update related manager components in `js/components/`
4. Add corresponding tests to validate functionality

The codebase emphasizes privacy, security, and real-world testing with actual AI APIs rather than mocked responses.