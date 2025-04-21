/**
 * Storage Service
 * Handles local storage operations for the application
 */

window.StorageService = (function() {
    // Storage keys
    const STORAGE_KEYS = {
        API_KEY: 'aihackare_api_key',
        MODEL: 'aihackare_model',
        HISTORY: 'aihackare_history'
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

    // Public API
    return {
        saveApiKey: saveApiKey,
        getApiKey: getApiKey,
        saveModel: saveModel,
        getModel: getModel,
        saveChatHistory: saveChatHistory,
        loadChatHistory: loadChatHistory,
        clearChatHistory: clearChatHistory
    };
})();
