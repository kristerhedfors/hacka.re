package prompts

// IntrospectionMCPContent contains the Introspection MCP integration prompt
const IntrospectionMCPContent = `# Introspection MCP Tools for hacka.re

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
- mcp-auth-strategies.js - Auth strategies`