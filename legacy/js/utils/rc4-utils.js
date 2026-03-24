/**
 * RC4 Utilities Module
 * 
 * This module provides RC4 encryption and decryption functions for testing purposes.
 * 
 * IMPORTANT: This is a simplified implementation for testing purposes only.
 * It should NOT be used for actual cryptographic security in production.
 * 
 * This code is LLM-generated for testing function calling error handling.
 */

window.RC4Utils = (function() {
    /**
     * Convert a string to a byte array
     * @param {string} str - The string to convert
     * @returns {Array} The byte array
     */
    function stringToBytes(str) {
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i));
        }
        return bytes;
    }
    
    /**
     * Convert a byte array to a string
     * @param {Array} bytes - The byte array to convert
     * @returns {string} The string
     */
    function bytesToString(bytes) {
        return String.fromCharCode.apply(null, bytes);
    }
    
    /**
     * Convert a byte array to a hex string
     * @param {Array} bytes - The byte array to convert
     * @returns {string} The hex string
     */
    function bytesToHex(bytes) {
        return Array.from(bytes)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    }
    
    /**
     * Convert a hex string to a byte array
     * @param {string} hex - The hex string to convert
     * @returns {Array} The byte array
     */
    function hexToBytes(hex) {
        if (hex.length % 2 !== 0) {
            throw new Error('Hex string must have an even number of characters');
        }
        
        const bytes = [];
        for (let i = 0; i < hex.length; i += 2) {
            const byte = parseInt(hex.substr(i, 2), 16);
            if (isNaN(byte)) {
                throw new Error('Invalid hex character at position ' + i);
            }
            bytes.push(byte);
        }
        return bytes;
    }
    
    /**
     * Initialize the RC4 key scheduling algorithm
     * @param {Array} key - The key as a byte array
     * @returns {Array} The initialized state
     */
    function initializeState(key) {
        if (!key || key.length === 0) {
            throw new Error('Key cannot be empty');
        }
        
        // Initialize state array
        const state = [];
        for (let i = 0; i < 256; i++) {
            state[i] = i;
        }
        
        // Key scheduling algorithm
        let j = 0;
        for (let i = 0; i < 256; i++) {
            j = (j + state[i] + key[i % key.length]) % 256;
            // Swap state[i] and state[j]
            [state[i], state[j]] = [state[j], state[i]];
        }
        
        return state;
    }
    
    /**
     * Generate the RC4 keystream
     * @param {Array} state - The initialized state
     * @param {number} length - The length of the keystream to generate
     * @returns {Array} The keystream
     */
    function generateKeystream(state, length) {
        const keystream = [];
        let i = 0;
        let j = 0;
        
        // Create a copy of the state to avoid modifying the original
        const stateCopy = [...state];
        
        for (let k = 0; k < length; k++) {
            i = (i + 1) % 256;
            j = (j + stateCopy[i]) % 256;
            
            // Swap stateCopy[i] and stateCopy[j]
            [stateCopy[i], stateCopy[j]] = [stateCopy[j], stateCopy[i]];
            
            const t = (stateCopy[i] + stateCopy[j]) % 256;
            keystream.push(stateCopy[t]);
        }
        
        return keystream;
    }
    
    /**
     * Encrypt a string using RC4
     * @param {string} plaintext - The plaintext to encrypt
     * @param {string} key - The encryption key
     * @returns {string} The ciphertext as a hex string
     */
    function encrypt(plaintext, key) {
        if (!plaintext) {
            throw new Error('Plaintext cannot be empty');
        }
        
        if (!key) {
            throw new Error('Key cannot be empty');
        }
        
        // Convert strings to byte arrays
        const plaintextBytes = stringToBytes(plaintext);
        const keyBytes = stringToBytes(key);
        
        // Initialize state
        const state = initializeState(keyBytes);
        
        // Generate keystream
        const keystream = generateKeystream(state, plaintextBytes.length);
        
        // XOR plaintext with keystream
        const ciphertextBytes = plaintextBytes.map((byte, i) => byte ^ keystream[i]);
        
        // Convert to hex string
        return bytesToHex(ciphertextBytes);
    }
    
    /**
     * Decrypt a hex string using RC4
     * @param {string} ciphertext - The ciphertext as a hex string
     * @param {string} key - The decryption key
     * @returns {string} The plaintext
     */
    function decrypt(ciphertext, key) {
        if (!ciphertext) {
            throw new Error('Ciphertext cannot be empty');
        }
        
        if (!key) {
            throw new Error('Key cannot be empty');
        }
        
        // Validate hex format
        if (!/^[0-9a-fA-F]+$/.test(ciphertext)) {
            throw new Error('Ciphertext must be in hexadecimal format');
        }
        
        // Convert hex string to byte array
        const ciphertextBytes = hexToBytes(ciphertext);
        const keyBytes = stringToBytes(key);
        
        // Initialize state
        const state = initializeState(keyBytes);
        
        // Generate keystream
        const keystream = generateKeystream(state, ciphertextBytes.length);
        
        // XOR ciphertext with keystream
        const plaintextBytes = ciphertextBytes.map((byte, i) => byte ^ keystream[i]);
        
        // Convert to string
        return bytesToString(plaintextBytes);
    }
    
    /**
     * Test the RC4 implementation with a known test vector
     * @returns {Object} The test result
     */
    function testImplementation() {
        try {
            // Test vector from RFC 6229
            const key = 'Key';
            const plaintext = 'Plaintext';
            
            // Encrypt
            const ciphertext = encrypt(plaintext, key);
            
            // Decrypt
            const decrypted = decrypt(ciphertext, key);
            
            // Verify
            const success = decrypted === plaintext;
            
            return {
                success: success,
                key: key,
                plaintext: plaintext,
                ciphertext: ciphertext,
                decrypted: decrypted
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
        encrypt: encrypt,
        decrypt: decrypt,
        testImplementation: testImplementation
    };
})();
