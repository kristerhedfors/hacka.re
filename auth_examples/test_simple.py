#!/usr/bin/env python3
"""
Simple authentication test without servers
Tests the crypto functions directly
"""

import sys
import os
sys.path.append('src')

from crypto_auth import (
    generate_shared_secret,
    generate_ed25519_keypair,
    sign_request,
    verify_signature,
    sign_ed25519_request,
    verify_ed25519_signature
)

def test_hmac():
    print("🔐 Testing HMAC Authentication (libsodium Blake2b)")
    
    secret = generate_shared_secret()
    body = b'{"test": "message"}'
    
    timestamp, signature = sign_request(body, secret)
    is_valid = verify_signature(body, timestamp, signature, secret)
    
    print(f"   Secret: {secret.hex()[:16]}...")
    print(f"   Timestamp: {timestamp}")
    print(f"   Signature: {signature[:16]}...")
    print(f"   Valid: {'✅' if is_valid else '❌'}")
    
    return is_valid

def test_ed25519():
    print("\n🔐 Testing Ed25519 Authentication (libsodium digital signatures)")
    
    private_key, public_key = generate_ed25519_keypair()
    body = b'{"test": "message"}'
    
    timestamp, signature = sign_ed25519_request(body, private_key)
    is_valid = verify_ed25519_signature(body, timestamp, signature, public_key)
    
    print(f"   Private key: {private_key[:16]}...")
    print(f"   Public key: {public_key[:16]}...")
    print(f"   Timestamp: {timestamp}")
    print(f"   Signature: {signature[:16]}...")
    print(f"   Valid: {'✅' if is_valid else '❌'}")
    
    return is_valid

def main():
    print("🧪 Simple Authentication Test")
    print("Uses libsodium cryptographic primitives only")
    print("=" * 50)
    
    hmac_success = test_hmac()
    ed25519_success = test_ed25519()
    
    print("\n" + "=" * 50)
    if hmac_success and ed25519_success:
        print("✅ All authentication methods working!")
        print("🔐 libsodium cryptography verified")
        return 0
    else:
        print("❌ Some authentication methods failed")
        return 1

if __name__ == '__main__':
    exit(main())