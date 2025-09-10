/**
 * Function Tools Configuration
 * Contains constants and configuration for the function tools system
 */

window.FunctionToolsConfig = (function() {
    // Storage keys
    const STORAGE_KEYS = {
        FUNCTION_TOOLS_ENABLED: 'function_tools_enabled',
        JS_FUNCTIONS: 'js_functions',
        ENABLED_FUNCTIONS: 'enabled_functions',
        FUNCTION_COLLECTIONS: 'function_collections',
        FUNCTION_COLLECTION_METADATA: 'function_collection_metadata'
    };
    
    // Configuration
    const CONFIG = {
        EXECUTION_TIMEOUT: 60000, // 60 seconds - increased to handle slower API calls
        DEBUG_PREFIX: '[FunctionTools Debug]',
        LOG_LEVEL: 'ERROR' // 'DEBUG', 'INFO', 'WARN', 'ERROR' - set to ERROR to reduce console noise
    };
    
    // Public API
    return {
        STORAGE_KEYS,
        CONFIG
    };
})();
