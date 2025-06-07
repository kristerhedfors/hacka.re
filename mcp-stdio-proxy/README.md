# MCP Stdio Proxy

This proxy enables hacka.re to connect to MCP servers that communicate via stdio (stdin/stdout), which browsers cannot do directly.

## Quick Start

1. **Start the proxy:**
   ```bash
   cd mcp-stdio-proxy
   node server.js
   ```
   
   The proxy runs on port 3001 by default. Use `PORT=8080 node server.js` to change.

2. **Enable debug mode for troubleshooting:**
   ```bash
   DEBUG=true node server.js
   # OR
   node server.js --debug
   ```
   
   Debug mode shows detailed logging of all communication between hacka.re and MCP servers.

3. **In hacka.re:**
   - Click the plug icon (🔌)
   - Choose "Stdio (via local proxy)" as transport
   - Enter command and arguments
   - Click "Add Connection"

## Examples

### Filesystem Server

**Command:** `npx`  
**Arguments:**
```
@modelcontextprotocol/server-filesystem
/Users/your-username
```

This gives the AI access to read files in your home directory.

### Memory Server

**Command:** `bunx`  
**Arguments:**
```
@modelcontextprotocol/server-memory
```

Provides a simple key-value store for the AI.

### Everything Server (macOS)

**Command:** `npx`  
**Arguments:**
```
@modelcontextprotocol/server-everything
```

Integrates with Everything search tool on macOS.

### Puppeteer Server

**Command:** `npx`  
**Arguments:**
```
@modelcontextprotocol/server-puppeteer
```

Allows AI to control a headless browser.

## Custom Commands

You can run any executable that implements the MCP protocol:

**Command:** `/path/to/your/mcp-server`  
**Arguments:** (optional)  
**Environment Variables:**
```json
{
  "API_KEY": "your-key",
  "DEBUG": "true"
}
```

## Security

The proxy only allows connections from localhost by default. To allow other origins:

```bash
ALLOWED_ORIGINS=http://localhost:8000,https://hacka.re node server.js
```

## API Endpoints

- `POST /mcp/start` - Start a new MCP server process
- `POST /mcp/stop` - Stop an MCP server  
- `POST /mcp/command` - Send command to server
- `GET /mcp/events` - SSE event stream for server messages
- `GET /mcp/list` - List active servers
- `GET /health` - Health check

## Troubleshooting

### Connection Failed

1. Ensure the proxy is running: `curl http://localhost:3001/health`
2. Check the proxy console for error messages
3. Verify the command exists: `which npx` or `which bunx`

### Server Won't Start

1. Test the command manually:
   ```bash
   npx @modelcontextprotocol/server-filesystem /tmp
   ```
2. Check for missing dependencies
3. Ensure proper permissions

### CORS Errors

Add your hacka.re URL to allowed origins:
```bash
ALLOWED_ORIGINS=http://localhost:8000 node server.js
```

## How It Works

1. **Browser → Proxy:** hacka.re sends HTTP requests to start/stop servers and send messages
2. **Proxy → Process:** The proxy spawns the MCP server as a child process
3. **Process → Proxy:** Server output (stdout) is parsed as JSON-RPC messages
4. **Proxy → Browser:** Messages are forwarded via Server-Sent Events (SSE)

## Development

The proxy is a simple Node.js server with no dependencies. To modify:

1. Edit `server.js`
2. Restart the proxy
3. Test with hacka.re

Common modifications:
- Change default port
- Add authentication
- Filter allowed commands
- Add request logging