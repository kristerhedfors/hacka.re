/**
 * API Key Manager Module
 * Handles API key-related functionality for the AIHackare application
 */

window.ApiKeyManager = (function() {
    /**
     * Create an API Key Manager instance
     * @returns {Object} API Key Manager instance
     */
    function createApiKeyManager() {
        /**
         * Save the API key
         * @param {string} apiKey - The API key to save
         * @param {Function} hideApiKeyModal - Function to hide API key modal
         * @param {Function} addSystemMessage - Function to add system message
         * @returns {boolean} True if API key was saved successfully
         */
        function saveApiKey(apiKey, hideApiKeyModal, addSystemMessage) {
            if (apiKey) {
                // Save API key to local storage
                StorageService.saveApiKey(apiKey);
                
                // Hide modal
                if (hideApiKeyModal) {
                    hideApiKeyModal();
                }
                
                // Add welcome message
                if (addSystemMessage) {
                    addSystemMessage('API key saved. You can now start chatting with AI models.');
                }
                
                return true;
            }
            
            return false;
        }
        
        /**
         * Get the current API key
         * @returns {string} Current API key
         */
        function getApiKey() {
            // Always get the API key from storage to ensure we have the latest value
            // This is especially important when the namespace changes due to title/subtitle changes
            return StorageService.getApiKey();
        }
        
        /**
         * Mask an API key, showing only first and last 4 bytes
         * @param {string} apiKey - The API key to mask
         * @returns {string} Masked API key
         */
        function maskApiKey(apiKey) {
            if (!apiKey || apiKey.length < 8) {
                return "Invalid API key format";
            }
            
            const first4 = apiKey.substring(0, 4);
            const last4 = apiKey.substring(apiKey.length - 4);
            const maskedLength = apiKey.length - 8;
            const maskedPart = '*'.repeat(maskedLength);
            
            return `${first4}${maskedPart}${last4}`;
        }
        
        // Public API
        return {
            saveApiKey,
            getApiKey,
            maskApiKey
        };
    }

    // Public API
    return {
        createApiKeyManager
    };
})();
