/**
 * API Tools Manager Module
 * Handles tool-related functionality for the AIHackare application
 */

window.ApiToolsManager = (function() {
    /**
     * Create an API Tools Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} API Tools Manager instance
     */
    function createApiToolsManager(elements) {
        /**
         * Initialize the API tools manager
         */
        function init() {
            // Nothing to initialize at this point
            console.log('API Tools Manager initialized');
        }
        
        /**
         * Add tool calling setting to the settings form
         * @param {HTMLElement} settingsForm - The settings form element
         * @param {Function} addSystemMessage - Optional callback to add a system message
         */
        function addToolCallingSetting(settingsForm, addSystemMessage) {
            if (!settingsForm) return;
            
            // Ensure tool calling is always enabled
            ApiToolsService.setToolCallingEnabled(true);
            
            // We don't add any UI elements for tool calling here anymore
            // as it's now always enabled and controlled through the function calling modal
        }
        
        /**
         * Get enabled tool definitions for API requests with deduplication
         * @returns {Array} Array of enabled tool definitions in OpenAI format
         */
        function getToolDefinitions() {
            return ApiToolsService.getEnabledToolDefinitions();
        }
        
        /**
         * Process tool calls from the API response
         * @param {Array} toolCalls - Array of tool calls from the API
         * @param {Function} addSystemMessage - Optional callback to add a system message
         * @returns {Promise<Array>} Array of tool results
         */
        async function processToolCalls(toolCalls, addSystemMessage) {
            return ApiToolsService.processToolCalls(toolCalls, addSystemMessage);
        }
        
        // Public API
        return {
            init,
            addToolCallingSetting,
            getToolDefinitions,
            processToolCalls
        };
    }

    // Public API
    return {
        createApiToolsManager: createApiToolsManager
    };
})();
