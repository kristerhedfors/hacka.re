/**
 * OpenAI Proxies Python Default Prompt
 * Complete guide and examples for Python proxy implementations
 */

window.OpenAIProxiesPythonPrompt = {
    id: 'openai-proxies-python',
    name: 'OpenAI Proxy - Python',
    content: `OpenAI Proxies - Python

Three minimal Python proxy implementations that forward requests to OpenAI's API.

Implementations:
- Minimal CORS Proxy (one-liner with CORS support)
- Starlette (async, 25 lines)
- Flask (sync, 25 lines)

Minimal CORS Proxy

One-line setup with full CORS support for browser compatibility.

\`\`\`bash
# Create and run minimal OpenAI proxy with CORS support
bash -c "cat > /tmp/proxy.py <<'EOF'
from starlette.applications import Starlette
from starlette.routing import Route
from starlette.responses import Response
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
import httpx
import uvicorn

# Create HTTP client for OpenAI API
client = httpx.AsyncClient(base_url='https://api.openai.com', timeout=60.0)

async def proxy_chat_completions(request):
    try:
        # Get request body and headers
        body = await request.body()
        
        # Filter headers (remove problematic ones)
        headers = {k: v for k, v in request.headers.items()
                  if k.lower() not in ('host', 'content-length', 'accept-encoding', 'connection')}
        
        # Make request to OpenAI API
        response = await client.post('/v1/chat/completions',
                                   headers=headers, 
                                   content=body)
        
        # Get response data
        data = await response.aread()
        
        # Filter response headers
        response_headers = {k: v for k, v in response.headers.items()
                          if k.lower() not in ('content-length', 'transfer-encoding', 
                                             'connection', 'host', 'content-encoding')}
        
        return Response(data, 
                       status_code=response.status_code, 
                       headers=response_headers)
        
    except httpx.TimeoutException:
        return Response('{"error": {"message": "Request timeout", "type": "timeout_error"}}',
                       status_code=408,
                       headers={'Content-Type': 'application/json'})
    except Exception as e:
        return Response(f'{{"error": {{"message": "Proxy error: {str(e)}", "type": "proxy_error"}}}}',
                       status_code=500,
                       headers={'Content-Type': 'application/json'})

async def proxy_models(request):
    try:
        # Filter headers (remove problematic ones)
        headers = {k: v for k, v in request.headers.items()
                  if k.lower() not in ('host', 'content-length', 'accept-encoding', 'connection')}
        
        # Make request to OpenAI API
        response = await client.get('/v1/models', headers=headers)
        
        # Get response data
        data = await response.aread()
        
        # Filter response headers
        response_headers = {k: v for k, v in response.headers.items()
                          if k.lower() not in ('content-length', 'transfer-encoding', 
                                             'connection', 'host', 'content-encoding')}
        
        return Response(data, 
                       status_code=response.status_code, 
                       headers=response_headers)
        
    except Exception as e:
        return Response(f'{{"error": {{"message": "Models proxy error: {str(e)}", "type": "proxy_error"}}}}',
                       status_code=500,
                       headers={'Content-Type': 'application/json'})

async def health_check(request):
    return Response('{"status": "healthy", "service": "openai-proxy"}',
                   headers={'Content-Type': 'application/json'})

# Configure CORS middleware for browser compatibility
middleware = [
    Middleware(CORSMiddleware,
              allow_origins=['*'],           # Allow all origins in development
              allow_credentials=True,        # Allow credentials
              allow_methods=['GET', 'POST', 'OPTIONS'],  # Allow common methods
              allow_headers=['*'],           # Allow all headers
              expose_headers=['*'])          # Expose all headers
]

# Define routes
routes = [
    Route('/v1/chat/completions', proxy_chat_completions, methods=['POST', 'OPTIONS']),
    Route('/v1/models', proxy_models, methods=['GET', 'OPTIONS']),
    Route('/health', health_check, methods=['GET']),
]

# Create Starlette application
app = Starlette(routes=routes, middleware=middleware)

if __name__ == '__main__':
    print('Starting OpenAI Proxy Server...')
    print('Proxying: https://api.openai.com -> http://localhost:8000')
    print('CORS: Enabled for all origins')
    print('Usage: Set base URL to http://localhost:8000 in your client')
    uvicorn.run(app, host='0.0.0.0', port=8000)
EOF

python /tmp/proxy.py"
\`\`\`

Features:
- Full CORS Support - Works with browser requests from any origin
- Error Handling - Proper timeout and exception handling
- Health Check - /health endpoint for monitoring
- Header Filtering - Removes problematic headers automatically
- Production Ready - Includes security considerations

Usage in hacka.re:
1. Run the one-liner command above
2. Set Base URL to: http://localhost:8000
3. Add your OpenAI API key
4. Use any OpenAI model (gpt-4, gpt-3.5-turbo, etc.)

Starlette Proxy

Async implementation using httpx.

\`\`\`python
# src/proxies/minimal/starlette_proxy.py
from starlette.applications import Starlette
from starlette.responses import StreamingResponse
from starlette.routing import Route
import httpx

client = httpx.AsyncClient(base_url="https://api.openai.com")

async def proxy_endpoint(request):
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
\`\`\`

Run: uvicorn src.proxies.minimal.starlette_proxy:app --host 127.0.0.1 --port 8000

Flask Proxy

Sync implementation using requests.

\`\`\`python
# src/proxies/minimal/flask_proxy.py
from flask import Flask, request, Response
import requests

app = Flask(__name__)

@app.route('/v1/chat/completions', methods=['POST'])
def proxy_chat_completions():
    # Get request data
    data = request.get_data()
    headers = dict(request.headers)
    
    # Remove host header to avoid conflicts
    headers.pop('Host', None)
    
    # Forward request to OpenAI
    response = requests.post(
        'https://api.openai.com/v1/chat/completions',
        data=data,
        headers=headers,
        stream=True
    )
    
    # Return streaming response
    return Response(
        response.iter_content(chunk_size=1024),
        status=response.status_code,
        headers=dict(response.headers)
    )

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
\`\`\`

Run: python src/proxies/minimal/flask_proxy.py

Usage

HTTP Request Example:

\`\`\`python
import requests
import json

response = requests.post(
    "http://localhost:8000/v1/chat/completions",
    json={
        "model": "gpt-5-nano",
        "messages": [{"role": "user", "content": "Hello"}],
        "max_tokens": 50
    },
    headers={
        'Authorization': 'Bearer your_openai_api_key',
        'Content-Type': 'application/json'
    }
)
\`\`\`

OpenAI Client Example:

\`\`\`python
from openai import OpenAI

client = OpenAI(
    api_key="your_openai_api_key",
    base_url="http://localhost:8000/v1"
)

response = client.chat.completions.create(
    model="gpt-5-nano",
    messages=[{"role": "user", "content": "Hello"}],
    max_tokens=50
)
\`\`\`

Installation

\`\`\`bash
pip install starlette uvicorn flask httpx requests
\`\`\`

Dependencies: starlette, uvicorn, flask, httpx, requests`
};