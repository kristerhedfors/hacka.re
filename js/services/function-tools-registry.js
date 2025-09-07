/**
 * Function Tools Registry
 * Manages the registry of JavaScript functions and their enabled state
 */

window.FunctionToolsRegistry = (function() {
    const Logger = FunctionToolsLogger;
    const Storage = FunctionToolsStorage;
    
    const Registry = {
        /**
         * Add a JavaScript function
         * @param {string} name - The name of the function
         * @param {string} code - The JavaScript function code
         * @param {Object} toolDefinition - The tool definition generated from the function
         * @param {string} collectionId - Optional collection ID to associate functions that were defined together
         * @returns {boolean} Whether the function was added successfully
         */
        addJsFunction: function(name, code, toolDefinition, collectionId, collectionMetadata) {
            // Validate inputs
            if (!name || !code || !toolDefinition) {
                return false;
            }
            
            // Generate a collection ID if not provided
            if (!collectionId) {
                collectionId = 'collection_' + Math.random().toString(36).substr(2, 9);
            }
            
            // Get current state
            const jsFunctions = Storage.getJsFunctions();
            const functionCollections = Storage.getFunctionCollections();
            const functionCollectionMetadata = Storage.getFunctionCollectionMetadata();
            
            // Add the function to the registry
            jsFunctions[name] = {
                code: code,
                toolDefinition: toolDefinition
            };
            
            // Associate the function with its collection
            functionCollections[name] = collectionId;
            
            // Store collection metadata if provided
            if (collectionMetadata && !functionCollectionMetadata[collectionId]) {
                functionCollectionMetadata[collectionId] = collectionMetadata;
            }
            
            // Update storage
            Storage.setJsFunctions(jsFunctions);
            Storage.setFunctionCollections(functionCollections);
            Storage.setFunctionCollectionMetadata(functionCollectionMetadata);
            Storage.save();
            
            return true;
        },
        
        /**
         * Remove a JavaScript function and all functions in its collection
         * @param {string} name - The name of the function to remove
         * @returns {boolean} Whether the function was removed successfully
         */
        removeJsFunction: function(name) {
            const jsFunctions = Storage.getJsFunctions();
            const functionCollections = Storage.getFunctionCollections();
            const functionCollectionMetadata = Storage.getFunctionCollectionMetadata();
            let enabledFunctions = Storage.getEnabledFunctions();
            
            if (!jsFunctions[name]) {
                return false;
            }
            
            // Get the collection ID for this function
            const collectionId = functionCollections[name];
            
            if (collectionId) {
                // Find all functions in the same collection
                const functionsInCollection = Object.keys(functionCollections).filter(
                    funcName => functionCollections[funcName] === collectionId
                );
                
                // Remove all functions in the collection
                functionsInCollection.forEach(funcName => {
                    delete jsFunctions[funcName];
                    delete functionCollections[funcName];
                    
                    // Also remove from enabled functions if present
                    enabledFunctions = enabledFunctions.filter(fn => fn !== funcName);
                });
                
                // Remove collection metadata
                delete functionCollectionMetadata[collectionId];
            } else {
                // If no collection ID (legacy data), just remove this function
                delete jsFunctions[name];
                delete functionCollections[name];
                
                // Also remove from enabled functions if present
                enabledFunctions = enabledFunctions.filter(fn => fn !== name);
            }
            
            // Update storage
            Storage.setJsFunctions(jsFunctions);
            Storage.setFunctionCollections(functionCollections);
            Storage.setFunctionCollectionMetadata(functionCollectionMetadata);
            Storage.setEnabledFunctions(enabledFunctions);
            Storage.save();
            
            return true;
        },
        
        /**
         * Get all JavaScript functions
         * @returns {Object} The JavaScript function registry
         */
        getJsFunctions: function() {
            return Storage.getJsFunctions();
        },
        
        /**
         * Enable a JavaScript function
         * @param {string} name - The name of the function to enable
         * @returns {boolean} Whether the function was enabled successfully
         */
        enableJsFunction: function(name) {
            const jsFunctions = Storage.getJsFunctions();
            const enabledFunctions = Storage.getEnabledFunctions();
            
            if (jsFunctions[name] && !enabledFunctions.includes(name)) {
                enabledFunctions.push(name);
                Storage.setEnabledFunctions(enabledFunctions);
                Storage.save();
                return true;
            }
            
            return false;
        },
        
        /**
         * Disable a JavaScript function
         * @param {string} name - The name of the function to disable
         * @returns {boolean} Whether the function was disabled successfully
         */
        disableJsFunction: function(name) {
            const enabledFunctions = Storage.getEnabledFunctions();
            const index = enabledFunctions.indexOf(name);
            
            if (index !== -1) {
                enabledFunctions.splice(index, 1);
                Storage.setEnabledFunctions(enabledFunctions);
                Storage.save();
                return true;
            }
            
            return false;
        },
        
        /**
         * Check if a JavaScript function is enabled
         * @param {string} name - The name of the function to check
         * @returns {boolean} Whether the function is enabled
         */
        isJsFunctionEnabled: function(name) {
            const enabledFunctions = Storage.getEnabledFunctions();
            return enabledFunctions.includes(name);
        },
        
        /**
         * Get all enabled JavaScript functions
         * @returns {Array} Array of enabled JavaScript function objects
         */
        getEnabledJsFunctions: function() {
            const jsFunctions = Storage.getJsFunctions();
            const enabledFunctions = Storage.getEnabledFunctions();
            
            return enabledFunctions
                .filter(name => jsFunctions[name])
                .map(name => jsFunctions[name]);
        },
        
        /**
         * Get all enabled function names
         * @returns {Array} Array of enabled function names
         */
        getEnabledFunctionNames: function() {
            return Storage.getEnabledFunctions();
        },
        
        /**
         * Get enabled tool definitions for API requests
         * @returns {Array} Array of enabled tool definitions in OpenAI format
         */
        getEnabledToolDefinitions: function() {
            console.log("FunctionToolsRegistry.getEnabledToolDefinitions called");
            
            // Force reload from storage to ensure we have latest data
            Storage.load();
            
            const jsFunctions = Storage.getJsFunctions();
            const enabledFunctions = Storage.getEnabledFunctions();
            
            console.log("- Enabled functions:", enabledFunctions);
            console.log("- Available functions:", Object.keys(jsFunctions));
            
            // Debug each enabled function
            enabledFunctions.forEach(name => {
                console.log(`  - Function ${name}: exists=${!!jsFunctions[name]}, hasToolDef=${!!jsFunctions[name]?.toolDefinition}`);
            });
            
            const toolDefinitions = enabledFunctions
                .filter(name => jsFunctions[name] && jsFunctions[name].toolDefinition)
                .map(name => jsFunctions[name].toolDefinition);
            
            console.log("- Returning tool definitions:", toolDefinitions.length, toolDefinitions.map(t => t.function?.name));
            return toolDefinitions;
        },
        
        /**
         * Get all functions in the same collection as the specified function
         * @param {string} name - The name of the function
         * @returns {Array} Array of function names in the same collection
         */
        getFunctionsInSameCollection: function(name) {
            const functionCollections = Storage.getFunctionCollections();
            
            if (!functionCollections[name]) {
                return [name]; // Return just this function if no collection info
            }
            
            const collectionId = functionCollections[name];
            return Object.keys(functionCollections).filter(
                funcName => functionCollections[funcName] === collectionId
            );
        },
        
        /**
         * Get metadata for a function collection
         * @param {string} collectionId - The collection ID
         * @returns {Object|null} The collection metadata or null if not found
         */
        getCollectionMetadata: function(collectionId) {
            const functionCollectionMetadata = Storage.getFunctionCollectionMetadata();
            return functionCollectionMetadata[collectionId] || null;
        },
        
        /**
         * Get all function collections with their metadata
         * @returns {Object} Object mapping collection IDs to their functions and metadata
         */
        getAllFunctionCollections: function() {
            const functionCollections = Storage.getFunctionCollections();
            const functionCollectionMetadata = Storage.getFunctionCollectionMetadata();
            const jsFunctions = Storage.getJsFunctions();
            
            const collections = {};
            
            // Build collections from function associations
            Object.entries(functionCollections).forEach(([funcName, collectionId]) => {
                if (!collections[collectionId]) {
                    collections[collectionId] = {
                        id: collectionId,
                        functions: [],
                        metadata: functionCollectionMetadata[collectionId] || {}
                    };
                }
                if (jsFunctions[funcName]) {
                    collections[collectionId].functions.push(funcName);
                }
            });
            
            return collections;
        },
        
        /**
         * Clear all function collections and their metadata
         * This method provides a clean interface for bulk clearing operations
         * @returns {boolean} Whether the operation was successful
         */
        clearAllCollections: function() {
            try {
                if (Logger && typeof Logger.log === 'function') {
                    Logger.log('FunctionToolsRegistry.clearAllCollections: Starting bulk clear operation');
                }
                
                // Clear all collections and metadata
                Storage.setJsFunctions({});
                Storage.setFunctionCollections({});
                Storage.setFunctionCollectionMetadata({});
                Storage.setEnabledFunctions([]);
                Storage.save();
                
                if (Logger && typeof Logger.log === 'function') {
                    Logger.log('FunctionToolsRegistry.clearAllCollections: Successfully cleared all collections');
                }
                return true;
            } catch (error) {
                if (Logger && typeof Logger.error === 'function') {
                    Logger.error('FunctionToolsRegistry.clearAllCollections: Failed to clear collections', error);
                }
                return false;
            }
        },
        
        /**
         * Clear all functions from the registry
         * This is a complete cleanup operation for agent loading
         * @returns {boolean} Whether the operation was successful
         */
        clearAllFunctions: function() {
            try {
                if (Logger && typeof Logger.log === 'function') {
                    Logger.log('FunctionToolsRegistry.clearAllFunctions: Starting complete function cleanup');
                }
                
                const jsFunctions = Storage.getJsFunctions();
                const functionNames = Object.keys(jsFunctions);
                
                if (Logger && typeof Logger.log === 'function') {
                    Logger.log(`FunctionToolsRegistry.clearAllFunctions: Clearing ${functionNames.length} functions`);
                }
                
                // Clear everything
                Storage.setJsFunctions({});
                Storage.setFunctionCollections({});
                Storage.setFunctionCollectionMetadata({});
                Storage.setEnabledFunctions([]);
                Storage.save();
                
                if (Logger && typeof Logger.log === 'function') {
                    Logger.log('FunctionToolsRegistry.clearAllFunctions: Successfully cleared all functions');
                }
                return true;
            } catch (error) {
                if (Logger && typeof Logger.error === 'function') {
                    Logger.error('FunctionToolsRegistry.clearAllFunctions: Failed to clear functions', error);
                }
                return false;
            }
        }
    };
    
    // Public API - Expose all registry methods including bulk operations
    return Registry;
})();
