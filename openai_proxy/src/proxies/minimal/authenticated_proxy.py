"""
Authenticated OpenAI Proxy - HMAC-style crypto_auth (35 lines)
Based on research: Using libsodium's crypto_auth for HMAC-style authentication
"""

import os
from starlette.applications import Starlette
from starlette.responses import JSONResponse, StreamingResponse
from starlette.routing import Route
import httpx
from ...utils.crypto_utils import verify_signature

# Shared secret key (32 bytes) - should be set via environment variable
SHARED_SECRET = os.environ.get('PROXY_SHARED_SECRET', 'default_secret_change_me').encode()[:32].ljust(32, b'\x00')
client = httpx.AsyncClient(base_url="https://api.openai.com")

async def authenticated_proxy(request):
    """Authenticated proxy endpoint with signature verification"""
    body = await request.body()
    timestamp = request.headers.get('X-Timestamp')
    signature = request.headers.get('X-Signature')
    
    # Verify signature
    if not timestamp or not signature:
        return JSONResponse({'error': 'Missing authentication headers'}, status_code=401)
    
    if not verify_signature(body, timestamp, signature, SHARED_SECRET):
        return JSONResponse({'error': 'Invalid signature'}, status_code=401)
    
    # Forward to OpenAI
    headers = {
        'Authorization': request.headers.get('Authorization'),
        'Content-Type': 'application/json'
    }
    
    response = await client.post("/v1/chat/completions", headers=headers, content=body)
    return StreamingResponse(
        response.aiter_raw(),
        status_code=response.status_code,
        headers=response.headers
    )

app = Starlette(routes=[
    Route("/v1/chat/completions", authenticated_proxy, methods=["POST"])
])
