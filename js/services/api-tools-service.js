/**
 * API Tools Service
 * Handles tool declarations and execution for OpenAI-compatible API tool calling
 */

window.ApiToolsService = (function() {
    // Storage keys
    const TOOL_CALLING_ENABLED_KEY = 'tool_calling_enabled';
    
    // Registry of available built-in tools
    const builtInTools = {};
    
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
                const tools = Object.keys(builtInTools);
                const toolsMessage = tools.length > 0 
                    ? `Available built-in tools: ${tools.join(', ')}`
                    : 'No built-in tools currently registered';
                
                addSystemMessage(`Tool calling activated. ${toolsMessage}`);
            } else {
                addSystemMessage('Tool calling deactivated. No tools are available.');
            }
        }
    }
    
    /**
     * Register a built-in tool in the registry
     * @param {string} name - The name of the tool
     * @param {Object} toolDefinition - The tool definition object
     * @param {Function} handler - The function that handles tool execution
     */
    function registerBuiltInTool(name, toolDefinition, handler) {
        builtInTools[name] = {
            definition: toolDefinition,
            handler: handler
        };
    }
    
    /**
     * Get all registered built-in tools
     * @returns {Object} The built-in tool registry
     */
    function getBuiltInTools() {
        return builtInTools;
    }
    
    /**
     * Get enabled tool definitions in OpenAI format for API requests
     * @returns {Array} Array of enabled tool definitions in OpenAI format
     */
    function getEnabledToolDefinitions() {
        // Only return built-in tool definitions
        // User functions are handled by the function calling manager to avoid duplication
        const builtInToolDefinitions = Object.entries(builtInTools).map(([name, tool]) => {
            return tool.definition;
        });
        
        return builtInToolDefinitions;
    }
    
    /**
     * @deprecated Use getEnabledToolDefinitions() instead
     * Get tool definitions in OpenAI format for API requests
     * @returns {Array} Array of tool definitions in OpenAI format
     */
    function getToolDefinitions() {
        console.log("ApiToolsService.getToolDefinitions called (DEPRECATED - use getEnabledToolDefinitions instead)");
        return getEnabledToolDefinitions();
    }
    
    /**
     * Execute a built-in tool based on the tool call from the API
     * @param {Object} toolCall - The tool call object from the API
     * @returns {Promise<Object>} The result of the tool execution
     */
    async function executeBuiltInTool(toolCall) {
        const { name, arguments: args } = toolCall.function;
        
        if (!builtInTools[name]) {
            throw new Error(`Built-in tool "${name}" not found`);
        }
        
        try {
            // Parse arguments from string to object
            const parsedArgs = JSON.parse(args);
            
            // Execute the tool handler
            const result = await builtInTools[name].handler(parsedArgs);
            
            return {
                tool_call_id: toolCall.id,
                role: "tool",
                name: name,
                content: JSON.stringify(result)
            };
        } catch (error) {
            console.error(`Error executing built-in tool "${name}":`, error);
            
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
        if (!toolCalls || toolCalls.length === 0) {
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
                
                // Check if the tool is a built-in tool
                if (builtInTools[name]) {
                    // Log tool execution
                    if (addSystemMessage && window.DebugService && DebugService.getDebugMode()) {
                        addSystemMessage(`Executing built-in tool "${name}"`);
                    }
                    
                    const result = await executeBuiltInTool(toolCall);
                    
                    // Log successful execution
                    if (addSystemMessage && window.DebugService && DebugService.getDebugMode()) {
                        addSystemMessage(`Built-in tool "${name}" executed successfully`);
                    }
                    
                    toolResults.push(result);
                }
                // Check if the tool is a JavaScript function from FunctionToolsService
                else if (window.FunctionToolsService && 
                         typeof FunctionToolsService.isJsFunctionEnabled === 'function' && 
                         FunctionToolsService.isJsFunctionEnabled(name)) {
                    
                    // Delegate to FunctionToolsService for processing
                    if (addSystemMessage) {
                        // Let FunctionToolsService handle the system messages
                        const functionResults = await FunctionToolsService.processToolCalls([toolCall], addSystemMessage);
                        toolResults.push(...functionResults);
                    } else {
                        const functionResults = await FunctionToolsService.processToolCalls([toolCall]);
                        toolResults.push(...functionResults);
                    }
                }
                else {
                    const errorMsg = `Tool "${name}" not found`;
                    if (addSystemMessage) {
                        addSystemMessage(`Error: ${errorMsg}`);
                    }
                    throw new Error(errorMsg);
                }
            } catch (error) {
                console.error('Error processing tool call:', error);
                
                // Log error to user if callback provided
                if (addSystemMessage) {
                    // Add header message
                    addSystemMessage(`Error executing tool:`);
                    
                    // Use the debug service to display the error message
                    if (window.DebugService && typeof DebugService.displayMultilineDebug === 'function') {
                        DebugService.displayMultilineDebug(error.message, addSystemMessage);
                    } else {
                        // Fallback if debug service is not available
                        addSystemMessage(`  ${error.message}`);
                    }
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
        // TOOL COMMENTED OUT: To reactivate this tool, simply uncomment the code below
        /*
        // Register my_function
        registerBuiltInTool(
            "my_function",
            {
                type: "function",
                function: {
                    name: "my_function",
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
        */
    }
    
    // Initialize
    initializeBuiltInTools();
    
    // Public API
    return {
        isToolCallingEnabled,
        setToolCallingEnabled,
        registerBuiltInTool,
        getBuiltInTools,
        getEnabledToolDefinitions,
        getToolDefinitions, // Deprecated
        executeBuiltInTool,
        processToolCalls
    };
})();
