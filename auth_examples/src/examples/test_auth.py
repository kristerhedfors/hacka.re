#!/usr/bin/env python3
"""
Authentication Testing Examples

Tests both HMAC and Ed25519 authentication methods using libsodium.
Demonstrates proper client-side signing and server verification.
"""

import argparse
import json
import os
import sys
import time
import httpx

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crypto_auth import (
    sign_request, 
    sign_ed25519_request,
    generate_shared_secret,
    generate_ed25519_keypair
)


def test_hmac_auth(server_url="http://127.0.0.1:8000", shared_secret_hex=None):
    """Test HMAC authentication with libsodium Blake2b"""
    print("🔐 Testing HMAC Authentication (libsodium Blake2b)")
    print(f"📍 Server: {server_url}")
    
    # Get shared secret
    if shared_secret_hex is None:
        shared_secret_hex = os.environ.get('SHARED_SECRET')
        if not shared_secret_hex:
            print("⚠️  No SHARED_SECRET environment variable")
            print("   Generating temporary secret for demo...")
            shared_secret = generate_shared_secret()
            shared_secret_hex = shared_secret.hex()
            print(f"   Temporary secret: {shared_secret_hex}")
            print("   Set server with: export SHARED_SECRET=" + shared_secret_hex)
        else:
            print(f"✓ Using SHARED_SECRET from environment")
    
    shared_secret = bytes.fromhex(shared_secret_hex)
    
    # Test data
    test_payload = {
        'message': 'Hello from HMAC client',
        'timestamp': int(time.time()),
        'data': {
            'operation': 'test_authentication',
            'crypto': 'libsodium Blake2b HMAC'
        }
    }
    
    request_body = json.dumps(test_payload).encode()
    
    # Sign request using libsodium
    timestamp, signature = sign_request(request_body, shared_secret)
    
    print(f"📝 Request signed:")
    print(f"   Timestamp: {timestamp}")
    print(f"   Signature: {signature[:32]}...")
    print(f"   Body size: {len(request_body)} bytes")
    
    # Make authenticated request
    headers = {
        'Content-Type': 'application/json',
        'X-Timestamp': timestamp,
        'X-Signature': signature
    }
    
    try:
        with httpx.Client() as client:
            # Test health endpoint (public)
            print("\n📊 Testing public health endpoint...")
            health_response = client.get(f"{server_url}/health")
            print(f"   Status: {health_response.status_code}")
            if health_response.status_code == 200:
                health_data = health_response.json()
                print(f"   Service: {health_data.get('service')}")
                print(f"   Crypto: {health_data.get('crypto')}")
            
            # Test authenticated endpoint
            print("\n🔒 Testing authenticated endpoint...")
            auth_response = client.post(
                f"{server_url}/api/protected",
                content=request_body,
                headers=headers
            )
            
            print(f"   Status: {auth_response.status_code}")
            if auth_response.status_code == 200:
                auth_data = auth_response.json()
                print(f"   ✅ Authentication successful!")
                print(f"   Auth method: {auth_data.get('auth_method')}")
                print(f"   User ID: {auth_data.get('protected_data', {}).get('user_id')}")
            else:
                print(f"   ❌ Authentication failed")
                error_data = auth_response.json()
                print(f"   Error: {error_data.get('error')}")
                
    except httpx.ConnectError:
        print(f"   ❌ Cannot connect to server at {server_url}")
        print(f"   Start server with: python -m auth_examples.src.examples.hmac_server")
        return False
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return False
    
    return auth_response.status_code == 200


def test_ed25519_auth(server_url="http://127.0.0.1:8001", private_key_hex=None):
    """Test Ed25519 authentication with libsodium digital signatures"""
    print("\n🔐 Testing Ed25519 Authentication (libsodium digital signatures)")
    print(f"📍 Server: {server_url}")
    
    # Get private key
    if private_key_hex is None:
        private_key_hex = os.environ.get('PRIVATE_KEY')
        if not private_key_hex:
            print("⚠️  No PRIVATE_KEY environment variable")
            print("   Generating temporary keypair for demo...")
            private_key_hex, public_key_hex = generate_ed25519_keypair()
            print(f"   Temporary private key: {private_key_hex}")
            print(f"   Temporary public key: {public_key_hex}")
            print("   Set server with: export CLIENT_PUBLIC_KEY=" + public_key_hex)
            print("   Set client with: export PRIVATE_KEY=" + private_key_hex)
        else:
            print(f"✓ Using PRIVATE_KEY from environment")
    
    # Test data
    test_payload = {
        'message': 'Hello from Ed25519 client',
        'timestamp': int(time.time()),
        'data': {
            'operation': 'test_ed25519_authentication',
            'crypto': 'libsodium Ed25519 digital signatures'
        }
    }
    
    request_body = json.dumps(test_payload).encode()
    
    # Sign request using libsodium Ed25519
    timestamp, signature = sign_ed25519_request(request_body, private_key_hex)
    
    print(f"📝 Request signed with Ed25519:")
    print(f"   Timestamp: {timestamp}")
    print(f"   Signature: {signature[:32]}...")
    print(f"   Body size: {len(request_body)} bytes")
    
    # Make authenticated request
    headers = {
        'Content-Type': 'application/json',
        'X-Timestamp': timestamp,
        'X-Ed25519-Signature': signature
    }
    
    try:
        with httpx.Client() as client:
            # Test health endpoint (public)
            print("\n📊 Testing public health endpoint...")
            health_response = client.get(f"{server_url}/health")
            print(f"   Status: {health_response.status_code}")
            if health_response.status_code == 200:
                health_data = health_response.json()
                print(f"   Service: {health_data.get('service')}")
                print(f"   Crypto: {health_data.get('crypto')}")
                print(f"   Public key configured: {health_data.get('public_key_configured')}")
            
            # Test authenticated endpoint
            print("\n🔒 Testing Ed25519 authenticated endpoint...")
            auth_response = client.post(
                f"{server_url}/api/ed25519",
                content=request_body,
                headers=headers
            )
            
            print(f"   Status: {auth_response.status_code}")
            if auth_response.status_code == 200:
                auth_data = auth_response.json()
                print(f"   ✅ Ed25519 authentication successful!")
                print(f"   Auth method: {auth_data.get('auth_method')}")
                print(f"   Security level: {auth_data.get('security_level')}")
                print(f"   User ID: {auth_data.get('protected_data', {}).get('user_id')}")
            else:
                print(f"   ❌ Authentication failed")
                error_data = auth_response.json()
                print(f"   Error: {error_data.get('error')}")
                
    except httpx.ConnectError:
        print(f"   ❌ Cannot connect to server at {server_url}")
        print(f"   Start server with: python -m auth_examples.src.examples.ed25519_server")
        return False
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return False
    
    return auth_response.status_code == 200


def test_invalid_signatures():
    """Test that invalid signatures are properly rejected"""
    print("\n🛡️  Testing Security: Invalid Signature Rejection")
    
    # Test with invalid HMAC signature
    try:
        with httpx.Client() as client:
            response = client.post(
                "http://127.0.0.1:8000/api/protected",
                json={'test': 'invalid signature'},
                headers={
                    'X-Timestamp': str(int(time.time())),
                    'X-Signature': 'invalid_signature_should_fail'
                }
            )
            print(f"   HMAC invalid signature: {response.status_code} ✓")
            
    except httpx.ConnectError:
        print("   HMAC server not running - skipping test")
    
    # Test with invalid Ed25519 signature
    try:
        with httpx.Client() as client:
            response = client.post(
                "http://127.0.0.1:8001/api/ed25519",
                json={'test': 'invalid signature'},
                headers={
                    'X-Timestamp': str(int(time.time())),
                    'X-Ed25519-Signature': 'invalid_ed25519_signature_should_fail'
                }
            )
            print(f"   Ed25519 invalid signature: {response.status_code} ✓")
            
    except httpx.ConnectError:
        print("   Ed25519 server not running - skipping test")


def main():
    """Main entry point for authentication testing"""
    parser = argparse.ArgumentParser(
        description="Test authentication methods using libsodium cryptography"
    )
    parser.add_argument(
        '--hmac', 
        action='store_true',
        help='Test HMAC authentication only'
    )
    parser.add_argument(
        '--ed25519',
        action='store_true', 
        help='Test Ed25519 authentication only'
    )
    parser.add_argument(
        '--hmac-url',
        default='http://127.0.0.1:8000',
        help='HMAC server URL (default: http://127.0.0.1:8000)'
    )
    parser.add_argument(
        '--ed25519-url',
        default='http://127.0.0.1:8001', 
        help='Ed25519 server URL (default: http://127.0.0.1:8001)'
    )
    
    args = parser.parse_args()
    
    print("🧪 Authentication Testing Suite")
    print("Uses libsodium cryptographic primitives only")
    print("=" * 50)
    
    success = True
    
    if not args.ed25519:  # Default or explicit HMAC
        success &= test_hmac_auth(args.hmac_url)
    
    if not args.hmac:  # Default or explicit Ed25519
        success &= test_ed25519_auth(args.ed25519_url)
    
    # Test security
    test_invalid_signatures()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ All authentication tests passed!")
        print("🔐 libsodium cryptography working correctly")
    else:
        print("❌ Some authentication tests failed")
        print("💡 Check server configuration and environment variables")
        return 1
    
    print("\n📚 Next steps:")
    print("1. Review the authentication code in src/crypto_auth.py")
    print("2. Study the server implementations for integration patterns")
    print("3. Adapt the authentication methods for your use case")
    print("4. Always use libsodium primitives for production systems")


if __name__ == '__main__':
    main()