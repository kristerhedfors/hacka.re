/**
 * Encryption Service
 * Handles encryption and decryption operations for secure storage
 */

window.EncryptionService = (function() {
    // Encryption-related constants
    const SALT_KEY = 'aihackare_encryption_salt';
    const ENCRYPTION_VERSION_KEY = 'aihackare_encryption_version';
    
    /**
     * Generate or retrieve salt for encryption
     * @returns {string} Base64-encoded salt
     */
    function getOrCreateSalt() {
        let salt = localStorage.getItem(SALT_KEY);
        if (!salt) {
            // Generate new salt using TweetNaCl
            const saltBytes = nacl.randomBytes(16);
            salt = nacl.util.encodeBase64(saltBytes);
            localStorage.setItem(SALT_KEY, salt);
            // Set initial encryption version
            localStorage.setItem(ENCRYPTION_VERSION_KEY, '1');
        }
        return salt;
    }
    
    /**
     * Encrypt data with the given passphrase
     * @param {*} data - The data to encrypt
     * @param {string} passphrase - The passphrase to use for encryption
     * @returns {string} The encrypted data as a string
     */
    function encrypt(data, passphrase) {
        try {
            return CryptoUtils.encryptData(data, passphrase);
        } catch (error) {
            console.error('Encryption failed:', {
                error: error.message,
                stack: error.stack,
                dataType: typeof data,
                dataIsArray: Array.isArray(data),
                dataLength: data ? (typeof data === 'string' ? data.length : JSON.stringify(data).length) : 0,
                passphraseLength: passphrase.length,
                salt: getOrCreateSalt().substring(0, 5) + '...'
            });
            throw error;
        }
    }
    
    /**
     * Decrypt data with the given passphrase
     * @param {string} encryptedData - The encrypted data as a string
     * @param {string} passphrase - The passphrase to use for decryption
     * @returns {*} The decrypted data or null if decryption fails
     */
    function decrypt(encryptedData, passphrase) {
        try {
            const decryptedValue = CryptoUtils.decryptData(encryptedData, passphrase);
            
            if (decryptedValue === null) {
                console.error('Decryption failed:', {
                    encryptedDataLength: encryptedData.length,
                    passphraseLength: passphrase.length,
                    passphraseFirstChar: passphrase.charAt(0),
                    passphraseLastChar: passphrase.charAt(passphrase.length - 1),
                    salt: getOrCreateSalt().substring(0, 5) + '...',
                    encryptionVersion: localStorage.getItem(ENCRYPTION_VERSION_KEY) || 'unknown'
                });
            }
            
            return decryptedValue;
        } catch (error) {
            console.error('Exception during decryption:', {
                error: error.message,
                stack: error.stack,
                encryptedDataLength: encryptedData.length,
                passphraseLength: passphrase.length,
                salt: getOrCreateSalt().substring(0, 5) + '...',
                encryptionVersion: localStorage.getItem(ENCRYPTION_VERSION_KEY) || 'unknown'
            });
            return null;
        }
    }
    
    /**
     * Initialize encryption system
     */
    function initEncryption() {
        // Just ensure salt is created
        getOrCreateSalt();
    }
    
    // Public API
    return {
        SALT_KEY: SALT_KEY,
        ENCRYPTION_VERSION_KEY: ENCRYPTION_VERSION_KEY,
        getOrCreateSalt: getOrCreateSalt,
        encrypt: encrypt,
        decrypt: decrypt,
        initEncryption: initEncryption
    };
})();
