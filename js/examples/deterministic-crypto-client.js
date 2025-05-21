/**
 * Deterministic Crypto Client Example
 * 
 * This program demonstrates how to use the DeterministicCrypto library to decrypt
 * messages that were encrypted for a specific recipient using deterministic keys.
 * 
 * The program has a hard-coded deterministic key pair generated from a master key,
 * namespace, and program name. It can decrypt any message encrypted for this key pair.
 */

// Sample usage in Node.js:
// 
// const fs = require('fs');
// const readline = require('readline');
// const nacl = require('tweetnacl');
// const util = require('tweetnacl-util');
// 
// // Add nacl.util for compatibility with browser version
// nacl.util = util;
// 
// // Include the DeterministicCrypto library
// eval(fs.readFileSync('js/utils/deterministic-crypto.js', 'utf8'));
// 
// // Include this client program
// eval(fs.readFileSync('js/examples/deterministic-crypto-client.js', 'utf8'));
// 
// // Run the client
// DeterministicCryptoClient.run();

window.DeterministicCryptoClient = (function() {
    // Configuration - these values would be set based on your application
    const MASTER_KEY = "your-master-key-here"; // Should be a strong, secret key
    const NAMESPACE = "your-gpt-namespace";    // Namespace of the current GPT
    const PROGRAM_NAME = "example-client";     // Unique name for this program
    
    // Generate the deterministic key pair for this client
    const keyPair = DeterministicCrypto.generateKeyPair(
        MASTER_KEY,
        NAMESPACE,
        PROGRAM_NAME
    );
    
    /**
     * Decrypt a message that was encrypted for this client
     * 
     * @param {string} encryptedData - Base64-encoded encrypted data
     * @param {Uint8Array} senderPublicKey - The sender's public key
     * @returns {Object|null} Decrypted data as an object, or null if decryption fails
     */
    function decryptMessage(encryptedData, senderPublicKey) {
        return DeterministicCrypto.decrypt(
            encryptedData,
            senderPublicKey,
            keyPair.secretKey
        );
    }
    
    /**
     * Run the client program
     * This function would be modified based on your environment (browser vs Node.js)
     */
    function run() {
        // In a Node.js environment, you would use something like:
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        console.log("Deterministic Crypto Client");
        console.log("---------------------------");
        console.log(`Program: ${PROGRAM_NAME}`);
        console.log(`Public Key (Base64): ${nacl.util.encodeBase64(keyPair.publicKey)}`);
        console.log("\nWaiting for encrypted message (paste base64-encoded data):");
        
        rl.question("", (encryptedData) => {
            console.log("\nAttempting to decrypt message...");
            
            // For this example, we'll assume the sender is using a known key pair
            // In a real application, you might have multiple potential senders
            const senderKeyPair = DeterministicCrypto.generateKeyPair(
                MASTER_KEY,
                NAMESPACE,
                "example-server" // The sender's program name
            );
            
            const decrypted = decryptMessage(encryptedData, senderKeyPair.publicKey);
            
            if (decrypted) {
                console.log("\nDecryption successful!");
                console.log("Decrypted content:");
                console.log(JSON.stringify(decrypted, null, 2));
            } else {
                console.error("\nDecryption failed. Possible reasons:");
                console.error("- The message was not encrypted for this recipient");
                console.error("- The message was not encrypted by the expected sender");
                console.error("- The encrypted data is corrupted or invalid");
            }
            
            rl.close();
        });
    }
    
    // Public API
    return {
        keyPair: keyPair,
        publicKeyBase64: nacl.util.encodeBase64(keyPair.publicKey),
        decryptMessage: decryptMessage,
        run: run
    };
})();
