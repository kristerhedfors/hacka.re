#!/usr/bin/env node

/**
 * Decrypt Sealed Box
 * 
 * This program asks for a base64-encrypted sealed box from stdin,
 * decrypts it using a hard-coded deterministic key pair, and
 * outputs the decrypted JSON content.
 * 
 * Usage:
 * 1. Install required packages: npm install tweetnacl tweetnacl-util
 * 2. Make executable: chmod +x decrypt-sealed-box.js
 * 3. Run: ./decrypt-sealed-box.js
 * 
 * Or pipe input: echo "base64-encrypted-data" | ./decrypt-sealed-box.js
 */

const nacl = require('tweetnacl');
const util = require('tweetnacl-util');

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
 * Decrypt a message using deterministic keys
 * 
 * @param {string} encryptedData - Base64-encoded encrypted data
 * @param {Uint8Array} senderPublicKey - The sender's public key
 * @param {Uint8Array} recipientSecretKey - The recipient's secret key
 * @returns {Object|null} Decrypted data as an object, or null if decryption fails
 */
function decrypt(encryptedData, senderPublicKey, recipientSecretKey) {
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

// Configuration - these values would be set based on your application
// IMPORTANT: In a real application, these would be securely stored or provided as environment variables
const MASTER_KEY = "your-master-key-here"; // Should be a strong, secret key
const NAMESPACE = "your-gpt-namespace";    // Namespace of the current GPT
const PROGRAM_NAME = "sealed-box-decryptor"; // Unique name for this program
const SENDER_PROGRAM_NAME = "sealed-box-encryptor"; // Name of the program that encrypted the message

// Generate the deterministic key pairs
const recipientKeyPair = generateKeyPair(MASTER_KEY, NAMESPACE, PROGRAM_NAME);
const senderPublicKey = generateKeyPair(MASTER_KEY, NAMESPACE, SENDER_PROGRAM_NAME).publicKey;

// Display program information
console.log("Sealed Box Decryptor");
console.log("===================");
console.log(`Program: ${PROGRAM_NAME}`);
console.log(`Public Key (Base64): ${nacl.util.encodeBase64(recipientKeyPair.publicKey)}`);
console.log(`Expected Sender: ${SENDER_PROGRAM_NAME}`);
console.log("\nWaiting for encrypted message (paste base64-encoded data):");

// Read from stdin
let inputData = '';
process.stdin.on('data', (chunk) => {
    inputData += chunk;
});

process.stdin.on('end', () => {
    // Remove any whitespace, newlines, etc.
    const encryptedData = inputData.trim();
    
    if (!encryptedData) {
        console.error("Error: No input provided");
        process.exit(1);
    }
    
    console.log("\nAttempting to decrypt message...");
    
    const decrypted = decrypt(encryptedData, senderPublicKey, recipientKeyPair.secretKey);
    
    if (decrypted) {
        console.log("\nDecryption successful!");
        console.log("Decrypted content:");
        console.log(JSON.stringify(decrypted, null, 2));
        process.exit(0);
    } else {
        console.error("\nDecryption failed. Possible reasons:");
        console.error("- The message was not encrypted for this recipient");
        console.error("- The message was not encrypted by the expected sender");
        console.error("- The encrypted data is corrupted or invalid");
        process.exit(1);
    }
});

// If stdin is a TTY (terminal), we need to handle user input differently
if (process.stdin.isTTY) {
    console.log("(Type or paste the encrypted data, then press Ctrl+D to finish)");
}
