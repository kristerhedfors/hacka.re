/**
 * Debug Service Module
 * Provides debug logging functionality for the AIHackare application
 */

window.DebugService = (function() {
    // Debug mode state
    let debugMode = false;
    
    /**
     * Initialize the debug service
     * Loads the debug mode setting from storage
     */
    function init() {
        // Load debug mode setting from storage
        debugMode = StorageService.getDebugMode() || false;
    }
    
    /**
     * Set the debug mode
     * @param {boolean} enabled - Whether debug mode is enabled
     */
    function setDebugMode(enabled) {
        debugMode = enabled;
        // Save to storage
        StorageService.saveDebugMode(enabled);
    }
    
    /**
     * Get the current debug mode state
     * @returns {boolean} Whether debug mode is enabled
     */
    function getDebugMode() {
        return debugMode;
    }
    
    /**
     * Log a debug message to the console
     * Only logs if debug mode is enabled
     * @param {string} message - The message to log
     * @param {any} data - Optional data to log
     */
    function log(message, data) {
        if (!debugMode) return;
        
        if (data !== undefined) {
            console.log(`[DEBUG] ${message}`, data);
        } else {
            console.log(`[DEBUG] ${message}`);
        }
    }
    
    /**
     * Log an error message to the console
     * Only logs if debug mode is enabled
     * @param {string} message - The error message to log
     * @param {Error|any} error - Optional error object or data
     */
    function error(message, error) {
        if (!debugMode) return;
        
        if (error !== undefined) {
            console.error(`[DEBUG] ${message}`, error);
        } else {
            console.error(`[DEBUG] ${message}`);
        }
    }
    
    /**
     * Log a warning message to the console
     * Only logs if debug mode is enabled
     * @param {string} message - The warning message to log
     * @param {any} data - Optional data to log
     */
    function warn(message, data) {
        if (!debugMode) return;
        
        if (data !== undefined) {
            console.warn(`[DEBUG] ${message}`, data);
        } else {
            console.warn(`[DEBUG] ${message}`);
        }
    }
    
    /**
     * Log an info message to the console
     * Only logs if debug mode is enabled
     * @param {string} message - The info message to log
     * @param {any} data - Optional data to log
     */
    function info(message, data) {
        if (!debugMode) return;
        
        if (data !== undefined) {
            console.info(`[DEBUG] ${message}`, data);
        } else {
            console.info(`[DEBUG] ${message}`);
        }
    }
    
    // Public API
    return {
        init,
        setDebugMode,
        getDebugMode,
        log,
        error,
        warn,
        info
    };
})();
