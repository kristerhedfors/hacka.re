/**
 * Function Tools Logger
 * Provides logging utilities for the function tools system
 */

window.FunctionToolsLogger = (function() {
    const { CONFIG } = FunctionToolsConfig;
    
    const Logger = {
        debug: function(message, ...args) {
            console.log(`${CONFIG.DEBUG_PREFIX} ${message}`, ...args);
        },
        
        error: function(message, ...args) {
            console.error(`${CONFIG.DEBUG_PREFIX} ${message}`, ...args);
        },
        
        logFunctionCall: function(name, args) {
            this.debug(`executeJsFunction called`);
            this.debug(`- Function name: ${name}`);
            this.debug(`- Arguments:`, args);
            this.debug(`- Arguments type: ${typeof args}`);
            this.debug(`- Arguments JSON: ${JSON.stringify(args)}`);
        },
        
        logExecutionResult: function(name, result, duration) {
            this.debug(`Function "${name}" execution completed in: ${duration}ms`);
            this.debug(`Function "${name}" result:`, result);
            this.debug(`Function "${name}" result type: ${typeof result}`);
        }
    };
    
    // Public API
    return Logger;
})();
