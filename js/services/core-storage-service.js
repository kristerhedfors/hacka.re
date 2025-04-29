/**
 * Core Storage Service
 * Handles basic storage operations with encryption support
 */

window.CoreStorageService = (function() {
    // Keys that should not be encrypted
    const NON_ENCRYPTED_KEYS = [
        NamespaceService.BASE_STORAGE_KEYS.TITLE,
        NamespaceService.BASE_STORAGE_KEYS.SUBTITLE,
        EncryptionService.SALT_KEY,
        EncryptionService.ENCRYPTION_VERSION_KEY
    ];
    
    /**
     * Check if a key should be encrypted
     * @param {string} key - The key to check
     * @returns {boolean} True if the key should be encrypted
     */
    function shouldEncrypt(key) {
        return !NON_ENCRYPTED_KEYS.includes(key);
    }
    
    /**
     * Get the passphrase for encryption/decryption
     * @returns {string} The passphrase
     */
    function getPassphrase() {
        // Use the master key as the passphrase
        return NamespaceService.getNamespaceKey();
    }
    
    /**
     * Encrypt and store a value
     * @param {string} key - The key to store under
     * @param {*} value - The value to encrypt and store
     * @returns {boolean} True if successful
     */
    function secureSet(key, value) {
        try {
            const passphrase = getPassphrase();
            const encryptedValue = EncryptionService.encrypt(value, passphrase);
            localStorage.setItem(key, encryptedValue);
            return true;
        } catch (error) {
            console.error('Encryption failed for key:', {
                key: key,
                error: error.message,
                stack: error.stack,
                valueType: typeof value,
                valueIsArray: Array.isArray(value),
                valueLength: value ? (typeof value === 'string' ? value.length : JSON.stringify(value).length) : 0,
                passphraseLength: getPassphrase().length,
                namespace: NamespaceService.getNamespace(),
                salt: EncryptionService.getOrCreateSalt().substring(0, 5) + '...'
            });
            return false;
        }
    }
    
    /**
     * Retrieve and decrypt a value
     * @param {string} key - The key to retrieve
     * @returns {*} The decrypted value or null if not found/decryption fails
     */
    function secureGet(key) {
        const encryptedValue = localStorage.getItem(key);
        if (!encryptedValue) return null;
        
        try {
            const passphrase = getPassphrase();
            return EncryptionService.decrypt(encryptedValue, passphrase);
        } catch (error) {
            console.error('Exception during decryption:', {
                error: error.message,
                stack: error.stack,
                key: key,
                keyLength: key.length,
                encryptedValueLength: encryptedValue.length,
                passphraseLength: getPassphrase().length,
                namespace: NamespaceService.getNamespace(),
                salt: EncryptionService.getOrCreateSalt().substring(0, 5) + '...',
                storageItemCount: localStorage.length,
                encryptionVersion: localStorage.getItem(EncryptionService.ENCRYPTION_VERSION_KEY) || 'unknown'
            });
            return null;
        }
    }
    
    /**
     * Set a value in storage with optional encryption
     * @param {string} baseKey - The base key without namespace
     * @param {*} value - The value to store
     * @returns {boolean} True if successful
     */
    function setValue(baseKey, value) {
        const key = NamespaceService.getNamespacedKey(baseKey);
        
        if (shouldEncrypt(key)) {
            return secureSet(key, value);
        } else {
            try {
                // For non-encrypted values, stringify objects
                const valueToStore = typeof value === 'object' && value !== null 
                    ? JSON.stringify(value) 
                    : value;
                localStorage.setItem(key, valueToStore);
                return true;
            } catch (error) {
                console.error('Error storing value:', error);
                return false;
            }
        }
    }
    
    /**
     * Get a value from storage with optional decryption
     * @param {string} baseKey - The base key without namespace
     * @param {string} legacyKey - Optional legacy key to check if namespaced key not found
     * @param {Function} migrateFn - Optional function to migrate legacy value to namespaced key
     * @returns {*} The retrieved value or null if not found
     */
    function getValue(baseKey, legacyKey, migrateFn) {
        // Try to get from namespaced key first
        const key = NamespaceService.getNamespacedKey(baseKey);
        let value;
        
        if (shouldEncrypt(key)) {
            value = secureGet(key);
        } else {
            const rawValue = localStorage.getItem(key);
            
            // Try to parse JSON for non-encrypted values
            if (rawValue) {
                try {
                    value = JSON.parse(rawValue);
                } catch (e) {
                    // If parsing fails, it's probably a string
                    value = rawValue;
                }
            } else {
                value = null;
            }
        }
        
        // If not found and we're using a namespace, try the legacy key
        if (value === null && NamespaceService.getNamespace() !== "" && legacyKey) {
            let legacyValue;
            
            if (shouldEncrypt(legacyKey)) {
                legacyValue = secureGet(legacyKey);
            } else {
                const rawLegacyValue = localStorage.getItem(legacyKey);
                
                // Try to parse JSON for non-encrypted values
                if (rawLegacyValue) {
                    try {
                        legacyValue = JSON.parse(rawLegacyValue);
                    } catch (e) {
                        // If parsing fails, it's probably a string
                        legacyValue = rawLegacyValue;
                    }
                } else {
                    legacyValue = null;
                }
            }
            
            // If found in legacy storage, migrate it to the namespaced key
            if (legacyValue !== null && migrateFn) {
                migrateFn(legacyValue);
                return legacyValue;
            }
        }
        
        return value;
    }
    
    /**
     * Remove a value from storage
     * @param {string} baseKey - The base key without namespace
     * @returns {boolean} True if successful
     */
    function removeValue(baseKey) {
        try {
            const key = NamespaceService.getNamespacedKey(baseKey);
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing value:', error);
            return false;
        }
    }
    
    /**
     * Initialize the storage service
     */
    function init() {
        // Initialize encryption
        EncryptionService.initEncryption();
    }
    
    // Public API
    return {
        NON_ENCRYPTED_KEYS: NON_ENCRYPTED_KEYS,
        shouldEncrypt: shouldEncrypt,
        getPassphrase: getPassphrase,
        setValue: setValue,
        getValue: getValue,
        removeValue: removeValue,
        init: init
    };
})();
