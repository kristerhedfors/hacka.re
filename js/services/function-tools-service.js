/**
 * Function Tools Service (Refactored)
 * Main orchestrator for the function tools system
 * Coordinates between all the smaller specialized modules
 */

window.FunctionToolsService = (function() {
    const Logger = FunctionToolsLogger;
    const Storage = FunctionToolsStorage;
    const Registry = FunctionToolsRegistry;
    const Executor = FunctionToolsExecutor;
    const Processor = FunctionToolsProcessor;
    const { ToolDefinitionGenerator } = FunctionToolsParser;
    
    if (Logger && typeof Logger.log === 'function') {
        Logger.log('FunctionToolsService initialized with all specialized modules');
    }
    
    /**
     * Check if function tools are enabled
     * @returns {boolean} Whether function tools are enabled
     */
    function isFunctionToolsEnabled() {
        return Storage.isEnabled();
    }
    
    /**
     * Set function tools enabled state
     * @param {boolean} enabled - Whether function tools should be enabled
     * @param {Function} addSystemMessage - Optional callback to add a system message
     */
    function setFunctionToolsEnabled(enabled, addSystemMessage) {
        const previousState = Storage.isEnabled();
        if (Logger && typeof Logger.log === 'function') {
            Logger.log(`FunctionToolsService.setFunctionToolsEnabled called with: ${enabled}`);
            Logger.log(`- Previous state: ${previousState}`);
        }
        
        Storage.setEnabled(enabled);
        if (Logger && typeof Logger.log === 'function') {
            Logger.log(`- New state set in storage: ${enabled}`);
            Logger.log(`- Verifying new state: ${Storage.isEnabled()}`);
        }
        
        // Display status message if the state has changed and a callback is provided
        if (addSystemMessage && previousState !== enabled) {
            if (enabled) {
                const functions = Object.keys(Storage.getJsFunctions());
                const functionsMessage = functions.length > 0 
                    ? `Available functions: ${functions.join(', ')}`
                    : 'No functions currently defined';
                
                addSystemMessage(`Function tools activated. ${functionsMessage}`);
                if (Logger && typeof Logger.log === 'function') {
                    Logger.log('- System message added for activation');
                }
            } else {
                addSystemMessage('Function tools deactivated. No functions are available.');
                if (Logger && typeof Logger.log === 'function') {
                    Logger.log('- System message added for deactivation');
                }
            }
        }
    }
    
    /**
     * Add a JavaScript function
     * @param {string} name - The name of the function
     * @param {string} code - The JavaScript function code
     * @param {Object} toolDefinition - The tool definition generated from the function
     * @param {string} collectionId - Optional collection ID to associate functions that were defined together
     * @returns {boolean} Whether the function was added successfully
     */
    function addJsFunction(name, code, toolDefinition, collectionId, collectionMetadata) {
        return Registry.addJsFunction(name, code, toolDefinition, collectionId, collectionMetadata);
    }
    
    /**
     * Remove a JavaScript function and all functions in its collection
     * @param {string} name - The name of the function to remove
     * @returns {boolean} Whether the function was removed successfully
     */
    function removeJsFunction(name) {
        return Registry.removeJsFunction(name);
    }
    
    /**
     * Get all JavaScript functions
     * @returns {Object} The JavaScript function registry
     */
    function getJsFunctions() {
        return Registry.getJsFunctions();
    }
    
    /**
     * Enable a JavaScript function
     * @param {string} name - The name of the function to enable
     * @returns {boolean} Whether the function was enabled successfully
     */
    function enableJsFunction(name) {
        return Registry.enableJsFunction(name);
    }
    
    /**
     * Disable a JavaScript function
     * @param {string} name - The name of the function to disable
     * @returns {boolean} Whether the function was disabled successfully
     */
    function disableJsFunction(name) {
        return Registry.disableJsFunction(name);
    }
    
    /**
     * Check if a JavaScript function is enabled
     * @param {string} name - The name of the function to check
     * @returns {boolean} Whether the function is enabled
     */
    function isJsFunctionEnabled(name) {
        return Registry.isJsFunctionEnabled(name);
    }
    
    /**
     * Get all enabled JavaScript functions
     * @returns {Array} Array of enabled JavaScript function objects
     */
    function getEnabledJsFunctions() {
        return Registry.getEnabledJsFunctions();
    }
    
    /**
     * Get all enabled function names
     * @returns {Array} Array of enabled function names
     */
    function getEnabledFunctionNames() {
        return Registry.getEnabledFunctionNames();
    }
    
    /**
     * Get enabled tool definitions for API requests
     * @returns {Array} Array of enabled tool definitions in OpenAI format
     */
    function getEnabledToolDefinitions() {
        return Registry.getEnabledToolDefinitions();
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
        return Executor.execute(name, args);
    }
    
    /**
     * Process tool calls from the API response
     * @param {Array} toolCalls - Array of tool calls from the API
     * @param {Function} addSystemMessage - Optional callback to add a system message
     * @returns {Promise<Array>} Array of tool results
     */
    async function processToolCalls(toolCalls, addSystemMessage) {
        return Processor.process(toolCalls, addSystemMessage);
    }
    
    /**
     * Generate a tool definition from a JavaScript function
     * @param {string} code - The JavaScript function code
     * @returns {Object} The generated tool definition, or null if generation failed
     */
    function generateToolDefinition(code) {
        return ToolDefinitionGenerator.generate(code);
    }
    
    /**
     * Get all functions in the same collection as the specified function
     * @param {string} name - The name of the function
     * @returns {Array} Array of function names in the same collection
     */
    function getFunctionsInSameCollection(name) {
        return Registry.getFunctionsInSameCollection(name);
    }
    
    /**
     * Get metadata for a function collection
     * @param {string} collectionId - The collection ID
     * @returns {Object|null} The collection metadata or null if not found
     */
    function getCollectionMetadata(collectionId) {
        return Registry.getCollectionMetadata(collectionId);
    }
    
    
    /**
     * Get all function collections with their metadata
     * @returns {Object} Object mapping collection IDs to their functions and metadata
     */
    function getAllFunctionCollections() {
        return Registry.getAllFunctionCollections();
    }
    
    /**
     * Get function collections mapping
     * @returns {Object} Object mapping function names to collection IDs
     */
    function getFunctionCollections() {
        return Storage.getFunctionCollections();
    }
    
    /**
     * Clear all function collections and their metadata
     * This method provides a clean interface for bulk clearing operations
     * @returns {boolean} Whether the operation was successful
     */
    function clearAllCollections() {
        return Registry.clearAllCollections();
    }
    
    /**
     * Clear all functions from the registry
     * This is a complete cleanup operation for agent loading
     * @returns {boolean} Whether the operation was successful
     */
    function clearAllFunctions() {
        return Registry.clearAllFunctions();
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
        getFunctionsInSameCollection,
        getCollectionMetadata,
        getAllFunctionCollections,
        getFunctionCollections,
        clearAllCollections,
        clearAllFunctions
    };
})();
