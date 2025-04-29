/**
 * Encryption Service
 * Handles encryption and decryption operations for secure storage
 */

window.EncryptionService = (function() {
    // Encryption-related constants
    const SALT_KEY = 'hackare_salt_encryption';
    const ENCRYPTION_VERSION_KEY = 'hackare_version_encryption';
    
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
            // Create error object with safe properties
            const errorInfo = {
                error: error.message,
                stack: error.stack,
                dataType: typeof data,
                dataIsArray: Array.isArray(data)
            };
            
            // Safely add length properties
            try {
                errorInfo.dataLength = data ? (typeof data === 'string' ? data.length : 0) : 0;
                if (typeof data === 'object' && data !== null) {
                    try {
                        const jsonStr = JSON.stringify(data);
                        errorInfo.jsonLength = jsonStr ? jsonStr.length : 0;
                    } catch (e) {
                        errorInfo.jsonError = e.message;
                    }
                }
                errorInfo.passphraseLength = passphrase ? passphrase.length : 0;
                
                const salt = getOrCreateSalt();
                errorInfo.salt = salt ? salt.substring(0, 5) + '...' : 'undefined';
            } catch (e) {
                errorInfo.metadataError = e.message;
            }
            
            console.error('Encryption failed:', errorInfo);
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
                // Create error object with safe properties
                const errorInfo = {
                    status: 'Decryption returned null'
                };
                
                // Safely add length properties
                try {
                    errorInfo.encryptedDataLength = encryptedData ? encryptedData.length : 0;
                    errorInfo.passphraseLength = passphrase ? passphrase.length : 0;
                    
                    if (passphrase) {
                        errorInfo.passphraseFirstChar = passphrase.charAt(0);
                        errorInfo.passphraseLastChar = passphrase.charAt(passphrase.length - 1);
                    }
                    
                    const salt = getOrCreateSalt();
                    errorInfo.salt = salt ? salt.substring(0, 5) + '...' : 'undefined';
                    
                    errorInfo.encryptionVersion = localStorage.getItem(ENCRYPTION_VERSION_KEY) || 'unknown';
                } catch (e) {
                    errorInfo.metadataError = e.message;
                }
                
                console.error('Decryption failed:', errorInfo);
            }
            
            return decryptedValue;
        } catch (error) {
            // Create error object with safe properties
            const errorInfo = {
                error: error.message,
                stack: error.stack
            };
            
            // Safely add length properties
            try {
                errorInfo.encryptedDataLength = encryptedData ? encryptedData.length : 0;
                errorInfo.passphraseLength = passphrase ? passphrase.length : 0;
                
                const salt = getOrCreateSalt();
                errorInfo.salt = salt ? salt.substring(0, 5) + '...' : 'undefined';
                
                errorInfo.encryptionVersion = localStorage.getItem(ENCRYPTION_VERSION_KEY) || 'unknown';
            } catch (e) {
                errorInfo.metadataError = e.message;
            }
            
            console.error('Exception during decryption:', errorInfo);
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
