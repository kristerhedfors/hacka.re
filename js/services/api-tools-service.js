/**
 * API Tools Service
 * Handles tool declarations and execution for OpenAI-compatible API tool calling
 */

window.ApiToolsService = (function() {
    // Storage key for tool calling setting
    const TOOL_CALLING_ENABLED_KEY = 'tool_calling_enabled';
    
    // Registry of available tools
    const toolRegistry = {};
    
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
        
        return Object.entries(toolRegistry).map(([name, tool]) => {
            return tool.definition;
        });
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
     * @returns {Promise<Array>} Array of tool results
     */
    async function processToolCalls(toolCalls) {
        if (!isToolCallingEnabled() || !toolCalls || toolCalls.length === 0) {
            return [];
        }
        
        const toolResults = [];
        
        for (const toolCall of toolCalls) {
            try {
                const result = await executeToolCall(toolCall);
                toolResults.push(result);
            } catch (error) {
                console.error('Error processing tool call:', error);
                
                // Add error result
                toolResults.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: toolCall.function.name,
                    content: JSON.stringify({ error: error.message })
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
    
    // Initialize built-in tools
    initializeBuiltInTools();
    
    // Public API
    return {
        isToolCallingEnabled,
        setToolCallingEnabled,
        registerTool,
        getRegisteredTools,
        getToolDefinitions,
        executeToolCall,
        processToolCalls
    };
})();
