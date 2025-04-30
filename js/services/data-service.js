/**
 * Data Service
 * Handles specific data type operations (API keys, models, chat history, etc.)
 */

window.DataService = (function() {
    const STORAGE_KEYS = NamespaceService.BASE_STORAGE_KEYS;
    
    /**
     * Save API key to local storage
     * @param {string} apiKey - The API key to save
     */
    function saveApiKey(apiKey) {
        CoreStorageService.setValue(STORAGE_KEYS.API_KEY, apiKey);
    }

    /**
     * Get API key from local storage
     * @returns {string|null} The stored API key or null if not found
     */
    function getApiKey() {
        return CoreStorageService.getValue(
            STORAGE_KEYS.API_KEY, 
            STORAGE_KEYS.API_KEY, 
            saveApiKey
        );
    }

    /**
     * Save selected model to local storage
     * @param {string} model - The model ID to save
     */
    function saveModel(model) {
        CoreStorageService.setValue(STORAGE_KEYS.MODEL, model);
    }

    /**
     * Get selected model from local storage
     * @returns {string|null} The stored model ID or null if not found
     */
    function getModel() {
        return CoreStorageService.getValue(
            STORAGE_KEYS.MODEL, 
            STORAGE_KEYS.MODEL, 
            saveModel
        );
    }

    /**
     * Save chat history to local storage
     * @param {Array} messages - Array of chat messages
     */
    function saveChatHistory(messages) {
        CoreStorageService.setValue(STORAGE_KEYS.HISTORY, messages);
    }

    /**
     * Load chat history from local storage
     * @returns {Array|null} Array of chat messages or null if not found
     */
    function loadChatHistory() {
        return CoreStorageService.getValue(
            STORAGE_KEYS.HISTORY, 
            STORAGE_KEYS.HISTORY, 
            saveChatHistory
        );
    }

    /**
     * Clear chat history from local storage
     */
    function clearChatHistory() {
        CoreStorageService.removeValue(STORAGE_KEYS.HISTORY);
    }

    /**
     * Save system prompt to local storage
     * @param {string} prompt - The system prompt to save
     */
    function saveSystemPrompt(prompt) {
        CoreStorageService.setValue(STORAGE_KEYS.SYSTEM_PROMPT, prompt);
    }

    /**
     * Get system prompt from local storage
     * @returns {string|null} The stored system prompt or null if not found
     */
    function getSystemPrompt() {
        return CoreStorageService.getValue(
            STORAGE_KEYS.SYSTEM_PROMPT, 
            STORAGE_KEYS.SYSTEM_PROMPT, 
            saveSystemPrompt
        );
    }

    /**
     * Save share options to local storage
     * @param {Object} options - The share options to save
     */
    function saveShareOptions(options) {
        CoreStorageService.setValue(STORAGE_KEYS.SHARE_OPTIONS, options);
    }

    /**
     * Get share options from local storage
     * @returns {Object|null} The stored share options or default values if not found
     */
    function getShareOptions() {
        const options = CoreStorageService.getValue(
            STORAGE_KEYS.SHARE_OPTIONS, 
            STORAGE_KEYS.SHARE_OPTIONS, 
            saveShareOptions
        );
        
        return options || {
            includeBaseUrl: false,
            includeApiKey: true,
            includeSystemPrompt: false,
            includeModel: false,
            includeConversation: false,
            messageCount: 1,
            includePromptLibrary: false
        };
    }

    /**
     * Save base URL to local storage
     * @param {string} baseUrl - The base URL to save
     */
    function saveBaseUrl(baseUrl) {
        CoreStorageService.setValue(STORAGE_KEYS.BASE_URL, baseUrl);
    }

    /**
     * Get base URL from local storage
     * @returns {string} The stored base URL or default URL if not found
     */
    function getBaseUrl() {
        return CoreStorageService.getValue(
            STORAGE_KEYS.BASE_URL, 
            STORAGE_KEYS.BASE_URL, 
            saveBaseUrl
        ) || 'https://api.groq.com/openai/v1';
    }
    
    /**
     * Save base URL provider to local storage
     * @param {string} provider - The provider identifier (groq, openai, ollama, custom)
     */
    function saveBaseUrlProvider(provider) {
        CoreStorageService.setValue(STORAGE_KEYS.BASE_URL_PROVIDER, provider);
    }
    
    /**
     * Get base URL provider from local storage
     * @returns {string} The stored provider or 'groq' if not found
     */
    function getBaseUrlProvider() {
        return CoreStorageService.getValue(
            STORAGE_KEYS.BASE_URL_PROVIDER, 
            STORAGE_KEYS.BASE_URL_PROVIDER, 
            saveBaseUrlProvider
        ) || 'groq';
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
        sessionStorage.setItem(STORAGE_KEYS.TITLE, title);
        
        // Reset namespace cache since title changed
        NamespaceService.resetNamespaceCache();
        
        // No re-encryption needed as variables will be accessed in the new namespace
        // and old namespace data will remain untouched
    }

    /**
     * Get title from session storage
     * @returns {string} The stored title or "hacka.re" if not found
     */
    function getTitle() {
        // Title is not namespaced to avoid circular dependency
        return sessionStorage.getItem(STORAGE_KEYS.TITLE) || "hacka.re";
    }

    /**
     * Save subtitle to session storage
     * @param {string} subtitle - The subtitle to save
     */
    function saveSubtitle(subtitle) {
        // Subtitle is not namespaced to avoid circular dependency
        sessionStorage.setItem(STORAGE_KEYS.SUBTITLE, subtitle);
        
        // Reset namespace cache since subtitle changed
        NamespaceService.resetNamespaceCache();
        
        // No re-encryption needed as variables will be accessed in the new namespace
        // and old namespace data will remain untouched
    }

    /**
     * Get subtitle from session storage
     * @returns {string} The stored subtitle or "För hackare av hackare" if not found
     */
    function getSubtitle() {
        // Subtitle is not namespaced to avoid circular dependency
        return sessionStorage.getItem(STORAGE_KEYS.SUBTITLE) || "För hackare av hackare";
    }
    
    // Public API
    return {
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
