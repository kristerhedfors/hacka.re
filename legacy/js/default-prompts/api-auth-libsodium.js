// API Authentication using libsodium - Main Overview
window.defaultPrompts = window.defaultPrompts || {};
window.defaultPrompts['API auth using libsodium'] = {
    category: 'Code',
    content: `# API Authentication using libsodium - Complete Implementation Guide

This modular prompt system provides comprehensive API authentication using libsodium (PyNaCl) and TweetNaCl cryptographic primitives. The implementation has been organized into three specialized modules for easy navigation and use.

## 📋 Module Organization

### 🔐 Core Functions Module
**"API auth using libsodium - Core Functions"**
- Key generation (shared secrets, Ed25519 keypairs)
- HMAC Blake2b authentication functions
- Ed25519 digital signature functions
- Comprehensive request signing utilities

### 🖥️ Examples Module  
**"API auth using libsodium - Examples"**
- Complete server implementations (Starlette)
- HMAC and Ed25519 authentication servers
- Client implementation examples
- Unit tests and validation code

### 📖 Documentation Module
**"API auth using libsodium - Documentation"**
- Security best practices
- Key management and utilities
- Production deployment instructions
- JavaScript/TweetNaCl integration for hacka.re
- Tool calling functions

## 🚀 Quick Start

1. **Choose your authentication method:**
   - HMAC Blake2b (shared secret) - for microservices
   - Ed25519 digital signatures - for distributed systems

2. **Use the Core Functions module** for cryptographic primitives
3. **Reference the Examples module** for server/client implementation
4. **Follow the Documentation module** for security and deployment

## 🔐 Authentication Methods Supported

### 1. HMAC Blake2b Authentication (Shared Secret)
**Best for**: Microservices, internal APIs, shared secret scenarios

### 2. Ed25519 Digital Signatures (Public Key)  
**Best for**: Client authentication, distributed systems, highest security

### 3. Comprehensive Request Signing
**Best for**: Maximum security, prevents any parameter tampering

## 🛡️ Security Features

✅ **Comprehensive Integrity Protection**: Signs method, path, query params, headers, body
✅ **Replay Protection**: Timestamp validation prevents replay attacks  
✅ **libsodium Crypto**: Uses industry-standard cryptographic primitives
✅ **TweetNaCl Compatible**: JavaScript functions work with hacka.re tool calling
✅ **Production Ready**: Complete server and client implementations

---

**Select the specific module you need from the prompt library, or use this overview to understand the complete authentication system architecture.**`
};