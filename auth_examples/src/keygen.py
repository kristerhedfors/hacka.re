#!/usr/bin/env python3
"""
Key Generation Utility for Authentication Examples

Generates cryptographic keys using libsodium (PyNaCl) for authentication systems.
Only uses libsodium primitives for maximum security and compatibility.
"""

import argparse
import sys
from .crypto_auth import (
    generate_shared_secret, 
    generate_ed25519_keypair,
    save_keypair_to_files
)


def generate_hmac_secret():
    """Generate a shared secret for HMAC authentication"""
    secret = generate_shared_secret()
    secret_hex = secret.hex()
    
    print("=== HMAC Shared Secret (libsodium Blake2b) ===")
    print(f"Shared Secret (hex): {secret_hex}")
    print()
    print("Usage:")
    print(f"export SHARED_SECRET={secret_hex}")
    print("# Store this secret securely - both client and server need it")
    print()
    print("Client Example:")
    print("from crypto_auth import sign_request")
    print("timestamp, signature = sign_request(request_body, bytes.fromhex(secret_hex))")
    print()
    return secret_hex


def generate_ed25519_keys(save_to_files=False):
    """Generate Ed25519 keypair for digital signature authentication"""
    private_key_hex, public_key_hex = generate_ed25519_keypair()
    
    print("=== Ed25519 Keypair (libsodium crypto_sign) ===")
    print(f"Private Key (hex): {private_key_hex}")
    print(f"Public Key (hex):  {public_key_hex}")
    print()
    print("Usage:")
    print(f"export PRIVATE_KEY={private_key_hex}")
    print(f"export CLIENT_PUBLIC_KEY={public_key_hex}")
    print()
    print("Client Example:")
    print("from crypto_auth import sign_ed25519_request")
    print("timestamp, signature = sign_ed25519_request(request_body, private_key_hex)")
    print()
    print("Server Example:")
    print("from crypto_auth import verify_ed25519_signature")
    print("is_valid = verify_ed25519_signature(body, timestamp, signature, public_key_hex)")
    print()
    
    if save_to_files:
        save_keypair_to_files(private_key_hex, public_key_hex)
        print("Keys saved to:")
        print("- private_key.hex (mode 600 - owner read only)")
        print("- public_key.hex (mode 644 - readable)")
        print()
    
    return private_key_hex, public_key_hex


def main():
    """Main entry point for key generation utility"""
    parser = argparse.ArgumentParser(
        description="Generate cryptographic keys for authentication using libsodium",
        epilog="All cryptographic operations use libsodium (PyNaCl) for maximum security"
    )
    parser.add_argument(
        'type', 
        choices=['hmac', 'ed25519', 'both'],
        help='Type of keys to generate'
    )
    parser.add_argument(
        '--save', 
        action='store_true',
        help='Save Ed25519 keys to files (private_key.hex, public_key.hex)'
    )
    parser.add_argument(
        '--quiet', '-q',
        action='store_true', 
        help='Only output key values without explanations'
    )
    
    args = parser.parse_args()
    
    if not args.quiet:
        print("Authentication Key Generator")
        print("Uses libsodium (PyNaCl) cryptographic primitives only")
        print("=" * 50)
        print()
    
    if args.type == 'hmac':
        secret_hex = generate_hmac_secret()
        if args.quiet:
            print(secret_hex)
            
    elif args.type == 'ed25519':
        private_key, public_key = generate_ed25519_keys(save_to_files=args.save)
        if args.quiet:
            print(f"{private_key},{public_key}")
            
    elif args.type == 'both':
        secret_hex = generate_hmac_secret()
        private_key, public_key = generate_ed25519_keys(save_to_files=args.save)
        if args.quiet:
            print(f"HMAC:{secret_hex}")
            print(f"Ed25519:{private_key},{public_key}")
    
    if not args.quiet:
        print("Security Notes:")
        print("- Store private keys and shared secrets securely")
        print("- Use environment variables for production deployment")
        print("- Rotate keys regularly for maximum security")
        print("- Only share public keys, never private keys or shared secrets")


if __name__ == '__main__':
    main()