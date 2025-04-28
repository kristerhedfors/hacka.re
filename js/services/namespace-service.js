/**
 * Namespace Service
 * Manages namespaces for storage isolation based on title/subtitle
 */

window.NamespaceService = (function() {
    // Base storage keys without namespace
    const BASE_STORAGE_KEYS = {
        API_KEY: 'aihackare_api_key',
        MODEL: 'aihackare_model',
        HISTORY: 'aihackare_history',
        SYSTEM_PROMPT: 'aihackare_system_prompt',
        SHARE_OPTIONS: 'aihackare_share_options',
        BASE_URL: 'aihackare_base_url',
        BASE_URL_PROVIDER: 'aihackare_base_url_provider',
        TITLE: 'aihackare_title',
        SUBTITLE: 'aihackare_subtitle'
    };
    
    // Special keys that don't get namespaced (to avoid circular dependency)
    const NON_NAMESPACED_KEYS = [
        BASE_STORAGE_KEYS.TITLE,
        BASE_STORAGE_KEYS.SUBTITLE,
        EncryptionService.SALT_KEY,
        EncryptionService.ENCRYPTION_VERSION_KEY
    ];
    
    // Store the previous namespace when it changes
    let previousNamespace = null;
    
    // Current namespace - will be updated when title/subtitle change
    let currentNamespace = null;
    
    /**
     * Get the current namespace based on title and subtitle
     * @returns {string} The namespace prefix
     */
    function getNamespace() {
        // If we already calculated the namespace and have it cached, return it
        if (currentNamespace) {
            return currentNamespace;
        }
        
        // Get title and subtitle directly from localStorage to avoid circular dependency
        const title = localStorage.getItem(BASE_STORAGE_KEYS.TITLE) || "hacka.re";
        const subtitle = localStorage.getItem(BASE_STORAGE_KEYS.SUBTITLE) || "För hackare av hackare";
        
        // Generate and cache the namespace
        currentNamespace = CryptoUtils.generateNamespace(title, subtitle);
        return currentNamespace;
    }
    
    /**
     * Reset the namespace cache when title or subtitle changes
     */
    function resetNamespaceCache() {
        // Store the current namespace before resetting
        if (currentNamespace) {
            previousNamespace = currentNamespace;
        }
        currentNamespace = null;
    }
    
    /**
     * Get the previous namespace if available
     * @returns {string|null} The previous namespace or null if not available
     */
    function getPreviousNamespace() {
        return previousNamespace;
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
        
        // Add namespace suffix to all other keys
        return `${baseKey}_${getNamespace()}`;
    }
    
    /**
     * Get all keys that need re-encryption when namespace changes
     * @param {string} oldNamespace - The old namespace
     * @returns {Array} Array of keys that need re-encryption
     */
    function getKeysToReEncrypt(oldNamespace) {
        const keysToReEncrypt = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            // Skip special keys
            if (NON_NAMESPACED_KEYS.includes(key)) {
                continue;
            }
            
            // Include keys with the old namespace as suffix
            if (oldNamespace && key.endsWith(oldNamespace)) {
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
    
    // Public API
    return {
        BASE_STORAGE_KEYS: BASE_STORAGE_KEYS,
        NON_NAMESPACED_KEYS: NON_NAMESPACED_KEYS,
        getNamespace: getNamespace,
        getPreviousNamespace: getPreviousNamespace,
        resetNamespaceCache: resetNamespaceCache,
        getNamespacedKey: getNamespacedKey,
        getKeysToReEncrypt: getKeysToReEncrypt
    };
})();
