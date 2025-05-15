/**
 * Function Tools Service
 * Handles JavaScript function to tool declaration conversion for OpenAI-compatible API tool calling
 */

window.FunctionToolsService = (function() {
    // Storage keys
    const FUNCTION_TOOLS_ENABLED_KEY = 'function_tools_enabled';
    const JS_FUNCTIONS_KEY = 'js_functions';
    const ENABLED_FUNCTIONS_KEY = 'enabled_functions';
    
    // Registry of JavaScript functions
    let jsFunctions = {};
    let enabledFunctions = [];
    
    /**
     * Check if function tools are enabled
     * @returns {boolean} Whether function tools are enabled
     */
    function isFunctionToolsEnabled() {
        const enabled = CoreStorageService.getValue(FUNCTION_TOOLS_ENABLED_KEY) === true;
        console.log("FunctionToolsService.isFunctionToolsEnabled called, returning:", enabled);
        console.log("- FUNCTION_TOOLS_ENABLED_KEY value:", CoreStorageService.getValue(FUNCTION_TOOLS_ENABLED_KEY));
        return enabled;
    }
    
    /**
     * Set function tools enabled state
     * @param {boolean} enabled - Whether function tools should be enabled
     * @param {Function} addSystemMessage - Optional callback to add a system message
     */
    function setFunctionToolsEnabled(enabled, addSystemMessage) {
        const previousState = isFunctionToolsEnabled();
        console.log("FunctionToolsService.setFunctionToolsEnabled called with:", enabled);
        console.log("- Previous state:", previousState);
        
        CoreStorageService.setValue(FUNCTION_TOOLS_ENABLED_KEY, enabled);
        console.log("- New state set in storage:", enabled);
        console.log("- Verifying new state:", CoreStorageService.getValue(FUNCTION_TOOLS_ENABLED_KEY));
        
        // Display status message if the state has changed and a callback is provided
        if (addSystemMessage && previousState !== enabled) {
            if (enabled) {
                // Get list of available functions
                const functions = Object.keys(jsFunctions);
                const functionsMessage = functions.length > 0 
                    ? `Available functions: ${functions.join(', ')}`
                    : 'No functions currently defined';
                
                addSystemMessage(`Function tools activated. ${functionsMessage}`);
                console.log("- System message added for activation");
            } else {
                addSystemMessage('Function tools deactivated. No functions are available.');
                console.log("- System message added for deactivation");
            }
        }
    }
    
    /**
     * Load JavaScript functions from storage
     */
    function loadJsFunctions() {
        const storedFunctions = CoreStorageService.getValue(JS_FUNCTIONS_KEY);
        if (storedFunctions) {
            jsFunctions = storedFunctions;
        }
        
        const storedEnabledFunctions = CoreStorageService.getValue(ENABLED_FUNCTIONS_KEY);
        if (storedEnabledFunctions) {
            enabledFunctions = storedEnabledFunctions;
        }
    }
    
    /**
     * Save JavaScript functions to storage
     */
    function saveJsFunctions() {
        CoreStorageService.setValue(JS_FUNCTIONS_KEY, jsFunctions);
        CoreStorageService.setValue(ENABLED_FUNCTIONS_KEY, enabledFunctions);
    }
    
    /**
     * Add a JavaScript function
     * @param {string} name - The name of the function
     * @param {string} code - The JavaScript function code
     * @param {Object} toolDefinition - The tool definition generated from the function
     * @returns {boolean} Whether the function was added successfully
     */
    function addJsFunction(name, code, toolDefinition) {
        // Validate inputs
        if (!name || !code || !toolDefinition) {
            return false;
        }
        
        // Add the function to the registry
        jsFunctions[name] = {
            code: code,
            toolDefinition: toolDefinition
        };
        
        // Save to storage
        saveJsFunctions();
        
        return true;
    }
    
    /**
     * Remove a JavaScript function
     * @param {string} name - The name of the function to remove
     * @returns {boolean} Whether the function was removed successfully
     */
    function removeJsFunction(name) {
        if (jsFunctions[name]) {
            delete jsFunctions[name];
            
            // Also remove from enabled functions if present
            enabledFunctions = enabledFunctions.filter(funcName => funcName !== name);
            
            // Save to storage
            saveJsFunctions();
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Get all JavaScript functions
     * @returns {Object} The JavaScript function registry
     */
    function getJsFunctions() {
        return jsFunctions;
    }
    
    /**
     * Enable a JavaScript function
     * @param {string} name - The name of the function to enable
     * @returns {boolean} Whether the function was enabled successfully
     */
    function enableJsFunction(name) {
        if (jsFunctions[name] && !enabledFunctions.includes(name)) {
            enabledFunctions.push(name);
            saveJsFunctions();
            return true;
        }
        
        return false;
    }
    
    /**
     * Disable a JavaScript function
     * @param {string} name - The name of the function to disable
     * @returns {boolean} Whether the function was disabled successfully
     */
    function disableJsFunction(name) {
        const index = enabledFunctions.indexOf(name);
        if (index !== -1) {
            enabledFunctions.splice(index, 1);
            saveJsFunctions();
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if a JavaScript function is enabled
     * @param {string} name - The name of the function to check
     * @returns {boolean} Whether the function is enabled
     */
    function isJsFunctionEnabled(name) {
        return enabledFunctions.includes(name);
    }
    
    /**
     * Get all enabled JavaScript functions
     * @returns {Array} Array of enabled JavaScript function objects
     */
    function getEnabledJsFunctions() {
        return enabledFunctions
            .filter(name => jsFunctions[name])
            .map(name => jsFunctions[name]);
    }
    
    /**
     * Get all enabled function names
     * @returns {Array} Array of enabled function names
     */
    function getEnabledFunctionNames() {
        return enabledFunctions;
    }
    
    /**
     * Get tool definitions for API requests
     * @returns {Array} Array of tool definitions in OpenAI format
     */
    function getToolDefinitions() {
        console.log("FunctionToolsService.getToolDefinitions called");
        console.log("- Enabled functions:", enabledFunctions);
        console.log("- Available functions:", Object.keys(jsFunctions));
        
        // Always return enabled functions, regardless of the global switch state
        const toolDefinitions = enabledFunctions
            .filter(name => jsFunctions[name] && jsFunctions[name].toolDefinition)
            .map(name => jsFunctions[name].toolDefinition);
        
        console.log("- Returning tool definitions:", toolDefinitions.length, toolDefinitions.map(t => t.function?.name));
        return toolDefinitions;
    }
    
    /**
     * Execute a JavaScript function
     * @param {string} name - The name of the function to execute
     * @param {Object} args - The arguments to pass to the function
     * @returns {Promise<any>} The result of the function execution
     */
    async function executeJsFunction(name, args) {
        // Validate function exists
        const functionData = jsFunctions[name];
        if (!functionData || !functionData.code) {
            throw new Error(`Function "${name}" not found or has no code`);
        }
        
        // Validate arguments
        if (args === undefined || args === null) {
            throw new Error(`Invalid arguments provided to function "${name}"`);
        }
        
        // Set execution timeout (30 seconds)
        const EXECUTION_TIMEOUT = 30000;
        let timeoutId;
        
        try {
            // Create a safe execution environment with limited capabilities
            const sandbox = {
                fetch: window.fetch.bind(window),
                console: console,
                setTimeout: setTimeout.bind(window),
                clearTimeout: clearTimeout.bind(window),
                JSON: JSON,
                Error: Error,
                args: args
            };
            
            // Create a function constructor with limited scope
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            
            // Create the function with the sandbox as its scope
            const func = new AsyncFunction(
                ...Object.keys(sandbox),
                `
                ${functionData.code}
                
                // Extract the function name from the code
                const funcMatch = ${functionData.code}.match(/^\\s*(?:async\\s+)?function\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*\\(/);
                if (!funcMatch) {
                    throw new Error('Could not extract function name');
                }
                
                const funcName = funcMatch[1];
                
                // Call the function with the provided arguments
                return eval(funcName)(args);
                `
            );
            
            // Create a promise that rejects after timeout
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error(`Function "${name}" execution timed out after ${EXECUTION_TIMEOUT/1000} seconds`));
                }, EXECUTION_TIMEOUT);
            });
            
            // Race the function execution against the timeout
            const result = await Promise.race([
                func(...Object.values(sandbox)),
                timeoutPromise
            ]);
            
            // Clear the timeout if function completed successfully
            clearTimeout(timeoutId);
            
            // Validate result is serializable
            try {
                JSON.stringify(result);
            } catch (jsonError) {
                throw new Error(`Function "${name}" returned a non-serializable result: ${jsonError.message}`);
            }
            
            return result;
        } catch (error) {
            // Clear timeout if it exists
            if (timeoutId) clearTimeout(timeoutId);
            
            console.error(`Error executing function "${name}":`, error);
            
            // Provide more specific error messages based on error type
            if (error instanceof TypeError) {
                throw new Error(`Type error in function "${name}": ${error.message}`);
            } else if (error instanceof ReferenceError) {
                throw new Error(`Reference error in function "${name}": ${error.message}`);
            } else if (error instanceof SyntaxError) {
                throw new Error(`Syntax error in function "${name}": ${error.message}`);
            } else {
                throw error;
            }
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
                
                const { name, arguments: argsString } = toolCall.function;
                
                if (!name) {
                    throw new Error('Invalid tool call format: missing function name');
                }
                
                // Check if function exists
                if (!jsFunctions[name]) {
                    const errorMsg = `Function "${name}" not found`;
                    if (addSystemMessage) {
                        addSystemMessage(`Error: ${errorMsg}`);
                    }
                    throw new Error(errorMsg);
                }
                
                // Check if function is enabled
                if (!enabledFunctions.includes(name)) {
                    const errorMsg = `Function "${name}" is disabled`;
                    if (addSystemMessage) {
                        addSystemMessage(`Error: ${errorMsg}`);
                    }
                    throw new Error(errorMsg);
                }
                
                // Parse arguments from string to object
                let args;
                try {
                    args = JSON.parse(argsString);
                } catch (parseError) {
                    const errorMsg = `Invalid arguments format for function "${name}": ${parseError.message}`;
                    if (addSystemMessage) {
                        addSystemMessage(`Error: ${errorMsg}`);
                    }
                    throw new Error(errorMsg);
                }
                
                // Log function execution
                if (addSystemMessage) {
                    // Format the arguments as JSON on a single line
                    try {
                        const args = JSON.parse(argsString);
                        const formattedArgs = JSON.stringify(args);
                        
                        // Add function call in the requested format
                        addSystemMessage(`Function call requested by model: ${name}(${formattedArgs})`);
                        
                        // Add execution message
                        addSystemMessage(`Executing function "${name}"`);
                    } catch (e) {
                        // If parsing fails, just show the raw arguments
                        addSystemMessage(`Function call requested by model: ${name}(${argsString})`);
                        addSystemMessage(`Executing function "${name}"`);
                    }
                }
                
                // Execute the JavaScript function
                const result = await executeJsFunction(name, args);
                
                // Log successful execution
                if (addSystemMessage) {
                    addSystemMessage(`Function "${name}" executed successfully`);
                }
                
                toolResults.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: name,
                    content: JSON.stringify(result)
                });
            } catch (error) {
                console.error('Error processing tool call:', error);
                
                // Log error to user if callback provided
                if (addSystemMessage) {
                    // Add header message
                    addSystemMessage(`Error executing function:`);
                    
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
    
    /**
     * Generate a tool definition from a JavaScript function
     * @param {string} code - The JavaScript function code
     * @returns {Object} The generated tool definition, or null if generation failed
     */
    function generateToolDefinition(code) {
        try {
            // Extract function name and parameters
            const functionMatch = code.match(/^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/);
            if (!functionMatch) {
                return null;
            }
            
            const functionName = functionMatch[1];
            const paramsString = functionMatch[2];
            
            // Create a basic tool definition
            const toolDefinition = {
                type: 'function',
                function: {
                    name: functionName,
                    description: `Function ${functionName} for tool calling`,
                    parameters: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                }
            };
            
            // Extract parameters
            if (paramsString.trim()) {
                const params = paramsString.split(',').map(p => p.trim());
                
                params.forEach(param => {
                    // Check for default values
                    const hasDefault = param.includes('=');
                    const paramName = hasDefault ? param.split('=')[0].trim() : param;
                    
                    toolDefinition.function.parameters.properties[paramName] = {
                        type: 'string', // Default to string type
                        description: `Parameter ${paramName} for function ${functionName}`
                    };
                    
                    // If no default value, consider it required
                    if (!hasDefault) {
                        toolDefinition.function.parameters.required.push(paramName);
                    }
                });
            }
            
            // Try to extract JSDoc comments for description and param types
            const jsDocMatch = code.match(/\/\*\*\s*([\s\S]*?)\s*\*\//);
            if (jsDocMatch) {
                const jsDoc = jsDocMatch[1];
                
                // Extract function description
                const descMatch = jsDoc.match(/@description\s+(.*?)(?=\s*@|\s*\*\/|$)/s);
                if (descMatch) {
                    toolDefinition.function.description = descMatch[1].replace(/\s*\*\s*/g, ' ').trim();
                }
                
                // Extract param descriptions and types
                const paramMatches = jsDoc.matchAll(/@param\s+{([^}]+)}\s+([^\s]+)\s+(.*?)(?=\s*@|\s*\*\/|$)/gs);
                for (const match of paramMatches) {
                    const [, type, name, description] = match;
                    
                    if (toolDefinition.function.parameters.properties[name]) {
                        toolDefinition.function.parameters.properties[name].type = mapJSTypeToJSONType(type);
                        toolDefinition.function.parameters.properties[name].description = description.replace(/\s*\*\s*/g, ' ').trim();
                    }
                }
            }
            
            return toolDefinition;
        } catch (error) {
            console.error('Error generating tool definition:', error);
            return null;
        }
    }
    
    /**
     * Map JavaScript types to JSON Schema types
     * @param {string} jsType - JavaScript type
     * @returns {string} JSON Schema type
     */
    function mapJSTypeToJSONType(jsType) {
        const typeMap = {
            'string': 'string',
            'number': 'number',
            'boolean': 'boolean',
            'object': 'object',
            'array': 'array',
            'null': 'null',
            'undefined': 'null',
            'any': 'string'
        };
        
        return typeMap[jsType.toLowerCase()] || 'string';
    }
    
    // Initialize
    loadJsFunctions();
    
    // Public API
    return {
        isFunctionToolsEnabled,
        setFunctionToolsEnabled,
        addJsFunction,
        removeJsFunction,
        getJsFunctions,
        enableJsFunction,
        disableJsFunction,
        isJsFunctionEnabled,
        getEnabledJsFunctions,
        getEnabledFunctionNames,
        getToolDefinitions,
        executeJsFunction,
        processToolCalls,
        generateToolDefinition
    };
})();
