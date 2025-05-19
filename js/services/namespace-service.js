/**
 * Namespace Service
 * Manages namespaces for storage isolation based on title/subtitle
 */

window.NamespaceService = (function() {
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
        // Azure OpenAI specific keys
        AZURE_API_BASE: 'azure_api_base',
        AZURE_API_VERSION: 'azure_api_version',
        AZURE_DEPLOYMENT_NAME: 'azure_deployment_name'
    };
    
    // Special keys that don't get namespaced (to avoid circular dependency)
    const NON_NAMESPACED_KEYS = [
        BASE_STORAGE_KEYS.TITLE,
        BASE_STORAGE_KEYS.SUBTITLE
    ];
    
    // Store the previous namespace when it changes
    let previousNamespaceId = null;
    let previousNamespaceKey = null;
    let previousNamespaceHash = null;
    
    // Current namespace - will be updated when title/subtitle change
    let currentNamespaceId = null;
    let currentNamespaceKey = null;
    let currentNamespaceHash = null;
    
    // Flag to track if the current master key was decrypted using the fallback namespace hash
    let usingFallbackForMasterKey = false;
    
    /**
     * Store namespace data in localStorage
     * @param {string} namespaceId - The namespace ID
     * @param {string} namespaceHash - The namespace hash to encrypt and store
     * @param {string} masterKey - The master key for encryption
     */
    function storeNamespaceData(namespaceId, namespaceHash, masterKey) {
        try {
            // Get the session key from ShareManager if available
            let sessionKey = null;
            if (window.ShareManager && typeof window.ShareManager.getSessionKey === 'function') {
                sessionKey = window.ShareManager.getSessionKey();
            }
            
            // If no session key is available, use the namespace hash as fallback
            const encryptionKey = sessionKey || namespaceHash;
            
            // Set the flag if we're using the namespace hash as fallback
            if (!sessionKey) {
                usingFallbackForMasterKey = true;
            }
            
            // Debug logging
            console.log('[CRYPTO DEBUG] Storing namespace data:', {
                namespaceId: namespaceId,
                usingSessionKey: !!sessionKey,
                encryptionKeyType: sessionKey ? 'SESSION_KEY' : 'NAMESPACE_HASH',
                encryptionKeyLength: encryptionKey.length,
                namespaceHashLength: namespaceHash.length,
                usingFallbackForMasterKey: usingFallbackForMasterKey
            });
            
            // Add a system message if available
            if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
                const message = sessionKey 
                    ? `[CRYPTO] Using session key to encrypt namespace hash for ${namespaceId}`
                    : `[CRYPTO] FALLBACK: Using namespace hash to encrypt itself for ${namespaceId} (no session key available)`;
                window.ChatManager.addSystemMessage(message);
            }
            
            // Store the encrypted hash in the namespace entry
            // We use the session key (if available) or the hash itself as the encryption key
            const encryptedData = EncryptionService.encrypt(namespaceHash, encryptionKey);
            const namespaceStorageKey = `hackare_${namespaceId}_namespace`;
            localStorage.setItem(namespaceStorageKey, encryptedData);
            
            // Store the master key in a separate entry
            const masterKeyStorageKey = CryptoUtils.getMasterKeyStorageKey(namespaceId);
            
            // Debug logging for master key encryption
            console.log('[CRYPTO DEBUG] Storing master key:', {
                masterKeyStorageKey: masterKeyStorageKey,
                usingSessionKey: !!sessionKey,
                encryptionKeyType: sessionKey ? 'SESSION_KEY' : 'NAMESPACE_HASH'
            });
            
            // Add a system message for master key encryption
            if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
                const message = sessionKey 
                    ? `[CRYPTO] Using session key to encrypt master key for ${namespaceId}`
                    : `[CRYPTO] FALLBACK: Using namespace hash to encrypt master key for ${namespaceId} (no session key available)`;
                window.ChatManager.addSystemMessage(message);
            }
            
            // Encrypt the master key with the session key or namespace hash
            const encryptedMasterKey = EncryptionService.encrypt(masterKey, encryptionKey);
            localStorage.setItem(masterKeyStorageKey, encryptedMasterKey);
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
            const encryptedMasterKey = localStorage.getItem(masterKeyStorageKey);
            
            // Debug logging
            console.log('[CRYPTO DEBUG] Getting namespace master key:', {
                namespaceId: namespaceId,
                masterKeyStorageKey: masterKeyStorageKey,
                hasEncryptedMasterKey: !!encryptedMasterKey
            });
            
            if (!encryptedMasterKey) {
                console.log(`[CRYPTO DEBUG] No encrypted master key found for ${namespaceId}`);
                
                // Add a system message if available
                if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
                    window.ChatManager.addSystemMessage(`[CRYPTO] ERROR: No encrypted master key found for ${namespaceId}`);
                }
                
                return null;
            }
            
            // Get the session key from ShareManager if available
            let sessionKey = null;
            if (window.ShareManager && typeof window.ShareManager.getSessionKey === 'function') {
                sessionKey = window.ShareManager.getSessionKey();
            }
            
            // Debug logging
            console.log('[CRYPTO DEBUG] Decrypting master key:', {
                hasSessionKey: !!sessionKey,
                sessionKeyLength: sessionKey ? sessionKey.length : 0,
                namespaceHashLength: namespaceHash.length
            });
            
            let masterKey = null;
            let decryptionMethod = null;
            
            // Try to decrypt with session key first
            if (sessionKey) {
                try {
                    // Add a system message if available
                    if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
                        window.ChatManager.addSystemMessage(`[CRYPTO] Attempting to decrypt master key with session key for ${namespaceId}`);
                    }
                    
                    masterKey = EncryptionService.decrypt(encryptedMasterKey, sessionKey);
                    if (masterKey) {
                        decryptionMethod = 'SESSION_KEY';
                        console.log('[CRYPTO DEBUG] Successfully decrypted master key with session key');
                    }
                } catch (e) {
                    // Session key didn't work, will try namespace hash next
                    console.log('[CRYPTO DEBUG] Session key decryption failed:', e.message);
                    
                    // Add a system message if available
                    if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
                        window.ChatManager.addSystemMessage(`[CRYPTO] Session key decryption failed for master key, trying namespace hash fallback`);
                    }
                }
            }
            
            // Fallback to namespace hash if session key didn't work or isn't available
            if (!masterKey) {
                try {
                    // Add a system message if available
                    if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
                        window.ChatManager.addSystemMessage(`[CRYPTO] FALLBACK: Attempting to decrypt master key with namespace hash for ${namespaceId}`);
                    }
                    
                    masterKey = EncryptionService.decrypt(encryptedMasterKey, namespaceHash);
                    if (masterKey) {
                        decryptionMethod = 'NAMESPACE_HASH';
                        console.log('[CRYPTO DEBUG] Successfully decrypted master key with namespace hash');
                    }
                } catch (e) {
                    console.log('[CRYPTO DEBUG] Namespace hash decryption failed:', e.message);
                    
                    // Add a system message if available
                    if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
                        window.ChatManager.addSystemMessage(`[CRYPTO] ERROR: Failed to decrypt master key with both session key and namespace hash`);
                    }
                    
                    return null;
                }
            }
            
            // Add a success message if available
            if (masterKey && window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
                window.ChatManager.addSystemMessage(`[CRYPTO] Successfully decrypted master key for ${namespaceId} using ${decryptionMethod === 'SESSION_KEY' ? 'session key' : 'namespace hash'}`);
            }
            
            // Set the flag if we used the namespace hash as fallback
            usingFallbackForMasterKey = (decryptionMethod === 'NAMESPACE_HASH');
            
            return masterKey;
        } catch (error) {
            console.error('Failed to get master key:', error);
            return null;
        }
    }
    
    /**
     * Find existing namespace for the current title/subtitle
     * @param {string} title - The title
     * @param {string} subtitle - The subtitle
     * @returns {Object|null} Object with namespaceId, namespaceHash, and masterKey if found, null otherwise
     */
    function findExistingNamespace(title, subtitle) {
        const targetHash = CryptoUtils.generateNamespaceHash(title, subtitle);
        
        // Get the session key from ShareManager if available
        let sessionKey = null;
        if (window.ShareManager && typeof window.ShareManager.getSessionKey === 'function') {
            sessionKey = window.ShareManager.getSessionKey();
        }
        
        // Debug logging
        console.log('[CRYPTO DEBUG] Finding existing namespace:', {
            title: title,
            subtitle: subtitle,
            targetHashLength: targetHash.length,
            hasSessionKey: !!sessionKey,
            sessionKeyLength: sessionKey ? sessionKey.length : 0
        });
        
        // Add a system message if available
        if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
            window.ChatManager.addSystemMessage(`[CRYPTO] Searching for namespace with hash: ${targetHash.substring(0, 8)}...`);
        }
        
        // Find all namespace entries with the format "hackare_namespaceid_namespace"
        const namespaceKeys = [];
        const namespacePattern = /^hackare_([A-Za-z0-9]{8})_namespace$/;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const match = key && key.match(namespacePattern);
            
            if (match) {
                // Extract the namespace ID from the key
                const namespaceId = match[1];
                namespaceKeys.push(namespaceId);
            }
        }
        
        // Debug logging
        console.log('[CRYPTO DEBUG] Found namespace keys:', {
            count: namespaceKeys.length,
            keys: namespaceKeys
        });
        
        // Try to decrypt each namespace entry
        for (const namespaceId of namespaceKeys) {
            try {
                const namespaceStorageKey = `hackare_${namespaceId}_namespace`;
                const encryptedData = localStorage.getItem(namespaceStorageKey);
                if (!encryptedData) {
                    console.log(`[CRYPTO DEBUG] No encrypted data for ${namespaceId}`);
                    continue;
                }
                
                let decryptedHash = null;
                let decryptionMethod = null;
                
                // First try with session key if available
                if (sessionKey) {
                    try {
                        decryptedHash = EncryptionService.decrypt(encryptedData, sessionKey);
                        if (decryptedHash === targetHash) {
                            decryptionMethod = 'SESSION_KEY';
                        }
                    } catch (e) {
                        // Session key didn't work, will try namespace hash next
                        console.log(`[CRYPTO DEBUG] Session key decryption failed for ${namespaceId}:`, e.message);
                    }
                }
                
                // If session key didn't work or isn't available, try with namespace hash
                if (!decryptedHash || decryptedHash !== targetHash) {
                    try {
                        decryptedHash = EncryptionService.decrypt(encryptedData, targetHash);
                        if (decryptedHash === targetHash) {
                            decryptionMethod = 'NAMESPACE_HASH';
                        }
                    } catch (e) {
                        // Namespace hash didn't work either
                        console.log(`[CRYPTO DEBUG] Namespace hash decryption failed for ${namespaceId}:`, e.message);
                        continue;
                    }
                }
                
                // If decryption succeeds and the hash matches, we found our namespace
                if (decryptedHash === targetHash) {
                    // Debug logging
                    console.log('[CRYPTO DEBUG] Found matching namespace:', {
                        namespaceId: namespaceId,
                        decryptionMethod: decryptionMethod
                    });
                    
                    // Add a system message if available
                    if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
                        window.ChatManager.addSystemMessage(`[CRYPTO] Found namespace ${namespaceId} using ${decryptionMethod === 'SESSION_KEY' ? 'session key' : 'namespace hash'}`);
                    }
                    
                    // Get the namespace master key
                    const masterKey = getMasterKey(namespaceId, targetHash);
                    
                    if (!masterKey) {
                        console.error('[CRYPTO DEBUG] Found namespace but master key is missing');
                        
                        // Add a system message if available
                        if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
                            window.ChatManager.addSystemMessage(`[CRYPTO] ERROR: Found namespace ${namespaceId} but master key is missing`);
                        }
                        
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
                console.log(`[CRYPTO DEBUG] Error processing namespace ${namespaceId}:`, error.message);
                continue;
            }
        }
        
        // No matching namespace found
        console.log('[CRYPTO DEBUG] No matching namespace found');
        
        // Add a system message if available
        if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
            window.ChatManager.addSystemMessage(`[CRYPTO] No matching namespace found for title "${title}" and subtitle "${subtitle}"`);
        }
        
        return null;
    }
    
    /**
     * Get or create namespace for the current title/subtitle
     * @returns {Object} Object with namespaceId, namespaceHash, and masterKey
     */
    function getOrCreateNamespace() {
        // Debug logging
        console.log('[CRYPTO DEBUG] Getting or creating namespace');
        
        // If we already have a namespace, return it
        if (currentNamespaceId && currentNamespaceKey && currentNamespaceHash) {
            console.log('[CRYPTO DEBUG] Using cached namespace:', {
                namespaceId: currentNamespaceId,
                namespaceHashLength: currentNamespaceHash.length,
                masterKeyLength: currentNamespaceKey.length
            });
            
            return {
                namespaceId: currentNamespaceId,
                namespaceHash: currentNamespaceHash,
                masterKey: currentNamespaceKey
            };
        }
        
        // Get title and subtitle directly from sessionStorage to avoid circular dependency
        const title = sessionStorage.getItem(BASE_STORAGE_KEYS.TITLE) || "hacka.re";
        const subtitle = sessionStorage.getItem(BASE_STORAGE_KEYS.SUBTITLE) || "Free, open, för hackare av hackare";
        
        console.log('[CRYPTO DEBUG] Looking up namespace for:', {
            title: title,
            subtitle: subtitle
        });
        
        // Add a system message if available
        if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
            window.ChatManager.addSystemMessage(`[CRYPTO] Getting or creating namespace for title "${title}" and subtitle "${subtitle}"`);
        }
        
        // Try to find an existing namespace
        const existingNamespace = findExistingNamespace(title, subtitle);
        if (existingNamespace) {
            // Use the existing namespace
            currentNamespaceId = existingNamespace.namespaceId;
            currentNamespaceHash = existingNamespace.namespaceHash;
            currentNamespaceKey = existingNamespace.masterKey;
            
            console.log('[CRYPTO DEBUG] Using existing namespace:', {
                namespaceId: currentNamespaceId,
                namespaceHashLength: currentNamespaceHash.length,
                masterKeyLength: currentNamespaceKey.length
            });
            
            // Add a system message if available
            if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
                window.ChatManager.addSystemMessage(`[CRYPTO] Using existing namespace: ${currentNamespaceId}`);
            }
        } else {
            // Create a new namespace
            console.log('[CRYPTO DEBUG] No existing namespace found, creating new one');
            
            // Add a system message if available
            if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
                window.ChatManager.addSystemMessage(`[CRYPTO] Creating new namespace for title "${title}" and subtitle "${subtitle}"`);
            }
            
            const newNamespace = CryptoUtils.createNamespaceEntry(title, subtitle);
            currentNamespaceId = newNamespace.namespaceId;
            currentNamespaceHash = newNamespace.namespaceHash;
            currentNamespaceKey = newNamespace.masterKey;
            
            console.log('[CRYPTO DEBUG] Created new namespace:', {
                namespaceId: currentNamespaceId,
                namespaceHashLength: currentNamespaceHash.length,
                masterKeyLength: currentNamespaceKey.length
            });
            
            // Store the new namespace data
            storeNamespaceData(currentNamespaceId, currentNamespaceHash, currentNamespaceKey);
            
            // Add a system message if available
            if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
                window.ChatManager.addSystemMessage(`[CRYPTO] Created and stored new namespace: ${currentNamespaceId}`);
            }
        }
        
        return {
            namespaceId: currentNamespaceId,
            namespaceHash: currentNamespaceHash,
            masterKey: currentNamespaceKey
        };
    }
    
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
    
    /**
     * Reset the namespace cache when title or subtitle changes
     */
    function resetNamespaceCache() {
        console.log('[CRYPTO DEBUG] Resetting namespace cache');
        
        // Store the current namespace before resetting
        if (currentNamespaceId && currentNamespaceKey && currentNamespaceHash) {
            console.log('[CRYPTO DEBUG] Storing previous namespace:', {
                namespaceId: currentNamespaceId,
                namespaceHashLength: currentNamespaceHash.length,
                masterKeyLength: currentNamespaceKey.length
            });
            
            previousNamespaceId = currentNamespaceId;
            previousNamespaceKey = currentNamespaceKey;
            previousNamespaceHash = currentNamespaceHash;
            
            // Add a system message if available
            if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
                window.ChatManager.addSystemMessage(`[CRYPTO] Storing previous namespace: ${currentNamespaceId}`);
            }
        } else {
            console.log('[CRYPTO DEBUG] No current namespace to store as previous');
        }
        
        // Reset current namespace
        currentNamespaceId = null;
        currentNamespaceKey = null;
        currentNamespaceHash = null;
        
        console.log('[CRYPTO DEBUG] Namespace cache reset');
        
        // Add a system message if available
        if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
            window.ChatManager.addSystemMessage(`[CRYPTO] Namespace cache reset, will create or find namespace on next access`);
        }
    }
    
    /**
     * Get the previous namespace hash if available
     * @returns {string|null} The previous namespace hash or null if not available
     */
    function getPreviousNamespaceHash() {
        return previousNamespaceHash;
    }
    
    /**
     * Get the previous namespace ID if available
     * @returns {string|null} The previous namespace ID or null if not available
     */
    function getPreviousNamespaceId() {
        return previousNamespaceId;
    }
    
    /**
     * Get the previous namespace key if available
     * @returns {string|null} The previous namespace key or null if not available
     */
    function getPreviousNamespaceKey() {
        return previousNamespaceKey;
    }
    
    /**
     * Get the previous namespace if available (for backward compatibility)
     * @returns {string|null} The previous namespace or null if not available
     */
    function getPreviousNamespace() {
        return previousNamespaceId;
    }
    
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
        return `hackare_${namespaceId}_${baseKey}`;
    }
    
    /**
     * Get all keys that need re-encryption when namespace changes
     * @param {string} oldNamespaceId - The old namespace ID
     * @returns {Array} Array of keys that need re-encryption
     */
    function getKeysToReEncrypt(oldNamespaceId) {
        const keysToReEncrypt = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            // Skip special keys
            if (NON_NAMESPACED_KEYS.includes(key)) {
                continue;
            }
            
            // Include keys with the old namespace in the new format: hackare_namespaceid_variablename
            if (oldNamespaceId && key.startsWith(`hackare_${oldNamespaceId}_`)) {
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
        return usingFallbackForMasterKey;
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
