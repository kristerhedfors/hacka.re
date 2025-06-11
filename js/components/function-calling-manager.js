/**
 * Function Calling Manager Module
 * Main orchestrator for function calling UI - coordinates between smaller component modules
 */

window.FunctionCallingManager = (function() {
    /**
     * Create a Function Calling Manager instance
     * @param {Object} elements - DOM elements
     * @param {Function} addSystemMessage - Function to add a system message to the chat
     * @returns {Object} Function Calling Manager instance
     */
    function createFunctionCallingManager(elements, addSystemMessage) {
        // Component instances
        let functionModalManager = null;
        let mcpServerManager = null;
        let functionListRenderer = null;
        let functionEditorManager = null;
        let functionCopyManager = null;
        let defaultFunctionsManager = null;
        /**
         * Initialize the function calling manager and all components
         */
        function init() {
            // Initialize component managers
            if (window.FunctionModalManager) {
                functionModalManager = window.FunctionModalManager.createFunctionModalManager(elements, addSystemMessage);
                functionModalManager.init();
            }
            
            if (window.McpServerManager) {
                mcpServerManager = window.McpServerManager.createMcpServerManager(elements, addSystemMessage);
                mcpServerManager.init();
            }
            
            if (window.FunctionListRenderer) {
                functionListRenderer = window.FunctionListRenderer.createFunctionListRenderer(elements, addSystemMessage);
                // Store globally for other components to access
                window.FunctionListRenderer = functionListRenderer;
            }
            
            if (window.FunctionEditorManager) {
                functionEditorManager = window.FunctionEditorManager.createFunctionEditorManager(elements, addSystemMessage);
                functionEditorManager.init();
                // Store globally for other components to access
                window.FunctionEditorManager = functionEditorManager;
            }
            
            if (window.FunctionCopyManager) {
                functionCopyManager = window.FunctionCopyManager.createFunctionCopyManager(elements, addSystemMessage);
                functionCopyManager.init();
            }
            
            if (window.DefaultFunctionsManager) {
                defaultFunctionsManager = window.DefaultFunctionsManager.createDefaultFunctionsManager(elements, addSystemMessage);
                // Store globally for other components to access
                window.DefaultFunctionsManager = defaultFunctionsManager;
            }
            
            // Load selected default functions if available
            if (window.DefaultFunctionsService) {
                DefaultFunctionsService.loadSelectedDefaultFunctions();
                console.log('Default functions loaded');
            }
            
            console.log('Function Calling Manager initialized with all components');
        }
        
        
        /**
         * Show the function modal
         */
        function showFunctionModal() {
            if (functionModalManager) {
                functionModalManager.showFunctionModal();
            }
        }
        
        /**
         * Hide the function modal
         */
        function hideFunctionModal() {
            if (functionModalManager) {
                functionModalManager.hideFunctionModal();
            }
        }
        
        /**
         * Show the MCP servers modal
         */
        function showMcpServersModal() {
            if (mcpServerManager) {
                mcpServerManager.showMcpServersModal();
            }
        }
        
        /**
         * Hide the MCP servers modal
         */
        function hideMcpServersModal() {
            if (mcpServerManager) {
                mcpServerManager.hideMcpServersModal();
            }
        }
        
        /**
         * Render the list of connected MCP servers
         */
        function renderMcpServersList() {
            if (mcpServerManager) {
                mcpServerManager.renderMcpServersList();
            }
        }
        
        
        
        
        
        
        
        /**
         * Render only the main (user-defined + selected default) functions without affecting the default functions tree
         */
        function renderMainFunctionList() {
            if (functionListRenderer) {
                functionListRenderer.renderMainFunctionList();
            }
        }
        
        
        /**
         * Render the list of functions (full re-render)
         */
        function renderFunctionList() {
            if (functionListRenderer) {
                functionListRenderer.renderFunctionList();
            }
        }
        
        
        
        /**
         * Validate the function library code
         * @returns {Object} Validation result with success, message, and extracted functions
         */
        function validateFunction() {
            if (functionEditorManager) {
                return functionEditorManager.validateFunction();
            }
            return { success: false };
        }
        
        
        /**
         * Get function definitions for API requests
         * @returns {Array} Array of function definitions
         */
        function getFunctionDefinitions() {
            const userDefinedToolDefinitions = FunctionToolsService.getEnabledToolDefinitions();
            
            // Get default function tool definitions
            let defaultFunctionToolDefinitions = [];
            if (window.DefaultFunctionsService && typeof window.DefaultFunctionsService.getEnabledDefaultFunctionToolDefinitions === 'function') {
                defaultFunctionToolDefinitions = window.DefaultFunctionsService.getEnabledDefaultFunctionToolDefinitions();
            }
            
            // Combine both user-defined and default function tool definitions
            const allToolDefinitions = [...userDefinedToolDefinitions, ...defaultFunctionToolDefinitions];
            
            console.log(`Combined tool definitions: ${userDefinedToolDefinitions.length} user-defined + ${defaultFunctionToolDefinitions.length} default = ${allToolDefinitions.length} total`);
            
            return allToolDefinitions;
        }
        
        // Public API
        return {
            init,
            showFunctionModal,
            hideFunctionModal,
            showMcpServersModal,
            hideMcpServersModal,
            renderFunctionList,
            getFunctionDefinitions,
            validateFunction
        };
    }

    // Public API
    return {
        createFunctionCallingManager: createFunctionCallingManager
    };
})();
