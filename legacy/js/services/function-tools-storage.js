/**
 * Function Tools Storage
 * Handles storage operations for the function tools system
 */

window.FunctionToolsStorage = (function() {
    const { STORAGE_KEYS } = FunctionToolsConfig;
    const Logger = FunctionToolsLogger;
    
    // Registry state
    let jsFunctions = {};
    let enabledFunctions = [];
    let functionCollections = {};
    let functionCollectionMetadata = {};
    
    const StorageManager = {
        load: function() {
            // Load functions from storage
            const storedFunctions = CoreStorageService.getValue(STORAGE_KEYS.JS_FUNCTIONS);
            if (storedFunctions) {
                jsFunctions = storedFunctions;
            }
            
            const storedEnabledFunctions = CoreStorageService.getValue(STORAGE_KEYS.ENABLED_FUNCTIONS);
            if (storedEnabledFunctions) {
                enabledFunctions = storedEnabledFunctions;
            }
            
            const storedFunctionCollections = CoreStorageService.getValue(STORAGE_KEYS.FUNCTION_COLLECTIONS);
            if (storedFunctionCollections) {
                functionCollections = storedFunctionCollections;
            }
            
            const storedFunctionCollectionMetadata = CoreStorageService.getValue(STORAGE_KEYS.FUNCTION_COLLECTION_METADATA);
            if (storedFunctionCollectionMetadata) {
                functionCollectionMetadata = storedFunctionCollectionMetadata;
            }
        },
        
        save: function() {
            CoreStorageService.setValue(STORAGE_KEYS.JS_FUNCTIONS, jsFunctions);
            CoreStorageService.setValue(STORAGE_KEYS.ENABLED_FUNCTIONS, enabledFunctions);
            CoreStorageService.setValue(STORAGE_KEYS.FUNCTION_COLLECTIONS, functionCollections);
            CoreStorageService.setValue(STORAGE_KEYS.FUNCTION_COLLECTION_METADATA, functionCollectionMetadata);
        },
        
        isEnabled: function() {
            const enabled = CoreStorageService.getValue(STORAGE_KEYS.FUNCTION_TOOLS_ENABLED) === true;
            Logger.debug("isFunctionToolsEnabled called");
            Logger.debug(`- Storage key: ${STORAGE_KEYS.FUNCTION_TOOLS_ENABLED}`);
            Logger.debug(`- Raw storage value: ${CoreStorageService.getValue(STORAGE_KEYS.FUNCTION_TOOLS_ENABLED)}`);
            Logger.debug(`- Parsed enabled state: ${enabled}`);
            return enabled;
        },
        
        setEnabled: function(enabled) {
            CoreStorageService.setValue(STORAGE_KEYS.FUNCTION_TOOLS_ENABLED, enabled);
        },
        
        // Getters for registry state
        getJsFunctions: function() {
            return jsFunctions;
        },
        
        getEnabledFunctions: function() {
            return enabledFunctions;
        },
        
        getFunctionCollections: function() {
            return functionCollections;
        },
        
        getFunctionCollectionMetadata: function() {
            return functionCollectionMetadata;
        },
        
        // Setters for registry state
        setJsFunctions: function(functions) {
            jsFunctions = functions;
        },
        
        setEnabledFunctions: function(functions) {
            enabledFunctions = functions;
        },
        
        setFunctionCollections: function(collections) {
            functionCollections = collections;
        },
        
        setFunctionCollectionMetadata: function(metadata) {
            functionCollectionMetadata = metadata;
        }
    };
    
    // Initialize
    StorageManager.load();
    
    // Public API
    return StorageManager;
})();
