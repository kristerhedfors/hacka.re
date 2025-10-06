# Hugging Face MCP Integration Setup

Complete guide for using Hugging Face MCP with hacka.re

## Overview

The Hugging Face MCP integration allows hacka.re to access the Hugging Face Hub through the Model Context Protocol, enabling:

- **Search models** - Find AI models by task, library, or keywords
- **Search datasets** - Discover datasets for training/evaluation
- **Search Spaces** - Find ML demos and applications
- **Search papers** - Access research papers and implementations
- **Run Spaces** - Execute Gradio apps via MCP

## Quick Start

### 1. Start the CORS Proxy

Hugging Face MCP requires authentication and doesn't allow direct browser connections. We use a local proxy:

```bash
# From the hacka.re root directory
python mcp_proxy/huggingface_proxy.py
```

The proxy will start on `http://localhost:8014` and forward requests to `https://huggingface.co/mcp`.

### 2. Test the Proxy (Optional)

```bash
./mcp_proxy/test_proxy.sh
```

You should see:
```
✅ Proxy is running
✅ MCP endpoint responding
```

### 3. Connect in hacka.re

1. Open hacka.re in your browser
2. Click the **MCP** button
3. Find **Hugging Face** in the quick connectors
4. Click **Connect**

The connector will:
- Try direct connection (will fail due to CORS)
- Automatically fall back to using the proxy
- Discover available tools via MCP introspection
- Register tools as functions in hacka.re

### 4. Start Using HF Tools

Once connected, you can use Hugging Face tools in your chat:

```
Search for sentiment analysis models

Find datasets for question answering

Show me text-to-image Spaces
```

## Architecture

```
┌─────────────┐        ┌──────────────┐        ┌────────────────────┐
│             │  HTTP  │              │  HTTP  │                    │
│  hacka.re   ├───────→│ Local Proxy  ├───────→│ huggingface.co/mcp │
│  (browser)  │        │ (port 8014)  │        │                    │
└─────────────┘        └──────────────┘        └────────────────────┘
                             │
                             │ Adds CORS headers
                             │ Forwards auth cookies
                             └─ Proxies SSE streams
```

## Technical Details

### Why a Proxy?

1. **CORS**: Hugging Face MCP doesn't allow direct browser connections (CORS policy)
2. **Authentication**: HF MCP requires login via browser cookies
3. **SSE Support**: The proxy handles Server-Sent Events for real-time updates

### Connection Flow

1. **Direct attempt**: Connector tries `https://huggingface.co/mcp?login`
2. **CORS failure**: Browser blocks the request (expected)
3. **Proxy fallback**: Connector switches to `http://localhost:8014/mcp?login`
4. **Proxy forwards**: Local proxy relays request to HF with CORS headers
5. **Tool discovery**: MCP introspection discovers available tools
6. **Registration**: Tools are registered as callable functions

### Discovered Tools

Tools are discovered dynamically via MCP introspection. Common tools include:

- `hf_search_models` - Search for models
- `hf_get_model` - Get model details
- `hf_search_datasets` - Search for datasets
- `hf_get_dataset` - Get dataset info
- `hf_search_spaces` - Search for Spaces
- `hf_run_space` - Execute a Space
- `hf_search_papers` - Search research papers

## Troubleshooting

### Proxy Won't Start

**Error**: `Address already in use`

**Solution**: Port 8014 is already taken
```bash
# Find what's using port 8014
lsof -i :8014

# Kill it or use a different port
# Edit huggingface_proxy.py and change port=8014
```

**Error**: `Module not found: starlette`

**Solution**: Install dependencies
```bash
pip install starlette uvicorn httpx
```

### Connection Fails

**Error**: `Failed to connect to Hugging Face MCP`

**Solutions**:
1. Verify proxy is running: `curl http://localhost:8014/health`
2. Check proxy logs for errors
3. Ensure you're logged into huggingface.co in your browser
4. Try restarting the proxy

### No Tools Discovered

**Error**: `No tools discovered via introspection`

**Solutions**:
1. Check proxy logs for authentication errors
2. Verify your HF account has API access
3. Try logging out and back into huggingface.co
4. Check HF service status: https://status.huggingface.co

### Authentication Required

**Message**: `⚠️ Authentication required (expected for HF MCP)`

This is **normal**. The Hugging Face MCP server requires authentication. The proxy should handle this automatically by forwarding browser cookies.

**If authentication still fails**:
1. Open https://huggingface.co in the same browser
2. Log in to your account
3. Keep that tab open
4. Try connecting in hacka.re again

## Development

### Testing the Connector

```bash
# Run connector tests
_tests/playwright/.venv/bin/python -m pytest \
  _tests/playwright/test_huggingface_mcp_basic.py -v
```

### Modifying the Proxy

The proxy is at `mcp_proxy/huggingface_proxy.py`. Key features:

- **CORS headers**: Allows browser connections
- **Request forwarding**: Proxies all headers and body
- **SSE streaming**: Supports Server-Sent Events
- **Health endpoint**: `/health` for monitoring

### Adding Support for Direct Connections

When Hugging Face adds hacka.re to their CORS whitelist, update the connector:

```javascript
// In mcp-huggingface-connector.js connectMCPServer()
// Remove the try/catch proxy fallback
// Use only direct connection
```

## Alternative: Desktop Clients

If you prefer not to use the proxy, Hugging Face MCP works natively with desktop clients:

- **Claude Desktop**: https://claude.ai/download
- **VS Code**: via MCP extension
- **Cursor**: built-in MCP support
- **Zed**: built-in MCP support

These don't have CORS restrictions and connect directly to `https://huggingface.co/mcp`.

## Files

- `js/services/mcp-huggingface-connector.js` - Main connector
- `js/default-prompts/huggingface-integration-guide.js` - Usage guide
- `mcp_proxy/huggingface_proxy.py` - CORS proxy server
- `mcp_proxy/test_proxy.sh` - Proxy test script
- `images/huggingface-icon.svg` - UI icon

## Resources

- [Hugging Face MCP Docs](https://huggingface.co/docs/hub/hf-mcp-server)
- [MCP Settings](https://huggingface.co/settings/mcp)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Hugging Face Hub](https://huggingface.co/models)

## Support

For issues:
1. Check this guide's troubleshooting section
2. Review proxy logs
3. Test with `./mcp_proxy/test_proxy.sh`
4. Check Hugging Face service status
5. Open an issue with logs and error messages
