# Hugging Face MCP - Token Authentication Setup

## ✅ Now Working with Access Tokens!

The Hugging Face MCP integration now supports **manual authentication using HF Access Tokens**, similar to how GitHub PAT works.

## Quick Start (3 Steps)

### 1. Start the Proxy

```bash
.venv/bin/python mcp_proxy/huggingface_proxy.py
```

Leave this running in a terminal. You should see:
```
Starting Hugging Face MCP Proxy on http://localhost:8014
Proxying to: https://huggingface.co/mcp
```

### 2. Get Your Hugging Face Access Token

1. Visit **https://huggingface.co/settings/tokens**
2. Click **"New token"**
3. Give it a name: `hacka.re MCP`
4. Select type: **"Read"** (or "Write" if you need write access)
5. Click **"Generate token"**
6. **Copy the token immediately** (you won't see it again!)

Example token: `hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 3. Connect in hacka.re

1. Open hacka.re in your browser
2. Click the **MCP** button (top toolbar)
3. Find **Hugging Face** in quick connectors
4. Click **"Connect"**
5. A dialog will appear asking for your token
6. **Paste your token** and click OK

That's it! The connector will:
- ✅ Validate your token
- ✅ Connect to HF MCP server via proxy
- ✅ Discover available tools
- ✅ Register tools as functions
- ✅ Auto-enable "Hugging Face MCP prompt"

## How It Works

```
┌─────────────┐                ┌──────────────┐                ┌────────────────────┐
│             │  + Bearer      │              │  + Bearer      │                    │
│  hacka.re   │    Token       │ Local Proxy  │    Token       │ huggingface.co/mcp │
│  (browser)  ├───────────────→│ (port 8014)  ├───────────────→│                    │
└─────────────┘                └──────────────┘                └────────────────────┘
                                      │
                                      │ Forwards Authorization header
                                      │ Adds CORS headers
                                      └─ Proxies requests/responses
```

1. **You provide token** → Stored encrypted in browser storage
2. **Connector adds `Authorization: Bearer hf_xxx`** → To all requests
3. **Proxy forwards** → To Hugging Face MCP server
4. **HF authenticates** → Via your token
5. **Tools discovered** → Via MCP introspection
6. **Ready to use!** → Call HF tools in chat

## Token Security

✅ **Your token is safe:**
- Encrypted before storage (TweetNaCl)
- Never sent to third parties
- Only sent to HF servers
- Stored locally in browser
- Can be revoked anytime at https://huggingface.co/settings/tokens

## Available Tools

Once connected, you'll have access to HF MCP tools (discovered dynamically):

- `hf_search_models` - Search for AI models
- `hf_get_model` - Get model details
- `hf_search_datasets` - Search for datasets
- `hf_get_dataset` - Get dataset info
- `hf_search_spaces` - Search for Spaces (demos)
- `hf_run_space` - Execute a Space
- `hf_search_papers` - Search research papers
- And more...

## Usage Examples

After connecting, you can use Hugging Face in your chats:

```
Find me sentiment analysis models

Search for question-answering datasets

Show me text-to-image Spaces

What papers are there about transformers?
```

## Troubleshooting

### Token Validation Failed

**Error**: `Invalid Hugging Face access token`

**Solutions**:
1. Check you copied the complete token (starts with `hf_`)
2. Verify token is active at https://huggingface.co/settings/tokens
3. Make sure token has "Read" permission
4. Try generating a new token

### Proxy Not Running

**Error**: `Failed to connect to Hugging Face MCP proxy`

**Solution**: Start the proxy
```bash
.venv/bin/python mcp_proxy/huggingface_proxy.py
```

Verify it's running:
```bash
curl http://localhost:8014/health
# Should return: {"status": "ok", "service": "huggingface-mcp-proxy"}
```

### MCP Connection Failed

**Error**: Connection succeeds but no tools discovered

**Solutions**:
1. Check proxy logs for errors
2. Verify your token has correct permissions
3. Try disconnecting and reconnecting
4. Check HF service status: https://status.huggingface.co

### Port 8014 Already in Use

**Error**: `Address already in use`

**Solution**:
```bash
# Find what's using port 8014
lsof -i :8014

# Kill it or change proxy port in:
# - mcp_proxy/huggingface_proxy.py (port=8014)
# - js/services/mcp-huggingface-connector.js (mcpServerUrl)
```

## Token Management

### Viewing Your Tokens

Visit https://huggingface.co/settings/tokens to see all your tokens.

### Revoking a Token

1. Go to https://huggingface.co/settings/tokens
2. Find `hacka.re MCP` token
3. Click **"Delete"** or **"Revoke"**
4. In hacka.re: Disconnect and reconnect with new token

### Token Permissions

- **Read**: Can access public/private models, datasets, Spaces
- **Write**: Can also upload models, create datasets, modify content
- **Fine-grained**: Limit access to specific resources

**Recommendation**: Use **"Read"** tokens for safety unless you need write access.

## Comparison to Gmail Approach

| Feature | Gmail (Old) | Hugging Face (New) |
|---------|------------|-------------------|
| Auth Method | OAuth (complex) | Access Token (simple) |
| Setup Steps | 7+ steps with Google Cloud | 3 steps |
| User Experience | Multiple redirects | One token paste |
| Token Format | OAuth refresh token | `hf_xxx` string |
| Revocation | Google account settings | HF settings page |
| Maintenance | OAuth can expire | Token is permanent until revoked |

## Testing

To verify everything works:

```bash
# 1. Proxy health
curl http://localhost:8014/health

# 2. Test with your token
curl -X POST http://localhost:8014/mcp \
  -H "Authorization: Bearer hf_YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}'
```

If successful, you should get an MCP initialize response (not 401).

## Files Involved

- **Connector**: `js/services/mcp-huggingface-connector.js` (rewritten for tokens)
- **Proxy**: `mcp_proxy/huggingface_proxy.py` (forwards Authorization header)
- **Prompt**: `js/default-prompts/huggingface-integration-guide.js`
- **Icon**: `images/huggingface-icon.svg`

## Next Steps After Connecting

1. **Open Prompts modal** - See "Hugging Face MCP prompt" is enabled
2. **Check Function Calling** - See HF tools listed
3. **Try a search**: "Find me a BERT model"
4. **Explore**: Ask about datasets, Spaces, papers

## Support

- **HF Token Docs**: https://huggingface.co/docs/hub/en/security-tokens
- **HF MCP Docs**: https://huggingface.co/docs/hub/hf-mcp-server
- **Proxy README**: `mcp_proxy/README.md`
- **Main Setup**: `HUGGINGFACE_MCP_SETUP.md`

---

**Status**: ✅ **Working** with Access Token authentication!

**Last Updated**: 2025-10-07
