#!/usr/bin/env node

/**
 * Encrypt Sealed Box
 * 
 * This program encrypts a JSON message into a base64-encoded sealed box
 * that can only be decrypted by a recipient with the corresponding deterministic key pair.
 * 
 * Usage:
 * 1. Install required packages: npm install tweetnacl tweetnacl-util
 * 2. Make executable: chmod +x encrypt-sealed-box.js
 * 3. Run: ./encrypt-sealed-box.js
 * 
 * Or pipe input: echo '{"key":"value"}' | ./encrypt-sealed-box.js
 */

const nacl = require('tweetnacl');
const util = require('tweetnacl-util');
const readline = require('readline');

// Add nacl.util for compatibility with browser version
nacl.util = util;

/**
 * Generate a deterministic key pair from a master key, namespace, and program name
 * 
 * @param {string} masterKey - The master key (should be a strong, secret key)
 * @param {string} namespace - The namespace (e.g., GPT namespace)
 * @param {string} programName - The unique name of the program
 * @returns {Object} Object containing publicKey and secretKey as Uint8Array
 */
function generateKeyPair(masterKey, namespace, programName) {
    // Combine inputs to create a deterministic seed
    const seedInput = `${masterKey}:${namespace}:${programName}`;
    
    // Hash the combined input to get a 32-byte seed
    const seedBytes = nacl.hash(nacl.util.decodeUTF8(seedInput)).slice(0, 32);
    
    // Generate key pair from the seed
    return nacl.box.keyPair.fromSecretKey(seedBytes);
}

/**
 * Encrypt a message using deterministic keys
 * 
 * @param {Object} data - The data to encrypt (any JSON-serializable object)
 * @param {Uint8Array} recipientPublicKey - The recipient's public key
 * @param {Uint8Array} senderSecretKey - The sender's secret key
 * @returns {string} Base64-encoded encrypted data
 */
function encrypt(data, recipientPublicKey, senderSecretKey) {
    // Convert data to JSON string and then to Uint8Array
    const messageBytes = nacl.util.decodeUTF8(JSON.stringify(data));
    
    // Generate a random nonce for security
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    
    // Encrypt the message using the recipient's public key and sender's secret key
    const ciphertext = nacl.box(
        messageBytes,
        nonce,
        recipientPublicKey,
        senderSecretKey
    );
    
    // Combine the nonce and ciphertext
    const fullMessage = new Uint8Array(
        nacl.box.nonceLength + 
        ciphertext.length
    );
    
    // Add nonce
    fullMessage.set(nonce, 0);
    
    // Add ciphertext
    fullMessage.set(ciphertext, nacl.box.nonceLength);
    
    // Convert to base64 for transmission
    return nacl.util.encodeBase64(fullMessage);
}

// Configuration - these values would be set based on your application
// IMPORTANT: In a real application, these would be securely stored or provided as environment variables
const MASTER_KEY = "your-master-key-here"; // Should be a strong, secret key
const NAMESPACE = "your-gpt-namespace";    // Namespace of the current GPT
const PROGRAM_NAME = "sealed-box-encryptor"; // Unique name for this program
const RECIPIENT_PROGRAM_NAME = "sealed-box-decryptor"; // Name of the program that will decrypt the message

// Generate the deterministic key pairs
const senderKeyPair = generateKeyPair(MASTER_KEY, NAMESPACE, PROGRAM_NAME);
const recipientPublicKey = generateKeyPair(MASTER_KEY, NAMESPACE, RECIPIENT_PROGRAM_NAME).publicKey;

// Display program information
console.log("Sealed Box Encryptor");
console.log("===================");
console.log(`Program: ${PROGRAM_NAME}`);
console.log(`Public Key (Base64): ${nacl.util.encodeBase64(senderKeyPair.publicKey)}`);
console.log(`Target Recipient: ${RECIPIENT_PROGRAM_NAME}`);

// Check if input is from a pipe or terminal
if (process.stdin.isTTY) {
    // Interactive mode
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    console.log("\nEnter JSON message to encrypt (or press Enter for a default message):");
    
    rl.question("", (input) => {
        let message;
        
        if (input.trim()) {
            try {
                message = JSON.parse(input);
            } catch (e) {
                console.error("Invalid JSON input. Using default message instead.");
                message = createDefaultMessage();
            }
        } else {
            message = createDefaultMessage();
        }
        
        encryptAndOutput(message);
        rl.close();
    });
} else {
    // Pipe mode
    let inputData = '';
    
    process.stdin.on('data', (chunk) => {
        inputData += chunk;
    });
    
    process.stdin.on('end', () => {
        let message;
        
        try {
            message = JSON.parse(inputData);
        } catch (e) {
            console.error("Invalid JSON input. Using default message instead.");
            message = createDefaultMessage();
        }
        
        encryptAndOutput(message);
    });
}

/**
 * Create a default message with timestamp and metadata
 */
function createDefaultMessage() {
    return {
        id: `msg-${Date.now()}`,
        text: "This is a sealed box encrypted message",
        timestamp: new Date().toISOString(),
        metadata: {
            sender: PROGRAM_NAME,
            recipient: RECIPIENT_PROGRAM_NAME,
            purpose: "demonstration"
        }
    };
}

/**
 * Encrypt the message and output the result
 */
function encryptAndOutput(message) {
    console.log("\nOriginal message:");
    console.log(JSON.stringify(message, null, 2));
    
    // Encrypt the message
    const encrypted = encrypt(message, recipientPublicKey, senderKeyPair.secretKey);
    
    console.log("\nEncrypted message (Base64):");
    console.log(encrypted);
    
    console.log("\nThis encrypted message can only be decrypted by the recipient program");
    console.log(`with the name "${RECIPIENT_PROGRAM_NAME}" using the same master key and namespace.`);
}
