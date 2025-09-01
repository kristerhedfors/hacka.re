/**
 * Function Library Manager Module
 * Handles function collection management, metadata, and storage coordination
 */

window.FunctionLibraryManager = (function() {
    
    /**
     * Load a function into the editor for editing
     * @param {string} name - Function name
     * @param {Object} functionSpec - Function specification
     * @param {Object} elements - DOM elements
     * @returns {string|null} - Collection ID or null if not found
     */
    function loadFunctionIntoEditor(name, functionSpec, elements) {
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
            
            window.FunctionCodeEditor.setEditorContent(elements, codeToLoad);
        }
        
        // Scroll to the editor form
        if (elements.functionEditorForm) {
            elements.functionEditorForm.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Hide validation result and tool definition
        window.FunctionValidator.hideValidationResult(elements);
        window.FunctionValidator.hideToolDefinition(elements);
        
        console.log(`Loaded function "${name}" into editor for editing`);
        
        // Return the collection ID for tracking
        const functionCollections = FunctionToolsService.getFunctionCollections();
        return functionCollections[name] || null;
    }
    
    /**
     * Add functions to the function tools service
     * @param {Array} functions - Array of function objects
     * @param {Array} callableFunctions - Array of callable function objects
     * @param {Array} toolDefinitions - Array of tool definitions
     * @param {string|null} existingCollectionId - Existing collection ID for updates
     * @param {Function} addSystemMessage - Function to add system messages
     * @returns {Object} Result with success status and added functions
     */
    function addFunctionsToLibrary(functions, callableFunctions, toolDefinitions, existingCollectionId, addSystemMessage) {
        let collectionId = existingCollectionId;
        
        // Keep track of added callable functions
        const addedFunctions = [];
        
        // Generate a unique collection ID for this set of functions (or use existing one if editing)
        let collectionMetadata = null;
        if (!collectionId) {
            collectionId = 'collection_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Auto-generate collection name based on function names
            let collectionName = 'Untitled Collection'; // Default fallback
            
            // Use function names to generate a meaningful collection name
            const callableFunctionNames = callableFunctions ? 
                callableFunctions.map(f => f.name) : [];
            if (callableFunctionNames.length > 0) {
                if (callableFunctionNames.length === 1) {
                    collectionName = callableFunctionNames[0];
                } else if (callableFunctionNames.length === 2) {
                    collectionName = `${callableFunctionNames[0]} & ${callableFunctionNames[1]}`;
                } else {
                    collectionName = `${callableFunctionNames[0]} & ${callableFunctionNames.length - 1} more`;
                }
            }
            
            collectionMetadata = {
                name: collectionName,
                createdAt: new Date().toISOString(),
                source: 'manual'
            };
        }
        
        // First, add all auxiliary functions (non-callable)
        const auxiliaryFunctions = functions.filter(func => !func.isCallable);
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
        callableFunctions.forEach((func, index) => {
            // Add the function
            const success = FunctionToolsService.addJsFunction(
                func.name, 
                func.code, 
                toolDefinitions[index],
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
        if (window.functionListRenderer) {
            window.functionListRenderer.renderFunctionList();
        }
        
        // Add system message
        if (addSystemMessage) {
            if (addedFunctions.length === 1) {
                addSystemMessage(`Function "${addedFunctions[0]}" added and enabled for tool calling.`);
            } else if (addedFunctions.length > 1) {
                addSystemMessage(`${addedFunctions.length} functions added and enabled for tool calling: ${addedFunctions.join(', ')}`);
            }
        }
        
        return {
            success: true,
            addedFunctions: addedFunctions,
            collectionId: collectionId
        };
    }
    
    /**
     * Load all active functions into editor
     * @param {Object} elements - DOM elements
     * @returns {boolean} True if functions were loaded, false if using default
     */
    function loadActiveFunctionsIntoEditor(elements) {
        // Get all functions
        const functions = FunctionToolsService.getJsFunctions();
        const functionNames = Object.keys(functions);
        
        console.log('loadActiveFunctionsIntoEditor: Found functions:', functionNames);
        
        if (functionNames.length > 0) {
            // If we have active functions, we need to group them by their collection IDs
            const functionCollections = {};
            
            // Group functions by their collection ID
            functionNames.forEach(name => {
                const relatedFunctions = FunctionToolsService.getFunctionsInSameCollection(name);
                const collectionKey = relatedFunctions.sort().join(','); // Use sorted function names as key
                
                if (!functionCollections[collectionKey]) {
                    functionCollections[collectionKey] = relatedFunctions;
                }
            });
            
            // Get unique collections
            const uniqueCollections = Object.values(functionCollections);
            
            // Combine code from each collection
            const combinedCode = uniqueCollections.map(collection => {
                return collection
                    .filter(name => functions[name]) // Ensure the function exists
                    .map(name => functions[name].code)
                    .join('\n\n');
            }).join('\n\n\n');
            
            window.FunctionCodeEditor.setEditorContent(elements, combinedCode);
            
            if (elements.functionName) {
                elements.functionName.value = '';
                // Remove auto-completed styling and make editable
                elements.functionName.classList.remove('auto-completed');
                elements.functionName.removeAttribute('readonly');
            }
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Load related functions for editing mode
     * @param {string} functionName - Name of the function being edited
     * @param {Object} elements - DOM elements
     * @returns {boolean} True if related functions were loaded
     */
    function loadRelatedFunctionsForEditing(functionName, elements) {
        const functions = FunctionToolsService.getJsFunctions();
        
        if (!functions[functionName]) {
            return false;
        }
        
        // Get all functions in the same collection
        const relatedFunctions = FunctionToolsService.getFunctionsInSameCollection(functionName);
        
        // If we have related functions, combine them
        if (relatedFunctions.length > 1) {
            // Sort the functions to ensure consistent order
            relatedFunctions.sort();
            
            // Combine the code of all related functions
            const combinedCode = relatedFunctions
                .filter(name => functions[name]) // Ensure the function exists
                .map(name => functions[name].code)
                .join('\n\n');
            
            window.FunctionCodeEditor.setEditorContent(elements, combinedCode);
            return true;
        } else {
            // If no related functions, just load this function
            loadFunctionIntoEditor(functionName, functions[functionName], elements);
            return true;
        }
    }
    
    // Public API
    return {
        loadFunctionIntoEditor,
        addFunctionsToLibrary,
        loadActiveFunctionsIntoEditor,
        loadRelatedFunctionsForEditing
    };
})();