# hacka.re Project Sitemap

## Overview
hacka.re is a privacy-focused, serverless chat interface for OpenAI-compatible APIs built with pure HTML, CSS, and JavaScript. It runs entirely client-side with no backend server, ensuring user privacy and data control.

## Core Architecture

### Main Application Files
```
/
├── index.html                          # Main application entry point
├── CLAUDE.md                          # Project instructions for Claude Code
├── README.md                          # Main project documentation
├── LICENSE                            # MIT License
├── CNAME                             # GitHub Pages domain configuration
└── _config.yml                       # Jekyll configuration
```

### JavaScript Architecture (js/)
```
js/
├── app.js                            # Application initialization and bootstrap
├── script.js                         # Legacy main script file
├── components/                       # UI component managers (39 specialized files)
│   ├── chat-manager.js              # Chat interface orchestration
│   ├── function-calling-manager.js  # Function calling system coordinator
│   ├── mcp-manager.js               # Model Context Protocol management
│   ├── share-manager.js             # Secure sharing functionality
│   ├── ui-manager.js                # Global UI coordination
│   ├── function-calling/            # Function system (11 specialized modules)
│   │   ├── function-calling-manager.js      # Main orchestrator
│   │   ├── function-code-editor.js          # Code editor component
│   │   ├── function-modal-manager.js        # Modal UI management
│   │   ├── function-list-renderer.js        # List display
│   │   ├── default-functions-manager.js     # Default functions handling
│   │   ├── function-executor.js             # Function execution engine
│   │   ├── function-library-manager.js      # Library management
│   │   ├── function-parser.js               # Function parsing logic
│   │   └── ... (4 more specialized modules)
│   ├── settings/                    # Settings system (15 specialized modules)
│   │   ├── settings-coordinator.js          # Core coordination
│   │   ├── settings-state-manager.js        # State management
│   │   ├── api-key-manager.js               # API key handling
│   │   ├── model-manager.js                 # Model selection
│   │   ├── system-prompt-manager.js         # System prompts
│   │   ├── welcome-manager.js               # Welcome modal
│   │   └── ... (9 more specialized modules)
│   ├── mcp/                         # Model Context Protocol (12 modules)
│   │   ├── mcp-oauth-integration.js         # OAuth integration
│   │   ├── mcp-proxy-manager.js             # Proxy management
│   │   ├── mcp-ui-manager.js                # UI components
│   │   └── ... (9 more MCP modules)
│   ├── prompts/                     # Prompts system (2 modules)
│   ├── ui/                          # UI components (6 modules)
│   └── share/                       # Sharing components (2 modules)
├── services/                        # Core business logic (33 specialized files)
│   ├── API Services (7 modules):
│   │   ├── api-service.js                   # Main API communication layer
│   │   ├── api-request-builder.js           # Request construction
│   │   ├── api-response-parser.js           # Response parsing
│   │   ├── api-stream-processor.js          # Streaming response handling
│   │   ├── api-tool-call-handler.js         # Tool call processing
│   │   ├── api-debugger.js                  # API debugging utilities
│   │   └── api-tools-service.js             # API tools integration
│   ├── Function Tools System (8 modules):
│   │   ├── function-tools-service.js        # Main orchestrator
│   │   ├── function-tools-config.js         # Configuration constants
│   │   ├── function-tools-storage.js        # Storage operations
│   │   ├── function-tools-parser.js         # Argument parsing
│   │   ├── function-tools-executor.js       # Sandboxed execution
│   │   ├── function-tools-registry.js       # Function registry
│   │   ├── function-tools-processor.js      # Tool call processing
│   │   └── function-tools-logger.js         # Centralized logging
│   ├── MCP Services (9 modules):
│   │   ├── mcp-client-core.js               # Core MCP functionality
│   │   ├── mcp-connection-manager.js        # Connection management
│   │   ├── mcp-transport-service.js         # Transport layer
│   │   ├── mcp-oauth-service.js             # OAuth integration
│   │   ├── mcp-auth-strategies.js           # Authentication strategies
│   │   └── ... (4 more MCP services)
│   ├── Storage Services (4 modules):
│   │   ├── storage-service.js               # Main storage interface
│   │   ├── core-storage-service.js          # Core storage operations
│   │   ├── encryption-service.js            # Data encryption (TweetNaCl)
│   │   └── namespace-service.js             # Multi-tenant data isolation
│   └── Additional Services (5 modules):
│       ├── link-sharing-service.js          # Encrypted sharing
│       ├── chat-streaming-service.js        # Chat streaming
│       ├── prompts-service.js               # Prompts management
│       ├── model-info.js                    # Model information
│       └── ... (1 more service)
├── utils/                           # Utility functions (12 modules)
│   ├── crypto-utils.js                      # Cryptographic utilities
│   ├── api-key-detector.js                 # API key detection
│   ├── function-call-renderer.js           # Function call rendering
│   ├── smart-tooltip-positioner.js         # Tooltip positioning
│   └── ... (8 more utilities)
├── default-functions/               # Built-in functions (4 modules)
│   ├── rc4-encryption.js                   # RC4 encryption functions
│   ├── math-utilities.js                   # Mathematical utilities
│   ├── api-auth-client.js                  # API authentication
│   └── mcp-example.js                      # MCP example functions
├── default-prompts/                # System prompt components (12 modules)
│   ├── hacka-re-project.js                 # Project information
│   ├── function-calling.js                 # Function calling prompts
│   ├── agent-orchestration.js              # Agent orchestration
│   ├── owasp-llm-top10.js                  # OWASP LLM security
│   └── ... (8 more prompts)
├── providers/                       # External service providers
│   └── github/                             # GitHub integration (6 modules)
│       ├── github-provider.js              # Main GitHub provider
│       ├── github-auth.js                  # GitHub authentication
│       ├── github-tools.js                 # GitHub API tools
│       └── ... (3 more GitHub modules)
└── config/                         # Configuration files (2 modules)
    ├── share-config.js                     # Sharing configuration
    └── share-items-registry.js             # Share items registry
```

### Stylesheets (css/)
```
css/
├── styles.css                              # Main application styles
├── themes.css                              # Theme system
├── function-calling.css                    # Function calling UI
├── function-calling-modal.css              # Function modal styles
├── mobile.css                              # Mobile responsive design
├── copy-code.css                           # Code copying functionality
├── default-functions.css                   # Default functions styling
├── default-prompts.css                     # Default prompts styling
├── function-details-modal.css              # Function details modal
├── function-indicators.css                 # Function indicators UI
├── function-indicators-simple.css          # Simplified indicators
├── function-calling-header-only.css        # Header-only function UI
└── checkbox-fix.css                        # Checkbox styling fixes
```

### External Libraries (lib/)
```
lib/
├── tweetnacl/                              # Cryptography library
│   ├── nacl-fast.min.js                   # NaCl crypto implementation
│   └── nacl-util.min.js                   # NaCl utilities
├── marked/                                 # Markdown parser
│   └── marked.min.js
├── dompurify/                             # HTML sanitization
│   └── purify.min.js
├── highlight.js/                          # Syntax highlighting
│   ├── highlight.min.js
│   └── github.min.css
├── qrcode/                                # QR code generation
│   └── qrcode.min.js
├── font-awesome/                          # Icon library
│   ├── all.min.css
│   └── webfonts.zip
└── webfonts/                              # Font files
    └── ... (6 web font files)
```

## Documentation and About Pages

### About Pages (about/)
```
about/
├── index.html                              # Main about page
├── architecture.html                       # Technical architecture
├── development.html                        # Development guide
├── research-report.html                    # Research findings
├── serverless.html                         # Serverless architecture
├── local-llm-toolbox.html                  # Local LLM guide
├── disclaimer.html                         # Usage disclaimer
├── thumbnail.html                          # Thumbnail generator
├── css/                                    # About page styles
│   ├── styles.css
│   ├── themes.css
│   ├── header.css
│   └── code-popup.css
└── js/                                     # About page scripts
    ├── script.js
    ├── themes.js
    ├── code-popup.js
    └── ... (4 more scripts)
```

### Documentation Files
```
/
├── CRYPTO_SPEC.md                          # Cryptography specification
├── MCP_INTEGRATION.md                      # MCP integration guide
├── MCP_OAUTH_IMPLEMENTATION.md             # OAuth implementation
├── MCP_OAUTH_2_1_COMPLIANCE.md             # OAuth 2.1 compliance
├── DEFAULT_FUNCTIONS_README.md             # Default functions guide
├── FUNCTION_CALLING_FIX_SUMMARY.md         # Function calling fixes
├── FUNCTIONS_MODAL_STYLE.md                # Modal styling guide
├── MCP_CLIENT_README.md                    # MCP client documentation
├── RELEASE_NOTES.md                        # Release notes
└── SERVICE_CONNECTOR_INTEGRATION.md        # Service connector guide
```

## Testing Infrastructure

### Test Suite (_tests/)
```
_tests/
├── playwright/                             # Playwright browser tests
│   ├── API Tests:
│   │   ├── test_api.py                     # API integration tests
│   │   ├── test_api_key_detection_simple.py # API key detection
│   │   └── test_chat_no_mock.py            # Real chat testing
│   ├── Function Calling Tests:
│   │   ├── test_function_modal.py          # Modal functionality
│   │   ├── test_function_editing.py        # Function editing
│   │   ├── test_function_deletion.py       # Function deletion
│   │   ├── test_function_parsing_logic.py  # Parsing logic
│   │   └── ... (8 more function tests)
│   ├── MCP Tests:
│   │   ├── test_mcp_integration.py         # MCP integration
│   │   ├── test_mcp_oauth_integration.py   # OAuth integration
│   │   ├── test_github_mcp_connection_after_auth.py # GitHub MCP
│   │   └── ... (12 more MCP tests)
│   ├── UI Tests:
│   │   ├── test_modals.py                  # Modal system tests
│   │   ├── test_themes.py                  # Theme switching
│   │   ├── test_button_tooltips.py         # Button tooltips
│   │   └── ... (15 more UI tests)
│   ├── Test Infrastructure:
│   │   ├── conftest.py                     # Test configuration
│   │   ├── test_utils.py                   # Test utilities
│   │   ├── run_tests.sh                    # Test runner
│   │   ├── run_core_tests.sh               # Core test runner
│   │   └── run_feature_tests.sh            # Feature test runner
│   └── Documentation:
│       ├── README.md                       # Test documentation
│       ├── TESTING_GUIDE.md                # Testing guidelines
│       └── ... (20+ test documentation files)
├── Unit Tests (Browser-based):
│   ├── function-calling-test.html          # Function calling tests
│   ├── storage-encryption-test.html        # Storage encryption tests
│   ├── link-sharing-service.test.js        # Link sharing tests
│   ├── crypto-utils.test.js                # Crypto utilities tests
│   └── ... (25+ browser-based tests)
└── Test Documentation:
    ├── README.md                           # Main test documentation
    └── STOP_GENERATION_SUMMARY.md          # Stop generation testing
```

## Security and Privacy Components

### Cryptographic Implementation
- **TweetNaCl Integration**: XSalsa20-Poly1305 authenticated encryption
- **Key Derivation**: 10,000 iterations of SHA-512 with salt
- **Namespace Isolation**: Multi-tenant data separation
- **Secure Sharing**: Encrypted URL-based sharing with strong passwords

### Privacy Architecture
- **Client-Side Only**: No backend server, no data logging
- **Local Storage**: Encrypted data storage in browser localStorage
- **No Telemetry**: No analytics, tracking, or external communications
- **Direct API Communication**: Browser → API Provider (no intermediary)

## Development and Deployment

### Development Environment
```
/
├── setup_environment.sh                    # Environment setup script
├── requirements.txt                        # Python dependencies
├── _venv/                                  # Python virtual environment
├── scripts/                                # Build and deployment scripts
│   ├── build-release-zip.sh               # Release packaging
│   ├── prepare-release.sh                 # Release preparation
│   └── project_metrics.sh                 # Project metrics
└── node_modules/                           # Node.js dependencies (if any)
```

### External Tools and Integrations
```
/
├── mcp-stdio-proxy/                        # MCP proxy server
│   ├── server.js                          # Main proxy server
│   ├── oauth-middleware.js                # OAuth middleware
│   ├── package.json                       # Node.js dependencies
│   └── ... (8 more proxy files)
├── hacka_re_verifier/                     # Security verification tool
│   ├── src/                               # Python source code
│   ├── requirements.txt                   # Python dependencies
│   └── setup.py                           # Package configuration
├── auth_examples/                         # Authentication examples
│   ├── proxy.py                           # Python proxy example
│   └── src/                               # Source code examples
└── openai_proxy/                          # OpenAI proxy implementation
    ├── src/                               # Python source code
    └── requirements.txt                   # Dependencies
```

## Key Features and Capabilities

### Core Functionality
1. **Multi-Provider Support**: OpenAI, Groq, Ollama, custom endpoints
2. **Function Calling System**: JavaScript functions callable by AI models
3. **Model Context Protocol**: External tool integration via MCP
4. **Secure Sharing**: Encrypted sharing of complete GPT configurations
5. **Privacy-First Design**: No backend server, encrypted local storage
6. **Context Window Visualization**: Real-time token usage display

### Advanced Features
1. **OAuth Integration**: GitHub and other OAuth providers
2. **Theme System**: Multiple visual themes with dark/light modes
3. **Mobile Responsive**: Optimized for mobile devices
4. **Markdown Support**: Rich text rendering with syntax highlighting
5. **Cryptographic Security**: TweetNaCl-based encryption
6. **Namespace Isolation**: Multi-tenant data separation

### Development Features
1. **Comprehensive Testing**: 100+ test files covering all functionality
2. **Modular Architecture**: 80+ specialized JavaScript modules
3. **Service-Oriented Design**: Clear separation of concerns
4. **Component-Based UI**: Reusable UI components
5. **Extensible Plugin System**: Plugin architecture for extensions

## Architecture Philosophy

### Refactored Architecture (2024)
- **Specialized Components**: 39 UI component managers with focused responsibilities
- **Service Layer**: 33 service modules with single responsibilities
- **Manager Pattern**: Coordinators orchestrating specialized components
- **Modular Design**: Clear dependency hierarchies and interfaces

### Security-First Design
- **No External Dependencies**: All libraries hosted locally
- **Encrypted Storage**: All sensitive data encrypted at rest
- **No Tracking**: No analytics, telemetry, or external communications
- **Direct API Communication**: No intermediary servers

### Privacy-Focused Architecture
- **Client-Side Only**: Pure static web application
- **Local Processing**: All operations performed in browser
- **User-Controlled Data**: Complete user control over data and keys
- **Transparent Security**: Open-source cryptographic implementation

This sitemap represents a comprehensive overview of the hacka.re project structure, highlighting its modular architecture, security-focused design, and extensive feature set.