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
    
    # Remove host header to avoid conflicts
    headers.pop('host', None)
    
    response = await client.post(
        "/v1/chat/completions",
        headers=headers,
        content=body
    )
    
    return StreamingResponse(
        response.aiter_raw(),
        status_code=response.status_code,
        headers=response.headers
    )

app = Starlette(routes=[
    Route("/v1/chat/completions", proxy_endpoint, methods=["POST"])
])
