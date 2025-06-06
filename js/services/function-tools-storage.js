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
    let functionGroups = {};
    
    const StorageManager = {
        load: function() {
            console.log("FunctionToolsStorage.load() called");
            
            // Debug namespace info
            if (window.NamespaceService) {
                const namespace = window.NamespaceService.getNamespace();
                const namespaceId = window.NamespaceService.getNamespaceId();
                console.log(`- Current namespace: "${namespace}", ID: ${namespaceId}`);
                console.log(`- JS_FUNCTIONS key: ${window.NamespaceService.getNamespacedKey(STORAGE_KEYS.JS_FUNCTIONS)}`);
                console.log(`- ENABLED_FUNCTIONS key: ${window.NamespaceService.getNamespacedKey(STORAGE_KEYS.ENABLED_FUNCTIONS)}`);
            }
            
            const storedFunctions = CoreStorageService.getValue(STORAGE_KEYS.JS_FUNCTIONS);
            if (storedFunctions) {
                jsFunctions = storedFunctions;
                console.log("- Loaded jsFunctions:", Object.keys(jsFunctions));
            } else {
                console.log("- No stored jsFunctions found");
            }
            
            const storedEnabledFunctions = CoreStorageService.getValue(STORAGE_KEYS.ENABLED_FUNCTIONS);
            if (storedEnabledFunctions) {
                enabledFunctions = storedEnabledFunctions;
                console.log("- Loaded enabledFunctions:", enabledFunctions);
            } else {
                console.log("- No stored enabledFunctions found");
            }
            
            const storedFunctionGroups = CoreStorageService.getValue(STORAGE_KEYS.FUNCTION_GROUPS);
            if (storedFunctionGroups) {
                functionGroups = storedFunctionGroups;
                console.log("- Loaded functionGroups:", Object.keys(functionGroups));
            } else {
                console.log("- No stored functionGroups found");
            }
        },
        
        save: function() {
            console.log("FunctionToolsStorage.save() called");
            console.log("- Saving jsFunctions:", Object.keys(jsFunctions));
            console.log("- Saving enabledFunctions:", enabledFunctions);
            console.log("- Saving functionGroups:", Object.keys(functionGroups));
            
            CoreStorageService.setValue(STORAGE_KEYS.JS_FUNCTIONS, jsFunctions);
            CoreStorageService.setValue(STORAGE_KEYS.ENABLED_FUNCTIONS, enabledFunctions);
            CoreStorageService.setValue(STORAGE_KEYS.FUNCTION_GROUPS, functionGroups);
            
            console.log("- Save complete");
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
        
        getFunctionGroups: function() {
            return functionGroups;
        },
        
        // Setters for registry state
        setJsFunctions: function(functions) {
            jsFunctions = functions;
        },
        
        setEnabledFunctions: function(functions) {
            enabledFunctions = functions;
        },
        
        setFunctionGroups: function(groups) {
            functionGroups = groups;
        }
    };
    
    // Initialize
    StorageManager.load();
    
    // Public API
    return StorageManager;
})();
