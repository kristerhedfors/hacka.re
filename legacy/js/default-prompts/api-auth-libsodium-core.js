// API Authentication using libsodium - Core Authentication Functions
window.defaultPrompts = window.defaultPrompts || {};
window.defaultPrompts['API auth using libsodium - Core Functions'] = {
    category: 'Code',
    content: `# API Authentication using libsodium - Core Functions

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

**Core cryptographic functions using libsodium (PyNaCl) primitives for secure API authentication.**`
};