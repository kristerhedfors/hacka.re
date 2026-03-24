/**
 * Function Tools Logger
 * Provides logging utilities for the function tools system
 */

window.FunctionToolsLogger = (function() {
    const { CONFIG } = FunctionToolsConfig;
    
    const LOG_LEVELS = {
        'DEBUG': 0,
        'INFO': 1, 
        'WARN': 2,
        'ERROR': 3
    };
    
    const currentLogLevel = LOG_LEVELS[CONFIG.LOG_LEVEL] || LOG_LEVELS['ERROR'];
    
    const Logger = {
        debug: function(message, ...args) {
            if (currentLogLevel <= LOG_LEVELS['DEBUG']) {
                console.log(`${CONFIG.DEBUG_PREFIX} ${message}`, ...args);
            }
        },
        
        info: function(message, ...args) {
            if (currentLogLevel <= LOG_LEVELS['INFO']) {
                console.log(`${CONFIG.DEBUG_PREFIX} ${message}`, ...args);
            }
        },
        
        warn: function(message, ...args) {
            if (currentLogLevel <= LOG_LEVELS['WARN']) {
                console.warn(`${CONFIG.DEBUG_PREFIX} ${message}`, ...args);
            }
        },
        
        error: function(message, ...args) {
            if (currentLogLevel <= LOG_LEVELS['ERROR']) {
                console.error(`${CONFIG.DEBUG_PREFIX} ${message}`, ...args);
            }
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
