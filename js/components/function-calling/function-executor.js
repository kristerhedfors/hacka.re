/**
 * Function Executor Module
 * Handles function execution coordination, error handling, and result processing
 */

window.FunctionExecutor = (function() {
    
    /**
     * Execute function validation and processing workflow
     * @param {string} code - Function code to execute
     * @param {Object} elements - DOM elements
     * @returns {Object} Execution result
     */
    function executeValidationWorkflow(code, elements) {
        // Validate the function library first
        const validation = window.FunctionValidator.validateFunction(code, elements);
        
        if (!validation.success) {
            return { success: false, validation: validation };
        }
        
        return { success: true, validation: validation };
    }
    
    /**
     * Process function addition workflow
     * @param {Object} validation - Validation result
     * @param {string|null} editingFunctionName - Name of function being edited
     * @param {Function} addSystemMessage - Function to add system messages
     * @param {Object} elements - DOM elements
     * @returns {Object} Processing result
     */
    function processFunctionAddition(validation, editingFunctionName, addSystemMessage, elements) {
        let collectionId;
        
        // If we're in edit mode, handle it differently
        if (editingFunctionName) {
            // Get the original collection ID to preserve it
            const functionCollections = FunctionToolsService.getFunctionCollections();
            collectionId = functionCollections[editingFunctionName];
            
            // Remove the old function collection
            FunctionToolsService.removeJsFunction(editingFunctionName);
        }
        
        // Process all functions
        if (validation.functions && validation.functions.length > 0) {
            const result = window.FunctionLibraryManager.addFunctionsToLibrary(
                validation.functions,
                validation.callableFunctions || [],
                validation.toolDefinitions || [],
                collectionId,
                addSystemMessage
            );
            
            if (!result.success) {
                return result;
            }
            
            // Show success message
            if (result.addedFunctions.length === 1) {
                window.FunctionValidator.showValidationResult(elements, `Function "${result.addedFunctions[0]}" added successfully.`, 'success');
            } else if (result.addedFunctions.length > 1) {
                window.FunctionValidator.showValidationResult(elements, `${result.addedFunctions.length} functions added successfully.`, 'success');
            } else {
                window.FunctionValidator.showValidationResult(elements, 'No functions were added. Please check your code.', 'error');
            }
            
            return { success: true, addedFunctions: result.addedFunctions };
        } else {
            // No callable functions found
            window.FunctionValidator.showValidationResult(elements, 'No callable functions found. By default, all functions are callable unless at least one function is tagged with @callable or @tool (equivalent), or if functions are marked with @internal (which makes only non-@internal functions callable)', 'warning');
            return { success: false, warning: true };
        }
    }
    
    /**
     * Handle function execution errors
     * @param {Error} error - The error that occurred
     * @param {Object} elements - DOM elements
     */
    function handleExecutionError(error, elements) {
        console.error('Function execution error:', error);
        window.FunctionValidator.showValidationResult(elements, `Error executing function: ${error.message}`, 'error');
    }
    
    /**
     * Execute function code safety check
     * @param {string} code - Code to check
     * @returns {Object} Safety check result
     */
    function performSafetyCheck(code) {
        try {
            // Use Function constructor to check for syntax errors
            // This won't execute the code, just parse it
            new Function(code);
            return { safe: true };
        } catch (syntaxError) {
            return { safe: false, error: syntaxError.message };
        }
    }
    
    /**
     * Log function execution for debugging
     * @param {string} functionName - Name of the function
     * @param {Object} parameters - Function parameters
     * @param {Object} result - Execution result
     */
    function logFunctionExecution(functionName, parameters, result) {
        console.log(`Function executed: ${functionName}`, {
            parameters: parameters,
            result: result,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Execute function removal workflow
     * @param {string} functionName - Name of function to remove
     * @returns {Object} Removal result
     */
    function executeFunctionRemoval(functionName) {
        try {
            const success = FunctionToolsService.removeJsFunction(functionName);
            
            if (success) {
                // Update the function list display
                if (window.functionListRenderer) {
                    window.functionListRenderer.renderFunctionList();
                }
                
                return { success: true };
            } else {
                return { success: false, error: 'Failed to remove function' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Public API
    return {
        executeValidationWorkflow,
        processFunctionAddition,
        handleExecutionError,
        performSafetyCheck,
        logFunctionExecution,
        executeFunctionRemoval
    };
})();