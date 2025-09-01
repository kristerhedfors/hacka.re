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
            
            
            // Add event listener for copying tool definitions (new button)
            if (elements.copyToolDefinitionsBtn) {
                elements.copyToolDefinitionsBtn.addEventListener('click', copyToolDefinition);
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
         * Copy all enabled tool definitions to clipboard
         */
        function copyToolDefinition() {
            try {
                // Get enabled user-defined function tool definitions
                const enabledUserToolDefs = FunctionToolsService ? FunctionToolsService.getEnabledToolDefinitions() : [];
                
                // Get enabled default function tool definitions
                const enabledDefaultToolDefs = window.DefaultFunctionsService ? window.DefaultFunctionsService.getEnabledDefaultFunctionToolDefinitions() : [];
                
                // Combine both arrays
                const allEnabledToolDefinitions = [...enabledUserToolDefs, ...enabledDefaultToolDefs];
                
                if (allEnabledToolDefinitions.length === 0) {
                    if (addSystemMessage) {
                        addSystemMessage('No enabled functions to copy tool definitions for. Please enable some functions first.');
                    }
                    return;
                }
                
                // Convert to JSON string with pretty formatting
                const jsonString = JSON.stringify(allEnabledToolDefinitions, null, 2);
                
                // Copy to clipboard
                navigator.clipboard.writeText(jsonString)
                    .then(() => {
                        const count = allEnabledToolDefinitions.length;
                        if (addSystemMessage) {
                            addSystemMessage(`${count} tool definitions copied to clipboard as JSON.`);
                        }
                    })
                    .catch(err => {
                        console.error('Failed to copy tool definitions:', err);
                        if (addSystemMessage) {
                            addSystemMessage('Failed to copy tool definitions. Please try again.');
                        }
                    });
            } catch (error) {
                console.error('Error serializing tool definitions:', error);
                if (addSystemMessage) {
                    addSystemMessage(`Error copying tool definitions: ${error.message}`);
                }
            }
        }
        
        /**
         * Copy enabled function library as plain JavaScript functions to clipboard
         */
        function copyFunctionLibrary() {
            try {
                // Get enabled user-defined functions
                const enabledUserFunctions = FunctionToolsService ? FunctionToolsService.getEnabledJsFunctions() : {};
                
                // Get enabled default functions
                const enabledDefaultFunctions = window.DefaultFunctionsService ? window.DefaultFunctionsService.getEnabledDefaultFunctions() : {};
                
                // Create array to maintain order - default functions first (in library order), then user-defined
                const functionCodes = [];
                
                // Add enabled default functions first, in the order they appear in the default function collections
                if (window.DefaultFunctionsService) {
                    const defaultCollections = window.DefaultFunctionsService.getDefaultFunctionCollections();
                    
                    defaultCollections.forEach(collection => {
                        if (collection.functions) {
                            collection.functions.forEach(func => {
                                // Check if this function is enabled
                                if (enabledDefaultFunctions[func.name]) {
                                    functionCodes.push(func.code);
                                }
                            });
                        }
                    });
                }
                
                // Add enabled user-defined functions after default functions
                Object.keys(enabledUserFunctions).forEach(name => {
                    functionCodes.push(enabledUserFunctions[name].code);
                });
                
                if (functionCodes.length === 0) {
                    if (addSystemMessage) {
                        addSystemMessage('No enabled functions to copy. Please enable some functions first.');
                    }
                    return;
                }
                
                // Join all function code with double newlines for separation
                const allFunctionCode = functionCodes.join('\n\n');
                
                // Copy to clipboard
                navigator.clipboard.writeText(allFunctionCode)
                    .then(() => {
                        const count = functionCodes.length;
                        if (addSystemMessage) {
                            addSystemMessage(`${count} enabled JavaScript functions copied to clipboard.`);
                        }
                    })
                    .catch(err => {
                        console.error('Failed to copy function library:', err);
                        if (addSystemMessage) {
                            addSystemMessage('Failed to copy function library. Please try again.');
                        }
                    });
            } catch (error) {
                console.error('Error copying function library:', error);
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