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

```
Project Structure:
├── 80+ JavaScript modules across components and services
├── 39 UI component managers with focused responsibilities  
├── 33 service modules with single responsibilities
├── 15 settings system modules
├── 12 MCP (Model Context Protocol) modules
├── 11 function calling system modules
├── 12 utility modules
└── 12 default prompt components
```

### Service-Oriented Design
The architecture follows a **service layer pattern** with clear separation of concerns:

#### API Services (7 modules)
- **api-service.js**: Main API communication layer
- **api-request-builder.js**: Request construction
- **api-response-parser.js**: Response parsing
- **api-stream-processor.js**: Streaming response handling
- **api-tool-call-handler.js**: Tool call processing
- **api-debugger.js**: API debugging utilities
- **api-tools-service.js**: API tools integration

#### Function Tools System (8 modules)
- **function-tools-service.js**: Main orchestrator
- **function-tools-executor.js**: Sandboxed execution engine
- **function-tools-parser.js**: Argument parsing
- **function-tools-registry.js**: Function registry
- **function-tools-storage.js**: Storage operations
- Plus 3 additional specialized modules

#### Storage Services (4 modules)
- **storage-service.js**: Main storage interface
- **encryption-service.js**: TweetNaCl-based encryption
- **namespace-service.js**: Multi-tenant data isolation
- **core-storage-service.js**: Core storage operations

#### MCP Services (9 modules)
- **mcp-client-core.js**: Core MCP functionality
- **mcp-connection-manager.js**: Connection management
- **mcp-oauth-service.js**: OAuth integration
- **mcp-transport-service.js**: Transport layer
- Plus 5 additional MCP services

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

```javascript
// Functions tagged with @callable or @tool become available to models
// Built-in RC4 encryption/decryption functions for testing
// 8-module refactored architecture in js/services/function-tools-*.js
```

### Secure Sharing Mechanism
Pack complete GPT configurations into encrypted links:

```
Sharing Options:
- API Provider configuration
- API Key (encrypted)
- Active Model selection
- System Prompts
- Function Library
- Conversation History
- QR Code generation for paper backup
```

## Security and Privacy

### Cryptographic Implementation
```
Technical Specifications:
- Algorithm: XSalsa20-Poly1305 (TweetNaCl secretbox)
- Key Derivation: 10,000 iterations of SHA-512 with salt
- Key Size: 256 bits (32 bytes)
- Nonce Size: 192 bits (24 bytes)
- Authentication: Poly1305 MAC integrated
```

### Privacy Architecture
- **Client-Side Only**: Pure static web application
- **Local Processing**: All operations performed in browser
- **Encrypted Storage**: All sensitive data encrypted at rest
- **No Telemetry**: No analytics, tracking, or external communications
- **Direct API Communication**: Browser → API Provider (no intermediary)

### Security Considerations
```
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
```

## Development and Testing

### Testing Philosophy
- **No mocking**: All tests use real API calls for validation
- **Comprehensive coverage**: 100+ test files covering all functionality
- **Playwright automation**: Browser-based testing with real user interactions
- **API integration**: Real function calling and model interaction tests

### Test Categories
```
Test Suite Structure:
├── Core Tests: Basic UI, API configuration, chat functionality
├── Feature Tests: Function calling, sharing, themes, model selection
├── API Integration: Real function calling validation
├── MCP Tests: Model Context Protocol integration
├── Security Tests: Encryption, storage, sharing mechanisms
└── UI Tests: Modal system, tooltips, responsive design
```

### Development Practices
```
Code Organization:
- Specialized component managers with focused responsibilities
- Modular services with single responsibilities
- Manager pattern with coordinators
- Service layer architecture with clear dependencies
- Component categories: function-calling, settings, mcp, prompts, ui
```

### Refactoring Philosophy
When refactoring, **REMOVE old functionality** completely:
- Delete deprecated functions and unused imports
- Remove legacy code paths entirely
- Prevent old patterns from re-emerging
- Ensure new architecture remains pure and maintainable

## Model Context Protocol (MCP) Integration

hacka.re implements an **experimental MCP implementation** for external tool integration:

```
MCP Architecture:
├── Zero-dependency MCP client implementation
├── JSON-RPC 2.0 protocol support
├── Stdio and SSE transport support
├── Automatic tool registration
├── Server capability detection
├── OAuth 2.1 compliant authentication
└── Browser-based stdio proxy bridge
```

### MCP Features
- **Pure client-side**: No external dependencies
- **Tool generation**: Automatic JavaScript function generation from MCP tools
- **GitHub integration**: Only Classical Personal Access Token support for now
- **Proxy support**: Bridge between browser and stdio-based servers
- **Real-time monitoring**: Server status and command history

## Default Functions and Prompts

### Built-in Functions (4 modules)
```javascript
// RC4 encryption/decryption for testing
// Mathematical utilities
// API authentication helpers
// MCP example functions
```

### Default Prompts (12 modules)
```
Available Prompts:
- Project information (this prompt)
- Function calling guidance
- Agent orchestration
- OWASP LLM Top 10 security
- API authentication patterns
- MCP SDK documentation
- Plus 6 additional specialized prompts
```

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

```
Research Components:
- Technical architecture analysis
- Security implementation evaluation
- Privacy-focused design principles
- Serverless architecture benefits
- Competitive analysis of similar tools
```

### Development Metrics
```
Project Scale:
- 80+ JavaScript modules
- 100+ test files
- 15+ documentation files
- 4 external libraries (locally hosted)
- 12 CSS stylesheets
- 6 font files
```

## Community and Contributions

### Open Source Approach
- **MIT License**: Free to use, modify, and distribute
- **No Attribution Required**: Use without attribution requirements
- **Community Driven**: Built for and by the whitehat hacker community
- **Extensible Design**: Plugin architecture for community extensions

### Development Tools
```
Development Environment:
- Python testing framework
- Playwright browser automation
- Security verification tools
- Project metrics tracking
- Release packaging scripts
```

This comprehensive overview represents the complete hacka.re project - a privacy-focused, serverless, and highly modular chat interface built by whitehat hackers for the whitehat hacker community.`
};
