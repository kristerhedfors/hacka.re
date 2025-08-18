# hacka.re Complete Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Security & Privacy](#security--privacy)
4. [Core Features](#core-features)
5. [Testing Infrastructure](#testing-infrastructure)
6. [Development Guide](#development-guide)
7. [Use Cases](#use-cases)
8. [Advanced Features](#advanced-features)
9. [Command Line Interface](#command-line-interface)
10. [Troubleshooting](#troubleshooting)
11. [OWASP Security Guidelines](#owasp-security-guidelines)
12. [Technical Specifications](#technical-specifications)

---

## Project Overview

### What is hacka.re

hacka.re is a privacy-focused, serverless chat interface for OpenAI-compatible APIs built with pure HTML, CSS, and ES6 JavaScript. The name "hacka.re" comes from "hackare" which translates to "whitehat hacker" in Swedish, reflecting the project's ethos: a tool built by whitehat hackers, for whitehat hackers. The tagline "Free, open, för hackare, av hackare" translates to "free, open, for whitehat hackers, by whitehat hackers."

### Core Principles

- **Privacy-First**: Your API key and conversations stay in your browser; no backend server involved
- **Serverless Architecture**: Runs entirely client-side with no server-side rendering or processing
- **No Build System**: Pure HTML, CSS, and ES6 JavaScript with no TypeScript compilation
- **Zero Analytics**: No tracking, telemetry, or data collection
- **Local Dependencies**: All external libraries hosted locally to prevent third-party CDN connections

### Key Features

- **Multiple Provider Support**: Compatible with Groq, OpenAI, Ollama, and custom endpoints
- **Context Window Visualization**: Real-time display of token usage within model's context limit
- **Markdown Support**: Rich formatting for AI responses including code blocks with syntax highlighting
- **Persistent History**: Conversation history saved locally between sessions
- **Function Calling**: Create JavaScript functions callable by AI models through OpenAI-compatible APIs
- **Secure Sharing**: Create encrypted, password-protected shareable links
- **Customizable System Prompts**: Configure system prompts to control AI behavior
- **Theme Options**: Multiple visual themes for customization
- **Mobile Responsive**: Optimized for both desktop and mobile devices

---

## Architecture

### Project Structure

```
hacka.re/
├── index.html                    # Main application page
├── css/                         # Stylesheets
├── js/
│   ├── app.js                   # Application initialization
│   ├── components/              # UI component managers (39 files)
│   │   ├── chat-manager.js      # Chat interface orchestrator
│   │   ├── function-calling/    # Function system (11 specialized modules)
│   │   ├── settings/            # Settings system (13 specialized modules)
│   │   ├── mcp/                 # Model Context Protocol (6 modules)
│   │   ├── prompts/             # Prompts system (5 modules)
│   │   ├── ui/                  # UI components (5 modules)
│   │   └── share-manager.js     # Secure sharing functionality
│   ├── services/                # Core business logic (33 files)
│   │   ├── api-*.js            # API services (7 modules)
│   │   ├── function-tools-*.js # Function calling system (8 modules)
│   │   ├── mcp-*.js            # MCP services (5 modules)
│   │   ├── storage-*.js        # Storage services (4 modules)
│   │   └── ...                 # Additional service categories
│   ├── utils/                   # Utility functions (7 modules)
│   ├── default-prompts/         # System prompt components
│   └── default-functions/       # Built-in function groups (4 modules)
├── lib/                         # Third-party libraries (hosted locally)
├── about/                       # Information pages
└── _tests/                      # Comprehensive test suite
```

### Service Architecture

The application follows a **service-oriented architecture** with specialized modules:

**API Services (7 modules):**
- `api-service.js` - Main API communication layer
- `api-request-builder.js` - Request construction
- `api-response-parser.js` - Response parsing
- `api-stream-processor.js` - Streaming response handling
- `api-tool-call-handler.js` - Tool call processing
- `api-debugger.js` - API debugging utilities
- `api-tools-service.js` - API tools integration

**Function Tools System (8 modules):**
Refactored from monolithic ~800-line service into focused modules:
- `function-tools-service.js` - Main orchestrator (public API, maintains backward compatibility)
- `function-tools-config.js` - Configuration constants and storage keys
- `function-tools-logger.js` - Centralized logging utilities with debug prefixes
- `function-tools-storage.js` - localStorage operations and registry state management
- `function-tools-parser.js` - Argument parsing with type conversion and JSDoc parsing
- `function-tools-executor.js` - Sandboxed function execution with timeout handling
- `function-tools-registry.js` - Function registry management and grouping logic
- `function-tools-processor.js` - Tool call processing from API responses

**Storage Services (4 modules):**
- `storage-service.js` - Main storage interface
- `core-storage-service.js` - Core storage operations
- `encryption-service.js` - Data encryption (TweetNaCl)
- `namespace-service.js` - Multi-tenant data isolation

### Component Management

**Manager Pattern**: Specialized component managers handle focused UI responsibilities:
- **function-calling/** - 11 specialized modules for function system UI
- **settings/** - 13 specialized modules for configuration management
- **mcp/** - 6 modules for Model Context Protocol integration
- **prompts/** - 5 modules for prompt system management
- **ui/** - 5 modules for general UI components

---

## Security & Privacy

### Cryptographic System

The application uses **TweetNaCl.js** for cryptographic operations, providing high-security symmetric encryption.

**Cryptographic Primitives:**
- **Hash Function**: SHA-256 (implemented using TweetNaCl's SHA-512 truncated to 256 bits)
- **Symmetric Encryption**: XSalsa20-Poly1305 (TweetNaCl's secretbox)
- **Key Size**: 256 bits (32 bytes)
- **Nonce Size**: 192 bits (24 bytes)
- **Key Derivation**: Custom derivation based on 10,000 iterations of SHA-512

### Storage Type Determination

The application dynamically determines storage type based on access method:

**Direct Visit → Session Storage (Maximum Privacy)**
- **Storage Type**: `sessionStorage` (temporary)
- **Data Persistence**: Only while browser tab is open
- **Privacy Level**: Maximum - all data cleared when tab closes
- **Namespace**: Uses fixed `default_session` namespace

**Shared Link → Local Storage (Persistent Conversations)**
- **Storage Type**: `localStorage` (persistent)
- **Data Persistence**: Survives browser restarts
- **Privacy Level**: Balanced - data is encrypted and namespaced
- **Namespace**: Derived from shared link content (first 8 characters of SHA-256 hash)

### Namespace System

**Namespace Isolation**: Different chat contexts are isolated using namespaces:
- **Format**: `aihackare_namespace_<8-random-alnum-chars>`
- **Generation**: 8 random alphanumeric characters (~47.6 bits entropy)
- **Storage Structure**: Each namespace contains encrypted API keys, model selections, chat history, system prompts, UI preferences, and custom functions

### Key Hierarchy

1. **Session Key** - User-provided password (stored in memory only)
2. **Namespace Hash** - Derived from title and subtitle
3. **Master Key** - Randomly generated 256-bit key (unique per namespace)
4. **Derived Encryption Keys** - Derived from master key + salt for each operation

### Secure Sharing Mechanism

**Features**:
- API Provider and Key sharing
- Active Model sharing with automatic fallback
- System Prompt sharing
- Function Library sharing
- Conversation Data sharing (configurable message count)

**Security**:
- Session key-protected URL-based sharing
- Encrypted blob in URL never touches web servers
- TweetNaCl encryption for all shared data
- Session key-based key derivation

---

## Core Features

### Function Calling System

**Architecture**: 8-module refactored system in `js/services/function-tools-*.js`

**Functionality**:
- JavaScript functions tagged with `@callable` or `@tool` become available to models
- Functions execute in sandboxed environment with timeout handling
- Built-in error handling and type conversion
- JSDoc parsing for better tool definitions

**Default Functions**: Pre-built function groups in `js/default-functions/`:
- **RC4 Encryption** (`rc4-encryption.js`) - Encryption/decryption functions for testing
- **Math Utilities** (`math-utilities.js`) - Mathematical operations
- **API Authentication** (`api-auth-client.js`) - API authentication helpers
- **MCP Examples** (`mcp-example.js`) - MCP integration examples

### Model Context Protocol (MCP) Integration

**MCP Client**: Zero-dependency MCP client implementation

**Core Components**:
- **MCPClientService** (`js/services/mcp-client-service.js`) - Core MCP protocol implementation
- **MCPManager** (`js/components/mcp-manager.js`) - UI for managing connections
- **mcp-stdio-proxy** (`mcp-stdio-proxy/server.js`) - Node.js proxy for local MCP servers

**Transport Support**:
- **SSE (Server-Sent Events)** - For HTTP-based MCP servers
- **Stdio** - For local command-line MCP servers (requires proxy)

**Integration**: MCP tools automatically register as hacka.re functions with prefix `mcp_<server>_<tool>`

### Multi-Provider Support

**Supported Providers**:
- OpenAI (GPT-4, GPT-3.5, etc.)
- Groq (Llama models, Gemma, etc.)
- Ollama (local models)
- Custom OpenAI-compatible endpoints

**Features**:
- Real-time context window visualization
- Token counting and usage tracking
- Model fallback handling
- Streaming response support

---

## Testing Infrastructure

### Test Philosophy

**Real API Testing**: No mocking - all tests use real API calls to validate actual functionality
- Uses `gpt-4o-mini` model for cost efficiency
- Validates against actual LLM providers
- Ensures real-world compatibility

### Test Architecture

```
_tests/playwright/
├── conftest.py                    # Core pytest fixtures and configuration
├── test_utils.py                  # Common utilities and helper functions
├── function_calling_api/          # Specialized API testing suite
├── debug_tests/                   # Temporary debugging tests
├── run_*.sh                      # Test execution scripts
└── test_*.py                     # Main test files (80+ tests)
```

### Test Categories

**Core Tests** (`./run_core_tests.sh` - Quick validation):
- `test_page.py` - Basic UI and page loading
- `test_api.py` - API configuration and model selection
- `test_chat.py` - Basic chat functionality
- `test_welcome_modal.py` - Welcome modal behavior

**Feature Tests** (`./run_feature_tests.sh` - Advanced functionality):
- `test_function_*.py` - Function calling system (multiple files)
- `test_mcp_*.py` - Model Context Protocol integration
- `test_sharing.py` - Secure sharing functionality
- `test_themes.py` - Theme switching and mobile responsiveness
- `test_modals.py` - Modal interactions

**MCP Tests** (`./run_mcp_tests.sh`):
- **Unit Tests** (18 tests) - Mocked dependencies for isolated testing
- **Integration Tests** (8 tests) - Real MCP proxy and server testing

### Screenshot-Driven Debugging

**Multi-Level Output Capture**:
1. **Raw Terminal Output** - Complete stdout/stderr with interruption handling
2. **Test-Specific Output** - Direct pytest output with console messages
3. **Debug Screenshots** - Contextual screenshots with metadata

**Debug Information Requirements**:
```python
screenshot_with_markdown(page, "test_phase", {
    "Status": "After clicking button",
    "Component": "Function Calling Modal", 
    "Error": error_message if error else "None",
    "API Key": "Configured" if api_key else "None"
})
```

### Testing Best Practices

**Modal Management**:
- Always dismiss welcome modal with `dismiss_welcome_modal(page)` after navigation
- Handle dialogs proactively with `page.on("dialog")` handlers

**Function Name Auto-Population**:
- Function name field is read-only and auto-populated from code editor
- Set function code first, then wait for auto-population

**Waiting Strategies**:
```python
# Good - Wait for specific conditions
page.wait_for_selector("#element", state="visible", timeout=5000)

# Avoid - Arbitrary timeouts
page.wait_for_timeout(500)  # Not recommended
```

**Debug Information**:
- All tests must include comprehensive debug information with screenshots
- Essential for LLM-assisted debugging and interrupted test analysis

---

## Development Guide

### Environment Setup

```bash
# One-time setup - creates Python virtual environment and installs dependencies
./setup_environment.sh

# Activate environment in new terminals
source _venv/bin/activate

# To deactivate
deactivate
```

### Development Commands

**Testing**:
```bash
cd _tests/playwright

# Core functionality tests (quick validation)
./run_core_tests.sh

# Advanced feature tests 
./run_feature_tests.sh

# All tests (comprehensive - 377+ tests)
./run_tests.sh

# MCP-specific tests
./run_mcp_tests.sh              # All MCP tests (26 tests)
./run_mcp_tests.sh --unit       # Unit tests only (18 tests)
./run_mcp_tests.sh --integration # Integration tests (8 tests)
```

**Security Verification**:
```bash
python run_verifier.py
```

### Code Organization Principles

**Service Architecture**:
- **Specialized component managers** handle focused UI responsibilities
- **Modular services** contain business logic with single responsibilities
- **Manager pattern** with coordinators orchestrating specialized components
- **Service layer architecture** with clear dependency hierarchies

**Refactoring Philosophy**:
- **Remove old functionality** when refactoring - no backwards compatibility retention
- Clean removal ensures new architecture remains pure and maintainable
- Delete deprecated functions, unused imports, and legacy code paths completely

### Code Style Preferences

- Use ES modules (import/export) syntax
- Destructure imports when possible
- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Use async/await instead of Promise chains
- Prefer const/let over var

### Adding New Features

**Function Calling**:
1. Functions defined in Function Calling UI automatically become available
2. Use JSDoc comments for better tool definitions
3. Tag with `@callable` or `@tool` if selective calling enabled

**Services**:
1. Follow module patterns: config → logger → storage → parser/registry → executor/processor → service
2. Update related components in appropriate categories
3. Respect established service dependencies
4. Add corresponding tests

---

## Use Cases

### Privacy-Focused Usage

**Direct Access** (Maximum Privacy):
- Navigate directly to hacka.re
- Uses sessionStorage (temporary)
- Data cleared when tab closes
- No conversation persistence
- Ideal for sensitive conversations or shared computers

### Collaborative Usage

**Shared Links** (Persistent Conversations):
- Access via shared link with encrypted configuration
- Uses localStorage (persistent)
- Data survives browser restarts
- Conversation history maintained
- Bookmarkable conversations

### Function Calling Scenarios

**Built-in Functions**:
- RC4 encryption/decryption for testing
- Mathematical calculations
- API authentication helpers
- MCP server integration examples

**Custom Functions**:
- JavaScript functions become available to AI models
- Sandboxed execution with timeout handling
- Error handling and type conversion
- JSDoc parsing for tool definitions

### MCP Integration Examples

**Local Servers**:
```bash
# Start MCP proxy
cd mcp-stdio-proxy
node server.js

# Connect to filesystem server
mcp_connect_example("stdio", "filesystem", {
    command: "npx",
    args: ["@modelcontextprotocol/server-filesystem", "/path/to/directory"]
})
```

**HTTP Servers**:
```javascript
// Connect to HTTP MCP server
mcp_connect_example("sse", "my-server", {
    url: "http://localhost:3000/mcp",
    headers: { "Authorization": "Bearer token" }
})
```

---

## Advanced Features

### Agent Orchestration System

**Performance Improvements**:
- Agent Loading Time: 70-80% faster (100-300ms cached vs 2-5 seconds)
- Cache Hit Loading: 100-300ms (instant switching)
- Multi-Agent Setup: Background batch processing vs manual per agent

**Core Services**:
- **AgentCache** - High-performance in-memory caching
- **AgentService** - Extended with fast loading methods
- **AgentOrchestrator** - High-level multi-agent coordination

**Usage Patterns**:
```javascript
// Quick agent switching
await AgentOrchestrator.switchToAgent("researcher", {
    preloadNext: true,
    preloadList: ["coder"],
    onProgress: (stage, msg) => console.log(msg)
});

// Prepare multiple agents
await AgentOrchestrator.prepareAgents(["researcher", "coder", "analyst"], {
    background: true,
    onProgress: (stage, msg) => console.log(msg)
});
```

### Performance Optimizations

**Caching Strategies**:
- In-memory agent configuration caching
- Differential configuration application
- Background preloading of related agents

**Loading Optimizations**:
- Service dependencies loaded in proper order
- Lazy loading of non-critical components
- Efficient DOM manipulation patterns

---

## Command Line Interface

### Future `hackare` Command

*Placeholder section for future command-line interface development*

**Planned Features**:
- Local server management
- Configuration automation
- Batch operations
- Integration with development workflows

**Integration Patterns**:
- Agent orchestration from command line
- Automated testing execution
- Configuration deployment
- Multi-environment management

---

## Troubleshooting

### Common Issues

**"My conversations disappeared!"**
- If using session storage: This is normal - data doesn't persist
- If using local storage: Ensure you're using the same shared link

**"Settings aren't saving"**
- Check if you're in session storage mode (direct URL access)
- Switch to a shared link for persistent settings

**"Can't access shared data"**
- Ensure you have the correct session key (password)
- Verify you're using the exact same shared link

### Browser Compatibility

**Supported Browsers**:
- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

**Known Limitations**:
- Some clipboard API features may not work on all platforms
- Local file access restrictions vary by browser
- CORS restrictions for MCP servers

### Performance Issues

**Large Context Windows**:
- Monitor token usage in context window visualization
- Clear chat history periodically
- Use appropriate models for context size

**Function Execution**:
- Functions have timeout handling (configurable)
- Error handling provides detailed feedback
- Console logging available for debugging

---

## OWASP Security Guidelines

### OWASP Top 10 for LLM Applications

hacka.re incorporates security awareness from the OWASP Top 10 for Large Language Model Applications (2025). Key considerations:

**LLM01: Prompt Injection**
- Input validation and filtering
- System prompt protection
- Separation of user and system content

**LLM02: Sensitive Information Disclosure**
- Data sanitization techniques
- Access controls and least privilege
- User education on safe usage

**LLM03: Supply Chain**
- Local dependency hosting
- Vulnerability scanning
- Component inventory management

**LLM04: Data and Model Poisoning**
- Input validation
- Training data verification
- Anomaly detection

**LLM05: Improper Output Handling**
- Output validation and sanitization
- Context-aware encoding
- Zero-trust approach to model outputs

**LLM06: Excessive Agency**
- Minimal extension permissions
- Human approval for high-risk actions
- Privilege separation

**LLM07: System Prompt Leakage**
- Separation of sensitive data from prompts
- Independent security controls
- Guardrail implementation

**LLM08: Vector and Embedding Weaknesses**
- Access controls for embeddings
- Data validation pipelines
- Monitoring and logging

**LLM09: Misinformation**
- Cross-verification mechanisms
- User education on limitations
- Content filtering

**LLM10: Unbounded Consumption**
- Rate limiting and quotas
- Resource monitoring
- Input validation

---

## Technical Specifications

### System Requirements

**Browser Requirements**:
- Modern browser with ES6 support
- Local storage and session storage support
- Web Crypto API support
- CORS support for API requests

**Network Requirements**:
- Internet connection for AI model APIs
- HTTPS support for secure communication
- Optional: Local network access for MCP servers

### File Structure

**Core Files**:
- `index.html` - Main application entry point
- `css/styles.css` - Main stylesheet
- `js/app.js` - Application initialization

**Dependencies**:
- All libraries hosted locally in `lib/` directory
- No CDN dependencies for privacy
- TweetNaCl for cryptography
- Marked for markdown parsing
- DOMPurify for sanitization

### Browser Storage

**Session Storage** (Temporary):
- Used for direct access
- Cleared when tab closes
- Maximum privacy mode

**Local Storage** (Persistent):
- Used for shared links
- Encrypted with TweetNaCl
- Namespace isolation

### API Compatibility

**OpenAI-Compatible APIs**:
- Chat completions endpoint
- Function calling support
- Streaming responses
- Token usage tracking

**Supported Models**:
- OpenAI GPT models
- Groq models (Llama, Gemma, etc.)
- Ollama local models
- Custom endpoints

### Performance Metrics

**Loading Times**:
- Initial page load: <2 seconds
- Agent switching: 100-300ms (cached)
- Function execution: Configurable timeouts

**Memory Usage**:
- Efficient DOM manipulation
- Minimal memory footprint
- Garbage collection friendly

---

## License

MIT License - See project repository for full license text.

---

*This documentation covers hacka.re as a privacy-focused, serverless chat interface for AI models. All features described are implemented and tested. For the most current information, refer to the project repository.*