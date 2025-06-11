/**
 * Modal Manager Module
 * Handles all modal show/hide functionality
 */

window.ModalManager = (function() {
    /**
     * Create a Modal Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Modal Manager instance
     */
    function createModalManager(elements) {
        /**
         * Show the API key modal
         */
        function showApiKeyModal() {
            elements.apiKeyModal.classList.add('active');
            elements.apiKeyInput.focus();
        }
        
        /**
         * Hide the API key modal
         */
        function hideApiKeyModal() {
            elements.apiKeyModal.classList.remove('active');
        }
        
        /**
         * Show the settings modal
         * @param {Object} config - Configuration for the modal
         */
        function showSettingsModal(config) {
            const { apiKey, currentModel, fetchAvailableModels, populateDefaultModels } = config;
            
            // Update the API key field with masked value if exists
            if (apiKey) {
                elements.apiKeyUpdate.placeholder = '••••••••••••••••••••••••••';
                
                // Refresh models list when opening settings
                fetchAvailableModels();
            } else {
                populateDefaultModels();
            }
            
            // Set current model
            elements.modelSelect.value = currentModel;
            
            elements.settingsModal.classList.add('active');
        }
        
        /**
         * Hide the settings modal
         * @param {Object} savedValues - Saved values to restore
         */
        function hideSettingsModal(savedValues) {
            const { apiKey, baseUrl, currentModel } = savedValues;
            
            // Reset UI values to saved values when closing without saving
            if (apiKey) {
                elements.apiKeyUpdate.value = '';
                elements.apiKeyUpdate.placeholder = '••••••••••••••••••••••••••';
            }
            
            if (baseUrl) {
                elements.baseUrl.value = baseUrl;
            }
            
            if (currentModel) {
                elements.modelSelect.value = currentModel;
            }
            
            elements.settingsModal.classList.remove('active');
        }
        
        /**
         * Show the share modal
         */
        function showShareModal() {
            elements.shareModal.classList.add('active');
        }
        
        /**
         * Hide the share modal
         */
        function hideShareModal() {
            elements.shareModal.classList.remove('active');
        }
        
        /**
         * Show the function modal
         */
        function showFunctionModal() {
            if (elements.functionModal) {
                elements.functionModal.classList.add('active');
            }
        }
        
        /**
         * Hide the function modal
         */
        function hideFunctionModal() {
            if (elements.functionModal) {
                elements.functionModal.classList.remove('active');
            }
        }
        
        // Public API
        return {
            showApiKeyModal,
            hideApiKeyModal,
            showSettingsModal,
            hideSettingsModal,
            showShareModal,
            hideShareModal,
            showFunctionModal,
            hideFunctionModal
        };
    }
    
    // Public API
    return {
        createModalManager: createModalManager
    };
})();