"""
Hugging Face MCP Proxy - CORS-enabled proxy for Hugging Face MCP server
Proxies requests from hacka.re to https://huggingface.co/mcp with proper CORS headers
"""

from starlette.applications import Starlette
from starlette.responses import Response, StreamingResponse
from starlette.routing import Route
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
import httpx
import uvicorn
import asyncio

# HTTP client for proxying requests
client = httpx.AsyncClient(base_url='https://huggingface.co', timeout=60.0, follow_redirects=True)

async def proxy_mcp(request):
    """Proxy MCP requests to Hugging Face"""
    if request.method == 'OPTIONS':
        return Response(status_code=204)

    # Get request data
    body = await request.body()

    # Filter headers to avoid conflicts
    headers = {k: v for k, v in request.headers.items()
               if k.lower() not in ('host', 'content-length', 'accept-encoding', 'connection')}

    # FIX: HF MCP requires Accept header to include both application/json and text/event-stream
    # Browser fetch() may override this, so we force it in the proxy
    headers['accept'] = 'application/json, text/event-stream'

    # Log incoming headers for debugging
    print(f'[HF Proxy] Incoming headers (original): {dict(request.headers.items())}')
    print(f'[HF Proxy] Outgoing headers (modified): {dict(headers)}')
    if 'mcp-session-id' in headers or 'Mcp-Session-Id' in headers:
        session_id = headers.get('mcp-session-id') or headers.get('Mcp-Session-Id')
        print(f'[HF Proxy] ✓ Session ID present in request: {session_id}')

    # Add authentication from query params if present
    query_params = dict(request.query_params)

    try:
        # Forward to Hugging Face MCP server
        url = '/mcp'
        if query_params:
            url += '?' + '&'.join(f'{k}={v}' for k, v in query_params.items())

        print(f'[HF Proxy] Forwarding to: {url}')
        print(f'[HF Proxy] Request body (truncated): {body[:200]}...' if len(body) > 200 else f'[HF Proxy] Request body: {body}')

        response = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body
        )

        print(f'[HF Proxy] Response status: {response.status_code}')
        print(f'[HF Proxy] Response headers: {dict(response.headers)}')

        # Get response content
        content = await response.aread()

        # Log response body for debugging (especially for errors)
        if response.status_code >= 400:
            try:
                print(f'[HF Proxy] Error response body: {content.decode("utf-8")[:500]}')
            except:
                print(f'[HF Proxy] Error response body (binary): {content[:200]}')

        # Filter response headers
        out_headers = {k: v for k, v in response.headers.items()
                      if k.lower() not in ('content-length', 'transfer-encoding', 'connection',
                                          'host', 'content-encoding')}

        # Check if this is SSE (Server-Sent Events)
        content_type = response.headers.get('content-type', '')
        if 'text/event-stream' in content_type:
            # Stream SSE responses
            async def stream_events():
                async for chunk in response.aiter_bytes():
                    yield chunk

            return StreamingResponse(
                stream_events(),
                status_code=response.status_code,
                headers=out_headers,
                media_type='text/event-stream'
            )

        # Regular response
        return Response(
            content=content,
            status_code=response.status_code,
            headers=out_headers
        )

    except Exception as e:
        print(f'[HF Proxy] Error: {e}')
        return Response(
            content=f'{{"error": "Proxy error: {str(e)}"}}',
            status_code=500,
            media_type='application/json'
        )

async def health(request):
    """Health check endpoint"""
    return Response(
        '{"status": "ok", "service": "huggingface-mcp-proxy"}',
        media_type='application/json'
    )

# CORS middleware - allow all origins for local development
middleware = [
    Middleware(
        CORSMiddleware,
        allow_origins=['*'],
        allow_methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allow_headers=['*'],
        expose_headers=['*']
    )
]

# Create app
app = Starlette(
    routes=[
        Route('/mcp', proxy_mcp, methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
        Route('/health', health, methods=['GET'])
    ],
    middleware=middleware
)

if __name__ == '__main__':
    print('Starting Hugging Face MCP Proxy on http://localhost:8014')
    print('Proxying to: https://huggingface.co/mcp')
    print('Health check: http://localhost:8014/health')
    uvicorn.run(app, host='0.0.0.0', port=8014)
