// API Authentication using libsodium - Documentation and Security Guide
window.defaultPrompts = window.defaultPrompts || {};
window.defaultPrompts['API auth using libsodium - Documentation'] = {
    category: 'Code',
    content: `# API Authentication using libsodium - Security & Deployment Guide

Comprehensive security practices, key management, deployment instructions, and JavaScript integration for libsodium API authentication.

---

## 🔧 Key Management & Utilities

### Environment Setup

\`\`\`bash
# Generate HMAC shared secret (32 bytes hex)
python -c "from crypto_auth import generate_shared_secret; print(generate_shared_secret().hex())"

# Generate Ed25519 keypair
python -c "from crypto_auth import generate_ed25519_keypair; private, public = generate_ed25519_keypair(); print(f'Private: {private}'); print(f'Public: {public}')"

# Set environment variables
export SHARED_SECRET=your_32_byte_shared_secret_as_64_hex_chars
export PRIVATE_KEY=your_ed25519_private_key_as_64_hex_chars
export CLIENT_PUBLIC_KEY=your_ed25519_public_key_as_64_hex_chars
\`\`\`

### Secure Key Storage

\`\`\`python
def save_keypair_to_files(private_key_hex: str, public_key_hex: str):
    """Save Ed25519 keypair to files with secure permissions"""
    # Write private key with restrictive permissions (owner read-only)
    with open('private_key.hex', 'w') as f:
        f.write(private_key_hex)
    os.chmod('private_key.hex', 0o600)
    
    # Write public key with normal permissions
    with open('public_key.hex', 'w') as f:
        f.write(public_key_hex)
    os.chmod('public_key.hex', 0o644)

def load_shared_secret_from_env(env_var: str = 'SHARED_SECRET') -> bytes:
    """Load shared secret from environment with validation"""
    secret_hex = os.environ.get(env_var)
    if not secret_hex:
        raise ValueError(f"Environment variable {env_var} not set")
    
    secret = bytes.fromhex(secret_hex)
    if len(secret) != 32:
        raise ValueError(f"Shared secret must be exactly 32 bytes, got {len(secret)}")
    return secret
\`\`\`

---

## 📋 Security Best Practices

### 🔒 **Comprehensive Integrity Protection**

The authentication system signs **ALL** request components to prevent tampering:

✅ **Protected Components:**
- **HTTP Method** (GET, POST, etc.)
- **Request Path** (/api/endpoint)
- **Query Parameters** (?param=value)
- **Essential Headers** (Content-Type, Authorization, etc.)
- **Request Body** (complete payload)
- **Timestamp** (replay protection)

### 🛡️ **Security Features:**

\`\`\`python
# All request components are cryptographically signed
canonical_request = f"{method}\\n{path}\\n{params}\\n{headers}\\n{timestamp}\\n" + body

# Any modification to any component invalidates the signature
signature = blake2b(canonical_request, key=shared_secret)
\`\`\`

### 🔧 **Additional Security Practices:**

1. **Always use libsodium primitives** - Never implement crypto yourself
2. **Validate timestamps** - Prevent replay attacks (default: 5 minutes)
3. **Use timing-safe comparisons** - \`secrets.compare_digest()\` prevents timing attacks
4. **Rotate keys regularly** - Especially for production systems
5. **Store keys securely** - Environment variables, not in code
6. **Use HTTPS** - Encrypt transport layer
7. **Validate all inputs** - Check timestamp format, signature length, etc.
8. **Log authentication events** - For security monitoring
9. **Sign ALL request components** - Method, path, query, headers, body
10. **Essential headers only** - Don't sign variable headers that change per request

## 🚀 Production Deployment

\`\`\`bash
# Install dependencies
pip install pynacl starlette uvicorn httpx

# Generate production keys
python -c "from crypto_auth import generate_shared_secret, generate_ed25519_keypair; 
secret = generate_shared_secret(); 
private, public = generate_ed25519_keypair();
print(f'SHARED_SECRET={secret.hex()}');
print(f'PRIVATE_KEY={private}');
print(f'CLIENT_PUBLIC_KEY={public}')"

# Start servers
SHARED_SECRET=<your_secret> uvicorn hmac_server:app --host 0.0.0.0 --port 8000
CLIENT_PUBLIC_KEY=<public_key> uvicorn ed25519_server:app --host 0.0.0.0 --port 8001
\`\`\`

---

## 🌐 JavaScript Client Functions (Tool Calling)

TweetNaCl-based JavaScript functions for authenticated API access in hacka.re:

### Generate Shared Secret

\`\`\`javascript
// Generate cryptographically secure shared secret using TweetNaCl
const secret = generateSharedSecret();
console.log("Shared Secret:", secret.sharedSecret);
console.log("Setup:", secret.setupInstructions);
\`\`\`

### Make Authenticated API Call

\`\`\`javascript
// Make authenticated HMAC API call with comprehensive integrity protection
const result = await makeAuthenticatedHMACCall(
    "https://api.example.com/api/protected",
    "your_64_char_shared_secret_hex",
    {
        method: "POST",
        body: JSON.stringify({ action: "test", data: "secure" }),
        queryParams: { user_id: "123", action: "read" },
        headers: { "X-Client": "hacka.re" }
    }
);

console.log("Success:", result.success);
console.log("Data:", result.data);
console.log("Auth Details:", result.authDetails);
\`\`\`

### Test Authentication Setup

\`\`\`javascript
// Validate authentication credentials and server connection
const test = await testAPIAuthentication(
    "https://api.example.com",
    "your_shared_secret_hex"
);

console.log("Health Check:", test.healthCheck);
console.log("Auth Test:", test.authTest.success);
console.log("Recommendations:", test.recommendations);
\`\`\`

### Secure Query Parameter Calls

\`\`\`javascript
// Make API call with query parameter integrity protection
const result = await makeSecureQueryCall(
    "https://api.example.com",
    "/api/users",
    "your_shared_secret_hex",
    { user_id: "123", action: "profile" },  // Query params are signed
    { fields: ["name", "email"] }           // Body data
);

console.log("Query Protection:", result.queryProtection);
console.log("Parameters Signed:", result.queryProtection.parametersSignedCount);
\`\`\`

### Demonstrate Attack Prevention

\`\`\`javascript
// Show how tampering with request components fails authentication
const demo = await demonstrateAttackPrevention(
    "https://api.example.com",
    "your_shared_secret_hex"
);

console.log("Security Analysis:", demo.demonstration.securityAnalysis);
console.log("Protection Working:", demo.demonstration.securityAnalysis.protectionWorking);
console.log("Explanation:", demo.explanation);
\`\`\`

### Batch Authenticated Calls

\`\`\`javascript
// Make multiple authenticated API calls
const requests = [
    { endpoint: "/api/users", method: "GET", queryParams: { page: 1 } },
    { endpoint: "/api/profile", method: "POST", data: { update: true } },
    { endpoint: "/api/settings", method: "GET", queryParams: { section: "security" } }
];

const batch = await makeBatchAuthenticatedCalls(
    "https://api.example.com",
    "your_shared_secret_hex",
    requests
);

console.log("Batch Summary:", batch.summary);
console.log("Success Rate:", \`\${batch.summary.successfulRequests}/\${batch.summary.totalRequests}\`);
\`\`\`

### Available Tool Functions

All functions are marked with \`@callable\` for hacka.re tool calling:

- **\`generateSharedSecret()\`** - Generate secure shared secret
- **\`generateHMACSignature()\`** - Create HMAC signature for custom requests  
- **\`makeAuthenticatedHMACCall()\`** - Complete authenticated API call
- **\`testAPIAuthentication()\`** - Test auth setup and connectivity
- **\`makeSecureQueryCall()\`** - API call with query parameter protection
- **\`demonstrateAttackPrevention()\`** - Security demonstration
- **\`makeBatchAuthenticatedCalls()\`** - Multiple authenticated calls

### Security Features

✅ **Comprehensive Integrity Protection**: Signs method, path, query params, headers, body
✅ **Replay Protection**: Timestamp validation prevents replay attacks  
✅ **TweetNaCl Crypto**: Uses libsodium-compatible cryptographic functions
✅ **Compatible**: Works with libsodium servers (Python, C, etc.)
✅ **Tool Calling Ready**: All functions available for AI model execution

---

**Complete security guide and JavaScript integration for libsodium-based API authentication. All code examples are tested and working. Python examples use libsodium (PyNaCl), JavaScript examples use TweetNaCl for hacka.re compatibility.**`
};