/**
 * RC4 Encryption Default Functions
 * Provides RC4 encryption and decryption functions as default functions
 */

window.RC4EncryptionFunctions = {
    id: 'rc4-encryption',
    name: 'RC4 Encryption',
    description: 'RC4 encryption and decryption functions for testing purposes',
    groupId: 'rc4-encryption-group',
    functions: [
        {
            name: 'rc4_encrypt',
            code: `/**
 * Encrypt a string using RC4 encryption
 * @description Encrypts plaintext using the RC4 stream cipher. Returns the ciphertext as a hexadecimal string.
 * @param {string} plaintext - The plaintext to encrypt
 * @param {string} key - The encryption key
 * @returns {Object} Object containing the encrypted ciphertext or error
 * @callable
 */
function rc4_encrypt(plaintext, key) {
    try {
        if (!plaintext) {
            return { error: "Plaintext cannot be empty", success: false };
        }
        
        if (!key) {
            return { error: "Key cannot be empty", success: false };
        }
        
        // Use the RC4Utils module if available
        if (window.RC4Utils && typeof window.RC4Utils.encrypt === 'function') {
            const ciphertext = window.RC4Utils.encrypt(plaintext, key);
            return {
                success: true,
                ciphertext: ciphertext,
                algorithm: "RC4",
                format: "hex"
            };
        }
        
        // Fallback inline implementation
        const stringToBytes = (str) => {
            const bytes = [];
            for (let i = 0; i < str.length; i++) {
                bytes.push(str.charCodeAt(i));
            }
            return bytes;
        };
        
        const bytesToHex = (bytes) => {
            return Array.from(bytes)
                .map(byte => byte.toString(16).padStart(2, '0'))
                .join('');
        };
        
        // Initialize RC4 state
        const keyBytes = stringToBytes(key);
        const state = [];
        for (let i = 0; i < 256; i++) {
            state[i] = i;
        }
        
        // Key scheduling algorithm
        let j = 0;
        for (let i = 0; i < 256; i++) {
            j = (j + state[i] + keyBytes[i % keyBytes.length]) % 256;
            [state[i], state[j]] = [state[j], state[i]];
        }
        
        // Generate keystream and encrypt
        const plaintextBytes = stringToBytes(plaintext);
        const ciphertextBytes = [];
        let i = 0;
        j = 0;
        
        for (let k = 0; k < plaintextBytes.length; k++) {
            i = (i + 1) % 256;
            j = (j + state[i]) % 256;
            [state[i], state[j]] = [state[j], state[i]];
            
            const t = (state[i] + state[j]) % 256;
            const keyByte = state[t];
            ciphertextBytes.push(plaintextBytes[k] ^ keyByte);
        }
        
        const ciphertext = bytesToHex(ciphertextBytes);
        
        return {
            success: true,
            ciphertext: ciphertext,
            algorithm: "RC4",
            format: "hex"
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Encryption failed"
        };
    }
}`
        },
        {
            name: 'rc4_decrypt',
            code: `/**
 * Decrypt a string using RC4 decryption
 * @description Decrypts ciphertext (in hexadecimal format) using the RC4 stream cipher. Returns the original plaintext.
 * @param {string} ciphertext - The ciphertext to decrypt (in hexadecimal format)
 * @param {string} key - The decryption key
 * @returns {Object} Object containing the decrypted plaintext or error
 * @callable
 */
function rc4_decrypt(ciphertext, key) {
    try {
        if (!ciphertext) {
            return { error: "Ciphertext cannot be empty", success: false };
        }
        
        if (!key) {
            return { error: "Key cannot be empty", success: false };
        }
        
        // Validate hex format
        if (!/^[0-9a-fA-F]+$/.test(ciphertext)) {
            return { error: "Ciphertext must be in hexadecimal format", success: false };
        }
        
        // Use the RC4Utils module if available
        if (window.RC4Utils && typeof window.RC4Utils.decrypt === 'function') {
            const plaintext = window.RC4Utils.decrypt(ciphertext, key);
            return {
                success: true,
                plaintext: plaintext,
                algorithm: "RC4"
            };
        }
        
        // Fallback inline implementation
        const hexToBytes = (hex) => {
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
        };
        
        const bytesToString = (bytes) => {
            return String.fromCharCode.apply(null, bytes);
        };
        
        const stringToBytes = (str) => {
            const bytes = [];
            for (let i = 0; i < str.length; i++) {
                bytes.push(str.charCodeAt(i));
            }
            return bytes;
        };
        
        // Initialize RC4 state
        const keyBytes = stringToBytes(key);
        const state = [];
        for (let i = 0; i < 256; i++) {
            state[i] = i;
        }
        
        // Key scheduling algorithm
        let j = 0;
        for (let i = 0; i < 256; i++) {
            j = (j + state[i] + keyBytes[i % keyBytes.length]) % 256;
            [state[i], state[j]] = [state[j], state[i]];
        }
        
        // Generate keystream and decrypt
        const ciphertextBytes = hexToBytes(ciphertext);
        const plaintextBytes = [];
        let i = 0;
        j = 0;
        
        for (let k = 0; k < ciphertextBytes.length; k++) {
            i = (i + 1) % 256;
            j = (j + state[i]) % 256;
            [state[i], state[j]] = [state[j], state[i]];
            
            const t = (state[i] + state[j]) % 256;
            const keyByte = state[t];
            plaintextBytes.push(ciphertextBytes[k] ^ keyByte);
        }
        
        const plaintext = bytesToString(plaintextBytes);
        
        return {
            success: true,
            plaintext: plaintext,
            algorithm: "RC4"
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Decryption failed"
        };
    }
}`
        }
    ]
};