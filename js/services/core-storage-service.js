/**
 * Core Storage Service
 * Handles basic storage operations with encryption support
 */

window.CoreStorageService = (function() {
    // Keys that should not be encrypted
    const NON_ENCRYPTED_KEYS = [
        NamespaceService.BASE_STORAGE_KEYS.TITLE,
        NamespaceService.BASE_STORAGE_KEYS.SUBTITLE
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
        const key = NamespaceService.getNamespaceKey();
        if (!key) {
            // If no key is available, this usually means initialization isn't complete
            // Don't spam the console with errors, just return null
            return null;
        }
        return key;
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
            
            // If no passphrase is available, we can't encrypt yet
            if (!passphrase) {
                return false;
            }
            
            // Check if we're using a master key that was decrypted with the fallback namespace hash
            if (NamespaceService.isUsingFallbackForMasterKey && 
                typeof NamespaceService.isUsingFallbackForMasterKey === 'function' && 
                NamespaceService.isUsingFallbackForMasterKey()) {
                
                // Add a warning message if available
                if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
                    window.ChatManager.addSystemMessage(`[CRYPTO] WARNING: Encrypting data for key "${key}" using a master key that was decrypted with the fallback namespace hash of GPT title and subtitle`);
                }
                
                // Debug logging disabled
                // console.log('[CRYPTO DEBUG] Using master key decrypted with fallback namespace hash for encryption:', {
                //     key: key,
                //     valueType: typeof value
                // });
            }
            
            const encryptedValue = EncryptionService.encrypt(value, passphrase);
            // Use dynamic storage based on storage type
            const storage = StorageTypeService.getStorage();
            storage.setItem(key, encryptedValue);
            return true;
        } catch (error) {
            // Create error object with safe properties
            const errorInfo = {
                key: key,
                error: error.message,
                stack: error.stack,
                valueType: typeof value,
                valueIsArray: Array.isArray(value)
            };
            
            // Safely add length properties
            try {
                errorInfo.valueLength = value ? (typeof value === 'string' ? value.length : 0) : 0;
                if (typeof value === 'object' && value !== null) {
                    try {
                        const jsonStr = JSON.stringify(value);
                        errorInfo.jsonLength = jsonStr ? jsonStr.length : 0;
                    } catch (e) {
                        errorInfo.jsonError = e.message;
                    }
                }
                errorInfo.passphraseLength = getPassphrase() ? getPassphrase().length : 0;
                errorInfo.namespace = NamespaceService.getNamespace();
                // No salt information needed
            } catch (e) {
                errorInfo.metadataError = e.message;
            }
            
            console.error('Encryption failed for key:', errorInfo);
            return false;
        }
    }
    
    /**
     * Detect if a decryption failure might be expected due to cross-storage scenarios
     * @param {string} key - The storage key
     * @param {string} encryptedValue - The encrypted data
     * @returns {boolean} True if this might be an expected failure scenario
     */
    function detectCrossStorageScenario(key, encryptedValue) {
        try {
            // Check if there's data in the opposite storage that might indicate a cross-storage scenario
            if (StorageTypeService.isUsingSessionStorage()) {
                // Using sessionStorage - check if localStorage has ANY encrypted data for this key
                const localStorageValue = localStorage.getItem(key);
                if (localStorageValue) {
                    // There's data in localStorage for this key, which might have been from a previous session
                    // This is likely a cross-storage scenario
                    return true;
                }
            } else if (StorageTypeService.isUsingLocalStorage()) {
                // Using localStorage - check if sessionStorage has ANY encrypted data for this key
                const sessionStorageValue = sessionStorage.getItem(key);
                if (sessionStorageValue) {
                    // There's data in sessionStorage for this key
                    // This is likely a cross-storage scenario
                    return true;
                }
            }
            
            // Also check if this is early in the initialization where cross-storage issues are common
            // Keys that commonly have cross-storage issues during init
            const crossStorageProneKeys = [
                'js_functions', 'enabled_functions', 'function_collections', 
                'function_collection_metadata', 'openai_model', 'system_prompt',
                'base_url', 'base_url_provider', 'openai_api_key', 'chat_history',
                'function_tools_enabled', 'tool_calling_enabled', 'theme_mode'
            ];
            
            // Check if this key is one that commonly has cross-storage issues
            for (const proneKey of crossStorageProneKeys) {
                if (key.includes(proneKey)) {
                    // This is a key that commonly has cross-storage issues
                    // Check if we're in a cross-storage scenario by seeing if both storages have data
                    const hasLocalStorage = localStorage.length > 0;
                    const hasSessionStorage = sessionStorage.length > 0;
                    
                    // If both storages have data, we're likely in a cross-storage scenario
                    if (hasLocalStorage && hasSessionStorage) {
                        return true;
                    }
                }
            }
            
            return false;
        } catch (error) {
            // If we can't determine the scenario, err on the side of not suppressing errors
            return false;
        }
    }
    
    /**
     * Retrieve and decrypt a value
     * @param {string} key - The key to retrieve
     * @returns {*} The decrypted value or null if not found/decryption fails
     */
    function secureGet(key) {
        // Use dynamic storage based on storage type
        const storage = StorageTypeService.getStorage();
        const encryptedValue = storage.getItem(key);
        if (!encryptedValue) return null;
        
        try {
            const passphrase = getPassphrase();
            
            // If no passphrase is available, don't try to decrypt
            if (!passphrase) {
                // For shared links without session keys, we can't decrypt yet
                // Return null silently to avoid console spam
                return null;
            }
            
            // Check if we're using a master key that was decrypted with the fallback namespace hash
            if (NamespaceService.isUsingFallbackForMasterKey && 
                typeof NamespaceService.isUsingFallbackForMasterKey === 'function' && 
                NamespaceService.isUsingFallbackForMasterKey()) {
                
                // Add a warning message if available
                if (window.ChatManager && typeof window.ChatManager.addSystemMessage === 'function') {
                    window.ChatManager.addSystemMessage(`[CRYPTO] WARNING: Decrypting data for key "${key}" using a master key that was decrypted with the fallback namespace hash of GPT title and subtitle`);
                }
                
                // Debug logging disabled
                // console.log('[CRYPTO DEBUG] Using master key decrypted with fallback namespace hash for decryption:', {
                //     key: key,
                //     encryptedValueLength: encryptedValue ? encryptedValue.length : 0
                // });
            }
            
            // Detect if this might be a cross-storage decryption attempt
            // (sessionStorage trying to decrypt localStorage data or vice versa)
            const isExpectedFailure = detectCrossStorageScenario(key, encryptedValue);
            
            const result = EncryptionService.decrypt(encryptedValue, passphrase, isExpectedFailure);
            
            // If decryption failed and it was expected, log debug info instead of error
            if (result === null && isExpectedFailure) {
                // Silent handling of expected cross-storage decryption failures
                // Debug: console.debug(`[CoreStorageService] Expected decryption failure for cross-storage scenario: ${key} (using ${StorageTypeService.getStorageType()})`);
            } else if (result === null && !isExpectedFailure) {
                // This should be rare - unexpected decryption failure
                console.debug(`[CoreStorageService] Unexpected decryption failure for key: ${key} (using ${StorageTypeService.getStorageType()})`);
            }
            
            return result;
        } catch (error) {
            // Create error object with safe properties
            const errorInfo = {
                error: error.message,
                stack: error.stack,
                key: key
            };
            
            // Safely add length properties
            try {
                errorInfo.keyLength = key ? key.length : 0;
                errorInfo.encryptedValueLength = encryptedValue ? encryptedValue.length : 0;
                
                const passphrase = getPassphrase();
                errorInfo.passphraseLength = passphrase ? passphrase.length : 0;
                
                errorInfo.namespace = NamespaceService.getNamespace();
                
                errorInfo.storageItemCount = localStorage.length;
            } catch (e) {
                errorInfo.metadataError = e.message;
            }
            
            console.error('Exception during decryption:', errorInfo);
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
            // Debug logging
            if (window.DebugService && window.DebugService.debugLog) {
                window.DebugService.debugLog('crypto', `🔐 Encrypting ${baseKey} for secure storage in namespace: ${NamespaceService.getNamespace()}`);
            }
            
            return secureSet(key, value);
        } else {
            try {
                // For non-encrypted values, stringify objects
                const valueToStore = typeof value === 'object' && value !== null 
                    ? JSON.stringify(value) 
                    : value;
                // Use dynamic storage based on storage type
                const storage = StorageTypeService.getStorage();
                storage.setItem(key, valueToStore);
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
            // Debug logging
            if (window.DebugService && window.DebugService.debugLog) {
                window.DebugService.debugLog('crypto', `🔓 Decrypting ${baseKey} from secure storage in namespace: ${NamespaceService.getNamespace()}`);
            }
            
            value = secureGet(key);
        } else {
            // Use dynamic storage based on storage type
            const storage = StorageTypeService.getStorage();
            const rawValue = storage.getItem(key);
            
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
                // Debug logging
                if (window.DebugService && window.DebugService.debugLog) {
                    window.DebugService.debugLog('crypto', `🔓 Decrypting legacy ${baseKey} during namespace migration`);
                }
                
                legacyValue = secureGet(legacyKey);
            } else {
                // Use dynamic storage based on storage type
                const storage = StorageTypeService.getStorage();
                const rawLegacyValue = storage.getItem(legacyKey);
                
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
            // Use dynamic storage based on storage type
            const storage = StorageTypeService.getStorage();
            storage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing value:', error);
            return false;
        }
    }
    
    /**
     * Clear all data for the current namespace
     * This includes all encrypted storage keys, function tools, MCP data, prompts, and theme settings
     * @returns {Object} Object with success status and list of cleared keys
     */
    function clearAllData() {
        const currentNamespace = NamespaceService.getNamespace();
        const clearedKeys = [];
        
        try {
            // Define all encrypted storage keys that use NamespaceService.BASE_STORAGE_KEYS
            const coreStorageKeys = [
                NamespaceService.BASE_STORAGE_KEYS.API_KEY,
                NamespaceService.BASE_STORAGE_KEYS.MODEL,
                NamespaceService.BASE_STORAGE_KEYS.SYSTEM_PROMPT,
                NamespaceService.BASE_STORAGE_KEYS.SHARE_OPTIONS,
                NamespaceService.BASE_STORAGE_KEYS.BASE_URL,
                NamespaceService.BASE_STORAGE_KEYS.BASE_URL_PROVIDER,
                NamespaceService.BASE_STORAGE_KEYS.DEBUG_MODE,
                NamespaceService.BASE_STORAGE_KEYS.DEBUG_CATEGORIES,
                NamespaceService.BASE_STORAGE_KEYS.HISTORY,
                NamespaceService.BASE_STORAGE_KEYS.THEME_MODE,
                NamespaceService.BASE_STORAGE_KEYS.MODEL_LAST_UPDATED,
                NamespaceService.BASE_STORAGE_KEYS.PROVIDER_LAST_UPDATED,
                NamespaceService.BASE_STORAGE_KEYS.SAVED_AGENTS,
                NamespaceService.BASE_STORAGE_KEYS.AGENT_METADATA,
                NamespaceService.BASE_STORAGE_KEYS.ENABLED_AGENTS
            ];
            
            // Define encrypted storage keys handled by CoreStorageService directly
            const additionalEncryptedKeys = [
                'prompts',
                'selected_prompt_ids', 
                'selected_default_prompts',
                'mcp-oauth-tokens',
                'mcp-oauth-pending-flows',
                'mcp-oauth-configs',
                'mcp_github_token',
                'mcp_gmail_oauth',
                'shodan_api_key',
                'rag_regulations_data',
                'rag_regulations_metadata', 
                'rag_regulations_index',
                'voice_control_enabled',
                'mcp_share_link_enabled'
            ];
            
            // Define function tools storage keys (namespaced manually)
            const functionToolsKeys = [
                'function_tools_enabled',
                'js_functions',
                'enabled_functions',
                'function_collections',
                'function_collection_metadata',
                'tool_calling_enabled'
            ];
            
            // Get the appropriate storage based on storage type
            const storage = StorageTypeService ? StorageTypeService.getStorage() : localStorage;
            
            // Clear core storage keys using NamespaceService.getNamespacedKey
            coreStorageKeys.forEach(key => {
                const namespacedKey = NamespaceService.getNamespacedKey(key);
                storage.removeItem(namespacedKey);
                clearedKeys.push(namespacedKey);
                console.log(`Cleared core storage key: ${namespacedKey}`);
            });
            
            // Clear additional encrypted keys using manual namespacing
            additionalEncryptedKeys.forEach(key => {
                const namespacedKey = `hackare_${currentNamespace}_${key}`;
                storage.removeItem(namespacedKey);
                clearedKeys.push(namespacedKey);
                console.log(`Cleared encrypted key: ${namespacedKey}`);
            });
            
            // Clear function tools keys using manual namespacing
            functionToolsKeys.forEach(key => {
                const namespacedKey = `hackare_${currentNamespace}_${key}`;
                storage.removeItem(namespacedKey);
                clearedKeys.push(namespacedKey);
                console.log(`Cleared function tools key: ${namespacedKey}`);
            });
            
            // Clear namespace-related entries
            const namespaceKeys = [
                `hackare_${currentNamespace}_namespace`,
                `hackare_${currentNamespace}_master_key`
            ];
            
            namespaceKeys.forEach(key => {
                storage.removeItem(key);
                clearedKeys.push(key);
                console.log(`Cleared namespace key: ${key}`);
            });
            
            // Clear any additional keys that might have been missed
            // This handles any keys that were created with the namespace pattern
            const keysToRemove = [];
            const namespacePrefix = `hackare_${currentNamespace}_`;
            
            // Iterate through all storage keys
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                // Check if the key belongs to the current namespace
                if (key && key.startsWith(namespacePrefix)) {
                    keysToRemove.push(key);
                }
            }
            
            // Remove all found keys
            keysToRemove.forEach(key => {
                storage.removeItem(key);
                if (!clearedKeys.includes(key)) {
                    clearedKeys.push(key);
                    console.log(`Cleared additional ${storage === sessionStorage ? 'sessionStorage' : 'localStorage'} key: ${key}`);
                }
            });
            
            // Theme settings are now encrypted and namespaced, so they're cleared with other namespace keys
            
            // Clear MCP servers (stored globally) - always use localStorage for this
            localStorage.removeItem('hacka_re_mcp_servers');
            clearedKeys.push('hacka_re_mcp_servers');
            console.log('Cleared MCP servers: hacka_re_mcp_servers');
            
            // Clear any legacy non-namespaced voice_control_enabled if it exists
            storage.removeItem('voice_control_enabled');
            clearedKeys.push('voice_control_enabled (legacy)');
            console.log('Cleared legacy non-namespaced key: voice_control_enabled');
            
            // Clear system keys for the current namespace
            // These are critical session management keys that should be cleared when user requests full reset
            const sessionKeyStorageKey = `__hacka_re_session_key_${currentNamespace}`;
            if (storage.getItem(sessionKeyStorageKey)) {
                storage.removeItem(sessionKeyStorageKey);
                clearedKeys.push(sessionKeyStorageKey);
                console.log(`Cleared session key: ${sessionKeyStorageKey}`);
            }
            
            // Clear the storage type indicator
            const storageTypeKey = '__hacka_re_storage_type__';
            if (storage.getItem(storageTypeKey)) {
                storage.removeItem(storageTypeKey);
                clearedKeys.push(storageTypeKey);
                console.log(`Cleared storage type key: ${storageTypeKey}`);
            }
            
            // Reset the session key if ShareManager is available
            if (window.aiHackare && window.aiHackare.shareManager) {
                window.aiHackare.shareManager.setSessionKey(null);
                console.log('Reset session key via ShareManager');
            }
            
            // Reset Share Link MCP state if available
            if (window.MCPShareLinkUI && typeof window.MCPShareLinkUI.resetState === 'function') {
                window.MCPShareLinkUI.resetState();
                console.log('Reset Share Link MCP state');
            }
            
            return {
                success: true,
                clearedKeys: clearedKeys,
                message: `Cleared ${clearedKeys.length} storage keys for namespace ${currentNamespace}`
            };
            
        } catch (error) {
            console.error('Error clearing all data:', error);
            return {
                success: false,
                clearedKeys: clearedKeys,
                error: error.message,
                message: `Failed to clear all data: ${error.message}`
            };
        }
    }
    
    /**
     * Initialize the storage service
     */
    function init() {
        // Initialize storage type service
        if (StorageTypeService) {
            StorageTypeService.init();
        }
        
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
        clearAllData: clearAllData,
        init: init
    };
})();
