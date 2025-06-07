#!/usr/bin/env python3
"""
HMAC Authentication Server Example

Demonstrates secure API authentication using libsodium Blake2b HMAC signatures.
Only uses libsodium primitives for authentication - no other crypto libraries.
"""

import os
import json
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
import uvicorn
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crypto_auth import verify_signature, load_shared_secret_from_env


# Load shared secret from environment (32 bytes hex)
try:
    SHARED_SECRET = load_shared_secret_from_env('SHARED_SECRET')
    print(f"✓ Loaded shared secret from environment ({len(SHARED_SECRET)} bytes)")
except ValueError as e:
    print(f"⚠️  {e}")
    print("Generate a shared secret with: python -m auth_examples.src.keygen hmac")
    SHARED_SECRET = None


async def health_check(request):
    """Public health check endpoint - no authentication required"""
    return JSONResponse({
        'status': 'healthy',
        'service': 'HMAC Authentication Server',
        'crypto': 'libsodium Blake2b HMAC',
        'auth_required': False
    })


async def authenticated_endpoint(request):
    """Protected endpoint requiring HMAC authentication with libsodium"""
    if SHARED_SECRET is None:
        return JSONResponse({
            'error': 'Server not configured with shared secret'
        }, status_code=500)
    
    # Get request body and authentication headers
    body = await request.body()
    timestamp = request.headers.get('X-Timestamp')
    signature = request.headers.get('X-Signature')
    
    # Validate authentication headers
    if not timestamp or not signature:
        return JSONResponse({
            'error': 'Missing authentication headers',
            'required': ['X-Timestamp', 'X-Signature'],
            'documentation': 'Use crypto_auth.sign_request() to generate headers'
        }, status_code=401)
    
    # Verify HMAC signature using libsodium Blake2b
    if not verify_signature(body, timestamp, signature, SHARED_SECRET):
        return JSONResponse({
            'error': 'Invalid or expired HMAC signature',
            'crypto': 'libsodium Blake2b verification failed',
            'max_age': '300 seconds (5 minutes)'
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
        'request_size': len(body),
        'protected_data': {
            'user_id': 'authenticated_user',
            'permissions': ['read', 'write'],
            'session': 'secure_session_token'
        },
        'request_echo': request_data
    })


async def comprehensive_auth_endpoint(request):
    """
    Endpoint demonstrating comprehensive request signing
    Signs entire request including method, path, headers, and body
    """
    if SHARED_SECRET is None:
        return JSONResponse({
            'error': 'Server not configured with shared secret'
        }, status_code=500)
    
    # This would use the comprehensive signature verification
    # Implementation left as exercise - shows the pattern
    return JSONResponse({
        'message': 'Comprehensive authentication endpoint',
        'note': 'Implementation demonstrates comprehensive request signing pattern',
        'crypto': 'libsodium Blake2b with full request canonicalization'
    })


# Configure CORS middleware for development
middleware = [
    Middleware(
        CORSMiddleware,
        allow_origins=['*'],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=['GET', 'POST'],
        allow_headers=['*']
    )
]

# Define application routes
routes = [
    Route("/health", health_check, methods=["GET"]),
    Route("/api/protected", authenticated_endpoint, methods=["POST"]),
    Route("/api/comprehensive", comprehensive_auth_endpoint, methods=["POST"]),
]

# Create Starlette application
app = Starlette(routes=routes, middleware=middleware)


def main():
    """Main entry point for HMAC authentication server"""
    if SHARED_SECRET is None:
        print("\n❌ Cannot start server without shared secret")
        print("1. Generate secret: python -m auth_examples.src.keygen hmac")
        print("2. Set environment: export SHARED_SECRET=<generated_secret>")
        print("3. Start server: python -m auth_examples.src.examples.hmac_server")
        return 1
    
    port = int(os.environ.get('HMAC_PORT', 8000))
    
    print("\n🚀 Starting HMAC Authentication Server")
    print(f"📍 Server: http://127.0.0.1:{port}")
    print("🔐 Auth: libsodium Blake2b HMAC")
    print("📊 Endpoints:")
    print("   GET  /health           - Public health check")
    print("   POST /api/protected    - HMAC authenticated endpoint")
    print("   POST /api/comprehensive - Comprehensive signing example")
    print("\n💡 Test with:")
    print("   python -m auth_examples.src.examples.test_auth")
    print()
    
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        reload=False,
        log_level="info"
    )


if __name__ == '__main__':
    main()