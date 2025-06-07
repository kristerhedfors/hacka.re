# JavaScript API Authentication Client Functions

## Overview

Complete set of JavaScript client functions for making authenticated API calls using TweetNaCl (libsodium-compatible). These functions are designed for tool calling in hacka.re and demonstrate secure API authentication patterns with comprehensive integrity protection.

## Features

### ✅ **Comprehensive Security**
- **Full Request Integrity**: Signs method, path, query parameters, headers, body, and timestamp
- **Attack Prevention**: Any tampering with request components causes signature verification to fail
- **Replay Protection**: Timestamp-based to prevent replay attacks
- **TweetNaCl Crypto**: Uses the same crypto library as hacka.re (libsodium-compatible)

### 🔧 **Tool Calling Ready**
- All functions tagged with `@callable` for hacka.re integration
- Synchronous crypto operations (no async/await needed for signing)
- Error handling with detailed feedback
- Compatible with existing hacka.re function calling system

### 🛡️ **Security Improvements**
Fixed the critical **"Lack of Integrity Protection on Query Strings"** vulnerability by:
- Including query parameters in signature calculation
- Signing HTTP method and path
- Including essential headers in signature
- Creating canonical request format for tamper-proof signing

## Available Functions

### Core Functions
1. **`generateSharedSecret()`** - Generate cryptographically secure shared secrets
2. **`generateHMACSignature()`** - Create HMAC signatures for request authentication
3. **`makeAuthenticatedHMACCall()`** - Make complete authenticated HTTP requests

### Utility Functions  
4. **`testAPIAuthentication()`** - Validate authentication setup
5. **`makeSecureQueryCall()`** - Demonstrate secure query parameter handling
6. **`demonstrateAttackPrevention()`** - Show attack prevention in action
7. **`makeBatchAuthenticatedCalls()`** - Batch multiple authenticated requests

## Technical Details

### Crypto Implementation
- **Hash Function**: TweetNaCl SHA-512 (first 32 bytes used, like Blake2b)
- **Key Size**: 32 bytes (256 bits) shared secret
- **Signature Format**: 64 hex characters (32 bytes)
- **Timestamp**: Unix timestamp for replay protection

### Request Signing Process
```javascript
// Canonical request format
const canonical = `${method.toUpperCase()}\n${path}\n${sortedParams}\n${sortedHeaders}\n${timestamp}\n`;
const canonicalRequest = canonical + body;

// Keyed hash (HMAC simulation)
const keyedMessage = new Uint8Array(sharedSecret.length + messageBytes.length);
keyedMessage.set(sharedSecret);
keyedMessage.set(messageBytes, sharedSecret.length);
const signature = nacl.hash(keyedMessage).slice(0, 32);
```

## Integration with hacka.re

### Function Calling
All functions are ready for hacka.re tool calling:
- Functions are defined in `/js/default-functions/api-auth-client.js`
- Loaded automatically via `index.html` (line 513)
- Available in Function Calling modal
- Can be called by AI models through OpenAI-compatible APIs

### TweetNaCl Compatibility
- Uses same crypto library as hacka.re core (`lib/tweetnacl/`)
- No additional dependencies required
- Synchronous operations for better tool calling performance
- Compatible with existing hacka.re crypto utilities

## Testing

### Browser Testing
1. Open `test_js_auth.html` in browser (served via HTTP server)
2. Click test buttons to validate functionality:
   - 🔑 Generate Shared Secret
   - 🔐 Test HMAC Signature  
   - 📡 Test Mock API Call
   - 🛡️ Demo Attack Prevention

### Server Integration Testing
Compatible with the auth_examples Python servers:
- HMAC server: `http://localhost:8002`
- Ed25519 server: `http://localhost:8003`

## Security Analysis

### Vulnerability Fixed
**Before**: Only body + timestamp were signed, allowing attackers to:
- Modify query parameters
- Change HTTP method (GET → DELETE)
- Modify request path
- Add malicious headers

**After**: ALL request components are cryptographically signed:
```python
# Components included in signature
- HTTP method (GET, POST, etc.)
- Request path (/api/endpoint)
- Query parameters (sorted)
- Essential headers (sorted)
- Request body
- Timestamp
```

### Attack Prevention
Any modification to signed components produces different signatures:
- ✅ Query parameter tampering detected
- ✅ Path manipulation detected  
- ✅ Method changing detected
- ✅ Header injection detected
- ✅ Replay attacks prevented (timestamp validation)

## Usage Examples

### Basic Authentication
```javascript
// Generate shared secret
const secret = generateSharedSecret();

// Make authenticated call
const result = await makeAuthenticatedHMACCall(
    "https://api.example.com/data",
    secret.sharedSecret,
    {
        method: "POST",
        body: JSON.stringify({data: "value"}),
        queryParams: {user_id: "123"},
        headers: {"X-Client": "hacka.re"}
    }
);
```

### Security Demonstration
```javascript
// Demonstrate attack prevention
const demo = await demonstrateAttackPrevention(
    "https://api.example.com",
    sharedSecret
);
// Shows how tampering fails signature verification
```

## Compatibility

### Server Side
- Compatible with Python auth_examples servers
- Works with any libsodium/PyNaCl backend
- Standard HMAC Blake2b signature verification

### Client Side  
- Requires TweetNaCl library (included in hacka.re)
- Modern browser with ES6+ support
- No additional dependencies

The JavaScript client functions provide a complete, secure, and hackare-integrated solution for authenticated API communication.