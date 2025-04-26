/**
 * Storage Service
 * Handles local storage operations for the application
 */

window.StorageService = (function() {
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
        BASE_STORAGE_KEYS.SUBTITLE
    ];
    
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
        currentNamespace = null;
    }
    
    /**
     * Get the namespaced key for a storage item
     * @param {string} baseKey - The base key without namespace
     * @returns {string} The namespaced key
     */
    function getNamespacedKey(baseKey) {
        // Title and subtitle are special cases - they don't get namespaced
        // to avoid circular dependency
        if (NON_NAMESPACED_KEYS.includes(baseKey)) {
            return baseKey;
        }
        
        // Add namespace prefix to all other keys
        return `${getNamespace()}_${baseKey}`;
    }
    
    // Storage keys with namespace
    const STORAGE_KEYS = {
        API_KEY: BASE_STORAGE_KEYS.API_KEY,
        MODEL: BASE_STORAGE_KEYS.MODEL,
        HISTORY: BASE_STORAGE_KEYS.HISTORY,
        SYSTEM_PROMPT: BASE_STORAGE_KEYS.SYSTEM_PROMPT,
        SHARE_OPTIONS: BASE_STORAGE_KEYS.SHARE_OPTIONS,
        BASE_URL: BASE_STORAGE_KEYS.BASE_URL,
        BASE_URL_PROVIDER: BASE_STORAGE_KEYS.BASE_URL_PROVIDER,
        TITLE: BASE_STORAGE_KEYS.TITLE,
        SUBTITLE: BASE_STORAGE_KEYS.SUBTITLE
    };

    /**
     * Save API key to local storage
     * @param {string} apiKey - The API key to save
     */
    function saveApiKey(apiKey) {
        localStorage.setItem(getNamespacedKey(STORAGE_KEYS.API_KEY), apiKey);
    }

    /**
     * Get API key from local storage
     * @returns {string|null} The stored API key or null if not found
     */
    function getApiKey() {
        // Try to get from namespaced key first
        const value = localStorage.getItem(getNamespacedKey(STORAGE_KEYS.API_KEY));
        
        // If not found and we're using a namespace, try the legacy non-namespaced key
        if (value === null && getNamespace() !== "") {
            const legacyValue = localStorage.getItem(STORAGE_KEYS.API_KEY);
            
            // If found in legacy storage, migrate it to the namespaced key
            if (legacyValue !== null) {
                saveApiKey(legacyValue);
                return legacyValue;
            }
        }
        
        return value;
    }

    /**
     * Save selected model to local storage
     * @param {string} model - The model ID to save
     */
    function saveModel(model) {
        localStorage.setItem(getNamespacedKey(STORAGE_KEYS.MODEL), model);
    }

    /**
     * Get selected model from local storage
     * @returns {string|null} The stored model ID or null if not found
     */
    function getModel() {
        // Try to get from namespaced key first
        const value = localStorage.getItem(getNamespacedKey(STORAGE_KEYS.MODEL));
        
        // If not found and we're using a namespace, try the legacy non-namespaced key
        if (value === null && getNamespace() !== "") {
            const legacyValue = localStorage.getItem(STORAGE_KEYS.MODEL);
            
            // If found in legacy storage, migrate it to the namespaced key
            if (legacyValue !== null) {
                saveModel(legacyValue);
                return legacyValue;
            }
        }
        
        return value;
    }

    /**
     * Save chat history to local storage
     * @param {Array} messages - Array of chat messages
     */
    function saveChatHistory(messages) {
        localStorage.setItem(getNamespacedKey(STORAGE_KEYS.HISTORY), JSON.stringify(messages));
    }

    /**
     * Load chat history from local storage
     * @returns {Array|null} Array of chat messages or null if not found
     */
    function loadChatHistory() {
        // Try to get from namespaced key first
        const savedHistory = localStorage.getItem(getNamespacedKey(STORAGE_KEYS.HISTORY));
        
        // If not found and we're using a namespace, try the legacy non-namespaced key
        if (savedHistory === null && getNamespace() !== "") {
            const legacyHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
            
            // If found in legacy storage, migrate it to the namespaced key
            if (legacyHistory !== null) {
                const parsedHistory = JSON.parse(legacyHistory);
                saveChatHistory(parsedHistory);
                return parsedHistory;
            }
        }
        
        return savedHistory ? JSON.parse(savedHistory) : null;
    }

    /**
     * Clear chat history from local storage
     */
    function clearChatHistory() {
        localStorage.removeItem(getNamespacedKey(STORAGE_KEYS.HISTORY));
    }

    /**
     * Save system prompt to local storage
     * @param {string} prompt - The system prompt to save
     */
    function saveSystemPrompt(prompt) {
        localStorage.setItem(getNamespacedKey(STORAGE_KEYS.SYSTEM_PROMPT), prompt);
    }

    /**
     * Get system prompt from local storage
     * @returns {string|null} The stored system prompt or null if not found
     */
    function getSystemPrompt() {
        // Try to get from namespaced key first
        const value = localStorage.getItem(getNamespacedKey(STORAGE_KEYS.SYSTEM_PROMPT));
        
        // If not found and we're using a namespace, try the legacy non-namespaced key
        if (value === null && getNamespace() !== "") {
            const legacyValue = localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT);
            
            // If found in legacy storage, migrate it to the namespaced key
            if (legacyValue !== null) {
                saveSystemPrompt(legacyValue);
                return legacyValue;
            }
        }
        
        return value;
    }

    /**
     * Save share options to local storage
     * @param {Object} options - The share options to save
     */
    function saveShareOptions(options) {
        localStorage.setItem(getNamespacedKey(STORAGE_KEYS.SHARE_OPTIONS), JSON.stringify(options));
    }

    /**
     * Get share options from local storage
     * @returns {Object|null} The stored share options or default values if not found
     */
    function getShareOptions() {
        // Try to get from namespaced key first
        const savedOptions = localStorage.getItem(getNamespacedKey(STORAGE_KEYS.SHARE_OPTIONS));
        
        // If not found and we're using a namespace, try the legacy non-namespaced key
        if (savedOptions === null && getNamespace() !== "") {
            const legacyOptions = localStorage.getItem(STORAGE_KEYS.SHARE_OPTIONS);
            
            // If found in legacy storage, migrate it to the namespaced key
            if (legacyOptions !== null) {
                const parsedOptions = JSON.parse(legacyOptions);
                saveShareOptions(parsedOptions);
                return parsedOptions;
            }
        }
        
        return savedOptions ? JSON.parse(savedOptions) : {
            includeBaseUrl: false,
            includeApiKey: true,
            includeSystemPrompt: false,
            includeModel: false,
            includeConversation: false,
            messageCount: 1
        };
    }

    /**
     * Save base URL to local storage
     * @param {string} baseUrl - The base URL to save
     */
    function saveBaseUrl(baseUrl) {
        localStorage.setItem(getNamespacedKey(STORAGE_KEYS.BASE_URL), baseUrl);
    }

    /**
     * Get base URL from local storage
     * @returns {string} The stored base URL or default URL if not found
     */
    function getBaseUrl() {
        // Try to get from namespaced key first
        const value = localStorage.getItem(getNamespacedKey(STORAGE_KEYS.BASE_URL));
        
        // If not found and we're using a namespace, try the legacy non-namespaced key
        if (value === null && getNamespace() !== "") {
            const legacyValue = localStorage.getItem(STORAGE_KEYS.BASE_URL);
            
            // If found in legacy storage, migrate it to the namespaced key
            if (legacyValue !== null) {
                saveBaseUrl(legacyValue);
                return legacyValue;
            }
        }
        
        return value || 'https://api.groq.com/openai/v1';
    }
    
    /**
     * Save base URL provider to local storage
     * @param {string} provider - The provider identifier (groq, openai, ollama, custom)
     */
    function saveBaseUrlProvider(provider) {
        localStorage.setItem(getNamespacedKey(STORAGE_KEYS.BASE_URL_PROVIDER), provider);
    }
    
    /**
     * Get base URL provider from local storage
     * @returns {string} The stored provider or 'groq' if not found
     */
    function getBaseUrlProvider() {
        // Try to get from namespaced key first
        const value = localStorage.getItem(getNamespacedKey(STORAGE_KEYS.BASE_URL_PROVIDER));
        
        // If not found and we're using a namespace, try the legacy non-namespaced key
        if (value === null && getNamespace() !== "") {
            const legacyValue = localStorage.getItem(STORAGE_KEYS.BASE_URL_PROVIDER);
            
            // If found in legacy storage, migrate it to the namespaced key
            if (legacyValue !== null) {
                saveBaseUrlProvider(legacyValue);
                return legacyValue;
            }
        }
        
        return value || 'groq';
    }
    
    /**
     * Get the default base URL for a provider
     * @param {string} provider - The provider identifier
     * @returns {string} The default base URL for the provider
     */
    function getDefaultBaseUrlForProvider(provider) {
        switch (provider) {
            case 'groq':
                return 'https://api.groq.com/openai/v1';
            case 'openai':
                return 'https://api.openai.com/v1';
            case 'ollama':
                return 'http://localhost:11434/v1';
            default:
                return '';
        }
    }

    /**
     * Save title to local storage
     * @param {string} title - The title to save
     */
    function saveTitle(title) {
        // Title is not namespaced to avoid circular dependency
        localStorage.setItem(STORAGE_KEYS.TITLE, title);
        // Reset namespace cache since title changed
        resetNamespaceCache();
    }

    /**
     * Get title from local storage
     * @returns {string} The stored title or "hacka.re" if not found
     */
    function getTitle() {
        // Title is not namespaced to avoid circular dependency
        return localStorage.getItem(STORAGE_KEYS.TITLE) || "hacka.re";
    }

    /**
     * Save subtitle to local storage
     * @param {string} subtitle - The subtitle to save
     */
    function saveSubtitle(subtitle) {
        // Subtitle is not namespaced to avoid circular dependency
        localStorage.setItem(STORAGE_KEYS.SUBTITLE, subtitle);
        // Reset namespace cache since subtitle changed
        resetNamespaceCache();
    }

    /**
     * Get subtitle from local storage
     * @returns {string} The stored subtitle or "För hackare av hackare" if not found
     */
    function getSubtitle() {
        // Subtitle is not namespaced to avoid circular dependency
        return localStorage.getItem(STORAGE_KEYS.SUBTITLE) || "För hackare av hackare";
    }

    // Public API
    return {
        STORAGE_KEYS: STORAGE_KEYS,
        BASE_STORAGE_KEYS: BASE_STORAGE_KEYS,
        getNamespace: getNamespace,
        getNamespacedKey: getNamespacedKey,
        resetNamespaceCache: resetNamespaceCache,
        saveApiKey: saveApiKey,
        getApiKey: getApiKey,
        saveModel: saveModel,
        getModel: getModel,
        saveChatHistory: saveChatHistory,
        loadChatHistory: loadChatHistory,
        clearChatHistory: clearChatHistory,
        saveSystemPrompt: saveSystemPrompt,
        getSystemPrompt: getSystemPrompt,
        saveShareOptions: saveShareOptions,
        getShareOptions: getShareOptions,
        saveBaseUrl: saveBaseUrl,
        getBaseUrl: getBaseUrl,
        saveBaseUrlProvider: saveBaseUrlProvider,
        getBaseUrlProvider: getBaseUrlProvider,
        getDefaultBaseUrlForProvider: getDefaultBaseUrlForProvider,
        saveTitle: saveTitle,
        getTitle: getTitle,
        saveSubtitle: saveSubtitle,
        getSubtitle: getSubtitle
    };
})();
