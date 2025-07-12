/**
 * Storage Type Service
 * Manages storage type detection and configuration for different entry methods
 */

window.StorageTypeService = (function() {
    // Constants
    const STORAGE_TYPES = {
        LOCAL: 'localStorage',
        SESSION: 'sessionStorage'
    };
    
    const DEFAULT_NAMESPACE = 'default_session';
    
    // State
    let storageType = null;
    let isInitialized = false;
    
    /**
     * Initialize storage type detection
     */
    function init() {
        if (isInitialized) {
            return;
        }
        
        // Detect storage type based on URL
        if (hasSharedLink()) {
            storageType = STORAGE_TYPES.LOCAL;
            console.log('[StorageTypeService] Detected shared link - using localStorage');
        } else {
            storageType = STORAGE_TYPES.SESSION;
            console.log('[StorageTypeService] Detected direct entry - using sessionStorage');
        }
        
        isInitialized = true;
    }
    
    /**
     * Check if current URL contains a shared link
     * @returns {boolean} True if URL contains shared link data
     */
    function hasSharedLink() {
        const hash = window.location.hash;
        return hash.includes('#shared=') || hash.includes('#gpt=');
    }
    
    /**
     * Get the current storage type
     * @returns {string} The storage type ('localStorage' or 'sessionStorage')
     */
    function getStorageType() {
        if (!isInitialized) {
            init();
        }
        return storageType;
    }
    
    /**
     * Get the appropriate storage object
     * @returns {Storage} Either localStorage or sessionStorage
     */
    function getStorage() {
        const type = getStorageType();
        return type === STORAGE_TYPES.LOCAL ? localStorage : sessionStorage;
    }
    
    /**
     * Check if using localStorage
     * @returns {boolean} True if using localStorage
     */
    function isUsingLocalStorage() {
        return getStorageType() === STORAGE_TYPES.LOCAL;
    }
    
    /**
     * Check if using sessionStorage
     * @returns {boolean} True if using sessionStorage
     */
    function isUsingSessionStorage() {
        return getStorageType() === STORAGE_TYPES.SESSION;
    }
    
    /**
     * Get namespace for shared links (based on hash of encrypted blob)
     * @returns {string} Namespace derived from hash
     */
    function getSharedLinkNamespace() {
        if (!hasSharedLink()) {
            return null;
        }
        
        const hash = window.location.hash;
        let encryptedData = null;
        
        if (hash.includes('#gpt=')) {
            encryptedData = hash.split('#gpt=')[1];
        } else if (hash.includes('#shared=')) {
            encryptedData = hash.split('#shared=')[1];
        }
        
        if (!encryptedData) {
            return null;
        }
        
        // Create namespace from first 8 characters of hash of encrypted blob
        const dataHash = CryptoUtils.hashString(encryptedData);
        return dataHash.substring(0, 8);
    }
    
    /**
     * Get the default namespace for session storage
     * @returns {string} Default hard-coded namespace
     */
    function getDefaultNamespace() {
        return DEFAULT_NAMESPACE;
    }
    
    /**
     * Get the appropriate namespace based on storage type
     * @returns {string} The namespace to use
     */
    function getNamespace() {
        if (isUsingLocalStorage()) {
            return getSharedLinkNamespace();
        } else {
            return getDefaultNamespace();
        }
    }
    
    /**
     * Force storage type for testing
     * @param {string} type - Storage type to use
     */
    function _setStorageType(type) {
        storageType = type;
        isInitialized = true;
    }
    
    /**
     * Reset for testing
     */
    function _reset() {
        storageType = null;
        isInitialized = false;
    }
    
    // Public API
    return {
        STORAGE_TYPES,
        DEFAULT_NAMESPACE,
        init,
        hasSharedLink,
        getStorageType,
        getStorage,
        isUsingLocalStorage,
        isUsingSessionStorage,
        getSharedLinkNamespace,
        getDefaultNamespace,
        getNamespace,
        // Testing methods
        _setStorageType,
        _reset
    };
})();