/**
 * Storage Type Service
 * 
 * Determines whether to use sessionStorage or localStorage based on how the user
 * accesses the application. This service is critical for balancing privacy and functionality.
 * 
 * Storage Type Decision Logic:
 * - Direct visit (no hash) → sessionStorage (temporary, maximum privacy)
 * - Shared link (#gpt= or #shared=) → localStorage (persistent, for returning to conversations)
 * 
 * The storage type decision is LOCKED for the browser session to prevent data inconsistency.
 * Once determined, the storage type persists across page navigations within the same session.
 * 
 * @see NAMESPACE_GUIDE.md for detailed user documentation
 * @see CRYPTO_SPEC.md for technical implementation details
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
    let initialStorageType = null; // Store original decision
    let isInitialized = false;
    
    // Cache for the derived namespace hash
    let cachedNamespaceHash = null;
    let wasInitiallySharedLink = false; // Remember original context
    
    // Key to store the storage type decision across page navigations
    // This key is stored in sessionStorage to maintain consistency during the browser session
    const STORAGE_TYPE_KEY = '__hacka_re_storage_type__';
    
    /**
     * Initialize storage type detection
     * 
     * This function determines which storage type to use based on the entry method.
     * The decision is made once per browser session and locked to prevent inconsistencies.
     * 
     * Decision flow:
     * 1. Check if a decision was already made in this browser session
     * 2. If not, detect based on URL (shared link vs direct visit)
     * 3. Lock the decision by storing it in sessionStorage
     * 
     * The locking mechanism ensures that even if a user navigates from a shared link
     * to the direct URL (or vice versa), the storage type remains consistent.
     */
    function init() {
        if (isInitialized) {
            return; // Don't re-detect
        }
        
        // First check if we already have a storage type decision from this browser session
        // This ensures consistency across page navigations and prevents switching storage types
        // mid-session, which could lead to data loss or confusion
        const existingDecision = sessionStorage.getItem(STORAGE_TYPE_KEY);
        if (existingDecision) {
            storageType = existingDecision;
            initialStorageType = existingDecision;
            console.log(`[StorageTypeService] Restored previous decision - using ${existingDecision} (LOCKED)`);
            isInitialized = true;
            return;
        }
        
        // Store initial context
        wasInitiallySharedLink = hasSharedLink();
        
        // Detect storage type based on URL and lock it for the session
        if (wasInitiallySharedLink) {
            // User accessed via shared link - use localStorage for persistence
            // This allows returning to the conversation later
            storageType = STORAGE_TYPES.LOCAL;
            initialStorageType = STORAGE_TYPES.LOCAL; // Store original
            // Persist decision across page navigations
            sessionStorage.setItem(STORAGE_TYPE_KEY, STORAGE_TYPES.LOCAL);
            console.log('[StorageTypeService] Detected shared link - using localStorage (LOCKED)');
        } else {
            // User accessed directly - use sessionStorage for maximum privacy
            // All data will be cleared when the browser/tab is closed
            storageType = STORAGE_TYPES.SESSION;
            initialStorageType = STORAGE_TYPES.SESSION; // Store original
            // Persist decision across page navigations
            sessionStorage.setItem(STORAGE_TYPE_KEY, STORAGE_TYPES.SESSION);
            console.log('[StorageTypeService] Detected direct entry - using sessionStorage (LOCKED)');
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
     * 
     * Returns the locked storage type decision for this browser session.
     * This will always return the same value throughout the session,
     * regardless of URL changes.
     * 
     * @returns {string} The storage type ('localStorage' or 'sessionStorage')
     */
    function getStorageType() {
        if (!isInitialized) {
            init();
        }
        // Always return the initial decision, not the current detection
        // This ensures consistency throughout the browser session
        return initialStorageType || storageType;
    }
    
    /**
     * Get the appropriate storage object
     * 
     * Returns the actual storage object based on the locked storage type.
     * This is used by CoreStorageService and other services to persist data.
     * 
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
     * Get namespace for shared links (based on hash of keys and nonce)
     * 
     * For shared links, the namespace is derived from the decryption key, master key, and nonce.
     * This ensures that the same shared link always produces the same namespace,
     * allowing users to return to their conversations.
     * 
     * The namespace is the first 8 characters of sha512(decryptionKey+masterKey+nonce).
     * 
     * @returns {string|null} Namespace derived from keys, or null if no shared link or keys not available
     */
    function getSharedLinkNamespace() {
        if (!hasSharedLink()) {
            return null;
        }
        
        // If we have a cached namespace, return it
        if (cachedNamespaceHash) {
            return cachedNamespaceHash;
        }
        
        // Check if namespace was computed and stored by link-sharing-service
        if (window._sharedLinkNamespace) {
            cachedNamespaceHash = window._sharedLinkNamespace;
            return cachedNamespaceHash;
        }
        
        // No namespace available until keys are derived
        return null;
    }
    
    /**
     * Set the cached namespace hash (called by link-sharing-service after deriving keys)
     * @param {string} namespaceHash - The derived namespace hash
     */
    function setCachedNamespaceHash(namespaceHash) {
        cachedNamespaceHash = namespaceHash;
        window._sharedLinkNamespace = namespaceHash;
        console.log('[StorageTypeService] Namespace hash cached:', namespaceHash);
    }
    
    /**
     * Get the default namespace for session storage
     * 
     * When using sessionStorage (direct visits), all data uses a fixed namespace.
     * This provides simplicity since sessionStorage is already isolated per tab/session.
     * 
     * @returns {string} Default hard-coded namespace 'default_session'
     */
    function getDefaultNamespace() {
        return DEFAULT_NAMESPACE;
    }
    
    /**
     * Get the appropriate namespace based on storage type
     * 
     * This is the main function that determines which namespace to use:
     * - localStorage: Dynamic namespace from shared link hash
     * - sessionStorage: Fixed 'default_session' namespace
     * 
     * @returns {string} The namespace to use for the current storage type
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
        setCachedNamespaceHash,
        getDefaultNamespace,
        getNamespace,
        // Testing methods
        _setStorageType,
        _reset
    };
})();