# Context7 MCP Integration for hacka.re

Context7 provides context and memory management capabilities for AI applications. This integration adds Context7 tools to hacka.re through the Model Context Protocol (MCP).

## Quick Setup

### Via Quick Connect Panel (Recommended)

1. Open hacka.re in your browser
2. Go to Settings → MCP Servers
3. Look for Context7 in the "Quick Connect" section (alongside GitHub, Gmail, etc.)
4. Click "Connect" on the Context7 card
5. Context7 MCP server will be registered for stdio transport
6. The status will show "Connected" indicating the server is configured
7. To use Context7 tools, start the MCP proxy server or use in MCP-compatible environments

### Via Browser Console (Alternative)

1. Open hacka.re in your browser
2. Open the browser console (F12 or Cmd+Option+I)
3. Copy and paste this code:

```javascript
(() => {
  const KEY = "hackare.mcpServers";
  const servers = JSON.parse(localStorage.getItem(KEY) || "{}");

  servers["context7"] = {
    command: "npx",
    args: ["-y", "@upstash/context7-mcp@latest"],
    transport: "stdio",
    name: "Context7",
    description: "Context/memory management via local server"
  };

  localStorage.setItem(KEY, JSON.stringify(servers));
  console.log("✓ Context7 server registered in hacka.re");
})();
```

4. Reload the hacka.re page
5. Context7 tools will now be available in your function calling interface

## What Gets Installed

One MCP server configuration is added:

**context7** - Local stdio server
- Command: `npx -y @upstash/context7-mcp@latest`
- Transport: stdio (Standard input/output)
- Most reliable and compatible option
- Works with MCP proxy servers and compatible environments
- Automatically manages the latest version

## Available Tools

Once installed, Context7 provides these tools in hacka.re:

- Context storage and retrieval
- Memory management across conversations
- Semantic search capabilities
- Context aggregation and summarization

## Optional: Local Server

For enhanced privacy or offline usage, you can run a local Context7 server:

```bash
# Option 1: stdio (recommended for hacka.re)
npx --yes @upstash/context7-mcp@latest --transport stdio

# Option 2: HTTP server
npx --yes @upstash/context7-mcp@latest --transport http --port 3307

# Option 3: SSE server
npx --yes @upstash/context7-mcp@latest --transport sse --port 3307
```

## UI Location

Context7 appears in the Quick Connect section of the MCP Servers settings:
- Open Settings (gear icon)
- Navigate to MCP Servers tab
- Find Context7 at the bottom of the Quick Connect grid
- It displays with a brain icon (🧠) alongside GitHub, Gmail, Google Docs, and Google Calendar

## Verification

To verify the installation:

1. Check the Quick Connect panel - Context7 should show "Connected" status
2. Or open browser console and run: `JSON.parse(localStorage.getItem("hackare.mcpServers"))`
3. You should see `context7` and `context7-local` entries

## Troubleshooting

### Tools not appearing
- Ensure you've reloaded hacka.re after installation
- Check browser console for any errors
- Verify localStorage contains the MCP server entries

### Connection issues
- The public relay requires internet connection
- For offline use, start the local server first
- Check browser's network tab for connection errors

## Removal

To remove Context7 integration:

```javascript
const servers = JSON.parse(localStorage.getItem("hackare.mcpServers") || "{}");
delete servers.context7;
delete servers["context7-local"];
localStorage.setItem("hackare.mcpServers", JSON.stringify(servers));
```

## Security Notes

- All data is processed locally in your browser
- The public relay uses HTTPS/WSS for secure transport
- No data is stored on remote servers without explicit action
- Local server option provides complete data isolation