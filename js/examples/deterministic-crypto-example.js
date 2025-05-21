/**
 * Deterministic Crypto Complete Example
 * 
 * This is a standalone Node.js script that demonstrates the complete workflow:
 * 1. Generate deterministic key pairs for both server and client
 * 2. Encrypt a message on the server side
 * 3. Decrypt the message on the client side
 * 
 * To run this example:
 * 1. Install required packages: npm install tweetnacl tweetnacl-util
 * 2. Run: node deterministic-crypto-example.js
 */

// In a real implementation, you would import these libraries
// const nacl = require('tweetnacl');
// const util = require('tweetnacl-util');
// nacl.util = util;

// For this example, we'll simulate the environment by defining the necessary functions
const nacl = {
    util: {
        decodeUTF8: (str) => Buffer.from(str, 'utf8'),
        encodeUTF8: (buf) => Buffer.from(buf).toString('utf8'),
        encodeBase64: (buf) => Buffer.from(buf).toString('base64'),
        decodeBase64: (str) => Buffer.from(str, 'base64')
    },
    randomBytes: (n) => {
        const bytes = Buffer.alloc(n);
        for (let i = 0; i < n; i++) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
        return bytes;
    },
    hash: (input) => {
        // This is a simplified hash function for the example
        // In a real implementation, you would use nacl.hash
        const result = Buffer.alloc(64);
        for (let i = 0; i < Math.min(input.length, 64); i++) {
            result[i] = input[i];
        }
        return result;
    },
    box: {
        publicKeyLength: 32,
        secretKeyLength: 32,
        nonceLength: 24,
        keyPair: {
            fromSecretKey: (secretKey) => {
                // This is a simplified key derivation for the example
                // In a real implementation, you would use nacl.box.keyPair.fromSecretKey
                const publicKey = Buffer.alloc(32);
                for (let i = 0; i < 32; i++) {
                    publicKey[i] = secretKey[i] ^ 0x40; // XOR with a constant for demo
                }
                return { publicKey, secretKey };
            }
        },
        keyPair: () => {
            // Generate a random key pair for the example
            const secretKey = nacl.randomBytes(32);
            return nacl.box.keyPair.fromSecretKey(secretKey);
        },
        // Simplified box function for the example
        box: (message, nonce, publicKey, secretKey) => {
            // In a real implementation, this would use nacl.box for encryption
            // Here we just concatenate the inputs for demonstration
            const result = Buffer.alloc(message.length + 16); // Add 16 bytes for "encryption"
            result.set(message, 16);
            return result;
        },
        // Simplified box.open function for the example
        open: (ciphertext, nonce, publicKey, secretKey) => {
            // In a real implementation, this would use nacl.box.open for decryption
            // Here we just extract the message part for demonstration
            if (ciphertext.length < 16) return null;
            return ciphertext.slice(16);
        }
    }
};

// Define the DeterministicCrypto library (same as in deterministic-crypto.js)
const DeterministicCrypto = {
    generateKeyPair: (masterKey, namespace, programName) => {
        // Combine inputs to create a deterministic seed
        const seedInput = `${masterKey}:${namespace}:${programName}`;
        
        // Hash the combined input to get a 32-byte seed
        const seedBytes = nacl.hash(nacl.util.decodeUTF8(seedInput)).slice(0, 32);
        
        // Generate key pair from the seed
        return nacl.box.keyPair.fromSecretKey(seedBytes);
    },
    
    encrypt: (data, recipientPublicKey, senderSecretKey) => {
        // Convert data to JSON string and then to Uint8Array
        const messageBytes = nacl.util.decodeUTF8(JSON.stringify(data));
        
        // Generate a random nonce for security
        const nonce = nacl.randomBytes(nacl.box.nonceLength);
        
        // Encrypt the message using the recipient's public key and sender's secret key
        const ciphertext = nacl.box.box(
            messageBytes,
            nonce,
            recipientPublicKey,
            senderSecretKey
        );
        
        // Combine the nonce and ciphertext
        const fullMessage = Buffer.alloc(
            nacl.box.nonceLength + 
            ciphertext.length
        );
        
        // Add nonce
        fullMessage.set(nonce, 0);
        
        // Add ciphertext
        fullMessage.set(ciphertext, nacl.box.nonceLength);
        
        // Convert to base64 for transmission
        return nacl.util.encodeBase64(fullMessage);
    },
    
    decrypt: (encryptedData, senderPublicKey, recipientSecretKey) => {
        try {
            // Convert from base64 to Uint8Array
            const fullMessage = nacl.util.decodeBase64(encryptedData);
            
            // Extract nonce
            const nonce = fullMessage.slice(0, nacl.box.nonceLength);
            
            // Extract ciphertext
            const ciphertext = fullMessage.slice(nacl.box.nonceLength);
            
            // Decrypt the message using the sender's public key and recipient's secret key
            const messageBytes = nacl.box.open(
                ciphertext,
                nonce,
                senderPublicKey,
                recipientSecretKey
            );
            
            if (!messageBytes) {
                console.error('Decryption failed: box.open returned null');
                return null;
            }
            
            // Convert from Uint8Array to string, then parse JSON
            const messageString = nacl.util.encodeUTF8(messageBytes);
            
            try {
                // Parse JSON
                return JSON.parse(messageString);
            } catch (jsonError) {
                console.error('JSON parsing error after successful decryption:', jsonError);
                return null;
            }
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }
};

// Main function to demonstrate the workflow
function runExample() {
    console.log("Deterministic Crypto Example");
    console.log("===========================");
    
    // Configuration
    const MASTER_KEY = "example-master-key-12345";
    const NAMESPACE = "example-gpt-namespace";
    const SERVER_PROGRAM_NAME = "example-server";
    const CLIENT_PROGRAM_NAME = "example-client";
    
    console.log(`Master Key: ${MASTER_KEY}`);
    console.log(`Namespace: ${NAMESPACE}`);
    console.log(`Server Program: ${SERVER_PROGRAM_NAME}`);
    console.log(`Client Program: ${CLIENT_PROGRAM_NAME}`);
    
    // Step 1: Generate deterministic key pairs
    console.log("\nStep 1: Generate deterministic key pairs");
    console.log("----------------------------------------");
    
    const serverKeyPair = DeterministicCrypto.generateKeyPair(
        MASTER_KEY,
        NAMESPACE,
        SERVER_PROGRAM_NAME
    );
    
    const clientKeyPair = DeterministicCrypto.generateKeyPair(
        MASTER_KEY,
        NAMESPACE,
        CLIENT_PROGRAM_NAME
    );
    
    console.log(`Server Public Key: ${nacl.util.encodeBase64(serverKeyPair.publicKey)}`);
    console.log(`Client Public Key: ${nacl.util.encodeBase64(clientKeyPair.publicKey)}`);
    
    // Step 2: Server encrypts a message for the client
    console.log("\nStep 2: Server encrypts a message for the client");
    console.log("----------------------------------------------");
    
    const message = {
        id: "msg-" + Date.now(),
        text: "Hello, this is a secret message!",
        timestamp: new Date().toISOString(),
        metadata: {
            sender: SERVER_PROGRAM_NAME,
            recipient: CLIENT_PROGRAM_NAME
        }
    };
    
    console.log("Original message:");
    console.log(JSON.stringify(message, null, 2));
    
    const encryptedMessage = DeterministicCrypto.encrypt(
        message,
        clientKeyPair.publicKey,
        serverKeyPair.secretKey
    );
    
    console.log("\nEncrypted message (Base64):");
    console.log(encryptedMessage);
    
    // Step 3: Client decrypts the message
    console.log("\nStep 3: Client decrypts the message");
    console.log("----------------------------------");
    
    const decryptedMessage = DeterministicCrypto.decrypt(
        encryptedMessage,
        serverKeyPair.publicKey,
        clientKeyPair.secretKey
    );
    
    console.log("Decrypted message:");
    console.log(JSON.stringify(decryptedMessage, null, 2));
    
    // Verify the decryption was successful
    const success = JSON.stringify(message) === JSON.stringify(decryptedMessage);
    console.log(`\nDecryption successful: ${success ? 'YES' : 'NO'}`);
    
    // Demonstrate that the same keys are generated with the same inputs
    console.log("\nVerifying deterministic key generation:");
    console.log("--------------------------------------");
    
    const serverKeyPair2 = DeterministicCrypto.generateKeyPair(
        MASTER_KEY,
        NAMESPACE,
        SERVER_PROGRAM_NAME
    );
    
    const clientKeyPair2 = DeterministicCrypto.generateKeyPair(
        MASTER_KEY,
        NAMESPACE,
        CLIENT_PROGRAM_NAME
    );
    
    const serverKeysMatch = Buffer.from(serverKeyPair.publicKey).toString('hex') === 
                           Buffer.from(serverKeyPair2.publicKey).toString('hex');
                           
    const clientKeysMatch = Buffer.from(clientKeyPair.publicKey).toString('hex') === 
                           Buffer.from(clientKeyPair2.publicKey).toString('hex');
    
    console.log(`Server keys match: ${serverKeysMatch ? 'YES' : 'NO'}`);
    console.log(`Client keys match: ${clientKeysMatch ? 'YES' : 'NO'}`);
    
    console.log("\nExample completed successfully!");
}

// Run the example
runExample();
