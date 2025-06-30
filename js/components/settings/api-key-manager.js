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
         * @param {Function} updateProvider - Function to update provider if auto-detected
         * @returns {boolean} True if API key was saved successfully
         */
        function saveApiKey(apiKey, hideApiKeyModal, addSystemMessage, updateProvider) {
            if (apiKey) {
                // Auto-detect provider and update if detected
                var detection = window.ApiKeyDetector ? window.ApiKeyDetector.detectProvider(apiKey) : null;
                if (detection && updateProvider) {
                    updateProvider(detection.provider);
                }
                
                // Save API key to local storage
                StorageService.saveApiKey(apiKey);
                
                // Hide modal
                if (hideApiKeyModal) {
                    hideApiKeyModal();
                }
                
                // Add welcome message with provider info if detected
                if (addSystemMessage) {
                    var message = detection 
                        ? 'API key saved and ' + detection.providerName + ' provider auto-selected. You can now start chatting with AI models.'
                        : 'API key saved. You can now start chatting with AI models.';
                    addSystemMessage(message);
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

        /**
         * Get provider detection info for an API key
         * @param {string} apiKey - The API key to analyze
         * @returns {Object|null} Detection result with provider info
         */
        function getProviderDetection(apiKey) {
            return window.ApiKeyDetector ? window.ApiKeyDetector.detectProvider(apiKey) : null;
        }
        
        // Public API
        return {
            saveApiKey,
            getApiKey,
            maskApiKey,
            getProviderDetection
        };
    }

    // Public API
    return {
        createApiKeyManager
    };
})();
