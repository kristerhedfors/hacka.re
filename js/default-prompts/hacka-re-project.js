/**
 * About hacka.re Project Default Prompt
 */

window.HackaReProjectPrompt = {
    id: 'hacka-re-project',
    name: 'About hacka.re Project',
    content: `# About hacka.re: Serverless Agency

hacka.re is a privacy-focused, serverless chat interface for OpenAI-compatible APIs built with pure HTML, CSS, and JavaScript. It runs entirely client-side with no backend server, ensuring complete user privacy and data control.

## Core Philosophy

### Etymology and Vision
- **"Free, open, för hackare av hackare"**: The name "hacka.re" comes from "hackare" (Swedish for "whitehat hacker"), reflecting the project's ethos: a tool built by whitehat hackers, for whitehat hackers
- **Privacy-First Approach**: Your API key and conversations never leave your device except for direct API requests
- **True Serverless Architecture**: No backend servers, no tracking, no telemetry - just a static web app
- **Minimal Dependencies**: Limited attack surface with only 4 external libraries (marked, dompurify, tweetnacl, qrcode)
- **Vibe-Coded Development**: 99%+ of code created through LLM-assisted development using Anthropic's Claude Sonnet models

## Technical Architecture

### Core Structure
hacka.re implements a **modular component-based architecture** with specialized manager classes:

\`\`\`
hacka.re JavaScript Architecture (js/)
│
├── 📱 Core Application Files
│   ├── app.js                              # Application initialization and bootstrap
│   ├── script.js                           # Legacy main script file
│   ├── ascii-tree-menu.js                  # ASCII tree menu component
│   ├── button-tooltips.js                  # Global button tooltip system
│   ├── copy-code.js                        # Code copying functionality
│   ├── default-functions-tooltip.js        # Default functions tooltip
│   ├── function-tooltip.js                 # Function tooltips
│   ├── link-sharing-tooltip.js             # Link sharing tooltips
│   ├── logo-animation.js                   # Logo animation effects
│   ├── mobile-utils.js                     # Mobile device utilities
│   ├── modal-effects.js                    # Modal visual effects
│   ├── settings-tooltip.js                 # Settings tooltips
│   └── themes.js                           # Theme switching system
│
├── 🧩 Component Managers (39 files)
│   ├── ai-hackare.js                       # Main AI interface coordinator
│   ├── api-tools-manager.js                # API tools management
│   ├── chat-manager.js                     # Chat interface orchestration
│   ├── dom-elements.js                     # DOM element management
│   ├── function-calling-manager.js         # Function calling coordinator
│   ├── mcp-manager.js                      # MCP system management
│   ├── prompts-event-handlers.js           # Prompts event handling
│   ├── prompts-manager.js                  # Prompts system coordination
│   ├── prompts-modal-renderer.js           # Prompts modal rendering
│   ├── share-manager.js                    # Secure sharing coordinator
│   ├── ui-manager.js                       # Global UI coordination
│   │
│   ├── 🔧 Function Calling System (11 files)
│   │   ├── function-calling/
│   │   │   ├── default-functions-manager.js     # Default functions handling
│   │   │   ├── function-code-editor.js          # Code editor component
│   │   │   ├── function-copy-manager.js         # Function copying utilities
│   │   │   ├── function-details-modal.js        # Function details modal
│   │   │   ├── function-editor-manager.js       # Function editor coordination
│   │   │   ├── function-executor.js             # Function execution engine
│   │   │   ├── function-library-manager.js      # Function library management
│   │   │   ├── function-list-renderer.js        # Function list display
│   │   │   ├── function-modal-manager.js        # Function modal UI management
│   │   │   ├── function-parser.js               # Function parsing logic
│   │   │   ├── function-validator.js            # Function validation
│   │   │   └── mcp-server-manager.js            # MCP server integration
│   │
│   ├── 🔧 Settings System (15 files)
│   │   ├── settings/
│   │   │   ├── api-key-input-handler.js         # API key input handling
│   │   │   ├── api-key-manager.js               # API key management
│   │   │   ├── base-url-manager.js              # Base URL configuration
│   │   │   ├── model-manager.js                 # Model selection management
│   │   │   ├── settings-coordinator.js          # Core settings coordination
│   │   │   ├── settings-initialization.js       # Settings initialization
│   │   │   ├── settings-manager.js              # Settings system management
│   │   │   ├── settings-state-manager.js        # Settings state management
│   │   │   ├── shared-link-data-processor.js    # Shared link data processing
│   │   │   ├── shared-link-manager.js           # Shared link management
│   │   │   ├── shared-link-modal-manager.js     # Shared link modal UI
│   │   │   ├── system-prompt-manager.js         # System prompt management
│   │   │   ├── title-subtitle-manager.js        # Title/subtitle management
│   │   │   ├── tool-calling-manager.js          # Tool calling settings
│   │   │   └── welcome-manager.js               # Welcome modal management
│   │
│   ├── 🌐 MCP (Model Context Protocol) (12 files)
│   │   ├── mcp/
│   │   │   ├── mcp-command-history.js           # MCP command history tracking
│   │   │   ├── mcp-connections-ui.js            # MCP connections UI
│   │   │   ├── mcp-modal-renderer.js            # MCP modal rendering
│   │   │   ├── mcp-oauth-config.js              # MCP OAuth configuration
│   │   │   ├── mcp-oauth-flow.js                # MCP OAuth flow handling
│   │   │   ├── mcp-oauth-integration.js         # MCP OAuth integration
│   │   │   ├── mcp-proxy-manager.js             # MCP proxy management
│   │   │   ├── mcp-quick-connectors.js          # MCP quick connection UI
│   │   │   ├── mcp-server-manager.js            # MCP server management
│   │   │   ├── mcp-tools-manager.js             # MCP tools management
│   │   │   ├── mcp-ui-manager.js                # MCP UI coordination
│   │   │   └── mcp-utils.js                     # MCP utility functions
│   │
│   ├── 💬 Prompts System (2 files)
│   │   ├── prompts/
│   │   │   ├── prompts-list-manager.js          # Prompts list management
│   │   │   └── prompts-token-manager.js         # Prompts token management
│   │
│   ├── 🔗 Share System (2 files)
│   │   ├── share/
│   │   │   ├── mcp-connections-share-item.js    # MCP connections sharing
│   │   │   └── share-item.js                    # Share item base class
│   │
│   └── 🎨 UI Components (6 files)
│       ├── ui/
│       │   ├── context-usage-display.js         # Context window visualization
│       │   ├── modal-manager.js                 # Modal system management
│       │   ├── model-info-display.js            # Model information display
│       │   ├── share-ui-manager-v2.js           # Share UI management v2
│       │   ├── share-ui-manager.js              # Share UI management
│       │   └── ui-coordinator.js                # UI coordination layer
│
├── 🔧 Service Layer (33 files)
│   ├── services/
│   │   │
│   │   ├── 🌐 API Services (7 files)
│   │   │   ├── api-debugger.js                  # API debugging utilities
│   │   │   ├── api-request-builder.js           # HTTP request construction
│   │   │   ├── api-response-parser.js           # API response parsing
│   │   │   ├── api-service.js                   # Main API communication layer
│   │   │   ├── api-stream-processor.js          # Streaming response handling
│   │   │   ├── api-tool-call-handler.js         # Tool call processing
│   │   │   └── api-tools-service.js             # API tools integration
│   │   │
│   │   ├── 🛠️ Function Tools System (8 files)
│   │   │   ├── function-tools-config.js         # Function tools configuration
│   │   │   ├── function-tools-executor.js       # Sandboxed function execution
│   │   │   ├── function-tools-logger.js         # Function execution logging
│   │   │   ├── function-tools-parser.js         # Function argument parsing
│   │   │   ├── function-tools-processor.js      # Function call processing
│   │   │   ├── function-tools-registry.js       # Function registry management
│   │   │   ├── function-tools-service.js        # Main function tools orchestrator
│   │   │   └── function-tools-storage.js        # Function storage operations
│   │   │
│   │   ├── 🌐 MCP Services (11 files)
│   │   │   ├── mcp-auth-strategies.js           # MCP authentication strategies
│   │   │   ├── mcp-client-core.js               # Core MCP client implementation
│   │   │   ├── mcp-client-registration.js       # MCP client registration
│   │   │   ├── mcp-connection-manager.js        # MCP connection management
│   │   │   ├── mcp-metadata-discovery.js        # MCP metadata discovery
│   │   │   ├── mcp-oauth-service.js             # MCP OAuth service
│   │   │   ├── mcp-provider-factory.js          # MCP provider factory
│   │   │   ├── mcp-provider-interface.js        # MCP provider interface
│   │   │   ├── mcp-request-manager.js           # MCP request management
│   │   │   ├── mcp-service-connectors.js        # MCP service connectors
│   │   │   ├── mcp-tool-registry.js             # MCP tool registry
│   │   │   └── mcp-transport-service.js         # MCP transport layer
│   │   │
│   │   ├── 💾 Storage Services (4 files)
│   │   │   ├── core-storage-service.js          # Core storage operations
│   │   │   ├── encryption-service.js            # TweetNaCl encryption service
│   │   │   ├── namespace-service.js             # Multi-tenant data isolation
│   │   │   └── storage-service.js               # Main storage interface
│   │   │
│   │   └── 🔧 Additional Services (7 files)
│   │       ├── chat-streaming-service.js        # Chat streaming service
│   │       ├── chat-tools-service.js            # Chat tools service
│   │       ├── chat-ui-service.js               # Chat UI service
│   │       ├── context-usage-service.js         # Context usage tracking
│   │       ├── data-service.js                  # Data service layer
│   │       ├── debug-service.js                 # Debug service
│   │       ├── default-functions-service.js     # Default functions service
│   │       ├── default-prompts-service.js       # Default prompts service
│   │       ├── link-sharing-service.js          # Encrypted link sharing
│   │       ├── model-info.js                    # Model information service
│   │       ├── prompts-service.js               # Prompts management service
│   │       ├── share-item-registry.js           # Share item registry
│   │       ├── share-service-v2.js              # Share service v2
│   │       ├── share-service.js                 # Share service
│   │       └── system-prompt-coordinator.js     # System prompt coordination
│
├── 🛠️ Utility Functions (13 files)
│   ├── utils/
│   │   ├── api-key-detector.js              # API key auto-detection
│   │   ├── clipboard-utils.js               # Clipboard operations
│   │   ├── context-utils.js                 # Context window utilities
│   │   ├── crypto-utils.js                  # Cryptographic utilities
│   │   ├── function-call-renderer.js        # Function call rendering
│   │   ├── function-icon-fix.js             # Function icon fixes
│   │   ├── function-markers.js              # Function marker utilities
│   │   ├── mcp-size-estimator-global.js     # Global MCP size estimation
│   │   ├── mcp-size-estimator.js            # MCP size estimation
│   │   ├── rc4-utils.js                     # RC4 utility functions
│   │   ├── smart-tooltip-positioner.js      # Intelligent tooltip positioning
│   │   ├── tooltip-utils.js                 # Tooltip utilities
│   │   └── ui-utils.js                      # UI utility functions
│
├── 🔧 Default Functions (4 files)
│   ├── default-functions/
│   │   ├── api-auth-client.js               # API authentication client
│   │   ├── math-utilities.js                # Mathematical utility functions
│   │   ├── mcp-example.js                   # MCP example functions
│   │   └── rc4-encryption.js                # RC4 encryption/decryption
│
├── 📝 Default Prompts (12 files)
│   ├── default-prompts/
│   │   ├── agent-orchestration.js           # Agent orchestration prompts
│   │   ├── api-auth-libsodium-core.js       # LibSodium core documentation
│   │   ├── api-auth-libsodium-documentation.js # LibSodium documentation
│   │   ├── api-auth-libsodium-examples.js   # LibSodium examples
│   │   ├── api-auth-libsodium.js            # LibSodium integration
│   │   ├── code-section.js                  # Code section prompts
│   │   ├── function-calling.js              # Function calling guidance
│   │   ├── function-library.js              # Function library prompts
│   │   ├── hacka-re-project.js              # Project information (this file)
│   │   ├── interpretability-urgency.js      # AI interpretability prompts
│   │   ├── mcp-sdk-readme.js                # MCP SDK documentation
│   │   ├── openai-proxies-python.js         # OpenAI proxy documentation
│   │   └── owasp-llm-top10.js               # OWASP LLM security guidelines
│
├── 🔌 External Providers (6 files)
│   ├── providers/
│   │   └── github/
│   │       ├── github-auth.js               # GitHub authentication
│   │       ├── github-provider-loader.js    # GitHub provider loader
│   │       ├── github-provider.js           # Main GitHub provider
│   │       ├── github-tools.js              # GitHub API tools
│   │       ├── github-ui.js                 # GitHub UI components
│   │       └── index.js                     # GitHub provider index
│
├── ⚙️ Configuration (2 files)
│   ├── config/
│   │   ├── share-config.js                  # Sharing system configuration
│   │   └── share-items-registry.js          # Share items registry
│
├── 🔌 Plugins (1 file)
│   ├── plugins/
│   │   └── share-plugin-manager.js          # Share plugin management
│
└── 🎭 Demo (1 file)
    └── demo/
        └── share-refactor-demo.js           # Share system refactor demo

Total: 147 JavaScript files across 12 specialized categories
\`\`\`

### Service-Oriented Design
The architecture follows a **service layer pattern** with clear separation of concerns:

The service layer implements specialized modules as detailed in the ASCII architecture above, with each service handling specific responsibilities within the overall system architecture.

### Recent Architectural Refactoring
The project underwent a **major architectural refactoring** (~50 new files) from monolithic to modular design:

- **Specialized component managers** handle focused UI responsibilities
- **Manager pattern** with coordinators orchestrating specialized components
- **Component categories**: function-calling, settings, mcp, prompts, ui
- **Service dependencies**: Clear hierarchical relationships
- **Modular utilities**: 12 specialized utility modules

## Key Features

### Core Functionality
1. **Multi-Provider Support**: OpenAI, Groq, Ollama, custom endpoints
2. **Function Calling System**: JavaScript functions callable by AI models
3. **Model Context Protocol (MCP)**: External tool integration
4. **Secure Sharing**: Encrypted sharing of complete GPT configurations
5. **Context Window Visualization**: Real-time token usage display
6. **Privacy-First Design**: No backend server, encrypted local storage

### Advanced Features
1. **Cryptographic Security**: TweetNaCl XSalsa20-Poly1305 authenticated encryption
2. **Namespace Isolation**: Multi-tenant data separation
3. **OAuth Integration**: GitHub and other OAuth providers
4. **Theme System**: Multiple visual themes with dark/light modes
5. **Mobile Responsive**: Optimized for mobile devices
6. **Markdown Support**: Rich text rendering with syntax highlighting

### Function Calling System
The function calling feature allows JavaScript functions to be executed by AI models:

\`\`\`javascript
// Functions tagged with @callable or @tool become available to models
// Built-in RC4 encryption/decryption functions for testing
// 8-module refactored architecture in js/services/function-tools-*.js
\`\`\`

### Secure Sharing Mechanism
Pack complete GPT configurations into encrypted links:

\`\`\`
Sharing Options:
- API Provider configuration
- API Key (encrypted)
- Active Model selection
- System Prompts
- Function Library
- Conversation History
- QR Code generation for paper backup
\`\`\`

## Security and Privacy

### Cryptographic Implementation
\`\`\`
Technical Specifications:
- Algorithm: XSalsa20-Poly1305 (TweetNaCl secretbox)
- Key Derivation: 10,000 iterations of SHA-512 with salt
- Key Size: 256 bits (32 bytes)
- Nonce Size: 192 bits (24 bytes)
- Authentication: Poly1305 MAC integrated
\`\`\`

### Privacy Architecture
- **Client-Side Only**: Pure static web application
- **Local Processing**: All operations performed in browser
- **Encrypted Storage**: All sensitive data encrypted at rest
- **No Telemetry**: No analytics, tracking, or external communications
- **Direct API Communication**: Browser → API Provider (no intermediary)

### Security Considerations
\`\`\`
Privacy Guarantees:
✓ GitHub Pages hosted (static files only)
✓ API key encrypted in localStorage
✓ Conversation history encrypted locally
✓ No custom backend server
✓ All external libraries hosted locally
✓ No CDN dependencies

Privacy Limitations:
⚠ Chat content sent to API provider servers
⚠ Subject to API provider privacy policies
⚠ GitHub Pages hosting infrastructure
\`\`\`

## Development and Testing

### Testing Philosophy
- **No mocking**: All tests use real API calls for validation
- **Comprehensive coverage**: 100+ test files covering all functionality
- **Playwright automation**: Browser-based testing with real user interactions
- **API integration**: Real function calling and model interaction tests

### Test Categories
\`\`\`
Test Suite Structure:
├── Core Tests: Basic UI, API configuration, chat functionality
├── Feature Tests: Function calling, sharing, themes, model selection
├── API Integration: Real function calling validation
├── MCP Tests: Model Context Protocol integration
├── Security Tests: Encryption, storage, sharing mechanisms
└── UI Tests: Modal system, tooltips, responsive design
\`\`\`

### Development Practices
\`\`\`
Code Organization:
- Specialized component managers with focused responsibilities
- Modular services with single responsibilities
- Manager pattern with coordinators
- Service layer architecture with clear dependencies
- Component categories: function-calling, settings, mcp, prompts, ui
\`\`\`

### Refactoring Philosophy
When refactoring, **REMOVE old functionality** completely:
- Delete deprecated functions and unused imports
- Remove legacy code paths entirely
- Prevent old patterns from re-emerging
- Ensure new architecture remains pure and maintainable

## Model Context Protocol (MCP) Integration

hacka.re implements an **experimental MCP implementation** for external tool integration:

\`\`\`
MCP Architecture:
├── Zero-dependency MCP client implementation
├── JSON-RPC 2.0 protocol support
├── Stdio and SSE transport support
├── Automatic tool registration
├── Server capability detection
├── OAuth 2.1 compliant authentication
└── Browser-based stdio proxy bridge
\`\`\`

### MCP Features
- **Pure client-side**: No external dependencies
- **Tool generation**: Automatic JavaScript function generation from MCP tools
- **GitHub integration**: Only Classical Personal Access Token support for now
- **Proxy support**: Bridge between browser and stdio-based servers
- **Real-time monitoring**: Server status and command history

## Default Functions and Prompts

### Built-in Functions (4 modules)
\`\`\`javascript
// RC4 encryption/decryption for testing
// Mathematical utilities
// API authentication helpers
// MCP example functions
\`\`\`

### Default Prompts (12 modules)
\`\`\`
Available Prompts:
- Project information (this prompt)
- Function calling guidance
- Agent orchestration
- OWASP LLM Top 10 security
- API authentication patterns
- MCP SDK documentation
- Plus 6 additional specialized prompts
\`\`\`

## Deployment and Portability

### Deployment Options
1. **GitHub Pages**: Live at https://hacka.re/
2. **Local Deployment**: Download and run as static files
3. **Custom Hosting**: Deploy to any static hosting service
4. **Offline Usage**: Complete functionality without internet (except API calls)

### Portability Features
- **Self-contained**: All dependencies included
- **No build process**: Pure HTML/CSS/JavaScript
- **MIT License**: Free to modify and redistribute
- **Static files**: Can be served from any web server, or straight from file:///path/to/index.html

## Research and Development

### Project Research
The project includes comprehensive research documentation:

\`\`\`
Research Components:
- Technical architecture analysis
- Security implementation evaluation
- Privacy-focused design principles
- Serverless architecture benefits
- Competitive analysis of similar tools
\`\`\`

### Development Metrics
\`\`\`
Project Scale:
- 80+ JavaScript modules
- 100+ test files
- 15+ documentation files
- 4 external libraries (locally hosted)
- 12 CSS stylesheets
- 6 font files
\`\`\`

## Community and Contributions

### Open Source Approach
- **MIT License**: Free to use, modify, and distribute
- **No Attribution Required**: Use without attribution requirements
- **Community Driven**: Built for and by the whitehat hacker community
- **Extensible Design**: Plugin architecture for community extensions

### Development Tools
\`\`\`
Development Environment:
- Python testing framework
- Playwright browser automation
- Security verification tools
- Project metrics tracking
- Release packaging scripts
\`\`\`

This comprehensive overview represents the complete hacka.re project - a privacy-focused, serverless, and highly modular chat interface built by whitehat hackers for the whitehat hacker community.`
};
