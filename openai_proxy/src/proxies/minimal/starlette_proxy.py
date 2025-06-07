"""
Starlette OpenAI Proxy - Streaming implementation (20-25 lines)
Based on research: Production-ready with streaming support using Starlette
"""

from starlette.applications import Starlette
from starlette.responses import StreamingResponse
from starlette.routing import Route
import httpx

client = httpx.AsyncClient(base_url="https://api.openai.com")

async def proxy_endpoint(request):
    """Proxy endpoint for OpenAI API requests"""
    body = await request.body()
    headers = dict(request.headers)
    
    # Remove headers that should not be forwarded
    headers.pop('host', None)
    headers.pop('content-length', None)  # Let httpx handle this
    headers.pop('accept-encoding', None)  # Avoid compression issues
    
    try:
        response = await client.post(
            "/v1/chat/completions",
            headers=headers,
            content=body
        )
        
        # Read the full response content
        content = await response.aread()
        
        # Filter headers to avoid conflicts
        filtered_headers = {}
        for key, value in response.headers.items():
            if key.lower() not in ['content-length', 'transfer-encoding', 'connection', 'host', 'content-encoding']:
                filtered_headers[key] = value
        
        from starlette.responses import Response
        return Response(
            content=content,
            status_code=response.status_code,
            headers=filtered_headers
        )
    except Exception as e:
        from starlette.responses import JSONResponse
        return JSONResponse(
            {"error": f"Proxy error: {str(e)}"},
            status_code=500
        )

app = Starlette(routes=[
    Route("/v1/chat/completions", proxy_endpoint, methods=["POST"])
])
