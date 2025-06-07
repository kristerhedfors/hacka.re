"""
Cryptographic Authentication Utilities

Enhanced authentication methods extracted from openai_proxy project.
Focused on production-ready authentication patterns with real cryptography.
"""

import nacl.hash
import nacl.encoding
import nacl.signing
import time
import urllib.parse
import secrets
import os
from typing import Tuple, Dict, Any, Optional


def generate_shared_secret() -> bytes:
    """Generate a cryptographically secure 32-byte shared secret for HMAC authentication"""
    return secrets.token_bytes(32)


def generate_ed25519_keypair() -> Tuple[str, str]:
    """
    Generate an Ed25519 keypair for public-key authentication
    
    Returns:
        (private_key_hex, public_key_hex) - Both keys as hex strings for easy storage
    """
    signing_key = nacl.signing.SigningKey.generate()
    private_key_hex = signing_key.encode(encoder=nacl.encoding.HexEncoder).decode()
    public_key_hex = signing_key.verify_key.encode(encoder=nacl.encoding.HexEncoder).decode()
    return private_key_hex, public_key_hex


def sign_request(body: bytes, shared_secret: bytes, timestamp: Optional[str] = None, 
                method: str = "POST", path: str = "", query_params: Optional[Dict[str, Any]] = None,
                headers: Optional[Dict[str, str]] = None) -> Tuple[str, str]:
    """
    Sign a request using HMAC-style authentication with Blake2b
    NOW WITH INTEGRITY PROTECTION FOR ALL REQUEST COMPONENTS
    
    Args:
        body: Request body as bytes
        shared_secret: 32-byte shared secret (use generate_shared_secret())
        timestamp: Optional timestamp (will generate current time if not provided)
        method: HTTP method (GET, POST, etc.) - SIGNED for integrity
        path: Request path - SIGNED for integrity  
        query_params: Query parameters dict - SIGNED for integrity
        headers: Request headers dict - SIGNED for integrity (essential headers only)
    
    Returns:
        (timestamp, signature_hex) - Use these in X-Timestamp and X-Signature headers
    """
    if timestamp is None:
        timestamp = str(int(time.time()))
    
    if query_params is None:
        query_params = {}
    if headers is None:
        headers = {}
    
    # Create comprehensive canonical request including ALL parameters
    # This prevents tampering with ANY part of the request
    sorted_params = "&".join(f"{k}={urllib.parse.quote(str(v))}" 
                            for k, v in sorted(query_params.items()))
    
    # Include essential headers that affect request processing
    essential_headers = ['content-type', 'authorization', 'user-agent', 'host']
    sorted_headers = "&".join(f"{k.lower()}:{v}" for k, v in sorted(headers.items()) 
                             if k.lower() in essential_headers)
    
    # Canonical request format for tamper-proof signing
    canonical = f"{method.upper()}\n{path}\n{sorted_params}\n{sorted_headers}\n{timestamp}\n"
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
                    query_params: Optional[Dict[str, Any]] = None, 
                    headers: Optional[Dict[str, str]] = None) -> bool:
    """
    Verify a request signature using HMAC-style authentication
    NOW WITH INTEGRITY PROTECTION FOR ALL REQUEST COMPONENTS
    
    Args:
        body: Request body as bytes
        timestamp: Timestamp from X-Timestamp header
        signature: Signature from X-Signature header
        shared_secret: 32-byte shared secret
        max_age_seconds: Maximum age of request in seconds (default: 5 minutes)
        method: HTTP method (GET, POST, etc.) - VERIFIED for integrity
        path: Request path - VERIFIED for integrity
        query_params: Query parameters dict - VERIFIED for integrity  
        headers: Request headers dict - VERIFIED for integrity (essential headers only)
    
    Returns:
        True if signature is valid and request is not expired
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
        canonical = f"{method.upper()}\n{path}\n{sorted_params}\n{sorted_headers}\n{timestamp}\n"
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


def sign_ed25519_request(body: bytes, private_key_hex: str, timestamp: Optional[str] = None,
                        method: str = "POST", path: str = "", query_params: Optional[Dict[str, Any]] = None,
                        headers: Optional[Dict[str, str]] = None) -> Tuple[str, str]:
    """
    Sign a request using Ed25519 digital signatures
    NOW WITH INTEGRITY PROTECTION FOR ALL REQUEST COMPONENTS
    
    Args:
        body: Request body as bytes
        private_key_hex: Private key as hex string (from generate_ed25519_keypair())
        timestamp: Optional timestamp (will generate current time if not provided)
        method: HTTP method (GET, POST, etc.) - SIGNED for integrity
        path: Request path - SIGNED for integrity
        query_params: Query parameters dict - SIGNED for integrity
        headers: Request headers dict - SIGNED for integrity (essential headers only)
    
    Returns:
        (timestamp, signature_hex) - Use these in X-Timestamp and X-Ed25519-Signature headers
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
    canonical = f"{method.upper()}\n{path}\n{sorted_params}\n{sorted_headers}\n{timestamp}\n"
    canonical_request = canonical.encode() + body
    
    # Sign canonical request with Ed25519
    signed = signing_key.sign(canonical_request)
    signature_hex = signed.signature.hex()
    
    return timestamp, signature_hex


def verify_ed25519_signature(body: bytes, timestamp: str, signature: str, public_key_hex: str,
                           max_age_seconds: int = 300, method: str = "POST", path: str = "",
                           query_params: Optional[Dict[str, Any]] = None,
                           headers: Optional[Dict[str, str]] = None) -> bool:
    """
    Verify an Ed25519 digital signature
    NOW WITH INTEGRITY PROTECTION FOR ALL REQUEST COMPONENTS
    
    Args:
        body: Request body as bytes
        timestamp: Timestamp from X-Timestamp header
        signature: Signature from X-Ed25519-Signature header as hex string
        public_key_hex: Public key as hex string (from generate_ed25519_keypair())
        max_age_seconds: Maximum age of request in seconds (default: 5 minutes)
        method: HTTP method (GET, POST, etc.) - VERIFIED for integrity
        path: Request path - VERIFIED for integrity
        query_params: Query parameters dict - VERIFIED for integrity
        headers: Request headers dict - VERIFIED for integrity (essential headers only)
    
    Returns:
        True if signature is valid and request is not expired
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
        canonical = f"{method.upper()}\n{path}\n{sorted_params}\n{sorted_headers}\n{timestamp}\n"
        canonical_request = canonical.encode() + body
        
        # Verify signature - convert hex string to bytes first
        signature_bytes = bytes.fromhex(signature)
        verify_key.verify(canonical_request, signature_bytes)
        return True
    except (nacl.exceptions.BadSignatureError, ValueError, TypeError):
        return False


def create_comprehensive_signature(method: str, path: str, query_params: Dict[str, Any], 
                                 headers: Dict[str, str], body: bytes, timestamp: str,
                                 shared_secret: bytes) -> str:
    """
    Create a comprehensive signature covering ALL request parameters
    Provides maximum security by signing the entire request context.
    
    Args:
        method: HTTP method (GET, POST, etc.)
        path: Request path (e.g., "/api/v1/endpoint")
        query_params: Query parameters as dict
        headers: Request headers as dict (only essential headers are signed)
        body: Request body as bytes
        timestamp: Request timestamp
        shared_secret: 32-byte shared secret
    
    Returns:
        Signature as hex string for X-Comprehensive-Signature header
    """
    # Sort and encode query parameters for consistent signing
    sorted_params = "&".join(f"{k}={urllib.parse.quote(str(v))}" 
                            for k, v in sorted(query_params.items()))
    
    # Include only essential headers in signature to prevent header manipulation
    essential_headers = ['content-type', 'authorization', 'user-agent']
    sorted_headers = "&".join(f"{k.lower()}:{v}" for k, v in sorted(headers.items()) 
                             if k.lower() in essential_headers)
    
    # Canonical request format for consistent signing
    canonical = f"{method.upper()}\n{path}\n{sorted_params}\n{sorted_headers}\n{timestamp}\n"
    canonical_request = canonical.encode() + body
    
    # Sign canonical request with Blake2b
    signature = nacl.hash.blake2b(
        canonical_request, 
        key=shared_secret,
        digest_size=32, 
        encoder=nacl.encoding.HexEncoder
    ).decode()
    
    return signature


def verify_comprehensive_signature(method: str, path: str, query_params: Dict[str, Any],
                                 headers: Dict[str, str], body: bytes, timestamp: str, 
                                 signature: str, shared_secret: bytes,
                                 max_age_seconds: int = 300) -> bool:
    """
    Verify a comprehensive signature covering ALL request parameters
    
    Args:
        method: HTTP method
        path: Request path  
        query_params: Query parameters as dict
        headers: Request headers as dict
        body: Request body as bytes
        timestamp: Request timestamp
        signature: Signature from X-Comprehensive-Signature header
        shared_secret: 32-byte shared secret
        max_age_seconds: Maximum request age in seconds
    
    Returns:
        True if signature is valid and request is not expired
    """
    try:
        # Check timestamp freshness to prevent replay attacks
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


def load_shared_secret_from_env(env_var: str = 'SHARED_SECRET') -> bytes:
    """
    Load shared secret from environment variable with validation
    
    Args:
        env_var: Environment variable name (default: 'SHARED_SECRET')
    
    Returns:
        32-byte shared secret
        
    Raises:
        ValueError: If secret is not found or invalid length
    """
    secret_hex = os.environ.get(env_var)
    if not secret_hex:
        raise ValueError(f"Environment variable {env_var} not set")
    
    try:
        secret = bytes.fromhex(secret_hex)
        if len(secret) != 32:
            raise ValueError(f"Shared secret must be exactly 32 bytes, got {len(secret)}")
        return secret
    except ValueError as e:
        raise ValueError(f"Invalid shared secret format: {e}")


def save_keypair_to_files(private_key_hex: str, public_key_hex: str, 
                         private_file: str = 'private_key.hex', 
                         public_file: str = 'public_key.hex') -> None:
    """
    Save Ed25519 keypair to files with secure permissions
    
    Args:
        private_key_hex: Private key as hex string
        public_key_hex: Public key as hex string  
        private_file: Private key file path (default: 'private_key.hex')
        public_file: Public key file path (default: 'public_key.hex')
    """
    # Write private key with restrictive permissions (owner read-only)
    with open(private_file, 'w') as f:
        f.write(private_key_hex)
    os.chmod(private_file, 0o600)
    
    # Write public key with normal permissions (readable by others)
    with open(public_file, 'w') as f:
        f.write(public_key_hex)
    os.chmod(public_file, 0o644)


def load_keypair_from_files(private_file: str = 'private_key.hex', 
                           public_file: str = 'public_key.hex') -> Tuple[str, str]:
    """
    Load Ed25519 keypair from files
    
    Args:
        private_file: Private key file path
        public_file: Public key file path
        
    Returns:
        (private_key_hex, public_key_hex)
        
    Raises:
        FileNotFoundError: If key files don't exist
        ValueError: If key format is invalid
    """
    try:
        with open(private_file, 'r') as f:
            private_key_hex = f.read().strip()
        with open(public_file, 'r') as f:
            public_key_hex = f.read().strip()
        
        # Validate key format
        if len(private_key_hex) != 64 or len(public_key_hex) != 64:
            raise ValueError("Invalid key length - keys must be 32 bytes (64 hex chars)")
        
        # Test keys are valid hex
        bytes.fromhex(private_key_hex)
        bytes.fromhex(public_key_hex)
        
        return private_key_hex, public_key_hex
    except Exception as e:
        raise ValueError(f"Failed to load keypair: {e}")