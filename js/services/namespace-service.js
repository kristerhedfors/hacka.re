/**
 * Namespace Service
 * Manages namespaces for storage isolation based on title/subtitle
 */

window.NamespaceService = (function() {
    // Constants
    const NAMESPACE_PREFIX = 'hackare_';
    const NAMESPACE_SUFFIX = '_namespace';
    const NAMESPACE_PATTERN = /^hackare_([A-Za-z0-9]{8})_namespace$/;
    
    // Base storage keys without namespace
    const BASE_STORAGE_KEYS = {
        API_KEY: 'api_key',
        MODEL: 'model',
        HISTORY: 'history',
        SYSTEM_PROMPT: 'system_prompt',
        SHARE_OPTIONS: 'share_options',
        BASE_URL: 'base_url',
        BASE_URL_PROVIDER: 'base_url_provider',
        TITLE: 'hackare_title',
        SUBTITLE: 'hackare_subtitle',
        DEBUG_MODE: 'debug_mode',
        THEME_MODE: 'theme_mode',
    };
    
    // Special keys that don't get namespaced (to avoid circular dependency)
    const NON_NAMESPACED_KEYS = [
        BASE_STORAGE_KEYS.TITLE,
        BASE_STORAGE_KEYS.SUBTITLE
    ];
    
    // State management
    const state = {
        // Previous namespace when it changes
        previous: {
            namespaceId: null,
            namespaceKey: null,
            namespaceHash: null
        },
        // Current namespace - will be updated when title/subtitle change
        current: {
            namespaceId: null,
            namespaceKey: null,
            namespaceHash: null
        },
        // Flag to track if the current master key was decrypted using the fallback namespace hash
        usingFallbackForMasterKey: false
    };
    
    // Helper functions
    function getSessionKey() {
        if (window.ShareManager && typeof window.ShareManager.getSessionKey === 'function') {
            return window.ShareManager.getSessionKey();
        }
        return null;
    }
    
    function addSystemMessage(message) {
        if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
            window.ChatManager.addSystemMessage(message);
        }
    }
    
    function getNamespaceStorageKey(namespaceId) {
        return `${NAMESPACE_PREFIX}${namespaceId}${NAMESPACE_SUFFIX}`;
    }
    
    // Core namespace operations
    /**
     * Store namespace data in localStorage
     * @param {string} namespaceId - The namespace ID
     * @param {string} namespaceHash - The namespace hash to encrypt and store
     * @param {string} masterKey - The master key for encryption
     */
    function storeNamespaceData(namespaceId, namespaceHash, masterKey) {
        try {
            const sessionKey = getSessionKey();
            const encryptionKey = sessionKey || namespaceHash;
            
            // Set the flag if we're using the namespace hash as fallback
            if (!sessionKey) {
                state.usingFallbackForMasterKey = true;
            }
            
            // Add a system message if available
            addSystemMessage(
                sessionKey 
                    ? `[CRYPTO] Using session key to encrypt namespace hash for ${namespaceId}`
                    : `[CRYPTO] FALLBACK: Using namespace hash to encrypt itself for ${namespaceId} (no session key available)`
            );
            
            // Store the encrypted hash in the namespace entry
            const encryptedData = EncryptionService.encrypt(namespaceHash, encryptionKey);
            const namespaceStorageKey = getNamespaceStorageKey(namespaceId);
            
            // Use dynamic storage based on storage type
            const storage = StorageTypeService ? StorageTypeService.getStorage() : localStorage;
            storage.setItem(namespaceStorageKey, encryptedData);
            
            // Store the master key in a separate entry
            const masterKeyStorageKey = CryptoUtils.getMasterKeyStorageKey(namespaceId);
            
            // Add a system message for master key encryption
            addSystemMessage(
                sessionKey 
                    ? `[CRYPTO] Using session key to encrypt master key for ${namespaceId}`
                    : `[CRYPTO] FALLBACK: Using namespace hash to encrypt master key for ${namespaceId} (no session key available)`
            );
            
            // Encrypt the master key with the session key or namespace hash
            const encryptedMasterKey = EncryptionService.encrypt(masterKey, encryptionKey);
            storage.setItem(masterKeyStorageKey, encryptedMasterKey);
        } catch (error) {
            console.error('Failed to store namespace data:', error);
        }
    }
    
    /**
     * Get the master key for a namespace
     * @param {string} namespaceId - The namespace ID
     * @param {string} namespaceHash - The namespace hash used as fallback encryption key
     * @returns {string|null} The master key or null if not found
     */
    function getMasterKey(namespaceId, namespaceHash) {
        try {
            const masterKeyStorageKey = CryptoUtils.getMasterKeyStorageKey(namespaceId);
            // Use dynamic storage based on storage type
            const storage = StorageTypeService ? StorageTypeService.getStorage() : localStorage;
            const encryptedMasterKey = storage.getItem(masterKeyStorageKey);
            
            if (!encryptedMasterKey) {
                addSystemMessage(`[CRYPTO] ERROR: No encrypted master key found for ${namespaceId}`);
                return null;
            }
            
            const sessionKey = getSessionKey();
            let masterKey = null;
            let decryptionMethod = null;
            
            // Try to decrypt with session key first
            if (sessionKey) {
                try {
                    addSystemMessage(`[CRYPTO] Attempting to decrypt master key with session key for ${namespaceId}`);
                    masterKey = EncryptionService.decrypt(encryptedMasterKey, sessionKey);
                    if (masterKey) {
                        decryptionMethod = 'SESSION_KEY';
                    }
                } catch (e) {
                    addSystemMessage(`[CRYPTO] Session key decryption failed for master key, trying namespace hash fallback`);
                }
            }
            
            // Fallback to namespace hash if session key didn't work or isn't available
            if (!masterKey) {
                try {
                    addSystemMessage(`[CRYPTO] FALLBACK: Attempting to decrypt master key with namespace hash for ${namespaceId}`);
                    masterKey = EncryptionService.decrypt(encryptedMasterKey, namespaceHash);
                    if (masterKey) {
                        decryptionMethod = 'NAMESPACE_HASH';
                    }
                } catch (e) {
                    addSystemMessage(`[CRYPTO] ERROR: Failed to decrypt master key with both session key and namespace hash`);
                    return null;
                }
            }
            
            // Add a success message if available
            if (masterKey) {
                const method = decryptionMethod === 'SESSION_KEY' ? 'session key' : 'namespace hash';
                addSystemMessage(`[CRYPTO] Successfully decrypted master key for ${namespaceId} using ${method}`);
            }
            
            // Set the flag if we used the namespace hash as fallback
            state.usingFallbackForMasterKey = (decryptionMethod === 'NAMESPACE_HASH');
            
            return masterKey;
        } catch (error) {
            console.error('Failed to get master key:', error);
            return null;
        }
    }
    
    /**
     * Get all namespace IDs from localStorage
     * @returns {Array<string>} Array of namespace IDs
     */
    function getAllNamespaceIds() {
        const namespaceIds = [];
        
        // Use dynamic storage based on storage type
        const storage = StorageTypeService ? StorageTypeService.getStorage() : localStorage;
        
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            const match = key && key.match(NAMESPACE_PATTERN);
            
            if (match) {
                namespaceIds.push(match[1]);
            }
        }
        
        return namespaceIds;
    }
    
    /**
     * Try to decrypt namespace with different keys
     * @param {string} encryptedData - The encrypted namespace data
     * @param {string} targetHash - The target namespace hash
     * @param {string} sessionKey - The session key (if available)
     * @returns {Object|null} Object with decryptedHash and decryptionMethod if successful
     */
    function tryDecryptNamespace(encryptedData, targetHash, sessionKey) {
        // First try with session key if available
        if (sessionKey) {
            try {
                const decryptedHash = EncryptionService.decrypt(encryptedData, sessionKey);
                if (decryptedHash === targetHash) {
                    return { decryptedHash, decryptionMethod: 'SESSION_KEY' };
                }
            } catch (e) {
                // Session key didn't work, will try namespace hash next
            }
        }
        
        // Try with namespace hash
        try {
            const decryptedHash = EncryptionService.decrypt(encryptedData, targetHash);
            if (decryptedHash === targetHash) {
                return { decryptedHash, decryptionMethod: 'NAMESPACE_HASH' };
            }
        } catch (e) {
            // Namespace hash didn't work either
        }
        
        return null;
    }
    
    /**
     * Find existing namespace for the current title/subtitle
     * @param {string} title - The title
     * @param {string} subtitle - The subtitle
     * @returns {Object|null} Object with namespaceId, namespaceHash, and masterKey if found, null otherwise
     */
    function findExistingNamespace(title, subtitle) {
        const targetHash = CryptoUtils.generateNamespaceHash(title, subtitle);
        const sessionKey = getSessionKey();
        
        addSystemMessage(`[CRYPTO] Searching for namespace with hash: ${targetHash.substring(0, 8)}...`);
        
        const namespaceIds = getAllNamespaceIds();
        
        // Try to decrypt each namespace entry
        for (const namespaceId of namespaceIds) {
            try {
                const namespaceStorageKey = getNamespaceStorageKey(namespaceId);
                // Use dynamic storage based on storage type
                const storage = StorageTypeService ? StorageTypeService.getStorage() : localStorage;
                const encryptedData = storage.getItem(namespaceStorageKey);
                
                if (!encryptedData) {
                    continue;
                }
                
                const decryptResult = tryDecryptNamespace(encryptedData, targetHash, sessionKey);
                
                if (decryptResult) {
                    const method = decryptResult.decryptionMethod === 'SESSION_KEY' ? 'session key' : 'namespace hash';
                    addSystemMessage(`[CRYPTO] Found namespace ${namespaceId} using ${method}`);
                    
                    // Get the namespace master key
                    const masterKey = getMasterKey(namespaceId, targetHash);
                    
                    if (!masterKey) {
                        addSystemMessage(`[CRYPTO] ERROR: Found namespace ${namespaceId} but master key is missing`);
                        continue;
                    }
                    
                    return {
                        namespaceId: namespaceId,
                        namespaceHash: targetHash,
                        masterKey: masterKey
                    };
                }
            } catch (error) {
                // Decryption failed, try the next namespace
                continue;
            }
        }
        
        // No matching namespace found
        addSystemMessage(`[CRYPTO] No matching namespace found for title "${title}" and subtitle "${subtitle}"`);
        return null;
    }
    
    /**
     * Get or create namespace for the current title/subtitle
     * @returns {Object} Object with namespaceId, namespaceHash, and masterKey
     */
    function getOrCreateNamespace() {
        // If we already have a namespace, return it
        if (state.current.namespaceId && state.current.namespaceKey && state.current.namespaceHash) {
            return {
                namespaceId: state.current.namespaceId,
                namespaceHash: state.current.namespaceHash,
                masterKey: state.current.namespaceKey
            };
        }
        
        // Initialize storage type service if needed
        if (StorageTypeService && !StorageTypeService.isInitialized) {
            StorageTypeService.init();
        }
        
        // Check if we're using a shared link
        if (StorageTypeService && StorageTypeService.isUsingLocalStorage()) {
            // For shared links, use namespace from hash of encrypted blob
            const sharedLinkNamespace = StorageTypeService.getSharedLinkNamespace();
            if (sharedLinkNamespace) {
                addSystemMessage(`[CRYPTO] Using shared link namespace: ${sharedLinkNamespace}`);
                
                // Create a simple namespace for shared links
                state.current.namespaceId = sharedLinkNamespace;
                state.current.namespaceHash = sharedLinkNamespace; // Use namespace ID as hash for simplicity
                state.current.namespaceKey = CryptoUtils.generateSecretKey(); // Generate a new key
                
                return {
                    namespaceId: state.current.namespaceId,
                    namespaceHash: state.current.namespaceHash,
                    masterKey: state.current.namespaceKey
                };
            }
        }
        
        // For direct entry (sessionStorage) or fallback
        if (StorageTypeService && StorageTypeService.isUsingSessionStorage()) {
            // Use default namespace for sessionStorage
            const defaultNamespace = StorageTypeService.getDefaultNamespace();
            addSystemMessage(`[CRYPTO] Using default session namespace: ${defaultNamespace}`);
            
            state.current.namespaceId = defaultNamespace;
            state.current.namespaceHash = defaultNamespace; // Use namespace ID as hash for simplicity
            state.current.namespaceKey = CryptoUtils.generateSecretKey(); // Generate a new key
            
            return {
                namespaceId: state.current.namespaceId,
                namespaceHash: state.current.namespaceHash,
                masterKey: state.current.namespaceKey
            };
        }
        
        // Fallback to original logic if StorageTypeService is not available
        const storage = StorageTypeService ? StorageTypeService.getStorage() : sessionStorage;
        const title = storage.getItem(BASE_STORAGE_KEYS.TITLE) || "hacka.re";
        const subtitle = storage.getItem(BASE_STORAGE_KEYS.SUBTITLE) || "Free, open, för hackare av hackare";
        
        addSystemMessage(`[CRYPTO] Getting or creating namespace for title "${title}" and subtitle "${subtitle}"`);
        
        // Try to find an existing namespace
        const existingNamespace = findExistingNamespace(title, subtitle);
        if (existingNamespace) {
            // Use the existing namespace
            state.current.namespaceId = existingNamespace.namespaceId;
            state.current.namespaceHash = existingNamespace.namespaceHash;
            state.current.namespaceKey = existingNamespace.masterKey;
            
            addSystemMessage(`[CRYPTO] Using existing namespace: ${state.current.namespaceId}`);
        } else {
            // Create a new namespace
            addSystemMessage(`[CRYPTO] Creating new namespace for title "${title}" and subtitle "${subtitle}"`);
            
            const newNamespace = CryptoUtils.createNamespaceEntry(title, subtitle);
            state.current.namespaceId = newNamespace.namespaceId;
            state.current.namespaceHash = newNamespace.namespaceHash;
            state.current.namespaceKey = newNamespace.masterKey;
            
            // Store the new namespace data
            storeNamespaceData(state.current.namespaceId, state.current.namespaceHash, state.current.namespaceKey);
            
            addSystemMessage(`[CRYPTO] Created and stored new namespace: ${state.current.namespaceId}`);
        }
        
        return {
            namespaceId: state.current.namespaceId,
            namespaceHash: state.current.namespaceHash,
            masterKey: state.current.namespaceKey
        };
    }
    
    // Namespace access methods
    /**
     * Get the current namespace ID for storage keys
     * @returns {string} The namespace ID
     */
    function getNamespaceId() {
        return getOrCreateNamespace().namespaceId;
    }
    
    /**
     * Get the current namespace key for encryption/decryption
     * @returns {string} The namespace key
     */
    function getNamespaceKey() {
        const namespace = getOrCreateNamespace();
        return namespace ? namespace.masterKey : null;
    }
    
    /**
     * Get the current namespace based on title and subtitle (for backward compatibility)
     * @returns {string} The namespace ID
     */
    function getNamespace() {
        return getNamespaceId();
    }
    
    // State management methods
    /**
     * Reset the namespace cache when title or subtitle changes
     */
    function resetNamespaceCache() {
        // Store the current namespace before resetting
        if (state.current.namespaceId && state.current.namespaceKey && state.current.namespaceHash) {
            state.previous.namespaceId = state.current.namespaceId;
            state.previous.namespaceKey = state.current.namespaceKey;
            state.previous.namespaceHash = state.current.namespaceHash;
            
            addSystemMessage(`[CRYPTO] Storing previous namespace: ${state.current.namespaceId}`);
        }
        
        // Reset current namespace
        state.current.namespaceId = null;
        state.current.namespaceKey = null;
        state.current.namespaceHash = null;
        
        addSystemMessage(`[CRYPTO] Namespace cache reset, will create or find namespace on next access`);
    }
    
    // Previous namespace access methods
    /**
     * Get the previous namespace hash if available
     * @returns {string|null} The previous namespace hash or null if not available
     */
    function getPreviousNamespaceHash() {
        return state.previous.namespaceHash;
    }
    
    /**
     * Get the previous namespace ID if available
     * @returns {string|null} The previous namespace ID or null if not available
     */
    function getPreviousNamespaceId() {
        return state.previous.namespaceId;
    }
    
    /**
     * Get the previous namespace key if available
     * @returns {string|null} The previous namespace key or null if not available
     */
    function getPreviousNamespaceKey() {
        return state.previous.namespaceKey;
    }
    
    /**
     * Get the previous namespace if available (for backward compatibility)
     * @returns {string|null} The previous namespace or null if not available
     */
    function getPreviousNamespace() {
        return state.previous.namespaceId;
    }
    
    // Key management methods
    /**
     * Get the namespaced key for a storage item
     * @param {string} baseKey - The base key without namespace
     * @returns {string} The namespaced key
     */
    function getNamespacedKey(baseKey) {
        // Special keys don't get namespaced to avoid circular dependency
        if (NON_NAMESPACED_KEYS.includes(baseKey)) {
            return baseKey;
        }
        
        // Get the namespace ID (which is now just the 8 random characters)
        const namespaceId = getNamespaceId();
        
        // Format: hackare_namespaceid_variablename
        return `${NAMESPACE_PREFIX}${namespaceId}_${baseKey}`;
    }
    
    /**
     * Get all keys that need re-encryption when namespace changes
     * @param {string} oldNamespaceId - The old namespace ID
     * @returns {Array} Array of keys that need re-encryption
     */
    function getKeysToReEncrypt(oldNamespaceId) {
        const keysToReEncrypt = [];
        
        // Use dynamic storage based on storage type
        const storage = StorageTypeService ? StorageTypeService.getStorage() : localStorage;
        
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            
            // Skip special keys
            if (NON_NAMESPACED_KEYS.includes(key)) {
                continue;
            }
            
            // Include keys with the old namespace in the new format: hackare_namespaceid_variablename
            if (oldNamespaceId && key.startsWith(`${NAMESPACE_PREFIX}${oldNamespaceId}_`)) {
                keysToReEncrypt.push(key);
                continue;
            }
            
            // Include base keys without namespace if they should be encrypted
            const baseKey = Object.values(BASE_STORAGE_KEYS).find(baseKey => key === baseKey);
            if (baseKey && !NON_NAMESPACED_KEYS.includes(baseKey)) {
                keysToReEncrypt.push(key);
            }
        }
        
        return keysToReEncrypt;
    }
    
    /**
     * Check if the current master key was decrypted using the fallback namespace hash
     * @returns {boolean} True if the master key was decrypted using the fallback namespace hash
     */
    function isUsingFallbackForMasterKey() {
        return state.usingFallbackForMasterKey;
    }
    
    // Public API
    return {
        BASE_STORAGE_KEYS: BASE_STORAGE_KEYS,
        NON_NAMESPACED_KEYS: NON_NAMESPACED_KEYS,
        getNamespace: getNamespace,
        getNamespaceId: getNamespaceId,
        getNamespaceKey: getNamespaceKey,
        getPreviousNamespace: getPreviousNamespace,
        getPreviousNamespaceId: getPreviousNamespaceId,
        getPreviousNamespaceKey: getPreviousNamespaceKey,
        getPreviousNamespaceHash: getPreviousNamespaceHash,
        resetNamespaceCache: resetNamespaceCache,
        getNamespacedKey: getNamespacedKey,
        getKeysToReEncrypt: getKeysToReEncrypt,
        findExistingNamespace: findExistingNamespace,
        getMasterKey: getMasterKey,
        isUsingFallbackForMasterKey: isUsingFallbackForMasterKey
    };
})();
