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

### 1. Get Your Hugging Face Access Token

1. Go to [Hugging Face Settings > Tokens](https://huggingface.co/settings/tokens)
2. Click **"New token"** button
3. Give your token a name like "hacka.re MCP"
4. Select token type: **"Read"** (or "Write" if you need write access)
5. Click **"Generate token"**
6. Copy the token immediately (you won't see it again)

### 2. Connect in hacka.re

1. Open hacka.re in your browser
2. Click the **MCP** button
3. Find **Hugging Face** in the quick connectors
4. Click **Connect**
5. Paste your access token when prompted

The connector will:
- Connect directly to `https://huggingface.co/mcp`
- Validate your access token
- Discover available tools via MCP introspection
- Register tools as functions in hacka.re

### 3. Start Using HF Tools

Once connected, you can use Hugging Face tools in your chat:

```
Search for sentiment analysis models

Find datasets for question answering

Show me text-to-image Spaces
```

## Architecture

```
┌─────────────┐                  ┌────────────────────┐
│             │      HTTPS       │                    │
│  hacka.re   ├─────────────────→│ huggingface.co/mcp │
│  (browser)  │   Direct Connect │                    │
└─────────────┘                  └────────────────────┘
                                          │
                                          │ Bearer token auth
                                          │ CORS enabled for hacka.re
                                          └─ JSON-RPC over HTTP
```

## Technical Details

### Direct Connection

1. **CORS Support**: Hugging Face MCP accepts requests from `https://hacka.re`
2. **Authentication**: Uses Bearer token authentication (Hugging Face access tokens)
3. **Transport**: JSON-RPC 2.0 over HTTPS

### Connection Flow

1. **Token Setup**: User provides Hugging Face access token
2. **Token Validation**: Token is validated via `https://huggingface.co/api/whoami-v2`
3. **MCP Connection**: Direct connection to `https://huggingface.co/mcp` with Bearer token
4. **Tool Discovery**: MCP introspection discovers available tools
5. **Registration**: Tools are registered as callable functions

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

### Invalid Token Error

**Error**: `Invalid Hugging Face access token`

**Solutions**:
1. Verify you copied the complete token (starts with `hf_`)
2. Check that the token hasn't expired
3. Ensure the token has "Read" permissions at minimum
4. Generate a new token at https://huggingface.co/settings/tokens

### Connection Fails

**Error**: `Failed to connect to Hugging Face MCP server`

**Solutions**:
1. Verify your internet connection
2. Check that you can access https://huggingface.co in your browser
3. Ensure your access token is valid
4. Check HF service status: https://status.huggingface.co

### No Tools Discovered

**Error**: `No tools discovered via introspection`

**Solutions**:
1. Verify your token has sufficient permissions
2. Check your HF account is in good standing
3. Try disconnecting and reconnecting
4. Check browser console for detailed error messages

### CORS Errors

**Error**: CORS-related errors in browser console

This should not happen with the production deployment to hacka.re. If you see CORS errors:
1. Ensure you're using the production URL (https://hacka.re)
2. Check that you're not testing from a different origin
3. Clear browser cache and cookies
4. Try a different browser

## Development

### Testing the Connector

```bash
# Run connector tests
_tests/playwright/.venv/bin/python -m pytest \
  _tests/playwright/test_huggingface_mcp_basic.py -v
```

### Local Development

For local development (http://localhost:8000), you may need to use the CORS proxy since Hugging Face MCP may not accept localhost origins.

See `mcp_proxy/huggingface_proxy.py` for the local development proxy.

## Alternative: Desktop Clients

Hugging Face MCP also works with desktop AI clients:

- **Claude Desktop**: https://claude.ai/download
- **VS Code**: via MCP extension
- **Cursor**: built-in MCP support
- **Zed**: built-in MCP support

These clients connect directly to `https://huggingface.co/mcp` without browser CORS restrictions.

## Share Links

Hugging Face MCP connections are **fully supported in shared links**:

- **Automatic Inclusion**: Your HF token is automatically included when you create a share link with "MCP Connections" checked
- **Encrypted Storage**: The token is encrypted along with other credentials in the share link
- **Auto-Connection**: When someone opens your share link, the HF MCP connection is automatically established
- **Tool Registration**: All HF tools are automatically registered and ready to use
- **Link Optimization**: Uses compressed key mapping ('H') to minimize share link size

### Creating a Share Link with HF

1. Connect to Hugging Face MCP (see Quick Start above)
2. Click the **Share** button in the header
3. Check **"MCP Connections"** option
4. Click **"Generate Link"**
5. Your HF token will be included in the encrypted share link

### Opening a Share Link with HF

When you open a share link containing a HF connection:

1. Enter the password to decrypt the link
2. HF token is automatically restored
3. Connection to `https://huggingface.co/mcp` is established
4. All HF tools are registered and available
5. Start using HF search and inference tools immediately

## Namespace Management

Hugging Face MCP connections are **fully integrated with namespace management**:

- **Delete Current Namespace**: Removes HF token and connection data
- **"Delete current namespace and settings"** button in Settings modal clears all HF data
- **Clean Slate**: Ensures no HF credentials remain after namespace deletion
- **Privacy**: All HF tokens are encrypted and stored in the current namespace only

## Files

- `js/services/mcp-huggingface-connector.js` - Main connector
- `js/default-prompts/huggingface-integration-guide.js` - Usage guide
- `js/components/mcp/mcp-quick-connectors.js` - Quick connector UI
- `mcp_proxy/huggingface_proxy.py` - Local development proxy (optional)
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
