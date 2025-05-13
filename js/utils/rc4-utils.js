/**
 * RC4 Encryption/Decryption Utilities
 * 
 * IMPORTANT: THIS IS PURE LLM-GENERATED CODE TO BE USED IN TESTING ONLY.
 * This code has not been validated or audited for security and should never
 * be used in production environments or for any sensitive data.
 * 
 * This module is specifically designed to be used as tools in tool calling LLM invocations
 * for testing the function calling capabilities of the hacka.re application.
 * 
 * This module provides functions for RC4 encryption and decryption.
 * RC4 is a symmetric stream cipher that uses a variable length key.
 * 
 * Note: RC4 is considered insecure for cryptographic purposes.
 * This implementation is for educational and testing purposes only.
 */

window.RC4Utils = (function() {
    /**
     * Initialize the RC4 key scheduling algorithm
     * @param {string} key - The encryption/decryption key
     * @returns {Array} The initialized state array
     */
    function initializeState(key) {
        // Convert key to array of bytes if it's a string
        const keyBytes = typeof key === 'string' 
            ? Array.from(key).map(c => c.charCodeAt(0))
            : key;
        
        // Initialize state array with values from 0 to 255
        const state = Array.from({ length: 256 }, (_, i) => i);
        
        // Key scheduling algorithm
        let j = 0;
        for (let i = 0; i < 256; i++) {
            j = (j + state[i] + keyBytes[i % keyBytes.length]) % 256;
            // Swap state[i] and state[j]
            [state[i], state[j]] = [state[j], state[i]];
        }
        
        return state;
    }
    
    /**
     * Generate the keystream for RC4
     * @param {Array} state - The initialized state array
     * @param {number} length - The length of the keystream to generate
     * @returns {Array} The keystream
     */
    function generateKeystream(state, length) {
        const keystream = [];
        let i = 0;
        let j = 0;
        
        // Create a copy of the state to avoid modifying the original
        const stateCopy = [...state];
        
        // Generate keystream
        for (let k = 0; k < length; k++) {
            i = (i + 1) % 256;
            j = (j + stateCopy[i]) % 256;
            
            // Swap stateCopy[i] and stateCopy[j]
            [stateCopy[i], stateCopy[j]] = [stateCopy[j], stateCopy[i]];
            
            // Generate keystream byte
            const t = (stateCopy[i] + stateCopy[j]) % 256;
            keystream.push(stateCopy[t]);
        }
        
        return keystream;
    }
    
    /**
     * Encrypt or decrypt data using RC4
     * @param {string} data - The data to encrypt/decrypt
     * @param {string} key - The encryption/decryption key
     * @returns {string} The encrypted/decrypted data as a hex string
     */
    function process(data, key) {
        // Convert data to array of bytes
        const dataBytes = typeof data === 'string'
            ? Array.from(data).map(c => c.charCodeAt(0))
            : data;
        
        // Initialize state
        const state = initializeState(key);
        
        // Generate keystream
        const keystream = generateKeystream(state, dataBytes.length);
        
        // XOR data with keystream
        const result = dataBytes.map((byte, index) => byte ^ keystream[index]);
        
        // Convert result to hex string
        return result.map(byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * Encrypt data using RC4
     * @param {string} plaintext - The plaintext to encrypt
     * @param {string} key - The encryption key
     * @returns {string} The encrypted data as a hex string
     */
    function encrypt(plaintext, key) {
        return process(plaintext, key);
    }
    
    /**
     * Decrypt data using RC4
     * @param {string} ciphertext - The ciphertext to decrypt (hex string)
     * @param {string} key - The decryption key
     * @returns {string} The decrypted data as a string
     */
    function decrypt(ciphertext, key) {
        // Convert hex string to array of bytes
        const ciphertextBytes = [];
        for (let i = 0; i < ciphertext.length; i += 2) {
            ciphertextBytes.push(parseInt(ciphertext.substr(i, 2), 16));
        }
        
        // Process the ciphertext
        const decryptedBytes = process(ciphertextBytes, key);
        
        // Convert decrypted bytes to string
        const decryptedChars = [];
        for (let i = 0; i < decryptedBytes.length; i += 2) {
            const byte = parseInt(decryptedBytes.substr(i, 2), 16);
            decryptedChars.push(String.fromCharCode(byte));
        }
        
        return decryptedChars.join('');
    }
    
    /**
     * Test the RC4 implementation with a known test vector
     * @returns {Object} Test result with success flag and details
     */
    function testImplementation() {
        // Test vector: Key = "Key", Plaintext = "Plaintext"
        // Expected ciphertext (in hex): BBF316E8D940AF0AD3
        const key = "Key";
        const plaintext = "Plaintext";
        const expectedHex = "bbf316e8d940af0ad3";
        
        try {
            const encrypted = encrypt(plaintext, key);
            const decrypted = decrypt(encrypted, key);
            
            const success = decrypted === plaintext;
            const matchesTestVector = encrypted.toLowerCase() === expectedHex;
            
            return {
                success: success,
                encryptionMatchesTestVector: matchesTestVector,
                key: key,
                plaintext: plaintext,
                encrypted: encrypted,
                decrypted: decrypted,
                expectedHex: expectedHex
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Public API
    return {
        encrypt,
        decrypt,
        testImplementation
    };
})();
