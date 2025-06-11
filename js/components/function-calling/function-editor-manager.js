/**
 * Function Editor Manager Module
 * Handles function code editing, validation, adding/updating functions
 */

window.FunctionEditorManager = (function() {
    /**
     * Create a Function Editor Manager instance
     * @param {Object} elements - DOM elements
     * @param {Function} addSystemMessage - Function to add a system message to the chat
     * @returns {Object} Function Editor Manager instance
     */
    function createFunctionEditorManager(elements, addSystemMessage) {
        // Track if we're editing an existing function
        let editingFunctionName = null;
        
        /**
         * Initialize the function editor manager
         */
        function init() {
            // Initialize the code editor with default content
            if (window.FunctionCodeEditor) {
                window.FunctionCodeEditor.initializeEditor(elements);
                
                // Set up auto-extraction of function name from code
                window.FunctionCodeEditor.setupAutoExtraction(elements, (functionName) => {
                    if (window.FunctionCodeEditor) {
                        window.FunctionCodeEditor.updateFunctionNameField(elements, functionName);
                    }
                });
            }
            
            // Set up event listeners
            if (elements.functionEditorForm) {
                elements.functionEditorForm.addEventListener('submit', handleAddFunction);
            }
            
            if (elements.functionValidateBtn) {
                elements.functionValidateBtn.addEventListener('click', validateFunction);
            }
            
            if (elements.functionClearBtn) {
                elements.functionClearBtn.addEventListener('click', clearFunctionEditor);
            }
            
            // Extract function name from default code after a short delay
            setTimeout(() => {
                if (window.FunctionParser && window.FunctionCodeEditor) {
                    const functionName = window.FunctionParser.extractFunctionName(
                        window.FunctionCodeEditor.getEditorContent(elements)
                    );
                    window.FunctionCodeEditor.updateFunctionNameField(elements, functionName);
                }
            }, 200);
            
            console.log('Function Editor Manager initialized with modular components');
        }
        
        /**
         * Get default function code example
         * @returns {string} Default function code
         */
        function getDefaultFunctionCode() {
            return `/**
 * Formats a number with commas as thousands separators
 * This is an auxiliary function that won't be exposed to the LLM
 * @param {number} num - The number to format
 * @returns {string} The formatted number
 */
function formatNumber(num) {
  return num.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");
}

/**
 * Multiplies two numbers together
 * @description A simple function that multiplies two numbers and returns the result
 * @param {number} a - The first number to multiply
 * @param {number} b - The second number to multiply
 * @returns {Object} IMPORTANT: Always return an object, not a primitive value.
 * @tool This function will be exposed to the LLM for tool calling
 */
function multiply_numbers(a, b) {
  // Validate inputs are numbers
  if (typeof a !== 'number' || typeof b !== 'number') {
    return { 
      error: "Both inputs must be numbers",
      success: false
    };
  }
  
  // Perform the multiplication
  const result = a * b;
  
  // Format the result using the auxiliary function
  const formattedResult = formatNumber(result);
  
  // IMPORTANT: Always return an object, not a primitive value like 'return result'
  // Returning a primitive value may cause issues with tool calling
  return {
    result: result,
    formattedResult: formattedResult,
    success: true
  };
}

/**
 * Gets the current weather for a location
 * @description Fetches current weather data for the specified location
 * @param {string} location - The location to get weather for
 * @param {string} units - The units to use (metric or imperial)
 * @returns {Object} Weather information
 * @callable This function will be exposed to the LLM for tool calling
 */
function get_weather(location, units = "metric") {
  // This is just a mock implementation
  return {
    location: location,
    temperature: 22,
    units: units,
    condition: "Sunny",
    humidity: "45%",
    formatted_temp: formatNumber(22) + (units === "metric" ? "°C" : "°F")
  };
}`;
        }
        
        /**
         * Validate the function library code (delegated to validator)
         * @returns {Object} Validation result with success, message, and extracted functions
         */
        function validateFunction() {
            if (!window.FunctionCodeEditor || !window.FunctionValidator) {
                console.error('Function modules not loaded yet');
                return { success: false, error: 'Modules not loaded yet' };
            }
            const code = window.FunctionCodeEditor.getEditorContent(elements);
            return window.FunctionValidator.validateFunction(code, elements);
        }
        
        
        /**
         * Load a function into the editor for editing
         * @param {string} name - Function name
         * @param {Object} functionSpec - Function specification
         */
        function loadFunctionIntoEditor(name, functionSpec) {
            // Set the editing flag
            editingFunctionName = name;
            
            // Set the function name
            if (elements.functionName) {
                elements.functionName.value = name;
                // Make it read-only since it's auto-completed
                elements.functionName.classList.add('auto-completed');
                elements.functionName.setAttribute('readonly', 'readonly');
            }
            
            // Get all functions in the same collection to preserve the bundle
            const relatedFunctions = FunctionToolsService.getFunctionsInSameCollection(name);
            const functions = FunctionToolsService.getJsFunctions();
            
            // Set the function code
            if (elements.functionCode) {
                let codeToLoad = functionSpec.code;
                
                // If there are multiple functions in the same collection, load them all
                if (relatedFunctions.length > 1) {
                    // Sort the functions to ensure consistent order
                    relatedFunctions.sort();
                    
                    // Combine the code of all related functions
                    codeToLoad = relatedFunctions
                        .filter(funcName => functions[funcName]) // Ensure the function exists
                        .map(funcName => functions[funcName].code)
                        .join('\n\n');
                }
                
                elements.functionCode.value = codeToLoad;
                
                // Trigger any event listeners that might be attached to the code editor
                const event = new Event('input', { bubbles: true });
                elements.functionCode.dispatchEvent(event);
            }
            
            // Scroll to the editor form
            if (elements.functionEditorForm) {
                elements.functionEditorForm.scrollIntoView({ behavior: 'smooth' });
            }
            
            // Hide validation result and tool definition
            if (window.FunctionValidator) {
                window.FunctionValidator.hideValidationResult(elements);
                window.FunctionValidator.hideToolDefinition(elements);
            }
            
            console.log(`Loaded function "${name}" into editor for editing`);
        }
        
        /**
         * Handle adding or updating functions
         * @param {Event} event - The form submit event
         */
        function handleAddFunction(event) {
            event.preventDefault();
            
            // Validate the function library first
            const validation = validateFunction();
            
            if (!validation.success) {
                return;
            }
            
            const code = elements.functionCode.value.trim();
            
            let collectionId;
            
            // If we're in edit mode, handle it differently
            if (editingFunctionName) {
                // Get the original collection ID to preserve it
                const functionCollections = FunctionToolsService.getFunctionCollections();
                collectionId = functionCollections[editingFunctionName];
                
                // Remove the old function collection
                FunctionToolsService.removeJsFunction(editingFunctionName);
                
                // Reset editing flag
                editingFunctionName = null;
            }
            
            // Process all functions
            if (validation.functions && validation.functions.length > 0) {
                // Keep track of added callable functions
                const addedFunctions = [];
                
                // Generate a unique collection ID for this set of functions (or use existing one if editing)
                let collectionMetadata = null;
                if (!collectionId) {
                    collectionId = 'collection_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    
                    // Prompt for collection name when adding new functions
                    let collectionName = 'Untitled Collection'; // Default fallback
                    
                    // Check if we're in a test environment by looking for playwright indicators
                    const isTestEnvironment = window.navigator.webdriver || 
                                             window.__playwright || 
                                             window.location.href.includes('localhost:8000');
                    
                    if (!isTestEnvironment) {
                        const userCollectionName = prompt('Enter a name for this function collection:', 'Untitled Collection');
                        if (userCollectionName === null) {
                            // User cancelled
                            return;
                        }
                        collectionName = userCollectionName || 'Untitled Collection';
                    } else {
                        // In test environment, use a default name based on function names
                        const callableFunctionNames = validation.callableFunctions ? 
                            validation.callableFunctions.map(f => f.name) : [];
                        if (callableFunctionNames.length > 0) {
                            collectionName = `Test Functions (${callableFunctionNames[0]})`;
                        }
                    }
                    
                    collectionMetadata = {
                        name: collectionName,
                        createdAt: new Date().toISOString(),
                        source: 'manual'
                    };
                }
                
                // First, add all auxiliary functions (non-callable)
                const auxiliaryFunctions = validation.functions.filter(func => !func.isCallable);
                auxiliaryFunctions.forEach(func => {
                    // Add the function but don't enable it for tool calling
                    FunctionToolsService.addJsFunction(
                        func.name, 
                        func.code, 
                        { // Create a minimal tool definition for auxiliary functions
                            type: 'function',
                            function: {
                                name: func.name,
                                description: `Auxiliary function ${func.name} (not exposed to LLM)`,
                                parameters: {
                                    type: 'object',
                                    properties: {},
                                    required: []
                                }
                            }
                        },
                        collectionId, // Pass the collection ID to associate all functions
                        collectionMetadata // Pass the collection metadata
                    );
                });
                
                // Then add callable functions
                const callableFunctions = validation.callableFunctions || [];
                callableFunctions.forEach((func, index) => {
                    // Add the function
                    const success = FunctionToolsService.addJsFunction(
                        func.name, 
                        func.code, 
                        validation.toolDefinitions[index],
                        collectionId, // Pass the collection ID to associate all functions
                        collectionMetadata // Pass the collection metadata
                    );
                    
                    if (success) {
                        // Enable the function by default
                        FunctionToolsService.enableJsFunction(func.name);
                        addedFunctions.push(func.name);
                    }
                });
                
                // Render updated list
                if (window.FunctionListRenderer) {
                    window.FunctionListRenderer.renderFunctionList();
                }
                
                // Add system message
                if (addSystemMessage) {
                    if (addedFunctions.length === 1) {
                        addSystemMessage(`Function "${addedFunctions[0]}" added and enabled for tool calling.`);
                    } else if (addedFunctions.length > 1) {
                        addSystemMessage(`${addedFunctions.length} functions added and enabled for tool calling: ${addedFunctions.join(', ')}`);
                    }
                }
                
                // Show success message
                if (window.FunctionValidator) {
                    if (addedFunctions.length === 1) {
                        window.FunctionValidator.showValidationResult(elements, `Function "${addedFunctions[0]}" added successfully.`, 'success');
                    } else if (addedFunctions.length > 1) {
                        window.FunctionValidator.showValidationResult(elements, `${addedFunctions.length} functions added successfully.`, 'success');
                    } else {
                        window.FunctionValidator.showValidationResult(elements, 'No functions were added. Please check your code.', 'error');
                    }
                }
                
                // Keep the function in the editor for further editing
                // Focus back on the function code field for further editing
                if (elements.functionCode) {
                    setTimeout(() => {
                        elements.functionCode.focus();
                    }, 100);
                }
            } else {
                // No callable functions found
                if (window.FunctionValidator) {
                    window.FunctionValidator.showValidationResult(elements, 'No callable functions found. By default, all functions are callable unless at least one function is tagged with @callable or @tool (equivalent), or if functions are marked with @internal (which makes only non-@internal functions callable)', 'warning');
                }
            }
        }
        
        
        /**
         * Reset the function editor to the currently active functions (coordinated workflow)
         */
        function clearFunctionEditor() {
            if (window.FunctionValidator) {
                window.FunctionValidator.hideValidationResult(elements);
                window.FunctionValidator.hideToolDefinition(elements);
            }
            
            if (editingFunctionName) {
                // If we're editing a function, reload just that function and its related functions
                if (window.FunctionLibraryManager) {
                    const loaded = window.FunctionLibraryManager.loadRelatedFunctionsForEditing(editingFunctionName, elements);
                    if (!loaded) {
                        // Function no longer exists, clear and reset
                        editingFunctionName = null;
                        if (window.FunctionCodeEditor) {
                            window.FunctionCodeEditor.clearEditor(elements);
                        }
                    }
                }
            } else {
                // Try to load active functions or use default
                if (window.FunctionLibraryManager) {
                    const loaded = window.FunctionLibraryManager.loadActiveFunctionsIntoEditor(elements);
                    if (!loaded) {
                        // No active functions, use default
                        if (window.FunctionCodeEditor) {
                            window.FunctionCodeEditor.clearEditor(elements);
                            
                            // Extract function name from default code
                            setTimeout(() => {
                                if (window.FunctionParser && window.FunctionCodeEditor) {
                                    const functionName = window.FunctionParser.extractFunctionName(
                                        window.FunctionCodeEditor.getEditorContent(elements)
                                    );
                                    window.FunctionCodeEditor.updateFunctionNameField(elements, functionName);
                                }
                            }, 100);
                        }
                    }
                }
                
                // Reset editing flag
                editingFunctionName = null;
            }
            
            // Focus back on the function code field
            if (window.FunctionCodeEditor) {
                window.FunctionCodeEditor.focusEditor(elements);
            }
        }
        
        
        /**
         * Extract function name from code (delegated to parser)
         * This is kept for backward compatibility
         */
        function extractFunctionName() {
            if (window.FunctionCodeEditor && window.FunctionParser) {
                const code = window.FunctionCodeEditor.getEditorContent(elements);
                const functionName = window.FunctionParser.extractFunctionName(code);
                window.FunctionCodeEditor.updateFunctionNameField(elements, functionName);
            }
        }
        
        // Public API
        return {
            init,
            validateFunction,
            loadFunctionIntoEditor,
            handleAddFunction,
            clearFunctionEditor,
            extractFunctionName,
            getDefaultFunctionCode
        };
    }

    // Public API
    return {
        createFunctionEditorManager: createFunctionEditorManager
    };
})();