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
        FUNCTION_GROUPS: 'function_groups'
    };
    
    // Configuration
    const CONFIG = {
        EXECUTION_TIMEOUT: 30000, // 30 seconds
        DEBUG_PREFIX: '[FunctionTools Debug]'
    };
    
    // Public API
    return {
        STORAGE_KEYS,
        CONFIG
    };
})();
