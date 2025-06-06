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
         * @param {string} groupId - Optional group ID to associate functions that were defined together
         * @returns {boolean} Whether the function was added successfully
         */
        addJsFunction: function(name, code, toolDefinition, groupId) {
            // Validate inputs
            if (!name || !code || !toolDefinition) {
                return false;
            }
            
            // Generate a group ID if not provided
            if (!groupId) {
                groupId = 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            }
            
            // Get current state
            const jsFunctions = Storage.getJsFunctions();
            const functionGroups = Storage.getFunctionGroups();
            
            // Add the function to the registry
            jsFunctions[name] = {
                code: code,
                toolDefinition: toolDefinition
            };
            
            // Associate the function with its group
            functionGroups[name] = groupId;
            
            // Update storage
            Storage.setJsFunctions(jsFunctions);
            Storage.setFunctionGroups(functionGroups);
            Storage.save();
            
            return true;
        },
        
        /**
         * Remove a JavaScript function and all functions in its group
         * @param {string} name - The name of the function to remove
         * @returns {boolean} Whether the function was removed successfully
         */
        removeJsFunction: function(name) {
            const jsFunctions = Storage.getJsFunctions();
            const functionGroups = Storage.getFunctionGroups();
            let enabledFunctions = Storage.getEnabledFunctions();
            
            if (!jsFunctions[name]) {
                return false;
            }
            
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
                delete jsFunctions[funcName];
                delete functionGroups[funcName];
                
                // Also remove from enabled functions if present
                enabledFunctions = enabledFunctions.filter(funcName => funcName !== name);
            }
            
            // Update storage
            Storage.setJsFunctions(jsFunctions);
            Storage.setFunctionGroups(functionGroups);
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
         * Get all functions in the same group as the specified function
         * @param {string} name - The name of the function
         * @returns {Array} Array of function names in the same group
         */
        getFunctionsInSameGroup: function(name) {
            const functionGroups = Storage.getFunctionGroups();
            
            if (!functionGroups[name]) {
                return [name]; // Return just this function if no group info
            }
            
            const groupId = functionGroups[name];
            return Object.keys(functionGroups).filter(
                funcName => functionGroups[funcName] === groupId
            );
        }
    };
    
    // Public API
    return Registry;
})();
