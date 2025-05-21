/**
 * Deterministic Crypto Utilities
 * 
 * This library provides encryption/decryption functionality using TweetNaCl
 * with deterministic key generation based on a master key, namespace, and program name.
 * 
 * Both the sender and recipient use deterministic keys generated from the same inputs,
 * allowing for consistent encryption/decryption across different environments.
 */

window.DeterministicCrypto = (function() {
    // Constants
    const KEY_LENGTH = 32; // 32 bytes for keys
    const NONCE_LENGTH = nacl.box.nonceLength;
    
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
        const nonce = nacl.randomBytes(NONCE_LENGTH);
        
        // Encrypt the message using the recipient's public key and sender's secret key
        const ciphertext = nacl.box(
            messageBytes,
            nonce,
            recipientPublicKey,
            senderSecretKey
        );
        
        // Combine the nonce and ciphertext
        const fullMessage = new Uint8Array(
            NONCE_LENGTH + 
            ciphertext.length
        );
        
        // Add nonce
        fullMessage.set(nonce, 0);
        
        // Add ciphertext
        fullMessage.set(ciphertext, NONCE_LENGTH);
        
        // Convert to base64 for transmission
        return nacl.util.encodeBase64(fullMessage);
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
            const nonce = fullMessage.slice(0, NONCE_LENGTH);
            
            // Extract ciphertext
            const ciphertext = fullMessage.slice(NONCE_LENGTH);
            
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
    
    // Public API
    return {
        generateKeyPair: generateKeyPair,
        encrypt: encrypt,
        decrypt: decrypt
    };
})();
