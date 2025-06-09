# MCP Integration Documentation

## Overview

hacka.re implements comprehensive Model Context Protocol (MCP) integration that allows AI models to access external tools and resources through MCP servers. The integration is built as a pure client-side implementation with no external dependencies, following hacka.re's privacy-focused architecture.

## Architecture

### Core Components

#### 1. MCP Client Service (`js/services/mcp-client-service.js`)
- **Purpose**: Zero-dependency MCP client implementation
- **Features**:
  - JSON-RPC 2.0 protocol implementation
  - Support for stdio and SSE transports
  - Automatic tool registration with hacka.re's function calling system
  - Server capability detection and management
  - Request/response handling with timeout management

#### 2. MCP Manager (`js/components/mcp-manager.js`)
- **Purpose**: UI component for managing MCP server connections
- **Features**:
  - Proxy connection management
  - Server configuration and control
  - Command history with encrypted storage
  - Real-time server status monitoring
  - Integration with existing hacka.re modal system

#### 3. MCP Stdio Proxy (`mcp-stdio-proxy/server.js`)
- **Purpose**: Bridge between browser-based client and stdio-based MCP servers
- **Features**:
  - Process management for MCP servers
  - SSE streaming for real-time communication
  - CORS handling for browser compatibility
  - Debug logging and monitoring

## Implementation Details

### Function Generation and Registration

When connecting to an MCP server, tools are automatically converted to JavaScript functions:

```javascript
// Generated function for MCP filesystem tool
async function mcp_filesystem_list_directory(path) {
    try {
        const MCPClient = window.MCPClientService;
        if (!MCPClient) {
            return { error: "MCP Client Service not available", success: false };
        }
        
        // Build params object from explicit parameters
        const params = {};
        if (typeof path !== 'undefined') {
            params['path'] = path;
        }
        
        const result = await MCPClient.callTool('filesystem', 'list_directory', params);
        return { success: true, result: result };
    } catch (error) {
        return { success: false, error: error.message || "Tool execution failed" };
    }
}
```

### Parameter Handling Strategy

The implementation uses explicit parameter declarations to ensure compatibility with hacka.re's function executor:

1. **Schema Analysis**: Extract parameter names from MCP tool's input schema
2. **Function Generation**: Create functions with explicit parameter signatures
3. **Parameter Mapping**: Build params object from individual parameters
4. **Type Safety**: Handle undefined parameters gracefully

### Transport Layer

#### Stdio Transport via Proxy
```javascript
// Transport configuration
const config = {
    transport: {
        type: 'stdio',
        proxyUrl: 'http://localhost:3001',
        command: 'npx -y @modelcontextprotocol/server-filesystem',
        args: ['/Users/username/Desktop']
    }
};
```

#### Direct SSE Transport
```javascript
// SSE transport for HTTP-based MCP servers
const config = {
    transport: {
        type: 'sse',
        url: 'https://example.com/mcp/endpoint',
        headers: { 'Authorization': 'Bearer token' }
    }
};
```

## User Interface Integration

### MCP Modal Structure

The MCP modal follows hacka.re's consistent UI patterns:

```html
<div id="mcp-servers-modal" class="modal">
    <div class="modal-content">
        <!-- Proxy Connection Section -->
        <div class="proxy-section">
            <h3>MCP Stdio Proxy Connection</h3>
            <!-- Connection controls -->
        </div>
        
        <!-- Command History Section -->
        <div class="mcp-command-history-section">
            <h3>Command History</h3>
            <!-- History management -->
        </div>
        
        <!-- Server Management Section -->
        <div class="mcp-servers-container">
            <h3>Connected Servers</h3>
            <!-- Server list and controls -->
        </div>
        
        <!-- Server Configuration -->
        <div class="mcp-server-config">
            <h4>Add MCP Server</h4>
            <!-- Form for adding servers -->
        </div>
    </div>
</div>
```

### Command History Features

- **Encrypted Storage**: Command history stored using `CoreStorageService`
- **Deduplication**: Prevents duplicate entries based on command and mode
- **Exclusion from Sharing**: History is not included in shared links
- **Reusability**: Click to re-execute previous commands
- **Time Tracking**: Shows when commands were last used

## Security and Privacy

### Data Encryption
- All MCP command history encrypted in localStorage
- Uses hacka.re's existing `CoreStorageService`
- No data transmitted to external servers except direct MCP communication

### Proxy Security
- Local proxy server runs on localhost only
- No external network access unless explicitly configured
- Process isolation for MCP servers
- Debug logging can be disabled for production

### Function Execution Safety
- Functions execute in sandboxed environment
- Parameters validated before transmission
- Error handling prevents crashes
- No automatic code execution

## Configuration Examples

### Filesystem Server (NPX)
```bash
# Start proxy
node mcp-stdio-proxy/server.js --debug

# Add server via UI
Command: npx -y @modelcontextprotocol/server-filesystem /Users/username/Desktop
Server Name: filesystem (auto-detected)
```

### Filesystem Server (Docker)
```json
{
  "name": "filesystem",
  "command": "docker",
  "args": [
    "run", "-i", "--rm",
    "--mount", "type=bind,src=/Users/username/Desktop,dst=/projects/Desktop",
    "mcp/filesystem", "/projects"
  ]
}
```

### Custom MCP Server
```bash
# Python-based MCP server
Command: python /path/to/custom-mcp-server.py
Server Name: custom-server
```

## API Reference

### MCPClientService Methods

#### `connect(name, config, options)`
- **Purpose**: Establish connection to MCP server
- **Parameters**:
  - `name`: Unique server identifier
  - `config`: Transport and server configuration
  - `options`: Connection options (callbacks, etc.)
- **Returns**: Promise resolving to connection object

#### `callTool(serverName, toolName, params, options)`
- **Purpose**: Execute tool on connected server
- **Parameters**:
  - `serverName`: Name of target server
  - `toolName`: Name of tool to execute
  - `params`: Tool parameters object
  - `options`: Execution options (timeout, progress callbacks)
- **Returns**: Promise resolving to tool result

#### `getConnectionInfo(name)`
- **Purpose**: Retrieve server connection details
- **Returns**: Connection info object or null

#### `refreshServerCapabilities(name)`
- **Purpose**: Reload tools, resources, and prompts from server
- **Returns**: Promise resolving when refresh complete

### MCPManager Methods

#### `connectToServer(serverName)`
- **Purpose**: Connect to running proxy server and load tools
- **Integration**: Automatically registers tools with function calling system

#### `stopProxyServer(serverName)`
- **Purpose**: Stop server process and disconnect
- **Cleanup**: Removes functions from function calling system

## Error Handling

### Connection Errors
- Proxy unavailable: Clear error messages and retry suggestions
- Server startup failures: Command validation and troubleshooting
- Transport errors: Automatic cleanup and reconnection attempts

### Tool Execution Errors
- Parameter validation before transmission
- Timeout handling with configurable limits
- Graceful degradation for server errors
- Detailed error logging for debugging

### Function Generation Errors
- Schema validation for tool definitions
- Safe JavaScript generation with escaping
- Fallback for missing or invalid schemas
- Clear error messages for malformed tools

## Integration with hacka.re Features

### Function Calling System
- MCP tools automatically registered as callable functions
- Seamless integration with existing function management
- Proper cleanup when servers disconnect
- Group management for MCP functions

### Settings and Storage
- MCP settings encrypted with other hacka.re data
- Command history excluded from shared links
- Server configurations persist across sessions
- Namespace isolation for different GPT instances

### UI Consistency
- MCP modal follows hacka.re design patterns
- Uses existing CSS variables and styling
- Consistent button layouts and interactions
- Mobile-responsive design

## Development Guidelines

### Adding New Transport Types
1. Implement transport in `createTransport()` function
2. Add transport-specific configuration validation
3. Update UI to support new transport options
4. Test with real MCP servers

### Extending Tool Registration
1. Modify `registerServerTools()` for custom tool handling
2. Update function generation in `createToolFunction()`
3. Test parameter passing and execution
4. Ensure proper cleanup on disconnect

### UI Enhancements
1. Follow existing hacka.re modal patterns
2. Use CSS variables for consistent theming
3. Implement proper accessibility features
4. Test across different screen sizes

## Troubleshooting

### Common Issues

#### Proxy Connection Failed
- Verify proxy server is running: `node mcp-stdio-proxy/server.js`
- Check port availability (default: 3001)
- Ensure CORS headers are properly configured

#### Tool Execution Failures
- Check MCP server logs for errors
- Verify parameter types match tool schema
- Test tool execution directly via proxy API
- Review function generation for syntax errors

#### Parameter Passing Issues
- Verify tool schema defines required parameters
- Check function generation creates correct signatures
- Test with simple tools before complex ones
- Enable debug logging for parameter tracing

### Debug Mode
Enable comprehensive logging:
```bash
node mcp-stdio-proxy/server.js --debug
```

This provides detailed logs for:
- HTTP request/response cycles
- MCP message transmission
- Process management
- Error conditions

## Future Enhancements

### Planned Features
- Resource access integration
- Prompt template support
- Batch tool execution
- Server discovery mechanisms
- Enhanced error recovery

### Potential Improvements
- WebSocket transport support
- Tool composition and chaining
- Server health monitoring
- Performance optimization
- Enhanced security features

## Standards Compliance

### MCP Protocol
- Implements MCP specification version 0.1.0
- JSON-RPC 2.0 compliant messaging
- Proper capability negotiation
- Standard error handling

### Browser Compatibility
- No external dependencies
- Cross-browser JavaScript
- Responsive design principles
- Accessibility compliance

This integration demonstrates hacka.re's commitment to extensibility while maintaining its core principles of privacy, security, and client-side operation.