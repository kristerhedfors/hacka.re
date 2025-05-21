# Deterministic Crypto System

This system provides a secure way to encrypt and decrypt messages using deterministic key pairs generated from a master key, namespace, and program name. It's designed to be used in scenarios where you need to generate the same key pair consistently across different environments or sessions.

## Key Features

- **Deterministic Key Generation**: Generate the same key pair from the same inputs (master key, namespace, program name)
- **Secure Encryption**: Uses TweetNaCl's box encryption (NaCl's crypto_box, Curve25519, XSalsa20, Poly1305)
- **JSON Support**: Automatically handles JSON serialization/deserialization
- **Base64 Encoding**: Encrypted messages are base64-encoded for easy transmission

## How It Works

1. **Key Generation**: A deterministic key pair is generated from a master key, namespace, and program name
2. **Encryption**: Messages are encrypted using the recipient's public key and sender's secret key
3. **Decryption**: Messages are decrypted using the sender's public key and recipient's secret key

The key generation process ensures that the same inputs will always produce the same key pair, allowing for consistent encryption/decryption across different environments or sessions.

## Library: `deterministic-crypto.js`

The core library provides three main functions:

### `generateKeyPair(masterKey, namespace, programName)`

Generates a deterministic key pair from the provided inputs.

- **Parameters**:
  - `masterKey`: A strong, secret key (string)
  - `namespace`: The namespace (e.g., GPT namespace) (string)
  - `programName`: The unique name of the program (string)
- **Returns**: An object containing `publicKey` and `secretKey` as Uint8Array

### `encrypt(data, recipientPublicKey, senderSecretKey)`

Encrypts data for a specific recipient.

- **Parameters**:
  - `data`: The data to encrypt (any JSON-serializable object)
  - `recipientPublicKey`: The recipient's public key (Uint8Array)
  - `senderSecretKey`: The sender's secret key (Uint8Array)
- **Returns**: Base64-encoded encrypted data (string)

### `decrypt(encryptedData, senderPublicKey, recipientSecretKey)`

Decrypts data from a specific sender.

- **Parameters**:
  - `encryptedData`: Base64-encoded encrypted data (string)
  - `senderPublicKey`: The sender's public key (Uint8Array)
  - `recipientSecretKey`: The recipient's secret key (Uint8Array)
- **Returns**: Decrypted data as an object, or null if decryption fails

## Example Programs

### 1. `deterministic-crypto-example.js`

A standalone Node.js script that demonstrates the complete workflow:
1. Generate deterministic key pairs for both server and client
2. Encrypt a message on the server side
3. Decrypt the message on the client side

### 2. `deterministic-crypto-client.js` and `deterministic-crypto-server.js`

A pair of programs that demonstrate client-server communication using deterministic crypto:
- The server encrypts messages for a specific client
- The client decrypts messages from the server

### 3. `encrypt-sealed-box.js` and `decrypt-sealed-box.js`

Command-line programs that demonstrate the sealed box pattern:
- `encrypt-sealed-box.js`: Encrypts a JSON message into a base64-encoded sealed box
- `decrypt-sealed-box.js`: Decrypts a base64-encoded sealed box into a JSON message

## Usage Examples

### Basic Usage

```javascript
// Generate deterministic key pairs
const serverKeyPair = DeterministicCrypto.generateKeyPair(
    "master-key-123",
    "example-namespace",
    "server-program"
);

const clientKeyPair = DeterministicCrypto.generateKeyPair(
    "master-key-123",
    "example-namespace",
    "client-program"
);

// Server encrypts a message for the client
const message = { text: "Hello, client!", timestamp: new Date().toISOString() };
const encrypted = DeterministicCrypto.encrypt(
    message,
    clientKeyPair.publicKey,
    serverKeyPair.secretKey
);

// Client decrypts the message from the server
const decrypted = DeterministicCrypto.decrypt(
    encrypted,
    serverKeyPair.publicKey,
    clientKeyPair.secretKey
);

console.log(decrypted); // { text: "Hello, client!", timestamp: "..." }
```

### Command-Line Usage

Encrypt a message:
```bash
# Interactive mode
./encrypt-sealed-box.js

# Pipe mode
echo '{"key":"value"}' | ./encrypt-sealed-box.js
```

Decrypt a message:
```bash
# Interactive mode
./decrypt-sealed-box.js

# Pipe mode
echo "base64-encrypted-data" | ./decrypt-sealed-box.js
```

## Security Considerations

1. **Master Key Protection**: The master key should be kept secret and securely stored
2. **Namespace and Program Names**: While not secret, these should be chosen carefully to avoid collisions
3. **Nonce Reuse**: The system uses random nonces to prevent replay attacks
4. **Key Rotation**: Consider implementing key rotation by changing the program name periodically

## Dependencies

- [TweetNaCl.js](https://github.com/dchest/tweetnacl-js): A port of the NaCl cryptography library to JavaScript
- [TweetNaCl-util.js](https://github.com/dchest/tweetnacl-util-js): Utility functions for TweetNaCl.js

## Installation

```bash
npm install tweetnacl tweetnacl-util
```

## License

This code is provided under the MIT License.
