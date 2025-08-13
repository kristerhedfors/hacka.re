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
        usingFallbackForMasterKey: false,
        // Flag to track if we're returning to an existing namespace vs creating new
        isReturningToExistingNamespace: false
    };
    
    // Flag to track if we've attempted session cleanup for this page load
    let hasAttemptedSessionCleanup = false;
    
    // Helper functions
    function getSessionKey() {
        // Session key retrieval with multiple fallback mechanisms
        // Priority order:
        // 1. Direct sessionStorage lookup for shared links (works before ShareManager init)
        // 2. CryptoUtils-based lookup using hash of encrypted data
        // 3. ShareManager instance (aiHackare.shareManager)
        // 4. Legacy ShareManager fallback
        
        // First, check sessionStorage directly for shared link session keys
        // This ensures we get the session key even before ShareManager is initialized
        if (window.location.hash && (window.location.hash.includes('#gpt=') || window.location.hash.includes('#shared='))) {
            // Try to find any session key in sessionStorage that matches the pattern
            // This works even if CryptoUtils isn't loaded yet
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && key.startsWith('__hacka_re_session_key_')) {
                    const storedKey = sessionStorage.getItem(key);
                    if (storedKey) {
                        console.log(`[NamespaceService] Found session key in sessionStorage: ${key}`);
                        return storedKey;
                    }
                }
            }
            
            // If CryptoUtils is available, try the more specific approach
            const hash = window.location.hash;
            let encryptedData = null;
            if (hash.includes('#gpt=')) {
                encryptedData = hash.split('#gpt=')[1];
            } else if (hash.includes('#shared=')) {
                encryptedData = hash.split('#shared=')[1];
            }
            if (encryptedData && window.CryptoUtils) {
                // Create a consistent key based on the encrypted data hash
                const linkHash = CryptoUtils.hashString(encryptedData);
                const storageKey = `__hacka_re_session_key_${linkHash.substring(0, 16)}`;
                const storedKey = sessionStorage.getItem(storageKey);
                if (storedKey) {
                    console.log(`[NamespaceService] Found session key in sessionStorage (via CryptoUtils): ${storageKey}`);
                    return storedKey;
                }
            }
        }
        
        // For shared links, prioritize the aiHackare.shareManager instance
        if (window.aiHackare && window.aiHackare.shareManager && 
            typeof window.aiHackare.shareManager.getSessionKey === 'function') {
            const sessionKey = window.aiHackare.shareManager.getSessionKey();
            if (sessionKey) {
                return sessionKey;
            }
        }
        
        // Fallback to legacy ShareManager
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
        // If we're waiting for a shared link password, delay namespace creation
        if (window._waitingForSharedLinkPassword) {
            console.log('[NamespaceService] Waiting for shared link password before creating namespace');
            // Return a temporary namespace that won't be used for encryption
            return {
                namespaceId: 'temp_waiting',
                namespaceHash: 'temp_waiting',
                masterKey: null
            };
        }
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
                
                // First check if this namespace already exists with a stored master key
                const existingMasterKey = getMasterKey(sharedLinkNamespace, sharedLinkNamespace);
                
                if (existingMasterKey) {
                    // Use existing namespace data
                    state.current.namespaceId = sharedLinkNamespace;
                    state.current.namespaceHash = sharedLinkNamespace;
                    state.current.namespaceKey = existingMasterKey;
                    state.isReturningToExistingNamespace = true;
                    
                    addSystemMessage(`[CRYPTO] Loaded existing master key for shared link namespace ${sharedLinkNamespace}`);
                    addSystemMessage(`[NAMESPACE] Returning to existing namespace - conversation continuity enabled`);
                    
                    return {
                        namespaceId: state.current.namespaceId,
                        namespaceHash: state.current.namespaceHash,
                        masterKey: state.current.namespaceKey
                    };
                }
                
                // No existing namespace, create new one
                state.current.namespaceId = sharedLinkNamespace;
                state.current.namespaceHash = sharedLinkNamespace; // Use namespace ID as hash for simplicity
                state.isReturningToExistingNamespace = false;
                
                // For shared links, derive master key deterministically from session key
                const sessionKey = getSessionKey();
                console.log(`[NamespaceService] Session key available for ${sharedLinkNamespace}:`, sessionKey ? sessionKey.length + ' chars' : 'none');
                if (sessionKey) {
                    try {
                        state.current.namespaceKey = CryptoUtils.deriveMasterKeyFromSession(sessionKey, sharedLinkNamespace);
                        addSystemMessage(`[CRYPTO] Derived deterministic master key for shared link namespace ${sharedLinkNamespace}`);
                        
                        // Store the namespace data for future tabs
                        storeNamespaceData(sharedLinkNamespace, sharedLinkNamespace, state.current.namespaceKey);
                        addSystemMessage(`[CRYPTO] Stored namespace data for future tabs`);
                    } catch (error) {
                        console.error(`[NamespaceService] Failed to derive master key:`, error);
                        addSystemMessage(`[CRYPTO] Failed to derive master key, using random: ${error.message}`);
                        state.current.namespaceKey = CryptoUtils.generateSecretKey(); // Fallback to random
                    }
                } else {
                    console.log(`[NamespaceService] No session key available, using random master key for ${sharedLinkNamespace}`);
                    addSystemMessage(`[CRYPTO] No session key available, using random master key for ${sharedLinkNamespace}`);
                    state.current.namespaceKey = CryptoUtils.generateSecretKey(); // Fallback to random
                }
                
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
            
            // Session cleanup for sessionStorage mode
            // When using sessionStorage, we need to ensure clean session boundaries.
            // This cleanup prevents encrypted data from previous sessions from causing
            // decryption errors or data confusion.
            // 
            // Note: This cleanup only happens once per page load and only affects
            // sessionStorage when in sessionStorage mode.
            if (!hasAttemptedSessionCleanup && sessionStorage.length > 0) {
                // Check if there's any encrypted data that would fail to decrypt
                // We look for base64-encoded strings that are likely encrypted data
                // rather than normal application state
                const hasEncryptedData = Object.keys(sessionStorage).some(key => {
                    const value = sessionStorage.getItem(key);
                    // Check if this looks like encrypted data (base64-like strings over certain length)
                    return value && value.length > 50 && /^[A-Za-z0-9+/=]+$/.test(value);
                });
                
                if (hasEncryptedData) {
                    // Clear all sessionStorage to start fresh
                    // This ensures no data leakage between sessions when using sessionStorage
                    addSystemMessage(`[CRYPTO] Detected encrypted data from previous session - clearing sessionStorage and starting fresh`);
                    sessionStorage.clear();
                    hasAttemptedSessionCleanup = true;
                } else {
                    hasAttemptedSessionCleanup = true;
                }
            }
            
            addSystemMessage(`[CRYPTO] Using default session namespace: ${defaultNamespace}`);
            
            state.current.namespaceId = defaultNamespace;
            state.current.namespaceHash = defaultNamespace; // Use namespace ID as hash for simplicity
            state.isReturningToExistingNamespace = false;
            
            // Master key generation for sessionStorage
            // Even in sessionStorage mode, we support session keys for additional security
            // If a session key is available, we derive the master key from it
            // Otherwise, we generate a random master key
            const sessionKey = getSessionKey();
            if (sessionKey) {
                try {
                    state.current.namespaceKey = CryptoUtils.deriveMasterKeyFromSession(sessionKey, defaultNamespace);
                    addSystemMessage(`[CRYPTO] Derived deterministic master key for session namespace ${defaultNamespace}`);
                } catch (error) {
                    addSystemMessage(`[CRYPTO] Failed to derive master key, using random: ${error.message}`);
                    state.current.namespaceKey = CryptoUtils.generateSecretKey(); // Fallback to random
                }
            } else {
                // No session key available - generate a random master key
                // This is the typical case for direct visits without a session key
                state.current.namespaceKey = CryptoUtils.generateSecretKey();
            }
            
            return {
                namespaceId: state.current.namespaceId,
                namespaceHash: state.current.namespaceHash,
                masterKey: state.current.namespaceKey
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
                state.current.namespaceKey = masterKey;
                state.isReturningToExistingNamespace = true; // This is an existing namespace
                
                addSystemMessage(`[CRYPTO] Successfully loaded existing namespace: ${firstNamespaceId}`);
            } else {
                // Fallback to creating new if we can't load the existing one
                addSystemMessage(`[CRYPTO] Failed to load existing namespace, creating new fallback`);
                const defaultNamespaceId = CryptoUtils.generateRandomAlphaNum(8);
                const defaultNamespaceHash = defaultNamespaceId;
                
                // Derive master key deterministically if session key available
                const sessionKey = getSessionKey();
                const defaultMasterKey = sessionKey ? 
                    CryptoUtils.deriveMasterKeyFromSession(sessionKey, defaultNamespaceId) : 
                    CryptoUtils.generateSecretKey();
                
                state.current.namespaceId = defaultNamespaceId;
                state.current.namespaceHash = defaultNamespaceHash;
                state.current.namespaceKey = defaultMasterKey;
                state.isReturningToExistingNamespace = false;
                
                storeNamespaceData(state.current.namespaceId, state.current.namespaceHash, state.current.namespaceKey);
                addSystemMessage(`[CRYPTO] Created and stored fallback namespace: ${state.current.namespaceId}`);
            }
        } else {
            // No existing namespaces, create a new fallback
            addSystemMessage(`[CRYPTO] No existing namespaces found, creating fallback namespace`);
            
            const defaultNamespaceId = CryptoUtils.generateRandomAlphaNum(8);
            const defaultNamespaceHash = defaultNamespaceId;
            
            // Derive master key deterministically if session key available
            const sessionKey = getSessionKey();
            const defaultMasterKey = sessionKey ? 
                CryptoUtils.deriveMasterKeyFromSession(sessionKey, defaultNamespaceId) : 
                CryptoUtils.generateSecretKey();
            
            state.current.namespaceId = defaultNamespaceId;
            state.current.namespaceHash = defaultNamespaceHash;
            state.current.namespaceKey = defaultMasterKey;
            state.isReturningToExistingNamespace = false;
            
            storeNamespaceData(state.current.namespaceId, state.current.namespaceHash, state.current.namespaceKey);
            addSystemMessage(`[CRYPTO] Created and stored fallback namespace: ${state.current.namespaceId}`);
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
        // If we're waiting for shared link password, don't provide a key yet
        if (window._waitingForSharedLinkPassword) {
            console.log('[NamespaceService] Cannot provide namespace key - waiting for shared link password');
            return null;
        }
        // For shared links, ensure we wait for proper initialization
        if (StorageTypeService && StorageTypeService.isUsingLocalStorage && StorageTypeService.isUsingLocalStorage()) {
            const sharedLinkNamespace = StorageTypeService.getSharedLinkNamespace ? StorageTypeService.getSharedLinkNamespace() : null;
            if (sharedLinkNamespace) {
                // For shared links, ensure session key is available before proceeding
                const sessionKey = getSessionKey();
                if (!sessionKey) {
                    addSystemMessage(`[CRYPTO] WARNING: No session key available for shared link namespace, returning null`);
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
        
        // Clear current state to force re-creation
        state.current.namespaceId = null;
        state.current.namespaceHash = null;
        state.current.namespaceKey = null;
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
            // Reset current state to force re-initialization
            state.current = {
                namespaceId: null,
                namespaceKey: null,
                namespaceHash: null
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
                        masterKey = EncryptionService.decrypt(encryptedMasterKey, sessionKey);
                    } catch (e) {
                        // Session key didn't work
                    }
                }
                
                // Try with namespace hash if session key failed
                if (!masterKey) {
                    try {
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
                state.current.namespaceKey = masterKey;
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
        isUsingFallbackForMasterKey: isUsingFallbackForMasterKey,
        getAllNamespaceIds: getAllNamespaceIds,
        getNamespaceMetadata: getNamespaceMetadata,
        setCurrentNamespace: setCurrentNamespace,
        reinitializeNamespace: reinitializeNamespace,
        isReturningToExistingNamespace: isReturningToExistingNamespace
    };
})();
