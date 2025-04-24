/**
 * Storage Service
 * Handles local storage operations for the application
 */

window.StorageService = (function() {
    // Storage keys
    const STORAGE_KEYS = {
        API_KEY: 'aihackare_api_key',
        MODEL: 'aihackare_model',
        HISTORY: 'aihackare_history',
        SYSTEM_PROMPT: 'aihackare_system_prompt',
        SHARE_OPTIONS: 'aihackare_share_options',
        BASE_URL: 'aihackare_base_url',
        BASE_URL_PROVIDER: 'aihackare_base_url_provider'
    };

    /**
     * Save API key to local storage
     * @param {string} apiKey - The API key to save
     */
    function saveApiKey(apiKey) {
        localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
    }

    /**
     * Get API key from local storage
     * @returns {string|null} The stored API key or null if not found
     */
    function getApiKey() {
        return localStorage.getItem(STORAGE_KEYS.API_KEY);
    }

    /**
     * Save selected model to local storage
     * @param {string} model - The model ID to save
     */
    function saveModel(model) {
        localStorage.setItem(STORAGE_KEYS.MODEL, model);
    }

    /**
     * Get selected model from local storage
     * @returns {string|null} The stored model ID or null if not found
     */
    function getModel() {
        return localStorage.getItem(STORAGE_KEYS.MODEL);
    }

    /**
     * Save chat history to local storage
     * @param {Array} messages - Array of chat messages
     */
    function saveChatHistory(messages) {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(messages));
    }

    /**
     * Load chat history from local storage
     * @returns {Array|null} Array of chat messages or null if not found
     */
    function loadChatHistory() {
        const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
        return savedHistory ? JSON.parse(savedHistory) : null;
    }

    /**
     * Clear chat history from local storage
     */
    function clearChatHistory() {
        localStorage.removeItem(STORAGE_KEYS.HISTORY);
    }

    /**
     * Save system prompt to local storage
     * @param {string} prompt - The system prompt to save
     */
    function saveSystemPrompt(prompt) {
        localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, prompt);
    }

    /**
     * Get system prompt from local storage
     * @returns {string|null} The stored system prompt or null if not found
     */
    function getSystemPrompt() {
        return localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT);
    }

    /**
     * Save share options to local storage
     * @param {Object} options - The share options to save
     */
    function saveShareOptions(options) {
        localStorage.setItem(STORAGE_KEYS.SHARE_OPTIONS, JSON.stringify(options));
    }

    /**
     * Get share options from local storage
     * @returns {Object|null} The stored share options or default values if not found
     */
    function getShareOptions() {
        const savedOptions = localStorage.getItem(STORAGE_KEYS.SHARE_OPTIONS);
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
        localStorage.setItem(STORAGE_KEYS.BASE_URL, baseUrl);
    }

    /**
     * Get base URL from local storage
     * @returns {string} The stored base URL or default URL if not found
     */
    function getBaseUrl() {
        return localStorage.getItem(STORAGE_KEYS.BASE_URL) || 'https://api.groq.com/openai/v1';
    }
    
    /**
     * Save base URL provider to local storage
     * @param {string} provider - The provider identifier (groq, openai, ollama, custom)
     */
    function saveBaseUrlProvider(provider) {
        localStorage.setItem(STORAGE_KEYS.BASE_URL_PROVIDER, provider);
    }
    
    /**
     * Get base URL provider from local storage
     * @returns {string} The stored provider or 'groq' if not found
     */
    function getBaseUrlProvider() {
        return localStorage.getItem(STORAGE_KEYS.BASE_URL_PROVIDER) || 'groq';
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

    // Public API
    return {
        STORAGE_KEYS: STORAGE_KEYS,
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
        getDefaultBaseUrlForProvider: getDefaultBaseUrlForProvider
    };
})();
