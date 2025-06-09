# MCP Client for hacka.re

This document describes the Model Context Protocol (MCP) client implementation for hacka.re.

## Overview

The MCP client enables hacka.re to connect to external MCP servers, extending its capabilities with additional tools, resources, and prompts while maintaining the privacy-focused, serverless architecture.

## Features

- **Zero Dependencies**: Pure JavaScript implementation with no external libraries
- **Seamless Integration**: MCP tools automatically register as hacka.re functions
- **Multiple Transport Support**: SSE (HTTP) transport with stdio planned
- **Privacy-Focused**: All connections and data remain client-side
- **Persistent Connections**: Saved connections auto-reconnect on page load

## Architecture

### Core Components

1. **MCPClientService** (`js/services/mcp-client-service.js`)
   - Core MCP protocol implementation
   - Connection management
   - Tool/resource/prompt discovery
   - Automatic function registration

2. **MCPManager** (`js/components/mcp-manager.js`)
   - User interface for managing connections
   - Visual connection status and capabilities
   - Configuration persistence

### Integration with hacka.re

The MCP client integrates deeply with hacka.re's function calling system:

1. **Tool Registration**: MCP tools are automatically converted to JavaScript functions
2. **Function Naming**: Tools are prefixed with `mcp_<server>_<tool>` 
3. **Group Management**: All tools from a server share a group ID
4. **Automatic Cleanup**: Functions are unregistered when disconnecting

## Usage

### Setting Up Stdio Support

To connect to local MCP servers (filesystem, memory, etc.), first start the proxy:

```bash
cd mcp-stdio-proxy
node server.js
```

### Via UI

1. Click the plug icon (🔌) in the header
2. Choose transport type:
   - **SSE**: For HTTP-based MCP servers
   - **Stdio**: For local command-line MCP servers (requires proxy)
3. Enter server details:
   - **Name**: Friendly identifier (e.g., "filesystem")
   - For SSE: **URL** and optional **Headers**
   - For Stdio: **Command**, **Arguments**, optional **Environment**
4. Click "Add Connection"
5. Tools appear in the Function Calling interface

### Via Functions

Use the included MCP example functions:

```javascript
// Connect to a server
mcp_connect_example("http://localhost:3000/mcp", "my-server")

// List connections
mcp_list_connections()

// Disconnect
mcp_disconnect("my-server")
```

### Tool Usage

Once connected, MCP tools appear as regular functions:

```javascript
// Example: filesystem server
mcp_filesystem_readFile({ path: "/etc/hosts" })

// Example: memory server  
mcp_memory_createEntity({ type: "note", data: { text: "Hello" } })
```

## Transport Support

### SSE (Server-Sent Events)

Currently supported for HTTP-based MCP servers:

```javascript
{
  transport: {
    type: 'sse',
    url: 'http://localhost:3000/mcp',
    headers: { 'Authorization': 'Bearer token' }
  }
}
```

### Stdio (Local Processes)

Connects to MCP servers running as local processes via the stdio proxy:

```javascript
{
  transport: {
    type: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-filesystem', '/home/user'],
    env: { DEBUG: 'true' },  // optional
    proxyUrl: 'http://localhost:3001'  // optional, defaults to 3001
  }
```

## Server Requirements

MCP servers must:

1. Support the MCP protocol v0.1.0
2. Provide SSE endpoint for bidirectional communication
3. Handle CORS appropriately for browser access
4. Implement standard MCP methods:
   - `initialize`
   - `tools/list`, `tools/call`
   - `resources/list`, `resources/read`
   - `prompts/list`, `prompts/get`

## Example Server

A minimal Express.js MCP server:

```javascript
const express = require('express');
const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// SSE endpoint
app.get('/mcp', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(':keepalive\n\n');
  }, 30000);
  
  req.on('close', () => clearInterval(keepAlive));
});

// POST endpoint for requests
app.post('/mcp', express.json(), (req, res) => {
  const { method, params, id } = req.body;
  
  // Handle MCP methods
  switch (method) {
    case 'initialize':
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          capabilities: { tools: true }
        }
      });
      break;
      
    case 'tools/list':
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: [{
            name: 'hello',
            description: 'Say hello',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              }
            }
          }]
        }
      });
      break;
      
    case 'tools/call':
      res.json({
        jsonrpc: '2.0',
        id,
        result: `Hello, ${params.arguments.name}!`
      });
      break;
  }
});

app.listen(3000);
```

## Security Considerations

1. **API Keys**: Store server credentials securely using hacka.re's encryption
2. **CORS**: Servers must explicitly allow browser access
3. **HTTPS**: Use secure connections for production servers
4. **Validation**: All tool inputs are passed through to servers without modification

## Limitations

1. **Stdio Requires Proxy**: Local processes need the stdio proxy running
2. **CORS Restrictions**: SSE servers must support browser clients
3. **SSE Limitations**: Some proxies/firewalls may interfere
4. **No WebSocket**: Current implementation uses SSE, not WebSocket

## Future Enhancements

1. **Browser Extension**: Enable stdio transport for local servers
2. **WebSocket Transport**: Alternative to SSE
3. **Tool Validation**: Schema validation before execution
4. **Progress UI**: Visual progress for long-running tools
5. **Resource Browser**: UI for exploring server resources

## Testing

Test the MCP client:

1. Start a local MCP server (see example above)
2. Open hacka.re and enable Function Calling
3. Use `mcp_connect_example()` to connect
4. Verify tools appear in function list
5. Test tool execution
6. Disconnect and verify cleanup

## Troubleshooting

### Connection Failed

- Check server URL and CORS headers
- Verify server implements required methods
- Check browser console for errors

### Tools Not Appearing  

- Ensure Function Calling is enabled
- Check server capabilities include tools
- Refresh capabilities manually

### SSE Connection Drops

- Implement keepalive messages
- Check proxy/firewall settings
- Consider shorter timeout values