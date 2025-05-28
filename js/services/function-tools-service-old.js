/**
 * Function Tools Service
 * Handles JavaScript function to tool declaration conversion for OpenAI-compatible API tool calling
 */

window.FunctionToolsService = (function() {
    // Storage keys
    const FUNCTION_TOOLS_ENABLED_KEY = 'function_tools_enabled';
    const JS_FUNCTIONS_KEY = 'js_functions';
    const ENABLED_FUNCTIONS_KEY = 'enabled_functions';
    const FUNCTION_GROUPS_KEY = 'function_groups';
    
    // Registry of JavaScript functions
    let jsFunctions = {};
    let enabledFunctions = [];
    let functionGroups = {}; // Maps function names to group IDs
    
    /**
     * Check if function tools are enabled
     * @returns {boolean} Whether function tools are enabled
     */
    function isFunctionToolsEnabled() {
        const enabled = CoreStorageService.getValue(FUNCTION_TOOLS_ENABLED_KEY) === true;
        console.log("[FunctionTools Debug] isFunctionToolsEnabled called");
        console.log("[FunctionTools Debug] - Storage key:", FUNCTION_TOOLS_ENABLED_KEY);
        console.log("[FunctionTools Debug] - Raw storage value:", CoreStorageService.getValue(FUNCTION_TOOLS_ENABLED_KEY));
        console.log("[FunctionTools Debug] - Parsed enabled state:", enabled);
        console.log("[FunctionTools Debug] - Return value:", enabled);
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
        
        const storedFunctionGroups = CoreStorageService.getValue(FUNCTION_GROUPS_KEY);
        if (storedFunctionGroups) {
            functionGroups = storedFunctionGroups;
        }
    }
    
    /**
     * Save JavaScript functions to storage
     */
    function saveJsFunctions() {
        CoreStorageService.setValue(JS_FUNCTIONS_KEY, jsFunctions);
        CoreStorageService.setValue(ENABLED_FUNCTIONS_KEY, enabledFunctions);
        CoreStorageService.setValue(FUNCTION_GROUPS_KEY, functionGroups);
    }
    
    /**
     * Add a JavaScript function
     * @param {string} name - The name of the function
     * @param {string} code - The JavaScript function code
     * @param {Object} toolDefinition - The tool definition generated from the function
     * @param {string} groupId - Optional group ID to associate functions that were defined together
     * @returns {boolean} Whether the function was added successfully
     */
    function addJsFunction(name, code, toolDefinition, groupId) {
        // Validate inputs
        if (!name || !code || !toolDefinition) {
            return false;
        }
        
        // Generate a group ID if not provided
        if (!groupId) {
            groupId = 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        // Add the function to the registry
        jsFunctions[name] = {
            code: code,
            toolDefinition: toolDefinition
        };
        
        // Associate the function with its group
        functionGroups[name] = groupId;
        
        // Save to storage
        saveJsFunctions();
        
        return true;
    }
    
    /**
     * Remove a JavaScript function and all functions in its group
     * @param {string} name - The name of the function to remove
     * @returns {boolean} Whether the function was removed successfully
     */
    function removeJsFunction(name) {
        if (jsFunctions[name]) {
            // Get the group ID for this function
            const groupId = functionGroups[name];
            
            if (groupId) {
                // Find all functions in the same group
                const functionsInGroup = Object.keys(functionGroups).filter(
                    funcName => functionGroups[funcName] === groupId
                );
                
                // Remove all functions in the group
                functionsInGroup.forEach(funcName => {
                    delete jsFunctions[funcName];
                    delete functionGroups[funcName];
                    
                    // Also remove from enabled functions if present
                    enabledFunctions = enabledFunctions.filter(fn => fn !== funcName);
                });
            } else {
                // If no group ID (legacy data), just remove this function
                delete jsFunctions[name];
                delete functionGroups[name];
                
                // Also remove from enabled functions if present
                enabledFunctions = enabledFunctions.filter(funcName => funcName !== name);
            }
            
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
     * Get enabled tool definitions for API requests
     * @returns {Array} Array of enabled tool definitions in OpenAI format
     */
    function getEnabledToolDefinitions() {
        console.log("FunctionToolsService.getEnabledToolDefinitions called");
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
     * @deprecated Use getEnabledToolDefinitions() instead
     * Get tool definitions for API requests
     * @returns {Array} Array of tool definitions in OpenAI format
     */
    function getToolDefinitions() {
        console.log("FunctionToolsService.getToolDefinitions called (DEPRECATED - use getEnabledToolDefinitions instead)");
        return getEnabledToolDefinitions();
    }
    
    /**
     * Execute a JavaScript function
     * @param {string} name - The name of the function to execute
     * @param {Object} args - The arguments to pass to the function
     * @returns {Promise<any>} The result of the function execution
     */
    async function executeJsFunction(name, args) {
        console.log("[FunctionTools Debug] executeJsFunction called");
        console.log("[FunctionTools Debug] - Function name:", name);
        console.log("[FunctionTools Debug] - Arguments:", args);
        console.log("[FunctionTools Debug] - Arguments type:", typeof args);
        console.log("[FunctionTools Debug] - Arguments JSON:", JSON.stringify(args));
        
        // Validate function exists
        const functionData = jsFunctions[name];
        console.log("[FunctionTools Debug] - Function exists in registry:", !!functionData);
        console.log("[FunctionTools Debug] - Function data:", functionData ? "present" : "missing");
        
        if (!functionData || !functionData.code) {
            console.error("[FunctionTools Debug] - Function validation failed");
            console.error("[FunctionTools Debug] - Available functions:", Object.keys(jsFunctions));
            throw new Error(`Function "${name}" not found or has no code`);
        }
        
        // Validate arguments
        if (args === undefined || args === null) {
            console.error("[FunctionTools Debug] - Arguments validation failed");
            console.error("[FunctionTools Debug] - Args value:", args);
            throw new Error(`Invalid arguments provided to function "${name}"`);
        }
        
        // Set execution timeout (30 seconds)
        const EXECUTION_TIMEOUT = 30000;
        let timeoutId;
        const executionStartTime = Date.now();
        
        console.log("[FunctionTools Debug] - Starting function execution");
        console.log("[FunctionTools Debug] - Execution timeout:", EXECUTION_TIMEOUT, "ms");
        console.log("[FunctionTools Debug] - Start time:", executionStartTime);
        
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
            
            console.log("[FunctionTools Debug] - Sandbox created with keys:", Object.keys(sandbox));
            
            // Create a function constructor with limited scope
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            console.log("[FunctionTools Debug] - AsyncFunction constructor ready");
            
            // Include all functions in the execution environment
            let allFunctionsCode = '';
            const allFunctionNames = Object.keys(jsFunctions);
            console.log("[FunctionTools Debug] - All available functions:", allFunctionNames);
            
            // First add all non-callable functions (auxiliary functions)
            for (const funcName in jsFunctions) {
                if (funcName !== name) {  // Skip the function we're calling, we'll add it last
                    allFunctionsCode += jsFunctions[funcName].code + '\n\n';
                    console.log("[FunctionTools Debug] - Added auxiliary function:", funcName);
                }
            }
            
            // Then add the function we're calling
            allFunctionsCode += functionData.code;
            console.log("[FunctionTools Debug] - Added target function:", name);
            console.log("[FunctionTools Debug] - Total code length:", allFunctionsCode.length, "characters");
            
            // Extract function signature to determine how to call it
            const functionCode = functionData.code;
            const functionMatch = functionCode.match(/^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/);
            
            console.log("[FunctionTools Debug] - Function signature match:", !!functionMatch);
            if (functionMatch) {
                console.log("[FunctionTools Debug] - Matched function name:", functionMatch[1]);
                console.log("[FunctionTools Debug] - Matched parameters:", functionMatch[2]);
            }
            
            let functionCallCode;
            if (functionMatch) {
                const paramsString = functionMatch[2];
                
                if (paramsString.trim()) {
                    // Function has parameters - extract parameter names
                    const params = paramsString.split(',').map(p => {
                        // Handle parameters with default values (e.g., "quantity = 1")
                        const paramName = p.trim().split('=')[0].trim();
                        // Remove any type annotations or destructuring
                        return paramName.replace(/^\{|\}$/g, '').split(':')[0].trim();
                    });
                    console.log("[FunctionTools Debug] - Extracted parameters:", params);
                    
                    // Create function call with individual parameters extracted from args object
                    const paramExtractions = params.map(param => `args.${param}`).join(', ');
                    functionCallCode = `return ${name}(${paramExtractions});`;
                    console.log("[FunctionTools Debug] - Function call code (with params):", functionCallCode);
                } else {
                    // Function has no parameters
                    functionCallCode = `return ${name}();`;
                    console.log("[FunctionTools Debug] - Function call code (no params):", functionCallCode);
                }
            } else {
                // Fallback to original method if we can't parse the function signature
                functionCallCode = `return ${name}(args);`;
                console.log("[FunctionTools Debug] - Function call code (fallback):", functionCallCode);
            }
            
            // Create the function with the sandbox as its scope
            const fullExecutionCode = `
                // Include all functions in the execution environment
                ${allFunctionsCode}
                
                // Call the function with properly extracted parameters
                ${functionCallCode}
            `;
            
            console.log("[FunctionTools Debug] - Creating AsyncFunction with sandbox keys:", Object.keys(sandbox));
            console.log("[FunctionTools Debug] - Full execution code preview:", fullExecutionCode.substring(0, 200) + "...");
            
            const func = new AsyncFunction(
                ...Object.keys(sandbox),
                fullExecutionCode
            );
            
            console.log("[FunctionTools Debug] - AsyncFunction created successfully");
            
            // Create a promise that rejects after timeout
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    console.error("[FunctionTools Debug] - Function execution timed out");
                    reject(new Error(`Function "${name}" execution timed out after ${EXECUTION_TIMEOUT/1000} seconds`));
                }, EXECUTION_TIMEOUT);
            });
            
            console.log("[FunctionTools Debug] - Starting function execution race");
            
            // Race the function execution against the timeout
            const result = await Promise.race([
                func(...Object.values(sandbox)),
                timeoutPromise
            ]);
            
            const executionEndTime = Date.now();
            const executionDuration = executionEndTime - executionStartTime;
            
            console.log("[FunctionTools Debug] - Function execution completed");
            console.log("[FunctionTools Debug] - Execution duration:", executionDuration, "ms");
            console.log("[FunctionTools Debug] - Result type:", typeof result);
            console.log("[FunctionTools Debug] - Result value:", result);
            
            // Clear the timeout if function completed successfully
            clearTimeout(timeoutId);
            
            // Validate result is serializable
            try {
                const serializedResult = JSON.stringify(result);
                console.log("[FunctionTools Debug] - Result serialization successful");
                console.log("[FunctionTools Debug] - Serialized result length:", serializedResult.length, "characters");
                console.log("[FunctionTools Debug] - Serialized result preview:", serializedResult.substring(0, 200) + (serializedResult.length > 200 ? "..." : ""));
            } catch (jsonError) {
                console.error("[FunctionTools Debug] - Result serialization failed:", jsonError);
                throw new Error(`Function "${name}" returned a non-serializable result: ${jsonError.message}`);
            }
            
            console.log("[FunctionTools Debug] - Function execution successful, returning result");
            return result;
        } catch (error) {
            // Clear timeout if it exists
            if (timeoutId) clearTimeout(timeoutId);
            
            const executionEndTime = Date.now();
            const executionDuration = executionEndTime - executionStartTime;
            
            console.error("[FunctionTools Debug] - Function execution failed");
            console.error("[FunctionTools Debug] - Execution duration before error:", executionDuration, "ms");
            console.error("[FunctionTools Debug] - Error type:", error.constructor.name);
            console.error("[FunctionTools Debug] - Error message:", error.message);
            console.error("[FunctionTools Debug] - Error stack:", error.stack);
            
            // Provide more specific error messages based on error type
            if (error instanceof TypeError) {
                console.error("[FunctionTools Debug] - TypeError details:", error);
                throw new Error(`Type error in function "${name}": ${error.message}`);
            } else if (error instanceof ReferenceError) {
                console.error("[FunctionTools Debug] - ReferenceError details:", error);
                throw new Error(`Reference error in function "${name}": ${error.message}`);
            } else if (error instanceof SyntaxError) {
                console.error("[FunctionTools Debug] - SyntaxError details:", error);
                throw new Error(`Syntax error in function "${name}": ${error.message}`);
            } else {
                console.error("[FunctionTools Debug] - Other error details:", error);
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
        console.log("[FunctionTools Debug] processToolCalls called");
        console.log("[FunctionTools Debug] - Tool calls input:", toolCalls);
        console.log("[FunctionTools Debug] - Tool calls type:", typeof toolCalls);
        console.log("[FunctionTools Debug] - Tool calls length:", toolCalls ? toolCalls.length : "N/A");
        console.log("[FunctionTools Debug] - addSystemMessage callback:", typeof addSystemMessage);
        
        if (!toolCalls || toolCalls.length === 0) {
            console.log("[FunctionTools Debug] - No tool calls to process, returning empty array");
            return [];
        }
        
        const toolResults = [];
        console.log("[FunctionTools Debug] - Processing", toolCalls.length, "tool calls");
        
        for (let i = 0; i < toolCalls.length; i++) {
            const toolCall = toolCalls[i];
            console.log(`[FunctionTools Debug] - Processing tool call ${i + 1}/${toolCalls.length}`);
            console.log(`[FunctionTools Debug] - Tool call ${i + 1} data:`, toolCall);
            
            try {
                if (!toolCall.function) {
                    console.error(`[FunctionTools Debug] - Tool call ${i + 1} missing function property`);
                    throw new Error('Invalid tool call format: missing function property');
                }
                
                const { name, arguments: argsString } = toolCall.function;
                console.log(`[FunctionTools Debug] - Tool call ${i + 1} function name:`, name);
                console.log(`[FunctionTools Debug] - Tool call ${i + 1} arguments string:`, argsString);
                console.log(`[FunctionTools Debug] - Tool call ${i + 1} arguments type:`, typeof argsString);
                console.log(`[FunctionTools Debug] - Tool call ${i + 1} ID:`, toolCall.id);
                
                if (!name) {
                    console.error(`[FunctionTools Debug] - Tool call ${i + 1} missing function name`);
                    throw new Error('Invalid tool call format: missing function name');
                }
                
                // Check if function exists
                console.log(`[FunctionTools Debug] - Checking if function "${name}" exists in registry`);
                console.log(`[FunctionTools Debug] - Available functions:`, Object.keys(jsFunctions));
                console.log(`[FunctionTools Debug] - Function exists:`, !!jsFunctions[name]);
                
                if (!jsFunctions[name]) {
                    const errorMsg = `Function "${name}" not found`;
                    console.error(`[FunctionTools Debug] - ${errorMsg}`);
                    if (addSystemMessage) {
                        addSystemMessage(`Error: ${errorMsg}`);
                    }
                    throw new Error(errorMsg);
                }
                
                // Check if function is enabled
                console.log(`[FunctionTools Debug] - Checking if function "${name}" is enabled`);
                console.log(`[FunctionTools Debug] - Enabled functions:`, enabledFunctions);
                console.log(`[FunctionTools Debug] - Function is enabled:`, enabledFunctions.includes(name));
                
                if (!enabledFunctions.includes(name)) {
                    const errorMsg = `Function "${name}" is disabled`;
                    console.error(`[FunctionTools Debug] - ${errorMsg}`);
                    if (addSystemMessage) {
                        addSystemMessage(`Error: ${errorMsg}`);
                    }
                    throw new Error(errorMsg);
                }
                
                // Parse arguments from string to object
                let args;
                console.log(`[FunctionTools Debug] - Parsing arguments for function "${name}"`);
                console.log(`[FunctionTools Debug] - Raw arguments string:`, argsString);
                
                try {
                    // First try to parse as JSON
                    args = JSON.parse(argsString);
                    console.log(`[FunctionTools Debug] - JSON parsing successful for "${name}"`);
                    console.log(`[FunctionTools Debug] - Parsed arguments:`, args);
                    console.log(`[FunctionTools Debug] - Parsed arguments type:`, typeof args);
                } catch (parseError) {
                    console.log(`[FunctionTools Debug] - JSON parsing failed for "${name}":`, parseError.message);
                    
                    // If JSON parsing fails, try to parse as space-separated arguments
                    try {
                        console.log(`[FunctionTools Debug] - Attempting alternative parsing for "${name}"`);
                        
                        // Get the parameter names from the function definition
                        const functionDef = jsFunctions[name];
                        const paramNames = [];
                        
                        console.log(`[FunctionTools Debug] - Function definition:`, functionDef);
                        
                        if (functionDef && functionDef.toolDefinition && 
                            functionDef.toolDefinition.function && 
                            functionDef.toolDefinition.function.parameters && 
                            functionDef.toolDefinition.function.parameters.properties) {
                            
                            // Get parameter names from the tool definition
                            Object.keys(functionDef.toolDefinition.function.parameters.properties).forEach(paramName => {
                                paramNames.push(paramName);
                            });
                            
                            console.log(`[FunctionTools Debug] - Extracted parameter names:`, paramNames);
                            
                            // If we have parameter names, try to parse space-separated values
                            if (paramNames.length > 0) {
                                // Split by spaces, but respect quoted strings
                                const argValues = argsString.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
                                console.log(`[FunctionTools Debug] - Split argument values:`, argValues);
                                
                                // Create an object with parameter names and values
                                args = {};
                                paramNames.forEach((paramName, index) => {
                                    if (index < argValues.length) {
                                        let value = argValues[index];
                                        // Remove quotes if present
                                        if (value.startsWith('"') && value.endsWith('"')) {
                                            value = value.substring(1, value.length - 1);
                                        }
                                        args[paramName] = value;
                                        console.log(`[FunctionTools Debug] - Mapped parameter "${paramName}" to value:`, value);
                                    }
                                });
                                
                                console.log(`[FunctionTools Debug] - Alternative parsing result for "${name}":`, args);
                            } else {
                                console.error(`[FunctionTools Debug] - No parameter names found for function "${name}"`);
                                throw new Error(`No parameter names found for function "${name}"`);
                            }
                        } else {
                            console.error(`[FunctionTools Debug] - No parameter definitions found for function "${name}"`);
                            throw new Error(`No parameter definitions found for function "${name}"`);
                        }
                    } catch (alternativeParseError) {
                        console.error(`[FunctionTools Debug] - Alternative parsing also failed:`, alternativeParseError.message);
                        
                        // If both parsing methods fail, throw the original error
                        const errorMsg = `Invalid arguments format for function "${name}": ${parseError.message}`;
                        if (addSystemMessage) {
                            addSystemMessage(`Error: ${errorMsg}`);
                            addSystemMessage(`Note: Alternative parsing also failed: ${alternativeParseError.message}`);
                        }
                        throw new Error(errorMsg);
                    }
                }
                
                // Log function execution
                console.log(`[FunctionTools Debug] - About to execute function "${name}" with args:`, args);
                
                // Only show function execution details in debug mode
                if (addSystemMessage && window.DebugService && DebugService.getDebugMode()) {
                    // Format the arguments as JSON on a single line
                    try {
                        const parsedArgs = JSON.parse(argsString);
                        const formattedArgs = JSON.stringify(parsedArgs);
                        
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
                const executionStartTime = Date.now();
                console.log(`[FunctionTools Debug] - Starting execution of function "${name}" at:`, executionStartTime);
                
                const result = await executeJsFunction(name, args);
                
                const executionEndTime = Date.now();
                const executionDuration = executionEndTime - executionStartTime;
                console.log(`[FunctionTools Debug] - Function "${name}" execution completed in:`, executionDuration, "ms");
                console.log(`[FunctionTools Debug] - Function "${name}" result:`, result);
                console.log(`[FunctionTools Debug] - Function "${name}" result type:`, typeof result);
                
                // Log successful execution
                if (addSystemMessage && window.DebugService && DebugService.getDebugMode()) {
                    addSystemMessage(`Function "${name}" executed successfully`);
                }
                
                // Create tool result
                const toolResult = {
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: name,
                    content: JSON.stringify(result)
                };
                
                console.log(`[FunctionTools Debug] - Created tool result for "${name}":`, toolResult);
                console.log(`[FunctionTools Debug] - Tool result content length:`, toolResult.content.length, "characters");
                
                toolResults.push(toolResult);
                console.log(`[FunctionTools Debug] - Added tool result ${toolResults.length} to results array`);
                
            } catch (error) {
                console.error(`[FunctionTools Debug] - Error processing tool call ${i + 1}:`, error);
                console.error(`[FunctionTools Debug] - Error type:`, error.constructor.name);
                console.error(`[FunctionTools Debug] - Error message:`, error.message);
                console.error(`[FunctionTools Debug] - Error stack:`, error.stack);
                
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
                const errorResult = {
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: toolCall.function?.name || 'unknown',
                    content: JSON.stringify({ 
                        error: error.message,
                        status: 'error',
                        timestamp: new Date().toISOString()
                    })
                };
                
                console.log(`[FunctionTools Debug] - Created error result for tool call ${i + 1}:`, errorResult);
                toolResults.push(errorResult);
                console.log(`[FunctionTools Debug] - Added error result ${toolResults.length} to results array`);
            }
        }
        
        console.log(`[FunctionTools Debug] - Finished processing all tool calls`);
        console.log(`[FunctionTools Debug] - Total results:`, toolResults.length);
        console.log(`[FunctionTools Debug] - Final tool results:`, toolResults);
        
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
    
    /**
     * Get all functions in the same group as the specified function
     * @param {string} name - The name of the function
     * @returns {Array} Array of function names in the same group
     */
    function getFunctionsInSameGroup(name) {
        if (!functionGroups[name]) {
            return [name]; // Return just this function if no group info
        }
        
        const groupId = functionGroups[name];
        return Object.keys(functionGroups).filter(
            funcName => functionGroups[funcName] === groupId
        );
    }
    
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
        getEnabledToolDefinitions,
        getToolDefinitions, // Deprecated
        executeJsFunction,
        processToolCalls,
        generateToolDefinition,
        getFunctionsInSameGroup
    };
})();
