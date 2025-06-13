/**
 * UI Coordinator Module
 * Orchestrates all UI sub-components
 */

window.UICoordinator = (function() {
    /**
     * Create a UI Coordinator instance
     * @param {Object} elements - DOM elements
     * @param {Object} config - Configuration options
     * @returns {Object} UI Coordinator instance
     */
    function createUICoordinator(elements, config) {
        // Initialize sub-components
        const modalManager = ModalManager.createModalManager(elements);
        const contextUsageDisplay = ContextUsageDisplay.createContextUsageDisplay(elements);
        const modelInfoDisplay = ModelInfoDisplay.createModelInfoDisplay(elements);
        const shareUIManager = ShareUIManager.createShareUIManager(elements);
        
        /**
         * Show the API key modal
         */
        function showApiKeyModal() {
            return modalManager.showApiKeyModal();
        }
        
        /**
         * Hide the API key modal
         */
        function hideApiKeyModal() {
            return modalManager.hideApiKeyModal();
        }
        
        /**
         * Show the settings modal
         * @param {string} apiKey - Current API key
         * @param {string} currentModel - Current model ID
         * @param {string} systemPrompt - Current system prompt
         * @param {Function} fetchAvailableModels - Function to fetch available models
         * @param {Function} populateDefaultModels - Function to populate default models
         */
        function showSettingsModal(apiKey, currentModel, systemPrompt, fetchAvailableModels, populateDefaultModels) {
            return modalManager.showSettingsModal({
                apiKey,
                currentModel,
                fetchAvailableModels,
                populateDefaultModels
            });
        }
        
        /**
         * Hide the settings modal
         * @param {string} apiKey - Saved API key
         * @param {string} baseUrl - Saved base URL
         * @param {string} currentModel - Saved model ID
         * @param {string} systemPrompt - Saved system prompt
         */
        function hideSettingsModal(apiKey, baseUrl, currentModel, systemPrompt) {
            return modalManager.hideSettingsModal({
                apiKey,
                baseUrl,
                currentModel
            });
        }
        
        /**
         * Show the share modal
         * @param {string} apiKey - Current API key
         * @param {Function} updateLinkLengthBar - Function to update link length bar
         * @param {string} sessionKey - Session key (if any)
         * @param {boolean} isSessionKeyLocked - Whether the session key is locked
         * @param {Function} loadShareOptions - Function to load share options from storage
         */
        function showShareModal(apiKey, updateLinkLengthBar, sessionKey, isSessionKeyLocked, loadShareOptions) {
            // Initialize share modal UI
            shareUIManager.initializeShareModal({
                apiKey,
                sessionKey,
                isSessionKeyLocked,
                loadShareOptions
            });
            
            // Initialize link length bar
            updateLinkLengthBar();
            
            // Show modal
            return modalManager.showShareModal();
        }
        
        /**
         * Hide the share modal
         */
        function hideShareModal() {
            return modalManager.hideShareModal();
        }
        
        /**
         * Show the function modal
         */
        function showFunctionModal() {
            return modalManager.showFunctionModal();
        }
        
        /**
         * Hide the function modal
         */
        function hideFunctionModal() {
            return modalManager.hideFunctionModal();
        }
        
        /**
         * Toggle password visibility in share modal
         */
        function togglePasswordVisibility() {
            return shareUIManager.togglePasswordVisibility();
        }
        
        /**
         * Toggle message history input based on conversation checkbox
         */
        function toggleMessageHistoryInput() {
            return shareUIManager.toggleMessageHistoryInput();
        }
        
        /**
         * Update the link length bar in share modal
         * @param {string} apiKey - Current API key
         * @param {string} systemPrompt - Current system prompt
         * @param {string} currentModel - Current model ID
         * @param {Array} messages - Current messages
         */
        function updateLinkLengthBar(apiKey, systemPrompt, currentModel, messages) {
            return shareUIManager.updateLinkLengthBar({
                apiKey,
                systemPrompt,
                currentModel,
                messages
            });
        }
        
        /**
         * Update the model info display in the header
         * @param {string} currentModel - Current model ID
         */
        function updateModelInfoDisplay(currentModel) {
            modelInfoDisplay.updateModelInfoDisplay(currentModel);
        }
        
        /**
         * Update the context usage display
         * @param {number} percentage - Usage percentage (0-100)
         * @param {number} [estimatedTokens] - Estimated token count
         * @param {number} [contextSize] - Context window size
         */
        function updateContextUsage(percentage, estimatedTokens, contextSize) {
            // Update context usage display
            contextUsageDisplay.updateContextUsage(percentage, estimatedTokens, contextSize);
            
            // Refresh model display to ensure consistency
            const currentModel = StorageService.getModel();
            modelInfoDisplay.refreshModelDisplay(currentModel);
        }
        
        /**
         * Generate a QR code for the share link
         * @param {string} link - The link to encode in the QR code
         */
        function generateShareQRCode(link) {
            return shareUIManager.generateShareQRCode(link);
        }
        
        // Public API
        return {
            // Modal management
            showApiKeyModal,
            hideApiKeyModal,
            showSettingsModal,
            hideSettingsModal,
            showShareModal,
            hideShareModal,
            showFunctionModal,
            hideFunctionModal,
            
            // Share UI management
            togglePasswordVisibility,
            toggleMessageHistoryInput,
            updateLinkLengthBar,
            generateShareQRCode,
            
            // Display updates
            updateModelInfoDisplay,
            updateContextUsage
        };
    }
    
    // Public API
    return {
        createUICoordinator: createUICoordinator
    };
})();