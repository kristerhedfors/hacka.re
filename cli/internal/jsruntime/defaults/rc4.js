/**
 * Encrypt a string using RC4 encryption
 * @description Encrypts plaintext using the RC4 stream cipher
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
}

/**
 * Decrypt a string using RC4 decryption
 * @description Decrypts ciphertext using the RC4 stream cipher
 * @param {string} ciphertext - The ciphertext to decrypt (hex format)
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
}