# Debug MCP Server Connection

## Test if the MCP server command works manually

First, let's test if the MCP filesystem server works directly:

```bash
# Test 1: Check if the package can be downloaded
npx -y @modelcontextprotocol/server-filesystem --help

# Test 2: Try running it manually with a simple path
npx -y @modelcontextprotocol/server-filesystem .
```

If Test 2 works, you should see it waiting for JSON-RPC input. Try typing:
```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}
```

## Alternative: Try a different MCP server

If the filesystem server doesn't work, try a simpler one:

```bash
# Install and try a basic MCP server
npm install -g @modelcontextprotocol/server-memory
```

Then in the web interface, use:
```
mcp-server-memory
```

## Check Node.js/NPX version

```bash
node --version
npm --version
npx --version
```

## Try absolute path

If npx doesn't work, try installing globally first:
```bash
npm install -g @modelcontextprotocol/server-filesystem
```

Then use in web interface:
```
mcp-server-filesystem .
```

The issue is likely that the MCP server command itself isn't working, not the proxy code.