/**
 * Namespace Service
 * 
 * Manages namespaces for storage isolation and integrates with StorageTypeService
 * to handle both sessionStorage and localStorage scenarios.
 * 
 * Key responsibilities:
 * - Namespace creation and resolution based on title/subtitle
 * - Master key management for encryption
 * - Integration with StorageTypeService for proper storage backend
 * - Session cleanup for sessionStorage mode
 * - Fallback mechanisms for session key retrieval
 * 
 * Storage Type Integration:
 * - sessionStorage: Uses fixed 'default_session' namespace, performs cleanup
 * - localStorage: Uses dynamic namespaces from shared links, no cleanup
 * 
 * @see StorageTypeService for storage type determination
 * @see NAMESPACE_GUIDE.md for user documentation
 */

window.NamespaceService = (function() {
    // Cache for session key to prevent excessive lookups
    let sessionKeyCache = {
        key: null,
        timestamp: 0,
        TTL: 5000 // Cache for 5 seconds
    };
    
    // Cache for namespace data to prevent excessive computations
    let namespaceCache = {
        data: null,
        timestamp: 0,
        TTL: 5000 // Cache for 5 seconds
    };
    
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
        DEBUG_CATEGORIES: 'debug_categories',
        THEME_MODE: 'theme_mode',
        SAVED_AGENTS: 'saved_agents',
        AGENT_METADATA: 'agent_metadata',
        ENABLED_AGENTS: 'enabled_agents',
        MODEL_LAST_UPDATED: 'model_last_updated',
        PROVIDER_LAST_UPDATED: 'provider_last_updated',
    };
    
    // Special keys that don't get namespaced (to avoid circular dependency)
    const NON_NAMESPACED_KEYS = [
        // Removed title/subtitle as they are no longer used to avoid unencrypted localStorage entries
    ];
    
    // State management
    const state = {
        // Previous namespace when it changes
        previous: {
            namespaceId: null,
            masterKey: null,
            namespaceHash: null
        },
        // Current namespace - will be updated when title/subtitle change
        current: {
            namespaceId: null,
            masterKey: null,
            namespaceHash: null,
            isSharedLink: false  // Track if this namespace is from a shared link
        },
        // Flag to track if we're returning to an existing namespace vs creating new
        isReturningToExistingNamespace: false
    };
    
    // Flag to track if we've attempted session cleanup for this page load
    let hasAttemptedSessionCleanup = false;
    
    // Helper functions
    /**
     * Get the password for shared links (used to decrypt the share link payload)
     * For direct visits, this returns null as no password is needed
     * @returns {string|null} The password for shared links or null
     */
    function getSharedLinkPassword() {
        // Only relevant for shared links
        const hasSharedLink = window.location.hash && 
            (window.location.hash.includes('#gpt=') || window.location.hash.includes('#shared='));
        
        if (!hasSharedLink) {
            return null; // Direct visits don't have passwords
        }
        
        // Check cache first
        const now = Date.now();
        if (sessionKeyCache.key && (now - sessionKeyCache.timestamp) < sessionKeyCache.TTL) {
            return sessionKeyCache.key;
        }
        
        // Get password from ShareManager (memory only, never from storage)
        // Priority: aiHackare.shareManager over legacy ShareManager
        if (window.aiHackare && window.aiHackare.shareManager && 
            typeof window.aiHackare.shareManager.getSessionKey === 'function') {
            const password = window.aiHackare.shareManager.getSessionKey();
            if (password) {
                // Cache the result
                sessionKeyCache.key = password;
                sessionKeyCache.timestamp = now;
                return password;
            }
        }
        
        // Fallback to legacy ShareManager
        if (window.ShareManager && typeof window.ShareManager.getSessionKey === 'function') {
            const password = window.ShareManager.getSessionKey();
            if (password) {
                // Cache the result
                sessionKeyCache.key = password;
                sessionKeyCache.timestamp = now;
                return password;
            }
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
     * Store namespace data in the appropriate storage (localStorage or sessionStorage)
     * 
     * The namespace hash and master key are encrypted with either:
     * - User's session key (if available) - provides additional security
     * - Namespace hash itself (fallback) - ensures data is still accessible
     * 
     * @param {string} namespaceId - The namespace ID (8 random chars)
     * @param {string} namespaceHash - The namespace hash (SHA-256 of title+subtitle)
     * @param {string} masterKey - The master key for data encryption
     */
    function storeNamespaceData(namespaceId, namespaceHash, masterKey) {
        try {
            // For shared links with master key, don't store anything
            // The master key from the share link is the only key needed
            if (window._sharedLinkMasterKey) {
                addSystemMessage(`[CRYPTO] Using master key from share link - not storing to disk for security`);
                return;
            }
            
            // For direct visits (sessionStorage), the master key is already stored in plaintext
            // We don't need to store namespace data separately
            if (StorageTypeService && StorageTypeService.isUsingSessionStorage()) {
                addSystemMessage(`[CRYPTO] Direct visit - master key already in sessionStorage, no additional storage needed`);
                return;
            }
            
            // This function should not be called for any other scenario
            addSystemMessage(`[CRYPTO] WARNING: Unexpected call to storeNamespaceData - no storage needed`);
        } catch (error) {
            console.error('Failed to store namespace data:', error);
        }
    }
    
    /**
     * Get the master key for a namespace
     * @param {string} namespaceId - The namespace ID
     * @param {string} namespaceHash - The namespace hash (not used for decryption)
     * @returns {string|null} The master key or null if not found
     */
    function getMasterKey(namespaceId, namespaceHash) {
        try {
            // For shared links, use the master key from memory only (check all caches)
            const sharedLinkMasterKey = window._sharedLinkMasterKey || sharedLinkMasterKeyCache || (state.current.isSharedLink ? state.current.masterKey : null);
            if (sharedLinkMasterKey) {
                addSystemMessage(`[CRYPTO] Using master key from share link (memory only)`);
                // Update all caches to ensure consistency
                if (!window._sharedLinkMasterKey) window._sharedLinkMasterKey = sharedLinkMasterKey;
                if (!sharedLinkMasterKeyCache) sharedLinkMasterKeyCache = sharedLinkMasterKey;
                // If this is a shared link namespace, ensure the master key is set
                if (state.current.isSharedLink && !state.current.masterKey) {
                    state.current.masterKey = sharedLinkMasterKey;
                }
                return sharedLinkMasterKey;
            }
            
            // For direct visits, master key is stored in plaintext in sessionStorage
            if (StorageTypeService && StorageTypeService.isUsingSessionStorage()) {
                const defaultNamespace = StorageTypeService.getDefaultNamespace();
                const masterKeyStorageKey = `__hacka_re_master_key_${defaultNamespace}`;
                const masterKey = sessionStorage.getItem(masterKeyStorageKey);
                
                if (masterKey) {
                    addSystemMessage(`[CRYPTO] Retrieved master key from sessionStorage (direct visit)`);
                    return masterKey;
                }
                
                addSystemMessage(`[CRYPTO] No master key found in sessionStorage for ${namespaceId}`);
                return null;
            }
            
            // No other scenarios should reach here
            addSystemMessage(`[CRYPTO] No master key available - unexpected state`);
            return null;
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
     * Try to decrypt namespace with session key
     * @param {string} encryptedData - The encrypted namespace data
     * @param {string} targetHash - The target namespace hash
     * @param {string} sessionKey - The session key (if available)
     * @returns {Object|null} Object with decryptedHash and decryptionMethod if successful
     */
    function tryDecryptNamespace(encryptedData, targetHash, sessionKey) {
        // Only try with session key, no fallback
        if (!sessionKey) {
            return null;
        }
        
        try {
            // Debug logging
            if (window.DebugService && window.DebugService.debugLog) {
                window.DebugService.debugLog('crypto', `🔓 Attempting to decrypt namespace hash using session key`);
            }
            
            const decryptedHash = EncryptionService.decrypt(encryptedData, sessionKey);
            if (decryptedHash === targetHash) {
                return { decryptedHash, decryptionMethod: 'SESSION_KEY' };
            }
        } catch (e) {
            // Session key didn't work
        }
        
        return null;
    }
    
    /**
     * Find existing namespace by namespace hash (deprecated - no longer used)
     * @deprecated This function is no longer used as we don't rely on title/subtitle for namespacing
     * @param {string} title - The title (unused)
     * @param {string} subtitle - The subtitle (unused)
     * @returns {Object|null} Always returns null as this function is deprecated
     */
    function findExistingNamespace(title, subtitle) {
        // This function is deprecated to avoid title/subtitle dependencies
        // that create unencrypted localStorage entries
        addSystemMessage(`[CRYPTO] findExistingNamespace is deprecated - no longer searching by title/subtitle`);
        return null;
    }
    
    /**
     * Get or create namespace for the current context
     * 
     * This is the core function that determines namespace creation and retrieval.
     * The behavior differs significantly based on storage type:
     * 
     * SessionStorage Mode (Direct Visit):
     * - Always uses 'default_session' namespace
     * - Performs cleanup of encrypted data from previous sessions
     * - Generates random master key (or derives from session key if available)
     * - Data is temporary and cleared when browser/tab closes
     * 
     * LocalStorage Mode (Shared Link):
     * - Uses namespace derived from hash of encrypted blob in URL
     * - Checks for existing namespace to enable conversation continuity
     * - Derives master key from session key for consistency
     * - Data persists across browser sessions
     * 
     * @returns {Object} Object with namespaceId, namespaceHash, and masterKey
     */
    function getOrCreateNamespace() {
        // Check cache first
        const now = Date.now();
        if (namespaceCache.data && (now - namespaceCache.timestamp) < namespaceCache.TTL) {
            return namespaceCache.data;
        }
        
        // If we're waiting for a shared link password, delay namespace creation
        if (window._waitingForSharedLinkPassword) {
            // Only log once per second to reduce console spam
            if (!window._lastNamespaceWaitLog || now - window._lastNamespaceWaitLog > 1000) {
                console.log('[NamespaceService] Waiting for shared link password before creating namespace');
                window._lastNamespaceWaitLog = now;
            }
            // Return a temporary namespace that won't be used for encryption
            const tempResult = {
                namespaceId: 'temp_waiting',
                namespaceHash: 'temp_waiting',
                masterKey: null
            };
            // Don't cache the temporary result
            return tempResult;
        }
        // If we already have a namespace, return it
        if (state.current.namespaceId && state.current.masterKey && state.current.namespaceHash) {
            const result = {
                namespaceId: state.current.namespaceId,
                namespaceHash: state.current.namespaceHash,
                masterKey: state.current.masterKey
            };
            // Cache the result
            namespaceCache.data = result;
            namespaceCache.timestamp = now;
            return result;
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
                
                // For shared links, the master key should come from the share link payload
                // Store in all caches for redundancy
                if (window._sharedLinkMasterKey) {
                    // Store in all locations for redundancy
                    sharedLinkMasterKeyCache = window._sharedLinkMasterKey;
                    state.current.masterKey = window._sharedLinkMasterKey;
                    state.current.isSharedLink = true;
                    addSystemMessage(`[CRYPTO] Stored master key from share link for namespace ${sharedLinkNamespace}`);
                }
                const masterKey = getMasterKey(sharedLinkNamespace, sharedLinkNamespace);
                
                if (masterKey) {
                    // We have the master key (either from memory or was able to decrypt)
                    state.current.namespaceId = sharedLinkNamespace;
                    state.current.namespaceHash = sharedLinkNamespace;
                    state.current.masterKey = masterKey;
                    
                    // Check if we have existing data in localStorage for this namespace
                    // This indicates we're returning to an existing namespace
                    let hasExistingData = false;
                    try {
                        // Check if there's any data with this namespace prefix in localStorage
                        const namespacePrefix = `${sharedLinkNamespace}_`;
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key && key.startsWith(namespacePrefix)) {
                                hasExistingData = true;
                                break;
                            }
                        }
                    } catch (e) {
                        // If we can't check, assume it's a new namespace
                    }
                    
                    state.isReturningToExistingNamespace = hasExistingData;
                    
                    addSystemMessage(`[CRYPTO] Using master key for shared link namespace ${sharedLinkNamespace} (existing: ${hasExistingData})`);
                    
                    return {
                        namespaceId: state.current.namespaceId,
                        namespaceHash: state.current.namespaceHash,
                        masterKey: state.current.masterKey
                    };
                } else {
                    // No master key available - this means page was reloaded and we lost the key
                    // Return null namespace to indicate encryption is not available
                    addSystemMessage(`[CRYPTO] No master key available for shared link after reload - encryption disabled`);
                    state.current.namespaceId = sharedLinkNamespace;
                    state.current.namespaceHash = sharedLinkNamespace;
                    state.current.masterKey = null;
                    state.isReturningToExistingNamespace = false;
                    
                    return {
                        namespaceId: state.current.namespaceId,
                        namespaceHash: state.current.namespaceHash,
                        masterKey: null
                    };
                }
            }
        }
        
        // For direct entry (sessionStorage) or fallback
        if (StorageTypeService && StorageTypeService.isUsingSessionStorage()) {
            // Use default namespace for sessionStorage
            const defaultNamespace = StorageTypeService.getDefaultNamespace();
            
            // For direct visits, we store the master key in plaintext in sessionStorage
            // This is safe because sessionStorage is ephemeral and allows page reloads
            const masterKeyStorageKey = `__hacka_re_master_key_${defaultNamespace}`;
            let storedMasterKey = sessionStorage.getItem(masterKeyStorageKey);
            
            // Session cleanup for sessionStorage mode
            // When using sessionStorage, we need to ensure clean session boundaries.
            // This cleanup prevents encrypted data from previous sessions from causing
            // decryption errors or data confusion.
            // 
            // Note: This cleanup only happens once per page load and only affects
            // sessionStorage when in sessionStorage mode.
            if (!hasAttemptedSessionCleanup && sessionStorage.length > 0 && !storedMasterKey) {
                // Only clear if we don't have a master key (indicating a fresh session)
                // Check if there's any encrypted data that would fail to decrypt
                // We look for base64-encoded strings that are likely encrypted data
                // rather than normal application state
                const hasEncryptedData = Object.keys(sessionStorage).some(key => {
                    // Skip the master key itself and storage type key
                    if (key.startsWith('__hacka_re_master_key_') || key === '__hacka_re_storage_type__') {
                        return false;
                    }
                    const value = sessionStorage.getItem(key);
                    // Check if this looks like encrypted data (base64-like strings over certain length)
                    return value && value.length > 50 && /^[A-Za-z0-9+/=]+$/.test(value);
                });
                
                if (hasEncryptedData) {
                    // Clear all sessionStorage except session keys and storage type
                    // This ensures no data leakage between sessions when using sessionStorage
                    addSystemMessage(`[CRYPTO] Detected encrypted data from previous session - clearing old data`);
                    const keysToPreserve = [];
                    for (let i = 0; i < sessionStorage.length; i++) {
                        const key = sessionStorage.key(i);
                        if (key && (key.startsWith('__hacka_re_master_key_') || key === '__hacka_re_storage_type__')) {
                            keysToPreserve.push({ key, value: sessionStorage.getItem(key) });
                        }
                    }
                    sessionStorage.clear();
                    // Restore preserved keys
                    keysToPreserve.forEach(item => {
                        sessionStorage.setItem(item.key, item.value);
                    });
                    hasAttemptedSessionCleanup = true;
                } else {
                    hasAttemptedSessionCleanup = true;
                }
            }
            
            addSystemMessage(`[CRYPTO] Using default session namespace: ${defaultNamespace}`);
            
            state.current.namespaceId = defaultNamespace;
            state.current.namespaceHash = defaultNamespace; // Use namespace ID as hash for simplicity
            state.isReturningToExistingNamespace = false;
            
            // Check if we need to generate a new master key
            if (!storedMasterKey) {
                // Generate a new master key for this browser session
                state.current.masterKey = CryptoUtils.generateMasterKey();
                // Store it in plaintext in sessionStorage (safe for ephemeral storage)
                sessionStorage.setItem(masterKeyStorageKey, state.current.masterKey);
                addSystemMessage(`[CRYPTO] Generated new master key for direct visit and stored in sessionStorage (plaintext)`);
            } else {
                // Restore the master key from sessionStorage
                state.current.masterKey = storedMasterKey;
                addSystemMessage(`[CRYPTO] Restored existing master key from sessionStorage for direct visit`);
            }
            
            return {
                namespaceId: state.current.namespaceId,
                namespaceHash: state.current.namespaceHash,
                masterKey: state.current.masterKey
            };
        }
        
        // Check if there are any existing namespaces before creating a fallback
        const existingNamespaceIds = getAllNamespaceIds();
        
        if (existingNamespaceIds.length > 0) {
            // Use the first available namespace
            const firstNamespaceId = existingNamespaceIds[0];
            addSystemMessage(`[CRYPTO] Using existing namespace: ${firstNamespaceId}`);
            
            // Try to load this namespace
            const targetHash = firstNamespaceId; // Use ID as hash for simplicity
            const masterKey = getMasterKey(firstNamespaceId, targetHash);
            
            if (masterKey) {
                state.current.namespaceId = firstNamespaceId;
                state.current.namespaceHash = targetHash;
                state.current.masterKey = masterKey;
                state.isReturningToExistingNamespace = true; // This is an existing namespace
                
                addSystemMessage(`[CRYPTO] Successfully loaded existing namespace: ${firstNamespaceId}`);
            } else {
                // Fallback to creating new if we can't load the existing one
                addSystemMessage(`[CRYPTO] Failed to load existing namespace, creating new fallback`);
                const defaultNamespaceId = CryptoUtils.generateRandomAlphaNum(8);
                const defaultNamespaceHash = defaultNamespaceId;
                
                // Derive master key deterministically if session key available
                const sessionKey = getSessionKey();
                // Always generate secure random master key
                const defaultMasterKey = CryptoUtils.generateMasterKey();
                
                state.current.namespaceId = defaultNamespaceId;
                state.current.namespaceHash = defaultNamespaceHash;
                state.current.masterKey = defaultMasterKey;
                state.isReturningToExistingNamespace = false;
                
                storeNamespaceData(state.current.namespaceId, state.current.namespaceHash, state.current.masterKey);
                addSystemMessage(`[CRYPTO] Created and stored fallback namespace: ${state.current.namespaceId}`);
            }
        } else {
            // No existing namespaces, create a new fallback
            addSystemMessage(`[CRYPTO] No existing namespaces found, creating fallback namespace`);
            
            const defaultNamespaceId = CryptoUtils.generateRandomAlphaNum(8);
            const defaultNamespaceHash = defaultNamespaceId;
            
            // Always generate secure random master key
            const defaultMasterKey = CryptoUtils.generateMasterKey();
            
            state.current.namespaceId = defaultNamespaceId;
            state.current.namespaceHash = defaultNamespaceHash;
            state.current.masterKey = defaultMasterKey;
            state.isReturningToExistingNamespace = false;
            
            storeNamespaceData(state.current.namespaceId, state.current.namespaceHash, state.current.masterKey);
            addSystemMessage(`[CRYPTO] Created and stored fallback namespace: ${state.current.namespaceId}`);
        }
        
        return {
            namespaceId: state.current.namespaceId,
            namespaceHash: state.current.namespaceHash,
            masterKey: state.current.masterKey
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
     * Get the current master key for encryption/decryption
     * @returns {string} The master key for the current namespace
     */
    function getCurrentMasterKey() {
        // If we're waiting for shared link password, don't provide a key yet
        if (window._waitingForSharedLinkPassword) {
            // Only log once per second to reduce console spam
            const now = Date.now();
            if (!window._lastNamespaceKeyLog || now - window._lastNamespaceKeyLog > 1000) {
                console.log('[NamespaceService] Cannot provide master key - waiting for shared link password');
                window._lastNamespaceKeyLog = now;
            }
            return null;
        }
        
        // For shared links, always check all master key sources
        // This is critical for cross-tab sync where state might be inconsistent
        if (StorageTypeService && StorageTypeService.isUsingLocalStorage && StorageTypeService.isUsingLocalStorage()) {
            const sharedLinkNamespace = StorageTypeService.getSharedLinkNamespace ? StorageTypeService.getSharedLinkNamespace() : null;
            if (sharedLinkNamespace) {
                // For shared links, check ALL sources for the master key
                // Priority order: global window key > cached key > state key
                const masterKey = window._sharedLinkMasterKey || sharedLinkMasterKeyCache || state.current.masterKey;
                
                // If we have a master key but state doesn't, update state
                // This handles cases where state was reset but we still have the key cached
                if (masterKey && !state.current.masterKey) {
                    state.current.masterKey = masterKey;
                    state.current.isSharedLink = true;
                    console.log('[NamespaceService] Restored master key to state from cache');
                }
                
                if (masterKey) {
                    return masterKey;
                } else {
                    // This is expected after page reload - shared links lose their master key
                    addSystemMessage(`[CRYPTO] No master key available for shared link after reload`);
                    return null;
                }
            }
        }
        
        const namespace = getOrCreateNamespace();
        return namespace ? namespace.masterKey : null;
    }
    
    /**
     * Force re-initialization of namespace when session key becomes available
     * This is needed when session key is set after initial namespace creation attempt
     */
    function reinitializeNamespace() {
        // Store the namespace ID to check if it exists after re-initialization
        const previousNamespaceId = state.current.namespaceId;
        
        // Preserve the master key and shared link flag if they exist
        const preservedMasterKey = state.current.masterKey;
        const preservedIsSharedLink = state.current.isSharedLink;
        
        // Clear current state to force re-creation
        state.current.namespaceId = null;
        state.current.namespaceHash = null;
        state.current.masterKey = preservedMasterKey; // Preserve the master key
        state.current.isSharedLink = preservedIsSharedLink; // Preserve the shared link flag
        // Don't reset isReturningToExistingNamespace here - let getOrCreateNamespace determine it
        
        // Re-initialize namespace with session key now available
        const namespace = getOrCreateNamespace();
        if (namespace) {
            addSystemMessage(`[CRYPTO] Successfully re-initialized namespace with session key`);
            
            // If we re-initialized the same namespace and it's marked as existing, trigger conversation reload
            if (previousNamespaceId === namespace.namespaceId && state.isReturningToExistingNamespace) {
                // Skip delayed reload if we're processing a shared link - the shared link processor handles this
                if (window._processingSharedLink || window._waitingForSharedLinkPassword || window._sharedLinkProcessed) {
                    console.log('[NamespaceService] Skipping delayed reload - shared link processor will handle conversation loading');
                    return namespace;
                }
                
                addSystemMessage(`[NAMESPACE] Re-initialized existing namespace - triggering conversation reload`);
                
                // Trigger conversation reload after a delay to ensure everything is initialized
                if (window.aiHackare && window.aiHackare.chatManager && 
                    window.aiHackare.chatManager.reloadConversationHistory) {
                    setTimeout(() => {
                        console.log('[NamespaceService] Triggering delayed conversation reload to restore original history');
                        
                        // First, load the original history and save it to a temp variable
                        const originalHistory = window.StorageService ? window.StorageService.loadChatHistory() : null;
                        console.log('[NamespaceService] Original history loaded:', originalHistory?.length || 0, 'messages');
                        
                        // Now reload and display it
                        window.aiHackare.chatManager.reloadConversationHistory();
                        
                        // Force save the original history to overwrite any system messages that may have been saved
                        if (originalHistory && originalHistory.length > 0) {
                            setTimeout(() => {
                                // Check if the current messages contain only system messages about configuration
                                const currentMessages = window.aiHackare.chatManager.getMessages();
                                const hasOnlyConfigMessages = currentMessages && currentMessages.every(msg => 
                                    msg.role === 'system' && (
                                        msg.content.includes('Shared API key') ||
                                        msg.content.includes('Shared base URL') ||
                                        msg.content.includes('Shared model preference') ||
                                        msg.content.includes('Returning to existing namespace')
                                    )
                                );
                                
                                if (hasOnlyConfigMessages) {
                                    console.log('[NamespaceService] Detected config-only messages, restoring original history');
                                    window.StorageService.saveChatHistory(originalHistory);
                                    window.aiHackare.chatManager.reloadConversationHistory();
                                }
                            }, 100);
                        }
                    }, 2000); // Increased delay to let all initialization complete
                }
            }
        }
        
        return namespace;
    }
    
    /**
     * Get the current namespace based on title and subtitle (for backward compatibility)
     * @returns {string} The namespace ID
     */
    function getNamespace() {
        // Return the full namespace object including the master key
        const namespace = getOrCreateNamespace();
        return {
            namespaceId: namespace.namespaceId,
            masterKey: namespace.masterKey,
            namespaceHash: namespace.namespaceHash
        };
    }
    
    // State management methods
    /**
     * Reset the namespace cache when title or subtitle changes
     */
    function resetNamespaceCache() {
        // Store the current namespace before resetting
        if (state.current.namespaceId && state.current.masterKey && state.current.namespaceHash) {
            state.previous.namespaceId = state.current.namespaceId;
            state.previous.masterKey = state.current.masterKey;
            state.previous.namespaceHash = state.current.namespaceHash;
            
            addSystemMessage(`[CRYPTO] Storing previous namespace: ${state.current.namespaceId}`);
        }
        
        // Preserve the master key for shared links
        // Check both the isSharedLink flag AND if we're actually in a shared link context
        const isInSharedLink = state.current.isSharedLink || 
                               (StorageTypeService && StorageTypeService.isUsingLocalStorage && 
                                StorageTypeService.isUsingLocalStorage() && 
                                StorageTypeService.getSharedLinkNamespace && 
                                StorageTypeService.getSharedLinkNamespace());
        
        // Preserve master key from any available source if we're in a shared link
        const preservedMasterKey = isInSharedLink ? 
            (state.current.masterKey || window._sharedLinkMasterKey || sharedLinkMasterKeyCache) : null;
        const preservedIsSharedLink = isInSharedLink;
        
        // Reset current namespace
        state.current.namespaceId = null;
        state.current.masterKey = preservedMasterKey; // Preserve if shared link
        state.current.namespaceHash = null;
        state.current.isSharedLink = preservedIsSharedLink; // Preserve the shared link flag
        state.isReturningToExistingNamespace = false;
        
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
        return state.previous.masterKey;
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
     * Ensure the shared link master key is properly cached
     * This should be called after the shared link password is verified
     * @returns {boolean} True if master key was successfully cached
     */
    function ensureSharedLinkMasterKeyCached() {
        if (!window._sharedLinkMasterKey) {
            console.log('[NamespaceService] No shared link master key to cache');
            return false;
        }
        
        console.log('[NamespaceService] Ensuring shared link master key is cached');
        
        // Cache the master key in all locations
        sharedLinkMasterKeyCache = window._sharedLinkMasterKey;
        
        // If we're in a shared link namespace, update the current master key
        if (StorageTypeService && StorageTypeService.isUsingLocalStorage()) {
            const sharedLinkNamespace = StorageTypeService.getSharedLinkNamespace();
            if (sharedLinkNamespace) {
                // Always set the namespace ID and master key together
                state.current.namespaceId = sharedLinkNamespace;
                state.current.namespaceHash = sharedLinkNamespace;
                state.current.masterKey = window._sharedLinkMasterKey;
                state.current.isSharedLink = true;
                addSystemMessage(`[CRYPTO] Updated namespace ${sharedLinkNamespace} with shared link master key`);
                return true;
            }
        }
        
        // Even if not in the namespace yet, mark as shared link and set master key
        state.current.masterKey = window._sharedLinkMasterKey;
        state.current.isSharedLink = true;
        
        return true;
    }
    
    /**
     * Get metadata for a specific namespace
     * @param {string} namespaceId - The namespace ID  
     * @returns {Object|null} Namespace metadata or null
     */
    function getNamespaceMetadata(namespaceId) {
        try {
            // Use namespace ID as the display name (no title/subtitle dependencies)
            const displayName = `Namespace ${namespaceId}`;
            
            // Try to get message history to count messages
            let messageCount = 0;
            let lastUsed = new Date().toISOString();
            
            try {
                // Only try to decrypt if we have CoreStorageService and it's current namespace
                if (window.CoreStorageService && namespaceId === state.current.namespaceId) {
                    // Only check current namespace to avoid decryption errors
                    const history = window.CoreStorageService.getItem('chat_history');
                    if (history && Array.isArray(history)) {
                        messageCount = history.length;
                        // Get last message timestamp if available
                        if (history.length > 0) {
                            const lastMessage = history[history.length - 1];
                            if (lastMessage && lastMessage.timestamp) {
                                lastUsed = lastMessage.timestamp;
                            }
                        }
                    }
                }
            } catch (e) {
                // Can't decrypt or access history, use defaults (this is expected for other namespaces)
                // Don't log this as it's normal behavior
            }
            
            return {
                id: namespaceId,
                title: displayName,
                subtitle: '',
                messageCount,
                lastUsed
            };
        } catch (error) {
            console.error('Error getting namespace metadata:', error);
            return null;
        }
    }
    
    /**
     * Check if we're returning to an existing namespace (vs creating new)
     * @returns {boolean} True if returning to existing namespace
     */
    function isReturningToExistingNamespace() {
        return state.isReturningToExistingNamespace;
    }
    
    /**
     * Set current namespace (for switching)
     * @param {string} namespaceId - The namespace ID to switch to
     */
    function setCurrentNamespace(namespaceId) {
        try {
            // Preserve the master key and shared link flag if they exist
            const preservedMasterKey = state.current.isSharedLink ? state.current.masterKey : null;
            const preservedIsSharedLink = state.current.isSharedLink;
            
            // Reset current state to force re-initialization
            state.current = {
                namespaceId: null,
                masterKey: preservedMasterKey,
                namespaceHash: null,
                isSharedLink: preservedIsSharedLink
            };
            
            // Try to load the specified namespace
            const targetHash = namespaceId; // For now, use namespace ID as hash
            const sessionKey = getSessionKey();
            
            // Try to get master key for this namespace
            const masterKeyStorageKey = CryptoUtils.getMasterKeyStorageKey(namespaceId);
            const storage = StorageTypeService ? StorageTypeService.getStorage() : localStorage;
            const encryptedMasterKey = storage.getItem(masterKeyStorageKey);
            
            if (encryptedMasterKey) {
                let masterKey = null;
                
                // Try to decrypt with session key first
                if (sessionKey) {
                    try {
                        // Debug logging
                        if (window.DebugService && window.DebugService.debugLog) {
                            window.DebugService.debugLog('crypto', `🔓 Attempting to decrypt master key for namespace switch using session key`);
                        }
                        
                        masterKey = EncryptionService.decrypt(encryptedMasterKey, sessionKey);
                    } catch (e) {
                        // Session key didn't work
                    }
                }
                
                // Try with namespace hash if session key failed
                if (!masterKey) {
                    try {
                        // Debug logging
                        if (window.DebugService && window.DebugService.debugLog) {
                            window.DebugService.debugLog('crypto', `🔓 Attempting to decrypt master key for namespace switch using namespace hash (fallback)`);
                        }
                        
                        masterKey = EncryptionService.decrypt(encryptedMasterKey, targetHash);
                    } catch (e) {
                        // Namespace hash didn't work either
                        console.error('Cannot decrypt master key for namespace', namespaceId);
                        return false;
                    }
                }
                
                // Set the current namespace
                state.current.namespaceId = namespaceId;
                state.current.namespaceHash = targetHash;
                state.current.masterKey = masterKey;
                state.isReturningToExistingNamespace = true; // Switching to existing namespace
                
                console.log('Switched to namespace:', namespaceId);
                return true;
            } else {
                console.error('No master key found for namespace', namespaceId);
                return false;
            }
        } catch (error) {
            console.error('Error switching to namespace:', error);
            return false;
        }
    }

    // Function to clear all caches (useful when switching contexts)
    function clearAllCaches() {
        sessionKeyCache.key = null;
        sessionKeyCache.timestamp = 0;
        namespaceCache.data = null;
        namespaceCache.timestamp = 0;
    }
    
    // Public API
    return {
        BASE_STORAGE_KEYS: BASE_STORAGE_KEYS,
        NON_NAMESPACED_KEYS: NON_NAMESPACED_KEYS,
        getNamespace: getNamespace,
        getNamespaceId: getNamespaceId,
        getCurrentMasterKey: getCurrentMasterKey,
        getPreviousNamespace: getPreviousNamespace,
        getPreviousNamespaceId: getPreviousNamespaceId,
        getPreviousNamespaceKey: getPreviousNamespaceKey,
        getPreviousNamespaceHash: getPreviousNamespaceHash,
        resetNamespaceCache: resetNamespaceCache,
        getNamespacedKey: getNamespacedKey,
        getKeysToReEncrypt: getKeysToReEncrypt,
        findExistingNamespace: findExistingNamespace,
        getMasterKey: getMasterKey,
        getAllNamespaceIds: getAllNamespaceIds,
        getNamespaceMetadata: getNamespaceMetadata,
        ensureSharedLinkMasterKeyCached: ensureSharedLinkMasterKeyCached,
        setCurrentNamespace: setCurrentNamespace,
        reinitializeNamespace: reinitializeNamespace,
        isReturningToExistingNamespace: isReturningToExistingNamespace,
        clearAllCaches: clearAllCaches
    };
})();
