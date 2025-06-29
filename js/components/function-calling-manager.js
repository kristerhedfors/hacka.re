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
         * Add a function to the function calling system
         * @param {string} name - Function name
         * @param {string} code - JavaScript function code
         * @param {string} description - Function description for the collection
         * @returns {boolean} Success status
         */
        function addFunction(name, code, description) {
            try {
                // Generate tool definition from the function code
                const toolDefinition = FunctionToolsService.generateToolDefinition(code);
                if (!toolDefinition) {
                    console.error(`Failed to generate tool definition for function: ${name}`);
                    return false;
                }
                
                // Create collection metadata - use a single collection for all MCP functions
                const collectionId = 'mcp_tools_collection';
                const collectionMetadata = {
                    name: 'MCP Tools',
                    description: 'Functions from Model Context Protocol servers',
                    source: 'mcp'
                };
                
                // Add the function using the service
                FunctionToolsService.addJsFunction(name, code, toolDefinition, collectionId, collectionMetadata);
                
                // Enable the function by default
                FunctionToolsService.enableJsFunction(name);
                
                // Refresh the function list UI
                renderFunctionList();
                
                console.log(`Successfully added and enabled MCP function: ${name}`);
                return true;
            } catch (error) {
                console.error(`Failed to add function ${name}:`, error);
                return false;
            }
        }
        
        /**
         * Check if a function already exists
         * @param {string} name - Function name to check
         * @returns {boolean} Whether the function exists
         */
        function hasFunction(name) {
            const functions = FunctionToolsService.getJsFunctions();
            return functions.hasOwnProperty(name);
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
            
            // Get MCP tool definitions
            let mcpToolDefinitions = [];
            if (window.MCPToolRegistry && typeof window.MCPToolRegistry.getAllTools === 'function') {
                const mcpTools = window.MCPToolRegistry.getAllTools({ connectedOnly: true });
                mcpToolDefinitions = mcpTools
                    .filter(tool => tool.enabled && tool.isMCPTool)
                    .map(tool => ({
                        type: 'function',
                        function: {
                            name: tool.name,
                            description: tool.description,
                            parameters: tool.parameters || tool.mcpMetadata?.inputSchema || {
                                type: 'object',
                                properties: {}
                            }
                        }
                    }));
            }
            
            // Combine all tool definitions
            const allToolDefinitions = [...userDefinedToolDefinitions, ...defaultFunctionToolDefinitions, ...mcpToolDefinitions];
            
            console.log(`Combined tool definitions: ${userDefinedToolDefinitions.length} user-defined + ${defaultFunctionToolDefinitions.length} default + ${mcpToolDefinitions.length} MCP = ${allToolDefinitions.length} total`);
            
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
            validateFunction,
            addFunction,
            hasFunction
        };
    }

    // Public API
    return {
        createFunctionCallingManager: createFunctionCallingManager
    };
})();
