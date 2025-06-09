/**
 * Function Copy Manager Module
 * Handles copying of function code, tool definitions, and function libraries
 */

window.FunctionCopyManager = (function() {
    /**
     * Create a Function Copy Manager instance
     * @param {Object} elements - DOM elements
     * @param {Function} addSystemMessage - Function to add a system message to the chat
     * @returns {Object} Function Copy Manager instance
     */
    function createFunctionCopyManager(elements, addSystemMessage) {
        /**
         * Initialize the function copy manager
         */
        function init() {
            // Add event listeners for copy buttons
            if (elements.copyFunctionCodeBtn) {
                elements.copyFunctionCodeBtn.addEventListener('click', copyFunctionCode);
            }
            
            if (elements.copyToolDefinitionBtn) {
                elements.copyToolDefinitionBtn.addEventListener('click', copyToolDefinition);
            }
            
            // Add event listener for copying function library
            if (elements.copyFunctionLibraryBtn) {
                elements.copyFunctionLibraryBtn.addEventListener('click', copyFunctionLibrary);
            }
            
            console.log('Function Copy Manager initialized');
        }
        
        /**
         * Copy function code to clipboard
         */
        function copyFunctionCode() {
            if (!elements.functionCode) return;
            
            const code = elements.functionCode.value.trim();
            if (!code) {
                if (addSystemMessage) {
                    addSystemMessage('No function code to copy.');
                }
                return;
            }
            
            // Copy to clipboard
            navigator.clipboard.writeText(code)
                .then(() => {
                    if (addSystemMessage) {
                        addSystemMessage('Function code copied to clipboard.');
                    }
                })
                .catch(err => {
                    console.error('Failed to copy function code:', err);
                    if (addSystemMessage) {
                        addSystemMessage('Failed to copy function code. Please try again.');
                    }
                });
        }
        
        /**
         * Copy tool definition to clipboard
         */
        function copyToolDefinition() {
            if (!elements.functionToolDefinition) return;
            
            const toolDefinition = elements.functionToolDefinition.textContent.trim();
            if (!toolDefinition || !elements.functionToolDefinition.classList.contains('active')) {
                if (addSystemMessage) {
                    addSystemMessage('No tool definition to copy. Please validate the function first.');
                }
                return;
            }
            
            // Copy to clipboard
            navigator.clipboard.writeText(toolDefinition)
                .then(() => {
                    if (addSystemMessage) {
                        addSystemMessage('Tool definition copied to clipboard.');
                    }
                })
                .catch(err => {
                    console.error('Failed to copy tool definition:', err);
                    if (addSystemMessage) {
                        addSystemMessage('Failed to copy tool definition. Please try again.');
                    }
                });
        }
        
        /**
         * Copy entire function library as JSON to clipboard
         */
        function copyFunctionLibrary() {
            // Get all functions
            const functions = FunctionToolsService.getJsFunctions();
            
            if (!functions || Object.keys(functions).length === 0) {
                if (addSystemMessage) {
                    addSystemMessage('No functions in library to copy.');
                }
                return;
            }
            
            try {
                // Create a JSON representation of the functions library
                const functionsLibrary = {};
                
                // For each function, include its code and tool definition
                Object.keys(functions).forEach(name => {
                    functionsLibrary[name] = {
                        code: functions[name].code,
                        toolDefinition: functions[name].toolDefinition,
                        enabled: FunctionToolsService.isJsFunctionEnabled(name)
                    };
                });
                
                // Convert to JSON string with pretty formatting
                const jsonString = JSON.stringify(functionsLibrary, null, 2);
                
                // Copy to clipboard
                navigator.clipboard.writeText(jsonString)
                    .then(() => {
                        if (addSystemMessage) {
                            addSystemMessage('Function library copied to clipboard as JSON.');
                        }
                    })
                    .catch(err => {
                        console.error('Failed to copy function library:', err);
                        if (addSystemMessage) {
                            addSystemMessage('Failed to copy function library. Please try again.');
                        }
                    });
            } catch (error) {
                console.error('Error serializing function library:', error);
                if (addSystemMessage) {
                    addSystemMessage(`Error copying function library: ${error.message}`);
                }
            }
        }
        
        // Public API
        return {
            init,
            copyFunctionCode,
            copyToolDefinition,
            copyFunctionLibrary
        };
    }

    // Public API
    return {
        createFunctionCopyManager: createFunctionCopyManager
    };
})();