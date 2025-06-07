#!/usr/bin/env python3
"""
Ed25519 Digital Signature Authentication Server

Demonstrates public-key authentication using libsodium Ed25519 digital signatures.
Only uses libsodium primitives - stronger security than shared secret HMAC.
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
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crypto_auth import verify_ed25519_signature


# Load client public key from environment (64 char hex string)
CLIENT_PUBLIC_KEY = os.environ.get('CLIENT_PUBLIC_KEY')
if CLIENT_PUBLIC_KEY:
    if len(CLIENT_PUBLIC_KEY) == 64:
        try:
            # Test that it's valid hex
            bytes.fromhex(CLIENT_PUBLIC_KEY)
            print(f"✓ Loaded client public key from environment")
        except ValueError:
            print(f"⚠️  Invalid CLIENT_PUBLIC_KEY format - must be 64 hex characters")
            CLIENT_PUBLIC_KEY = None
    else:
        print(f"⚠️  Invalid CLIENT_PUBLIC_KEY length - must be 64 hex characters, got {len(CLIENT_PUBLIC_KEY)}")
        CLIENT_PUBLIC_KEY = None
else:
    print("⚠️  CLIENT_PUBLIC_KEY not set in environment")
    print("Generate keys with: python -m auth_examples.src.keygen ed25519")


async def health_check(request):
    """Public health check endpoint - no authentication required"""
    return JSONResponse({
        'status': 'healthy',
        'service': 'Ed25519 Authentication Server',
        'crypto': 'libsodium Ed25519 digital signatures',
        'auth_required': False,
        'public_key_configured': CLIENT_PUBLIC_KEY is not None
    })


async def ed25519_authenticated_endpoint(request):
    """Protected endpoint requiring Ed25519 digital signature authentication"""
    if CLIENT_PUBLIC_KEY is None:
        return JSONResponse({
            'error': 'Server not configured with client public key',
            'setup': 'Set CLIENT_PUBLIC_KEY environment variable'
        }, status_code=500)
    
    # Get request body and authentication headers
    body = await request.body()
    timestamp = request.headers.get('X-Timestamp')
    signature = request.headers.get('X-Ed25519-Signature')
    
    # Validate authentication headers
    if not timestamp or not signature:
        return JSONResponse({
            'error': 'Missing authentication headers',
            'required': ['X-Timestamp', 'X-Ed25519-Signature'],
            'documentation': 'Use crypto_auth.sign_ed25519_request() to generate headers'
        }, status_code=401)
    
    # Extract request components for comprehensive verification
    method = request.method
    path = request.url.path
    query_params = dict(request.query_params)
    headers = dict(request.headers)
    
    # Verify Ed25519 signature using libsodium WITH INTEGRITY PROTECTION
    if not verify_ed25519_signature(body, timestamp, signature, CLIENT_PUBLIC_KEY,
                                   method=method, path=path, query_params=query_params, headers=headers):
        return JSONResponse({
            'error': 'Invalid or expired Ed25519 signature',
            'crypto': 'libsodium Ed25519 verification failed',
            'max_age': '300 seconds (5 minutes)',
            'public_key': CLIENT_PUBLIC_KEY[:16] + '...',  # Show first 16 chars for debugging
            'integrity_protection': 'All request components verified (method, path, query, headers, body)'
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
        'public_key_prefix': CLIENT_PUBLIC_KEY[:16] + '...',
        'request_size': len(body),
        'security_level': 'HIGH - public key cryptography',
        'protected_data': {
            'user_id': 'authenticated_user_ed25519',
            'permissions': ['read', 'write', 'admin'],
            'session': 'secure_ed25519_session',
            'key_type': 'Ed25519'
        },
        'request_echo': request_data
    })


async def multi_client_endpoint(request):
    """
    Endpoint demonstrating multi-client authentication
    In production, you'd maintain a database of client public keys
    """
    # This demonstrates the pattern for multiple authorized clients
    authorized_keys = {
        'client_1': CLIENT_PUBLIC_KEY,  # Main client
        # 'client_2': 'another_public_key_hex...',
        # 'client_3': 'yet_another_public_key_hex...',
    }
    
    # Implementation would iterate through authorized keys
    # Until one verifies successfully
    return JSONResponse({
        'message': 'Multi-client authentication endpoint',
        'note': 'Demonstrates pattern for multiple authorized Ed25519 clients',
        'crypto': 'libsodium Ed25519 with client key registry',
        'authorized_clients': len(authorized_keys)
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
    Route("/api/ed25519", ed25519_authenticated_endpoint, methods=["POST"]),
    Route("/api/multi-client", multi_client_endpoint, methods=["POST"]),
]

# Create Starlette application
app = Starlette(routes=routes, middleware=middleware)


def main():
    """Main entry point for Ed25519 authentication server"""
    if CLIENT_PUBLIC_KEY is None:
        print("\n❌ Cannot start server without client public key")
        print("1. Generate keypair: python -m auth_examples.src.keygen ed25519")
        print("2. Set environment: export CLIENT_PUBLIC_KEY=<public_key_from_step_1>")
        print("3. Start server: python -m auth_examples.src.examples.ed25519_server")
        print("\nNote: Client needs the private key to sign requests")
        return 1
    
    port = int(os.environ.get('ED25519_PORT', 8001))
    
    print("\n🚀 Starting Ed25519 Authentication Server")
    print(f"📍 Server: http://127.0.0.1:{port}")
    print("🔐 Auth: libsodium Ed25519 digital signatures")
    print("🔑 Client Public Key: " + CLIENT_PUBLIC_KEY[:16] + "...")
    print("📊 Endpoints:")
    print("   GET  /health           - Public health check")
    print("   POST /api/ed25519      - Ed25519 authenticated endpoint")
    print("   POST /api/multi-client - Multi-client pattern example")
    print("\n💡 Test with:")
    print("   python -m auth_examples.src.examples.test_auth --ed25519")
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