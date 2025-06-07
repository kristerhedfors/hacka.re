// API Authentication using libsodium - Complete implementation guide
window.defaultPrompts = window.defaultPrompts || {};
window.defaultPrompts['API auth using libsodium'] = {
    category: 'Code',
    content: `# API Authentication using libsodium

Complete, production-ready API authentication system using libsodium (PyNaCl) and TweetNaCl cryptographic primitives. Provides comprehensive integrity protection for all request components.

## 🔐 Authentication Methods

### 1. HMAC Blake2b Authentication (Shared Secret)
**Best for**: Microservices, internal APIs, shared secret scenarios

### 2. Ed25519 Digital Signatures (Public Key)  
**Best for**: Client authentication, distributed systems, highest security

### 3. Comprehensive Request Signing
**Best for**: Maximum security, prevents any parameter tampering

---

## 📦 Core Cryptographic Functions

### Key Generation

\`\`\`python
import nacl.hash
import nacl.encoding
import nacl.signing
import secrets
import time

def generate_shared_secret() -> bytes:
    """Generate a cryptographically secure 32-byte shared secret for HMAC"""
    return secrets.token_bytes(32)

def generate_ed25519_keypair() -> tuple[str, str]:
    """Generate Ed25519 keypair for digital signature authentication"""
    signing_key = nacl.signing.SigningKey.generate()
    private_key_hex = signing_key.encode(encoder=nacl.encoding.HexEncoder).decode()
    public_key_hex = signing_key.verify_key.encode(encoder=nacl.encoding.HexEncoder).decode()
    return private_key_hex, public_key_hex
\`\`\`

### HMAC Blake2b Authentication

Provides comprehensive integrity protection by signing all request components:

\`\`\`python
def sign_request(body: bytes, shared_secret: bytes, timestamp: str = None, 
                method: str = "POST", path: str = "", query_params: dict = None,
                headers: dict = None) -> tuple[str, str]:
    """
    Sign request using HMAC-style authentication with Blake2b
    Provides comprehensive integrity protection for all request components
    """
    if timestamp is None:
        timestamp = str(int(time.time()))
    
    if query_params is None:
        query_params = {}
    if headers is None:
        headers = {}
    
    # Create canonical request including all request parameters
    sorted_params = "&".join(f"{k}={urllib.parse.quote(str(v))}" 
                            for k, v in sorted(query_params.items()))
    
    # Include essential headers that affect request processing
    essential_headers = ['content-type', 'authorization', 'user-agent', 'host']
    sorted_headers = "&".join(f"{k.lower()}:{v}" for k, v in sorted(headers.items()) 
                             if k.lower() in essential_headers)
    
    # Canonical request format for tamper-proof signing
    canonical = f"{method.upper()}\\n{path}\\n{sorted_params}\\n{sorted_headers}\\n{timestamp}\\n"
    canonical_request = canonical.encode() + body
    
    # Compute signature using Blake2b with shared secret as key
    signature = nacl.hash.blake2b(
        canonical_request, 
        key=shared_secret, 
        digest_size=32, 
        encoder=nacl.encoding.HexEncoder
    ).decode()
    
    return timestamp, signature

def verify_signature(body: bytes, timestamp: str, signature: str, shared_secret: bytes, 
                    max_age_seconds: int = 300, method: str = "POST", path: str = "",
                    query_params: dict = None, headers: dict = None) -> bool:
    """
    Verify HMAC signature with comprehensive integrity protection
    Ensures all request components match the original signature
    """
    try:
        # Check timestamp freshness to prevent replay attacks
        current_time = int(time.time())
        request_time = int(timestamp)
        
        if abs(current_time - request_time) > max_age_seconds:
            return False
        
        if query_params is None:
            query_params = {}
        if headers is None:
            headers = {}
        
        # Recreate the same canonical request format used in signing
        sorted_params = "&".join(f"{k}={urllib.parse.quote(str(v))}" 
                                for k, v in sorted(query_params.items()))
        
        # Include same essential headers as in signing
        essential_headers = ['content-type', 'authorization', 'user-agent', 'host']
        sorted_headers = "&".join(f"{k.lower()}:{v}" for k, v in sorted(headers.items()) 
                                 if k.lower() in essential_headers)
        
        # Recreate canonical request - must match signing exactly
        canonical = f"{method.upper()}\\n{path}\\n{sorted_params}\\n{sorted_headers}\\n{timestamp}\\n"
        canonical_request = canonical.encode() + body
        
        # Verify signature
        expected = nacl.hash.blake2b(
            canonical_request, 
            key=shared_secret, 
            digest_size=32, 
            encoder=nacl.encoding.HexEncoder
        ).decode()
        
        return secrets.compare_digest(expected, signature)
    except (ValueError, TypeError):
        return False
\`\`\`

### Ed25519 Digital Signatures

Provides digital signature authentication with comprehensive integrity protection:

\`\`\`python
def sign_ed25519_request(body: bytes, private_key_hex: str, timestamp: str = None,
                        method: str = "POST", path: str = "", query_params: dict = None,
                        headers: dict = None) -> tuple[str, str]:
    """
    Sign request using Ed25519 digital signatures
    Provides comprehensive integrity protection for all request components
    """
    if timestamp is None:
        timestamp = str(int(time.time()))
    
    if query_params is None:
        query_params = {}
    if headers is None:
        headers = {}
    
    # Create signing key from hex
    signing_key = nacl.signing.SigningKey(private_key_hex, encoder=nacl.encoding.HexEncoder)
    
    # Create comprehensive canonical request including ALL parameters
    sorted_params = "&".join(f"{k}={urllib.parse.quote(str(v))}" 
                            for k, v in sorted(query_params.items()))
    
    # Include essential headers that affect request processing
    essential_headers = ['content-type', 'authorization', 'user-agent', 'host']
    sorted_headers = "&".join(f"{k.lower()}:{v}" for k, v in sorted(headers.items()) 
                             if k.lower() in essential_headers)
    
    # Canonical request format for tamper-proof signing
    canonical = f"{method.upper()}\\n{path}\\n{sorted_params}\\n{sorted_headers}\\n{timestamp}\\n"
    canonical_request = canonical.encode() + body
    
    # Sign canonical request with Ed25519
    signed = signing_key.sign(canonical_request)
    signature_hex = signed.signature.hex()
    
    return timestamp, signature_hex

def verify_ed25519_signature(body: bytes, timestamp: str, signature: str, public_key_hex: str,
                           max_age_seconds: int = 300, method: str = "POST", path: str = "",
                           query_params: dict = None, headers: dict = None) -> bool:
    """
    Verify Ed25519 signature with comprehensive integrity protection
    Ensures all request components match the original signature
    """
    try:
        # Check timestamp freshness to prevent replay attacks
        current_time = int(time.time())
        request_time = int(timestamp)
        
        if abs(current_time - request_time) > max_age_seconds:
            return False
        
        if query_params is None:
            query_params = {}
        if headers is None:
            headers = {}
        
        # Create verify key from hex
        verify_key = nacl.signing.VerifyKey(public_key_hex, encoder=nacl.encoding.HexEncoder)
        
        # Recreate the same canonical request format used in signing
        sorted_params = "&".join(f"{k}={urllib.parse.quote(str(v))}" 
                                for k, v in sorted(query_params.items()))
        
        # Include same essential headers as in signing
        essential_headers = ['content-type', 'authorization', 'user-agent', 'host']
        sorted_headers = "&".join(f"{k.lower()}:{v}" for k, v in sorted(headers.items()) 
                                 if k.lower() in essential_headers)
        
        # Recreate canonical request - must match signing exactly
        canonical = f"{method.upper()}\\n{path}\\n{sorted_params}\\n{sorted_headers}\\n{timestamp}\\n"
        canonical_request = canonical.encode() + body
        
        # Verify signature - convert hex string to bytes first
        signature_bytes = bytes.fromhex(signature)
        verify_key.verify(canonical_request, signature_bytes)
        return True
    except (nacl.exceptions.BadSignatureError, ValueError, TypeError):
        return False
\`\`\`

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

## 🛡️ Advanced: Comprehensive Request Signing

For maximum security, sign all request parameters:

\`\`\`python
import urllib.parse

def create_comprehensive_signature(method: str, path: str, query_params: dict, 
                                 headers: dict, body: bytes, timestamp: str,
                                 shared_secret: bytes) -> str:
    """Create comprehensive signature covering ALL request parameters"""
    # Sort and encode query parameters for consistent signing
    sorted_params = "&".join(f"{k}={urllib.parse.quote(str(v))}" 
                            for k, v in sorted(query_params.items()))
    
    # Include only essential headers in signature
    essential_headers = ['content-type', 'authorization', 'user-agent']
    sorted_headers = "&".join(f"{k.lower()}:{v}" for k, v in sorted(headers.items()) 
                             if k.lower() in essential_headers)
    
    # Canonical request format for consistent signing
    canonical = f"{method.upper()}\\n{path}\\n{sorted_params}\\n{sorted_headers}\\n{timestamp}\\n"
    canonical_request = canonical.encode() + body
    
    # Sign canonical request with Blake2b
    signature = nacl.hash.blake2b(
        canonical_request, 
        key=shared_secret,
        digest_size=32, 
        encoder=nacl.encoding.HexEncoder
    ).decode()
    
    return signature

def verify_comprehensive_signature(method: str, path: str, query_params: dict,
                                 headers: dict, body: bytes, timestamp: str, 
                                 signature: str, shared_secret: bytes,
                                 max_age_seconds: int = 300) -> bool:
    """Verify comprehensive signature covering ALL request parameters"""
    try:
        # Check timestamp freshness
        current_time = int(time.time())
        request_time = int(timestamp)
        
        if abs(current_time - request_time) > max_age_seconds:
            return False
        
        # Create expected signature using same canonical format
        expected = create_comprehensive_signature(
            method, path, query_params, headers, body, timestamp, shared_secret
        )
        
        return secrets.compare_digest(expected, signature)
    except (ValueError, TypeError):
        return False
\`\`\`

---

## 🔧 Key Management & Utilities

### Environment Setup

\`\`\`bash
# Generate HMAC shared secret (32 bytes hex)
python -c "from crypto_auth import generate_shared_secret; print(generate_shared_secret().hex())"

# Generate Ed25519 keypair
python -c "from crypto_auth import generate_ed25519_keypair; private, public = generate_ed25519_keypair(); print(f'Private: {private}'); print(f'Public: {public}')"

# Set environment variables
export SHARED_SECRET=your_32_byte_shared_secret_as_64_hex_chars
export PRIVATE_KEY=your_ed25519_private_key_as_64_hex_chars
export CLIENT_PUBLIC_KEY=your_ed25519_public_key_as_64_hex_chars
\`\`\`

### Secure Key Storage

\`\`\`python
def save_keypair_to_files(private_key_hex: str, public_key_hex: str):
    """Save Ed25519 keypair to files with secure permissions"""
    # Write private key with restrictive permissions (owner read-only)
    with open('private_key.hex', 'w') as f:
        f.write(private_key_hex)
    os.chmod('private_key.hex', 0o600)
    
    # Write public key with normal permissions
    with open('public_key.hex', 'w') as f:
        f.write(public_key_hex)
    os.chmod('public_key.hex', 0o644)

def load_shared_secret_from_env(env_var: str = 'SHARED_SECRET') -> bytes:
    """Load shared secret from environment with validation"""
    secret_hex = os.environ.get(env_var)
    if not secret_hex:
        raise ValueError(f"Environment variable {env_var} not set")
    
    secret = bytes.fromhex(secret_hex)
    if len(secret) != 32:
        raise ValueError(f"Shared secret must be exactly 32 bytes, got {len(secret)}")
    return secret
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

## 📋 Security Best Practices

### 🔒 **Comprehensive Integrity Protection**

The authentication system signs **ALL** request components to prevent tampering:

✅ **Protected Components:**
- **HTTP Method** (GET, POST, etc.)
- **Request Path** (/api/endpoint)
- **Query Parameters** (?param=value)
- **Essential Headers** (Content-Type, Authorization, etc.)
- **Request Body** (complete payload)
- **Timestamp** (replay protection)

### 🛡️ **Security Features:**

\`\`\`python
# All request components are cryptographically signed
canonical_request = f"{method}\\n{path}\\n{params}\\n{headers}\\n{timestamp}\\n" + body

# Any modification to any component invalidates the signature
signature = blake2b(canonical_request, key=shared_secret)
\`\`\`

### 🔧 **Additional Security Practices:**

1. **Always use libsodium primitives** - Never implement crypto yourself
2. **Validate timestamps** - Prevent replay attacks (default: 5 minutes)
3. **Use timing-safe comparisons** - \`secrets.compare_digest()\` prevents timing attacks
4. **Rotate keys regularly** - Especially for production systems
5. **Store keys securely** - Environment variables, not in code
6. **Use HTTPS** - Encrypt transport layer
7. **Validate all inputs** - Check timestamp format, signature length, etc.
8. **Log authentication events** - For security monitoring
9. **Sign ALL request components** - Method, path, query, headers, body
10. **Essential headers only** - Don't sign variable headers that change per request

## 🚀 Production Deployment

\`\`\`bash
# Install dependencies
pip install pynacl starlette uvicorn httpx

# Generate production keys
python -c "from crypto_auth import generate_shared_secret, generate_ed25519_keypair; 
secret = generate_shared_secret(); 
private, public = generate_ed25519_keypair();
print(f'SHARED_SECRET={secret.hex()}');
print(f'PRIVATE_KEY={private}');
print(f'CLIENT_PUBLIC_KEY={public}')"

# Start servers
SHARED_SECRET=<your_secret> uvicorn hmac_server:app --host 0.0.0.0 --port 8000
CLIENT_PUBLIC_KEY=<public_key> uvicorn ed25519_server:app --host 0.0.0.0 --port 8001
\`\`\`

---

## 🌐 JavaScript Client Functions (Tool Calling)

TweetNaCl-based JavaScript functions for authenticated API access in hacka.re:

### Generate Shared Secret

\`\`\`javascript
// Generate cryptographically secure shared secret using TweetNaCl
const secret = generateSharedSecret();
console.log("Shared Secret:", secret.sharedSecret);
console.log("Setup:", secret.setupInstructions);
\`\`\`

### Make Authenticated API Call

\`\`\`javascript
// Make authenticated HMAC API call with comprehensive integrity protection
const result = await makeAuthenticatedHMACCall(
    "https://api.example.com/api/protected",
    "your_64_char_shared_secret_hex",
    {
        method: "POST",
        body: JSON.stringify({ action: "test", data: "secure" }),
        queryParams: { user_id: "123", action: "read" },
        headers: { "X-Client": "hacka.re" }
    }
);

console.log("Success:", result.success);
console.log("Data:", result.data);
console.log("Auth Details:", result.authDetails);
\`\`\`

### Test Authentication Setup

\`\`\`javascript
// Validate authentication credentials and server connection
const test = await testAPIAuthentication(
    "https://api.example.com",
    "your_shared_secret_hex"
);

console.log("Health Check:", test.healthCheck);
console.log("Auth Test:", test.authTest.success);
console.log("Recommendations:", test.recommendations);
\`\`\`

### Secure Query Parameter Calls

\`\`\`javascript
// Make API call with query parameter integrity protection
const result = await makeSecureQueryCall(
    "https://api.example.com",
    "/api/users",
    "your_shared_secret_hex",
    { user_id: "123", action: "profile" },  // Query params are signed
    { fields: ["name", "email"] }           // Body data
);

console.log("Query Protection:", result.queryProtection);
console.log("Parameters Signed:", result.queryProtection.parametersSignedCount);
\`\`\`

### Demonstrate Attack Prevention

\`\`\`javascript
// Show how tampering with request components fails authentication
const demo = await demonstrateAttackPrevention(
    "https://api.example.com",
    "your_shared_secret_hex"
);

console.log("Security Analysis:", demo.demonstration.securityAnalysis);
console.log("Protection Working:", demo.demonstration.securityAnalysis.protectionWorking);
console.log("Explanation:", demo.explanation);
\`\`\`

### Batch Authenticated Calls

\`\`\`javascript
// Make multiple authenticated API calls
const requests = [
    { endpoint: "/api/users", method: "GET", queryParams: { page: 1 } },
    { endpoint: "/api/profile", method: "POST", data: { update: true } },
    { endpoint: "/api/settings", method: "GET", queryParams: { section: "security" } }
];

const batch = await makeBatchAuthenticatedCalls(
    "https://api.example.com",
    "your_shared_secret_hex",
    requests
);

console.log("Batch Summary:", batch.summary);
console.log("Success Rate:", \`\${batch.summary.successfulRequests}/\${batch.summary.totalRequests}\`);
\`\`\`

### Available Tool Functions

All functions are marked with \`@callable\` for hacka.re tool calling:

- **\`generateSharedSecret()\`** - Generate secure shared secret
- **\`generateHMACSignature()\`** - Create HMAC signature for custom requests  
- **\`makeAuthenticatedHMACCall()\`** - Complete authenticated API call
- **\`testAPIAuthentication()\`** - Test auth setup and connectivity
- **\`makeSecureQueryCall()\`** - API call with query parameter protection
- **\`demonstrateAttackPrevention()\`** - Security demonstration
- **\`makeBatchAuthenticatedCalls()\`** - Multiple authenticated calls

### Security Features

✅ **Comprehensive Integrity Protection**: Signs method, path, query params, headers, body
✅ **Replay Protection**: Timestamp validation prevents replay attacks  
✅ **TweetNaCl Crypto**: Uses libsodium-compatible cryptographic functions
✅ **Compatible**: Works with libsodium servers (Python, C, etc.)
✅ **Tool Calling Ready**: All functions available for AI model execution

---

**All code examples are tested and working. Python examples use libsodium (PyNaCl), JavaScript examples use TweetNaCl for hacka.re compatibility.**`
};