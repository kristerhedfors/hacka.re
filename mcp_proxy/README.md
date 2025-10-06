# Hugging Face MCP Proxy

CORS-enabled proxy for the Hugging Face MCP server to enable connections from hacka.re.

## Purpose

The Hugging Face MCP server at `https://huggingface.co/mcp` may not allow CORS requests from `hacka.re` during initial integration. This proxy enables testing and development until CORS is properly configured.

## Requirements

```bash
pip install starlette uvicorn httpx
```

Or if using the project's virtual environment:

```bash
source .venv/bin/activate
pip install starlette uvicorn httpx
```

## Usage

### Start the proxy

```bash
python mcp_proxy/huggingface_proxy.py
```

The proxy will start on `http://localhost:8014` and forward requests to `https://huggingface.co/mcp`.

### Test the proxy

```bash
# Health check
curl http://localhost:8014/health

# MCP endpoint
curl http://localhost:8014/mcp?login
```

## How it works

1. Receives requests from hacka.re at `http://localhost:8014/mcp`
2. Forwards them to `https://huggingface.co/mcp` with proper headers
3. Adds CORS headers to responses
4. Supports both regular HTTP and Server-Sent Events (SSE) streaming

## Integration

The Hugging Face connector in hacka.re will automatically detect CORS issues and fall back to using this proxy when needed.

## Production

Once Hugging Face adds `hacka.re` to their CORS allowed origins, this proxy will no longer be necessary and the connector will connect directly.
