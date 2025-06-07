"""
Cryptographic utilities using PyNaCl (libsodium Python bindings)
"""

import nacl.secret
import nacl.hash
import nacl.encoding
import nacl.signing
import nacl.utils
import time
import urllib.parse
from typing import Tuple, Dict, Any, Optional

def generate_shared_secret() -> bytes:
    """Generate a random 32-byte shared secret for HMAC-style authentication"""
    return nacl.utils.random(32)

def generate_ed25519_keypair() -> Tuple[str, str]:
    """
    Generate an Ed25519 keypair for public-key authentication
    Returns: (private_key_hex, public_key_hex)
    """
    signing_key = nacl.signing.SigningKey.generate()
    private_key_hex = signing_key.encode(encoder=nacl.encoding.HexEncoder).decode()
    public_key_hex = signing_key.verify_key.encode(encoder=nacl.encoding.HexEncoder).decode()
    return private_key_hex, public_key_hex

def sign_request(body: bytes, shared_secret: bytes, timestamp: Optional[str] = None) -> Tuple[str, str]:
    """
    Sign a request using HMAC-style authentication with Blake2b
    
    Args:
        body: Request body as bytes
        shared_secret: 32-byte shared secret
        timestamp: Optional timestamp (will generate if not provided)
    
    Returns:
        (timestamp, signature_hex)
    """
    if timestamp is None:
        timestamp = str(int(time.time()))
    
    # Create message: timestamp + body
    message = f"{timestamp}:".encode() + body
    
    # Compute signature using Blake2b with shared secret as key
    signature = nacl.hash.blake2b(
        message, 
        key=shared_secret, 
        digest_size=32, 
        encoder=nacl.encoding.HexEncoder
    ).decode()
    
    return timestamp, signature

def verify_signature(body: bytes, timestamp: str, signature: str, shared_secret: bytes, 
                    max_age_seconds: int = 300) -> bool:
    """
    Verify a request signature using HMAC-style authentication
    
    Args:
        body: Request body as bytes
        timestamp: Timestamp from request
        signature: Signature from request
        shared_secret: 32-byte shared secret
        max_age_seconds: Maximum age of request in seconds (default: 5 minutes)
    
    Returns:
        True if signature is valid and not expired
    """
    try:
        # Check timestamp freshness (prevent replay attacks)
        current_time = int(time.time())
        request_time = int(timestamp)
        
        if abs(current_time - request_time) > max_age_seconds:
            return False
        
        # Verify signature
        message = f"{timestamp}:".encode() + body
        expected = nacl.hash.blake2b(
            message, 
            key=shared_secret, 
            digest_size=32, 
            encoder=nacl.encoding.HexEncoder
        ).decode()
        
        return expected == signature
    except (ValueError, TypeError):
        return False

def sign_ed25519_request(body: bytes, private_key_hex: str, timestamp: Optional[str] = None) -> Tuple[str, str]:
    """
    Sign a request using Ed25519 signatures
    
    Args:
        body: Request body as bytes
        private_key_hex: Private key as hex string
        timestamp: Optional timestamp (will generate if not provided)
    
    Returns:
        (timestamp, signature_hex)
    """
    if timestamp is None:
        timestamp = str(int(time.time()))
    
    # Create signing key from hex
    signing_key = nacl.signing.SigningKey(private_key_hex, encoder=nacl.encoding.HexEncoder)
    
    # Create message: timestamp + body
    message = f"{timestamp}:".encode() + body
    
    # Sign message
    signed = signing_key.sign(message)
    signature_hex = signed.signature.hex()
    
    return timestamp, signature_hex

def verify_ed25519_signature(body: bytes, timestamp: str, signature: str, public_key_hex: str,
                           max_age_seconds: int = 300) -> bool:
    """
    Verify an Ed25519 signature
    
    Args:
        body: Request body as bytes
        timestamp: Timestamp from request
        signature: Signature from request as hex string
        public_key_hex: Public key as hex string
        max_age_seconds: Maximum age of request in seconds (default: 5 minutes)
    
    Returns:
        True if signature is valid and not expired
    """
    try:
        # Check timestamp freshness
        current_time = int(time.time())
        request_time = int(timestamp)
        
        if abs(current_time - request_time) > max_age_seconds:
            return False
        
        # Create verify key from hex
        verify_key = nacl.signing.VerifyKey(public_key_hex, encoder=nacl.encoding.HexEncoder)
        
        # Create message: timestamp + body
        message = f"{timestamp}:".encode() + body
        
        # Verify signature
        verify_key.verify(message, signature, encoder=nacl.encoding.HexEncoder)
        return True
    except (nacl.exceptions.BadSignatureError, ValueError, TypeError):
        return False

def create_comprehensive_signature(method: str, path: str, query_params: Dict[str, Any], 
                                 headers: Dict[str, str], body: bytes, timestamp: str,
                                 shared_secret: bytes) -> str:
    """
    Create a comprehensive signature covering ALL request parameters
    
    Args:
        method: HTTP method (GET, POST, etc.)
        path: Request path
        query_params: Query parameters as dict
        headers: Request headers as dict
        body: Request body as bytes
        timestamp: Request timestamp
        shared_secret: 32-byte shared secret
    
    Returns:
        Signature as hex string
    """
    # Sort and encode query parameters
    sorted_params = "&".join(f"{k}={urllib.parse.quote(str(v))}" 
                            for k, v in sorted(query_params.items()))
    
    # Include essential headers in signature
    essential_headers = ['content-type', 'authorization']
    sorted_headers = "&".join(f"{k}:{v}" for k, v in sorted(headers.items()) 
                             if k.lower() in essential_headers)
    
    # Canonical format: METHOD\nPATH\nQUERY\nHEADERS\nTIMESTAMP\nBODY
    canonical = f"{method}\n{path}\n{sorted_params}\n{sorted_headers}\n{timestamp}\n"
    canonical_request = canonical.encode() + body
    
    # Sign canonical request
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
    
    Returns:
        True if signature is valid and not expired
    """
    try:
        # Check timestamp freshness
        current_time = int(time.time())
        request_time = int(timestamp)
        
        if abs(current_time - request_time) > max_age_seconds:
            return False
        
        # Create expected signature
        expected = create_comprehensive_signature(
            method, path, query_params, headers, body, timestamp, shared_secret
        )
        
        return expected == signature
    except (ValueError, TypeError):
        return False
