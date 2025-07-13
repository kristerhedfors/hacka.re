# hacka.re Cryptography and Storage Technical Specification

This document provides a detailed technical specification of the cryptography and storage system used in hacka.re, a privacy-focused web client for AI models.

## Table of Contents

1. [Overview](#overview)
2. [Cryptographic Primitives](#cryptographic-primitives)
3. [Namespace System](#namespace-system)
4. [Key Hierarchy](#key-hierarchy)
5. [Storage Structure](#storage-structure)
6. [Encryption and Decryption Process](#encryption-and-decryption-process)
7. [Session Keys and User Authentication](#session-keys-and-user-authentication)
8. [Sharing Mechanism](#sharing-mechanism)
9. [Security Considerations](#security-considerations)
10. [Implementation Details](#implementation-details)

## Overview

The hacka.re application uses a robust cryptographic system to secure user data stored in the browser's localStorage. The system is designed with the following goals:

- **Privacy**: All sensitive data is encrypted before being stored in localStorage
- **Isolation**: Different GPT configurations are isolated using namespaces
- **Security**: Encryption with proper key derivation and salting
- **Usability**: Transparent encryption/decryption for the user
- **Shareability**: Secure sharing of configurations with other users

The system uses TweetNaCl.js for cryptographic operations, providing high-security symmetric encryption with XSalsa20-Poly1305 authenticated encryption.

## Cryptographic Primitives

### Hash Function

- **Algorithm**: SHA-256 (implemented using TweetNaCl's SHA-512 truncated to 256 bits)
- **Usage**: Used for namespace generation, key derivation, and general hashing needs

### Symmetric Encryption

- **Algorithm**: XSalsa20-Poly1305 (TweetNaCl's secretbox)
- **Key Size**: 256 bits (32 bytes)
- **Nonce Size**: 192 bits (24 bytes)
- **Authentication**: Poly1305 MAC integrated with encryption

### Key Derivation

- **Algorithm**: Custom key derivation based on multiple iterations of SHA-512
- **Iterations**: 10,000 rounds
- **Salt Size**: 128 bits (16 bytes)
- **Output Size**: 256 bits (32 bytes)

### Random Number Generation

- **Source**: Web Crypto API (`window.crypto.getRandomValues()`)
- **Usage**: Generation of salts, nonces, and random identifiers

## Namespace System

The namespace system provides isolation between different GPT configurations, allowing users to switch between different contexts without data leakage.

### Namespace Identifier

- **Format**: `aihackare_namespace_<8-random-alnum-chars>`
- **Example**: `aihackare_namespace_Xj7Kl9pQ`
- **Generation**: 8 random alphanumeric characters (uppercase, lowercase, digits)
- **Entropy**: ~47.6 bits (62^8 possible combinations)

### Namespace Hash

- **Derivation**: SHA-256 hash of the concatenation of title and subtitle
- **Example**: If title = "hacka.re" and subtitle = "För hackare av hackare", then the namespace hash is `SHA-256("hacka.reFör hackare av hackare")`
- **Usage**: Used to identify and verify the correct namespace for a given title/subtitle combination

### Namespace Storage

Each namespace entry in localStorage contains:

1. **Namespace Entry**: The namespace hash encrypted with the session key or itself
   - Key: `aihackare_namespace_<random-id>`
   - Value: Namespace hash encrypted with either:
     - User's session key (if available)
     - Namespace hash (as fallback)

2. **Master Key Entry**: The master encryption key for this namespace
   - Key: `aihackare_master_key_<random-id>` (same random ID as namespace)
   - Value: Master key encrypted with either:
     - User's session key (if available)
     - Namespace hash (as fallback)

## Key Hierarchy

The system uses a hierarchical key structure:

1. **Session Key**
   - Provided by the user (password)
   - Stored in memory only (never in localStorage)
   - Used to encrypt/decrypt the master key
   - Optional (system falls back to namespace hash if not available)

2. **Namespace Hash**
   - Derived from title and subtitle
   - Used to identify the correct namespace
   - Used as fallback for encrypting/decrypting the master key

3. **Master Key**
   - Randomly generated 256-bit key
   - Unique per namespace
   - Encrypted and stored in localStorage
   - Used for encrypting/decrypting all data in the namespace

4. **Derived Encryption Keys**
   - Derived from master key + salt for each encryption operation
   - Used for actual encryption/decryption of data
   - Never stored, always derived on-the-fly

## Storage Structure

The localStorage structure follows this pattern:

```
localStorage
├── aihackare_title                      # Unencrypted title
├── aihackare_subtitle                   # Unencrypted subtitle
├── aihackare_encryption_salt            # Global encryption salt
├── aihackare_encryption_version         # Encryption version identifier
├── aihackare_namespace_<random-id>      # Encrypted namespace hash
├── aihackare_master_key_<random-id>     # Encrypted master key
├── aihackare_api_key_<namespace-id>     # Encrypted API key
├── aihackare_model_<namespace-id>       # Encrypted model selection
├── aihackare_history_<namespace-id>     # Encrypted chat history
└── ...                                  # Other namespaced data
```

## Encryption and Decryption Process

### Data Encryption

1. Determine if the key should be encrypted (based on NON_ENCRYPTED_KEYS list)
2. If encryption is needed:
   - Get the master key for the current namespace
   - Generate a random salt (16 bytes)
   - Derive an encryption key from the master key and salt
   - Generate a random nonce (24 bytes)
   - Convert data to JSON string and then to Uint8Array
   - Encrypt data using XSalsa20-Poly1305 with the derived key and nonce
   - Combine salt + nonce + ciphertext into a single message
   - Encode as Base64 and store in localStorage

### Data Decryption

1. Retrieve the encrypted data from localStorage
2. If the key is encrypted:
   - Get the master key for the current namespace
   - Decode the Base64 data
   - Extract salt, nonce, and ciphertext
   - Derive the decryption key from the master key and salt
   - Decrypt using XSalsa20-Poly1305
   - Convert the decrypted Uint8Array to a string and parse as JSON

### Namespace Resolution

When accessing data, the system:

1. Gets the current title and subtitle
2. Computes the namespace hash
3. Searches localStorage for all keys starting with `aihackare_namespace_`
4. For each namespace entry:
   - If a session key is available:
     - First attempts to decrypt using the session key
     - If decryption succeeds and matches the expected hash, this is the correct namespace
   - If no session key is available or session key decryption fails:
     - Attempts to decrypt using the namespace hash as the key
     - If decryption succeeds and matches the expected hash, this is the correct namespace
5. Once the correct namespace is found:
   - Retrieves the encrypted master key
   - Attempts to decrypt it using:
     - The user's session key (if available)
     - The namespace hash (as fallback)
6. Uses the decrypted master key for all subsequent encryption/decryption operations

## Session Keys and User Authentication

### Session Key Management

- Session keys are provided by the user and stored only in memory
- The ShareManager component manages session keys
- Session keys can be:
  - Generated randomly (12 alphanumeric characters)
  - Entered manually by the user
  - Locked to prevent accidental changes

### Session Key Usage

- Primary use: Encrypting/decrypting both the namespace hash and the master key
- Secondary use: Encrypting/decrypting shared links
- When a session key is available, it's used instead of the namespace hash
- This provides an additional layer of security, as both the namespace entry and master key are encrypted with a key not derivable from the title/subtitle
- The session key approach creates a more robust security model where access to data requires both knowledge of the title/subtitle and the session key

## Sharing Mechanism

### Share Link Generation

1. User selects what to share (API key, system prompt, model, conversation)
2. User provides a session key (password) for encryption
3. Data is encrypted using the session key
4. Encrypted data is added to URL fragment (after #)
5. URL is shared with recipient

### Share Link Decryption

1. System detects encrypted data in URL fragment
2. User is prompted for the session key
3. System attempts to decrypt using the provided key
4. If successful, the decrypted data is applied to the current session
5. If title/subtitle are included, they're applied first to ensure proper namespacing

## Security Considerations

### Strengths

- **Zero server-side storage**: All data remains in the browser
- **Encryption**: XSalsa20-Poly1305 authenticated encryption
- **Key derivation**: Multiple iterations of SHA-512 with salt
- **Namespace isolation**: Different GPTs have separate encryption contexts
- **Master key system**: Adds an additional layer of security
- **Session key option**: Further strengthens security when available

### Limitations

- **Browser storage**: Subject to browser storage limitations and clearing
- **In-memory session keys**: Lost when the page is refreshed
- **Client-side only**: No server-side validation or backup
- **Implementation security**: Relies on correct implementation of cryptographic primitives

## Implementation Details

### Key Components

1. **CryptoUtils**: Low-level cryptographic operations
   - Hash functions (SHA-256)
   - Key derivation
   - Encryption/decryption primitives
   - Random number generation

2. **EncryptionService**: Mid-level encryption services
   - Salt management
   - Version tracking
   - Encryption/decryption API

3. **NamespaceService**: Namespace management
   - Namespace generation and resolution
   - Master key management
   - Namespaced key generation

4. **CoreStorageService**: Storage operations
   - Encrypted storage operations
   - Key management
   - Value serialization/deserialization

5. **DataService**: High-level data operations
   - Type-specific storage methods
   - Data migration
   - Default values

6. **ShareService**: Sharing functionality
   - Link generation
   - Data encryption for sharing
   - Link parsing and extraction

### Cryptographic Process Flow

1. **Initialization**:
   - System initializes EncryptionService
   - Salt is created or retrieved
   - Encryption version is set

2. **Namespace Resolution**:
   - Title and subtitle are retrieved
   - Namespace hash is computed
   - Existing namespace is found or new one is created
   - Master key is retrieved or generated

3. **Data Storage**:
   - Data is prepared for storage
   - Namespaced key is generated
   - Data is encrypted with the master key
   - Encrypted data is stored in localStorage

4. **Data Retrieval**:
   - Namespaced key is generated
   - Encrypted data is retrieved
   - Data is decrypted with the master key
   - Decrypted data is returned to the application

### Code Structure

The cryptographic system is implemented across several JavaScript modules:

- `js/utils/crypto-utils.js`: Core cryptographic utilities
- `js/services/encryption-service.js`: Encryption service
- `js/services/namespace-service.js`: Namespace management
- `js/services/core-storage-service.js`: Low-level storage operations
- `js/services/data-service.js`: High-level data operations
- `js/services/storage-service.js`: Public storage API
- `js/services/share-service.js`: Sharing functionality
- `js/services/link-sharing-service.js`: Link generation and parsing
- `js/components/share-manager.js`: UI for sharing and session key management
- `js/components/settings/settings-manager.js`: Settings and configuration

---

This specification describes the cryptographic system as implemented in hacka.re version 1.0. Future versions may enhance or modify this system while maintaining backward compatibility.
