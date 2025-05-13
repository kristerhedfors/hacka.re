/**
 * API Tools Service
 * Handles tool declarations and execution for OpenAI-compatible API tool calling
 */

window.ApiToolsService = (function() {
    // Storage keys
    const TOOL_CALLING_ENABLED_KEY = 'tool_calling_enabled';
    const OPENAPI_FUNCTIONS_KEY = 'openapi_functions';
    const ENABLED_FUNCTIONS_KEY = 'enabled_functions';
    
    // Registry of available tools
    const toolRegistry = {};
    
    // Registry of OpenAPI functions
    let openApiFunctions = {};
    let enabledFunctions = [];
    
    /**
     * Check if tool calling is enabled
     * @returns {boolean} Whether tool calling is enabled
     */
    function isToolCallingEnabled() {
        return CoreStorageService.getValue(TOOL_CALLING_ENABLED_KEY) === true;
    }
    
    /**
     * Set tool calling enabled state
     * @param {boolean} enabled - Whether tool calling should be enabled
     * @param {Function} addSystemMessage - Optional callback to add a system message
     */
    function setToolCallingEnabled(enabled, addSystemMessage) {
        const previousState = isToolCallingEnabled();
        CoreStorageService.setValue(TOOL_CALLING_ENABLED_KEY, enabled);
        
        // Display status message if the state has changed and a callback is provided
        if (addSystemMessage && previousState !== enabled) {
            if (enabled) {
                // Get list of available tools
                const tools = Object.keys(toolRegistry);
                const toolsMessage = tools.length > 0 
                    ? `Available tools: ${tools.join(', ')}`
                    : 'No tools currently registered';
                
                addSystemMessage(`Tool calling activated. ${toolsMessage}`);
            } else {
                addSystemMessage('Tool calling deactivated. No tools are available.');
            }
        }
    }
    
    /**
     * Register a tool in the registry
     * @param {string} name - The name of the tool
     * @param {Object} toolDefinition - The tool definition object
     * @param {Function} handler - The function that handles tool execution
     */
    function registerTool(name, toolDefinition, handler) {
        toolRegistry[name] = {
            definition: toolDefinition,
            handler: handler
        };
    }
    
    /**
     * Get all registered tools
     * @returns {Object} The tool registry
     */
    function getRegisteredTools() {
        return toolRegistry;
    }
    
    /**
     * Get tool definitions in OpenAI format for API requests
     * @returns {Array} Array of tool definitions in OpenAI format
     */
    function getToolDefinitions() {
        if (!isToolCallingEnabled()) {
            return [];
        }
        
        const registeredTools = Object.entries(toolRegistry).map(([name, tool]) => {
            return tool.definition;
        });
        
        // Add enabled OpenAPI functions
        const enabledOpenApiFunctions = getEnabledOpenApiFunctions();
        
        return [...registeredTools, ...enabledOpenApiFunctions];
    }
    
    /**
     * Load OpenAPI functions from storage
     */
    function loadOpenApiFunctions() {
        const storedFunctions = CoreStorageService.getValue(OPENAPI_FUNCTIONS_KEY);
        if (storedFunctions) {
            openApiFunctions = storedFunctions;
        }
        
        const storedEnabledFunctions = CoreStorageService.getValue(ENABLED_FUNCTIONS_KEY);
        if (storedEnabledFunctions) {
            enabledFunctions = storedEnabledFunctions;
        }
    }
    
    /**
     * Save OpenAPI functions to storage
     */
    function saveOpenApiFunctions() {
        CoreStorageService.setValue(OPENAPI_FUNCTIONS_KEY, openApiFunctions);
        CoreStorageService.setValue(ENABLED_FUNCTIONS_KEY, enabledFunctions);
    }
    
    /**
     * Add an OpenAPI function specification
     * @param {string} name - The name of the function
     * @param {Object} spec - The OpenAPI specification object
     * @returns {boolean} Whether the function was added successfully
     */
    function addOpenApiFunction(name, spec) {
        // Validate the spec
        if (!spec || !spec.type || spec.type !== 'function' || !spec.function || !spec.function.name) {
            return false;
        }
        
        // Ensure the function name in the spec matches the provided name
        if (spec.function.name !== name) {
            return false;
        }
        
        // Add the function to the registry
        openApiFunctions[name] = spec;
        
        // Save to storage
        saveOpenApiFunctions();
        
        return true;
    }
    
    /**
     * Remove an OpenAPI function specification
     * @param {string} name - The name of the function to remove
     */
    function removeOpenApiFunction(name) {
        if (openApiFunctions[name]) {
            delete openApiFunctions[name];
            
            // Also remove from enabled functions if present
            enabledFunctions = enabledFunctions.filter(funcName => funcName !== name);
            
            // Save to storage
            saveOpenApiFunctions();
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Get all OpenAPI function specifications
     * @returns {Object} The OpenAPI function registry
     */
    function getOpenApiFunctions() {
        return openApiFunctions;
    }
    
    /**
     * Enable an OpenAPI function
     * @param {string} name - The name of the function to enable
     */
    function enableOpenApiFunction(name) {
        if (openApiFunctions[name] && !enabledFunctions.includes(name)) {
            enabledFunctions.push(name);
            saveOpenApiFunctions();
            return true;
        }
        
        return false;
    }
    
    /**
     * Disable an OpenAPI function
     * @param {string} name - The name of the function to disable
     */
    function disableOpenApiFunction(name) {
        const index = enabledFunctions.indexOf(name);
        if (index !== -1) {
            enabledFunctions.splice(index, 1);
            saveOpenApiFunctions();
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if an OpenAPI function is enabled
     * @param {string} name - The name of the function to check
     * @returns {boolean} Whether the function is enabled
     */
    function isOpenApiFunctionEnabled(name) {
        return enabledFunctions.includes(name);
    }
    
    /**
     * Get all enabled OpenAPI functions
     * @returns {Array} Array of enabled OpenAPI function specifications
     */
    function getEnabledOpenApiFunctions() {
        return enabledFunctions
            .filter(name => openApiFunctions[name])
            .map(name => openApiFunctions[name]);
    }
    
    /**
     * Get all enabled function names
     * @returns {Array} Array of enabled function names
     */
    function getEnabledFunctionNames() {
        return enabledFunctions;
    }
    
    /**
     * Execute a tool based on the tool call from the API
     * @param {Object} toolCall - The tool call object from the API
     * @returns {Promise<Object>} The result of the tool execution
     */
    async function executeToolCall(toolCall) {
        const { name, arguments: args } = toolCall.function;
        
        if (!toolRegistry[name]) {
            throw new Error(`Tool "${name}" not found`);
        }
        
        try {
            // Parse arguments from string to object
            const parsedArgs = JSON.parse(args);
            
            // Execute the tool handler
            const result = await toolRegistry[name].handler(parsedArgs);
            
            return {
                tool_call_id: toolCall.id,
                role: "tool",
                name: name,
                content: JSON.stringify(result)
            };
        } catch (error) {
            console.error(`Error executing tool "${name}":`, error);
            
            return {
                tool_call_id: toolCall.id,
                role: "tool",
                name: name,
                content: JSON.stringify({ error: error.message })
            };
        }
    }
    
    /**
     * Process tool calls from the API response
     * @param {Array} toolCalls - Array of tool calls from the API
     * @param {Function} addSystemMessage - Optional callback to add a system message
     * @returns {Promise<Array>} Array of tool results
     */
    async function processToolCalls(toolCalls, addSystemMessage) {
        if (!isToolCallingEnabled() || !toolCalls || toolCalls.length === 0) {
            return [];
        }
        
        const toolResults = [];
        
        for (const toolCall of toolCalls) {
            try {
                if (!toolCall.function) {
                    throw new Error('Invalid tool call format: missing function property');
                }
                
                const { name } = toolCall.function;
                
                if (!name) {
                    throw new Error('Invalid tool call format: missing function name');
                }
                
                // Check if tool exists
                if (!toolRegistry[name]) {
                    const errorMsg = `Tool "${name}" not found`;
                    if (addSystemMessage) {
                        addSystemMessage(`Error: ${errorMsg}`);
                    }
                    throw new Error(errorMsg);
                }
                
                // Log tool execution
                if (addSystemMessage) {
                    addSystemMessage(`Executing tool "${name}"`);
                }
                
                const result = await executeToolCall(toolCall);
                
                // Log successful execution
                if (addSystemMessage) {
                    addSystemMessage(`Tool "${name}" executed successfully`);
                }
                
                toolResults.push(result);
            } catch (error) {
                console.error('Error processing tool call:', error);
                
                // Log error to user if callback provided
                if (addSystemMessage) {
                    addSystemMessage(`Error executing tool: ${error.message}`);
                }
                
                // Add error result
                toolResults.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: toolCall.function?.name || 'unknown',
                    content: JSON.stringify({ 
                        error: error.message,
                        status: 'error',
                        timestamp: new Date().toISOString()
                    })
                });
            }
        }
        
        return toolResults;
    }
    
    // Initialize built-in tools
    function initializeBuiltInTools() {
        // Register math_addition_tool
        registerTool(
            "math_addition_tool",
            {
                type: "function",
                function: {
                    name: "math_addition_tool",
                    description: "Add two numbers together",
                    parameters: {
                        type: "object",
                        properties: {
                            a: {
                                type: "number",
                                description: "The first number"
                            },
                            b: {
                                type: "number",
                                description: "The second number"
                            }
                        },
                        required: ["a", "b"]
                    }
                }
            },
            async function(args) {
                const { a, b } = args;
                
                if (typeof a !== 'number' || typeof b !== 'number') {
                    throw new Error("Both arguments must be numbers");
                }
                
                const result = a + b;
                return { result };
            }
        );
    }
    
    // Initialize
    initializeBuiltInTools();
    loadOpenApiFunctions();
    
    // Public API
    return {
        isToolCallingEnabled,
        setToolCallingEnabled,
        registerTool,
        getRegisteredTools,
        getToolDefinitions,
        executeToolCall,
        processToolCalls,
        addOpenApiFunction,
        removeOpenApiFunction,
        getOpenApiFunctions,
        enableOpenApiFunction,
        disableOpenApiFunction,
        isOpenApiFunctionEnabled,
        getEnabledOpenApiFunctions,
        getEnabledFunctionNames
    };
})();
