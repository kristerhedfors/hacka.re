/**
 * Deterministic Crypto Server Example
 * 
 * This program demonstrates how to use the DeterministicCrypto library to encrypt
 * messages for a specific recipient using deterministic keys.
 * 
 * The server generates its own deterministic key pair and encrypts messages for
 * a client with a known deterministic key pair.
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
// // Include this server program
// eval(fs.readFileSync('js/examples/deterministic-crypto-server.js', 'utf8'));
// 
// // Run the server
// DeterministicCryptoServer.run();

window.DeterministicCryptoServer = (function() {
    // Configuration - these values would be set based on your application
    const MASTER_KEY = "your-master-key-here"; // Should be a strong, secret key
    const NAMESPACE = "your-gpt-namespace";    // Namespace of the current GPT
    const PROGRAM_NAME = "example-server";     // Unique name for this program
    
    // Generate the deterministic key pair for this server
    const keyPair = DeterministicCrypto.generateKeyPair(
        MASTER_KEY,
        NAMESPACE,
        PROGRAM_NAME
    );
    
    /**
     * Encrypt a message for a specific client
     * 
     * @param {Object} data - The data to encrypt (any JSON-serializable object)
     * @param {Uint8Array} recipientPublicKey - The recipient's public key
     * @returns {string} Base64-encoded encrypted data
     */
    function encryptMessage(data, recipientPublicKey) {
        return DeterministicCrypto.encrypt(
            data,
            recipientPublicKey,
            keyPair.secretKey
        );
    }
    
    /**
     * Get the client's public key based on its program name
     * 
     * @param {string} clientProgramName - The client's program name
     * @returns {Uint8Array} The client's public key
     */
    function getClientPublicKey(clientProgramName) {
        const clientKeyPair = DeterministicCrypto.generateKeyPair(
            MASTER_KEY,
            NAMESPACE,
            clientProgramName
        );
        return clientKeyPair.publicKey;
    }
    
    /**
     * Run the server program
     * This function would be modified based on your environment (browser vs Node.js)
     */
    function run() {
        // In a Node.js environment, you would use something like:
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        console.log("Deterministic Crypto Server");
        console.log("---------------------------");
        console.log(`Program: ${PROGRAM_NAME}`);
        console.log(`Public Key (Base64): ${nacl.util.encodeBase64(keyPair.publicKey)}`);
        
        // Get the client program name
        rl.question("\nEnter client program name (default: example-client): ", (clientProgramName) => {
            clientProgramName = clientProgramName || "example-client";
            
            // Get the client's public key
            const clientPublicKey = getClientPublicKey(clientProgramName);
            console.log(`\nClient Public Key (Base64): ${nacl.util.encodeBase64(clientPublicKey)}`);
            
            // Create a sample message
            rl.question("\nEnter a message to encrypt (JSON object): ", (messageStr) => {
                let message;
                try {
                    // Try to parse as JSON, or use as a simple string message
                    message = JSON.parse(messageStr);
                } catch (e) {
                    message = { text: messageStr || "Hello, this is a test message!" };
                }
                
                // Add a timestamp to the message
                message.timestamp = new Date().toISOString();
                
                // Encrypt the message for the client
                const encrypted = encryptMessage(message, clientPublicKey);
                
                console.log("\nMessage encrypted successfully!");
                console.log("\nEncrypted message (Base64):");
                console.log(encrypted);
                console.log("\nThis encrypted message can only be decrypted by the client program");
                console.log(`with the name "${clientProgramName}" using the same master key and namespace.`);
                
                rl.close();
            });
        });
    }
    
    // Public API
    return {
        keyPair: keyPair,
        publicKeyBase64: nacl.util.encodeBase64(keyPair.publicKey),
        encryptMessage: encryptMessage,
        getClientPublicKey: getClientPublicKey,
        run: run
    };
})();
