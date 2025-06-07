"""
Ed25519 OpenAI Proxy - Public-key signature authentication (40 lines)
Based on research: Using public-key signatures for stronger authentication
"""

import os
from starlette.applications import Starlette
from starlette.responses import JSONResponse, StreamingResponse
from starlette.routing import Route
import httpx
from ...utils.crypto_utils import verify_ed25519_signature

# Server's verification key (public key from trusted client) - should be set via environment variable
CLIENT_PUBLIC_KEY = os.environ.get('CLIENT_PUBLIC_KEY', 'your_client_public_key_hex')
client = httpx.AsyncClient(base_url="https://api.openai.com")

async def ed25519_authenticated_proxy(request):
    """Ed25519 authenticated proxy endpoint"""
    body = await request.body()
    timestamp = request.headers.get('X-Timestamp')
    signature = request.headers.get('X-Ed25519-Signature')
    
    # Check required headers
    if not timestamp or not signature:
        return JSONResponse({'error': 'Missing authentication headers'}, status_code=401)
    
    if CLIENT_PUBLIC_KEY == 'your_client_public_key_hex':
        return JSONResponse({'error': 'Server not configured with client public key'}, status_code=500)
    
    # Verify Ed25519 signature
    if not verify_ed25519_signature(body, timestamp, signature, CLIENT_PUBLIC_KEY):
        return JSONResponse({'error': 'Invalid signature'}, status_code=401)
        
    # Proxy to OpenAI
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
    Route("/v1/chat/completions", ed25519_authenticated_proxy, methods=["POST"])
])
