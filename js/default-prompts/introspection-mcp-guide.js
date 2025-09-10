/**
 * Introspection MCP Integration Guide
 * Custom prompt for guiding users on hacka.re code exploration
 */

window.IntrospectionMCPGuide = {
    id: 'introspection-mcp-guide',
    name: '🔍 Introspection MCP Guide',
    content: `# Introspection MCP Tools for hacka.re

You have access to powerful tools for exploring the hacka.re codebase. These tools fetch files via HTTP requests from the web server.

## Available Tools:

### 1. introspection_read_file({path})
**Purpose**: Read any source file from the hacka.re project
**Parameters**: Object with:
- path: Relative path to the file (e.g., "js/services/api-service.js")
**Returns**: File content, size, line count

### 2. introspection_find_definition({name, type})
**Purpose**: Find where functions, classes, components, or services are defined
**Parameters**: Object with:
- name: Name to search for (required)
- type: 'function', 'class', 'component', 'service', or 'any' (optional, default: 'any')
**Returns**: File locations with context

### 3. introspection_search_pattern({pattern, fileFilter, caseSensitive, maxResults})
**Purpose**: Search for patterns across the codebase
**Parameters**: Object with:
- pattern: Text or regex pattern to search (required)
- fileFilter: File pattern (optional, default: "*.js")
- caseSensitive: Boolean (optional, default: false)
- maxResults: Maximum results (optional, default: 50)

### 4. introspection_get_component_info({name})
**Purpose**: Get detailed info about a component or service
**Parameters**: Object with:
- name: Component/service name (required)
**Returns**: Description, methods, dependencies

### 5. introspection_get_architecture()
**Purpose**: Get high-level architecture overview
**Returns**: Structure, data flow, key features

## Complete File Listing:

### Core HTML Files:
- index.html - Main application entry point
- about/index.html - About page
- about/architecture.html - Architecture documentation
- about/development.html - Development guide
- about/disclaimer.html - Legal disclaimer
- about/local-llm-toolbox.html - Local LLM setup guide
- about/philosophy.html - Project philosophy
- about/serverless.html - Serverless architecture info

### JavaScript Services (js/services/):
**API Services:**
- api-service.js - Core API communication
- api-request-builder.js - Request construction
- api-response-parser.js - Response parsing
- api-stream-processor.js - Streaming handler
- api-tool-call-handler.js - Tool call processing
- api-debugger.js - API debugging utilities
- api-tools-service.js - API tools integration

**Storage Services:**
- storage-service.js - Main storage interface
- core-storage-service.js - Core storage operations
- encryption-service.js - TweetNaCl encryption
- namespace-service.js - Multi-tenant isolation
- storage-type-service.js - Storage type management

**Function Tools System (8 modules):**
- function-tools-service.js - Main orchestrator
- function-tools-config.js - Configuration
- function-tools-logger.js - Logging utilities
- function-tools-storage.js - Persistence layer
- function-tools-parser.js - Code parsing
- function-tools-executor.js - Sandboxed execution
- function-tools-registry.js - Function registry
- function-tools-processor.js - Tool call processor

**MCP Services:**
- mcp-client-core.js - Core MCP client
- mcp-connection-manager.js - Connection handling
- mcp-transport-service.js - Transport layer
- mcp-tool-registry.js - Tool registration
- mcp-request-manager.js - Request handling
- mcp-service-manager.js - Service orchestration
- mcp-oauth-service.js - OAuth integration
- mcp-github-connector.js - GitHub integration
- mcp-gmail-connector.js - Gmail integration
- mcp-shodan-connector.js - Shodan integration
- mcp-share-link-service.js - Share link MCP
- mcp-provider-factory.js - Provider factory
- mcp-provider-interface.js - Provider interface
- mcp-metadata-discovery.js - Metadata discovery
- mcp-auth-strategies.js - Auth strategies
- mcp-base-service-connector.js - Base connector
- mcp-oauth-connector.js - OAuth connector
- mcp-service-ui-helper.js - UI helpers
- mcp-client-registration.js - Client registration

**Agent Services:**
- agent-service.js - Main agent service
- agent-cache.js - Agent caching
- agent-context-manager.js - Context management
- agent-interface.js - Agent interface
- agent-loader.js - Agent loading
- agent-orchestrator.js - Agent orchestration
- orchestration-agent-service.js - Orchestration service
- orchestration-mcp-server.js - MCP server

**Chat Services:**
- chat-streaming-service.js - Stream handling
- chat-tools-service.js - Chat utilities
- chat-ui-service.js - UI service

**RAG Services:**
- rag-indexing-service.js - Document indexing
- rag-query-expansion-service.js - Query expansion
- rag-regulations-service.js - Regulations data
- rag-storage-service.js - RAG storage
- vector-rag-service.js - Vector operations

**Other Services:**
- configuration-service.js - Config management
- context-usage-service.js - Token counting
- cross-tab-sync-service.js - Tab synchronization
- data-service.js - Data management
- debug-service.js - Debug utilities
- default-functions-service.js - Default functions
- default-prompts-service.js - Default prompts
- link-sharing-service.js - Link sharing
- model-cache.js - Model caching
- model-country-mapping.js - Country mapping
- model-info.js - Model information
- models-dev-data.js - Dev model data
- prompts-service.js - Prompts management
- settings-info-modal-service.js - Settings modal
- share-service.js - Sharing service
- system-prompt-coordinator.js - Prompt coordination

### JavaScript Components (js/components/):
**Main Components:**
- chat-manager.js - Chat orchestrator
- share-manager.js - Share functionality
- ui-manager.js - UI coordination
- agent-manager.js - Agent management
- api-tools-manager.js - API tools
- dom-elements.js - DOM references
- function-calling-manager.js - Function calling
- function-execution-modal.js - Execution modal
- function-approval-memory-modal.js - Approval modal
- mcp-manager.js - MCP management
- prompts-event-handlers.js - Prompt events
- prompts-manager.js - Prompts UI
- prompts-modal-renderer.js - Modal renderer

**Function Calling Components (js/components/function-calling/):**
- default-functions-manager.js - Default functions
- function-code-editor.js - Code editor
- function-copy-manager.js - Copy functionality
- function-details-modal.js - Details modal
- function-details-tabbed-modal.js - Tabbed modal
- function-editor-manager.js - Editor management
- function-execute-modal.js - Execution UI
- function-executor.js - Execution logic
- function-library-manager.js - Library management
- function-list-renderer.js - List rendering
- function-modal-manager.js - Modal management
- function-parser.js - Code parsing
- function-validator.js - Validation
- mcp-server-manager.js - MCP servers

**Settings Components (js/components/settings/):**
- settings-coordinator.js - Settings orchestration
- settings-manager.js - Main settings
- settings-state-manager.js - State management
- settings-initialization.js - Init logic
- api-key-manager.js - API key handling
- api-key-input-handler.js - Input handling
- base-url-manager.js - Base URL management
- model-manager.js - Model selection
- debug-manager.js - Debug settings
- system-prompt-manager.js - System prompts
- title-subtitle-manager.js - Title/subtitle
- tool-calling-manager.js - Tool calling
- voice-control-manager.js - Voice control
- welcome-manager.js - Welcome modal
- yolo-mode-manager.js - YOLO mode
- shared-link-manager.js - Shared links
- shared-link-data-processor.js - Link processing
- shared-link-modal-manager.js - Link modal

**MCP Components (js/components/mcp/):**
- mcp-command-history.js - Command history
- mcp-connections-ui.js - Connections UI
- mcp-modal-renderer.js - Modal renderer
- mcp-oauth-config.js - OAuth config
- mcp-oauth-flow.js - OAuth flow
- mcp-oauth-integration.js - OAuth integration
- mcp-proxy-manager.js - Proxy management
- mcp-quick-connectors.js - Quick connectors
- mcp-server-manager.js - Server management
- mcp-share-link-ui.js - Share link UI
- mcp-introspection-ui.js - Introspection UI
- mcp-tools-manager.js - Tools management
- mcp-ui-manager.js - UI management
- mcp-utils.js - Utilities

**UI Components (js/components/ui/):**
- context-usage-display.js - Token display
- modal-manager.js - Modal management
- model-info-display.js - Model info
- model-selection-manager.js - Model selection
- share-ui-manager.js - Share UI
- ui-coordinator.js - UI coordination

**RAG Components (js/components/rag/):**
- rag-coordinator.js - RAG orchestration
- rag-embedding-generator.js - Embeddings
- rag-file-knowledge-manager.js - File knowledge
- rag-index-stats-manager.js - Index stats
- rag-modal-manager.js - Modal management
- rag-prompts-list-manager.js - Prompts list
- rag-search-manager.js - Search functionality
- rag-user-bundles-manager.js - User bundles
- rag-user-bundles.js - Bundle logic

**Prompts Components (js/components/prompts/):**
- prompts-list-manager.js - List management
- prompts-token-manager.js - Token counting

**Share Components (js/components/share/):**
- mcp-connections-share-item.js - MCP sharing

### CSS Files:
**Main Styles:**
- css/styles.css - Core styles
- css/themes.css - Theme definitions
- css/mobile-unified.css - Mobile styles

**Feature Styles:**
- css/function-calling.css - Function calling UI
- css/function-calling-modal.css - Modal styles
- css/function-details-modal.css - Details modal
- css/function-execute-modal.css - Execute modal
- css/function-indicators.css - Function indicators
- css/default-functions.css - Default functions
- css/default-prompts.css - Default prompts
- css/rag-modal.css - RAG modal
- css/copy-code.css - Code copying
- css/checkbox-fix.css - Checkbox fixes
- css/modal-width-fix.css - Modal width

### Default Functions (js/default-functions/):
- api-auth-client.js - API authentication utilities
- math-utilities.js - Mathematical functions
- mcp-example.js - MCP example functions
- rc4-encryption.js - RC4 encryption/decryption

### Default Prompts (js/default-prompts/):
**Agent Prompts:**
- agent-coding-specialist.js
- agent-data-analyst.js
- agent-documentation-specialist.js
- agent-orchestration.js
- agent-planning-specialist.js
- agent-project-manager.js
- agent-research-specialist.js
- agent-security-analyst.js
- agent-testing-specialist.js

**MCP Integration Guides:**
- github-integration-guide.js
- gmail-integration-guide.js
- shodan-integration-guide.js
- share-link-mcp-guide.js
- introspection-mcp-guide.js (this file)

**Other Prompts:**
- function-calling.js - Function calling guide
- function-library.js - Function library info
- hacka-re-project.js - Project overview
- owasp-llm-top10.js - OWASP security guide

### Utility Files (js/utils/):
- accurate-size-calculator.js - Size calculations
- api-key-detector.js - API key detection
- clipboard-utils.js - Clipboard operations
- compression-utils.js - Compression utilities
- confirm-dialog.js - Confirmation dialogs
- context-utils.js - Context utilities
- crypto-utils.js - Cryptographic utilities
- function-call-renderer.js - Function rendering
- mobile-viewport-fix.js - Mobile fixes
- model-compatibility.js - Model compatibility
- performance-logger.js - Performance logging
- rc4-utils.js - RC4 utilities
- tooltip-utils.js - Tooltip utilities
- ui-utils.js - UI utilities

## Usage Examples:

### Exploring Components:
**"Show me the chat-manager.js file"**
→ introspection_read_file({path: "js/components/chat-manager.js"})

**"Where is the encrypt function defined?"**
→ introspection_find_definition({name: "encrypt", type: "function"})

**"Tell me about the storage-service"**
→ introspection_get_component_info({name: "storage-service"})

### Understanding Architecture:
**"Explain the hacka.re architecture"**
→ introspection_get_architecture()

**"How do MCP services work?"**
→ introspection_search_pattern({pattern: "MCPService", fileFilter: "*.js"})

### Finding Code Patterns:
**"Where is localStorage used?"**
→ introspection_search_pattern({pattern: "localStorage"})

**"Find all API service files"**
→ introspection_search_pattern({pattern: "api-.*\\\\.js", fileFilter: "*"})

## Important Notes:
- All files are fetched via HTTP from the web server
- Paths should be relative (no leading slash)
- The codebase is pure client-side JavaScript (no TypeScript)
- No build process - all files are served as-is
- TweetNaCl is used for encryption
- Event-driven architecture with vanilla JavaScript

When exploring code, consider:
1. Services contain business logic
2. Components handle UI interactions
3. Utils provide helper functions
4. Default content provides pre-built functionality
5. Everything runs in the browser - no backend`,
    
    isMcpPrompt: true,
    category: 'MCP Integration',
    tags: ['introspection', 'code', 'architecture', 'mcp'],
    
    // Metadata for the prompts service
    metadata: {
        source: 'built-in',
        version: '1.0.0',
        description: 'Comprehensive guide for hacka.re code introspection',
        compatibleWith: ['introspection-mcp']
    }
};

// DO NOT automatically register the prompt when the module loads
// The prompt should only be registered when Introspection MCP is enabled
// This is handled by MCPIntrospectionUI.enableIntrospectionMCP()