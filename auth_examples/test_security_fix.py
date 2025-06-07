#!/usr/bin/env python3
"""
Security Fix Demonstration

Shows how the comprehensive integrity protection prevents tampering
with query parameters, paths, and HTTP methods.
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

def test_query_parameter_tampering():
    print("🛡️  Testing Query Parameter Tampering Prevention")
    
    secret = generate_shared_secret()
    body = b'{"action": "transfer", "amount": 100}'
    
    # Original request
    original_query = {"from_account": "123", "to_account": "456"}
    timestamp, signature = sign_request(
        body, secret, method="POST", path="/api/transfer", 
        query_params=original_query
    )
    
    # Verify original request works
    is_valid = verify_signature(
        body, timestamp, signature, secret, method="POST", 
        path="/api/transfer", query_params=original_query
    )
    print(f"   Original request: {'✅ Valid' if is_valid else '❌ Invalid'}")
    
    # Attacker tries to change account numbers
    tampered_query = {"from_account": "789", "to_account": "456"}  # Changed source account
    is_tampered_valid = verify_signature(
        body, timestamp, signature, secret, method="POST",
        path="/api/transfer", query_params=tampered_query
    )
    print(f"   Tampered query params: {'❌ Attack succeeded' if is_tampered_valid else '✅ Attack prevented'}")
    
    return is_valid and not is_tampered_valid

def test_path_tampering():
    print("\n🛡️  Testing Path Tampering Prevention")
    
    private_key, public_key = generate_ed25519_keypair()
    body = b'{"user_id": "123"}'
    
    # Original request to read user profile
    original_path = "/api/user/123/profile"
    timestamp, signature = sign_ed25519_request(
        body, private_key, method="GET", path=original_path
    )
    
    # Verify original request works
    is_valid = verify_ed25519_signature(
        body, timestamp, signature, public_key, method="GET", path=original_path
    )
    print(f"   Original path: {'✅ Valid' if is_valid else '❌ Invalid'}")
    
    # Attacker tries to change path to admin endpoint
    tampered_path = "/api/admin/delete"
    is_tampered_valid = verify_ed25519_signature(
        body, timestamp, signature, public_key, method="GET", path=tampered_path
    )
    print(f"   Tampered path: {'❌ Attack succeeded' if is_tampered_valid else '✅ Attack prevented'}")
    
    return is_valid and not is_tampered_valid

def test_method_tampering():
    print("\n🛡️  Testing HTTP Method Tampering Prevention")
    
    secret = generate_shared_secret()
    body = b'{"user_id": "123"}'
    path = "/api/user/123"
    
    # Original safe GET request
    timestamp, signature = sign_request(
        body, secret, method="GET", path=path
    )
    
    # Verify original GET request works
    is_valid = verify_signature(
        body, timestamp, signature, secret, method="GET", path=path
    )
    print(f"   Original GET method: {'✅ Valid' if is_valid else '❌ Invalid'}")
    
    # Attacker tries to change to dangerous DELETE method
    is_tampered_valid = verify_signature(
        body, timestamp, signature, secret, method="DELETE", path=path
    )
    print(f"   Tampered to DELETE: {'❌ Attack succeeded' if is_tampered_valid else '✅ Attack prevented'}")
    
    return is_valid and not is_tampered_valid

def test_header_tampering():
    print("\n🛡️  Testing Header Tampering Prevention")
    
    secret = generate_shared_secret()
    body = b'{"data": "test"}'
    path = "/api/data"
    
    # Original request with specific content type
    original_headers = {"content-type": "application/json", "authorization": "Bearer token123"}
    timestamp, signature = sign_request(
        body, secret, method="POST", path=path, headers=original_headers
    )
    
    # Verify original request works
    is_valid = verify_signature(
        body, timestamp, signature, secret, method="POST", 
        path=path, headers=original_headers
    )
    print(f"   Original headers: {'✅ Valid' if is_valid else '❌ Invalid'}")
    
    # Attacker tries to change authorization token
    tampered_headers = {"content-type": "application/json", "authorization": "Bearer hacked_token"}
    is_tampered_valid = verify_signature(
        body, timestamp, signature, secret, method="POST",
        path=path, headers=tampered_headers
    )
    print(f"   Tampered auth header: {'❌ Attack succeeded' if is_tampered_valid else '✅ Attack prevented'}")
    
    return is_valid and not is_tampered_valid

def main():
    print("🔒 SECURITY FIX DEMONSTRATION")
    print("Comprehensive Integrity Protection for API Authentication")
    print("=" * 60)
    
    print("This demonstrates how the updated authentication prevents")
    print("tampering with ANY part of the HTTP request.\n")
    
    test1 = test_query_parameter_tampering()
    test2 = test_path_tampering() 
    test3 = test_method_tampering()
    test4 = test_header_tampering()
    
    print("\n" + "=" * 60)
    if all([test1, test2, test3, test4]):
        print("✅ ALL SECURITY TESTS PASSED!")
        print("🛡️  Comprehensive integrity protection working correctly")
        print("\n🔒 VULNERABILITIES FIXED:")
        print("   ✅ Query parameter tampering prevented")
        print("   ✅ Path manipulation prevented") 
        print("   ✅ HTTP method tampering prevented")
        print("   ✅ Header manipulation prevented")
        print("\n💡 All request components are now cryptographically protected!")
        return 0
    else:
        print("❌ Some security tests failed!")
        return 1

if __name__ == '__main__':
    exit(main())