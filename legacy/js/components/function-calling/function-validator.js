/**
 * Function Validator Module
 * Handles function validation, tool definition generation, and validation UI
 */

window.FunctionValidator = (function() {
    
    /**
     * Validate function code
     * @param {string} code - The function code to validate
     * @param {Object} elements - DOM elements for UI updates
     * @returns {Object} Validation result with success, message, and extracted functions
     */
    function validateFunction(code, elements) {
        // Reset validation result and tool definition
        hideValidationResult(elements);
        hideToolDefinition(elements);
        
        // Validate code
        if (!code || !code.trim()) {
            showValidationResult(elements, 'Function code is required', 'error');
            return { success: false };
        }
        
        try {
            // Check for basic syntax errors by trying to parse the code
            try {
                // Use Function constructor to check for syntax errors
                // This won't execute the code, just parse it
                new Function(code);
            } catch (syntaxError) {
                showValidationResult(elements, `Syntax error in code: ${syntaxError.message}`, 'error');
                return { success: false };
            }
            
            // Extract all functions from the code
            if (!window.FunctionParser || !window.FunctionParser.extractFunctions) {
                showValidationResult(elements, 'Function parser module not loaded yet. Please refresh the page.', 'error');
                return { success: false };
            }
            const functions = window.FunctionParser.extractFunctions(code);
            
            if (functions.length === 0) {
                showValidationResult(elements, 'No functions found in the code', 'error');
                return { success: false };
            }
            
            // Count callable functions
            const callableFunctions = functions.filter(func => func.isCallable);
            
            if (callableFunctions.length === 0) {
                showValidationResult(elements, 'No callable functions found. By default, all functions are callable unless at least one function is tagged with @callable or @tool (equivalent), or if functions are marked with @internal (which makes only non-@internal functions callable)', 'warning');
                // Still return success, but with a warning
                return { 
                    success: true,
                    functions: functions,
                    warning: true
                };
            }
            
            // Generate tool definitions for callable functions
            const toolDefinitions = callableFunctions.map(func => 
                generateToolDefinition(func.name, func.code)
            );
            
            // Show the first tool definition as an example
            if (toolDefinitions.length > 0) {
                showToolDefinition(elements, toolDefinitions[0]);
            }
            
            // Show success message
            showValidationResult(elements, `Library validated successfully! Found ${functions.length} functions, ${callableFunctions.length} marked as callable.`, 'success');
            
            return { 
                success: true, 
                functions: functions,
                callableFunctions: callableFunctions,
                toolDefinitions: toolDefinitions
            };
        } catch (error) {
            showValidationResult(elements, `Error validating function library: ${error.message}`, 'error');
            return { success: false };
        }
    }
    
    /**
     * Generate a tool definition from a function
     * @param {string} name - Function name
     * @param {string} code - Function code
     * @returns {Object} Tool definition
     */
    function generateToolDefinition(name, code) {
        // Create a basic tool definition
        const toolDefinition = {
            type: 'function',
            function: {
                name: name,
                description: `Function ${name} for tool calling`,
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            }
        };
        
        try {
            // Extract function parameters
            const paramMatch = code.match(/function\s+[^(]*\(([^)]*)\)/);
            if (paramMatch && paramMatch[1].trim()) {
                const params = paramMatch[1].split(',').map(p => p.trim());
                
                params.forEach(param => {
                    // Check for default values
                    const hasDefault = param.includes('=');
                    const paramName = hasDefault ? param.split('=')[0].trim() : param;
                    
                    toolDefinition.function.parameters.properties[paramName] = {
                        type: 'string', // Default to string type
                        description: `Parameter ${paramName} for function ${name}`
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
                        toolDefinition.function.parameters.properties[name].type = window.FunctionParser ? window.FunctionParser.mapJSTypeToJSONType(type) : 'string';
                        toolDefinition.function.parameters.properties[name].description = description.replace(/\s*\*\s*/g, ' ').trim();
                    }
                }
            }
            
            return toolDefinition;
        } catch (error) {
            console.error('Error generating tool definition:', error);
            return toolDefinition;
        }
    }
    
    /**
     * Show validation result
     * @param {Object} elements - DOM elements
     * @param {string} message - The message
     * @param {string} type - The type of message (success, error, warning)
     */
    function showValidationResult(elements, message, type) {
        if (elements.functionValidationResult) {
            elements.functionValidationResult.textContent = message;
            elements.functionValidationResult.className = 'function-validation-result';
            elements.functionValidationResult.classList.add(type);
        }
    }
    
    /**
     * Hide validation result
     * @param {Object} elements - DOM elements
     */
    function hideValidationResult(elements) {
        if (elements.functionValidationResult) {
            elements.functionValidationResult.className = 'function-validation-result';
        }
    }
    
    /**
     * Show tool definition
     * @param {Object} elements - DOM elements
     * @param {Object} toolDefinition - The tool definition
     */
    function showToolDefinition(elements, toolDefinition) {
        if (elements.functionToolDefinition) {
            elements.functionToolDefinition.textContent = JSON.stringify(toolDefinition, null, 2);
            elements.functionToolDefinition.classList.add('active');
        }
    }
    
    /**
     * Hide tool definition
     * @param {Object} elements - DOM elements
     */
    function hideToolDefinition(elements) {
        if (elements.functionToolDefinition) {
            elements.functionToolDefinition.classList.remove('active');
        }
    }
    
    // Public API
    return {
        validateFunction,
        generateToolDefinition,
        showValidationResult,
        hideValidationResult,
        showToolDefinition,
        hideToolDefinition
    };
})();