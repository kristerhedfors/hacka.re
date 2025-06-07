# Authentication Examples

A collection of API authentication methods extracted from the openai_proxy project, focused specifically on demonstrating different authentication patterns for securing API endpoints.

## 🔐 Authentication Methods

### Overview

This project demonstrates secure API authentication patterns using cryptographic signatures:

```
auth_examples/
├── Overview - Authentication patterns and security models
└── Python/
    ├── HMAC Blake2b Authentication (minimal shared secret)
    ├── Ed25519 Digital Signatures (public key cryptography)
    ├── Comprehensive Request Signing (full request validation)
    └── Key Generation Utilities (cryptographic key management)
```

## 🚀 Quick Start

```bash
# Use shared virtual environment from hacka.re project
source ../_venv/bin/activate

# Install auth_examples package
pip install -e .

# Generate authentication keys
python -c "from src.crypto_auth import generate_ed25519_keypair; print(generate_ed25519_keypair())"

# Start authenticated server
python -m src.examples.hmac_server

# Test authentication
python -m src.examples.test_auth
```

## 🛡️ Security Features

- **HMAC Blake2b**: Shared secret authentication with timestamp validation
- **Ed25519 Signatures**: Public key cryptography for stronger security  
- **Replay Protection**: Timestamp-based request freshness validation
- **Comprehensive Signing**: Full request parameter validation (method, path, headers, body)
- **Key Management**: Secure key generation and storage patterns

## 📋 Authentication Methods

| Method | Security Level | Use Case | Key Management |
|--------|---------------|----------|----------------|
| **HMAC Blake2b** | High | Shared secret systems | Single shared secret |
| **Ed25519** | Highest | Public key infrastructure | Key pair per client |
| **Comprehensive** | Highest | Full request validation | Shared secret + full params |

## 🔑 Key Features

- **Real Cryptography**: Uses PyNaCl (libsodium) for production-grade crypto
- **Timestamp Validation**: Prevents replay attacks with configurable time windows
- **Multiple Patterns**: From simple shared secrets to full request signing
- **Educational Focus**: Clear, commented examples for learning authentication patterns
- **No Placeholders**: Real working examples with proper key handling

## 🧪 Examples

### HMAC Authentication
```python
from src.crypto_auth import sign_request, verify_signature

# Sign a request
timestamp, signature = sign_request(request_body, shared_secret)

# Verify signature
is_valid = verify_signature(body, timestamp, signature, shared_secret)
```

### Ed25519 Digital Signatures
```python
from src.crypto_auth import generate_ed25519_keypair, sign_ed25519_request

# Generate keypair
private_key, public_key = generate_ed25519_keypair()

# Sign request
timestamp, signature = sign_ed25519_request(request_body, private_key)
```

## 🔧 Configuration

```bash
# Use shared hacka.re virtual environment
source ../_venv/bin/activate

# Environment variables for authentication
export SHARED_SECRET="your_32_byte_secret_here"
export CLIENT_PUBLIC_KEY="your_ed25519_public_key_hex"
export MAX_REQUEST_AGE=300  # 5 minutes
```

## 🎯 Learning Objectives

- Understanding cryptographic authentication patterns
- Implementing secure API authentication
- Preventing common security vulnerabilities (replay attacks, signature forgery)
- Managing cryptographic keys securely
- Building production-ready authentication systems

---

**Educational Examples** - Focus on authentication patterns and cryptographic security for API endpoints.