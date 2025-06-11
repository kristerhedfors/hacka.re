// API Authentication using libsodium - Server and Client Examples
window.defaultPrompts = window.defaultPrompts || {};
window.defaultPrompts['API auth using libsodium - Examples'] = {
    category: 'Code',
    content: `# API Authentication using libsodium - Server & Client Examples

Complete server and client implementation examples using libsodium (PyNaCl) authentication with comprehensive integrity protection.

---

## 🖥️ Server Implementation Examples

### HMAC Authentication Server (Starlette)

\`\`\`python
import os
import json
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
import uvicorn

# Load shared secret from environment (32 bytes hex)
SHARED_SECRET = bytes.fromhex(os.environ.get('SHARED_SECRET', ''))

async def health_check(request):
    """Public health check endpoint"""
    return JSONResponse({
        'status': 'healthy',
        'service': 'HMAC Authentication Server',
        'crypto': 'libsodium Blake2b HMAC',
        'auth_required': False
    })

async def authenticated_endpoint(request):
    """Protected endpoint requiring HMAC authentication"""
    # Get request body and authentication headers
    body = await request.body()
    timestamp = request.headers.get('X-Timestamp')
    signature = request.headers.get('X-Signature')
    
    # Validate authentication headers
    if not timestamp or not signature:
        return JSONResponse({
            'error': 'Missing authentication headers',
            'required': ['X-Timestamp', 'X-Signature']
        }, status_code=401)
    
    # Extract request components for comprehensive verification
    method = request.method
    path = request.url.path
    query_params = dict(request.query_params)
    headers = dict(request.headers)
    
    # Verify HMAC signature using libsodium Blake2b WITH INTEGRITY PROTECTION
    if not verify_signature(body, timestamp, signature, SHARED_SECRET, 
                           method=method, path=path, query_params=query_params, headers=headers):
        return JSONResponse({
            'error': 'Invalid or expired HMAC signature',
            'crypto': 'libsodium Blake2b verification failed',
            'integrity_protection': 'All request components verified (method, path, query, headers, body)'
        }, status_code=401)
    
    # Parse request body if JSON
    try:
        request_data = json.loads(body) if body else {}
    except json.JSONDecodeError:
        request_data = {'raw_body': body.decode('utf-8', errors='ignore')}
    
    # Successful authentication - return protected data
    return JSONResponse({
        'message': 'Authentication successful',
        'auth_method': 'HMAC Blake2b (libsodium)',
        'timestamp': timestamp,
        'protected_data': {
            'user_id': 'authenticated_user',
            'permissions': ['read', 'write'],
            'session': 'secure_session_token'
        },
        'request_echo': request_data
    })

# Configure CORS middleware
middleware = [
    Middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True,
               allow_methods=['GET', 'POST'], allow_headers=['*'])
]

# Define application routes
routes = [
    Route("/health", health_check, methods=["GET"]),
    Route("/api/protected", authenticated_endpoint, methods=["POST"]),
]

# Create Starlette application
app = Starlette(routes=routes, middleware=middleware)

if __name__ == '__main__':
    uvicorn.run(app, host="127.0.0.1", port=8000)
\`\`\`

### Ed25519 Authentication Server

\`\`\`python
import os
import json
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route
import uvicorn

# Load client public key from environment (64 char hex string)
CLIENT_PUBLIC_KEY = os.environ.get('CLIENT_PUBLIC_KEY')

async def health_check(request):
    """Public health check endpoint"""
    return JSONResponse({
        'status': 'healthy',
        'service': 'Ed25519 Authentication Server',
        'crypto': 'libsodium Ed25519 digital signatures',
        'public_key_configured': CLIENT_PUBLIC_KEY is not None
    })

async def ed25519_authenticated_endpoint(request):
    """Protected endpoint requiring Ed25519 digital signature authentication"""
    if CLIENT_PUBLIC_KEY is None:
        return JSONResponse({
            'error': 'Server not configured with client public key'
        }, status_code=500)
    
    # Get request body and authentication headers
    body = await request.body()
    timestamp = request.headers.get('X-Timestamp')
    signature = request.headers.get('X-Ed25519-Signature')
    
    # Validate authentication headers
    if not timestamp or not signature:
        return JSONResponse({
            'error': 'Missing authentication headers',
            'required': ['X-Timestamp', 'X-Ed25519-Signature']
        }, status_code=401)
    
    # Verify Ed25519 signature using libsodium
    if not verify_ed25519_signature(body, timestamp, signature, CLIENT_PUBLIC_KEY):
        return JSONResponse({
            'error': 'Invalid or expired Ed25519 signature',
            'crypto': 'libsodium Ed25519 verification failed'
        }, status_code=401)
    
    # Parse request body if JSON
    try:
        request_data = json.loads(body) if body else {}
    except json.JSONDecodeError:
        request_data = {'raw_body': body.decode('utf-8', errors='ignore')}
    
    # Successful authentication - return protected data
    return JSONResponse({
        'message': 'Ed25519 authentication successful',
        'auth_method': 'Ed25519 digital signatures (libsodium)',
        'timestamp': timestamp,
        'security_level': 'HIGH - public key cryptography',
        'protected_data': {
            'user_id': 'authenticated_user_ed25519',
            'permissions': ['read', 'write', 'admin'],
            'session': 'secure_ed25519_session'
        },
        'request_echo': request_data
    })

routes = [
    Route("/health", health_check, methods=["GET"]),
    Route("/api/ed25519", ed25519_authenticated_endpoint, methods=["POST"]),
]

app = Starlette(routes=routes)

if __name__ == '__main__':
    uvicorn.run(app, host="127.0.0.1", port=8001)
\`\`\`

---

## 👤 Client Implementation Examples

### HMAC Client

\`\`\`python
import json
import httpx
from crypto_auth import sign_request, generate_shared_secret

def test_hmac_auth(server_url="http://127.0.0.1:8000", shared_secret_hex=None):
    """Test HMAC authentication client with comprehensive integrity protection"""
    # Use provided secret or generate for demo
    if shared_secret_hex is None:
        shared_secret = generate_shared_secret()
        shared_secret_hex = shared_secret.hex()
    else:
        shared_secret = bytes.fromhex(shared_secret_hex)
    
    # Test data
    test_payload = {
        'message': 'Hello from HMAC client',
        'data': {'operation': 'test_authentication'}
    }
    request_body = json.dumps(test_payload).encode()
    
    # Extract ALL request components for comprehensive signing
    method = "POST"
    path = "/api/protected"
    query_params = {}  # Include any query parameters
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'auth-examples-client/1.0'
    }
    
    # Sign request using libsodium with comprehensive integrity protection
    timestamp, signature = sign_request(request_body, shared_secret, 
                                       method=method, path=path, 
                                       query_params=query_params, headers=headers)
    
    # Make authenticated request (add auth headers to existing headers)
    request_headers = headers.copy()
    request_headers.update({
        'X-Timestamp': timestamp,
        'X-Signature': signature
    })
    
    with httpx.Client() as client:
        # Test health endpoint (public)
        health_response = client.get(f"{server_url}/health")
        print(f"Health check: {health_response.status_code}")
        
        # Test authenticated endpoint
        auth_response = client.post(
            f"{server_url}/api/protected",
            content=request_body,
            headers=headers
        )
        
        print(f"Auth status: {auth_response.status_code}")
        if auth_response.status_code == 200:
            print("✅ HMAC authentication successful!")
            return True
        else:
            print("❌ HMAC authentication failed")
            return False
\`\`\`

### Ed25519 Client

\`\`\`python
import json
import httpx
from crypto_auth import sign_ed25519_request, generate_ed25519_keypair

def test_ed25519_auth(server_url="http://127.0.0.1:8001", private_key_hex=None):
    """Test Ed25519 authentication client"""
    # Use provided key or generate for demo
    if private_key_hex is None:
        private_key_hex, public_key_hex = generate_ed25519_keypair()
        print(f"Generated keypair - public key: {public_key_hex}")
    
    # Test data
    test_payload = {
        'message': 'Hello from Ed25519 client',
        'data': {'operation': 'test_ed25519_authentication'}
    }
    request_body = json.dumps(test_payload).encode()
    
    # Sign request using libsodium Ed25519
    timestamp, signature = sign_ed25519_request(request_body, private_key_hex)
    
    # Make authenticated request
    headers = {
        'Content-Type': 'application/json',
        'X-Timestamp': timestamp,
        'X-Ed25519-Signature': signature
    }
    
    with httpx.Client() as client:
        # Test health endpoint (public)
        health_response = client.get(f"{server_url}/health")
        print(f"Health check: {health_response.status_code}")
        
        # Test authenticated endpoint
        auth_response = client.post(
            f"{server_url}/api/ed25519",
            content=request_body,
            headers=headers
        )
        
        print(f"Auth status: {auth_response.status_code}")
        if auth_response.status_code == 200:
            print("✅ Ed25519 authentication successful!")
            return True
        else:
            print("❌ Ed25519 authentication failed")
            return False
\`\`\`

---

## 🧪 Testing & Validation

### Unit Tests

\`\`\`python
def test_hmac_authentication():
    """Test HMAC authentication flow"""
    shared_secret = generate_shared_secret()
    body = b'{"test": "message"}'
    
    # Sign request
    timestamp, signature = sign_request(body, shared_secret)
    
    # Verify signature
    is_valid = verify_signature(body, timestamp, signature, shared_secret)
    assert is_valid, "HMAC signature verification failed"
    
    # Test with wrong secret
    wrong_secret = generate_shared_secret()
    is_invalid = verify_signature(body, timestamp, signature, wrong_secret)
    assert not is_invalid, "HMAC should fail with wrong secret"

def test_ed25519_authentication():
    """Test Ed25519 authentication flow"""
    private_key, public_key = generate_ed25519_keypair()
    body = b'{"test": "message"}'
    
    # Sign request
    timestamp, signature = sign_ed25519_request(body, private_key)
    
    # Verify signature
    is_valid = verify_ed25519_signature(body, timestamp, signature, public_key)
    assert is_valid, "Ed25519 signature verification failed"
    
    # Test with wrong key
    _, wrong_public_key = generate_ed25519_keypair()
    is_invalid = verify_ed25519_signature(body, timestamp, signature, wrong_public_key)
    assert not is_invalid, "Ed25519 should fail with wrong public key"
\`\`\`

---

**Production-ready server and client examples with comprehensive integrity protection using libsodium cryptographic primitives.**`
};