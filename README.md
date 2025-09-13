# hacka.re - The Privacy-First AI Chat Interface

<div align="center">

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Tests](https://img.shields.io/badge/Tests-377+-blue.svg)](_tests/playwright/)
[![Privacy](https://img.shields.io/badge/Privacy-First-purple.svg)](about/)

*Free, open, för hackare, av hackare*

</div>

## Table of Contents

1. [Introduction & Philosophy](#introduction--philosophy)
2. [Quick Start](#quick-start)
3. [Core Features](#core-features)
4. [Modal Windows & UI Components](#modal-windows--ui-components)
5. [Technical Architecture](#technical-architecture)
6. [Security & Privacy Architecture](#security--privacy-architecture)
7. [Advanced Systems](#advanced-systems)
8. [Development Environment](#development-environment)
9. [Testing Infrastructure](#testing-infrastructure)
10. [Integration Guides](#integration-guides)
11. [API Provider Support](#api-provider-support)
12. [Performance & Optimization](#performance--optimization)
13. [Troubleshooting](#troubleshooting)
14. [Contributing](#contributing)
15. [License](#license)

---

## Introduction & Philosophy

### The Name and Heritage

**hacka.re** derives from "hackare" - Swedish for "whitehat hacker". This name embodies our philosophy: a tool built *för hackare, av hackare* (for whitehats, by whitehats). We believe in empowering security researchers, developers, and privacy-conscious users with a transparent and fully controllable AI interface.

### Core Principles

1. **Privacy First**: Your data never touches our servers because we don't have any
2. **Zero Trust**: All sensitive data is encrypted client-side, no external services trusted
3. **Zero Dependencies**: Minimal third-party libraries (only essential ones), all hosted locally - no CDN dependencies
4. **Zero Infrastructure**: Pure static site, no backend servers required other than OpenAI-compatible LLM API
5. **Transparency**: 100% open source, auditable code
6. **No Telemetry**: Zero analytics, tracking, or phone-home functionality
7. **Direct Communication**: Your browser talks directly to AI provider APIs
8. **Local Interface**: The UI runs in your browser, AI models run on provider servers (unless using local LLMs)
9. **Serverless**: Can be hosted anywhere or run locally

### What Makes hacka.re Different

Unlike commercial AI interfaces that route your conversations through their servers, hacka.re is a **pure client-side application**. This means:

- **Your API keys** stay encrypted in your browser
- **Your conversations** go directly to your chosen AI provider's servers
- **Your configuration** stays on your device
- **No intermediary servers** between you and the AI provider

### Target Audience

hacka.re is designed for:

- 🔒 **Security Researchers**: Analyze AI behavior without corporate oversight
- 💻 **Developers**: Test AI integrations with complete control
- 🛡️ **Privacy Advocates**: Use AI without sacrificing privacy
- 🎓 **Students & Educators**: Learn AI interaction in a transparent environment
- 🏢 **Enterprises**: Deploy a controllable, auditable AI interface

---

## Quick Start

### Online Usage

1. Visit [hacka.re](https://hacka.re/)
2. Click Settings icon, upper right in header
3. Enter your API key from any supported provider
4. Select your model
5. Start chatting

### Local Deployment

```bash
# Clone the repository
git clone https://github.com/yourusername/hacka.re.git
cd hacka.re

# Start a local server (Python 3)
python3 -m http.server 8000

# Or use the provided script
./scripts/start_server.sh

# Open in browser
open http://localhost:8000
```

### Immediate Features Available

Upon first load, you have access to:
- 🤖 Multiple AI providers (OpenAI, Groq, local LLMs, Custom)
- 🎨 Multiple UI themes
- 📝 System prompt customization
- 🔧 JavaScript function calling
- 🔐 Encrypted local storage
- 📤 Encrypted configuration sharing
- 📚 Pre-built prompt library
- ⚙️ Agent configurations

---

## Core Features

### Multi-Provider Support

hacka.re supports any OpenAI-compatible API:

#### Local LLM Providers
These providers run AI models entirely on your machine:
- **llamafile** - Single-file executable LLMs, no setup required
- **Ollama** - Easy local model management
- **LM Studio** - GUI for local models
- **llama.cpp** - Direct model execution
- Any other local OpenAI-compatible server

#### Cloud Providers
| Provider | Models | Special Features | Notes |
|----------|--------|------------------|-------|
| **OpenAI** | GPT-5, O3, GPT-4o, etc. | Full function calling, RAG with embeddings | Industry standard |
| **Groq** | Llama, Mixtral, etc. | Ultra-fast inference | Excellent for rapid iteration |
| **Custom** | Any compatible API | Full flexibility | For self-hosted or proxy APIs |

### Context Window Visualization

Real-time display shows:
- 📊 Current token usage
- 📈 Percentage of context used
- 🎯 Model's maximum context
- ⚠️ Visual warnings near limits
- 🔄 Dynamic updates as you type

### Markdown Support

Full markdown rendering with:
- Syntax highlighting for 20+ languages
- Tables, lists, and formatting
- LaTeX math rendering
- Mermaid diagram support
- Copy button for code blocks

### Conversation Management

- **Persistent History**: Encrypted storage between sessions
- **Clear Chat**: Start fresh while preserving configuration
- **Copy Conversation**: Export as markdown
- **Token Counting**: Real-time usage tracking
- **Auto-scroll**: Smart scrolling behavior

### Function Calling System

Create JavaScript functions callable by AI:
```javascript
/**
 * @callable
 * Calculate compound interest
 */
function calculateInterest(principal, rate, years) {
    return principal * Math.pow(1 + rate, years);
}
```

### Sharing Mechanism

Share configurations without exposing credentials:
- 🔐 Password-protected links
- 🔑 Encrypted API keys
- 💬 Conversation history
- ⚙️ System prompts
- 🔧 Function libraries
- 🤖 Agent configurations

---

## Modal Windows & UI Components

hacka.re features 14 specialized modal windows, each serving a distinct purpose:

### 1. Welcome Modal
**Purpose**: Information and navigation hub
- Appears on first visit
- Links to Settings modal
- Links to local LLM information
- Links to various feature modals
- Links to About page with philosophy and disclaimer
- Can be dismissed and won't reappear unless manually triggered
- No configuration functionality - purely informational

### 2. API Key Modal (`#api-key-modal`)
**Purpose**: Quick API key entry when attempting to chat without configuration
- Appears when trying to send a message without an API key
- Minimal interface - just API key input
- Auto-detects provider from API key format
- Subset of settings modal functionality
- Quick path to start chatting

### 3. Settings Modal (`#settings-modal`)
**Purpose**: Core configuration hub
- **API Configuration**
  - Provider selection (OpenAI, Groq, Berget.AI, local LLMs, Custom)
  - API key management (encrypted storage)
  - Base URL customization
  - Custom headers support
- **Model Selection**
  - Dropdown with all available models
  - Quick model switch button
  - Context window display
- **Integration Buttons**
  - Open Prompts Modal

### 4. Prompts Modal (`#prompts-modal`)
**Purpose**: System prompt management and library
- **Default Prompts Library**
  - README.md - this file
  - OWASP Top 10 for LLM Applications
- **Custom Prompts**
  - Create new prompts
  - Edit existing prompts
- **Prompt Management**
  - Enable/disable prompts
  - Preview final prompt

### 5. Share Modal (`#share-modal`)
**Purpose**: Configuration sharing with encryption
- **Sharing Options**
  - API Provider & Key
  - Active Model
  - System Prompts
  - Function Library
  - MCP connections
  - Conversation History
  - Welcome Message
- **Security Features**
  - Password protection (required)
  - Encryption before URL encoding
  - One-time or persistent links
  - Expiration settings
- **Share Process**
  1. Select items to share
  2. Set password
  3. Configure message count
  4. Generate encrypted link
  5. Copy and share

### 6. Function Calling Modal (`#function-modal`)
**Purpose**: JavaScript function management for AI execution
- **Function Editor**
  - Simple Code editor
  - JSDoc comment support
  - Validation and error checking of JS functions
- **Function Library**
  - Default functions (RC4, Math)
  - Custom function creation
  - Function collections
- **Function Features**
  - `@callable` tag for selective calling
  - `@tool` tag for tool functions
  - Automatic type inference
  - Parameter validation
  - Return type checking
- **Collection Management**
  - Group related functions
  - Enable/disable collections

### 7. Function Details Modal (`#function-details-modal`)
**Purpose**: View function call and result details from chat messages
- Click ƒ icon to see function call parameters
- Click → icon to see function return values
- View function source code via eye icon
- Copy parameters and results as JSON

### 8. Function Execution Modal (`#function-execution-modal`)
**Purpose**: Function call approval and result interception
- **Two-tab interface**
  - Function Call Details tab (with editable parameters)
  - Function Result Details tab (shows after execution)
- **Parameter Editing**
  - Edit JSON arguments before execution
  - View function source via eye icon
- **Execution Control**
  - Execute: Run with original or edited parameters
  - Block: Prevent function execution
  - "Remember my choice" checkbox for auto-approve/block in session
- **Result Handling**
  - Intercept and modify results before returning to AI
  - View execution results in second tab


### 9. MCP Servers Modal (`#mcp-servers-modal`)
**Purpose**: Model Context Protocol server management
- **Server Configuration**
  - Add/remove servers
  - Connection settings
  - Authentication
  - Health monitoring
- **Available Tools**
  - List connected tools
  - Tool documentation
  - Usage statistics
  - Error logs
- **Integration Features**
  - OAuth configuration
  - GitHub integration
  - Custom transports
  - WebSocket support

### 10. RAG Modal (`#rag-modal`)
**Purpose**: Retrieval-Augmented Generation configuration (OpenAI only)
- **Requirements**
  - OpenAI API key required
  - Uses OpenAI embeddings API
  - Data sent to OpenAI for processing
- **Pre-built Document Indexes**
  - AIA documents (pre-embedded with OpenAI)
  - CRA regulations (pre-embedded with OpenAI)
  - DORA compliance (pre-embedded with OpenAI)
- **RAG Settings**
  - Configurable Knowledge Window
  - Reranking options
  - Query expansion
- **Privacy Note**: Both queries and context are sent to OpenAI

### 11. RAG Document Settings Modal (`#rag-document-settings-modal`)
**Purpose**: Individual document configuration for RAG
- Chunking strategy
- Overlap settings
- Embedding model selection
- Update frequency

### 12. RAG Document Viewer Modal (`#rag-document-viewer-modal`)
**Purpose**: Preview and inspect RAG documents
- Full document view
- Chunk boundaries
- Embedding visualization
- Search preview
- Metadata display

### 13. Model Selection Modal (`#model-selection-modal`)
**Purpose**: Quick model selection with live search
- **Live Search**
  - Character-by-character filtering as you type
  - Instant results highlighting
  - Case-insensitive matching
- **Keyboard Navigation**
  - Cmd/Ctrl+M to open modal
  - Arrow keys to navigate models
  - Enter to select
  - Escape to close
- **Model Display**
  - Shows available models from current provider
  - Click model header to open modal

### 14. System Prompt Viewer Modal (`#system-prompt-viewer-modal`)
**Purpose**: View and debug active system prompts
- Combined prompt preview
- Individual prompt inspection
- Token count
- Syntax highlighting
- Copy to clipboard

---

## Technical Architecture

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐        │
│  │   UI Layer  │  │  Components  │  │   Services  │        │
│  │  index.html │──│   (26 files) │──│  (76 files) │        │
│  └─────────────┘  └──────────────┘  └─────────────┘        │
│         │                │                  │                │
│  ┌──────┴──────────────────────────────────┴──────┐         │
│  │            Encryption Layer (TweetNaCl)         │         │
│  └─────────────────────────────────────────────────┘         │
│         │                                                    │
│  ┌──────┴──────────────────────────────────────────┐        │
│  │    localStorage / sessionStorage (encrypted)    │        │
│  └──────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                             │
                             ↓
              ┌──────────────────────────┐
              │   AI Provider APIs       │
              │  (OpenAI, Groq, etc.)    │
              └──────────────────────────┘
```

### Component Architecture (26 Components)

Components handle UI logic and user interaction:

```
js/components/
├── chat-manager.js              # Main chat orchestrator
├── function-calling/            # Function system (11 files)
│   ├── function-calling-manager.js
│   ├── function-code-editor.js
│   ├── function-modal-manager.js
│   ├── function-list-renderer.js
│   ├── function-validation.js
│   ├── function-collection-manager.js
│   ├── function-export-import.js
│   └── ...
├── settings/                    # Settings system (13 files)
│   ├── settings-coordinator.js
│   ├── settings-state-manager.js
│   ├── api-key-manager.js
│   ├── model-manager.js
│   ├── theme-manager.js
│   ├── parameter-controls.js
│   └── ...
├── mcp/                         # MCP system (6 files)
│   ├── mcp-modal-manager.js
│   ├── mcp-server-list.js
│   ├── mcp-tool-renderer.js
│   └── ...
├── prompts/                     # Prompts system (5 files)
│   ├── prompts-modal-manager.js
│   ├── prompts-list-renderer.js
│   ├── prompts-editor.js
│   └── ...
├── ui/                          # UI utilities (5 files)
│   ├── modal-base.js
│   ├── toast-notifications.js
│   ├── context-menu.js
│   └── ...
└── share-manager.js             # Sharing orchestrator
```

### Service Architecture (76 Services)

Services contain business logic and data management:

#### API Services (7 modules)
- `api-service.js` - Core API communication
- `api-request-builder.js` - Request construction
- `api-response-parser.js` - Response parsing
- `api-stream-processor.js` - Streaming handler
- `api-tool-call-handler.js` - Function execution
- `api-debugger.js` - Debug utilities
- `api-tools-service.js` - Tools integration

#### Storage Services (4 modules)
- `storage-service.js` - Main storage interface
- `core-storage-service.js` - Core operations
- `encryption-service.js` - TweetNaCl encryption
- `namespace-service.js` - Multi-tenant isolation

#### Function Tools System (8 modules)
- `function-tools-service.js` - Main orchestrator
- `function-tools-config.js` - Configuration
- `function-tools-logger.js` - Logging
- `function-tools-storage.js` - Persistence
- `function-tools-parser.js` - Code parsing
- `function-tools-executor.js` - Sandboxed execution
- `function-tools-registry.js` - Function registry
- `function-tools-processor.js` - Tool call processing

#### Chat Services (3 modules)
- `chat-streaming-service.js` - Stream handling
- `chat-tools-service.js` - Chat utilities
- `chat-history-service.js` - History management

#### MCP Services (5 modules)
- `mcp-client-core.js` - Core MCP client
- `mcp-connection-manager.js` - Connection handling
- `mcp-transport-service.js` - Transport layer
- `mcp-tool-registry.js` - Tool registration
- `mcp-request-manager.js` - Request handling

#### Agent Services (4 modules)
- `agent-service.js` - Agent management
- `agent-context-manager.js` - Context isolation
- `agent-cache.js` - Agent caching
- `agent-validator.js` - Configuration validation

#### Additional Services
- `link-sharing-service.js` - Encrypted sharing
- `prompts-service.js` - Prompts management
- `model-info.js` - Model information
- `debug-service.js` - Debug utilities
- `configuration-service.js` - Config management
- Plus 50+ more specialized services

### Data Flow Architecture

```
User Input → UI Component → Service Layer → Encryption → Storage
     ↓            ↓              ↓            ↓           ↓
   Event      Validation    Business     TweetNaCl   localStorage
  Handler       Check         Logic      Encryption   (encrypted)
     ↓            ↓              ↓            ↓           ↓
  Service     Transform     API Call     Decrypt     Retrieve
   Call        Data         if needed    on Load      Data
```

### Event-Driven Architecture

hacka.re uses a pure event-driven architecture:

1. **DOM Events**: User interactions trigger DOM events
2. **Custom Events**: Components communicate via custom events
3. **Event Delegation**: Efficient handling via delegation
4. **Event Namespacing**: Prevents conflicts between components
5. **Event Cleanup**: Proper listener removal on component destroy

Example:
```javascript
// Component emits event
window.dispatchEvent(new CustomEvent('modelChanged', {
    detail: { model: 'gpt-5', provider: 'openai' }
}));

// Another component listens
window.addEventListener('modelChanged', (e) => {
    updateContextWindow(e.detail.model);
});
```

---

## Security & Privacy Architecture

### Encryption System

⚠️ **CRITICAL SECURITY INFORMATION** ⚠️

#### Storage Modes and Security Implications

**Direct Access (hacka.re without shared link):**
- ⚠️ Uses **sessionStorage** for data persistence
- ⚠️ Master key stored in **PLAIN TEXT** in sessionStorage
- ⚠️ Data is **OBFUSCATED, NOT ENCRYPTED**
- ⚠️ All secrets, API keys, conversations are **readable from sessionStorage**
- ✅ Data persists only for browser session (until tab closed)
- ⚠️ Any script in hacka.re context can access ALL secrets

**Shared Link Access (hacka.re#gpt=...):**
- ✅ Uses **localStorage** for data persistence
- ✅ Master key (32-byte NaCl key) is **embedded in the URL fragment**
- ✅ Master key **NEVER stored** in localStorage/sessionStorage
- ✅ Data is **truly encrypted** with the embedded key
- ✅ Same link = same master key (enables multi-tab sharing)
- ⚠️ Key exists in JavaScript memory during runtime

**JavaScript Runtime Security (BOTH modes):**
- ⚠️ Passwords and master keys exist in JavaScript variables
- ⚠️ Variables isolated to browser origin (hacka.re)
- ⚠️ Rogue scripts in hacka.re context can access ALL keys
- ⚠️ Browser DevTools can inspect variables with secrets
- ⚠️ XSS vulnerabilities would compromise all data

hacka.re uses **TweetNaCl.js** for cryptographic operations:

#### Symmetric Encryption
- **Algorithm**: XSalsa20-Poly1305
- **Key Size**: 256 bits (32 bytes)
- **Nonce Size**: 192 bits (24 bytes)
- **Authentication**: Integrated Poly1305 MAC

#### Key Derivation
- **Method**: SHA-512 based PBKDF
- **Iterations**: 10,000 rounds
- **Salt**: 128 bits (16 bytes)
- **Output**: 256 bits (32 bytes)

#### Encryption Process
```javascript
// 1. Generate random salt
const salt = crypto.getRandomValues(new Uint8Array(16));

// 2. Derive key from password
const key = deriveKey(password, salt, 10000);

// 3. Generate nonce
const nonce = crypto.getRandomValues(new Uint8Array(24));

// 4. Encrypt data
const encrypted = nacl.secretbox(data, nonce, key);

// 5. Store salt + nonce + encrypted
const stored = concat(salt, nonce, encrypted);
```

### Storage Security

#### Storage Type Determination

hacka.re intelligently chooses storage based on context:

| Access Method | Storage Type | Namespace | Persistence |
|--------------|-------------|-----------|-------------|
| Direct Visit | sessionStorage | 'default_session' | Session only |
| Shared Link | localStorage | Hash of link | Persistent |
| After Sharing | localStorage | User's namespace | Persistent |

#### Namespace Isolation

Each configuration is isolated in its own namespace:

```
localStorage structure:
├── hacka_re_default/
│   ├── api_key (encrypted)
│   ├── settings (encrypted)
│   └── history (encrypted)
├── hacka_re_a8f3c2d1/  (shared config 1)
│   ├── api_key (encrypted)
│   ├── settings (encrypted)
│   └── history (encrypted)
└── hacka_re_b7e4f9a2/  (shared config 2)
    └── ... (encrypted)
```

### Sharing Implementation

The sharing system's design means credentials never touch any server:

1. **Selection**: User chooses what to share
2. **Password**: User sets encryption password
3. **Encryption**: Data encrypted with password
4. **Encoding**: Encrypted blob base64 encoded
5. **URL Generation**: Blob added to URL fragment (#)
6. **Sharing**: URL shared via any channel
7. **Reception**: Recipient enters password
8. **Decryption**: Data decrypted locally
9. **Import**: Configuration imported to new namespace

#### Share URL Structure
```
https://hacka.re/#gpt=eyJlbmMiOiJiYXNlNjQtZW5jcnlwdGVkLWRhdGEiLCJzYWx0IjoiYmFzZTY0LXNhbHQiLCJub25jZSI6ImJhc2U2NC1ub25jZSJ9
                    │
                    └── Never sent to server (fragment)
```

### Security Features

#### Client-Side Only
- No backend servers
- No server-side processing
- No data transmission to hacka.re
- Direct API communication only

#### Local Library Hosting
- All JavaScript libraries hosted locally
- No CDN dependencies
- No external resource loading
- Works offline if using local LLMs

#### No Tracking
- Zero analytics
- No telemetry
- No error reporting
- No usage statistics
- No cookies (except functional)

#### Security Headers (When Self-Hosted)
```apache
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: no-referrer
```

---

## Advanced Systems

### Function Calling System

The function calling system allows AI models to execute JavaScript functions:

#### Architecture (8-Module System)

```
function-tools-service.js (Orchestrator)
         │
    ┌────┴────┐──────┐──────┐──────┐──────┐──────┐
    │         │      │      │      │      │      │
  config  logger storage parser registry executor processor
```

#### Function Definition

Functions can be defined with special tags:

```javascript
/**
 * @callable
 * Fetch current weather for a location
 * @param {string} location - City name or coordinates
 * @param {string} units - Temperature units (celsius/fahrenheit)
 * @returns {object} Weather data
 */
async function getWeather(location, units = 'celsius') {
    // Function implementation
    const response = await fetch(`/api/weather?q=${location}&units=${units}`);
    return await response.json();
}
```

#### Tagging System
- **No tags**: All functions callable by default
- **@callable**: Function is callable when selective mode enabled
- **@tool**: Alias for @callable

#### Sandboxed Execution

Functions execute in a sandboxed environment:
- Timeout protection (5 seconds default)
- Memory limits
- No access to global scope
- No DOM manipulation
- Controlled async execution

#### Built-in Function Libraries

**RC4 Encryption** (`rc4-encryption.js`):
```javascript
- rc4Encrypt(text, password)
- rc4Decrypt(encryptedText, password)
- generateRC4Key(length)
```

**Math Utilities** (`math-utilities.js`):
```javascript
- factorial(n)
- fibonacci(n)
- isPrime(n)
- gcd(a, b)
- lcm(a, b)
```

**API Authentication** (`api-auth-client.js`):
```javascript
- generateHMAC(message, secret)
- createJWT(payload, secret)
- validateJWT(token, secret)
```

**MCP Examples** (`mcp-example.js`):
```javascript
- listMCPTools()
- executeMCPTool(toolName, parameters)
- getMCPServerStatus()
```

### RAG (Retrieval-Augmented Generation) System

**⚠️ IMPORTANT**: RAG requires OpenAI as provider because:
1. hacka.re contains pre-calculated OpenAI vector embeddings for indexed documents
2. Vector similarity search requires matching embedding models
3. Your queries need to be embedded using the same OpenAI model

**Data Exposure Warning**: When using RAG, your data is sent to:
- **OpenAI's embedding API** - to convert your queries to vectors
- **OpenAI's completion API** - to generate responses with retrieved context

While local embedding models exist, hacka.re currently only supports OpenAI embeddings.

#### Pre-Generated Document Indexes

hacka.re includes pre-built OpenAI embeddings for:
- **AIA**: AI Act documentation
- **CRA**: Cyber Resilience Act
- **DORA**: Digital Operational Resilience Act

These embeddings were pre-calculated using OpenAI's text-embedding-ada-002 model.

#### RAG Architecture

```
Query → Query Expansion → Embedding → Similarity Search → Reranking → Context
  ↓           ↓              ↓             ↓                ↓          ↓
Input    Generate      Vector      Cosine          Score      Add to
Text     Synonyms   Representation Similarity    Results     Prompt
```

#### Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| Similarity Threshold | Minimum similarity score | 0.7 |
| Max Results | Maximum chunks to retrieve | 5 |
| Chunk Size | Token size of chunks | 500 |
| Chunk Overlap | Overlap between chunks | 50 |
| Query Expansion | Generate search variants | Enabled |


### MCP (Model Context Protocol) Integration

MCP enables connection to external tools and services:

#### Supported Transports
- WebSocket
- HTTP/HTTPS
- stdio (for local tools)
- Custom transports

#### OAuth Integration
Built-in OAuth support for:
- GitHub
- Google
- Microsoft
- Custom OAuth providers

#### MCP Tools

Tools are exposed to the AI model:
```javascript
{
    name: "github_search",
    description: "Search GitHub repositories",
    parameters: {
        query: "string",
        language: "string",
        sort: "stars|forks|updated"
    }
}
```

---

## Development Environment

### Project Structure

```
hacka.re/
├── index.html                 # Main application
├── css/                       # Stylesheets
│   ├── styles.css            # Core styles
│   ├── themes/               # Theme definitions
│   └── responsive.css        # Mobile styles
├── js/                       # JavaScript modules
│   ├── app.js               # Application entry
│   ├── components/          # UI components (26 files)
│   ├── services/            # Business logic (76 files)
│   ├── utils/               # Utilities (7 files)
│   ├── default-prompts/     # Prompt library (26 files)
│   └── default-functions/   # Function library (4 files)
├── lib/                      # Third-party libraries
│   ├── tweetnacl/           # Encryption
│   ├── marked/              # Markdown parsing
│   ├── dompurify/           # XSS protection
│   └── font-awesome/        # Icons
├── about/                    # Information pages
├── _tests/                   # Test suite
│   └── playwright/          # 377+ browser tests
├── scripts/                  # Development scripts
│   ├── start_server.sh      # Start HTTP server
│   ├── stop_server.sh       # Stop HTTP server
│   └── server_status.sh     # Check server status
└── docs/                     # Documentation
```

### Development Setup

#### Prerequisites
- Python 3.11+ (for local server and testing)
- Web Browser (Chrome, Firefox, Safari, Edge)
- Git for version control

#### Environment Setup

```bash
# One-time setup
./setup_environment.sh

# This will:
# - Create Python virtual environment at .venv/
# - Install all dependencies
# - Install Playwright browsers
# - Create .env configuration
# - Verify installation

# Activate environment
source .venv/bin/activate

# Start development server
./scripts/start_server.sh

# Run tests
_tests/playwright/run_tests.sh
```

### Server Management

#### Starting the Server

```bash
# Recommended method
./scripts/start_server.sh

# Manual method
python3 -m http.server 8000

# With specific port
python3 -m http.server 3000
```

#### Server Scripts

| Script | Purpose | Features |
|--------|---------|----------|
| `start_server.sh` | Start HTTP server | Kills existing processes, tracks PID |
| `stop_server.sh` | Stop server | Graceful shutdown, cleanup |
| `server_status.sh` | Check status | Shows PID, port, recent logs |

#### Server Management Files
- `.server.pid` - Process ID tracking
- `.server.log` - Server output logs

### Code Organization Guidelines

#### Component Structure
```javascript
// Component template
window.ComponentName = (function() {
    // Private variables
    let state = {};
    
    // Private functions
    function privateMethod() {}
    
    // Public API
    return {
        init: function() {},
        destroy: function() {},
        publicMethod: function() {}
    };
})();
```

#### Service Structure
```javascript
// Service template
window.ServiceName = (function() {
    // Dependencies
    const dependency = window.DependencyService;
    
    // Configuration
    const config = {
        setting: 'value'
    };
    
    // Public API
    return {
        operation: function() {},
        query: function() {},
        command: function() {}
    };
})();
```

### Build and Deployment

hacka.re requires **no build process**:

#### Local Deployment
```bash
# Any static file server works
python3 -m http.server
npx http-server
ruby -run -ehttpd . -p8000
```

#### Production Deployment

##### GitHub Pages
```bash
# Push to main branch
git push origin main
# Enable GitHub Pages in settings
# Select main branch as source
```

##### Vercel/Netlify
```bash
# Just connect repository
# No build command needed
# Publish directory: /
```

##### Self-Hosted
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    root /var/www/hacka.re;
    index index.html;
    
    # Security headers
    add_header Content-Security-Policy "default-src 'self'";
    add_header X-Frame-Options "DENY";
}
```

---

## Testing Infrastructure

### Testing Philosophy

hacka.re's test suite follows these principles:

1. **No Mocking**: All tests use real API calls
2. **Real Browser Testing**: Playwright for accurate UI testing
3. **Screenshot Debugging**: Visual evidence of failures
4. **Comprehensive Coverage**: 377+ tests covering all features
5. **Cost Efficiency**: Uses minimal-cost models for testing

### Test Architecture

```
_tests/playwright/
├── Core Tests (Quick Validation)
│   ├── test_page.py         # UI elements
│   ├── test_api.py          # API configuration
│   ├── test_chat.py         # Chat functionality
│   └── test_welcome_modal.py # Onboarding
├── Feature Tests (Advanced)
│   ├── test_function_*.py   # Function calling
│   ├── test_mcp_*.py        # MCP integration
│   ├── test_rag_*.py        # RAG system
│   └── test_agent_*.py      # Agent system
├── Integration Tests
│   ├── function_calling_api/ # Real API tests
│   └── mcp_integration/      # MCP tests
└── Test Infrastructure
    ├── conftest.py          # Fixtures
    ├── test_utils.py        # Utilities
    └── requirements.txt     # Dependencies
```

### Running Tests

#### Quick Test Suites

```bash
# Core functionality (36 tests, ~2 min)
_tests/playwright/run_core_tests.sh

# Feature tests (100+ tests, ~5 min)
_tests/playwright/run_feature_tests.sh

# Function tests (40+ tests, ~4 min)
_tests/playwright/run_function_tests.sh

# All tests (377+ tests, ~15 min)
_tests/playwright/run_tests.sh
```

#### Specific Test Execution

```bash
# Run specific file
_tests/playwright/.venv/bin/python -m pytest _tests/playwright/test_modals.py -v

# Run specific test
_tests/playwright/.venv/bin/python -m pytest _tests/playwright/test_modals.py::test_share_modal -v

# Run with filter
_tests/playwright/.venv/bin/python -m pytest _tests/playwright/ -k "modal" -v

# Run with timeout
_tests/playwright/.venv/bin/python -m pytest _tests/playwright/ --timeout=600 -v
```

### Test Categories

#### Core Tests (Essential)
- Basic UI loading
- API key configuration
- Model selection
- Chat sending/receiving
- Settings persistence

#### Feature Tests (Advanced)
- Function calling system
- RAG document management
- Agent configuration
- MCP server integration
- Configuration sharing

#### Integration Tests (Real APIs)
- OpenAI function calling
- Streaming responses
- Error handling
- Rate limiting
- Token counting

### Writing Tests

#### Test Template

```python
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_feature_name(page: Page, serve_hacka_re):
    """Clear description of what this tests."""
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Test implementation
    element = page.locator("#element-id")
    expect(element).to_be_visible()
    element.click()
    
    # Wait for specific condition
    page.wait_for_selector("#result", state="visible")
    
    # Capture debugging info
    screenshot_with_markdown(page, "test_phase", {
        "Status": "Action completed",
        "Component": "Component name",
        "Result": "Success"
    })
    
    # Assert outcomes
    result = page.locator("#result")
    expect(result).to_contain_text("Expected text")
```

#### Best Practices

1. **Always dismiss modals** at test start
2. **Use specific waits** not arbitrary timeouts
3. **Capture screenshots** with context
4. **Test real functionality** not mocks
5. **Include error cases** not just happy paths

### Debugging Tests

#### Screenshot Debugging

Screenshots are saved with metadata:
```
screenshots/
├── test_name_timestamp.png
└── screenshots_data/
    └── test_name_timestamp.md  # Context and metadata
```

#### Console Capture

```python
# Capture console messages
def setup_console_logging(page):
    console_messages = []
    page.on("console", lambda msg: console_messages.append({
        'type': msg.type,
        'text': msg.text,
        'location': msg.location
    }))
    return console_messages
```

#### Interactive Debugging

```python
# Pause for browser DevTools
page.pause()

# Slow down execution
page.slow_mo = 1000  # 1 second between actions

# Run headed for visual debugging
pytest test_file.py --headed
```

---

## Integration Guides

### OpenAI Integration

#### Setup
1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Open hacka.re settings
3. Select "OpenAI" as provider
4. Paste API key
5. Select model (GPT-5, O3, GPT-4o, etc.)

#### Features Available
- ✅ Function calling
- ✅ Streaming responses
- ✅ RAG (requires embeddings API access)
- ✅ Vision models
- ✅ JSON mode
- ✅ Token usage tracking

**RAG Note**: RAG features send your queries to OpenAI's embedding API for vector conversion, in addition to the completion API for responses.

### Groq Integration

#### Setup
1. Get API key from [console.groq.com](https://console.groq.com)
2. Select "Groq" as provider
3. Enter API key
4. Choose model (Llama, Mixtral, etc.)

#### Features
- ✅ Ultra-fast inference
- ✅ Function calling
- ✅ Streaming
- ❌ RAG (no embeddings API, incompatible with OpenAI embeddings)
- ✅ Large context windows

### Local LLM Integration

#### llamafile Setup (Recommended - Simplest)
```bash
# Download a llamafile (single executable)
wget https://example.com/model.llamafile
chmod +x model.llamafile

# Run with CORS enabled
./model.llamafile --server --cors-allow-origin https://hacka.re
```

#### Ollama Setup
```bash
# Start Ollama with CORS
OLLAMA_ORIGINS=https://hacka.re ollama serve

# Or for local development
OLLAMA_ORIGINS=http://localhost:8000 ollama serve
```

#### LM Studio Setup
1. Start LM Studio
2. Load desired model
3. Start local server (port 1234)
4. **Enable CORS in Developer settings**

#### Configuration for Local LLMs
1. Select "Custom" provider (or "Ollama" if using Ollama)
2. Set base URL (e.g., `http://localhost:8080/v1` for llamafile)
3. API key can be left empty or any text
4. Select model if available

#### Local LLM Features
- ✅ Runs entirely on your machine
- ✅ No data sent to external servers
- ✅ No internet required (after model download)
- ❌ RAG (would require local embeddings, not compatible with OpenAI pre-built indexes)
- ✅ Full control over your data

#### Security Note
⚠️ **CORS Warning**: Enabling CORS allows websites to access your local LLM server. Only enable for trusted sites, disable when done.

### Custom Endpoint Integration

#### Requirements
- OpenAI-compatible API format
- CORS headers if browser-to-API
- Optional: API key authentication


#### Proxy Setup (Optional)
```python
# Simple Python proxy for CORS
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

@app.route('/v1/<path:path>', methods=['GET', 'POST'])
def proxy(path):
    url = f"https://api.openai.com/v1/{path}"
    response = requests.request(
        method=request.method,
        url=url,
        headers={
            'Authorization': request.headers.get('Authorization'),
            'Content-Type': 'application/json'
        },
        json=request.json if request.method == 'POST' else None
    )
    return jsonify(response.json())

if __name__ == '__main__':
    app.run(port=5000)
```

---

## API Provider Support

### Provider Comparison

| Feature | OpenAI | Groq | Local LLMs | Custom |
|---------|--------|------|------------|--------|
| **Hosting** | Cloud | Cloud | Your machine | Varies |
| **Speed** | Fast | Ultra-fast | Hardware dependent | Varies |
| **Privacy** | Data sent to OpenAI | Data sent to Groq | Data stays local | Varies |
| **Function Calling** | ✅ | ✅ | ✅ | Varies |
| **Streaming** | ✅ | ✅ | ✅ | Varies |
| **RAG Support** | ✅ (embeddings API) | ❌ | ❌* | Varies |
| **Vision Models** | ✅ | ❌ | Model dependent | Varies |
| **Cost** | Pay-per-token | Pay-per-token | Free | Varies |
| **Internet Required** | Yes | Yes | No* | Varies |
| **Model Selection** | Limited | Limited | Unlimited | Varies |

*After initial model download
**Local embedding models exist but are not supported by hacka.re's pre-built indexes

---

## Performance & Optimization

### Client-Side Performance

#### Loading Optimization
- **Lazy Loading**: Components load on-demand
- **Code Splitting**: Modular architecture
- **Minimal Dependencies**: Only essential libraries
- **Local Assets**: No external CDN calls

#### Runtime Performance
- **Virtual Scrolling**: For long conversations
- **Debounced Inputs**: Reduces API calls
- **Worker Threads**: For heavy computation

### Memory Management
- Efficient token counting

### Network Optimization

#### Request Management
- Request debouncing
- Automatic retry with backoff
- Connection pooling
- Stream processing


**Problem**: "CORS error with local LLMs"
```
Solutions:
1. Configure LLM API to allow CORS
2. Check URL includes /v1
3. Verify port number
4. Use localhost not 127.0.0.1
```


### Debug Mode

Enable debug mode in Settings for troubleshooting:

Select debug information selectively from:
- Crypto
- Storage
- Shared Links
- Functions
- MCP Events
- API
- RAG
- Voice


---

## License

MIT No Attribution

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

---

<div align="center">

**hacka.re**

*Free, open, för hackare, av hackare*

[Website](https://hacka.re) | [GitHub](https://github.com/yourusername/hacka.re) 

</div>